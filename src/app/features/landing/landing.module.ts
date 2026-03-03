import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [{ path: '', component: LandingComponent }];

@NgModule({
  declarations: [LandingComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class LandingModule {}
