import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RecruiterAuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    await this.auth.ensureSessionRestored();

    if (!this.auth.isLoggedIn) {
      this.router.navigate(['/recrutadores']);
      return false;
    }

    if (!this.auth.isRecruiter) {
      this.router.navigate(['/recrutadores']);
      return false;
    }

    return true;
  }
}
