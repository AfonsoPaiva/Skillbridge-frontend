import { Component, OnInit, Optional, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RegisterInput } from '../../core/models/models';
import { environment } from '../../../environments/environment';
import { DonationCheckoutComponent } from '../donation/donation-checkout.component';
import { safeAutocomplete, sanitizeInput } from '../../core/utils/search.utils';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  UserCredential,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
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

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
  animations: [stepAnim]
})
export class OnboardingComponent implements OnInit {
  step = 0;
  totalSteps = 6; // role, personal, academic, skills, donation, account
  loading = false;
  error = '';
  socialMode = false;
  registrationComplete = false;
  emailVerificationSent = false;

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
  loadingUniversities = true;
  filteredUniversities$!: Observable<string[]>;

  // curso autocomplete state
  courses: string[] = [];
  filteredCourses$!: Observable<string[]>;
  loadingCourses = false;

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
  selectedSkills: string[] = [];
  skillSearch = '';

  get filteredSkills(): string[] {
    const sanitized = sanitizeInput(this.skillSearch);
    const available = this.availableSkills.filter(s => !this.selectedSkills.includes(s));
    return safeAutocomplete(available, sanitized, 50);
  }

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
      next: (s: string[]) => this.availableSkills = s,
      error: () => {}
    });

    // load universities from own backend instead of external API
    this.api.listUniversities().subscribe({
      next: list => {
        this.universities = [...list, 'Outra'];
        this.loadingUniversities = false;
        const ctrl = this.academicForm.get('university')!;
        ctrl.setValue(ctrl.value, { emitEvent: true });
      },
      error: () => {
        // fallback to small static list if backend fails
        this.universities = [
          'Universidade de Lisboa', 'Universidade do Porto', 'Universidade de Coimbra',
          'Universidade Nova de Lisboa', 'Universidade de Aveiro', 'Universidade do Minho',
          'ISCTE', 'Universidade Lusófona', 'Instituto Politécnico de Lisboa',
          'Instituto Politécnico do Porto', 'Outra'
        ];
        this.loadingUniversities = false;
        const ctrl = this.academicForm.get('university')!;
        ctrl.setValue(ctrl.value, { emitEvent: true });
      }
    });

    // when university changes fetch corresponding courses
    this.academicForm.get('university')!.valueChanges.pipe(
      distinctUntilChanged()
    ).subscribe(val => {
      if (typeof val === 'string' && this.universities.includes(val) && val !== 'Outra') {
        this.loadingCourses = true;
        this.api.listCourses(val).subscribe({
          next: c => {
            this.courses = c;
            this.loadingCourses = false;
            const ctrl = this.academicForm.get('course')!;
            ctrl.setValue(ctrl.value, { emitEvent: true });
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

    // Reactive autocomplete streams
    this.filteredUniversities$ = this.academicForm.get('university')!.valueChanges.pipe(
      startWith(''),
      debounceTime(200),
      distinctUntilChanged(),
      map((q: string) => safeAutocomplete(this.universities, q || '', 20))
    );

    this.filteredCourses$ = this.academicForm.get('course')!.valueChanges.pipe(
      startWith(''),
      debounceTime(200),
      distinctUntilChanged(),
      map((q: string) => safeAutocomplete(this.courses, q || '', 20))
    );

    // Reactive autocomplete: filter local list from user input
    this.filteredUniversities$ = this.academicForm.get('university')!.valueChanges.pipe(
      startWith(''),
      debounceTime(200),
      distinctUntilChanged(),
      map((q: string) => safeAutocomplete(this.universities, q || '', 20))
    );
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

  setRole(role: string): void {
    this.roleForm.patchValue({ role });
  }

  next(): void {
    if (this.step < this.totalSteps - 1) this.step++;
  }

  back(): void {
    if (this.step > 0) this.step--;
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
    this.loading = true;
    this.error = '';

    const emailVal: string = this.accountForm.get('email')!.value;
    const passwordVal: string = this.accountForm.get('password')!.value;

    try {
      const fbAuth = getAuth(this.getFirebaseApp());
      
      // Set persistence before creating account
      await setPersistence(fbAuth, browserLocalPersistence);
      
      // Create Firebase account
      const cred: UserCredential = await createUserWithEmailAndPassword(fbAuth, emailVal, passwordVal);
      
      // Send email verification
      await sendEmailVerification(cred.user);
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

  private getFirebaseApp(): FirebaseApp {
    if (getApps().length > 0) return getApps()[0];
    return initializeApp({
      apiKey: environment.firebaseApiKey,
      authDomain: environment.firebaseAuthDomain
    });
  }

  async signInWithProvider(provider: 'google' | 'github' | 'microsoft'): Promise<void> {
    this.loading = true;
    this.error = '';

    const app = this.getFirebaseApp();
    const fbAuth = getAuth(app);
// Set persistence before sign-in
    await setPersistence(fbAuth, browserLocalPersistence).catch(() => {});

    let authProvider: GoogleAuthProvider | GithubAuthProvider | OAuthProvider;
    if (provider === 'google') {
      authProvider = new GoogleAuthProvider();
    } else if (provider === 'github') {
      // GitHub provider with email scope
      authProvider = new GithubAuthProvider();
      authProvider.addScope('user:email'); // Request access to user's email
    } else {
      // Microsoft OAuth provider with proper configuration
      authProvider = new OAuthProvider('microsoft.com');
      authProvider.setCustomParameters({
        prompt: 'select_account',
        tenant: 'common' // Allows both personal and work/school accounts
      });
      // Request basic profile scopes
      authProvider.addScope('openid');
      authProvider.addScope('profile');
      authProvider.addScope('email');
    }

    try {
      const credential: UserCredential = await signInWithPopup(fbAuth, authProvider);
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
      
      // Handle account-exists-with-different-credential error
      if (code === 'auth/account-exists-with-different-credential') {
        const email = err?.customData?.email;
        if (email) {
          // Try to fetch sign-in methods for this email
          import('firebase/auth').then(({ fetchSignInMethodsForEmail }) => {
            const fbAuth = getAuth(this.getFirebaseApp());
            fetchSignInMethodsForEmail(fbAuth, email).then((methods) => {
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
    
    // Show verification notice if email was sent
    if (this.emailVerificationSent) {
      alert('✅ Conta criada com sucesso!\n\n📧 Enviámos um email de verificação.\nPor favor verifica a tua caixa de entrada (e spam) para ativar a tua conta.\n\nPodes explorar a plataforma, mas precisarás verificar o email para fazer login futuramente.');
    }
    
    // Close dialog and navigate to dashboard
    if (this.dialogRef) {
      this.dialogRef.close();
    }
    this.router.navigate(['/dashboard']);
  }

  openDonationDialog(): void {
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
