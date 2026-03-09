import { Component, OnInit, OnDestroy, Optional, Inject, HostListener, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogContent } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RegisterInput, SkillSection, SkillsListResponse } from '../../core/models/models';
import { environment } from '../../../environments/environment';
import { rankedAutocomplete, sanitizeInput } from '../../core/utils/search.utils';
import type { FirebaseApp } from 'firebase/app';
import type { UserCredential } from 'firebase/auth';
import {
  trigger, transition, style, animate, query, group
} from '@angular/animations';

const stepAnim = trigger('step', [
  transition(':increment', [
    group([
      query(':leave', [
        style({ position: 'absolute', width: '100%' }),
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(-40px)' }))
      ], { optional: true }),
      query(':enter', [
        style({ opacity: 0, transform: 'translateX(40px)' }),
        animate('300ms 100ms cubic-bezier(0.22,1,0.36,1)',
          style({ opacity: 1, transform: 'translateX(0)' }))
      ], { optional: true })
    ])
  ]),
  transition(':decrement', [
    group([
      query(':leave', [
        style({ position: 'absolute', width: '100%' }),
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(40px)' }))
      ], { optional: true }),
      query(':enter', [
        style({ opacity: 0, transform: 'translateX(-40px)' }),
        animate('300ms 100ms cubic-bezier(0.22,1,0.36,1)',
          style({ opacity: 1, transform: 'translateX(0)' }))
      ], { optional: true })
    ])
  ])
]);

export interface OnboardingDialogData {
  socialMode?: boolean;
  name?: string;
  email?: string;
}

interface DisplaySkillSection extends SkillSection {
  totalSkills: number;
  hiddenSkillsCount: number;
}

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
  animations: [stepAnim]
})
export class OnboardingComponent implements OnInit, OnDestroy {
  @ViewChild(MatDialogContent, { read: ElementRef }) private dialogContent?: ElementRef<HTMLElement>;

  step = 0;
  totalSteps = 6; // role, personal, academic, skills, donation, account
  loading = false;
  error = '';
  socialMode = false;
  registrationComplete = false;
  emailVerificationSent = false;
  private firebaseReadyPromise: Promise<void> | null = null;
  private firebaseAuthInstance: any | null = null;

  yearOptions = [
    // Licenciatura / Bacharel
    { value: '1', label: '1.º ano (Licenciatura)' },
    { value: '2', label: '2.º ano (Licenciatura)' },
    { value: '3', label: '3.º ano (Licenciatura)' },
    // Mestrado integrado (4+5 ou 4+5+6 para Medicina)
    { value: '4', label: '4.º ano (Mestrado integrado)' },
    { value: '5', label: '5.º ano (Mestrado integrado)' },
    { value: '6', label: '6.º ano (Mestrado integrado — Medicina)' },
    // CTeSP
    { value: 'ctesp1', label: 'CTeSP — 1.º ano' },
    { value: 'ctesp2', label: 'CTeSP — 2.º ano' },
    // Mestrado
    { value: 'mestrado1', label: 'Mestrado — 1.º ano' },
    { value: 'mestrado2', label: 'Mestrado — 2.º ano' },
    { value: 'mestrado_conclusao', label: 'Mestrado — A concluir / dissertação' },
    // Pós-graduação
    { value: 'posgrad', label: 'Pós-Graduação' },
    // Doutoramento
    { value: 'phd1', label: 'Doutoramento — 1.º ano' },
    { value: 'phd2', label: 'Doutoramento — 2.º ano' },
    { value: 'phd3', label: 'Doutoramento — 3.º ano' },
    { value: 'phd4', label: 'Doutoramento — 4.º ano ou mais' },
    // Ensino profissional
    { value: 'prof1', label: 'Curso Profissional — 10.º ano' },
    { value: 'prof2', label: 'Curso Profissional — 11.º ano' },
    { value: 'prof3', label: 'Curso Profissional — 12.º ano' },
    { value: 'outro', label: 'Outro' }
  ];

