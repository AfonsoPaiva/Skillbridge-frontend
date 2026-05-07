import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { filter } from 'rxjs/operators';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';

const DIALOG_CONFIG = {
  width: '540px',
  maxWidth: '95vw',
  maxHeight: '90vh',
  panelClass: ['onboarding-dialog', 'slide-in-dialog'],
  autoFocus: false,
  restoreFocus: false
};

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  menuOpen = false;
  scrolled = false;
  isLandingPage = false;
  heroScrolled = false;
  unreadCount = 0;
  private unreadSubscription?: Subscription;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 20;
    if (this.isLandingPage) {
      // On mobile, show header sooner (40% of viewport height)
      // On desktop, keep original behavior (80% of viewport height)
      const isMobile = window.innerWidth <= 768;
      const threshold = isMobile ? 0.4 : 0.8;
      this.heroScrolled = window.scrollY > window.innerHeight * threshold;
    }
  }

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(u => {
      this.isLoggedIn = !!u;
      if (this.isLoggedIn) {
        this.startUnreadPolling();
      } else {
        this.stopUnreadPolling();
        this.unreadCount = 0;
      }
    });
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      const url = e.urlAfterRedirects;
      this.isLandingPage = url.includes('/landing') || url === '/';
      if (!this.isLandingPage) this.heroScrolled = false;

      if (this.isLoggedIn) {
        if (url.includes('/messages')) {
          // User entered the messages page — clear badge immediately
          // (the conversation component calls markRead when messages load)
          this.unreadCount = 0;
        } else {
          // User navigated away from messages — refresh count from server
          this.loadUnreadCount();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.stopUnreadPolling();
  }

  private startUnreadPolling(): void {
    this.loadUnreadCount();
    // Poll every 30 seconds
    this.unreadSubscription = interval(30000).subscribe(() => {
      this.loadUnreadCount();
    });
  }

  private stopUnreadPolling(): void {
    if (this.unreadSubscription) {
      this.unreadSubscription.unsubscribe();
    }
  }

  private loadUnreadCount(): void {
    if (!this.isLoggedIn) return;
    this.api.getUnreadMessageCount().subscribe({
      next: (result) => {
        const count = Number(result?.unread_count ?? 0);
        this.unreadCount = Number.isFinite(count) ? Math.max(0, count) : 0;
      },
      error: () => {
        // Silently fail
      }
    });
  }

  private blurActiveElement(): void {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  get isVisible(): boolean {
    return !this.isLandingPage || this.heroScrolled;
  }

  logout(): void {
    this.auth.clearSession();
    this.router.navigate(['/landing']);
  }

  async openOnboarding(): Promise<void> {
    this.blurActiveElement();
    const { OnboardingComponent } = await import('../../../features/onboarding/onboarding.component');
    this.dialog.open(OnboardingComponent, DIALOG_CONFIG);
  }

  async openLogin(): Promise<void> {
    this.blurActiveElement();
    const { LoginComponent } = await import('../../../features/onboarding/login/login.component');
    this.dialog.open(LoginComponent, { ...DIALOG_CONFIG, width: '420px' });
  }

  async openDonation(): Promise<void> {
    this.menuOpen = false;
    this.blurActiveElement();
    const { DonationCheckoutComponent } = await import('../../../features/donation/donation-checkout.component');
    this.dialog.open(DonationCheckoutComponent, {
      width: '650px',
      maxWidth: '95vw',
      height: 'auto',
      maxHeight: '90vh',
      panelClass: 'donation-dialog',
      autoFocus: false,
      restoreFocus: false
    });
  }
}
