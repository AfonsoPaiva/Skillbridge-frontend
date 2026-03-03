import { Routes } from '@angular/router';

export const DONATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./donation-checkout.component').then(m => m.DonationCheckoutComponent)
  }
];
