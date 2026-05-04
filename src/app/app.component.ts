import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { ApiService } from './core/services/api.service';
import { PushNotificationService } from './core/services/push-notification.service';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../environments/environment';
import { getFirebaseAuthDomain } from './core/utils/firebase-auth-domain.utils';
import type { UserCredential } from 'firebase/auth';
import {
  trigger, transition, style, animate, query, group
} from '@angular/animations';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export const routeAnimation = trigger('routeAnimation', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(16px)' })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('180ms ease-out', style({ opacity: 0, transform: 'translateY(-8px)' }))
      ], { optional: true }),
      query(':enter', [
        animate('260ms 100ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ], { optional: true })
    ])
  ])
]);

@Component({
  selector: 'app-root',
  template: `
    <app-navbar></app-navbar>
    <main [@routeAnimation]="getRouteState(outlet)">
      <router-outlet #outlet="outlet"></router-outlet>
    </main>
    <app-footer *ngIf="!hideFooter"></app-footer>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    main {
      flex: 1 1 auto;
      /* let the content area grow and shrink; footer will sit below */
    }
  `],
  animations: [routeAnimation]
})
export class AppComponent implements OnInit {
  private readonly siteUrl = 'https://skillbridge.pt';
  private readonly defaultTitle = 'SkillBridge';
  private readonly defaultDescription = 'Plataforma portuguesa que liga estudantes através da partilha de competências para criar projetos reais e enriquecer portfólios.';

