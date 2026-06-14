import { Component, Input } from '@angular/core';

// ── Generic single-line skeleton bar ─────────────────────────────────────────
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

// ── Project card skeleton ─────────────────────────────────────────────────────
// Mirrors .proj-card exactly:
//   ┌──────────────────────────────┐
//   │  [image area 16/10]          │  ← aspect-ratio block
//   ├──────────────────────────────┤
//   │  ████████████████ (title)    │
//   │  ████████████████████ (desc) │
//   │  ████████████████████ (desc) │
//   │  [chip] [chip] [chip]        │
//   └──────────────────────────────┘
@Component({
  selector: 'app-card-skeleton',
  template: `
    <div class="cs">
      <div class="cs__img"></div>
      <div class="cs__body">
        <div class="cs__line cs__line--title"></div>
        <div class="cs__line cs__line--desc"></div>
        <div class="cs__line cs__line--desc cs__line--short"></div>
        <div class="cs__chips">
          <div class="cs__chip"></div>
          <div class="cs__chip cs__chip--md"></div>
          <div class="cs__chip"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../styles/variables' as v;
    @use '../../../../styles/mixins' as m;

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    %pulse {
      background: linear-gradient(
        90deg,
        rgba(v.$color-primary, 0.04) 25%,
        rgba(v.$color-primary, 0.10) 50%,
        rgba(v.$color-primary, 0.04) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite linear;
      border-radius: 6px;
    }

    .cs {
      border-radius: v.$radius-md;
      overflow: hidden;
      border: 1px solid v.$color-border;
      background: v.$color-surface;
      display: flex;
      flex-direction: column;
      height: 100%;

      &__img {
        @extend %pulse;
        width: 100%;
        aspect-ratio: 16 / 10;
        border-radius: 0;
      }

      &__body {
        padding: v.$space-4;
        display: flex;
        flex-direction: column;
        gap: v.$space-3;
        flex: 1;
      }

      &__line {
        @extend %pulse;
        height: 14px;

        &--title {
          height: 18px;
          width: 62%;
        }

        &--desc {
          width: 92%;
        }

        &--short {
          width: 72%;
        }
      }

      &__chips {
        display: flex;
        gap: v.$space-2;
        margin-top: v.$space-1;
      }

      &__chip {
        @extend %pulse;
        height: 24px;
        width: 58px;
        border-radius: 999px !important;

        &--md {
          width: 78px;
        }
      }
    }
  `]
})
export class CardSkeletonComponent {}

// ── Vacancy card skeleton ─────────────────────────────────────────────────────
// Mirrors .vcard exactly:
//   ┌─────────────────────────────────────────┐
//   │  [56px logo] ████████ title              │
//   │              ██████ company              │
//   ├─────────────────────────────────────────┤
//   │  ████████████████████████████████████   │ (desc line 1)
//   │  ████████████████████████████████       │ (desc line 2)
//   │  ██████████████████████████             │ (desc line 3)
//   ├─────────────────────────────────────────┤
//   │  [chip] [chip] [chip]  [badge] [meta]   │
//   └─────────────────────────────────────────┘
@Component({
  selector: 'app-vcard-skeleton',
  template: `
    <div class="vs">
      <div class="vs__body">

        <!-- header: logo + title/company -->
        <div class="vs__header">
          <div class="vs__logo"></div>
          <div class="vs__header-info">
            <div class="vs__line vs__line--title"></div>
            <div class="vs__line vs__line--company"></div>
          </div>
        </div>

        <!-- description lines -->
        <div class="vs__desc">
          <div class="vs__line vs__line--d1"></div>
          <div class="vs__line vs__line--d2"></div>
          <div class="vs__line vs__line--d3"></div>
        </div>

        <!-- footer chips -->
        <div class="vs__footer">
          <div class="vs__chips">
            <div class="vs__chip"></div>
            <div class="vs__chip vs__chip--md"></div>
            <div class="vs__chip"></div>
          </div>
          <div class="vs__chips">
            <div class="vs__chip vs__chip--badge"></div>
            <div class="vs__chip vs__chip--meta"></div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @use '../../../../styles/variables' as v;
    @use '../../../../styles/mixins' as m;

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    %pulse {
      background: linear-gradient(
        90deg,
        rgba(v.$color-primary, 0.04) 25%,
        rgba(v.$color-primary, 0.10) 50%,
        rgba(v.$color-primary, 0.04) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite linear;
      border-radius: 6px;
    }

    .vs {
      border-radius: v.$radius-md;
      overflow: hidden;
      border: 1px solid v.$color-border;
      background: v.$color-surface;
      display: flex;
      flex-direction: column;
      height: 100%;

      &__body {
        padding: v.$space-5;
        display: flex;
        flex-direction: column;
        gap: v.$space-4;
        flex: 1;
      }

      // ── Header: logo + title/company ─────────────────
      &__header {
        display: flex;
        align-items: flex-start;
        gap: v.$space-4;
      }

      &__logo {
        @extend %pulse;
        flex-shrink: 0;
        width: 56px;
        height: 56px;
        border-radius: v.$radius-md !important;
      }

      &__header-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: v.$space-2;
        padding-top: 4px;
      }

      // ── Generic line ─────────────────────────────────
      &__line {
        @extend %pulse;
        height: 14px;

        &--title   { height: 17px; width: 72%; }
        &--company { height: 13px; width: 48%; }

        &--d1 { width: 100%; }
        &--d2 { width: 88%; }
        &--d3 { width: 68%; }
      }

      // ── Description area ─────────────────────────────
      &__desc {
        display: flex;
        flex-direction: column;
        gap: v.$space-2;
        flex: 1;
      }

      // ── Footer ───────────────────────────────────────
      &__footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: v.$space-3;
        padding-top: v.$space-4;
        border-top: 1px solid rgba(v.$color-border, 0.5);
      }

      &__chips {
        display: flex;
        align-items: center;
        gap: v.$space-2;
      }

      &__chip {
        @extend %pulse;
        height: 24px;
        width: 58px;
        border-radius: 999px !important;

        &--md     { width: 76px; }
        &--badge  { width: 88px; }
        &--meta   { width: 70px; border-radius: 999px !important; }
      }
    }
  `]
})
export class VcardSkeletonComponent {}
