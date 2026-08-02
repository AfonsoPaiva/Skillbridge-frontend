import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { ExpandDialogComponent } from './expand-dialog/expand-dialog.component';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [{ path: '', component: DashboardComponent }];

@NgModule({
  declarations: [DashboardComponent, ExpandDialogComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class DashboardModule {}
