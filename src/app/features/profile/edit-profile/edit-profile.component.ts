import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContactLinks, User } from '../../../core/models/models';
import { DeleteAccountDialogComponent } from '../../../shared/components/delete-account-dialog/delete-account-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { startWith, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { safeAutocomplete } from '../../../core/utils/search.utils';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent implements OnInit {
  form!: FormGroup;
  loading = true;
  saving = false;
  uploadingAvatar = false;
  avatarPreview: string | null = null;
  userEmail: string | null = null; // used for password reset
  userSkills: string[] = [];
  availableSkills: string[] = [];
  removingSkill = '';
  
  // skills autocomplete with search
  skillSearchControl = new FormControl('');
  filteredSkills$!: Observable<string[]>;
  private userSkillsSubject = new BehaviorSubject<string[]>([]);

  // university autocomplete state copied from onboarding
  universities: string[] = [];
  filteredUniversities$ = of<string[]>([]);
  loadingUniversities = true;

  // courses for selected institution
  courses: string[] = [];
  filteredCourses$ = of<string[]>([]);
  loadingCourses = false;

  yearOptions = [
    { value: '1', label: '1.º ano (Licenciatura)' },
    { value: '2', label: '2.º ano (Licenciatura)' },
    { value: '3', label: '3.º ano (Licenciatura)' },
    { value: '4', label: '4.º ano (Mestrado integrado)' },
    { value: '5', label: '5.º ano (Mestrado integrado)' },
    { value: '6', label: '6.º ano (Mestrado integrado — Medicina)' },
    { value: 'ctesp1', label: 'CTeSP — 1.º ano' },
    { value: 'ctesp2', label: 'CTeSP — 2.º ano' },
    { value: 'mestrado1', label: 'Mestrado — 1.º ano' },
    { value: 'mestrado2', label: 'Mestrado — 2.º ano' },
    { value: 'mestrado_conclusao', label: 'Mestrado — A concluir / dissertação' },
    { value: 'posgrad', label: 'Pós-Graduação' },
    { value: 'phd1', label: 'Doutoramento — 1.º ano' },
    { value: 'phd2', label: 'Doutoramento — 2.º ano' },
    { value: 'phd3', label: 'Doutoramento — 3.º ano' },
    { value: 'phd4', label: 'Doutoramento — 4.º ano ou mais' },
    { value: 'prof1', label: 'Curso Profissional — 10.º ano' },
    { value: 'prof2', label: 'Curso Profissional — 11.º ano' },
    { value: 'prof3', label: 'Curso Profissional — 12.º ano' },
    { value: 'outro', label: 'Outro' }
  ];

  private readonly emptyContactLinks: ContactLinks = {
    facebook: '',
    instagram: '',
    twitter: '',
    tiktok: '',
    linkedin: '',
    github: '',
    website: ''
  };

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private snack: MatSnackBar,
    private auth: AuthService,   // to clear session on delete
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name:       ['', [Validators.required, Validators.minLength(2)]],
      role:       ['', Validators.required],
      university: [''],
      course:     [''],
      year:       [''],
      bio:        [''],
      avatar_url: [''],
      contact_links: this.fb.group({
        facebook: [''],
        instagram: [''],
        twitter: [''],
        tiktok: [''],
        linkedin: [''],
        github: [''],
        website: ['']
      })
    });

    // Load skills and setup autocomplete
    this.api.listSkills().subscribe({ 
      next: (s: string[]) => {
        this.availableSkills = s;
        this.setupSkillsAutocomplete();
      }
    });

    // university list from backend
    this.api.listUniversities().subscribe({
      next: list => {
        this.universities = [...list, 'Outra'];
        this.loadingUniversities = false;
        const ctrl = this.form.get('university')!;
        ctrl.setValue(ctrl.value, { emitEvent: true });
      },
      error: () => {
        this.universities = [
          'Universidade de Lisboa', 'Universidade do Porto', 'Universidade de Coimbra',
          'Universidade Nova de Lisboa', 'Universidade de Aveiro', 'Universidade do Minho',
          'ISCTE', 'Universidade Lusófona', 'Instituto Politécnico de Lisboa',
          'Instituto Politécnico do Porto', 'Outra'
        ];
        this.loadingUniversities = false;
        const ctrl = this.form.get('university')!;
        ctrl.setValue(ctrl.value, { emitEvent: true });
      }
    });

    this.filteredUniversities$ = this.form.get('university')!.valueChanges.pipe(
      startWith(''),
      debounceTime(200),
      distinctUntilChanged(),
      map((q: string) => safeAutocomplete(this.universities, q || '', 20))
    );

    // fetch courses when university changes
    this.form.get('university')!.valueChanges.pipe(distinctUntilChanged()).subscribe(val => {
      if (typeof val === 'string' && this.universities.includes(val) && val !== 'Outra') {
        this.loadingCourses = true;
        this.api.listCourses(val).subscribe({
          next: c => {
            this.courses = c;
            this.loadingCourses = false;
            const ctrl = this.form.get('course')!;
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

    this.filteredCourses$ = this.form.get('course')!.valueChanges.pipe(
      startWith(''),
      debounceTime(200),
      distinctUntilChanged(),
      map((q: string) => safeAutocomplete(this.courses, q || '', 20))
    );

    this.api.getMyProfile().subscribe({
      next: (u: User) => {
        this.form.patchValue(u);
        this.form.get('contact_links')?.patchValue(this.normalizeContactLinks(u.contact_links));
        this.userSkills = [...(u.skills || [])];
        this.userSkillsSubject.next(this.userSkills);
        if (u.avatar_url) this.avatarPreview = u.avatar_url;
        this.userEmail = u.email || null;
        // if there's a university already, pre‑load its courses
        if (u.university) {
          this.api.listCourses(u.university).subscribe({
            next: c => {
              this.courses = c;
              const ctrl = this.form.get('course')!;
              ctrl.setValue(ctrl.value, { emitEvent: true });
            },
            error: () => { this.courses = []; }
          });
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onAvatarChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingAvatar = true;
    this.api.uploadImage(file, 'avatar').subscribe({
      next: (res: { url: string }) => {
        this.form.patchValue({ avatar_url: res.url });
        this.avatarPreview = res.url;
        this.uploadingAvatar = false;
      },
      error: () => { this.uploadingAvatar = false; }
    });
  }

  addSkill(): void {
    const s = (this.skillSearchControl.value || '').trim();
    if (!s || this.userSkills.includes(s)) return;
    this.api.addSkill(s).subscribe({
      next: (res: { skills: string[] }) => {
        this.userSkills = res.skills;
        this.userSkillsSubject.next(this.userSkills);
        this.skillSearchControl.setValue('', { emitEvent: false });
      },
      error: (e: HttpErrorResponse) => this.snack.open(e?.error?.error || 'Erro ao adicionar competência.', 'Fechar', { duration: 3000 })
    });
  }

  onSkillSelected(event: any): void {
    // Auto-add when option is selected
    setTimeout(() => this.addSkill(), 0);
  }

  removeSkill(skill: string): void {
    this.removingSkill = skill;
    this.api.removeSkill(skill).subscribe({
      next: (res: { skills: string[] }) => {
        this.userSkills = res.skills;
        this.userSkillsSubject.next(this.userSkills);
        this.removingSkill = '';
      },
      error: () => { this.removingSkill = ''; }
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const payload = {
      ...this.form.value,
      contact_links: this.normalizeContactLinks(this.form.value.contact_links)
    };
    this.api.updateProfile(payload).subscribe({
      next: () => {
        this.snack.open('Perfil atualizado com sucesso!', 'Fechar', { duration: 3000 });
        this.router.navigate(['/perfil/eu']);
      },
      error: (e: HttpErrorResponse) => {
        this.snack.open(e?.error?.error || 'Erro ao guardar.', 'Fechar', { duration: 4000 });
        this.saving = false;
      }
    });
  }

  get filteredAvailableSkills(): string[] {
    return this.availableSkills.filter(s => !this.userSkills.includes(s));
  }

  private setupSkillsAutocomplete(): void {
    // Combine skill search input with user's current skills to filter
    this.filteredSkills$ = combineLatest([
      this.skillSearchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300), // Increased for better performance with 300+ items
        distinctUntilChanged()
      ),
      this.userSkillsSubject.asObservable()
    ]).pipe(
      map(([query, userSkills]) => {
        // Filter out skills already added by user
        const available = this.availableSkills.filter(s => !userSkills.includes(s));
        // Apply search filter with limit for performance
        const q = (query || '').trim();
        if (q.length === 0) {
          // Show first 30 when no search query
          return available.slice(0, 30);
        }
        // Use safeAutocomplete for word-by-word search
        return safeAutocomplete(available, q, 50);
      })
    );
  }

  private getFirebaseApp() {
    if (getApps().length > 0) return getApps()[0];
    return initializeApp({
      apiKey: environment.firebaseApiKey,
      authDomain: environment.firebaseAuthDomain
    });
  }

  async sendPasswordReset(): Promise<void> {
    const email = this.userEmail || this.form.get('email')?.value;
    if (!email) {
      this.snack.open('Email não disponível para redefinição.', 'Fechar', { duration: 3000 });
      return;
    }

    try {
      const auth = getAuth(this.getFirebaseApp());
      await sendPasswordResetEmail(auth, email);
      this.snack.open('Email de redefinição enviado.', 'Fechar', { duration: 3000 });
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        this.snack.open('Email não encontrado.', 'Fechar', { duration: 3000 });
      } else if (code === 'auth/too-many-requests') {
        this.snack.open('Demasiadas tentativas. Aguarda uns minutos.', 'Fechar', { duration: 3000 });
      } else {
        this.snack.open('Erro ao enviar email.', 'Fechar', { duration: 3000 });
      }
    }
  }

  deleteAccount(): void {
    const dialogRef = this.dialog.open(DeleteAccountDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'delete-account-dialog'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.api.deleteMyAccount().subscribe({
          next: () => {
            this.snack.open('Conta eliminada.', 'Fechar', { duration: 3000 });
            this.auth.clearSession();
            this.router.navigate(['/landing']);
          },
          error: () => this.snack.open('Erro ao eliminar conta.', 'Fechar', { duration: 3000 })
        });
      }
    });
  }

  private normalizeContactLinks(value?: ContactLinks): ContactLinks {
    const source = value || this.emptyContactLinks;
    return {
      facebook: (source.facebook || '').trim(),
      instagram: (source.instagram || '').trim(),
      twitter: (source.twitter || '').trim(),
      tiktok: (source.tiktok || '').trim(),
      linkedin: (source.linkedin || '').trim(),
      github: (source.github || '').trim(),
      website: (source.website || '').trim()
    };
  }
}
