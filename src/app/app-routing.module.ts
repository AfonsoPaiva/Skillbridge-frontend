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
    data: { preload: true },
    loadChildren: () =>
      import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'projects',
    data: { preload: true, preloadDelay: 1000 },
    loadChildren: () =>
      import('./features/projects/projects.module').then(m => m.ProjectsModule)
  },
  {
    path: 'donate',
    loadChildren: () =>
      import('./features/donation/donation.routes').then(m => m.DONATION_ROUTES)
  },
  {
    path: 'perfil',
    data: { preload: true, preloadDelay: 1500 },
    loadChildren: () =>
      import('./features/profile/profile.module').then(m => m.ProfileModule)
  },
  {
    path: 'messages',
    canActivate: [AuthGuard],
    data: { preload: true, preloadDelay: 2000 },
    loadChildren: () =>
      import('./features/messages/messages.module').then(m => m.MESSAGES_ROUTES)
  },
  {
    path: 'politicas-e-privacidade',
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
