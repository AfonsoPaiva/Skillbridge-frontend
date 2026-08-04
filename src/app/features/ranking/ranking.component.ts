import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { UniversityRankingSummary } from '../../core/models/models';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss']
})
export class RankingComponent implements OnInit {
  universities: UniversityRankingSummary[] = [];
  filteredUniversities: UniversityRankingSummary[] = [];
  displayedUniversities: UniversityRankingSummary[] = [];
  isLoading = true;

  page = 1;
  pageSize = 20;
  hasMore = false;

  searchQuery = '';
  selectedSort = 'ranking_desc';

  sortOptions = [
    { value: 'ranking_desc', label: 'Mais Bem Classificadas' },
    { value: 'name_asc', label: 'Por Nome' }
  ];

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn && !this.auth.cachedProfile) {
      this.auth.prefetchUserProfile(this.api);
    }

    this.auth.user$.subscribe(() => {
      if (this.universities.length > 0) {
        this.universities = this.sortUserEligibleFirst([...this.universities]);
        this.filteredUniversities = this.universities;
        this.updateDisplayed();
      }
    });

    this.loadRankings();
  }

  normalizeStr(str: string): string {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  canUserReview(univ: UniversityRankingSummary): boolean {
    if (!this.auth.isLoggedIn) return false;
    const profile = this.auth.cachedProfile;
    if (!profile) return false;

    const target = this.normalizeStr(univ.estabelecimento);
    const currentUniv = this.normalizeStr(profile.university || '');
    const licUniv = this.normalizeStr(profile.licenciatura_university || '');

    return (currentUniv !== '' && currentUniv === target) || (licUniv !== '' && licUniv === target);
  }

  sortUserEligibleFirst(list: UniversityRankingSummary[]): UniversityRankingSummary[] {
    const profile = this.auth.cachedProfile;
    if (!profile) return list;

    const userCurrentNorm = this.normalizeStr(profile.university || '');
    const userLicNorm = this.normalizeStr(profile.licenciatura_university || '');

    if (!userCurrentNorm && !userLicNorm) return list;

    const eligible: UniversityRankingSummary[] = [];
    const others: UniversityRankingSummary[] = [];

    for (const item of list) {
      const itemNorm = this.normalizeStr(item.estabelecimento);
      const isEligible = (userCurrentNorm !== '' && itemNorm === userCurrentNorm) ||
                         (userLicNorm !== '' && itemNorm === userLicNorm);

      if (isEligible) {
        eligible.push(item);
      } else {
        others.push(item);
      }
    }

    return [...eligible, ...others];
  }

  loadRankings(): void {
    this.isLoading = true;
    this.api.getUniversityRankings(this.searchQuery, this.selectedSort).subscribe({
      next: (data) => {
        this.isLoading = false;
        const raw = data || [];
        this.universities = this.sortUserEligibleFirst(raw);
        this.filteredUniversities = this.universities;
        this.page = 1;
        this.updateDisplayed();
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Erro ao carregar ranking das universidades.', 'Fechar', { duration: 4000 });
      }
    });
  }

  updateDisplayed(): void {
    this.displayedUniversities = this.filteredUniversities.slice(0, this.page * this.pageSize);
    this.hasMore = this.displayedUniversities.length < this.filteredUniversities.length;
  }

  loadMore(): void {
    this.page++;
    this.updateDisplayed();
  }

  onSearch(): void {
    this.loadRankings();
  }

  onSortChange(): void {
    this.loadRankings();
  }

  getScoreColorClass(score: number): string {
    if (!score || score <= 0) return 'score-neutral';
    if (score <= 2) return 'score-red';
    if (score <= 6) return 'score-yellow';
    return 'score-green';
  }

  readonly defaultLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%2368007a"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>`;

  fallbackLogo(univ: UniversityRankingSummary): string {
    return this.defaultLogo;
  }

  onImageError(event: any, univ?: UniversityRankingSummary): void {
    if (event.target.src === this.defaultLogo) return;
    event.target.src = this.defaultLogo;
  }

  slugify(text: string): string {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  openUniversityDetails(univ: UniversityRankingSummary): void {
    this.router.navigate(['/ranking', this.slugify(univ.estabelecimento)]);
  }

  openReviewDirect(event: MouseEvent, univ: UniversityRankingSummary): void {
    event.stopPropagation();
    if (!this.auth.isLoggedIn) {
      this.snackBar.open('Tens de ter uma conta para avaliar a tua instituição.', 'Fechar', { duration: 4000 });
      return;
    }
    this.router.navigate(['/ranking', this.slugify(univ.estabelecimento)], { queryParams: { mode: 'evaluate' } });
  }
}
