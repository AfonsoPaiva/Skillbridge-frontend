import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RecruiterService } from '../../../core/services/recruiter.service';

@Component({
  selector: 'app-recruiter-landing',
  templateUrl: './recruiter-landing.component.html',
  styleUrls: ['./recruiter-landing.component.scss']
})
export class RecruiterLandingComponent {
  form: FormGroup;
  submitting = false;
  submitted = false;
  errorMessage = '';

  // Login view state
  isLoginView = false;
  loginEmail = this.fb.control('', [Validators.required, Validators.email]);
  loginSubmitting = false;
  loginSubmitted = false;
  loginErrorMessage = '';

  private readonly blockedDomains = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'sapo.pt',
    'mail.com', 'live.com', 'icloud.com', 'protonmail.com', 'aol.com',
    'zoho.com', 'yandex.com', 'gmx.com', 'tutanota.com', 'hotmail.pt',
    'outlook.pt', 'yahoo.pt', 'msn.com', 'me.com', 'proton.me'
  ];

  constructor(private fb: FormBuilder, private recruiterService: RecruiterService) {
    this.form = this.fb.group({
      full_name: ['', [Validators.required]],
      company_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      company_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      vacancy_description: ['', [Validators.maxLength(300)]]
    });
  }

  get isPersonalEmail(): boolean {
    const email = this.form.get('email')?.value || '';
    const domain = email.split('@')[1]?.toLowerCase();
    return this.blockedDomains.includes(domain);
  }

  submit(): void {
    if (this.form.invalid || this.isPersonalEmail) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.recruiterService.apply(this.form.value).subscribe({
      next: () => {
        this.submitted = true;
        this.submitting = false;
      },
      error: (err) => {
        this.submitting = false;
        if (err.status === 409) {
          this.errorMessage = 'Este email já está registado.';
        } else if (err.error?.error) {
          this.errorMessage = err.error.error;
        } else {
          this.errorMessage = 'Erro ao enviar pedido. Tenta novamente.';
        }
      }
    });
  }

  toggleLoginView(): void {
    this.isLoginView = !this.isLoginView;
    this.loginSubmitted = false;
    this.loginErrorMessage = '';
  }

  requestLogin(): void {
    if (this.loginEmail.invalid) {
      this.loginEmail.markAsTouched();
      return;
    }

    this.loginSubmitting = true;
    this.loginErrorMessage = '';

    const emailValue = this.loginEmail.value || '';

    this.recruiterService.requestLoginLink(emailValue).subscribe({
      next: () => {
        this.loginSubmitted = true;
        this.loginSubmitting = false;
      },
      error: () => {
        this.loginSubmitting = false;
        this.loginErrorMessage = 'Erro ao pedir o link. Tenta novamente.';
      }
    });
  }
}
