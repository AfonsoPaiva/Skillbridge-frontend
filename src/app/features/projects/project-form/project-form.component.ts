import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Project } from '../../../core/models/models';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { startWith, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { safeAutocomplete } from '../../../core/utils/search.utils';

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  submitting = false;
  isEdit = false;
  projectSlug: string | null = null;
  availableSkills: string[] = [];
  imagePreview: string | null = null;
  uploadingImage = false;
  
  // Map to store filtered skills observables for each role
  private roleSkillFilters = new Map<number, Observable<string[]>>();

  statusOptions = [
    { value: 'open', label: 'Aberto — aceitar candidaturas' },
    { value: 'completed', label: 'Concluído' }
  ];

  get roles(): FormArray {
    return this.form.get('roles') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private api: ApiService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      status: ['open', Validators.required],
      image_url: [''],
      roles: this.fb.array([])
    });

    // Load skills for role forms
    this.api.listSkills().subscribe({ next: (s: string[]) => this.availableSkills = s });

    // Listen to status changes to update role validations
    this.form.get('status')?.valueChanges.subscribe((status: string) => {
      this.updateRoleValidators(status);
    });

    // Edit mode
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.isEdit = true;
      this.projectSlug = slug;
      this.loading = true;
      this.api.getProject(this.projectSlug).subscribe({
        next: (p: Project) => {
          this.form.patchValue({
            title: p.title,
            description: p.description,
            status: p.status,
            image_url: p.image_url
          });
          if (p.image_url) this.imagePreview = p.image_url;
          (p.roles || []).forEach(r => this.addRole(r));
          this.loading = false;
        },
        error: () => { this.loading = false; this.router.navigate(['/projects']); }
      });
    } else {
      this.addRole();
    }
  }

  addRole(data?: any): void {
    const currentStatus = this.form.get('status')?.value;
    const isCompleted = currentStatus === 'completed';
    
    const rg = this.fb.group({
      title: [data?.title || '', isCompleted ? [] : [Validators.required]],
      description: [data?.description || ''],
      skill_name: [data?.skill_name || ''],
      spots: [data?.spots || 1, isCompleted ? [] : [Validators.required, Validators.min(1)]]
    });
    const index = this.roles.length;
    this.roles.push(rg);
    this.setupRoleSkillFilter(index, rg);
  }

  removeRole(i: number): void {
    this.roles.removeAt(i);
    this.roleSkillFilters.delete(i);
  }

  onImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingImage = true;
    this.api.uploadImage(file, 'project').subscribe({
      next: (res: { url: string }) => {
        this.form.patchValue({ image_url: res.url });
        this.imagePreview = res.url;
        this.uploadingImage = false;
      },
      error: () => { this.uploadingImage = false; }
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    const data = this.form.value;

    const req = this.isEdit
      ? this.api.updateProject(this.projectSlug!, data)
      : this.api.createProject(data);

    req.subscribe({
      next: (p: Project) => {
        this.snack.open(this.isEdit ? 'Projeto atualizado!' : 'Projeto criado!', 'Fechar', { duration: 3000 });
        this.router.navigate(['/projects', p.slug]);
      },
      error: (e: HttpErrorResponse) => {
        this.snack.open(e?.error?.error || 'Erro ao guardar projeto.', 'Fechar', { duration: 4000 });
        this.submitting = false;
      }
    });
  }
  
  private setupRoleSkillFilter(index: number, roleGroup: FormGroup): void {
    const skillControl = roleGroup.get('skill_name');
    if (!skillControl) return;
    
    const filtered$ = skillControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300), // Increased for better performance with 300+ items
      distinctUntilChanged(),
      map((query: string) => {
        const q = (query || '').trim();
        if (q.length === 0) {
          // Show first 30 when no search query
          return this.availableSkills.slice(0, 30);
        }
        // Use safeAutocomplete for word-by-word search
        return safeAutocomplete(this.availableSkills, q, 50);
      })
    );
    
    this.roleSkillFilters.set(index, filtered$);
  }
  

  private updateRoleValidators(status: string): void {
    const isCompleted = status === 'completed';
    
    this.roles.controls.forEach((roleGroup: any) => {
      const titleControl = roleGroup.get('title');
      const spotsControl = roleGroup.get('spots');
      
      if (isCompleted) {
        // Remove required validators for completed projects
        titleControl?.clearValidators();
        spotsControl?.clearValidators();
      } else {
        // Add required validators for non-completed projects
        titleControl?.setValidators([Validators.required]);
        spotsControl?.setValidators([Validators.required, Validators.min(1)]);
      }
      
      titleControl?.updateValueAndValidity();
      spotsControl?.updateValueAndValidity();
    });
  }
  
  get isCompletedProject(): boolean {
    return this.form.get('status')?.value === 'completed';
  }
  getFilteredSkills(index: number): Observable<string[]> {
    return this.roleSkillFilters.get(index) || of(this.availableSkills);
  }
}
