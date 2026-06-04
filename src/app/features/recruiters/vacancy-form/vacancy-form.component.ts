import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Vacancy, SkillSection, SkillsListResponse } from '../../../core/models/models';
import { ApiService } from '../../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { sanitizeInput } from '../../../core/utils/search.utils';

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

  // Skills
  vacancySkills: string[] = [];
  availableSkills: string[] = [];
  availableSkillSections: SkillSection[] = [];
  filteredSkillSections: SkillSection[] = [];
  removingSkill = '';
  skillSearchControl = new FormControl('');

  readonly vacancyTypes = [
    { value: 'summer_internship', label: 'Estágio de Verão' },
    { value: 'curricular_internship', label: 'Estágio Curricular' },
    { value: 'junior_position', label: 'Posição Junior' }
  ];

  readonly workModes = [
    { value: '', label: 'Não especificado' },
    { value: 'hybrid', label: 'Híbrido' },
    { value: 'remote', label: 'Remoto' },
    { value: 'onsite', label: 'Presencial' }
  ];

  readonly employmentTypes = [
    { value: '', label: 'Não especificado' },
    { value: 'full_time', label: 'Full-time' },
    { value: 'part_time', label: 'Part-time' },
    { value: 'contract', label: 'Contrato' }
  ];

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private api: ApiService,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      type: ['', Validators.required],
      description: ['', [Validators.required]],
      application_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      region: [''],
      work_mode: [''],
      employment_type: [''],
      deadline: [null]
    });
  }

  ngOnInit(): void {
    if (this.vacancy) {
      this.vacancySkills = [...this.vacancy.tags];
      this.form.patchValue({
        title: this.vacancy.title,
        type: this.vacancy.type,
        description: this.vacancy.description,
        application_url: this.vacancy.application_url,
        region: this.vacancy.region || '',
        work_mode: this.vacancy.work_mode || '',
        employment_type: this.vacancy.employment_type || '',
        deadline: this.vacancy.deadline ? new Date(this.vacancy.deadline) : null
      });
    }

    // Load skills
    this.api.listSkills().subscribe({ 
      next: (res: SkillsListResponse) => {
        this.availableSkills = res.skills || [];
        this.availableSkillSections = res.sections || [];
        this.updateFilteredSkillSections();
      }
    });

    this.skillSearchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(150),
      distinctUntilChanged()
    ).subscribe(() => {
      this.updateFilteredSkillSections();
    });
  }

  addSkill(skillName?: string): void {
    const rawSkill = (skillName ?? this.skillSearchControl.value ?? '').toString().trim();
    const skill = this.resolveSkill(rawSkill);
    if (!skill || this.vacancySkills.includes(skill)) return;

    this.vacancySkills.push(skill);
    this.skillSearchControl.setValue('', { emitEvent: false });
    this.updateFilteredSkillSections();
  }

  removeSkill(skill: string): void {
    this.vacancySkills = this.vacancySkills.filter(s => s !== skill);
    this.updateFilteredSkillSections();
  }

  private updateFilteredSkillSections(): void {
    const query = sanitizeInput((this.skillSearchControl.value || '').toString()).toLowerCase();
    this.filteredSkillSections = this.availableSkillSections
      .map(section => ({
        ...section,
        skills: section.skills.filter(skill => {
          if (this.vacancySkills.includes(skill)) return false;
          if (!query) return true;
          return skill.toLowerCase().includes(query);
        })
      }))
      .filter(section => section.skills.length > 0);
  }

  trackBySectionLabel(_: number, section: SkillSection): string {
    return section.label;
  }

  trackBySkill(_: number, skill: string): string {
    return skill;
  }

  private resolveSkill(rawSkill: string): string {
    if (!rawSkill) return '';
    const exact = this.availableSkills.find(s => s === rawSkill);
    if (exact) return exact;

    const normalized = rawSkill.toLowerCase();
    const caseInsensitive = this.availableSkills.find(s => s.toLowerCase() === normalized);
    if (caseInsensitive) return caseInsensitive;

    this.snack.open('Seleciona uma competência válida da lista.', 'Fechar', { duration: 3000 });
    return '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = '';

    const formVal = this.form.value;

    if (this.vacancySkills.length === 0) {
      this.error = 'Adiciona pelo menos uma competência.';
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
      tags: this.vacancySkills,
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
