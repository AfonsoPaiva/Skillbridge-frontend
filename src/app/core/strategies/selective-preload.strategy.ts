import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Selective preloading strategy that preloads routes marked with preload: true
 * after a delay to avoid blocking initial page load
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    if (route.data && route.data['preload']) {
      // Delay preload by 2 seconds to prioritize initial page load
      const delay = route.data['preloadDelay'] || 2000;
      return timer(delay).pipe(mergeMap(() => {
        console.log('Preloading: ' + route.path);
        return load();
      }));
    }
    return of(null);
  }
}
