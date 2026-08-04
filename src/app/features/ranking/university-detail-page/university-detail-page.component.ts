import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  UniversityRankingSummary,
  UniversityReviewItem,
  CreateUniversityReviewPayload
} from '../../../core/models/models';

const DIALOG_CONFIG = {
  width: '540px',
  maxWidth: '95vw',
  maxHeight: '90vh',
  panelClass: ['onboarding-dialog', 'slide-in-dialog'],
  autoFocus: false,
  restoreFocus: false
};

@Component({
  selector: 'app-university-detail-page',
  templateUrl: './university-detail-page.component.html',
  styleUrls: ['./university-detail-page.component.scss']
})
export class UniversityDetailPageComponent implements OnInit {
  universitySlugParam: string = '';
  universityName: string = '';
  universitySummary: UniversityRankingSummary | null = null;
  courses: string[] = [];
  selectedCourse: string = '';

  reviews: UniversityReviewItem[] = [];
  filteredReviews: UniversityReviewItem[] = [];

  isLoading: boolean = true;
  isLoadingReviews: boolean = false;
  isSubmitting: boolean = false;

  viewMode: 'details' | 'evaluate' = 'details';
  isEditMode: boolean = false;
  pendingEvaluate: boolean = false;

  isMobile: boolean = false;

  step1Form!: FormGroup;
  step2Form!: FormGroup;
  step3Form!: FormGroup;
  userCourse: string = '';
  existingReview?: UniversityReviewItem;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private api: ApiService,
    public auth: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  ngOnInit(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.auth.isLoggedIn && !this.auth.cachedProfile) {
      this.auth.prefetchUserProfile(this.api);
    }

    this.route.paramMap.subscribe(params => {
      const nameParam = params.get('name');
      if (nameParam) {
        this.universitySlugParam = nameParam;
        this.initData();
      } else {
        this.router.navigate(['/ranking']);
      }
    });

