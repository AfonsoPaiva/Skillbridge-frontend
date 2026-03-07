import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { ApiService } from './core/services/api.service';
import {
  trigger, transition, style, animate, query, group
} from '@angular/animations';

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
  hideFooter = false;
  constructor(
    private auth: AuthService, 
    private router: Router, 
    private api: ApiService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // Initialize Firebase auth with persistence before restoring session
    this.auth.initializeFirebaseAuth();
    this.auth.restoreSession();
    this.auth.prefetchUserProfile(this.api);
    
    // Hide footer on messages routes
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.hideFooter = event.url.includes('/messages');

      if (event.urlAfterRedirects.startsWith('/dashboard')) {
        this.forceScrollTop();
      }
    });
    
    // Check if email verification is pending
    this.checkEmailVerificationPending();
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

  getRouteState(outlet: RouterOutlet): string {
    if (!outlet.isActivated) return '';
    return outlet.activatedRouteData?.['animation'] || outlet.activatedRoute?.snapshot?.url?.[0]?.path || '';
  }
}
