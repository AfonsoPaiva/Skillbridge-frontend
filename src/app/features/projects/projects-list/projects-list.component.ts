import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Project } from '../../../core/models/models';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { flexibleSearchMultiField, sanitizeInput, debounce } from '../../../core/utils/search.utils';
import {
  getProjectCardDescription,
  getProjectCardSkillText,
  getProjectCardTitle,
  getProjectSkillLabels
} from '../../../core/utils/project-role.utils';

@Component({
  selector: 'app-projects-list',
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.scss'],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('list', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(60, [animate('350ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'none' }))])
        ], { optional: true })
      ])
    ])
  ]
})
export class ProjectsListComponent implements OnInit {
  readonly getProjectCardDescription = getProjectCardDescription;
  readonly getProjectCardSkillText = getProjectCardSkillText;
  readonly getProjectCardTitle = getProjectCardTitle;
  readonly getProjectSkillLabels = getProjectSkillLabels;
  projects: Project[] = [];
  allProjects: Project[] = []; // Cache of all projects for client-side filtering
  filtered: Project[] = [];
  loading = true;
  search = '';
  statusFilter: 'all' | 'open' | 'full' | 'completed' = 'all';
  
  // Debounce da busca para melhor performance
  private debouncedFilter = debounce(() => this.performFilter(), 300);

  statusOptions: { value: 'all' | 'open' | 'full' | 'completed'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'open', label: 'Abertos' },
    { value: 'full', label: 'Vagas cheias' },
    { value: 'completed', label: 'Concluídos' }
  ];

  constructor(
    private route: ActivatedRoute,
    private api: ApiService, 
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    // Check if data was resolved (prefetched)
    const resolvedProjects = this.route.snapshot.data['projects'];
    if (resolvedProjects && resolvedProjects.length > 0) {
      // Use prefetched data
      this.projects = resolvedProjects;
      this.allProjects = [...resolvedProjects]; // Cache all projects
      this.performFilterSync();
      this.loading = false;
    } else {
      // Fallback to loading
      this.loadProjects();
    }
  }

  private loadProjects(): void {
    this.loading = true;
    this.api.listProjects(this.statusFilter).subscribe({
      next: (p: Project[]) => {
        this.projects = p;
        // If loading all projects, cache them
        if (this.statusFilter === 'all') {
          this.allProjects = [...p];
        }
        // Apply filters synchronously before setting loading to false
        this.performFilterSync();
        this.loading = false;
      },
      error: () => {
        this.projects = [];
        this.filtered = [];
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.debouncedFilter();
  }
  
  private performFilterSync(): void {
    let list = [...this.projects];
    
    // Filtro por status
    if (this.statusFilter !== 'all') {
      list = list.filter(p => p.status === this.statusFilter);
    }
    
    // Busca segura e flexível por título e descrição
    if (this.search && this.search.trim()) {
      const sanitized = sanitizeInput(this.search);
      list = list.filter(p =>
        flexibleSearchMultiField(
          p,
          sanitized,
          ['title', 'description', (proj) => getProjectSkillLabels(proj.roles).join(' ')]
        )
      );
    }
    
    this.filtered = list;
  }
  
  private performFilter(): void {
    this.performFilterSync();
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { open: 'Aberto', full: 'Vagas cheias', completed: 'Concluído' };
    return map[status] ?? status;
  }

  onStatusChange(newStatus: 'all' | 'open' | 'full' | 'completed'): void {
    if (newStatus === this.statusFilter) {
      return;
    }
    const previousStatus = this.statusFilter;
    this.statusFilter = newStatus;
    if (this.allProjects.length > 0 && previousStatus === 'all') {
      this.projects = this.allProjects;
      this.performFilterSync();
    } else if (this.allProjects.length > 0) {
      this.projects = this.allProjects;
      this.performFilterSync();
    } else {
      this.loadProjects();
    }
  }
}
