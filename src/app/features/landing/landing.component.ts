import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../../core/models/models';
import {
  trigger, transition, style, animate, stagger, query
} from '@angular/animations';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(32px)' }),
        animate('600ms cubic-bezier(0.22,1,0.36,1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerCards', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(24px)' }),
          stagger(80, [
            animate('500ms cubic-bezier(0.22,1,0.36,1)',
              style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class LandingComponent implements OnInit {
  projects: Project[] = [];
  loadingProjects = true;
  platformStats = { users: 0, projects: 0 };

  steps = [
    {
      icon: 'psychology',
      title: 'Oferece o que sabes',
      desc: 'Lista as tuas competências: programação, design, tradução, marketing, etc.'
    },
    {
      icon: 'search',
      title: 'Encontra o que precisas',
      desc: 'Descreve o teu projeto e as competências que precisas para o concluir.'
    },
    {
      icon: 'handshake',
      title: 'Faz match e colabora',
      desc: 'A plataforma sugere parceiros compatíveis. Juntos criam algo real e valioso.'
    }
  ];

  benefits = [
    { icon: 'school', title: 'Aprende na prática', desc: 'Projetos reais são a melhor forma de aprender e mostrar o que sabes.' },
    { icon: 'work', title: 'Constrói portfólio', desc: 'Cada projeto concluído é uma prova de competência para empregadores.' },
    { icon: 'people', title: 'Rede de contactos', desc: 'Conhece estudantes de diferentes áreas em Portugal.' },
    { icon: 'verified', title: 'Reputação verificada', desc: 'Badges e recomendações dão credibilidade ao teu perfil.' }
  ];

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Fetch platform statistics
    this.api.getPlatformStats().subscribe({
      next: (stats) => { this.platformStats = stats; },
      error: () => { /* stats optional, fail silently */ }
    });

    // only show open projects on the landing page
    this.api.listProjects('open').subscribe({
      next: (p: Project[]) => {
        this.projects = p.slice(0, 6);
        this.loadingProjects = false;
      },
      error: () => { this.loadingProjects = false; }
    });
  }

  private blurActiveElement(): void {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  async openOnboarding(): Promise<void> {
    if (this.auth.isLoggedIn) {
      this.router.navigate(['/dashboard']);
    } else {
      this.blurActiveElement();
      const { OnboardingComponent } = await import('../onboarding/onboarding.component');
      this.dialog.open(OnboardingComponent, {
        width: '540px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'onboarding-dialog',
        autoFocus: false,
        restoreFocus: false
      });
    }
  }

  async openDonationDialog(): Promise<void> {
    this.blurActiveElement();
    const { DonationCheckoutComponent } = await import('../donation/donation-checkout.component');
    this.dialog.open(DonationCheckoutComponent, {
      width: '650px',
      maxWidth: '95vw',
      height: 'auto',
      maxHeight: '90vh',
      panelClass: 'donation-dialog',
      autoFocus: false,
      restoreFocus: false
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em progresso',
      completed: 'Concluído',
      full: 'Vagas cheias'
    };
    return map[status] ?? status;
  }
}
