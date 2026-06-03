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
  brandfetchUrl: string = '';
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
    this.brandfetchUrl = this.recruiter?.logo_url || '';
    this.logoError = false;
    this.showCompanyForm = true;
    this.showForm = false;
  }

  fetchBrandfetchLogo(): void {
    if (!this.companyUrlForm) {
      this.snackBar.open('Insere o website da empresa primeiro.', 'OK');
      return;
    }
    try {
      const url = new URL(this.companyUrlForm.startsWith('http') ? this.companyUrlForm : `https://${this.companyUrlForm}`);
      const domain = url.hostname.replace(/^www\./, '');
      this.brandfetchUrl = `https://logo.clearbit.com/${domain}`;
      this.logoError = false;
      this.snackBar.open('Logótipo obtido com sucesso!', 'OK');
    } catch (e) {
      this.snackBar.open('URL inválido.', 'OK');
    }
  }

  onLogoError(): void {
    this.logoError = true;
    this.brandfetchUrl = '';
  }

  saveCompany(): void {
    this.recruiterService.updateProfile({ 
      company_url: this.companyUrlForm,
      logo_url: this.brandfetchUrl || this.recruiter?.logo_url 
    }).subscribe({
      next: (res) => {
        if (this.recruiter) {
          // Fallback to local value if backend hasn't been updated yet to return it
          this.recruiter.company_url = res.company_url || this.companyUrlForm;
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
    this.brandfetchUrl = url;
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

