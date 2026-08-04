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
    { value: 'ranking_desc', label: 'Mais Bem Classificadas (10 - 0)' },
    { value: 'reviews_desc', label: 'Mais Avaliadas' },
    { value: 'name_asc', label: 'Nome da Universidade (A-Z)' },
    { value: 'ranking_asc', label: 'Menos Classificadas' }
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
    this.loadRankings();
  }

  canUserReview(univ: UniversityRankingSummary): boolean {
    if (!this.auth.isLoggedIn) return false;
    const profile = this.auth.cachedProfile;
    if (!profile) return false;

    const target = (univ.estabelecimento || '').trim().toLowerCase();
    const currentUniv = (profile.university || '').trim().toLowerCase();
    const licUniv = (profile.licenciatura_university || '').trim().toLowerCase();

    return (currentUniv !== '' && currentUniv === target) || (licUniv !== '' && licUniv === target);
  }

  loadRankings(): void {
    this.isLoading = true;
    this.api.getUniversityRankings(this.searchQuery, this.selectedSort).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.universities = data || [];
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

  fallbackLogo(univ: UniversityRankingSummary): string {
    const domain = univ.estabelecimento
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') + '.pt';
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  }

  onImageError(event: any, univ: UniversityRankingSummary): void {
    event.target.src = this.fallbackLogo(univ);
  }

  openUniversityDetails(univ: UniversityRankingSummary): void {
    this.router.navigate(['/ranking', encodeURIComponent(univ.estabelecimento)]);
  }

  openReviewDirect(event: MouseEvent, univ: UniversityRankingSummary): void {
    event.stopPropagation();
    if (!this.auth.isLoggedIn) {
      this.snackBar.open('Tens de ter uma conta para avaliar a tua instituição.', 'Fechar', { duration: 4000 });
      return;
    }
    this.router.navigate(['/ranking', encodeURIComponent(univ.estabelecimento)], { queryParams: { mode: 'evaluate' } });
  }
}
