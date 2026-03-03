import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { ApiService } from './core/services/api.service';
import {
  trigger, transition, style, animate, query, group
} from '@angular/animations';

export const routeAnimation = trigger('routeAnimation', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(16px)' })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('180ms ease-out', style({ opacity: 0, transform: 'translateY(-8px)' }))
      ], { optional: true }),
      query(':enter', [
        animate('260ms 100ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ], { optional: true })
    ])
  ])
]);

@Component({
  selector: 'app-root',
  template: `
    <app-navbar></app-navbar>
    <main [@routeAnimation]="getRouteState(outlet)">
      <router-outlet #outlet="outlet"></router-outlet>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    main {
      flex: 1 1 auto;
      /* let the content area grow and shrink; footer will sit below */
    }
  `],
  animations: [routeAnimation]
})
export class AppComponent implements OnInit {
  constructor(private auth: AuthService, private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    this.auth.restoreSession();
    this.auth.prefetchUserProfile(this.api);
  }

  getRouteState(outlet: RouterOutlet): string {
    if (!outlet.isActivated) return '';
    return outlet.activatedRouteData?.['animation'] || outlet.activatedRoute?.snapshot?.url?.[0]?.path || '';
  }
}
