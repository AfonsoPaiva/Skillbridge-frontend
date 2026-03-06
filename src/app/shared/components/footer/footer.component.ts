import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { OnboardingComponent } from '../../../features/onboarding/onboarding.component';
import { LoginComponent } from '../../../features/onboarding/login/login.component';
import { DonationCheckoutComponent } from '../../../features/donation/donation-checkout.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  year = new Date().getFullYear();

  constructor(private dialog: MatDialog, public auth: AuthService) {}

  openOnboarding(): void {
    this.dialog.open(OnboardingComponent, {
      width: '540px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'onboarding-dialog'
    });
  }

  openLogin(): void {
    this.dialog.open(LoginComponent, {
      width: '420px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'onboarding-dialog'
    });
  }

  openDonation(): void {
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
    }
  }
}
