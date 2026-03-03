import { Component, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  UserCredential
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

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    const { email, password } = this.form.value;

    this.http.post<{ idToken: string; localId: string; email: string }>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${environment.firebaseApiKey}`,
      { email, password, returnSecureToken: true }
    ).subscribe({
      next: (fb) => {
        this.auth.setUser({ uid: fb.localId, email: fb.email, displayName: null, token: fb.idToken });

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
                  name: '',
                  email: fb.email
                } as OnboardingDialogData
              });
            }, 200);
          }
        });
      },
      error: (err) => {
        this.loading = false;
        const code: string = err?.error?.error?.message ?? '';
        if (code.includes('INVALID_PASSWORD') || code.includes('INVALID_LOGIN_CREDENTIALS') || code.includes('EMAIL_NOT_FOUND')) {
          this.error = 'Email ou palavra-passe incorretos.';
        } else if (code.includes('TOO_MANY_ATTEMPTS')) {
          this.error = 'Demasiadas tentativas. Aguarda uns minutos.';
        } else if (code.includes('USER_DISABLED')) {
          this.error = 'Esta conta foi desativada.';
        } else {
          this.error = 'Erro ao iniciar sessão. Tenta novamente.';
        }
      }
    });
  }

  private getFirebaseApp(): FirebaseApp {
    if (getApps().length > 0) return getApps()[0];
    return initializeApp({ apiKey: environment.firebaseApiKey, authDomain: environment.firebaseAuthDomain });
  }

  async signInWithProvider(provider: 'google' | 'facebook' | 'microsoft'): Promise<void> {
    this.loading = true;
    this.error = '';
    const fbAuth = getAuth(this.getFirebaseApp());

    let authProvider: GoogleAuthProvider | FacebookAuthProvider | OAuthProvider;
    if (provider === 'google') authProvider = new GoogleAuthProvider();
    else if (provider === 'facebook') authProvider = new FacebookAuthProvider();
    else authProvider = new OAuthProvider('microsoft.com');

    try {
      const cred: UserCredential = await signInWithPopup(fbAuth, authProvider);
      const idToken = await cred.user.getIdToken();
      this.auth.setUser({ uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName, token: idToken });

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
