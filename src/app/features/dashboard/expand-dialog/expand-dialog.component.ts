import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Project, Vacancy } from '../../../core/models/models';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  getProjectCardDescription,
  getProjectCardSkillLabels,
  getProjectCardTitle,
} from '../../../core/utils/project-role.utils';

export interface ExpandDialogData {
  type: 'vacancies' | 'projects';
  title: string;
  vacancies?: Vacancy[];
  projects?: Project[];
  userSkills?: string[];
}

@Component({
  selector: 'app-expand-dialog',
  templateUrl: './expand-dialog.component.html',
  styleUrls: ['./expand-dialog.component.scss'],
  standalone: false
})
export class ExpandDialogComponent implements OnInit {
  readonly getProjectCardDescription = getProjectCardDescription;
  readonly getProjectCardSkillLabels = getProjectCardSkillLabels;
  readonly getProjectCardTitle = getProjectCardTitle;

  searchTerm = '';
  filteredVacancies: Vacancy[] = [];
  filteredProjects: Project[] = [];

  constructor(
    private dialogRef: MatDialogRef<ExpandDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExpandDialogData,
    private router: Router,
    private recruiterService: RecruiterService,
    public auth: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.filterItems();
  }

  filterItems(): void {
    const term = this.searchTerm.trim().toLowerCase();

    if (this.data.type === 'vacancies' && this.data.vacancies) {
      if (!term) {
        this.filteredVacancies = [...this.data.vacancies];
      } else {
        this.filteredVacancies = this.data.vacancies.filter(v =>
          v.title.toLowerCase().includes(term) ||
          (v.recruiter?.company_name && v.recruiter.company_name.toLowerCase().includes(term)) ||
          (v.tags && v.tags.some(t => t.toLowerCase().includes(term)))
        );
      }
    } else if (this.data.type === 'projects' && this.data.projects) {
      if (!term) {
        this.filteredProjects = [...this.data.projects];
      } else {
        this.filteredProjects = this.data.projects.filter(p =>
          p.title.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
        );
      }
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  viewVacancy(id: string): void {
    this.dialogRef.close();
    this.router.navigate(['/oportunidades', id]);
  }

  viewProject(slug: string): void {
    this.dialogRef.close();
    this.router.navigate(['/projects', slug]);
  }

  toggleFavorite(vacancy: Vacancy, event: Event): void {
    event.stopPropagation();
    if (!this.auth.isLoggedIn) {
      this.snackBar.open('Inicia sessão para guardar vagas nos favoritos.', 'OK', { duration: 3000 });
      return;
    }

    this.recruiterService.toggleFavoriteVacancy(vacancy.id).subscribe({
      next: (res) => {
        vacancy.is_favorite = res.is_favorite;
        this.snackBar.open(res.message, 'OK', { duration: 3000 });
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erro ao atualizar favoritos.';
        this.snackBar.open(errorMsg, 'OK', { duration: 4000 });
      }
    });
  }

  isMatchedSkill(skill: string): boolean {
    if (!this.data.userSkills) return false;
    const lower = skill.toLowerCase();
    return this.data.userSkills.some(s => s.toLowerCase() === lower);
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      summer_internship: 'Estágio de Verão',
      curricular_internship: 'Estágio Curricular',
      extracurricular_internship: 'Estágio Extracurricular',
      junior_position: 'Posição Junior'
    };
    return map[type] || type;
  }

  getInitials(companyName: string | undefined): string {
    if (!companyName) return 'V';
    const parts = companyName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return companyName.substring(0, 2).toUpperCase();
  }

  isWhiteTransparentLogo(url?: string): boolean {
    if (!url) return false;
    return url.includes('women_secret_logo');
  }
}
