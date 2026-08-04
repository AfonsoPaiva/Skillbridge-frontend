import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-review-terms-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './review-terms-dialog.component.html',
  styleUrls: ['./review-terms-dialog.component.scss']
})
export class ReviewTermsDialogComponent implements AfterViewInit {
  @ViewChild('termsContainer') termsContainer!: ElementRef<HTMLDivElement>;
  hasScrolledToBottom = false;

  constructor(public dialogRef: MatDialogRef<ReviewTermsDialogComponent>) {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.checkScrollPosition();
    }, 100);
  }

  onScroll(): void {
    this.checkScrollPosition();
  }

  checkScrollPosition(): void {
    if (!this.termsContainer) return;
    const el = this.termsContainer.nativeElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 15) {
      this.hasScrolledToBottom = true;
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    if (this.hasScrolledToBottom) {
      this.dialogRef.close(true);
    }
  }
}
