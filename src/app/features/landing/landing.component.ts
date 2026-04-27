import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../../core/models/models';
import {
  getProjectCardDescription,
  getProjectCardSkillText,
  getProjectCardTitle
} from '../../core/utils/project-role.utils';
import {
  trigger, transition, style, animate, stagger, query
} from '@angular/animations';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

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
export class LandingComponent implements OnInit, AfterViewInit {
  readonly getProjectCardDescription = getProjectCardDescription;
  readonly getProjectCardSkillText = getProjectCardSkillText;
  readonly getProjectCardTitle = getProjectCardTitle;
  @ViewChild('donationSection') donationSection!: ElementRef;
  
  projects: Project[] = [];
  loadingProjects = true;
  platformStats = { users: 0, projects: 0 };
  
  // Valores animados
  animatedUsers = 0;
  animatedProjects = 0;
  
  private animationStarted = false;
  private animationFrame: any;
  installingAndroid = false;
  private deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

  private readonly onBeforeInstallPrompt = (event: Event): void => {
    event.preventDefault();
    this.deferredInstallPrompt = event as BeforeInstallPromptEvent;
  };

  private readonly onAppInstalled = (): void => {
    this.deferredInstallPrompt = null;
  };

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
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
      window.addEventListener('appinstalled', this.onAppInstalled);
    }

    // Fetch platform statistics
    this.api.getPlatformStats().subscribe({
      next: (stats) => { 
        this.platformStats = stats; 
      },
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

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver(): void {
    const options = {
      root: null,
      threshold: 0.3,
      rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.animationStarted) {
          this.startNumberAnimation();
          this.animationStarted = true;
          observer.disconnect();
        }
      });
    }, options);

    if (this.donationSection) {
      observer.observe(this.donationSection.nativeElement);
    }
  }

  private startNumberAnimation(): void {
    const duration = 2000; // 2 segundos
    const startTime = performance.now();
    const targetUsers = this.platformStats.users || 1250; // fallback se não carregar
    const targetProjects = this.platformStats.projects || 320; // fallback se não carregar

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function para efeito mais natural (ease-out quadrático)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      this.animatedUsers = Math.floor(easeProgress * targetUsers);
      this.animatedProjects = Math.floor(easeProgress * targetProjects);

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        // Garantir que termina nos valores exatos
        this.animatedUsers = targetUsers;
        this.animatedProjects = targetProjects;
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
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

  async installForAndroid(): Promise<void> {
    if (this.installingAndroid) {
      return;
    }

    if (this.isInstalled()) {
      this.snackBar.open('A aplicação já está instalada neste dispositivo.', 'Fechar', { duration: 3500 });
      return;
    }

    this.installingAndroid = true;

    try {
      const installPrompt = this.deferredInstallPrompt || await this.waitForInstallPrompt();

      if (installPrompt) {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        this.deferredInstallPrompt = null;
        return;
      }

      const { AndroidInstallDialogComponent } = await import('./android-install-dialog/android-install-dialog.component');
      this.dialog.open(AndroidInstallDialogComponent, {
        width: '460px',
        maxWidth: '95vw',
        autoFocus: false,
        restoreFocus: false
      });
    } finally {
      this.installingAndroid = false;
    }
  }

  private waitForInstallPrompt(timeoutMs: number = 1500): Promise<BeforeInstallPromptEvent | null> {
    if (this.deferredInstallPrompt) {
      return Promise.resolve(this.deferredInstallPrompt);
    }

    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve(null), timeoutMs);
      const listener = (event: Event) => {
        clearTimeout(timeout);
        window.removeEventListener('beforeinstallprompt', listener);
        event.preventDefault();
        const promptEvent = event as BeforeInstallPromptEvent;
        this.deferredInstallPrompt = promptEvent;
        resolve(promptEvent);
      };

      window.addEventListener('beforeinstallprompt', listener, { once: true });
    });
  }

  async openIosInstallDialog(): Promise<void> {
    if (this.isInstalled()) {
      this.snackBar.open('A aplicação já está instalada neste dispositivo.', 'Fechar', { duration: 3500 });
      return;
    }

    const { IosInstallDialogComponent } = await import('./ios-install-dialog/ios-install-dialog.component');
    this.dialog.open(IosInstallDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      autoFocus: false,
      restoreFocus: false
    });
  }

  private isInstalled(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    return window.matchMedia('(display-mode: standalone)').matches || navigatorStandalone === true;
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', this.onAppInstalled);
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}