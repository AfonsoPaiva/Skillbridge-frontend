import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { loadStripe, StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { SharedModule } from '../../../shared/shared.module';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface ContestProject {
  id: number;
  title: string;
  slug: string;
  description: string;
  members?: { id: number; user_id: number; status: string; user?: { name: string } }[];
  roles?: { id: number; title: string; spots: number; filled: number }[];
}

interface ContestRegistration {
  id: number;
  project_id: number;
  track: string;
  payment_status: string;
  project?: ContestProject;
}

@Component({
  selector: 'app-contest-register',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './contest-register.component.html',
  styleUrls: ['./contest-register.component.scss']
})
export class ContestRegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('checkoutContainer', { static: false }) checkoutContainer?: ElementRef<HTMLDivElement>;

  // State
  step: 'form' | 'checkout' | 'success' | 'already-registered' = 'form';
  loading = false;
  loadingProjects = true;
  error = '';

  // Data
  projects: ContestProject[] = [];
  selectedProjectId: number | null = null;
  selectedTrack = '';
  existingRegistration: ContestRegistration | null = null;

  // Stripe
  private embeddedCheckout?: StripeEmbeddedCheckout;

  tracks = [
    { code: 'A', name: 'Produto digital' },
    { code: 'B', name: 'IA & dados' },
    { code: 'C', name: 'Hardware & jogos' },
    { code: 'D', name: 'Design & UX/UI' },
    { code: 'E', name: 'Marketing & comunicação' },
    { code: 'F', name: 'Gestão & negócios' },
    { code: 'G', name: 'Ciências & engenharia' },
    { code: 'H', name: 'Direito & políticas públicas' },
    { code: 'I', name: 'Saúde & medicina' },
    { code: 'J', name: 'Artes & multimédia' },
    { code: 'K', name: 'Arquitetura & urbanismo' },
    { code: 'L', name: 'Impacto social' }
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.checkExistingRegistration();
    this.loadUserProjects();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.embeddedCheckout) {
      this.embeddedCheckout.destroy();
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  checkExistingRegistration(): void {
    this.http.get<{ registration: ContestRegistration }>(
      `${environment.apiUrl}/contest/registrations/me`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (data) => {
        this.existingRegistration = data.registration;
        if (data.registration.payment_status === 'paid') {
          this.step = 'already-registered';
        }
      },
      error: () => {
        // Not registered yet — OK
      }
    });
  }

  loadUserProjects(): void {
    this.loadingProjects = true;
    this.http.get<{ projects: ContestProject[] }>(
      `${environment.apiUrl}/contest/my-projects`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (data) => {
        this.projects = (data.projects || []).filter(p => {
          const count = this.getMemberCount(p);
          return count >= 2 && count <= 5;
        });
        this.loadingProjects = false;
      },
      error: () => {
        this.projects = [];
        this.loadingProjects = false;
      }
    });
  }

  getSelectedProject(): ContestProject | null {
    if (!this.selectedProjectId) return null;
    return this.projects.find(p => p.id === this.selectedProjectId) || null;
  }

  getMemberCount(project: ContestProject): number {
    const accepted = (project.members || []).filter(m => m.status === 'accepted').length;
    return accepted + 1; // +1 for owner
  }

  getPaymentAmount(): number {
    const proj = this.getSelectedProject();
    if (!proj) return 7;
    return this.getMemberCount(proj) * 7;
  }

  getTotalSpots(project: ContestProject): number {
    return (project.roles || []).reduce((sum, r) => sum + r.spots, 0) + 1; // +1 for owner slot
  }

  canSubmit(): boolean {
    return !!this.selectedProjectId && !!this.selectedTrack && !this.loading;
  }

  async submitRegistration(): Promise<void> {
    if (!this.canSubmit()) return;

    this.loading = true;
    this.error = '';

    try {
      const stripe = await loadStripe(environment.stripePublishableKey);
      if (!stripe) {
        this.error = 'Erro ao carregar Stripe.';
        this.loading = false;
        return;
      }

      this.http.post<{ clientSecret: string }>(
        `${environment.apiUrl}/contest/register`,
        {
          project_id: this.selectedProjectId,
          track: this.selectedTrack
        },
        { headers: this.getAuthHeaders() }
      ).subscribe({
        next: async (response) => {
          this.step = 'checkout';
          window.scrollTo({ top: 0, behavior: 'smooth' });

          // Wait for Angular to render the checkout container
          await new Promise(r => setTimeout(r, 100));

          if (!this.checkoutContainer) {
            this.error = 'Container de checkout não encontrado.';
            this.loading = false;
            this.step = 'form';
            return;
          }

          this.embeddedCheckout = await stripe.initEmbeddedCheckout({
            clientSecret: response.clientSecret
          });

          this.embeddedCheckout.mount(this.checkoutContainer.nativeElement);
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.error || 'Erro ao criar checkout.';
          this.loading = false;
        }
      });
    } catch {
      this.error = 'Erro ao inicializar Stripe.';
      this.loading = false;
    }
  }

  goBack(): void {
    this.step = 'form';
    this.error = '';
    if (this.embeddedCheckout) {
      this.embeddedCheckout.destroy();
      this.embeddedCheckout = undefined;
    }
  }

  goToContest(): void {
    this.router.navigate(['/contest']);
  }

  downloadRegulamento(): void {
    const link = document.createElement('a');
    link.href = 'assets/SkillBridge_Regulamento_Oficial.pdf';
    link.download = 'SkillBridge_Regulamento_Oficial.pdf';
    link.click();
  }
}
