import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `
    <div class="skeleton-wrap" [ngStyle]="{ width: width, height: height, borderRadius: radius }"></div>
  `,
  styles: [`
    @use '../../../../styles/mixins' as m;
    .skeleton-wrap {
      display: block;
      @include m.skeleton;
    }
  `]
})
export class SkeletonComponent {
  @Input() width  = '100%';
  @Input() height = '16px';
  @Input() radius = '6px';
}

@Component({
  selector: 'app-card-skeleton',
  template: `
    <div class="card-skeleton">
      <app-skeleton height="180px" radius="12px 12px 0 0"></app-skeleton>
      <div class="card-skeleton__body">
        <app-skeleton width="60%" height="20px"></app-skeleton>
        <app-skeleton width="90%" height="14px"></app-skeleton>
        <app-skeleton width="75%" height="14px"></app-skeleton>
        <div class="card-skeleton__chips">
          <app-skeleton width="60px" height="24px" radius="999px"></app-skeleton>
          <app-skeleton width="80px" height="24px" radius="999px"></app-skeleton>
          <app-skeleton width="50px" height="24px" radius="999px"></app-skeleton>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../styles/variables' as v;
    @use '../../../../styles/mixins' as m;
    .card-skeleton {
      border-radius: v.$radius-md;
      overflow: hidden;
      border: 1px solid v.$color-border;
      .card-skeleton__body {
        padding: v.$space-4;
        display: flex;
        flex-direction: column;
        gap: v.$space-3;
      }
      .card-skeleton__chips {
        display: flex;
        gap: v.$space-2;
      }
    }
  `]
})
export class CardSkeletonComponent {}
