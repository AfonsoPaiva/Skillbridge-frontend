import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { CreateUniversityReviewPayload } from '../../../core/models/models';

export interface UniversityReviewDialogData {
  universityName: string;
  courses: string[];
}

@Component({
  selector: 'app-university-review-dialog',
  templateUrl: './university-review-dialog.component.html',
  styleUrls: ['./university-review-dialog.component.scss']
})
export class UniversityReviewDialogComponent implements OnInit {
  isSubmitting = false;
  courses: string[] = [];
  universityName: string = '';

  step1Form!: FormGroup;
  step2Form!: FormGroup;
  step3Form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<UniversityReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UniversityReviewDialogData
  ) {
    this.universityName = data.universityName;
    this.courses = data.courses || [];
  }

  ngOnInit(): void {
    this.step1Form = this.fb.group({
      courseName: ['', Validators.required],
      comment: ['', [Validators.required, Validators.minLength(10)]],
      isAnonymous: [false]
    });

    this.step2Form = this.fb.group({
      campusQuality: [7, [Validators.required, Validators.min(0), Validators.max(10)]],
      locationAccessibility: [7, [Validators.required, Validators.min(0), Validators.max(10)]],
      costOfLiving: [5, [Validators.required, Validators.min(0), Validators.max(10)]],
      socialEnvironment: [7, [Validators.required, Validators.min(0), Validators.max(10)]],
      reputation: [8, [Validators.required, Validators.min(0), Validators.max(10)]],
      librariesQuality: [7, [Validators.required, Validators.min(0), Validators.max(10)]],
      foodServices: [6, [Validators.required, Validators.min(0), Validators.max(10)]]
    });

    this.step3Form = this.fb.group({
      teachersQuality: [7, [Validators.required, Validators.min(0), Validators.max(10)]],
      subjectInterest: [8, [Validators.required, Validators.min(0), Validators.max(10)]],
      courseFacilities: [7, [Validators.required, Validators.min(0), Validators.max(10)]],
      classmatesEnvironment: [8, [Validators.required, Validators.min(0), Validators.max(10)]],
      workloadBalance: [6, [Validators.required, Validators.min(0), Validators.max(10)]],
      practicalOpportunities: [7, [Validators.required, Validators.min(0), Validators.max(10)]],
      futureProspects: [8, [Validators.required, Validators.min(0), Validators.max(10)]]
    });

    if (this.courses.length === 0) {
      this.loadCourses();
    }
  }

  loadCourses(): void {
    this.api.listCourses(this.universityName).subscribe({
      next: (courses) => {
        this.courses = courses;
      },
      error: () => {
        this.courses = [];
      }
    });
  }

  get calculatedScore(): number {
    const s2 = this.step2Form.value;
    const s3 = this.step3Form.value;
    const sum =
      (s2.campusQuality || 0) +
      (s2.locationAccessibility || 0) +
      (s2.costOfLiving || 0) +
      (s2.socialEnvironment || 0) +
      (s2.reputation || 0) +
      (s2.librariesQuality || 0) +
      (s2.foodServices || 0) +
      (s3.teachersQuality || 0) +
      (s3.subjectInterest || 0) +
      (s3.courseFacilities || 0) +
      (s3.classmatesEnvironment || 0) +
      (s3.workloadBalance || 0) +
      (s3.practicalOpportunities || 0) +
      (s3.futureProspects || 0);

    const avg = sum / 14;
    return Math.round(avg * 10) / 10;
  }

  submitReview(): void {
    if (this.step1Form.invalid || this.step2Form.invalid || this.step3Form.invalid) {
      this.snackBar.open('Por favor preencha todos os campos obrigatórios.', 'Fechar', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    const s1 = this.step1Form.value;
    const s2 = this.step2Form.value;
    const s3 = this.step3Form.value;

    const payload: CreateUniversityReviewPayload = {
      university_name: this.universityName,
      course_name: s1.courseName,
      is_anonymous: !!s1.isAnonymous,
      comment: s1.comment,

      campus_quality: s2.campusQuality,
      location_accessibility: s2.locationAccessibility,
      cost_of_living: s2.costOfLiving,
      social_environment: s2.socialEnvironment,
      reputation: s2.reputation,
      libraries_quality: s2.librariesQuality,
      food_services: s2.foodServices,

      teachers_quality: s3.teachersQuality,
      subject_interest: s3.subjectInterest,
      course_facilities: s3.courseFacilities,
      classmates_environment: s3.classmatesEnvironment,
      workload_balance: s3.workloadBalance,
      practical_opportunities: s3.practicalOpportunities,
      future_prospects: s3.futureProspects
    };

    this.api.createUniversityReview(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.snackBar.open('Avaliação submetida com sucesso!', 'Fechar', { duration: 4000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.error || 'Erro ao submeter avaliação. Tente novamente.';
        this.snackBar.open(msg, 'Fechar', { duration: 4000 });
      }
    });
  }
}
