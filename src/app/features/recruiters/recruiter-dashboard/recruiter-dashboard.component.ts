import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { AuthService } from '../../../core/services/auth.service';
import { Recruiter, Vacancy, ScrapedJob } from '../../../core/models/models';
import { environment } from '../../../../environments/environment';
import { forkJoin } from 'rxjs';
import { FormControl } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { SkillSection, SkillsListResponse } from '../../../core/models/models';
import { sanitizeInput } from '../../../core/utils/search.utils';
import { startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  showAutoImport = false;
  editingVacancy: Vacancy | null = null;
  renewVacancyId: string | null = null;
  companyUrlForm: string = '';
  logoError: boolean = false;

  // Auto-import state
  scrapeUrl: string = '';
  scraping = false;
  importing = false;
  activeTabIndex = 0;
  termsAccepted = false;
  scrapedJobs: ScrapedJob[] = [];
  scrapeMessage: string = '';

  // Skills
  availableSkills: string[] = [];
  availableSkillSections: SkillSection[] = [];
  filteredSkillSections: SkillSection[] = [];
  skillSearchControl = new FormControl('');
  removingSkill = '';

  readonly vacancyTypeLabels: Record<string, string> = {
    'summer_internship': 'Estágio de Verão',
    'curricular_internship': 'Estágio Curricular',
    'extracurricular_internship': 'Estágio Extracurricular',
    'junior_position': 'Posição Junior'
  };

  constructor(
    private recruiterService: RecruiterService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.renewVacancyId = this.route.snapshot.queryParamMap.get('renew');
    this.loadData();

    // Load skills
    this.api.listSkills().subscribe({ 
      next: (res: SkillsListResponse) => {
        this.availableSkills = res.skills || [];
        this.availableSkillSections = res.sections || [];
        this.updateFilteredSkillSections();
      }
    });

    this.skillSearchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(150),
      distinctUntilChanged()
    ).subscribe(() => {
      this.updateFilteredSkillSections();
    });
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
    this.showAutoImport = false;
  }

  editVacancy(vacancy: Vacancy): void {
    this.editingVacancy = vacancy;
    this.showForm = true;
    this.showCompanyForm = false;
    this.showAutoImport = false;
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
    this.showAutoImport = false;
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

  // --- Auto Import ---

  openAutoImport(): void {
    this.showAutoImport = true;
    this.showForm = false;
    this.showCompanyForm = false;
    this.scrapedJobs = [];
    this.scrapeMessage = '';
    // Pre-fill with company URL if available
    if (this.recruiter?.company_url) {
      this.scrapeUrl = this.recruiter.company_url;
    }
  }

  cancelAutoImport(): void {
    this.showAutoImport = false;
    this.scrapedJobs = [];
    this.scrapeMessage = '';
    this.scrapeUrl = '';
    this.activeTabIndex = 0;
  }

  scrapeVacancies(): void {
    if (!this.scrapeUrl) return;

    this.scraping = true;
    this.scrapedJobs = [];
    this.scrapeMessage = '';

    this.recruiterService.scrapeVacancies(this.scrapeUrl).subscribe({
      next: (res) => {
        this.scraping = false;
        if (res.jobs && res.jobs.length > 0) {
          this.scrapedJobs = res.jobs;
          this.activeTabIndex = 0;
          this.scrapeMessage = '';
        } else {
          this.scrapedJobs = [];
          this.scrapeMessage = res.message || 'Não foram encontradas vagas de entrada/estágio nesta página.';
        }
      },
      error: (err) => {
        this.scraping = false;
        this.scrapeMessage = err.error?.error || 'Erro ao procurar vagas. Verifique o URL e tente novamente.';
      }
    });
  }

  confirmScrapedJob(index: number): void {
    const job = this.scrapedJobs[index];
    this.importing = true;
    this.recruiterService.createVacancy({
      title: job.title,
      type: job.type,
      tags: job.tags || [],
      description: job.description || 'Importado automaticamente.',
      application_url: job.application_url,
      region: job.region,
      work_mode: job.work_mode,
      employment_type: job.employment_type
    }).subscribe({
      next: () => {
        this.importing = false;
        this.snackBar.open(`Vaga "${job.title}" importada com sucesso!`, 'OK', { duration: 3000 });
        this.scrapedJobs.splice(index, 1);
        
        // Adjust tab index if needed
        if (this.activeTabIndex >= this.scrapedJobs.length) {
          this.activeTabIndex = Math.max(0, this.scrapedJobs.length - 1);
        }

        if (this.scrapedJobs.length === 0) {
          this.showAutoImport = false;
        }
        this.loadData();
      },
      error: (err) => {
        this.importing = false;
        this.snackBar.open(err.error?.error || 'Erro ao importar vaga. Tenta novamente.', 'OK');
      }
    });
  }

  rejectScrapedJob(index: number): void {
    this.scrapedJobs.splice(index, 1);
    // Adjust tab index if needed
    if (this.activeTabIndex >= this.scrapedJobs.length) {
      this.activeTabIndex = Math.max(0, this.scrapedJobs.length - 1);
    }
    
    if (this.scrapedJobs.length === 0) {
      this.showAutoImport = false;
    }
  }

  addTagToScrapedJob(job: ScrapedJob, skillName?: string): void {
    const rawSkill = (skillName ?? this.skillSearchControl.value ?? '').toString().trim();
    const skill = this.resolveSkill(rawSkill);
    if (!skill || (job.tags && job.tags.includes(skill))) return;

    if (!job.tags) job.tags = [];
    job.tags.push(skill);
    this.skillSearchControl.setValue('', { emitEvent: false });
    this.updateFilteredSkillSections();
  }

  removeTagFromScrapedJob(job: ScrapedJob, tag: string): void {
    if (!job.tags) return;
    job.tags = job.tags.filter(t => t !== tag);
    this.updateFilteredSkillSections();
  }

  updateFilteredSkillSections(): void {
    const query = sanitizeInput((this.skillSearchControl.value || '').toString()).toLowerCase();
    const activeJob = this.scrapedJobs[this.activeTabIndex];
    const currentTags = activeJob?.tags || [];

    this.filteredSkillSections = this.availableSkillSections
      .map(section => ({
        ...section,
        skills: section.skills.filter(skill => {
          if (currentTags.includes(skill)) return false;
          if (!query) return true;
          return skill.toLowerCase().includes(query);
        })
      }))
      .filter(section => section.skills.length > 0);
  }

  onTabChange(): void {
    this.updateFilteredSkillSections();
  }

  prevScrapedJob(): void {
    if (this.activeTabIndex > 0) {
      this.activeTabIndex--;
      this.onTabChange();
    }
  }

  nextScrapedJob(): void {
    if (this.activeTabIndex < this.scrapedJobs.length - 1) {
      this.activeTabIndex++;
      this.onTabChange();
    }
  }

  trackBySectionLabel(_: number, section: SkillSection): string {
    return section.label;
  }

  trackBySkill(_: number, skill: string): string {
    return skill;
  }

  private resolveSkill(rawSkill: string): string {
    if (!rawSkill) return '';
    const exact = this.availableSkills.find(s => s === rawSkill);
    if (exact) return exact;

    const normalized = rawSkill.toLowerCase();
    const caseInsensitive = this.availableSkills.find(s => s.toLowerCase() === normalized);
    if (caseInsensitive) return caseInsensitive;

    this.snackBar.open('Seleciona uma competência válida da lista.', 'Fechar', { duration: 3000 });
    return '';
  }

  // --- Label helpers ---

  getVacancyTypeLabel(type: string): string {
    return this.vacancyTypeLabels[type] || type;
  }

  getWorkModeLabel(mode: string): string {
    switch (mode) {
      case 'hybrid': return 'Híbrido';
      case 'remote': return 'Remoto';
      case 'onsite': return 'Presencial';
      default: return mode;
    }
  }

  getWorkModeIcon(mode: string): string {
    switch (mode) {
      case 'hybrid': return 'sync_alt';
      case 'remote': return 'home';
      case 'onsite': return 'business';
      default: return 'place';
    }
  }

  getEmploymentTypeLabel(type: string): string {
    switch (type) {
      case 'full_time': return 'Full-time';
      case 'part_time': return 'Part-time';
      case 'contract': return 'Contrato';
      default: return type;
    }
  }
}
