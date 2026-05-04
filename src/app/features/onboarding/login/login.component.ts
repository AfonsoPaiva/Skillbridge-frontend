import { Component, Optional, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, UserCredential } from 'firebase/auth';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { getFirebaseAuthDomain } from '../../../core/utils/firebase-auth-domain.utils';
import { environment } from '../../../../environments/environment';
import { OnboardingDialogData } from '../onboarding.component';
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
export class LoginComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';
  showPassword = false;
  private firebaseReadyPromise: Promise<void> | null = null;
  private firebaseAuthInstance: Auth | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Optional() public dialogRef: MatDialogRef<LoginComponent>
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async ngOnInit(): Promise<void> {
    this.warmUpSocialAuth();
    await this.handleRedirectResult();
  }

  private async handleRedirectResult(): Promise<void> {
    if (!this.shouldUseRedirect()) return;

    try {
      const { auth: authMod } = await this.loadFirebase();
      const fbAuth = authMod.getAuth(await this.getFirebaseApp());
      
      // In webviews, getRedirectResult may need a slight delay
      let result: UserCredential | null = null;
      let retries = 3;
      
      while (!result && retries > 0) {
        try {
          result = await authMod.getRedirectResult(fbAuth);
          if (result) break;
        } catch (err: any) {
          if (err?.code === 'auth/redirect-operation-pending') {
            // Redirect is still pending, wait and retry
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
            continue;
          }
          throw err;
        }
        
        if (!result && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
          retries--;
        }
      }
      
      if (result && result.user) {
        this.loading = true;
        const idToken = await result.user.getIdToken();
        const tokenResult = await result.user.getIdTokenResult();
        const expiresAt = new Date(tokenResult.expirationTime).getTime();
        const redirectUser = result.user; // Store user reference to avoid null issues in closures
        
        this.auth.setUser({ 
          uid: redirectUser.uid, 
          email: redirectUser.email, 
          displayName: redirectUser.displayName, 
          token: idToken,
          expiresAt
        });

        // Clear redirect flag
        localStorage.removeItem('sb_auth_redirect_pending');

        this.api.getMyProfile().subscribe({
          next: () => {
            this.loading = false;
            this.close();
            this.router.navigate(['/dashboard']).then(() => {
              window.scrollTo(0, 0);
            });
          },
          error: (err) => {
            if (err.status === 404) {
              this.loading = false;
              const name = redirectUser.displayName || redirectUser.email?.split('@')[0] || '';
              this.close();
              setTimeout(async () => {
                const { OnboardingComponent } = await import('../onboarding.component');
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
                    email: redirectUser.email
                  } as OnboardingDialogData
                });
              }, 200);
            } else {
              this.loading = false;
              this.close();
              this.router.navigate(['/dashboard']).then(() => {
                window.scrollTo(0, 0);
              });
            }
          }
        });
      } else {
        // No redirect result - check if we should clear the pending flag
        localStorage.removeItem('sb_auth_redirect_pending');
      }
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code && code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        console.warn('Redirect result error:', code, err);
      }
      // Clear redirect flag on error
      localStorage.removeItem('sb_auth_redirect_pending');
    }
  }

  warmUpSocialAuth(): void {
    void this.preloadFirebaseAuth();
  }

  close(): void {
    if (this.dialogRef) this.dialogRef.close();
    else this.router.navigate(['/landing']);
  }

  async openRegister(): Promise<void> {
    this.close();
    setTimeout(async () => {
      const { OnboardingComponent } = await import('../onboarding.component');
      this.dialog.open(OnboardingComponent, {
        width: '540px', maxWidth: '95vw', maxHeight: '90vh',
        panelClass: ['onboarding-dialog', 'slide-in-dialog'], autoFocus: false, restoreFocus: false
      });
    }, 200);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    const { email, password } = this.form.value;

    try {
      const { auth: authMod } = await this.loadFirebase();
      const fbAuth = authMod.getAuth(await this.getFirebaseApp());
      
      // Set persistence to keep user logged in
      await authMod.setPersistence(fbAuth, authMod.browserLocalPersistence);
      
      // Sign in with Firebase
      const cred: UserCredential = await authMod.signInWithEmailAndPassword(fbAuth, email, password);
      
      // Check if email is verified (only for email/password accounts)
      if (!cred.user.emailVerified) {
        // Check if this is an OAuth account (they don't need email verification)
        const providerData = cred.user.providerData;
        const isOAuthAccount = providerData.some(p => 
          p.providerId === 'google.com' || 
          p.providerId === 'github.com' || 
          p.providerId === 'microsoft.com'
        );
        
        if (!isOAuthAccount) {
          this.loading = false;
          this.error = 'Por favor verifica o teu email antes de fazer login. Verifica a caixa de entrada e spam.';
          
          // Offer to resend verification email
          const resend = confirm('Email não verificado.\n\nQueres que reenviemos o email de verificação?');
          if (resend) {
            try {
              await authMod.sendEmailVerification(cred.user);
              alert(' Email de verificação enviado!\n\nVerifica a tua caixa de entrada (e spam).');
            } catch (err) {
              console.error('Error sending verification email:', err);
              alert(' Erro ao enviar email de verificação.');
            }
          }
          return;
        }
      }
      
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
          this.router.navigate(['/dashboard']).then(() => {
            window.scrollTo(0, 0);
          });
        },
        error: (profileErr) => {
          // User exists in Firebase but not in our DB — force onboarding
          this.loading = false;
          this.close();
          setTimeout(async () => {
            const { OnboardingComponent } = await import('../onboarding.component');
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

  private _fb: { app: any; auth: any } | null = null;
  private async loadFirebase() {
    if (!this._fb) {
      const [app, auth] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth')
      ]);
      this._fb = { app, auth };
    }
    return this._fb;
  }

  private async getFirebaseApp(): Promise<FirebaseApp> {
    const { app } = await this.loadFirebase();
    if (app.getApps().length > 0) {
      return app.getApps()[0];
    }
    return app.initializeApp({
      apiKey: environment.firebaseApiKey,
      authDomain: getFirebaseAuthDomain(),
      projectId: environment.firebaseProjectId,
      messagingSenderId: environment.firebaseMessagingSenderId,
      appId: environment.firebaseAppId
    });
  }

  private preloadFirebaseAuth(): Promise<void> {
    if (this.firebaseReadyPromise) {
      return this.firebaseReadyPromise;
    }

    this.firebaseReadyPromise = (async () => {
      const { auth: authMod } = await this.loadFirebase();
      const fbAuth = authMod.getAuth(await this.getFirebaseApp());
      this.firebaseAuthInstance = fbAuth;
      await authMod.setPersistence(fbAuth, authMod.browserLocalPersistence).catch(() => {});
    })().catch((err) => {
      this.firebaseReadyPromise = null;
      this.firebaseAuthInstance = null;
      throw err;
    });

    return this.firebaseReadyPromise;
  }

  private buildAuthProvider(authMod: any, provider: 'google' | 'github' | 'microsoft'): any {
    if (provider === 'google') {
      const google = new authMod.GoogleAuthProvider();
      google.setCustomParameters({ prompt: 'select_account' });
      return google;
    }

    if (provider === 'github') {
      const github = new authMod.GithubAuthProvider();
      github.addScope('user:email');
      return github;
    }

    const microsoft = new authMod.OAuthProvider('microsoft.com');
    microsoft.setCustomParameters({
      prompt: 'select_account',
      tenant: 'common'
    });
    microsoft.addScope('openid');
    microsoft.addScope('profile');
    microsoft.addScope('email');
    return microsoft;
  }

  private isEmbeddedBrowser(): boolean {
    const ua = navigator.userAgent || '';
    return /(FBAN|FBAV|Instagram|Line|LinkedInApp|TikTok|WebView|; wv\))/i.test(ua);
  }

  private shouldUseRedirect(): boolean {
    // Try popup first even in embedded browsers like Instagram webview
    // Only force redirect if popup explicitly fails
    return localStorage.getItem('sb_force_redirect_auth') === '1';
  }

  async signInWithProvider(provider: 'google' | 'github' | 'microsoft'): Promise<void> {
    this.loading = true;
    this.error = '';

    const authMod = this._fb?.auth;
    const fbAuth = this.firebaseAuthInstance;

    if (!authMod || !fbAuth) {
      this.loading = false;
      this.error = 'A preparar o login social. Toca novamente dentro de um instante.';
      this.warmUpSocialAuth();
      return;
    }

    const authProvider = this.buildAuthProvider(authMod, provider);

    try {
      let cred: UserCredential;

      // Always try popup first (even in Instagram webview - it works there)
      try {
        cred = await authMod.signInWithPopup(fbAuth, authProvider);
      } catch (popupErr: any) {
        if (popupErr?.code === 'auth/popup-blocked') {
          // Only fallback to redirect if popup is explicitly blocked
          localStorage.setItem('sb_force_redirect_auth', '1');
          localStorage.setItem('sb_auth_redirect_pending', '1');
          await authMod.signInWithRedirect(fbAuth, authProvider);
          return;
        }
        throw popupErr;
      }
      
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
          this.router.navigate(['/dashboard']).then(() => {
            window.scrollTo(0, 0);
          });
        },
        error: (err) => {
          if (err.status === 404) {
            // First social login — open onboarding to complete profile
            this.loading = false;
            const name = cred.user.displayName || cred.user.email?.split('@')[0] || '';
            this.close();
            setTimeout(async () => {
              const { OnboardingComponent } = await import('../onboarding.component');
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
            this.router.navigate(['/dashboard']).then(() => {
              window.scrollTo(0, 0);
            });
          }
        }
      });
    } catch (err: any) {
      this.loading = false;
      const code: string = err?.code ?? '';
      
      // Check if user closed the popup
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return; // Don't show error if user intentionally closed popup
      }

      if (code === 'auth/popup-blocked') {
        this.error = this.isEmbeddedBrowser()
          ? 'O login social foi bloqueado pelo navegador incorporado. Abre o SkillBridge no Chrome ou Safari e tenta novamente.'
          : 'O navegador bloqueou a janela de autenticação. Permite popups e tenta novamente.';
        return;
      }

      if (code === 'auth/web-storage-unsupported') {
        this.error = 'Este navegador móvel está a bloquear o armazenamento necessário para o login. Tenta no Chrome ou Safari normal.';
        return;
      }
      
      // Handle account-exists-with-different-credential error
      if (code === 'auth/account-exists-with-different-credential') {
        const resolved = await this.resolveAccountConflict(fbAuth, err, provider);
        if (!resolved && !this.error) {
          this.error = 'Este email já está registado com outro método de login.';
        }
      } else if (code === 'auth/credential-already-in-use') {
        this.error = 'Esta conta já está em uso. Tenta fazer login com outro método.';
      } else {
        this.error = 'Erro ao iniciar sessão. Tenta novamente.';
      }
    }
  }

  private providerFromSignInMethod(method: string): any {
    const authMod = this._fb!.auth;
    switch (method) {
      case 'google.com':
        return new authMod.GoogleAuthProvider();
      case 'github.com': {
        const github = new authMod.GithubAuthProvider();
        github.addScope('user:email');
        return github;
      }
      case 'microsoft.com': {
        const microsoft = new authMod.OAuthProvider('microsoft.com');
        microsoft.setCustomParameters({ prompt: 'select_account', tenant: 'common' });
        microsoft.addScope('openid');
        microsoft.addScope('profile');
        microsoft.addScope('email');
        return microsoft;
      }
      default:
        return null;
    }
  }

  private pendingCredentialFromError(
    err: any,
    requestedProvider: 'google' | 'github' | 'microsoft'
  ): any {
    if (err?.credential) {
      return err.credential;
    }
    const authMod = this._fb!.auth;
    if (requestedProvider === 'google') {
      return authMod.GoogleAuthProvider.credentialFromError(err);
    }
    if (requestedProvider === 'github') {
      return authMod.GithubAuthProvider.credentialFromError(err);
    }
    return authMod.OAuthProvider.credentialFromError(err);
  }

  private providerDisplayName(method: string): string {
    const providerNames: { [key: string]: string } = {
      'google.com': 'Google',
      'github.com': 'GitHub',
      'microsoft.com': 'Microsoft',
      'password': 'email e palavra-passe'
    };
    return providerNames[method] || method;
  }

  private async resolveAccountConflict(
    fbAuth: Auth,
    err: any,
    requestedProvider: 'google' | 'github' | 'microsoft'
  ): Promise<boolean> {
    const email = err?.customData?.email;
    if (!email) {
      this.error = 'Este email já está registado com outro método de login.';
      return false;
    }

    let methods: string[] = [];
    try {
      const authMod = this._fb!.auth;
      methods = await authMod.fetchSignInMethodsForEmail(fbAuth, email);
    } catch {
      this.error = 'Não foi possível verificar os métodos de login desta conta.';
      return false;
    }

    if (!methods.length) {
      this.error = 'Este email já está registado com outro método de login.';
      return false;
    }

    if (methods.includes('password')) {
      this.error = 'Esta conta usa email e palavra-passe. Inicia sessão com esse método.';
      return false;
    }

    const existingProviderMethod = methods[0];
    const existingProvider = this.providerFromSignInMethod(existingProviderMethod);
    if (!existingProvider) {
      this.error = `Esta conta já existe com ${this.providerDisplayName(existingProviderMethod)}.`;
      return false;
    }

    try {
      this.loading = true;
      const authMod2 = this._fb!.auth;
      const existingCred = await authMod2.signInWithPopup(fbAuth, existingProvider);
      const pendingCredential = this.pendingCredentialFromError(err, requestedProvider);

      if (pendingCredential) {
        const providerIds = existingCred.user.providerData.map((p: any) => p.providerId);
        if (!providerIds.includes(pendingCredential.providerId)) {
          await authMod2.linkWithCredential(existingCred.user, pendingCredential).catch(() => {});
        }
      }

      const idToken = await existingCred.user.getIdToken();
      const tokenResult = await existingCred.user.getIdTokenResult();
      const expiresAt = new Date(tokenResult.expirationTime).getTime();

      this.auth.setUser({
        uid: existingCred.user.uid,
        email: existingCred.user.email,
        displayName: existingCred.user.displayName,
        token: idToken,
        expiresAt
      });

      this.api.getMyProfile().subscribe({
        next: () => {
          this.loading = false;
          this.close();
          this.router.navigate(['/dashboard']).then(() => {
            window.scrollTo(0, 0);
          });
        },
        error: () => {
          this.loading = false;
          this.close();
          this.router.navigate(['/dashboard']).then(() => {
            window.scrollTo(0, 0);
          });
        }
      });

      return true;
    } catch {
      this.loading = false;
      this.error = `Esta conta já existe com ${this.providerDisplayName(existingProviderMethod)}. Inicia sessão com esse método.`;
      return false;
    }
  }
}
