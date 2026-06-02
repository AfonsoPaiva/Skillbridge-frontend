import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RecruiterService } from '../../core/services/recruiter.service';
import { User, Project, Vacancy } from '../../core/models/models';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { Subscription } from 'rxjs';
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
          stagger(60, [animate('350ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'none' }))])
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
  loadingUser = true;
  loadingProjects = true;
  loadingVacancies = true;
  activeTab = 0;
  private userSub?: Subscription;

  constructor(
    public auth: AuthService, 
    private api: ApiService,
    private recruiterService: RecruiterService
  ) {}

  ngOnInit(): void {
    // Use cached user profile for instant header load
    this.userSub = this.auth.user$.subscribe(u => {
      this.user = u;
      this.loadingUser = false;
      this.filterRecommendedProjects();
      this.filterRecommendedVacancies();
    });

    // Always revalidate profile from API so role/skills changes reflect immediately
    // when returning to dashboard after editing profile.
    this.refreshProfile();

    // request all statuses so that items don't vanish when the status
    // is changed on the backend (the API defaults to `status=open`).
    this.api.listProjects('all').subscribe({
      next: (p: Project[]) => { 
        this.projects = p; 
        this.loadingProjects = false;
        this.filterRecommendedProjects();
      },
      error: () => { this.loadingProjects = false; }
    });

    this.recruiterService.listPublicVacancies().subscribe({
      next: (res) => {
        this.vacancies = res.vacancies || [];
        this.loadingVacancies = false;
        this.filterRecommendedVacancies();
      },
      error: () => { this.loadingVacancies = false; }
    });
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

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  filterRecommendedProjects(): void {
    if (!this.user || !this.user.skills || this.user.skills.length === 0) {
      this.recommendedProjects = [];
      return;
    }

    const userSkills = new Set(this.user.skills.map(skill => skill.toLowerCase()));

    // Filter projects that have roles matching at least one of the user's skills
    this.recommendedProjects = this.projects.filter(project => {
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

    // If the user meant "as mesmas skills das ofertas de estagios",
    // maybe they meant ONLY internship offers that match the user's skills?
    // Let's filter all vacancies that match the user's skills.
    this.recommendedVacancies = this.vacancies.filter(v => {
      if (!v.tags || v.tags.length === 0) return false;
      return v.tags.some(tag => userSkills.has(tag.toLowerCase()));
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

  applyToVacancy(v: Vacancy): void {
    window.open(v.application_url, '_blank');
  }
}
