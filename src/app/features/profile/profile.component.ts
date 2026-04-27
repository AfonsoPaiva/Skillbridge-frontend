import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ContactLinks, User, Review, FollowCounts, Project } from '../../core/models/models';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { RateUserDialogComponent } from './rate-user-dialog/rate-user-dialog.component';
import { FollowListDialogComponent } from './follow-list-dialog/follow-list-dialog.component';
import { getProjectSkillLabels } from '../../core/utils/project-role.utils';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
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
export class ProfileComponent implements OnInit {
  readonly getProjectSkillLabels = getProjectSkillLabels;
  user: User | null = null;
  userProjects: Project[] = [];
  loadingProjects = false;
  reviews: Review[] = [];
  averageRating = 0;
  loading = true;
  isOwn = false;
  Math = Math;

  isFollowing = false;
  followLoading = false;
  followCounts: FollowCounts = { followers: 0, following: 0 };
  socialLinks: Array<{ key: keyof ContactLinks; label: string; iconUrl: string; url: string; value: string }> = [];

  constructor(
    private route: ActivatedRoute,
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private snack: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Subscribe to route param changes to reload profile when navigating between profiles
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      this.isOwn = idParam === 'eu' || this.route.snapshot.routeConfig?.path === 'eu';
      this.loading = true;

      if (this.isOwn) {
        this.api.getMyProfile().subscribe({
          next: (u: User) => {
            this.user = u;
            this.socialLinks = this.buildSocialLinks(u.contact_links);
            this.loading = false;
            this.loadReviews(u.id);
            this.loadFollowCounts(u.slug);
            this.loadUserProjects(u.id);
          },
          error: () => { this.loading = false; }
        });
      } else {
        // idParam can be either a slug (string) or an ID (numeric string)
        this.api.getUserById(idParam!).subscribe({
          next: (u: User) => {
            // If logged in and viewing own profile, redirect to /perfil/eu
            if (this.auth.isLoggedIn && this.auth.currentUser) {
              if (u.firebase_uid === this.auth.currentUser.uid) {
                this.router.navigate(['/perfil/eu'], { replaceUrl: true });
                return;
              }
            }

            this.user = u;
            this.socialLinks = this.buildSocialLinks(u.contact_links);
            this.loading = false;
            this.loadReviews(u.id);
            this.loadFollowCounts(u.slug);
            this.loadUserProjects(u.id);
            if (this.auth.isLoggedIn) {
              this.api.getFollowStatus(u.slug).subscribe({
                next: r => this.isFollowing = r.is_following,
                error: () => {}
              });
            }
          },
          error: () => { this.loading = false; this.router.navigate(['/projects']); }
        });
      }
    });
  }

  loadReviews(userId: number): void {
    this.api.getUserReviews(userId).subscribe({
      next: (r: { reviews: Review[], average: number }) => {
        this.reviews = r.reviews;
        this.averageRating = r.average;
      }
    });
  }

  loadFollowCounts(userIdOrSlug: string | number): void {
    this.api.getFollowCounts(userIdOrSlug).subscribe({
      next: c => this.followCounts = c,
      error: () => {}
    });
  }

  async toggleFollow(): Promise<void> {
    if (!this.user || this.followLoading) return;
    if (!this.auth.isLoggedIn) {
      await this.openOnboardingDialog();
      return;
    }
    this.followLoading = true;
    const action = this.isFollowing
      ? this.api.unfollowUser(this.user.slug)
      : this.api.followUser(this.user.slug);
    action.subscribe({
      next: () => {
        this.isFollowing = !this.isFollowing;
        this.followCounts.followers += this.isFollowing ? 1 : -1;
        this.followLoading = false;
      },
      error: () => {
        this.snack.open('Erro ao atualizar seguimento.', 'Fechar', { duration: 3000 });
        this.followLoading = false;
      }
    });
  }

  async sendMessage(): Promise<void> {
    if (!this.user) return;
    if (!this.auth.isLoggedIn) {
      await this.openOnboardingDialog();
      return;
    }
    this.api.startConversation(this.user.id).subscribe({
      next: conv => this.router.navigate(['/messages', conv.id]),
      error: () => this.snack.open('Erro ao iniciar conversa.', 'Fechar', { duration: 3000 })
    });
  }

  private loadUserProjects(userId: number): void {
    this.loadingProjects = true;
    // ask for all statuses, then filter owner locally. this is cheap enough for a
    // profile view; if performance becomes a problem we can add a backend
    // filtering parameter later.
    this.api.listProjects('all').subscribe({
      next: projs => {
        this.userProjects = projs.filter(p => p.owner_id === userId);
        this.loadingProjects = false;
      },
      error: () => { this.loadingProjects = false; }
    });
  }

  getStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i < rating ? 1 : 0);
  }

  getRoundedStars(): number[] {
    return this.getStars(Math.round(this.averageRating));
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      needs_help: 'Criador de projetos',
      helper: 'Colaborador',
      both: 'Criador & Colaborador'
    };
    return map[role] ?? role;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { open: 'Aberto', in_progress: 'Em progresso', completed: 'Concluído', full: 'Vagas cheias' };
    return map[status] ?? status;
  }

  async openOnboardingDialog(): Promise<void> {
    const { OnboardingComponent } = await import('../onboarding/onboarding.component');
    this.dialog.open(OnboardingComponent, {
      width: '540px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'onboarding-dialog',
      autoFocus: false,
      restoreFocus: false
    });
  }

  openRateDialog(): void {
    if (!this.user) return;
    if (!this.auth.isLoggedIn) {
      this.openOnboardingDialog();
      return;
    }

    const dialogRef = this.dialog.open(RateUserDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      data: {
        userId: this.user.id,
        userName: this.user.name
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Reload reviews after successful submission
        this.loadReviews(this.user!.id);
      }
    });
  }

  openFollowersDialog(): void {
    if (!this.user) return;
    this.dialog.open(FollowListDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: {
        userId: this.user.slug,
        type: 'followers'
      }
    });
  }

  openFollowingDialog(): void {
    if (!this.user) return;
    this.dialog.open(FollowListDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: {
        userId: this.user.slug,
        type: 'following'
      }
    });
  }

  private buildSocialLinks(contactLinks?: ContactLinks): Array<{ key: keyof ContactLinks; label: string; iconUrl: string; url: string; value: string }> {
    if (!contactLinks) return [];

    const config: Array<{ key: keyof ContactLinks; label: string; iconUrl: string }> = [
      { key: 'website', label: 'Website', iconUrl: 'https://cdn.simpleicons.org/googlechrome/68007a' },
      { key: 'github', label: 'GitHub', iconUrl: 'https://cdn.simpleicons.org/github/68007a' },
      { key: 'linkedin', label: 'LinkedIn', iconUrl: 'data:image/svg+xml;utf8,%3Csvg fill=%22%2368007a%22 width=%2224%22 height=%2224%22 viewBox=%22-5.5 0 32 32%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctitle%3Elinkedin%3C/title%3E%3Cpath d=%22M0 8.219v15.563c0 1.469 1.156 2.625 2.625 2.625h15.563c0.719 0 1.406-0.344 1.844-0.781 0.469-0.469 0.781-1.063 0.781-1.844v-15.563c0-1.469-1.156-2.625-2.625-2.625h-15.563c-0.781 0-1.375 0.313-1.844 0.781-0.438 0.438-0.781 1.125-0.781 1.844zM2.813 10.281c0-1 0.813-1.875 1.813-1.875 1.031 0 1.875 0.875 1.875 1.875 0 1.031-0.844 1.844-1.875 1.844-1 0-1.813-0.813-1.813-1.844zM7.844 23.125v-9.531c0-0.219 0.219-0.406 0.375-0.406h2.656c0.375 0 0.375 0.438 0.375 0.719 0.75-0.75 1.719-0.938 2.719-0.938 2.438 0 4 1.156 4 3.719v6.438c0 0.219-0.188 0.406-0.375 0.406h-2.75c-0.219 0-0.375-0.219-0.375-0.406v-5.813c0-0.969-0.281-1.5-1.375-1.5-1.375 0-1.719 0.906-1.719 2.125v5.188c0 0.219-0.219 0.406-0.438 0.406h-2.719c-0.156 0-0.375-0.219-0.375-0.406zM2.875 23.125v-9.531c0-0.219 0.219-0.406 0.375-0.406h2.719c0.25 0 0.406 0.156 0.406 0.406v9.531c0 0.219-0.188 0.406-0.406 0.406h-2.719c-0.188 0-0.375-0.219-0.375-0.406z%22/%3E%3C/svg%3E' },
      { key: 'instagram', label: 'Instagram', iconUrl: 'https://cdn.simpleicons.org/instagram/68007a' },
      { key: 'facebook', label: 'Facebook', iconUrl: 'https://cdn.simpleicons.org/facebook/68007a' },
      { key: 'twitter', label: 'X / Twitter', iconUrl: 'https://cdn.simpleicons.org/x/68007a' },
      { key: 'tiktok', label: 'TikTok', iconUrl: 'https://cdn.simpleicons.org/tiktok/68007a' }
    ];

    return config
      .map(item => {
        const value = (contactLinks[item.key] || '').trim();
        if (!value) return null;
        const normalized = this.normalizeSocialValue(item.key, value);
        return {
          ...item,
          value: normalized,
          url: this.buildSocialUrl(item.key, normalized)
        };
      })
      .filter((item): item is { key: keyof ContactLinks; label: string; iconUrl: string; url: string; value: string } => !!item);
  }

  private normalizeSocialValue(key: keyof ContactLinks, value: string): string {
    const trimmed = value.trim();
    if (key === 'website') {
      return trimmed;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return this.extractHandleFromUrl(key, trimmed);
    }

    return trimmed.replace(/^@+/, '');
  }

  private buildSocialUrl(key: keyof ContactLinks, value: string): string {
    if (key === 'website') {
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    }

    const handle = value.replace(/^@+/, '');
    const base: Record<string, string> = {
      github: 'https://github.com/',
      linkedin: 'https://www.linkedin.com/in/',
      instagram: 'https://www.instagram.com/',
      facebook: 'https://www.facebook.com/',
      twitter: 'https://x.com/',
      tiktok: 'https://www.tiktok.com/@'
    };
    return `${base[key]}${handle}`;
  }

  private extractHandleFromUrl(key: keyof ContactLinks, url: string): string {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.replace(/^\/+|\/+$/g, '');
      const segments = path.split('/').filter(Boolean);
      if (!segments.length) return url;

      if (key === 'linkedin' && segments[0] === 'in' && segments[1]) {
        return segments[1];
      }

      const last = segments[segments.length - 1];
      return last.replace(/^@+/, '');
    } catch {
      return url.replace(/^@+/, '');
    }
  }
}
