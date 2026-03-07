import { NgModule } from '@angular/core';
import { OnboardingComponent } from './onboarding.component';
import { LoginComponent } from './login/login.component';
import { ForgotPasswordDialogComponent } from './login/forgot-password-dialog.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [OnboardingComponent, LoginComponent, ForgotPasswordDialogComponent],
  imports: [SharedModule],
  exports: [OnboardingComponent, LoginComponent]
})
export class OnboardingModule {}
