import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
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
  expired = false;
  requestingNewLink = false;
  newLinkSent = false;
  recruiterEmail = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private recruiterService: RecruiterService
  ) {}

  ngOnInit(): void {
    this.handleTokenAuth();
  }

  private async handleTokenAuth(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.error = 'Link de autenticação inválido.';
      this.loading = false;
      return;
    }

    try {
      // 1. Verify the token with the backend
      const response = await this.recruiterService.verifyToken(token).toPromise();

      if (!response || !response.custom_token) {
        this.error = 'Erro na autenticação. Tente novamente.';
        this.loading = false;
        return;
      }

      this.recruiterEmail = response.recruiter?.email || '';

      // 2. Sign in to Firebase with the custom token
      const [{ initializeApp, getApps }, { getAuth, signInWithCustomToken }] =
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
      const result = await signInWithCustomToken(fbAuth, response.custom_token);

      if (!result.user) {
        this.error = 'Erro na autenticação.';
        this.loading = false;
        return;
      }

      // 3. Get token with custom claims
      const idToken = await result.user.getIdToken(true);
      const tokenResult = await result.user.getIdTokenResult(true);
      const expiresAt = new Date(tokenResult.expirationTime).getTime();

      // 4. Store auth session
      this.auth.setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        token: idToken,
        expiresAt,
        recruiterId: tokenResult.claims['recruiter_id'] as string | undefined,
        role: tokenResult.claims['role'] as string | undefined,
      });

      // 5. Navigate to dashboard
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

      if (err?.code === 'auth/quota-exceeded' || err?.message?.includes('quota-exceeded')) {
        this.error = 'O limite de tentativas de acesso foi excedido por segurança. Por favor, aguarde alguns minutos antes de tentar novamente.';
      } else if (err?.error?.expired) {
        this.expired = true;
        this.error = 'Este link expirou. Solicite um novo link de acesso.';
      } else if (err?.status === 401) {
        this.error = 'Link inválido ou expirado. Solicite um novo acesso.';
      } else if (err?.status === 403) {
        this.error = 'A sua conta não está aprovada.';
      } else {
        this.error = 'Erro na autenticação. Tente novamente.';
      }
      this.loading = false;
    }
  }

  requestNewLink(): void {
    if (!this.recruiterEmail) {
      // Redirect to the recruiter landing page where they can request a link
      this.router.navigate(['/recrutadores']);
      return;
    }

    this.requestingNewLink = true;
    this.recruiterService.requestLoginLink(this.recruiterEmail).subscribe({
      next: () => {
        this.newLinkSent = true;
        this.requestingNewLink = false;
      },
      error: () => {
        this.requestingNewLink = false;
        this.router.navigate(['/recrutadores']);
      }
    });
  }
}
