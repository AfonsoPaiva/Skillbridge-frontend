import { NgModule } from '@angular/core';
import { OnboardingComponent } from './onboarding.component';
import { LoginComponent } from './login/login.component';
import { ForgotPasswordPopoverComponent } from './forgot-password-popover/forgot-password-popover.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [OnboardingComponent, LoginComponent, ForgotPasswordPopoverComponent],
  imports: [SharedModule],
  exports: [OnboardingComponent, LoginComponent]
})
export class OnboardingModule {}
