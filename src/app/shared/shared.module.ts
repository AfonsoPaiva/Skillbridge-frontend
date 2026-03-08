import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from './material.module';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SkeletonComponent, CardSkeletonComponent } from './components/skeleton/skeleton.component';
import { UniversityCarouselComponent } from './components/university-carousel/university-carousel.component';
import { DeleteAccountDialogComponent } from './components/delete-account-dialog/delete-account-dialog.component';
import { LazyImgDirective } from './directives/lazy-img.directive';
import { SmartFitImgDirective } from './directives/smart-fit-img.directive';

@NgModule({
  declarations: [
    SkeletonComponent,
    CardSkeletonComponent,
    UniversityCarouselComponent,
    DeleteAccountDialogComponent
  ],
  imports: [
    CommonModule, 
    RouterModule, 
    MaterialModule, 
    ReactiveFormsModule, 
    FormsModule,
    LazyImgDirective,
    SmartFitImgDirective
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    ReactiveFormsModule,
    FormsModule,
    SkeletonComponent,
    CardSkeletonComponent,
    UniversityCarouselComponent,
    LazyImgDirective,
    SmartFitImgDirective
  ]
})
export class SharedModule {}
