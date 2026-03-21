import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/models';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { getFirebaseAuthDomain } from '../utils/firebase-auth-domain.utils';

// Lazy-loaded Firebase types (only used for type hints, not runtime imports)
type FirebaseApp = import('firebase/app').FirebaseApp;
type Auth = import('firebase/auth').Auth;

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
  private firebaseInitPromise: Promise<void> | null = null;
  private sessionRestorePromise: Promise<void> | null = null;

  get currentUser(): AuthUser | null {
    return this._currentUser$.getValue();
  }

  get isLoggedIn(): boolean {
    return !!this._currentUser$.getValue();
  }

  get cachedProfile(): User | null {
    return this._user$.getValue();
  }

  setCachedProfile(user: User | null): void {
    this._user$.next(user);
  }

  /** Initialize Firebase Auth lazily — only downloads the SDK when called */
  initializeFirebaseAuth(): Promise<void> {
    if (this.firebaseAuth) return Promise.resolve();
    if (this.firebaseInitPromise) return this.firebaseInitPromise;

    this.firebaseInitPromise = this._doInitFirebase();
    return this.firebaseInitPromise;
  }

  private async _doInitFirebase(): Promise<void> {
    const [{ initializeApp, getApps }, { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged }] =
      await Promise.all([
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

    this.firebaseAuth = getAuth(app);

    // Set persistence to keep user logged in across sessions
    await setPersistence(this.firebaseAuth, browserLocalPersistence).catch(err => {
      console.error('Failed to set auth persistence:', err);
    });

    // Listen to auth state changes and refresh token automatically
    onAuthStateChanged(this.firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken(false);
          const tokenResult = await firebaseUser.getIdTokenResult();
          const expiresAt = new Date(tokenResult.expirationTime).getTime();

          this.setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            token,
            expiresAt
          });

          this.scheduleTokenRefresh(expiresAt);
        } catch (err) {
          console.error('Failed to get token:', err);
        }
      } else {
        // Only clear if we didn't just restore from localStorage
        if (!this._currentUser$.getValue()) {
          this.clearSession();
        }
      }
    });
  }

  /** Schedule automatic token refresh */
  private scheduleTokenRefresh(expiresAt: number): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    const refreshTime = expiresAt - Date.now() - (5 * 60 * 1000);

    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(async () => {
        await this.refreshToken();
      }, refreshTime);
    } else {
      this.refreshToken();
    }
  }

  /** Manually refresh the Firebase token (lazy-loads Firebase if needed) */
  async refreshToken(): Promise<void> {
    await this.initializeFirebaseAuth();
    if (!this.firebaseAuth?.currentUser) return;

    try {
      const token = await this.firebaseAuth.currentUser.getIdToken(true);
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

  /** Ensure session restore runs once and can be awaited by guards/bootstrap code */
  ensureSessionRestored(): Promise<void> {
    if (this.sessionRestorePromise) return this.sessionRestorePromise;

    this.sessionRestorePromise = this.restoreSession().finally(() => {
      this.sessionRestorePromise = null;
    });

    return this.sessionRestorePromise;
  }

  /** Restore session from localStorage */
  async restoreSession(): Promise<void> {
    const raw = localStorage.getItem('sb_user');
    if (raw) {
      try {
        const user: AuthUser = JSON.parse(raw);

        if (user.expiresAt && user.expiresAt < Date.now()) {
          // Token expired — lazy-load Firebase to refresh
          this._currentUser$.next(user); // keep UI state while refreshing
          await this.refreshToken();
        } else {
          this._currentUser$.next(user);

          if (user.expiresAt) {
            this.scheduleTokenRefresh(user.expiresAt);
          }
        }
      } catch {
        this.clearSession();
      }
    }
    // No localStorage user → anonymous visitor, skip Firebase initialisation
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

    // Sign out from Firebase to clear auth state (lazy)
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

  /** Get or lazy-init Firebase Auth instance */
  async getFirebaseAuth(): Promise<Auth | null> {
    await this.initializeFirebaseAuth();
    return this.firebaseAuth;
  }
}
