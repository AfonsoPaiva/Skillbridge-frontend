import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

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
    loadChildren: () =>
      import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'projects',
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
    loadChildren: () =>
      import('./features/profile/profile.module').then(m => m.ProfileModule)
  },
  {
    path: 'messages',
    canActivate: [AuthGuard],
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
    anchorScrolling: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
