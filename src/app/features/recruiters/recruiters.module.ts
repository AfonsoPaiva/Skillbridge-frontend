import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Components
import { RecruiterLandingComponent } from './recruiter-landing/recruiter-landing.component';
import { RecruiterAuthComponent } from './recruiter-auth/recruiter-auth.component';
import { RecruiterDashboardComponent } from './recruiter-dashboard/recruiter-dashboard.component';
import { VacancyFormComponent } from './vacancy-form/vacancy-form.component';
import { RecruiterAuthGuard } from '../../core/guards/recruiter-auth.guard';

// Shared and Material
import { MaterialModule } from '../../shared/material.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

const routes: Routes = [
  { path: '', component: RecruiterLandingComponent },
  { path: 'auth', component: RecruiterAuthComponent },
  {
    path: 'dashboard',
    component: RecruiterDashboardComponent,
    canActivate: [RecruiterAuthGuard]
  }
];

@NgModule({
  declarations: [
    RecruiterDashboardComponent,
    RecruiterAuthComponent,
    RecruiterLandingComponent,
    VacancyFormComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MaterialModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule
  ]
})
export class RecruitersModule {}
