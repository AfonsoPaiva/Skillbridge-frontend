import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { getFirebaseAuthDomain } from '../../../core/utils/firebase-auth-domain.utils';

@Component({
  selector: 'app-recruiter-auth',
  templateUrl: './recruiter-auth.component.html',
  styleUrls: ['./recruiter-auth.component.scss']
})
export class RecruiterAuthComponent implements OnInit {
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.handleEmailSignIn();
  }

  private async handleEmailSignIn(): Promise<void> {
    try {
      const [{ initializeApp, getApps }, { getAuth, isSignInWithEmailLink, signInWithEmailLink }] =
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

      const fbAuth = getAuth(app);
      const currentUrl = window.location.href;

      // Check if this is a valid email sign-in link
      if (!isSignInWithEmailLink(fbAuth, currentUrl)) {
        this.error = 'Link de autenticação inválido.';
        this.loading = false;
        return;
      }

      // Get email from URL params or prompt
      let email = this.route.snapshot.queryParamMap.get('email');
      if (!email) {
        email = window.localStorage.getItem('recruiterEmailForSignIn');
      }
      if (!email) {
        email = window.prompt('Por favor insira o seu email profissional para completar a autenticação:');
      }

      if (!email) {
        this.error = 'Email necessário para completar a autenticação.';
        this.loading = false;
        return;
      }

      // Complete sign-in
      const result = await signInWithEmailLink(fbAuth, email, currentUrl);

      if (!result.user) {
        this.error = 'Erro na autenticação.';
        this.loading = false;
        return;
      }

      // Get token with custom claims
      const idToken = await result.user.getIdToken(true);
      const tokenResult = await result.user.getIdTokenResult(true);
      const expiresAt = new Date(tokenResult.expirationTime).getTime();

      // Store auth session
      this.auth.setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        token: idToken,
        expiresAt,
        recruiterId: tokenResult.claims['recruiter_id'] as string | undefined,
        role: tokenResult.claims['role'] as string | undefined,
      });

      // Clean up
      window.localStorage.removeItem('recruiterEmailForSignIn');

      // Check for renewal redirect
      const renewVacancyId = this.route.snapshot.queryParamMap.get('renew');
      if (renewVacancyId) {
        this.router.navigate(['/recruiter/dashboard'], {
          queryParams: { renew: renewVacancyId }
        });
      } else {
        this.router.navigate(['/recruiter/dashboard']);
      }

    } catch (err: any) {
      console.error('Recruiter auth error:', err);
      if (err?.code === 'auth/invalid-action-code') {
        this.error = 'Este link já foi utilizado ou expirou. Solicite um novo acesso.';
      } else if (err?.code === 'auth/expired-action-code') {
        this.error = 'Link expirado. Solicite um novo acesso.';
      } else {
        this.error = 'Erro na autenticação. Tente novamente.';
      }
      this.loading = false;
    }
  }
}
