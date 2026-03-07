import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { SelectivePreloadStrategy } from './core/strategies/selective-preload.strategy';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full'
  },
  {
    path: 'landing',
    data: {
      title: 'SkillBridge — Liga Estudantes a Projetos',
      description: 'Plataforma portuguesa que liga estudantes através da partilha de competências para criar projetos reais e enriquecer portfólios.',
      robots: 'index, follow'
    },
    loadChildren: () =>
      import('./features/landing/landing.module').then(m => m.LandingModule)
  },
  {
    path: 'onboarding',
    redirectTo: 'landing',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    data: {
      preload: true,
      title: 'Dashboard — SkillBridge',
      description: 'Painel pessoal para gerir o teu perfil e descobrir projetos no SkillBridge.',
      robots: 'noindex, nofollow'
    },
    loadChildren: () =>
      import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'projects',
    data: {
      preload: true,
      preloadDelay: 1000,
      title: 'Projetos para Estudantes — SkillBridge',
      description: 'Explora projetos colaborativos para estudantes, encontra equipas e desenvolve competências em contexto real.',
      robots: 'index, follow'
    },
    loadChildren: () =>
      import('./features/projects/projects.module').then(m => m.ProjectsModule)
  },
  {
    path: 'donate',
    data: {
      title: 'Apoiar a SkillBridge',
      description: 'Contribui para o crescimento da comunidade SkillBridge e ajuda mais estudantes a colaborar em projetos reais.',
      robots: 'index, follow'
    },
    loadChildren: () =>
      import('./features/donation/donation.routes').then(m => m.DONATION_ROUTES)
  },
  {
    path: 'perfil',
    data: {
      preload: true,
      preloadDelay: 1500,
      title: 'Perfis de Estudantes — SkillBridge',
      description: 'Descobre perfis de estudantes, competências e histórico de colaboração na plataforma SkillBridge.',
      robots: 'index, follow'
    },
    loadChildren: () =>
      import('./features/profile/profile.module').then(m => m.ProfileModule)
  },
  {
    path: 'messages',
    canActivate: [AuthGuard],
    data: {
      preload: true,
      preloadDelay: 2000,
      title: 'Mensagens — SkillBridge',
      description: 'Conversa com membros da comunidade SkillBridge para coordenar projetos.',
      robots: 'noindex, nofollow'
    },
    loadChildren: () =>
      import('./features/messages/messages.module').then(m => m.MESSAGES_ROUTES)
  },
  {
    path: 'politicas-e-privacidade',
    data: {
      title: 'Política de Privacidade — SkillBridge',
      description: 'Lê a política de privacidade e proteção de dados da plataforma SkillBridge.',
      robots: 'index, follow'
    },
    loadChildren: () =>
      import('./features/legal/privacy-policy/privacy-policy.module').then(m => m.PrivacyPolicyModule)
  },
  {
    path: '**',
    redirectTo: 'landing'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled',
    preloadingStrategy: SelectivePreloadStrategy,
    initialNavigation: 'enabledBlocking'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
