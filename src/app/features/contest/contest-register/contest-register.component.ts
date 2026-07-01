import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
  owner_id: number;
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

interface TimelineItem {
  phase: string;
  desc: string;
  startDate: Date;
  endDate: Date;
  dateLabel: string;
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

  timeline: TimelineItem[] = [
    {
      phase: 'Inscrições',
      desc: 'Inscrição e pagamento da taxa. Validação técnica e confirmação final.',
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 6, 24),
      dateLabel: '1 – 24 julho'
    },
    {
      phase: 'Avaliação',
      desc: 'Avaliação de elegibilidade. O desenvolvimento só arranca após a aprovação do projeto.',
      startDate: new Date(2026, 6, 25),
      endDate: new Date(2026, 6, 25),
      dateLabel: '25 julho'
    },
    {
      phase: 'Desenvolvimento',
      desc: 'Construção do projeto. Check-in de progresso a 15 de agosto.',
      startDate: new Date(2026, 6, 26),
      endDate: new Date(2026, 8, 6),
      dateLabel: '26 julho – 6 setembro'
    },
    {
      phase: 'Submissão',
      desc: 'Entrega na plataforma (repo, vídeo ou deck). Não são aceites submissões fora do prazo.',
      startDate: new Date(2026, 8, 6),
      endDate: new Date(2026, 8, 9),
      dateLabel: '6 – 9 setembro'
    },
    {
      phase: 'Resultados',
      desc: 'Avaliação do júri. Livestream no YouTube, notificação e transferência do prémio.',
      startDate: new Date(2026, 8, 14),
      endDate: new Date(2026, 8, 14),
      dateLabel: '14 setembro'
    }
  ];

  getPhaseStatus(index: number): 'past' | 'active' | 'future' {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const item = this.timeline[index];

    if (today > item.endDate) return 'past';
    if (today >= item.startDate && today <= item.endDate) return 'active';
    return 'future';
  }

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  get isProjectOwner(): boolean {
    const currentUserId = this.auth.cachedProfile?.id;
    const projectOwnerId = this.existingRegistration?.project?.owner_id;
    return !!currentUserId && !!projectOwnerId && currentUserId === projectOwnerId;
  }

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
        } else if (data.registration.payment_status === 'pending') {
          if (this.route.snapshot.queryParamMap.get('payment') === 'complete') {
            this.loading = true;
            this.step = 'checkout'; // keep them out of form while polling
            setTimeout(() => this.pollPaymentStatus(), 2000);
          }
        }
      },
      error: () => {
        // Not registered yet — OK
      }
    });
  }

  pollPaymentStatus(): void {
    this.http.get<{ registration: ContestRegistration }>(
      `${environment.apiUrl}/contest/registrations/me`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (data) => {
        if (data.registration.payment_status === 'paid') {
          this.existingRegistration = data.registration;
          this.step = 'already-registered';
          this.loading = false;
        } else {
          // keep polling every 2 seconds until it finishes or user leaves
          setTimeout(() => this.pollPaymentStatus(), 2000);
        }
      },
      error: () => {
        this.step = 'form';
        this.loading = false;
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

  goToProject(slug?: string): void {
    if (slug) this.router.navigate(['/projects', slug]);
  }

  editProject(slug?: string): void {
    if (slug) this.router.navigate(['/projects', slug, 'editar']);
  }

  downloadRegulamento(): void {
    const link = document.createElement('a');
    link.href = 'assets/SkillBridge_Regulamento_Oficial.pdf';
    link.download = 'SkillBridge_Regulamento_Oficial.pdf';
    link.click();
  }
}
