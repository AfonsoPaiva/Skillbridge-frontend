import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/models';
import { ApiService } from './api.service';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  setPersistence, 
  browserLocalPersistence,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  token: string;
  expiresAt?: number; // timestamp when token expires
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser$ = new BehaviorSubject<AuthUser | null>(null);
  readonly currentUser$ = this._currentUser$.asObservable();

  private _user$ = new BehaviorSubject<User | null>(null);
  readonly user$ = this._user$.asObservable();

  private firebaseAuth: Auth | null = null;
  private tokenRefreshTimer: any = null;

  get currentUser(): AuthUser | null {
    return this._currentUser$.getValue();
  }

  get isLoggedIn(): boolean {
    return !!this._currentUser$.getValue();
  }

  /** Initialize Firebase Auth with persistence */
  initializeFirebaseAuth(): void {
    if (this.firebaseAuth) return;

    const app = this.getFirebaseApp();
    this.firebaseAuth = getAuth(app);

    // Set persistence to keep user logged in across sessions
    setPersistence(this.firebaseAuth, browserLocalPersistence).catch(err => {
      console.error('Failed to set auth persistence:', err);
    });

    // Listen to auth state changes and refresh token automatically
    onAuthStateChanged(this.firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken(false); // false = use cached token
          const tokenResult = await firebaseUser.getIdTokenResult();
          const expiresAt = new Date(tokenResult.expirationTime).getTime();
          
          this.setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            token,
            expiresAt
          });

          // Schedule token refresh before expiration (5 minutes before)
          this.scheduleTokenRefresh(expiresAt);
        } catch (err) {
          console.error('Failed to get token:', err);
        }
      } else {
        this.clearSession();
      }
    });
  }

  private getFirebaseApp(): FirebaseApp {
    if (getApps().length > 0) return getApps()[0];
    return initializeApp({
      apiKey: environment.firebaseApiKey,
      authDomain: environment.firebaseAuthDomain
    });
  }

  /** Schedule automatic token refresh */
  private scheduleTokenRefresh(expiresAt: number): void {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    // Refresh 5 minutes before expiration
    const refreshTime = expiresAt - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(async () => {
        await this.refreshToken();
      }, refreshTime);
    } else {
      // Token already expired or about to expire, refresh immediately
      this.refreshToken();
    }
  }

  /** Manually refresh the Firebase token */
  async refreshToken(): Promise<void> {
    if (!this.firebaseAuth?.currentUser) return;

    try {
      const token = await this.firebaseAuth.currentUser.getIdToken(true); // true = force refresh
      const tokenResult = await this.firebaseAuth.currentUser.getIdTokenResult();
      const expiresAt = new Date(tokenResult.expirationTime).getTime();

      const currentUser = this._currentUser$.getValue();
      if (currentUser) {
        this.setUser({ ...currentUser, token, expiresAt });
        this.scheduleTokenRefresh(expiresAt);
      }
    } catch (err) {
      console.error('Failed to refresh token:', err);
      this.clearSession();
    }
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
        
        // Check if token is expired or about to expire
        if (user.expiresAt && user.expiresAt < Date.now()) {
          // Token expired, try to refresh via Firebase
          this.initializeFirebaseAuth();
        } else {
          this._currentUser$.next(user);
          
          // Schedule refresh if we have expiration time
          if (user.expiresAt) {
            this.scheduleTokenRefresh(user.expiresAt);
          }
        }
      } catch {
        this.clearSession();
      }
    } else {
      // Try to restore from Firebase auth state
      this.initializeFirebaseAuth();
    }
  }

  /** Prefetch and cache user profile */
  prefetchUserProfile(api: ApiService): void {
    if (!this.getToken()) {
      this._user$.next(null);
      return;
    }

    api.getMyProfile().subscribe({
      next: (u) => this._user$.next(u),
      error: () => {
        this._user$.next(null);
      }
    });
  }

  clearSession(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    // Sign out from Firebase to clear auth state
    if (this.firebaseAuth) {
      import('firebase/auth').then(({ signOut }) => {
        signOut(this.firebaseAuth!).catch(() => {});
      });
    }
    
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_user');
    localStorage.removeItem('sb_onboarded');
    this._currentUser$.next(null);
    this._user$.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('sb_token');
  }

  getFirebaseAuth(): Auth | null {
    if (!this.firebaseAuth) {
      this.initializeFirebaseAuth();
    }
    return this.firebaseAuth;
  }
}
