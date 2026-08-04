import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../shared/material.module';
import { RankingRoutingModule } from './ranking-routing.module';
import { RankingComponent } from './ranking.component';
import { UniversityDetailDialogComponent } from './university-detail-dialog/university-detail-dialog.component';
import { UniversityReviewDialogComponent } from './university-review-dialog/university-review-dialog.component';
import { UniversityDetailPageComponent } from './university-detail-page/university-detail-page.component';

import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    RankingComponent,
    UniversityDetailDialogComponent,
    UniversityReviewDialogComponent,
    UniversityDetailPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    SharedModule,
    RankingRoutingModule
  ]
})
export class RankingModule {}
