import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { AuthService } from '../../../core/services/auth.service';
import { Recruiter, Vacancy } from '../../../core/models/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-recruiter-dashboard',
  templateUrl: './recruiter-dashboard.component.html',
  styleUrls: ['./recruiter-dashboard.component.scss']
})
export class RecruiterDashboardComponent implements OnInit {
  recruiter: Recruiter | null = null;
  vacancies: Vacancy[] = [];
  loading = true;
  showForm = false;
  showCompanyForm = false;
  editingVacancy: Vacancy | null = null;
  renewVacancyId: string | null = null;
  companyUrlForm: string = '';
  logoError: boolean = false;

  readonly vacancyTypeLabels: Record<string, string> = {
    'summer_internship': 'Estágio de Verão',
    'curricular_internship': 'Estágio Curricular',
    'junior_position': 'Posição Junior'
  };

  constructor(
    private recruiterService: RecruiterService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.renewVacancyId = this.route.snapshot.queryParamMap.get('renew');
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;

    this.recruiterService.getProfile().subscribe({
      next: (profile) => {
        this.recruiter = profile;
      }
    });

    this.recruiterService.listMyVacancies().subscribe({
      next: (res) => {
        this.vacancies = res.vacancies || [];
        this.loading = false;

        // If renew param, open edit form for that vacancy
        if (this.renewVacancyId) {
          const vacancy = this.vacancies.find(v => v.id === this.renewVacancyId);
          if (vacancy) {
            this.editVacancy(vacancy);
          }
          this.renewVacancyId = null;
        }

        // If no vacancies, show form by default
        if (this.vacancies.length === 0) {
          this.showForm = true;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  newVacancy(): void {
    this.editingVacancy = null;
    this.showForm = true;
    this.showCompanyForm = false;
  }

  editVacancy(vacancy: Vacancy): void {
    this.editingVacancy = vacancy;
    this.showForm = true;
    this.showCompanyForm = false;
  }

  onVacancySaved(): void {
    this.showForm = false;
    this.editingVacancy = null;
    this.loadData();
    this.snackBar.open('Vaga guardada com sucesso.', 'OK');
  }

  onFormCancelled(): void {
    this.showForm = false;
    this.editingVacancy = null;
  }

  archiveVacancy(vacancy: Vacancy): void {
    if (!confirm(`Tens a certeza que queres arquivar a vaga "${vacancy.title}"?`)) return;

    this.recruiterService.deleteVacancy(vacancy.id).subscribe({
      next: () => {
        this.snackBar.open('Vaga arquivada.', 'OK');
        this.loadData();
      },
      error: () => {
        this.snackBar.open('Erro ao arquivar vaga.', 'OK');
      }
    });
  }

  permanentlyDeleteVacancy(vacancy: Vacancy): void {
    if (!confirm(`Tens a certeza absoluta que queres apagar permanentemente a vaga "${vacancy.title}"?`)) return;

    this.recruiterService.permanentlyDeleteVacancy(vacancy.id).subscribe({
      next: () => {
        this.snackBar.open('Vaga eliminada permanentemente.', 'OK');
        this.loadData();
      },
      error: () => {
        this.snackBar.open('Erro ao eliminar vaga.', 'OK');
      }
    });
  }

  renewVacancy(vacancy: Vacancy): void {
    this.recruiterService.updateVacancy(vacancy.id, { status: 'active' }).subscribe({
      next: () => {
        this.snackBar.open('Vaga renovada por mais 30 dias.', 'OK');
        this.loadData();
      },
      error: () => {
        this.snackBar.open('Erro ao renovar vaga.', 'OK');
      }
    });
  }

  logout(): void {
    this.auth.clearSession();
    window.location.href = '/recrutadores';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Ativa';
      case 'expired': return 'Expirada';
      case 'archived': return 'Arquivada';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    return `status--${status}`;
  }

  editCompany(): void {
    this.companyUrlForm = this.recruiter?.company_url || '';
    this.logoError = false;
    this.showCompanyForm = true;
    this.showForm = false;
  }

  onLogoError(): void {
    this.logoError = true;
  }

  saveCompany(): void {
    this.recruiterService.updateProfile({ 
      company_url: this.companyUrlForm,
      logo_url: this.recruiter?.logo_url 
    }).subscribe({
      next: (res) => {
        if (this.recruiter) {
          // Fallback to local value if backend hasn't been updated yet to return it
          this.recruiter.company_url = res.company_url || this.companyUrlForm;
          if (res.logo_url) {
            this.recruiter.logo_url = res.logo_url;
            this.logoError = false;
          }
        }
        this.snackBar.open('Perfil atualizado com sucesso.', 'OK');
        this.showCompanyForm = false;
      },
      error: () => {
        this.snackBar.open('Erro ao atualizar perfil.', 'OK');
      }
    });
  }

  cancelCompany(): void {
    this.showCompanyForm = false;
  }

  deleteAccount(): void {
    if (!confirm('Tem a certeza absoluta que deseja apagar a sua conta de recrutador? Esta ação é irreversível e todas as suas vagas e dados serão eliminados para sempre.')) return;

    this.recruiterService.deleteProfile().subscribe({
      next: () => {
        this.snackBar.open('Conta eliminada com sucesso.', 'OK');
        this.logout();
      },
      error: () => {
        this.snackBar.open('Erro ao eliminar conta.', 'OK');
      }
    });
  }

  // --- Logo Management ---
  uploadingLogo = false;

  getInitials(companyName: string | undefined): string {
    if (!companyName) return 'C';
    const parts = companyName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return companyName.substring(0, 2).toUpperCase();
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) {
        this.snackBar.open('O ficheiro é demasiado grande. Máximo 10MB.', 'OK');
        return;
      }

      this.uploadingLogo = true;
      this.recruiterService.uploadLogo(file).subscribe({
        next: (res) => {
          this.updateProfileLogo(res.url);
          this.uploadingLogo = false;
        },
        error: () => {
          this.snackBar.open('Erro ao fazer upload da imagem.', 'OK');
          this.uploadingLogo = false;
        }
      });
    }
  }


  private updateProfileLogo(url: string): void {
    this.recruiterService.updateProfile({ logo_url: url }).subscribe({
      next: (res) => {
        if (this.recruiter) {
          this.recruiter.logo_url = res.logo_url;
        }
        this.snackBar.open('Logótipo atualizado com sucesso.', 'OK');
      },
      error: () => {
        this.snackBar.open('Erro ao guardar o logótipo.', 'OK');
      }
    });
  }
}

