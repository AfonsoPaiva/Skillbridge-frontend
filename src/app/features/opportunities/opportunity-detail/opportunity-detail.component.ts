import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { AuthService } from '../../../core/services/auth.service';
import { Vacancy } from '../../../core/models/models';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { trigger, transition, style, animate } from '@angular/animations';

const DIALOG_CONFIG = {
  width: '540px',
  maxWidth: '95vw',
  maxHeight: '90vh',
  panelClass: ['onboarding-dialog', 'slide-in-dialog'],
  autoFocus: false,
  restoreFocus: false
};

@Component({
  selector: 'app-opportunity-detail',
  templateUrl: './opportunity-detail.component.html',
  styleUrls: ['./opportunity-detail.component.scss'],
  standalone: false,
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class OpportunityDetailComponent implements OnInit {
  vacancy: Vacancy | null = null;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recruiterService: RecruiterService,
    public auth: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadVacancy(id);
      } else {
        this.router.navigate(['/opportunities']);
      }
    });
  }

  loadVacancy(id: string): void {
    this.loading = true;
    this.error = false;
    this.recruiterService.getPublicVacancy(id).subscribe({
      next: (res) => {
        this.vacancy = res.vacancy;
        if (this.auth.isLoggedIn) {
          this.recruiterService.getMyFavoriteVacancies().subscribe({
            next: (favRes) => {
              if (this.vacancy && favRes?.vacancies) {
                const found = favRes.vacancies.find(v => v.id === this.vacancy?.id);
                if (found) {
                  this.vacancy.is_favorite = true;
                  this.vacancy.applied = found.applied;
                }
              }
            }
          });
        }
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/opportunities']);
  }

  getInitials(companyName: string | undefined): string {
    if (!companyName) return 'V';
    const parts = companyName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return companyName.substring(0, 2).toUpperCase();
  }

  getTypeLabel(type: string | undefined): string {
    if (!type) return '';
    const map: any = {
      'summer_internship': 'Estágio de Verão',
      'curricular_internship': 'Estágio Curricular',
      'extracurricular_internship': 'Estágio Extracurricular',
      'junior_position': 'Posição Junior'
    };
    return map[type] || type;
  }

  getWorkModeLabel(mode: string | undefined): string {
    if (!mode) return '';
    const map: any = {
      'hybrid': 'Híbrido',
      'remote': 'Remoto',
      'onsite': 'Presencial'
    };
    return map[mode] || mode;
  }

  getWorkModeIcon(mode: string | undefined): string {
    if (!mode) return 'work';
    const map: any = {
      'hybrid': 'swap_horiz',
      'remote': 'home_work',
      'onsite': 'business'
    };
    return map[mode] || 'work';
  }

  getEmploymentTypeLabel(type: string | undefined): string {
    if (!type) return '';
    const map: any = {
      'full_time': 'Full-time',
      'part_time': 'Part-time',
      'contract': 'Contrato'
    };
    return map[type] || type;
  }

  toggleFavorite(): void {
    if (!this.vacancy) return;

    if (!this.auth.isLoggedIn) {
      this.promptLogin();
      return;
    }

    this.recruiterService.toggleFavoriteVacancy(this.vacancy.id).subscribe({
      next: (res) => {
        if (this.vacancy) {
          this.vacancy.is_favorite = res.is_favorite;
          this.snackBar.open(res.message, 'OK', { duration: 3000 });
        }
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erro ao atualizar favoritos.';
        this.snackBar.open(errorMsg, 'OK', { duration: 4000 });
      }
    });
  }

  async promptLogin(): Promise<void> {
    const { LoginComponent } = await import('../../../features/onboarding/login/login.component');
    this.dialog.open(LoginComponent, { ...DIALOG_CONFIG, width: '420px' });
  }

  async applyToVacancy(): Promise<void> {
    if (!this.vacancy) return;
    
    if (!this.auth.isLoggedIn) {
      this.promptLogin();
      return;
    }

    this.recruiterService.applyToVacancy(this.vacancy.id).subscribe();
    this.vacancy.applied = true;
    this.vacancy.application_status = 'pending';
    this.snackBar.open('Candidatura registada! Em 1 semana enviaremos um email de acompanhamento.', 'OK', { duration: 4000 });

    if (this.vacancy.application_url) {
      window.open(this.vacancy.application_url, '_blank');
    }
  }

  updateStatus(status: string): void {
    if (!this.vacancy) return;
    if (!this.auth.isLoggedIn) {
      this.promptLogin();
      return;
    }

    const newStatus = (this.vacancy.application_status === status) ? 'pending' : status;

    this.recruiterService.updateApplicationStatus(this.vacancy.id, newStatus).subscribe({
      next: (res) => {
        if (this.vacancy) {
          this.vacancy.application_status = newStatus;
          const msg = newStatus === 'pending'
            ? 'Estado de candidatura removido.'
            : (res.message || 'Estado da candidatura atualizado!');
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        }
      },
      error: () => {
        this.snackBar.open('Erro ao atualizar estado da candidatura.', 'OK', { duration: 3000 });
      }
    });
  }

  isWhiteTransparentLogo(url?: string): boolean {
    if (!url) return false;
    return url.includes('women_secret_logo');
  }
}

