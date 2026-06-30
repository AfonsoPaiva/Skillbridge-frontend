import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const CONTEST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./contest-info/contest-info.component').then(m => m.ContestInfoComponent)
  },
  {
    path: 'inscrever',
    canActivate: [AuthGuard],
    loadComponent: () => import('./contest-register/contest-register.component').then(m => m.ContestRegisterComponent)
  }
];
