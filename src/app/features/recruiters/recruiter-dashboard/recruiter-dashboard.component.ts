import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { AuthService } from '../../../core/services/auth.service';
import { Recruiter, Vacancy } from '../../../core/models/models';

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
  editingVacancy: Vacancy | null = null;
  renewVacancyId: string | null = null;

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
  }

  editVacancy(vacancy: Vacancy): void {
    this.editingVacancy = vacancy;
    this.showForm = true;
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
}
