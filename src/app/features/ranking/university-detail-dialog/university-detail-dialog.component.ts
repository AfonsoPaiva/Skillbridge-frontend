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
    if (!profile) return false;

    const target = (this.university.estabelecimento || '').trim().toLowerCase();
    const currentUniv = (profile.university || '').trim().toLowerCase();
    const licUniv = (profile.licenciatura_university || '').trim().toLowerCase();

    return (currentUniv !== '' && currentUniv === target) || (licUniv !== '' && licUniv === target);
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

  get myExistingReview(): UniversityReviewItem | undefined {
    const profile = this.auth.cachedProfile;
    if (!profile) return undefined;
    return this.reviews.find(r => r.user_id === profile.id);
  }

  readonly defaultLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%2368007a"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>`;

  get fallbackLogo(): string {
    return this.defaultLogo;
  }

  onImageError(event: any): void {
    if (event.target.src === this.defaultLogo) return;
    event.target.src = this.defaultLogo;
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

    const profile = this.auth.cachedProfile;
    const target = (this.university.estabelecimento || '').trim().toLowerCase();
    const currentUniv = (profile?.university || '').trim().toLowerCase();
    const licUniv = (profile?.licenciatura_university || '').trim().toLowerCase();

    let userCourse = '';
    if (currentUniv === target) {
      userCourse = profile?.course || '';
    } else if (licUniv === target) {
      userCourse = profile?.licenciatura_course || '';
    }

    const existing = this.myExistingReview;

    const reviewRef = this.dialog.open(UniversityReviewDialogComponent, {
      width: '750px',
      data: {
        universityName: this.university.estabelecimento,
        courses: this.university.cursos || [],
        userCourse: userCourse,
        existingReview: existing
      }
    });

    reviewRef.afterClosed().subscribe((submitted) => {
      if (submitted) {
        this.loadReviews();
      }
    });
  }
}