  universities: string[] = [];
  loadingUniversities = false;
  filteredUniversities$!: Observable<string[]>;

  // curso autocomplete state
  courses: string[] = [];
  filteredCourses$!: Observable<string[]>;
  loadingCourses = false;
  private lastUniversitySelection = '';

  // Step 0: role choice
  roleForm!: FormGroup;
  // Step 1: personal info
  personalForm!: FormGroup;
  // Step 2: academic info
  academicForm!: FormGroup;
  // Step 3: skills (if helper)
  skillsForm!: FormGroup;
  // Step 4: account
  accountForm!: FormGroup;

  availableSkills: string[] = [];
  availableSkillSections: SkillSection[] = [];
  selectedSkills: string[] = [];
  skillSearchControl = new FormControl('', { nonNullable: true });
  filteredSkillSections: DisplaySkillSection[] = [];
  hasActiveSkillSearch = false;

  private readonly initialSkillsPerSection = 12;
  private readonly searchSkillsPerSection = 40;
  private readonly expandedSkillSections = new Set<string>();
  readonly isiPhone = typeof navigator !== 'undefined' && /iPhone|iPod/i.test(navigator.userAgent);
  readonly disableStepAnimation = this.isiPhone;
  private visualViewportResizeHandler?: () => void;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private dialog: MatDialog,
    @Optional() public dialogRef: MatDialogRef<OnboardingComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: OnboardingDialogData | null
  ) {}
  ngOnInit(): void {
    this.warmUpSocialAuth();
    this.roleForm = this.fb.group({
      // single string value: 'needs_help' | 'helper' | 'both'
      role: ['', Validators.required]
    });
    this.personalForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });
    this.academicForm = this.fb.group({
      university: ['', Validators.required],
      course: ['', Validators.required],
      year: ['', Validators.required]
    });
    this.skillsForm = this.fb.group({});
    this.accountForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.skillSearchControl.valueChanges.pipe(
      startWith(this.skillSearchControl.value),
      debounceTime(150),
      distinctUntilChanged()
    ).subscribe(query => {
      this.updateFilteredSkillSections(query);
    });

    // Social mode: user already authenticated via provider, skip account step
    if (this.data?.socialMode) {
      this.socialMode = true;
      this.totalSteps = 5; // steps 0-4: role, personal, academic, skills, donation (then auto-submit)
      if (this.data.name) {
        this.personalForm.patchValue({ name: this.data.name });
      }
      // Mark that onboarding is pending
      localStorage.setItem('sb_needs_onboarding', '1');
    }

    this.api.listSkills().subscribe({
      next: (res: SkillsListResponse) => {
        this.availableSkillSections = res.sections || [];
        this.availableSkills = res.skills || [];
        this.updateFilteredSkillSections(this.skillSearchControl.value);
      },
      error: () => {
        this.availableSkillSections = [];
        this.availableSkills = [];
        this.updateFilteredSkillSections(this.skillSearchControl.value);
      }
    });

    // Setup reactive local university search (fast, no per-keystroke API requests)
    this.filteredUniversities$ = this.academicForm.get('university')!.valueChanges.pipe(
      startWith(''),
      debounceTime(120),
      distinctUntilChanged(),
      map(query => {
        const q = typeof query === 'string' ? query : '';
        return rankedAutocomplete(this.universities, q, 20);
      })
    );

    this.loadingUniversities = true;
    this.api.listUniversities().subscribe({
      next: list => {
        this.universities = [...list, 'Outra'];
        this.loadingUniversities = false;
        const ctrl = this.academicForm.get('university')!;
        ctrl.setValue(ctrl.value, { emitEvent: true });
      },
      error: () => {
        this.universities = this.getFallbackUniversities();
        this.loadingUniversities = false;
        const ctrl = this.academicForm.get('university')!;
        ctrl.setValue(ctrl.value, { emitEvent: true });
      }
    });

    // when university changes fetch corresponding courses
    this.academicForm.get('university')!.valueChanges.pipe(
      distinctUntilChanged()
    ).subscribe(val => {
      const selectedUniversity = typeof val === 'string' ? val.trim() : '';
      const courseCtrl = this.academicForm.get('course')!;

      if (selectedUniversity !== this.lastUniversitySelection) {
        this.lastUniversitySelection = selectedUniversity;
        this.courses = [];
        courseCtrl.setValue('', { emitEvent: true });
      }

      if (
        selectedUniversity !== '' &&
        selectedUniversity !== 'Outra' &&
        this.universities.includes(selectedUniversity)
      ) {
        this.loadingCourses = true;
        this.api.listCourses(selectedUniversity).subscribe({
          next: c => {
            const currentUniversity = this.academicForm.get('university')!.value;
            if (currentUniversity !== selectedUniversity) {
              return;
            }
            this.courses = c;
            this.loadingCourses = false;
            courseCtrl.setValue(courseCtrl.value, { emitEvent: true });
          },
          error: () => {
            this.courses = [];
            this.loadingCourses = false;
          }
        });
      } else {
        this.courses = [];
      }
    });

    // Reactive autocomplete for courses
    this.filteredCourses$ = this.academicForm.get('course')!.valueChanges.pipe(
      startWith(''),
      debounceTime(120),
      distinctUntilChanged(),
      map((q: string) => {
        const query = typeof q === 'string' ? q : '';
        return rankedAutocomplete(this.courses, query, 50);
      })
    );

    this.setupIPhoneViewportFix();
  }

  ngOnDestroy(): void {
    if (this.visualViewportResizeHandler && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.visualViewportResizeHandler);
      window.visualViewport.removeEventListener('scroll', this.visualViewportResizeHandler);
    }
  }

  private getFallbackUniversities(): string[] {
    return [
      'Universidade de Lisboa', 'Universidade do Porto', 'Universidade de Coimbra',
      'Universidade Nova de Lisboa', 'Universidade de Aveiro', 'Universidade do Minho',
      'ISCTE', 'Universidade Lusófona', 'Instituto Politécnico de Lisboa',
      'Instituto Politécnico do Porto', 'Outra'
    ];
  }

  private validateAcademicSelection(): boolean {
    const university = (this.academicForm.get('university')?.value || '').trim();
    const course = (this.academicForm.get('course')?.value || '').trim();

    if (!university || !course) {
      this.error = 'Seleciona universidade e curso antes de continuar.';
      return false;
    }

    if (university === 'Outra') {
      return true;
    }

    if (!this.universities.includes(university)) {
      this.error = 'Seleciona uma universidade válida da lista.';
      return false;
    }

    if (this.courses.length === 0) {
      this.error = 'Não foi possível validar os cursos dessa universidade. Seleciona novamente.';
      return false;
    }

    if (!this.courses.includes(course)) {
      this.error = 'O curso selecionado não pertence à universidade escolhida.';
      return false;
    }

    return true;
  }

  get progress(): number {
    return ((this.step) / this.totalSteps) * 100;
  }

  /** helper role includes explicit helpers or users who chose both */
  get isHelper(): boolean {
    const v = this.roleForm.get('role')?.value;
    return v === 'helper' || v === 'both';
  }

  /** creator role also includes both */
  get isCreator(): boolean {
    const v = this.roleForm.get('role')?.value;
    return v === 'needs_help' || v === 'both';
  }

  setRole(role: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.roleForm.patchValue({ role });
  }

  next(): void {
    if (this.step < this.totalSteps - 1) {
      this.blurActiveElement();
      this.step++;
      this.resetDialogScroll();
    }
  }

  back(): void {
    if (this.step > 0) {
      this.blurActiveElement();
      this.step--;
      this.resetDialogScroll();
    }
  }

  @HostListener('focusin', ['$event'])
  onFocusIn(event: FocusEvent): void {
    if (!this.isiPhone) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (!target.matches('input, textarea, .mat-mdc-select-trigger, [contenteditable="true"]')) {
      return;
    }

    this.scrollFocusedFieldIntoView(target);
  }

  clearSkillSearch(): void {
    this.skillSearchControl.setValue('');
  }

  toggleSkill(skill: string): void {
    const idx = this.selectedSkills.indexOf(skill);
    if (idx === -1) {
      if (this.selectedSkills.length < 10) this.selectedSkills.push(skill);
    } else {
      this.selectedSkills.splice(idx, 1);
    }
  }

  isSkillSelected(skill: string): boolean {
    return this.selectedSkills.includes(skill);
  }

  showAllSkillsInSection(sectionId: string): void {
    if (this.expandedSkillSections.has(sectionId)) {
      return;
    }

    this.expandedSkillSections.add(sectionId);
    this.updateFilteredSkillSections(this.skillSearchControl.value);
  }

  trackBySectionId(_: number, section: SkillSection): string {
    return section.id;
  }

  trackBySkill(_: number, skill: string): string {
    return skill;
  }

  private updateFilteredSkillSections(rawQuery: string): void {
    const query = sanitizeInput((rawQuery || '').toString());
    this.hasActiveSkillSearch = query.length > 0;

    if (this.availableSkillSections.length === 0) {
      this.filteredSkillSections = [];
      return;
    }

    this.filteredSkillSections = this.availableSkillSections
      .map(section => {
        const sectionSkills = this.hasActiveSkillSearch
          ? rankedAutocomplete(section.skills, query, this.searchSkillsPerSection)
          : section.skills;

        if (sectionSkills.length === 0) {
          return null;
        }

        const visibleCount = this.hasActiveSkillSearch || this.expandedSkillSections.has(section.id)
          ? sectionSkills.length
          : this.initialSkillsPerSection;

        const visibleSkills = sectionSkills.slice(0, visibleCount);

        return {
          ...section,
          skills: visibleSkills,
          totalSkills: sectionSkills.length,
          hiddenSkillsCount: Math.max(sectionSkills.length - visibleSkills.length, 0)
        };
      })
      .filter((section): section is DisplaySkillSection => section !== null);
  }

  private setupIPhoneViewportFix(): void {
    if (!this.isiPhone || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const updateViewportHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--sb-visual-viewport-height', `${Math.round(height)}px`);
    };

    updateViewportHeight();
    this.visualViewportResizeHandler = updateViewportHeight;

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
      window.visualViewport.addEventListener('scroll', updateViewportHeight);
    }
  }

  private resetDialogScroll(): void {
    requestAnimationFrame(() => {
      const container = this.dialogContent?.nativeElement;
      if (container) {
        container.scrollTo({ top: 0, behavior: 'auto' });
      }
    });
  }

  private scrollFocusedFieldIntoView(target: HTMLElement): void {
    const reveal = () => {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });

      const container = this.dialogContent?.nativeElement;
      if (!container) {
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top - (container.clientHeight * 0.28);

      if (Math.abs(offset) > 8) {
        container.scrollTop += offset;
      }
    };

    window.setTimeout(reveal, 180);
    window.setTimeout(reveal, 420);
  }

  close(): void {
    // If in social mode and registration not completed, clear auth session
    if (this.socialMode && localStorage.getItem('sb_needs_onboarding')) {
      this.auth.clearSession();
      localStorage.removeItem('sb_needs_onboarding');
    }
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.router.navigate(['/landing']);
    }
  }

  skipToLanding(): void {
    const role = this.roleForm.get('role')?.value || 'needs_help';

    this.api.createGuestSession({ role }).subscribe({
      next: (s: { token: string }) => {
        localStorage.setItem('sb_guest_token', s.token);
        localStorage.setItem('sb_onboarded', '1');
        this.close();
      },
      error: () => {
        localStorage.setItem('sb_onboarded', '1');
        this.close();
      }
    });
  }

  async submit(): Promise<void> {
    if (this.accountForm.invalid) return;
    if (!this.validateAcademicSelection()) return;
    this.loading = true;
    this.error = '';

    const emailVal: string = this.accountForm.get('email')!.value;
    const passwordVal: string = this.accountForm.get('password')!.value;

    try {
      const { auth } = await this.loadFirebase();
      const fbAuth = auth.getAuth(await this.getFirebaseApp());
      
      // Set persistence before creating account
      await auth.setPersistence(fbAuth, auth.browserLocalPersistence);
      
      // Create Firebase account
      const cred: UserCredential = await auth.createUserWithEmailAndPassword(fbAuth, emailVal, passwordVal);
      
      // Send email verification
      await auth.sendEmailVerification(cred.user);
      this.emailVerificationSent = true;
      
      const idToken = await cred.user.getIdToken();
      const tokenResult = await cred.user.getIdTokenResult();
      const expiresAt = new Date(tokenResult.expirationTime).getTime();

      // Persist session so authHeaders() works for the register call
      this.auth.setUser({
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: this.personalForm.get('name')!.value,
        token: idToken,
        expiresAt
      });

      // Step 2 – create profile in our backend
      const guestToken = localStorage.getItem('sb_guest_token') || undefined;
      const payload: RegisterInput = {
        name: this.personalForm.get('name')!.value,
        university: this.academicForm.get('university')!.value,
        course: this.academicForm.get('course')!.value,
        year: this.academicForm.get('year')!.value,
        bio: '',
        role: this.roleForm.get('role')!.value,
        guest_session_token: guestToken
      };

      this.api.registerUser(payload).subscribe({
        next: () => {
          // Step 3 – add selected skills (helpers only)
          if (this.isHelper && this.selectedSkills.length > 0) {
            let idx = 0;
            const addNext = () => {
              if (idx >= this.selectedSkills.length) {
                this.finishRegistration();
                return;
              }
              this.api.addSkill(this.selectedSkills[idx++]).subscribe({
                next: addNext,
                error: addNext // skip failed skills silently
              });
            };
            addNext();
          } else {
            this.finishRegistration();
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.error ?? 'Erro ao criar perfil. Tenta novamente.';
        }
      });
    } catch (err: any) {
      this.loading = false;
      const code: string = err?.code ?? '';
      if (code.includes('auth/email-already-in-use')) {
        this.error = 'Este email já está registado.';
      } else if (code.includes('auth/weak-password')) {
        this.error = 'A palavra-passe deve ter pelo menos 6 caracteres.';
      } else if (code.includes('auth/invalid-email')) {
        this.error = 'Endereço de email inválido.';
      } else {
        this.error = 'Erro ao criar conta. Verifica os dados e tenta novamente.';
      }
    }
  }

  // ── Social login ────────────────────────────────────────────────────────────

  private _fb: { app: any; auth: any } | null = null;
  private async loadFirebase() {
    if (!this._fb) {
      const [app, auth] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth')
      ]);
      this._fb = { app, auth };
    }
    return this._fb;
  }

  private async getFirebaseApp(): Promise<FirebaseApp> {
    const { app } = await this.loadFirebase();
    if (app.getApps().length > 0) return app.getApps()[0];
    return app.initializeApp({
      apiKey: environment.firebaseApiKey,
      authDomain: environment.firebaseAuthDomain
    });
  }

  warmUpSocialAuth(): void {
    void this.preloadFirebaseAuth();
  }

  private preloadFirebaseAuth(): Promise<void> {
    if (this.firebaseReadyPromise) {
      return this.firebaseReadyPromise;
    }

    this.firebaseReadyPromise = (async () => {
      const { auth: authMod } = await this.loadFirebase();
      const fbAuth = authMod.getAuth(await this.getFirebaseApp());
      this.firebaseAuthInstance = fbAuth;
      await authMod.setPersistence(fbAuth, authMod.browserLocalPersistence).catch(() => {});
    })().catch((err) => {
      this.firebaseReadyPromise = null;
      this.firebaseAuthInstance = null;
      throw err;
    });

    return this.firebaseReadyPromise;
  }

  private buildAuthProvider(authMod: any, provider: 'google' | 'github' | 'microsoft'): any {
    if (provider === 'google') {
      return new authMod.GoogleAuthProvider();
    }

    if (provider === 'github') {
      const github = new authMod.GithubAuthProvider();
      github.addScope('user:email');
      return github;
    }

    const microsoft = new authMod.OAuthProvider('microsoft.com');
    microsoft.setCustomParameters({
      prompt: 'select_account',
      tenant: 'common'
    });
    microsoft.addScope('openid');
    microsoft.addScope('profile');
    microsoft.addScope('email');
    return microsoft;
  }

  private isEmbeddedBrowser(): boolean {
    const ua = navigator.userAgent || '';
    return /(FBAN|FBAV|Instagram|Line|LinkedInApp|TikTok|WebView|; wv\))/i.test(ua);
  }

  async signInWithProvider(provider: 'google' | 'github' | 'microsoft'): Promise<void> {
    if (!this.validateAcademicSelection()) return;
    this.loading = true;
    this.error = '';

    const authMod = this._fb?.auth;
    const fbAuth = this.firebaseAuthInstance;
    if (!authMod || !fbAuth) {
      this.loading = false;
      this.error = 'A preparar o login social. Toca novamente dentro de um instante.';
      this.warmUpSocialAuth();
      return;
    }

    const authProvider = this.buildAuthProvider(authMod, provider);

    try {
      const credential: UserCredential = await authMod.signInWithPopup(fbAuth, authProvider);
      const idToken = await credential.user.getIdToken();
      const tokenResult = await credential.user.getIdTokenResult();
      const expiresAt = new Date(tokenResult.expirationTime).getTime();
      const name = this.personalForm.get('name')?.value || credential.user.displayName || '';

      this.auth.setUser({
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: name,
        token: idToken,
        expiresAt
      });

      const guestToken = localStorage.getItem('sb_guest_token') || undefined;
      const payload: RegisterInput = {
        name,
        university: this.academicForm.get('university')!.value,
        course: this.academicForm.get('course')!.value,
        year: this.academicForm.get('year')!.value,
        bio: '',
        role: this.roleForm.get('role')!.value,
        guest_session_token: guestToken
      };

      this.api.registerUser(payload).subscribe({
        next: () => {
          if (this.isHelper && this.selectedSkills.length > 0) {
            let idx = 0;
            const addNext = () => {
              if (idx >= this.selectedSkills.length) { this.finishRegistration(); return; }
              this.api.addSkill(this.selectedSkills[idx++]).subscribe({ next: addNext, error: addNext });
            };
            addNext();
          } else {
            this.finishRegistration();
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.error ?? 'Erro ao criar perfil. Tenta novamente.';
        }
      });
    } catch (err: any) {
      this.loading = false;
      const code: string = err?.code ?? '';
      
      // Check if user closed the popup
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        this.error = '';
        return;
      }

      if (code === 'auth/popup-blocked') {
        this.error = this.isEmbeddedBrowser()
          ? 'O login social foi bloqueado pelo navegador incorporado. Abre o SkillBridge no Chrome ou Safari e tenta novamente.'
          : 'O navegador bloqueou a janela de autenticação. Permite popups e tenta novamente.';
        return;
      }

      if (code === 'auth/web-storage-unsupported') {
        this.error = 'Este navegador móvel está a bloquear o armazenamento necessário para o login. Tenta no Chrome ou Safari normal.';
        return;
      }
      
      // Handle account-exists-with-different-credential error
      if (code === 'auth/account-exists-with-different-credential') {
        const email = err?.customData?.email;
        if (email) {
          // Try to fetch sign-in methods for this email
          const cachedAuth = this._fb!.auth;
          const fbAuth2 = cachedAuth.getAuth(this._fb!.app.getApps()[0]);
          cachedAuth.fetchSignInMethodsForEmail(fbAuth2, email).then((methods: string[]) => {
              if (methods.length > 0) {
                const providerNames: { [key: string]: string } = {
                  'google.com': 'Google',
                  'github.com': 'GitHub',
                  'microsoft.com': 'Microsoft',
                  'password': 'email e palavra-passe'
                };
                const providerName = providerNames[methods[0]] || methods[0];
                this.error = `Este email já está registado. Inicia sessão com ${providerName}.`;
              } else {
                this.error = 'Este email já está registado com outro método de login.';
              }
            }).catch(() => {
              this.error = 'Este email já está registado com outro método de login.';
            });
        } else {
          this.error = 'Este email já está registado com outro método de login.';
        }
      } else if (code === 'auth/credential-already-in-use') {
        this.error = 'Esta conta já está em uso. Tenta fazer login com outro método.';
      } else {
        this.error = 'Erro ao iniciar sessão. Tenta novamente.';
      }
    }
  }

  /** Submit registration for social-login users (already authenticated, skip account step) */
  submitSocial(): void {
    if (!this.validateAcademicSelection()) return;
    this.loading = true;
    this.error = '';

    const guestToken = localStorage.getItem('sb_guest_token') || undefined;
    const payload: RegisterInput = {
      name: this.personalForm.get('name')!.value,
      university: this.academicForm.get('university')!.value,
      course: this.academicForm.get('course')!.value,
      year: this.academicForm.get('year')!.value,
      bio: '',
      role: this.roleForm.get('role')!.value,
      guest_session_token: guestToken
    };

    this.api.registerUser(payload).subscribe({
      next: () => {
        if (this.isHelper && this.selectedSkills.length > 0) {
          let idx = 0;
          const addNext = () => {
            if (idx >= this.selectedSkills.length) { this.finishRegistration(); return; }
            this.api.addSkill(this.selectedSkills[idx++]).subscribe({ next: addNext, error: addNext });
          };
          addNext();
        } else {
          this.finishRegistration();
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error ?? 'Erro ao criar perfil. Tenta novamente.';
      }
    });
  }

  private finishRegistration(): void {
    localStorage.setItem('sb_onboarded', '1');
    localStorage.removeItem('sb_guest_token');
    localStorage.removeItem('sb_pending_register');
    localStorage.removeItem('sb_needs_onboarding');
    this.loading = false;
    
    // Close onboarding dialog
    if (this.dialogRef) {
      this.dialogRef.close();
    }
    
    // Show verification dialog if email was sent (email/password registration)
    if (this.emailVerificationSent) {
      // Import the component
      import('./email-verification-dialog/email-verification-dialog.component').then(({ EmailVerificationDialogComponent }) => {
        this.dialog.open(EmailVerificationDialogComponent, {
          width: '500px',
          maxWidth: '95vw',
          disableClose: true,
          panelClass: 'email-verification-dialog'
        });
      });
    }
    
    this.router.navigate(['/dashboard']).then(() => {
      window.scrollTo(0, 0);
    });
  }

  private blurActiveElement(): void {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  async openDonationDialog(): Promise<void> {
    this.blurActiveElement();
    const { DonationCheckoutComponent } = await import('../donation/donation-checkout.component');
    this.dialog.open(DonationCheckoutComponent, {
      width: '650px',
      maxWidth: '95vw',
      height: 'auto',
      maxHeight: '90vh',
      panelClass: 'donation-dialog',
      autoFocus: false,
      restoreFocus: false
    });
  }
}
