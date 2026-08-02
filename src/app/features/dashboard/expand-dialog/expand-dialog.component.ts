import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Project, Vacancy } from '../../../core/models/models';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  getProjectCardDescription,
  getProjectCardSkillLabels,
  getProjectCardTitle,
} from '../../../core/utils/project-role.utils';

export interface ExpandDialogData {
  type: 'vacancies' | 'projects';
  title: string;
  vacancies?: Vacancy[];
  projects?: Project[];
  userSkills?: string[];
}

@Component({
  selector: 'app-expand-dialog',
  templateUrl: './expand-dialog.component.html',
  styleUrls: ['./expand-dialog.component.scss'],
  standalone: false
})
export class ExpandDialogComponent implements OnInit {
  readonly getProjectCardDescription = getProjectCardDescription;
  readonly getProjectCardSkillLabels = getProjectCardSkillLabels;
  readonly getProjectCardTitle = getProjectCardTitle;

  searchTerm = '';
  regionFilter = '';
  workModeFilter = 'all';
  employmentTypeFilter = 'all';
  experienceFilter = 'all';
  typeFilter = 'all';

  readonly experienceOptions = [
    { value: 'all',  label: 'Qualquer exp.' },
    { value: '0',    label: 'Sem experiência' },
    { value: '1',    label: 'Até 1 ano' },
    { value: '2',    label: 'Até 2 anos' },
    { value: '3',    label: 'Até 3 anos' },
  ];

  readonly typeOptions = [
    { value: 'all', label: 'Todas as Vagas' },
    { value: 'summer_internship', label: 'Estágio de Verão' },
    { value: 'curricular_internship', label: 'Estágio Curricular' },
    { value: 'professional_internship', label: 'Estágio Profissional' },
    { value: 'extracurricular_internship', label: 'Estágio Extracurricular' },
    { value: 'junior_position', label: 'Posição Junior' }
  ];

  filteredVacancies: Vacancy[] = [];
  filteredProjects: Project[] = [];

  constructor(
    private dialogRef: MatDialogRef<ExpandDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExpandDialogData,
    private router: Router,
    private recruiterService: RecruiterService,
    public auth: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.filterItems();
  }

  filterItems(): void {
    const term = this.searchTerm.trim().toLowerCase();

    if (this.data.type === 'vacancies' && this.data.vacancies) {
      let result = this.data.vacancies;

      if (term) {
        result = result.filter(v =>
          v.title.toLowerCase().includes(term) ||
          (v.description && v.description.toLowerCase().includes(term)) ||
          (v.recruiter?.company_name && v.recruiter.company_name.toLowerCase().includes(term)) ||
          (v.tags && v.tags.some(t => t.toLowerCase().includes(term)))
        );
      }

      if (this.typeFilter !== 'all') {
        result = result.filter(v => v.type === this.typeFilter);
      }

      if (this.regionFilter) {
        const lowerRegion = this.regionFilter.trim().toLowerCase();
        result = result.filter(v => v.region && v.region.toLowerCase().includes(lowerRegion));
      }

      if (this.workModeFilter !== 'all') {
        result = result.filter(v => v.work_mode === this.workModeFilter);
      }

      if (this.employmentTypeFilter !== 'all') {
        result = result.filter(v => v.employment_type === this.employmentTypeFilter);
      }

      if (this.experienceFilter !== 'all') {
        const maxYears = parseInt(this.experienceFilter, 10);
        result = result.filter(v => {
          const years = this.extractMaxExperienceYears(v.description);
          return years <= maxYears;
        });
      }

      this.filteredVacancies = result;
    } else if (this.data.type === 'projects' && this.data.projects) {
      if (!term) {
        this.filteredProjects = [...this.data.projects];
      } else {
        this.filteredProjects = this.data.projects.filter(p =>
          p.title.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
        );
      }
    }
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.regionFilter ||
      this.workModeFilter !== 'all' ||
      this.employmentTypeFilter !== 'all' ||
      this.experienceFilter !== 'all' ||
      this.typeFilter !== 'all'
    );
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.regionFilter = '';
    this.workModeFilter = 'all';
    this.employmentTypeFilter = 'all';
    this.experienceFilter = 'all';
    this.typeFilter = 'all';
    this.filterItems();
  }

  extractMaxExperienceYears(description: string): number {
    if (!description) return 0;
    const d = description.toLowerCase();

    const noExpPhrases = [
      'sem experiência', 'sem experiencia',
      'não é necessária experiência', 'não requer experiência',
      'no experience required', 'no prior experience', 'no experience needed',
      '0+ years', '0 years', '0 anos', '0-0 years', '0-0 anos',
      'entry level', 'entry-level'
    ];
    for (const p of noExpPhrases) {
      if (d.includes(p)) {
        return 0;
      }
    }

    const patterns = [
      /(\d+)\s*(?:[-–—]|to|a)\s*(\d+)\s*(?:anos?|years?|yrs?)/g,
      /(?:m[ií]nimo|min\.?|at least|pelo menos|at[ée]|up to|maximum|m[áa]ximo)\s*(\d+)\s*\+?\s*(?:anos?|years?|yrs?)/g,
      /(\d+)\s*\+?\s*(?:anos?|years?|yrs?)\s*(?:de\s+|of\s+)?(?:professional\s+|profissional\s+|effective\s+|efetiva\s+|efectiva\s+)?(?:experi[eê]nci|experienc)/g,
      /(?:experi[eê]nci|experienc)[^\n.]{0,35}?(\d+)\s*\+?\s*(?:anos?|years?|yrs?)/g,
      /(\d+)\+\s*(?:anos?|years?|yrs?)/g,
      /(\d+)\s+(?:anos?|years?|yrs?)\s*(?:de\s+|of\s+)?experi/g,
    ];

    let maxFound = -1;
    for (const re of patterns) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(d)) !== null) {
        if (match[1]) {
          const a = parseInt(match[1], 10);
          const b = match[2] ? parseInt(match[2], 10) : a;
          maxFound = Math.max(maxFound, Math.max(a, b));
        }
      }
    }

    if (maxFound === -1) {
      return 0;
    }
    return maxFound;
  }

  close(): void {
    this.dialogRef.close();
  }

  viewVacancy(id: string): void {
    this.dialogRef.close();
    this.router.navigate(['/oportunidades', id]);
  }

  viewProject(slug: string): void {
    this.dialogRef.close();
    this.router.navigate(['/projects', slug]);
  }

  toggleFavorite(vacancy: Vacancy, event: Event): void {
    event.stopPropagation();
    if (!this.auth.isLoggedIn) {
      this.snackBar.open('Inicia sessão para guardar vagas nos favoritos.', 'OK', { duration: 3000 });
      return;
    }

    this.recruiterService.toggleFavoriteVacancy(vacancy.id).subscribe({
      next: (res) => {
        vacancy.is_favorite = res.is_favorite;
        this.snackBar.open(res.message, 'OK', { duration: 3000 });
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erro ao atualizar favoritos.';
        this.snackBar.open(errorMsg, 'OK', { duration: 4000 });
      }
    });
  }

  isMatchedSkill(skill: string): boolean {
    if (!this.data.userSkills) return false;
    const lower = skill.toLowerCase();
    return this.data.userSkills.some(s => s.toLowerCase() === lower);
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

  isWhiteTransparentLogo(url?: string): boolean {
    if (!url) return false;
    return url.includes('women_secret_logo');
  }
}
