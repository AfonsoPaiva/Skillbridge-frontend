import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { UniversityRankingSummary } from '../../core/models/models';
import { UniversityDetailDialogComponent } from './university-detail-dialog/university-detail-dialog.component';
import { UniversityReviewDialogComponent } from './university-review-dialog/university-review-dialog.component';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss']
})
export class RankingComponent implements OnInit {
  universities: UniversityRankingSummary[] = [];
  filteredUniversities: UniversityRankingSummary[] = [];
  isLoading = true;

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
    private auth: AuthService,
    private dialog: MatDialog,
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
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Erro ao carregar ranking das universidades.', 'Fechar', { duration: 4000 });
      }
    });
  }

  onSearch(): void {
    this.loadRankings();
  }

  onSortChange(): void {
    this.loadRankings();
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
    this.dialog.open(UniversityDetailDialogComponent, {
      width: '820px',
      data: { university: univ }
    }).afterClosed().subscribe(() => {
      this.loadRankings();
    });
  }

  openReviewDirect(event: MouseEvent, univ: UniversityRankingSummary): void {
    event.stopPropagation();

    if (!this.auth.isLoggedIn) {
      this.snackBar.open('Tens de ter uma conta para avaliar a tua instituição.', 'Fechar', { duration: 4000 });
      return;
    }

    const profile = this.auth.cachedProfile;
    const target = (univ.estabelecimento || '').trim().toLowerCase();
    const currentUniv = (profile?.university || '').trim().toLowerCase();
    const licUniv = (profile?.licenciatura_university || '').trim().toLowerCase();

    let userCourse = '';
    if (currentUniv === target) {
      userCourse = profile?.course || '';
    } else if (licUniv === target) {
      userCourse = profile?.licenciatura_course || '';
    }

    this.dialog.open(UniversityReviewDialogComponent, {
      width: '750px',
      data: {
        universityName: univ.estabelecimento,
        courses: univ.cursos || [],
        userCourse: userCourse
      }
    }).afterClosed().subscribe((submitted) => {
      if (submitted) {
        this.loadRankings();
      }
    });
  }
}
