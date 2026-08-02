import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RecruiterService } from '../../core/services/recruiter.service';
import { User, Project, Vacancy, CommunityVacancyStats } from '../../core/models/models';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ExpandDialogComponent } from './expand-dialog/expand-dialog.component';
import {
  getProjectCardDescription,
  getProjectCardSkillLabels,
  getProjectCardSkillText,
  getProjectCardTitle,
  getProjectSkillLabels,
  getRoleSkillNames
} from '../../core/utils/project-role.utils';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false,
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('list', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(12px)' }),
          stagger(20, [animate('300ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'none' }))])
        ], { optional: true })
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly getProjectCardDescription = getProjectCardDescription;
  readonly getProjectCardSkillLabels = getProjectCardSkillLabels;
  readonly getProjectCardSkillText = getProjectCardSkillText;
  readonly getProjectCardTitle = getProjectCardTitle;
  readonly getProjectSkillLabels = getProjectSkillLabels;
  
  user: User | null = null;
  projects: Project[] = [];
  recommendedProjects: Project[] = [];
  vacancies: Vacancy[] = [];
  recommendedVacancies: Vacancy[] = [];
  favoriteVacancies: Vacancy[] = [];
  favoritesCountToday: number = 0;
  communityStats: CommunityVacancyStats | null = null;
  
  loadingUser = true;
  loadingProjects = true;
  loadingVacancies = true;
  loadingFavorites = true;
  loadingStats = true;

  private userSub?: Subscription;

  constructor(
    public auth: AuthService, 
    private api: ApiService,
    private recruiterService: RecruiterService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.userSub = this.auth.user$.subscribe(u => {
      this.user = u;
      this.loadingUser = false;
      this.filterRecommendedProjects();
      this.filterRecommendedVacancies();
    });

    this.refreshProfile();

    this.api.listProjects('all').subscribe({
      next: (p: Project[]) => { 
        this.projects = p; 
        this.loadingProjects = false;
        this.filterRecommendedProjects();
      },
      error: () => { this.loadingProjects = false; }
    });

    this.loadVacancies();
    this.loadMyFavorites();
    this.loadCommunityStats();
  }

  private refreshProfile(): void {
    if (!this.user) {
      this.loadingUser = true;
    }

    this.api.getMyProfile().subscribe({
      next: (user: User) => {
        this.user = user;
        this.auth.setCachedProfile(user);
        this.loadingUser = false;
        this.filterRecommendedProjects();
        this.filterRecommendedVacancies();
      },
      error: () => {
        this.loadingUser = false;
      }
    });
  }

  loadVacancies(): void {
    this.recruiterService.listPublicVacancies().subscribe({
      next: (res) => {
        this.vacancies = res.vacancies || [];
        this.loadingVacancies = false;
        this.filterRecommendedVacancies();
      },
      error: () => { this.loadingVacancies = false; }
    });
  }

  loadMyFavorites(): void {
    if (!this.auth.isLoggedIn) {
      this.loadingFavorites = false;
      return;
    }

    this.recruiterService.getMyFavoriteVacancies().subscribe({
      next: (res) => {
        this.favoriteVacancies = res.vacancies || [];
        this.favoritesCountToday = res.favorites_count_today || 0;
        this.loadingFavorites = false;
        this.syncFavoriteStates();
      },
      error: () => {
        this.loadingFavorites = false;
      }
    });
  }

  loadCommunityStats(): void {
    this.recruiterService.getCommunityVacancyStats().subscribe({
      next: (stats) => {
        this.communityStats = stats;
        this.loadingStats = false;
      },
      error: () => {
        this.loadingStats = false;
      }
    });
  }

  syncFavoriteStates(): void {
    const favSet = new Set(this.favoriteVacancies.map(f => f.id));
    this.vacancies.forEach(v => {
      v.is_favorite = favSet.has(v.id);
    });
    this.recommendedVacancies.forEach(v => {
      v.is_favorite = favSet.has(v.id);
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  filterRecommendedProjects(): void {
    if (!this.user || !this.user.skills || this.user.skills.length === 0) {
      this.recommendedProjects = [];
      return;
    }

    const userSkills = new Set(this.user.skills.map(skill => skill.toLowerCase()));

    this.recommendedProjects = this.projects.filter(project => {
      if (project.status !== 'open') return false;
      if (!project.roles || project.roles.length === 0) return false;
      
      return project.roles.some(role =>
        getRoleSkillNames(role).some(skill => userSkills.has(skill.toLowerCase()))
      );
    });
  }

  filterRecommendedVacancies(): void {
    if (!this.user || !this.user.skills || this.user.skills.length === 0) {
      this.recommendedVacancies = [];
      return;
    }

    const userSkills = new Set(this.user.skills.map(skill => skill.toLowerCase()));

    this.recommendedVacancies = this.vacancies.filter(v => {
      if (!v.tags || v.tags.length === 0) return false;
      return v.tags.some(tag => userSkills.has(tag.toLowerCase()));
    });

    this.syncFavoriteStates();
  }

  openExpandVacanciesDialog(): void {
    this.dialog.open(ExpandDialogComponent, {
      width: '920px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['onboarding-dialog', 'slide-in-dialog'],
      data: {
        type: 'vacancies',
        title: 'Vagas Recomendadas',
        vacancies: this.recommendedVacancies,
        userSkills: this.user?.skills
      }
    });
  }

  openExpandProjectsDialog(): void {
    this.dialog.open(ExpandDialogComponent, {
      width: '920px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['onboarding-dialog', 'slide-in-dialog'],
      data: {
        type: 'projects',
        title: 'Projetos Recomendados (Apenas Abertos)',
        projects: this.recommendedProjects,
        userSkills: this.user?.skills
      }
    });
  }

  toggleFavorite(vacancy: Vacancy, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!this.auth.isLoggedIn) {
      this.snackBar.open('Inicia sessão para guardar vagas nos favoritos.', 'OK', { duration: 3000 });
      return;
    }

    this.recruiterService.toggleFavoriteVacancy(vacancy.id).subscribe({
      next: (res) => {
        vacancy.is_favorite = res.is_favorite;
        if (res.favorites_count_today !== undefined) {
          this.favoritesCountToday = res.favorites_count_today;
        }
        this.snackBar.open(res.message, 'OK', { duration: 3000 });
        this.loadMyFavorites();
        this.loadCommunityStats();
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erro ao atualizar favoritos.';
        this.snackBar.open(errorMsg, 'OK', { duration: 4000 });
      }
    });
  }

  markAsApplied(vacancy: Vacancy, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!this.auth.isLoggedIn) {
      this.snackBar.open('Inicia sessão para registar candidaturas.', 'OK', { duration: 3000 });
      return;
    }

    this.recruiterService.applyToVacancy(vacancy.id).subscribe({
      next: () => {
        vacancy.applied = true;
        vacancy.application_status = 'pending';
        this.snackBar.open('Candidatura marcada! Enviaremos um email em 1 semana a perguntar o resultado.', 'OK', { duration: 4000 });
        this.loadMyFavorites();
        this.loadCommunityStats();
      },
      error: () => {
        this.snackBar.open('Erro ao guardar candidatura.', 'OK', { duration: 3000 });
      }
    });
  }

  updateStatus(vacancy: Vacancy, status: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.recruiterService.updateApplicationStatus(vacancy.id, status).subscribe({
      next: (res) => {
        vacancy.application_status = status;
        this.snackBar.open(res.message || 'Estado da candidatura atualizado com sucesso!', 'OK', { duration: 3000 });
        this.loadMyFavorites();
        this.loadCommunityStats();
      },
      error: () => {
        this.snackBar.open('Erro ao atualizar estado.', 'OK', { duration: 3000 });
      }
    });
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { open: 'Aberto', in_progress: 'Em progresso', completed: 'Concluído', full: 'Vagas cheias' };
    return map[status] ?? status;
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = { open: 'accent', in_progress: 'primary', completed: '' };
    return map[status] ?? '';
  }

  isMatchedSkill(skill: string): boolean {
    if (!this.user || !this.user.skills) return false;
    const lowerSkill = skill.toLowerCase();
    return this.user.skills.some(s => s.toLowerCase() === lowerSkill);
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      summer_internship: 'Estágio de Verão',
      curricular_internship: 'Estágio Curricular',
      extracurricular_internship: 'Estágio Extracurricular',
      junior_position: 'Posição Junior'
    };
    return map[type] || type;
  }

  getInitials(companyName: string | undefined): string {
    if (!companyName) return 'V';
    const parts = companyName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return companyName.substring(0, 2).toUpperCase();
  }

  viewVacancyDetails(vacancyId: string): void {
    this.router.navigate(['/oportunidades', vacancyId]);
  }

  isWhiteTransparentLogo(url?: string): boolean {
    if (!url) return false;
    return url.includes('women_secret_logo');
  }

  trackByVacancyId(_index: number, v: Vacancy): string {
    return v.id;
  }
}
