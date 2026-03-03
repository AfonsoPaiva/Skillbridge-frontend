import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/models';
import { ApiService } from './api.service';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser$ = new BehaviorSubject<AuthUser | null>(null);
  readonly currentUser$ = this._currentUser$.asObservable();

  private _user$ = new BehaviorSubject<User | null>(null);
  readonly user$ = this._user$.asObservable();

  get currentUser(): AuthUser | null {
    return this._currentUser$.getValue();
  }

  get isLoggedIn(): boolean {
    return !!this._currentUser$.getValue();
  }

  /** Store a user session (called after Firebase sign-in) */
  setUser(user: AuthUser): void {
    localStorage.setItem('sb_token', user.token);
    localStorage.setItem('sb_user', JSON.stringify(user));
    this._currentUser$.next(user);
  }

  /** Restore session from localStorage */
  restoreSession(): void {
    const raw = localStorage.getItem('sb_user');
    if (raw) {
      try {
        const user: AuthUser = JSON.parse(raw);
        this._currentUser$.next(user);
      } catch {
        this.clearSession();
      }
    }
  }

  /** Prefetch and cache user profile */
  prefetchUserProfile(api: ApiService): void {
    api.getMyProfile().subscribe({
      next: (u) => this._user$.next(u),
      error: () => this._user$.next(null)
    });
  }

  clearSession(): void {
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_user');
    this._currentUser$.next(null);
    this._user$.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('sb_token');
  }
}
