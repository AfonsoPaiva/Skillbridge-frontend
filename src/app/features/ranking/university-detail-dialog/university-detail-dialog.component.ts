import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { UniversityRankingSummary, UniversityReviewItem } from '../../../core/models/models';
import { UniversityReviewDialogComponent } from '../university-review-dialog/university-review-dialog.component';

export interface UniversityDetailDialogData {
  university: UniversityRankingSummary;
}

@Component({
  selector: 'app-university-detail-dialog',
  templateUrl: './university-detail-dialog.component.html',
  styleUrls: ['./university-detail-dialog.component.scss']
})
export class UniversityDetailDialogComponent implements OnInit {
  university: UniversityRankingSummary;
  reviews: UniversityReviewItem[] = [];
  filteredReviews: UniversityReviewItem[] = [];
  selectedCourseFilter: string = '';
  isLoadingReviews = false;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<UniversityDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UniversityDetailDialogData
  ) {
    this.university = data.university;
  }

  ngOnInit(): void {
    if (this.auth.isLoggedIn && !this.auth.cachedProfile) {
      this.auth.prefetchUserProfile(this.api);
    }
    this.loadReviews();
  }

  get canUserReview(): boolean {
    if (!this.auth.isLoggedIn) return false;
    const profile = this.auth.cachedProfile;
    if (!profile || !profile.university) return false;
    return profile.university.trim().toLowerCase() === this.university.estabelecimento.trim().toLowerCase();
  }

  loadReviews(): void {
    this.isLoadingReviews = true;
    this.api.getUniversityReviews(this.university.estabelecimento).subscribe({
      next: (reviews) => {
        this.isLoadingReviews = false;
        this.reviews = reviews;
        this.applyFilter();
      },
      error: () => {
        this.isLoadingReviews = false;
        this.reviews = [];
        this.filteredReviews = [];
      }
    });
  }

  applyFilter(): void {
    if (!this.selectedCourseFilter) {
      this.filteredReviews = [...this.reviews];
    } else {
      this.filteredReviews = this.reviews.filter(
        r => r.course_name === this.selectedCourseFilter
      );
    }
  }

  get fallbackLogo(): string {
    const domain = this.university.estabelecimento
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') + '.pt';
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  }

  onImageError(event: any): void {
    event.target.src = this.fallbackLogo;
  }

  openReviewDialog(): void {
    if (!this.auth.isLoggedIn) {
      this.snackBar.open('Tens de ter uma conta para avaliar a tua instituição.', 'Entrar', { duration: 5000 })
        .onAction().subscribe(() => {
          this.dialogRef.close();
          // User will use navbar Entrar button
        });
      return;
    }

    const reviewRef = this.dialog.open(UniversityReviewDialogComponent, {
      width: '750px',
      data: {
        universityName: this.university.estabelecimento,
        courses: this.university.cursos || []
      }
    });

    reviewRef.afterClosed().subscribe((submitted) => {
      if (submitted) {
        this.loadReviews();
      }
    });
  }
}
