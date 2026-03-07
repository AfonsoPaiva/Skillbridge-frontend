import { Component, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  UserCredential,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { OnboardingComponent, OnboardingDialogData } from '../onboarding.component';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('300ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private dialog: MatDialog,
    @Optional() public dialogRef: MatDialogRef<LoginComponent>
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  close(): void {
    if (this.dialogRef) this.dialogRef.close();
    else this.router.navigate(['/landing']);
  }

  openRegister(): void {
    this.close();
    setTimeout(() => {
      this.dialog.open(OnboardingComponent, {
        width: '540px', maxWidth: '95vw', maxHeight: '90vh',
        panelClass: 'onboarding-dialog', autoFocus: false, restoreFocus: false
      });
    }, 200);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    const { email, password } = this.form.value;

    try {
      const fbAuth = getAuth(this.getFirebaseApp());
      
      // Set persistence to keep user logged in
      await setPersistence(fbAuth, browserLocalPersistence);
      
      // Sign in with Firebase
      const cred: UserCredential = await signInWithEmailAndPassword(fbAuth, email, password);
      const idToken = await cred.user.getIdToken();
      const tokenResult = await cred.user.getIdTokenResult();
      const expiresAt = new Date(tokenResult.expirationTime).getTime();

      this.auth.setUser({ 
        uid: cred.user.uid, 
        email: cred.user.email, 
        displayName: cred.user.displayName, 
        token: idToken,
        expiresAt
      });

      // Fetch backend profile
      this.api.getMyProfile().subscribe({
        next: () => {
          this.loading = false;
          localStorage.setItem('sb_onboarded', '1');
          this.close();
          this.router.navigate(['/dashboard']);
        },
        error: (profileErr) => {
          // User exists in Firebase but not in our DB — force onboarding
          this.loading = false;
          this.close();
          setTimeout(() => {
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
                name: cred.user.displayName || '',
                email: cred.user.email
              } as OnboardingDialogData
            });
          }, 200);
        }
      });
    } catch (err: any) {
      this.loading = false;
      const code: string = err?.code ?? '';
      if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
        this.error = 'Email ou palavra-passe incorretos.';
      } else if (code.includes('auth/too-many-requests')) {
        this.error = 'Demasiadas tentativas. Aguarda uns minutos.';
      } else if (code.includes('auth/user-disabled')) {
        this.error = 'Esta conta foi desativada.';
      } else {
        this.error = 'Erro ao iniciar sessão. Tenta novamente.';
      }
    }
  }

  private getFirebaseApp(): FirebaseApp {
    if (getApps().length > 0) return getApps()[0];
    return initializeApp({ apiKey: environment.firebaseApiKey, authDomain: environment.firebaseAuthDomain });
  }

  async signInWithProvider(provider: 'google' | 'github' | 'microsoft'): Promise<void> {
    this.loading = true;
    this.error = '';
    const fbAuth = getAuth(this.getFirebaseApp());

    // Set persistence before sign-in
    await setPersistence(fbAuth, browserLocalPersistence).catch(() => {});

    let authProvider: GoogleAuthProvider | GithubAuthProvider | OAuthProvider;
    if (provider === 'google') {
      authProvider = new GoogleAuthProvider();
    } else if (provider === 'github') {
      authProvider = new GithubAuthProvider();
    } else {
      // Microsoft OAuth provider with proper configuration
      authProvider = new OAuthProvider('microsoft.com');
      authProvider.setCustomParameters({
        prompt: 'select_account',
        tenant: 'common' // Allows both personal and work/school accounts
      });
      // Request basic profile scopes
      authProvider.addScope('openid');
      authProvider.addScope('profile');
      authProvider.addScope('email');
    }

    try {
      const cred: UserCredential = await signInWithPopup(fbAuth, authProvider);
      const idToken = await cred.user.getIdToken();
      const tokenResult = await cred.user.getIdTokenResult();
      const expiresAt = new Date(tokenResult.expirationTime).getTime();
      
      this.auth.setUser({ 
        uid: cred.user.uid, 
        email: cred.user.email, 
        displayName: cred.user.displayName, 
        token: idToken,
        expiresAt
      });

      this.api.getMyProfile().subscribe({
        next: () => {
          this.loading = false;
          this.close();
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          if (err.status === 404) {
            // First social login — open onboarding to complete profile
            this.loading = false;
            const name = cred.user.displayName || cred.user.email?.split('@')[0] || '';
            this.close();
            setTimeout(() => {
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
                  email: cred.user.email
                } as OnboardingDialogData
              });
            }, 200);
          } else {
            this.loading = false;
            this.close();
            this.router.navigate(['/dashboard']);
          }
        }
      });
    } catch (err: any) {
      this.loading = false;
      const code: string = err?.code ?? '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        this.error = 'Erro ao iniciar sessão. Tenta novamente.';
      }
    }
  }
}
