import { NgModule } from '@angular/core';
import { OnboardingComponent } from './onboarding.component';
import { LoginComponent } from './login/login.component';
import { ForgotPasswordPopoverComponent } from './forgot-password-popover/forgot-password-popover.component';
import { EmailVerificationDialogComponent } from './email-verification-dialog/email-verification-dialog.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    OnboardingComponent, 
    LoginComponent, 
    ForgotPasswordPopoverComponent,
    EmailVerificationDialogComponent
  ],
  imports: [SharedModule],
  exports: [OnboardingComponent, LoginComponent]
})
export class OnboardingModule {}