  hideFooter = false;
  constructor(
    private auth: AuthService, 
    private router: Router, 
    private route: ActivatedRoute,
    private api: ApiService,
    private pushNotifications: PushNotificationService,
    private dialog: MatDialog,
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // Restore session before profile prefetch to avoid startup 401 with expired tokens
    this.auth.ensureSessionRestored().finally(() => {
      this.auth.prefetchUserProfile(this.api);

      if (this.auth.isLoggedIn) {
        this.pushNotifications.initializeForLoggedUser();
      }
    });

    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.pushNotifications.initializeForLoggedUser();
      }
    });

    // Handle pending OAuth redirect (embedded browsers or popup-blocked fallback)
    this.handlePendingAuthRedirect();
    
    // Hide footer on messages routes
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.hideFooter = event.url.includes('/messages');
      this.applySeo(event.urlAfterRedirects);
      this.trackPageView(event.urlAfterRedirects);

      if (event.urlAfterRedirects.startsWith('/dashboard')) {
        this.forceScrollTop();
      }
    });
    
    // Check if email verification is pending
    this.checkEmailVerificationPending();
  }

  /**
   * Handle OAuth redirect result on app startup.
   * When redirect-based sign-in is used (embedded browsers or popup-blocked fallback),
   * the page reloads and we need to consume the redirect result here at the app level
   * since the login dialog is no longer open.
   */
  private async handlePendingAuthRedirect(): Promise<void> {
    const pending = localStorage.getItem('sb_auth_redirect_pending');
    if (!pending) return;

    localStorage.removeItem('sb_auth_redirect_pending');

    try {
      const [{ initializeApp, getApps }, { getAuth, getRedirectResult }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth')
      ]);

      const app = getApps().length > 0 ? getApps()[0] : initializeApp({
        apiKey: environment.firebaseApiKey,
        authDomain: getFirebaseAuthDomain(),
        projectId: environment.firebaseProjectId,
        messagingSenderId: environment.firebaseMessagingSenderId,
        appId: environment.firebaseAppId
      });

      const fbAuth = getAuth(app);
      
      // In webviews, getRedirectResult may need retries
      let result: UserCredential | null = null;
      let retries = 3;
      
      while (!result && retries > 0) {
        try {
          result = await getRedirectResult(fbAuth);
          if (result) break;
        } catch (err: any) {
          if (err?.code === 'auth/redirect-operation-pending') {
            // Redirect is still pending, wait and retry
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
            continue;
          }
          throw err;
        }
        
        if (!result && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
          retries--;
        }
      }

      if (!result || !result.user) return;

      const idToken = await result.user.getIdToken();
      const tokenResult = await result.user.getIdTokenResult();
      const expiresAt = new Date(tokenResult.expirationTime).getTime();

      this.auth.setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        token: idToken,
        expiresAt
      });

      this.api.getMyProfile().subscribe({
        next: () => {
          this.router.navigate(['/dashboard']).then(() => window.scrollTo(0, 0));
        },
        error: (err) => {
          if (err.status === 404) {
            // First social login — open onboarding to complete profile
            const name = result.user.displayName || result.user.email?.split('@')[0] || '';
            setTimeout(async () => {
              const { OnboardingComponent } = await import('./features/onboarding/onboarding.component');
              this.dialog.open(OnboardingComponent, {
                width: '540px',
                maxWidth: '95vw',
                maxHeight: '90vh',
                panelClass: 'onboarding-dialog',
                autoFocus: false,
                restoreFocus: false,
                disableClose: true,
                data: {
                  socialMode: true,
                  name,
                  email: result.user.email
                }
              });
            }, 200);
          } else {
            this.router.navigate(['/dashboard']).then(() => window.scrollTo(0, 0));
          }
        }
      });
    } catch (err) {
      console.error('Failed to handle auth redirect:', err);
    }
  }

  private forceScrollTop(): void {
    const doScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const main = document.querySelector('main');
      if (main) {
        main.scrollTop = 0;
      }
    };

    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 0);
    setTimeout(doScroll, 80);
  }

  private checkEmailVerificationPending(): void {
    // Wait a bit for auth to be restored
    setTimeout(() => {
      const isPending = localStorage.getItem('sb_email_verification_pending');
      
      if (isPending === 'true' && this.auth.isLoggedIn) {
        // Check if user is already verified in backend
        this.api.checkEmailVerificationStatus().subscribe({
          next: (result) => {
            if (!result.email_verified) {
              // Still not verified, show the dialog
              import('./features/onboarding/email-verification-dialog/email-verification-dialog.component').then(({ EmailVerificationDialogComponent }) => {
                this.dialog.open(EmailVerificationDialogComponent, {
                  width: '500px',
                  maxWidth: '95vw',
                  disableClose: true,
                  panelClass: 'email-verification-dialog'
                });
              });
            } else {
              // Already verified, clear the flag
              localStorage.removeItem('sb_email_verification_pending');
              localStorage.removeItem('sb_email_verification_timer');
            }
          },
          error: () => {
            // If check fails, assume not verified and show dialog
            import('./features/onboarding/email-verification-dialog/email-verification-dialog.component').then(({ EmailVerificationDialogComponent }) => {
              this.dialog.open(EmailVerificationDialogComponent, {
                width: '500px',
                maxWidth: '95vw',
                disableClose: true,
                panelClass: 'email-verification-dialog'
              });
            });
          }
        });
      }
    }, 1000);
  }

  private applySeo(urlAfterRedirects: string): void {
    const leafData = this.getLeafRouteData();
    const title = leafData['title'] || this.defaultTitle;
    const description = leafData['description'] || this.defaultDescription;
    const robots = leafData['robots'] || 'index, follow';
    const cleanPath = urlAfterRedirects.split('?')[0] || '/';
    const canonicalUrl = `${this.siteUrl}${cleanPath}`;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:url', content: canonicalUrl });
    this.updateCanonicalTag(canonicalUrl);
  }

  private getLeafRouteData(): Record<string, string> {
    let current = this.route.firstChild;
    let snapshot = this.route.snapshot;

    while (current) {
      snapshot = current.snapshot;
      current = current.firstChild;
    }

    return snapshot.data as Record<string, string>;
  }

  private updateCanonicalTag(url: string): void {
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private trackPageView(urlAfterRedirects: string): void {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_path: urlAfterRedirects,
      page_location: `${this.siteUrl}${urlAfterRedirects}`,
      page_title: this.title.getTitle()
    });
  }

  getRouteState(outlet: RouterOutlet): string {
    if (!outlet.isActivated) return '';
    return outlet.activatedRouteData?.['animation'] || outlet.activatedRoute?.snapshot?.url?.[0]?.path || '';
  }
}