    this.route.queryParams.subscribe(q => {
      if (q['mode'] === 'evaluate') {
        // Mark as pending — will be triggered after loadReviews() finishes
        this.pendingEvaluate = true;
      }
    });
  }

  get currentUser() {
    return this.auth.cachedProfile;
  }

  get canUserReview(): boolean {
    if (!this.auth.isLoggedIn) return false;
    const profile = this.currentUser;
    if (!profile) return false;

    const target = this.normalizeStr(this.universityName);
    const currentUniv = this.normalizeStr(profile.university || '');
    const licUniv = this.normalizeStr(profile.licenciatura_university || '');

    return (currentUniv !== '' && currentUniv === target) || (licUniv !== '' && licUniv === target);
  }

  get myExistingReview(): UniversityReviewItem | undefined {
    const profile = this.currentUser;
    if (!profile) return undefined;
    return this.reviews.find(r => r.user_id === profile.id);
  }

  readonly defaultLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%2368007a"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>`;

  get fallbackLogo(): string {
    return this.defaultLogo;
  }

  onImageError(event: any): void {
    if (event.target.src === this.defaultLogo) return;
    event.target.src = this.defaultLogo;
  }

  getScoreColorClass(score: number): string {
    if (score === undefined || score === null) return 'score-neutral';
    if (score <= 4) return 'score-red';
    if (score <= 6) return 'score-yellow';
    return 'score-green';
  }

  slugify(text: string): string {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  normalizeStr(str: string): string {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private initData(): void {
    this.isLoading = true;

    // Load university rankings to get exact summary & courses matching slug or name
    this.api.getUniversityRankings().subscribe({
      next: (summaries) => {
        const targetSlug = this.slugify(this.universitySlugParam);
        const targetNorm = this.normalizeStr(this.universitySlugParam);

        const found = summaries.find(
          s => this.slugify(s.estabelecimento) === targetSlug || this.normalizeStr(s.estabelecimento) === targetNorm
        );

        if (found) {
          this.universityName = found.estabelecimento;
          this.universitySummary = found;
          this.courses = found.cursos || [];
        } else {
          this.universityName = decodeURIComponent(this.universitySlugParam);
          this.universitySummary = {
            estabelecimento: this.universityName,
            total_cursos: 0,
            cursos: [],
            average_rating: 0,
            total_reviews: 0,
            icon: '',
            univ_avg_rating: 0,
            course_avg_rating: 0
          };
        }

        // Fetch courses if empty
        if (this.courses.length === 0 && this.universityName) {
          this.api.listCourses(this.universityName).subscribe({
            next: (c) => { this.courses = c || []; },
            error: () => {}
          });
        }

        this.loadReviews();
        this.isLoading = false;
      },
      error: () => {
        this.universityName = decodeURIComponent(this.universitySlugParam);
        this.universitySummary = {
          estabelecimento: this.universityName,
          total_cursos: 0,
          cursos: [],
          average_rating: 0,
          total_reviews: 0,
          icon: '',
          univ_avg_rating: 0,
          course_avg_rating: 0
        };
        this.loadReviews();
        this.isLoading = false;
      }
    });
  }

  loadReviews(): void {
    if (!this.universityName) return;
    this.isLoadingReviews = true;
    this.api.getUniversityReviews(this.universityName, this.selectedCourse).subscribe({
      next: (res) => {
        this.reviews = res || [];
        this.filteredReviews = this.reviews;
        this.isLoadingReviews = false;
        this.existingReview = this.myExistingReview;
        this.setupForms();
        if (this.pendingEvaluate) {
          this.pendingEvaluate = false;
          this.startEvaluation();
        }
      },
      error: () => {
        this.reviews = [];
        this.filteredReviews = [];
        this.isLoadingReviews = false;
        this.setupForms();
        if (this.pendingEvaluate) {
          this.pendingEvaluate = false;
          this.startEvaluation();
        }
      }
    });
  }

  onCourseChange(): void {
    this.loadReviews();
  }

  setupForms(): void {
    const profile = this.currentUser;
    const existing = this.existingReview;
    this.isEditMode = !!existing;

    if (existing) {
      this.userCourse = existing.course_name || '';
    } else {
      const target = this.normalizeStr(this.universityName);
      const currentUniv = this.normalizeStr(profile?.university || '');
      const licUniv = this.normalizeStr(profile?.licenciatura_university || '');

      if (licUniv !== '' && licUniv === target) {
        this.userCourse = profile?.licenciatura_course || profile?.course || '';
      } else if (currentUniv !== '' && currentUniv === target) {
        this.userCourse = profile?.course || '';
      } else {
        this.userCourse = profile?.licenciatura_course || profile?.course || '';
      }
    }

    this.step1Form = this.fb.group({
      courseName: [{ value: this.userCourse, disabled: !!this.userCourse }, Validators.required],
      comment: [existing ? existing.comment : '', [Validators.required, Validators.minLength(10)]],
      isAnonymous: [existing ? existing.is_anonymous : false]
    });

    this.step2Form = this.fb.group({
      campusQuality: [existing ? existing.campus_quality : 7, [Validators.required, Validators.min(0), Validators.max(10)]],
      locationAccessibility: [existing ? existing.location_accessibility : 7, [Validators.required, Validators.min(0), Validators.max(10)]],
      costOfLiving: [existing ? existing.cost_of_living : 5, [Validators.required, Validators.min(0), Validators.max(10)]],
      socialEnvironment: [existing ? existing.social_environment : 7, [Validators.required, Validators.min(0), Validators.max(10)]],
      reputation: [existing ? existing.reputation : 8, [Validators.required, Validators.min(0), Validators.max(10)]],
      librariesQuality: [existing ? existing.libraries_quality : 7, [Validators.required, Validators.min(0), Validators.max(10)]],
      foodServices: [existing ? existing.food_services : 6, [Validators.required, Validators.min(0), Validators.max(10)]]
    });

    this.step3Form = this.fb.group({
      teachersQuality: [existing ? existing.teachers_quality : 7, [Validators.required, Validators.min(0), Validators.max(10)]],
      subjectInterest: [existing ? existing.subject_interest : 8, [Validators.required, Validators.min(0), Validators.max(10)]],
      courseFacilities: [existing ? existing.course_facilities : 7, [Validators.required, Validators.min(0), Validators.max(10)]],
      classmatesEnvironment: [existing ? existing.classmates_environment : 8, [Validators.required, Validators.min(0), Validators.max(10)]],
      workloadBalance: [existing ? existing.workload_balance : 6, [Validators.required, Validators.min(0), Validators.max(10)]],
      practicalOpportunities: [existing ? existing.practical_opportunities : 7, [Validators.required, Validators.min(0), Validators.max(10)]],
      futureProspects: [existing ? existing.future_prospects : 8, [Validators.required, Validators.min(0), Validators.max(10)]]
    });
  }

  async openOnboarding(): Promise<void> {
    const { OnboardingComponent } = await import('../../onboarding/onboarding.component');
    this.dialog.open(OnboardingComponent, DIALOG_CONFIG);
  }

  startEvaluation(): void {
    if (!this.auth.isLoggedIn) {
      this.openOnboarding();
      return;
    }
    this.setupForms();
    this.viewMode = 'evaluate';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEvaluation(): void {
    this.viewMode = 'details';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async submitReview(): Promise<void> {
    if (this.step1Form.invalid || this.step2Form.invalid || this.step3Form.invalid) {
      this.snackBar.open('Por favor preenche todos os campos requeridos nas várias fases.', 'Fechar', { duration: 4000 });
      return;
    }

    const courseName = this.step1Form.get('courseName')?.value || this.userCourse;
    if (!courseName) {
      this.snackBar.open('Por favor seleciona ou indica o teu curso.', 'Fechar', { duration: 4000 });
      return;
    }

    const { ReviewTermsDialogComponent } = await import('../review-terms-dialog/review-terms-dialog.component');
    const dialogRef = this.dialog.open(ReviewTermsDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.executeSubmitReview(courseName);
    });
  }

  private executeSubmitReview(courseName: string): void {
    this.isSubmitting = true;

    const payload: CreateUniversityReviewPayload = {
      university_name: this.universityName,
      course_name: courseName,
      comment: this.step1Form.get('comment')?.value,
      is_anonymous: !!this.step1Form.get('isAnonymous')?.value,

      campus_quality: Number(this.step2Form.get('campusQuality')?.value),
      location_accessibility: Number(this.step2Form.get('locationAccessibility')?.value),
      cost_of_living: Number(this.step2Form.get('costOfLiving')?.value),
      social_environment: Number(this.step2Form.get('socialEnvironment')?.value),
      reputation: Number(this.step2Form.get('reputation')?.value),
      libraries_quality: Number(this.step2Form.get('librariesQuality')?.value),
      food_services: Number(this.step2Form.get('foodServices')?.value),

      teachers_quality: Number(this.step3Form.get('teachersQuality')?.value),
      subject_interest: Number(this.step3Form.get('subjectInterest')?.value),
      course_facilities: Number(this.step3Form.get('courseFacilities')?.value),
      classmates_environment: Number(this.step3Form.get('classmatesEnvironment')?.value),
      workload_balance: Number(this.step3Form.get('workloadBalance')?.value),
      practical_opportunities: Number(this.step3Form.get('practicalOpportunities')?.value),
      future_prospects: Number(this.step3Form.get('futureProspects')?.value)
    };

    this.api.createUniversityReview(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open(
          this.isEditMode ? 'Avaliação atualizada com sucesso!' : 'Avaliação submetida com sucesso!',
          'Fechar',
          { duration: 4000 }
        );
        this.viewMode = 'details';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.initData();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.error || 'Erro ao submeter avaliação.';
        this.snackBar.open(msg, 'Fechar', { duration: 4000 });
      }
    });
  }

  deleteReview(reviewId: number): void {
    if (!confirm('Tens a certeza que desejas apagar a tua avaliação?')) {
      return;
    }

    this.api.deleteUniversityReview(reviewId).subscribe({
      next: () => {
        this.snackBar.open('Avaliação eliminada com sucesso.', 'Fechar', { duration: 4000 });
        this.initData();
      },
      error: (err) => {
        const msg = err?.error?.error || 'Erro ao eliminar avaliação.';
        this.snackBar.open(msg, 'Fechar', { duration: 4000 });
      }
    });
  }
}
