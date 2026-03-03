import { NgModule } from '@angular/core';
import { OnboardingComponent } from './onboarding.component';
import { LoginComponent } from './login/login.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [OnboardingComponent, LoginComponent],
  imports: [SharedModule],
  exports: [OnboardingComponent, LoginComponent]
})
export class OnboardingModule {}
