import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { SharedModule } from '../../../shared/shared.module';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

interface TrackStat {
  track: string;
  count: number;
}

interface TimelineItem {
  phase: string;
  desc: string;
  startDate: Date;
  endDate: Date;
  dateLabel: string;
}

@Component({
  selector: 'app-contest-info',
  standalone: true,
  imports: [SharedModule, CommonModule],
  templateUrl: './contest-info.component.html',
  styleUrls: ['./contest-info.component.scss']
})
export class ContestInfoComponent implements OnInit {
  totalPaid = 0;
  trackStats: TrackStat[] = [];

  tracks = [
    { code: 'A', name: 'Produto digital', icon: 'devices', desc: 'Web apps, mobile, dashboards, ferramentas SaaS, plataformas' },
    { code: 'B', name: 'IA & dados', icon: 'psychology', desc: 'Machine learning, automação, NLP, visão computacional, análise de dados' },
    { code: 'C', name: 'Hardware & jogos', icon: 'sports_esports', desc: 'IoT, robótica, videojogos, shaders, sistemas embebidos' },
    { code: 'D', name: 'Design & UX/UI', icon: 'palette', desc: 'Sistemas de design, protótipos interativos, design de serviço' },
    { code: 'E', name: 'Marketing & comunicação', icon: 'campaign', desc: 'Campanhas, branding, estratégia digital, growth hacking' },
    { code: 'F', name: 'Gestão & negócios', icon: 'business_center', desc: 'Planos de negócio, modelos financeiros, estratégia empresarial' },
    { code: 'G', name: 'Ciências & engenharia', icon: 'science', desc: 'Investigação aplicada, prototipagem científica, engenharia' },
    { code: 'H', name: 'Direito & políticas públicas', icon: 'gavel', desc: 'Análise legislativa, advocacy, tech law, compliance' },
    { code: 'I', name: 'Saúde & medicina', icon: 'health_and_safety', desc: 'Healthtech, bem-estar, saúde mental, dispositivos médicos' },
    { code: 'J', name: 'Artes & multimédia', icon: 'movie', desc: 'Arte digital, vídeo, música, motion graphics, instalações' },
    { code: 'K', name: 'Arquitetura & urbanismo', icon: 'location_city', desc: 'Design de espaços, cidades inteligentes, habitação' },
    { code: 'L', name: 'Impacto social', icon: 'volunteer_activism', desc: 'Resolver problemas reais de comunidades, ODS, inclusão' }
  ];

  timeline: TimelineItem[] = [
    {
      phase: 'Inscrições',
      desc: 'Inscrição e pagamento da taxa. Validação técnica e confirmação final do prémio. Não são aceites inscrições após o prazo.',
      startDate: new Date(2026, 6, 1),   // 1 julho
      endDate: new Date(2026, 6, 24),    // 24 julho
      dateLabel: '1 – 24 julho'
    },
    {
      phase: 'Avaliação',
      desc: 'Avaliação de elegibilidade. O desenvolvimento só arranca após a aprovação do projeto.',
      startDate: new Date(2026, 6, 25),  // 25 julho
      endDate: new Date(2026, 6, 25),    // 25 julho
      dateLabel: '25 julho'
    },
    {
      phase: 'Desenvolvimento',
      desc: 'Construção do projeto. Check-in de progresso a 15 de agosto (obrigatório, sob pena de desqualificação).',
      startDate: new Date(2026, 6, 26),  // 26 julho
      endDate: new Date(2026, 8, 6),     // 6 setembro
      dateLabel: '26 julho – 6 setembro'
    },
    {
      phase: 'Submissão',
      desc: 'Entrega na plataforma (repo, vídeo ou deck). Não são aceites submissões fora do prazo.',
      startDate: new Date(2026, 8, 6),   // 6 setembro
      endDate: new Date(2026, 8, 9),     // 9 setembro
      dateLabel: '6 – 9 setembro'
    },
    {
      phase: 'Resultados',
      desc: 'Avaliação do júri. Livestream no YouTube, notificação e transferência do prémio (máx. 5 dias).',
      startDate: new Date(2026, 8, 14),  // 14 setembro
      endDate: new Date(2026, 8, 14),    // 14 setembro
      dateLabel: '14 setembro'
    }
  ];

  activePhaseIndex = -1;
  registrationOpen = true;
  private timerInterval: any;
  private readonly registrationDeadline = new Date(2026, 6, 24, 23, 59, 59); // 24 julho 2026 fim do dia

  criteria = [
    { name: 'Impacto e relevância', weight: '30%', desc: 'O projeto resolve um problema real? Tem utilidade demonstrada?' },
    { name: 'Execução técnica', weight: '25%', desc: 'Qualidade, funcionamento e robustez do que foi desenvolvido' },
    { name: 'Inovação e criatividade', weight: '20%', desc: 'Originalidade da abordagem e diferenciação face a soluções existentes' },
    { name: 'UX e apresentação', weight: '15%', desc: 'Qualidade da demonstração, clareza da comunicação e usabilidade' },
    { name: 'Colaboração multidisciplinar', weight: '10%', desc: 'Evidência de contribuições reais de diferentes áreas (peer review + histórico de commits)' }
  ];

  constructor(
    public auth: AuthService,
    private router: Router,
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.updateActivePhase();
    this.checkRegistrationStatus();
    // Re-check every hour in case the day changes while the page is open
    this.timerInterval = setInterval(() => {
      this.updateActivePhase();
      this.checkRegistrationStatus();
    }, 3600000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  updateActivePhase(): void {
    const now = new Date();
    // Reset time to start of day for date-only comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.activePhaseIndex = -1;

    for (let i = 0; i < this.timeline.length; i++) {
      const item = this.timeline[i];
      if (today >= item.startDate && today <= item.endDate) {
        this.activePhaseIndex = i;
        break;
      }
    }
  }

  checkRegistrationStatus(): void {
    this.registrationOpen = new Date() <= this.registrationDeadline;
  }

  getPhaseStatus(index: number): 'past' | 'active' | 'future' {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const item = this.timeline[index];

    if (today > item.endDate) return 'past';
    if (today >= item.startDate && today <= item.endDate) return 'active';
    return 'future';
  }

  loadStats(): void {
    this.http.get<{ tracks: TrackStat[]; total_paid: number }>(
      `${environment.apiUrl}/contest/stats`
    ).subscribe({
      next: (data) => {
        this.totalPaid = data.total_paid;
        this.trackStats = data.tracks || [];
      },
      error: () => {}
    });
  }

  getTrackRegistrations(code: string): number {
    const stat = this.trackStats.find(s => s.track === code);
    return stat ? stat.count : 0;
  }

  async goToRegister(): Promise<void> {
    if (this.auth.isLoggedIn) {
      this.router.navigate(['/contest', 'inscrever']);
    } else {
      const { OnboardingComponent } = await import('../../../features/onboarding/onboarding.component');
      this.dialog.open(OnboardingComponent, {
        width: '540px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: ['onboarding-dialog', 'slide-in-dialog'],
        autoFocus: false,
        restoreFocus: false
      });
    }
  }

  downloadRegulamento(): void {
    const link = document.createElement('a');
    link.href = 'assets/SkillBridge_Regulamento_Oficial.pdf';
    link.download = 'SkillBridge_Regulamento_Oficial.pdf';
    link.click();
  }
}
