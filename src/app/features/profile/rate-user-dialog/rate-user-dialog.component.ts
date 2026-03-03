import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';

export interface RateUserDialogData {
  userId: number;
  userName: string;
}

@Component({
  selector: 'app-rate-user-dialog',
  templateUrl: './rate-user-dialog.component.html',
  styleUrls: ['./rate-user-dialog.component.scss']
})
export class RateUserDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  submitting = false;
  hoveredStar = 0;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<RateUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RateUserDialogData
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['']
    });

    // No need to load projects anymore - anyone can rate anyone
    this.loading = false;
  }

  setRating(rating: number): void {
    this.form.patchValue({ rating });
  }

  onStarHover(star: number): void {
    this.hoveredStar = star;
  }

  clearHover(): void {
    this.hoveredStar = 0;
  }

  getStarClass(star: number): string {
    const rating = this.form.get('rating')?.value || 0;
    const displayRating = this.hoveredStar || rating;
    return star <= displayRating ? 'star-filled' : 'star-empty';
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;

    this.submitting = true;
    const value = this.form.value;
    
    this.api.createReview({
      reviewed_id: this.data.userId,
      rating: value.rating,
      comment: value.comment
    }).subscribe({
      next: () => {
        this.snack.open('Avaliação submetida com sucesso! Será visível após aprovação.', 'Fechar', { duration: 4000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        const msg = err.error?.error || 'Erro ao submeter avaliação.';
        this.snack.open(msg, 'Fechar', { duration: 4000 });
        this.submitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
