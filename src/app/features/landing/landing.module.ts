import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { IosInstallDialogComponent } from './ios-install-dialog/ios-install-dialog.component';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [{ path: '', component: LandingComponent }];

@NgModule({
  declarations: [LandingComponent, IosInstallDialogComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class LandingModule {}
