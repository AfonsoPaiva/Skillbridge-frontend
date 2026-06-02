import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Vacancy } from '../../../core/models/models';

@Component({
  selector: 'app-vacancy-form',
  templateUrl: './vacancy-form.component.html',
  styleUrls: ['./vacancy-form.component.scss']
})
export class VacancyFormComponent implements OnInit {
  @Input() vacancy: Vacancy | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  submitting = false;
  error = '';

  readonly vacancyTypes = [
    { value: 'summer_internship', label: 'Estágio de Verão' },
    { value: 'curricular_internship', label: 'Estágio Curricular' },
    { value: 'junior_position', label: 'Posição Junior' }
  ];

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      type: ['', Validators.required],
      tags: ['', Validators.required], // Comma separated string internally handled as array
      description: ['', [Validators.required, Validators.maxLength(500)]],
      application_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      deadline: [null]
    });
  }

  ngOnInit(): void {
    if (this.vacancy) {
      this.form.patchValue({
        title: this.vacancy.title,
        type: this.vacancy.type,
        tags: this.vacancy.tags.join(', '),
        description: this.vacancy.description,
        application_url: this.vacancy.application_url,
        deadline: this.vacancy.deadline ? new Date(this.vacancy.deadline) : null
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = '';

    const formVal = this.form.value;
    
    // Parse tags into array
    const tagsArray = formVal.tags
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);

    if (tagsArray.length === 0) {
      this.error = 'Adiciona pelo menos uma tag.';
      this.submitting = false;
      return;
    }

    // Format date to YYYY-MM-DD
    let deadlineStr = '';
    if (formVal.deadline) {
      const d = formVal.deadline;
      deadlineStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const payload = {
      ...formVal,
      tags: tagsArray,
      deadline: deadlineStr || null
    };

    const request$ = this.vacancy
      ? this.recruiterService.updateVacancy(this.vacancy.id, payload)
      : this.recruiterService.createVacancy(payload);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.saved.emit();
      },
      error: (err) => {
        this.submitting = false;
        this.error = err.error?.error || 'Ocorreu um erro ao guardar a vaga.';
      }
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
