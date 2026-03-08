import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Project, ProjectMember } from '../../../core/models/models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { trigger, transition, style, animate } from '@angular/animations';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ProjectDetailComponent implements OnInit {
  project: Project | null = null;
  members: ProjectMember[] = [];
  loading = true;
  applyingRoleId: number | null = null; // Track which specific role is being applied to
  deleteLoading = false;

  get isOwner(): boolean {
    const uid = this.auth.currentUser?.uid;
    return !!uid && uid === this.project?.owner?.firebase_uid;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    public auth: AuthService,
    private snack: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.router.navigate(['/projects']);
      return;
    }
    
    this.api.getProject(slug).subscribe({
      next: (p: Project) => {
        this.project = p;
        this.loading = false;
        if (this.auth.isLoggedIn) {
          this.api.getProjectMembers(slug).subscribe({
            next: (m: ProjectMember[]) => this.members = m,
            error: () => {}
          });
        }
      },
      error: () => { this.loading = false; this.router.navigate(['/projects']); }
    });
  }

  async apply(roleId: number): Promise<void> {
    if (!this.auth.isLoggedIn) {
      const { OnboardingComponent } = await import('../../onboarding/onboarding.component');
      this.dialog.open(OnboardingComponent, {
        width: '540px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'onboarding-dialog'
      });
      return;
    }
    this.applyingRoleId = roleId;
    this.api.applyToProject(this.project!.slug, roleId).subscribe({
      next: () => {
        this.snack.open('Candidatura enviada!', 'Fechar', { duration: 3000 });
        this.applyingRoleId = null;
      },
      error: (e: HttpErrorResponse) => {
        this.snack.open(e?.error?.error || 'Erro ao candidatar-se.', 'Fechar', { duration: 4000 });
        this.applyingRoleId = null;
      }
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { open: 'Aberto', in_progress: 'Em progresso', completed: 'Concluído', full: 'Vagas cheias' };
    return map[status] ?? status;
  }

  deleteProject(): void {
    if (!this.project) return;
    const confirmed = window.confirm(`Tens a certeza que queres eliminar "${this.project.title}"? Esta ação é irreversível.`);
    if (!confirmed) return;
    this.deleteLoading = true;
    this.api.deleteProject(this.project.slug).subscribe({
      next: () => {
        this.snack.open('Projeto eliminado.', 'Fechar', { duration: 3000 });
        this.router.navigate(['/projects']);
      },
      error: () => {
        this.snack.open('Erro ao eliminar projeto.', 'Fechar', { duration: 4000 });
        this.deleteLoading = false;
      }
    });
  }

  removeMember(member: ProjectMember): void {
    if (!this.project) return;
    
    const snackRef = this.snack.open(
      `Tens a certeza que queres remover ${member.user?.name} da equipa?`,
      'Remover',
      { duration: 5000 }
    );

    snackRef.onAction().subscribe(() => {
      this.api.removeProjectMember(this.project!.slug, member.id).subscribe({
        next: () => {
          this.snack.open('Membro removido com sucesso.', 'Fechar', { duration: 3000 });
          // Remove from local list
          this.members = this.members.filter(m => m.id !== member.id);
          // Reload project to update role counts
          this.api.getProject(this.project!.slug).subscribe({
            next: (p: Project) => this.project = p
          });
        },
        error: (e: HttpErrorResponse) => {
          this.snack.open(e?.error?.error || 'Erro ao remover membro.', 'Fechar', { duration: 4000 });
        }
      });
    });
  }

  getMemberStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendente',
      accepted: 'Aceite',
      rejected: 'Rejeitado'
    };
    return map[status] ?? status;
  }

  get acceptedMembersCount(): number {
    return this.members.filter(m => m.status === 'accepted').length;
  }

  /** Get the correct profile route for a user (slug or 'eu' if current user) */
  getProfileRoute(userSlug?: string): string[] {
    if (!userSlug) return ['/perfil'];
    
    // Compare firebase_uid if available
    const currentFirebaseUid = this.auth.currentUser?.uid;
    if (currentFirebaseUid && this.project?.owner?.firebase_uid === currentFirebaseUid && this.project.owner.slug === userSlug) {
      return ['/perfil/eu'];
    }
    
    // Check members
    const member = this.members.find(m => m.user?.slug === userSlug);
    if (currentFirebaseUid && member?.user?.firebase_uid === currentFirebaseUid) {
      return ['/perfil/eu'];
    }
    
    return ['/perfil', userSlug];
  }
}
