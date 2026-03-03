import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ProjectsListComponent } from './projects-list/projects-list.component';
import { ProjectDetailComponent } from './project-detail/project-detail.component';
import { ProjectFormComponent } from './project-form/project-form.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ProjectsResolver } from './projects.resolver';

const routes: Routes = [
  { 
    path: '', 
    component: ProjectsListComponent,
    resolve: { projects: ProjectsResolver }
  },
  { path: 'novo', component: ProjectFormComponent, canActivate: [AuthGuard] },
  { path: ':slug/editar', component: ProjectFormComponent, canActivate: [AuthGuard] },
  { path: ':slug', component: ProjectDetailComponent }
];

@NgModule({
  declarations: [ProjectsListComponent, ProjectDetailComponent, ProjectFormComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ProjectsModule {}
