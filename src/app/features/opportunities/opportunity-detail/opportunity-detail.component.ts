import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { AuthService } from '../../../core/services/auth.service';
import { Vacancy } from '../../../core/models/models';
import { MatDialog } from '@angular/material/dialog';
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
    private dialog: MatDialog
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
      'junior_position': 'Posição Junior'
    };
    return map[type] || type;
  }

  async applyToVacancy(): Promise<void> {
    if (!this.vacancy) return;
    
    if (!this.auth.isLoggedIn) {
      const { LoginComponent } = await import('../../../features/onboarding/login/login.component');
      this.dialog.open(LoginComponent, { ...DIALOG_CONFIG, width: '420px' });
      return;
    }

    // Is logged in, proceed to application URL in new tab
    window.open(this.vacancy.application_url, '_blank');
  }
}

