import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    await this.auth.ensureSessionRestored();

    if (!this.auth.isLoggedIn) {
      this.router.navigate(['/landing']);
      return false;
    }

    // Block access if user still needs to complete onboarding (social login without profile)
    if (localStorage.getItem('sb_needs_onboarding')) {
      this.auth.clearSession();
      localStorage.removeItem('sb_needs_onboarding');
      this.router.navigate(['/landing']);
      return false;
    }

    return true;
  }
}
