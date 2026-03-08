import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
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
  @ViewChild('editorFrame') editorFrame?: ElementRef<HTMLDivElement>;

  form!: FormGroup;
  loading = false;
  submitting = false;
  isEdit = false;
  projectSlug: string | null = null;
  availableSkills: string[] = [];
  imagePreview: string | null = null;
  uploadingImage = false;
  rawImageSrc: string | null = null;
  showImageEditor = false;
  selectedImageFile: File | null = null;

  readonly imageFrameWidth = 800;
  readonly imageFrameHeight = 500;
  editorZoom = 1;
  editorPosX = 50;
  editorPosY = 50;
  draggingEditor = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private startPosX = 50;
  private startPosY = 50;
  
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
    this.api.listSkillsFlat().subscribe({ next: (s: string[]) => this.availableSkills = s });

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
    if (!file.type.startsWith('image/')) {
      this.snack.open('Seleciona um ficheiro de imagem válido.', 'Fechar', { duration: 3000 });
      return;
    }

    this.selectedImageFile = file;
    this.editorZoom = 1;
    this.editorPosX = 50;
    this.editorPosY = 50;
    this.showImageEditor = true;

    const reader = new FileReader();
    reader.onload = () => {
      this.rawImageSrc = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.form.patchValue({ image_url: '' });
    this.imagePreview = null;
    this.rawImageSrc = null;
    this.showImageEditor = false;
    this.selectedImageFile = null;
  }

  resetEditor(): void {
    this.editorZoom = 1;
    this.editorPosX = 50;
    this.editorPosY = 50;
  }

  startEditorDrag(event: MouseEvent | TouchEvent): void {
    if (!this.rawImageSrc) return;

    const point = this.getPoint(event);
    this.draggingEditor = true;
    this.dragStartX = point.x;
    this.dragStartY = point.y;
    this.startPosX = this.editorPosX;
    this.startPosY = this.editorPosY;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onEditorMouseMove(event: MouseEvent): void {
    this.updateEditorDrag(event.clientX, event.clientY);
  }

  @HostListener('document:touchmove', ['$event'])
  onEditorTouchMove(event: TouchEvent): void {
    if (!this.draggingEditor || event.touches.length === 0) return;
    const t = event.touches[0];
    this.updateEditorDrag(t.clientX, t.clientY);
    event.preventDefault();
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  stopEditorDrag(): void {
    this.draggingEditor = false;
  }

  async applyImageEdit(): Promise<void> {
    if (!this.rawImageSrc || !this.selectedImageFile) return;

    this.uploadingImage = true;
    try {
      const blob = await this.renderEditedImageBlob();
      const baseName = this.selectedImageFile.name.replace(/\.[^/.]+$/, '');
      const editedFile = new File([blob], `${baseName}-framed.jpg`, { type: 'image/jpeg' });

      this.api.uploadImage(editedFile, 'project').subscribe({
        next: (res: { url: string }) => {
          this.form.patchValue({ image_url: res.url });
          this.imagePreview = res.url;
          this.showImageEditor = false;
          this.rawImageSrc = null;
          this.selectedImageFile = null;
          this.uploadingImage = false;
        },
        error: () => {
          this.uploadingImage = false;
          this.snack.open('Não foi possível enviar a imagem.', 'Fechar', { duration: 3500 });
        }
      });
    } catch {
      this.uploadingImage = false;
      this.snack.open('Não foi possível processar a imagem.', 'Fechar', { duration: 3500 });
    }
  }

  get editorImageStyles(): Record<string, string> {
    return {
      transform: `scale(${this.editorZoom})`,
      objectPosition: `${this.editorPosX}% ${this.editorPosY}%`
    };
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

  private updateEditorDrag(clientX: number, clientY: number): void {
    if (!this.draggingEditor || !this.editorFrame?.nativeElement) return;

    const rect = this.editorFrame.nativeElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dxPercent = ((clientX - this.dragStartX) / rect.width) * 100;
    const dyPercent = ((clientY - this.dragStartY) / rect.height) * 100;

    this.editorPosX = this.clamp(this.startPosX + dxPercent, 0, 100);
    this.editorPosY = this.clamp(this.startPosY + dyPercent, 0, 100);
  }

  private getPoint(event: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in event && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }

    const mouse = event as MouseEvent;
    return { x: mouse.clientX, y: mouse.clientY };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private async renderEditedImageBlob(): Promise<Blob> {
    const img = await this.loadImage(this.rawImageSrc!);
    const canvas = document.createElement('canvas');
    canvas.width = this.imageFrameWidth;
    canvas.height = this.imageFrameHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    const baseScale = Math.max(
      this.imageFrameWidth / img.width,
      this.imageFrameHeight / img.height
    );
    const finalScale = baseScale * this.editorZoom;

    const drawWidth = img.width * finalScale;
    const drawHeight = img.height * finalScale;
    const drawX = (this.imageFrameWidth - drawWidth) * (this.editorPosX / 100);
    const drawY = (this.imageFrameHeight - drawHeight) * (this.editorPosY / 100);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to render blob'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.92);
    });
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = src;
    });
  }
}
