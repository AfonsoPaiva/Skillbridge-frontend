import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { Project } from '../../core/models/models';

@Injectable({
  providedIn: 'root'
})
export class ProjectsResolver implements Resolve<Project[]> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Project[]> {
    const status = route.queryParams['status'] || 'all';
    return this.api.listProjects(status).pipe(
      catchError(() => of([]))
    );
  }
}
