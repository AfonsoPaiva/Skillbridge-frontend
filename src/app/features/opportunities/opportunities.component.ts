import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RecruiterService } from '../../core/services/recruiter.service';
import { AuthService } from '../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { Vacancy } from '../../core/models/models';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

import { MatSnackBar } from '@angular/material/snack-bar';

const DIALOG_CONFIG = {
  width: '540px',
  maxWidth: '95vw',
  maxHeight: '90vh',
  panelClass: ['onboarding-dialog', 'slide-in-dialog'],
  autoFocus: false,
  restoreFocus: false
};

@Component({
  selector: 'app-opportunities',
  templateUrl: './opportunities.component.html',
  styleUrls: ['./opportunities.component.scss'],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('list', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(20, [
            animate('0.35s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class OpportunitiesComponent implements OnInit {
  vacancies: Vacancy[] = [];
  filtered: Vacancy[] = [];
  displayed: Vacancy[] = [];
  page = 1;
  pageSize = 30;
  loading = true;
  search = '';
  typeFilter = 'all';
  regionFilter = '';
  workModeFilter = 'all';
  employmentTypeFilter = 'all';
  experienceFilter = 'all';

  readonly experienceOptions = [
    { value: 'all',  label: 'Qualquer experiência' },
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

  constructor(
    public auth: AuthService,
    private recruiterService: RecruiterService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadVacancies();
  }

  loadVacancies(): void {
    this.loading = true;
    this.recruiterService.listPublicVacancies().subscribe({
      next: (res) => {
        this.vacancies = res.vacancies || [];
        if (this.auth.isLoggedIn) {
          this.recruiterService.getMyFavoriteVacancies().subscribe({
            next: (favRes) => {
              if (favRes?.vacancies) {
                const favSet = new Set(favRes.vacancies.map(f => f.id));
                this.vacancies.forEach(v => {
                  if (favSet.has(v.id)) {
                    v.is_favorite = true;
                  }
                });
              }
              this.applyFilters();
              this.loading = false;
            },
            error: () => {
              this.applyFilters();
              this.loading = false;
            }
          });
        } else {
          this.applyFilters();
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  toggleFavorite(vacancy: Vacancy, event: Event): void {
    event.stopPropagation();
    if (!this.auth.isLoggedIn) {
      this.viewDetails(vacancy.id);
      return;
    }
    this.recruiterService.toggleFavoriteVacancy(vacancy.id).subscribe({
      next: (res) => {
        vacancy.is_favorite = res.is_favorite;
        this.snackBar.open(res.message, 'OK', { duration: 3000 });
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erro ao atualizar favoritos.';
        this.snackBar.open(errorMsg, 'OK', { duration: 3000 });
      }
    });
  }

  applyFilters(): void {
    let result = this.vacancies;

    if (this.search) {
      const lower = this.search.toLowerCase();
      result = result.filter(v => 
        v.title.toLowerCase().includes(lower) || 
        v.description.toLowerCase().includes(lower) ||
        v.tags.some(t => t.toLowerCase().includes(lower))
      );
    }

    if (this.typeFilter !== 'all') {
      result = result.filter(v => v.type === this.typeFilter);
    }
    
    if (this.regionFilter) {
      const lowerRegion = this.regionFilter.toLowerCase();
      result = result.filter(v => v.region && v.region.toLowerCase().includes(lowerRegion));
    }
    
    if (this.workModeFilter !== 'all') {
      result = result.filter(v => v.work_mode === this.workModeFilter);
    }
    
    if (this.employmentTypeFilter !== 'all') {
      result = result.filter(v => v.employment_type === this.employmentTypeFilter);
    }

    // Filter by years of experience (parsed from description)
    if (this.experienceFilter !== 'all') {
      const maxYears = parseInt(this.experienceFilter, 10);
      result = result.filter(v => {
        const years = this.extractMaxExperienceYears(v.description);
        // If no experience mentioned, treat as 0 (entry-level)
        return years <= maxYears;
      });
    }

    this.filtered = result;
    this.page = 1;
    this.displayed = this.filtered.slice(0, this.pageSize);
  }

  /**
   * Extracts the maximum number of years of experience mentioned in a job description.
   * Handles patterns like:
   *   "1 ano de experiência", "2 anos", "mínimo 2 anos", "1-2 anos", "(1–2 years)",
   *   "sem experiência", "0 anos", "no experience required"
   * Returns 0 if no experience is required / not mentioned.
   */
  extractMaxExperienceYears(description: string): number {
    if (!description) return 0;
    const d = description.toLowerCase();

    // Explicit "no experience" → 0 years
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
      // 1. Range of years (e.g. "1-2 years", "1–2 years", "1 to 2 years", "1 a 2 anos", "0-1 years")
      /(\d+)\s*(?:[-–—]|to|a)\s*(\d+)\s*(?:anos?|years?|yrs?)/g,

      // 2. Prefixes like "mínimo 2 anos", "min 2 years", "at least 3 years", "up to 2 years", "até 2 anos"
      /(?:m[ií]nimo|min\.?|at least|pelo menos|at[ée]|up to|maximum|m[áa]ximo)\s*(\d+)\s*\+?\s*(?:anos?|years?|yrs?)/g,

      // 3. Experience context + numbers + years (e.g. "2+ years of experience", "2 anos de experiência", "1 year of experience")
      /(\d+)\s*\+?\s*(?:anos?|years?|yrs?)\s*(?:de\s+|of\s+)?(?:professional\s+|profissional\s+|effective\s+|efetiva\s+|efectiva\s+)?(?:experi[eê]nci|experienc)/g,

      // 4. Experience word followed within ~35 chars by number + years (e.g. "experience (1–2 years)", "experience: 2 years")
      /(?:experi[eê]nci|experienc)[^\n.]{0,35}?(\d+)\s*\+?\s*(?:anos?|years?|yrs?)/g,

      // 5. Direct year requirement with plus: "2+ years", "3+ anos", "2+ yrs"
      /(\d+)\+\s*(?:anos?|years?|yrs?)/g,

      // 6. Generic "X years" / "X anos" near experience terms
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
      return 0; // no mention → treat as entry-level
    }

    return maxFound;
  }

  loadMore(): void {
    const next = this.filtered.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize);
    this.displayed = [...this.displayed, ...next];
    this.page++;
  }

  isMatchedSkill(skill: string): boolean {
    if (!this.auth.currentUserSkills) return false;
    const lowerSkill = skill.toLowerCase();
    return this.auth.currentUserSkills.some(s => s.toLowerCase() === lowerSkill);
  }

  onTypeChange(type: string): void {
    this.typeFilter = type;
    this.applyFilters();
  }

  getTypeLabel(type: string): string {
    const opt = this.typeOptions.find(o => o.value === type);
    return opt ? opt.label : type;
  }

  getWorkModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      hybrid: 'Híbrido',
      remote: 'Remoto',
      onsite: 'Presencial'
    };
    return labels[mode] || mode;
  }

  getEmploymentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      full_time: 'Full-time',
      part_time: 'Part-time',
      contract: 'Contrato'
    };
    return labels[type] || type;
  }

  async viewDetails(vacancyId: string): Promise<void> {
    if (!this.auth.isLoggedIn) {
      const { OnboardingComponent } = await import('../../features/onboarding/onboarding.component');
      this.dialog.open(OnboardingComponent, { ...DIALOG_CONFIG });
      return;
    }

    // Is logged in, proceed to details page
    this.router.navigate(['/oportunidades', vacancyId]);
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

  trackByVacancyId(_index: number, v: Vacancy): string {
    return v.id;
  }
}
