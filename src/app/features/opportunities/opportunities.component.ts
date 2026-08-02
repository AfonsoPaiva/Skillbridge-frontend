import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RecruiterService } from '../../core/services/recruiter.service';
import { AuthService } from '../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { Vacancy } from '../../core/models/models';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

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
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
   *   "1 ano de experiência", "2 anos", "mínimo 2 anos", "1-2 anos",
   *   "sem experiência", "0 anos", "no experience required"
   * Returns 0 if no experience is required / not mentioned.
   */
  extractMaxExperienceYears(description: string): number {
    if (!description) return 0;
    const d = description.toLowerCase();

    // Explicit "no experience" → 0 years
    if (
      d.includes('sem experiência') ||
      d.includes('sem experiencia') ||
      d.includes('não é necessária experiência') ||
      d.includes('não requer experiência') ||
      d.includes('no experience required') ||
      d.includes('no prior experience')
    ) {
      return 0;
    }

    // Match patterns like "1 ano", "2 anos", "1-2 anos", "até 3 anos", "mínimo 2 anos"
    const patterns = [
      /(\d+)\s*[-–a]\s*(\d+)\s*anos?\s*de\s*experi/,  // "1-2 anos de experiência" → take max
      /m[ií]nimo\s+(\d+)\s+anos?/,                      // "mínimo 2 anos"
      /at[ée]\s+(\d+)\s+anos?/,                         // "até 2 anos"
      /(\d+)\+\s*anos?/,                                 // "2+ anos"
      /(\d+)\s+anos?\s*de\s*experi/,                    // "2 anos de experiência"
      /(\d+)\s+ano\s*de\s*experi/,                      // "1 ano de experiência"
      /(\d+)\s+years?\s*of\s*experience/,               // "2 years of experience"
    ];

    let maxFound = -1;
    for (const re of patterns) {
      const m = d.match(re);
      if (m) {
        // If range pattern (group 1 and 2), take the larger number
        const a = parseInt(m[1], 10);
        const b = m[2] ? parseInt(m[2], 10) : a;
        maxFound = Math.max(maxFound, Math.max(a, b));
      }
    }

    // If experience was mentioned but we couldn't parse a number, assume it's > 3
    if (maxFound === -1) {
      if (d.includes('experiência') || d.includes('experiencia') || d.includes('experience')) {
        return 0; // mentions exist but no number → treat as entry-level (safe default)
      }
      return 0; // no mention at all → entry-level
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
