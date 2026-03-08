import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  year = new Date().getFullYear();

  constructor(private dialog: MatDialog, public auth: AuthService) {}

  private blurActiveElement(): void {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  async openOnboarding(): Promise<void> {
    this.blurActiveElement();
    const { OnboardingComponent } = await import('../../../features/onboarding/onboarding.component');
    this.dialog.open(OnboardingComponent, {
      width: '540px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'onboarding-dialog'
    });
  }

  async openLogin(): Promise<void> {
    this.blurActiveElement();
    const { LoginComponent } = await import('../../../features/onboarding/login/login.component');
    this.dialog.open(LoginComponent, {
      width: '420px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'onboarding-dialog'
    });
  }

  async openDonation(): Promise<void> {
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

  openCookieSettings(): void {
    // Call Klaro's show method to open the cookie consent modal
    if (typeof (window as any).klaro !== 'undefined') {
      (window as any).klaro.show();
    } else {
      console.warn('Klaro not loaded yet');
    }
  }
}
