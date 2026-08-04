import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../shared/material.module';
import { RankingRoutingModule } from './ranking-routing.module';
import { RankingComponent } from './ranking.component';
import { UniversityDetailDialogComponent } from './university-detail-dialog/university-detail-dialog.component';
import { UniversityReviewDialogComponent } from './university-review-dialog/university-review-dialog.component';

@NgModule({
  declarations: [
    RankingComponent,
    UniversityDetailDialogComponent,
    UniversityReviewDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    RankingRoutingModule
  ]
})
export class RankingModule {}
