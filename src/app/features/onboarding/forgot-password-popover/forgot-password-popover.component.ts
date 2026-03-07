import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-forgot-password-popover',
  templateUrl: './forgot-password-popover.component.html',
  styleUrls: ['./forgot-password-popover.component.scss']
})
export class ForgotPasswordPopoverComponent {
  form: FormGroup;
  loading = false;
  isOpen = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.form.reset();
      this.loading = false;
    }
  }

  close(): void {
    this.isOpen = false;
    this.form.reset();
    this.loading = false;
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;

    const email = this.form.value.email.trim();
    this.loading = true;

    this.api.requestPasswordReset(email).subscribe({
      next: () => {
        this.loading = false;
        this.close();
        this.snackBar.open(
          `Email enviado para ${email}. Verifica a tua caixa de entrada e spam.`,
          'OK',
          { duration: 6000, panelClass: ['success-snackbar'] }
        );
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 404) {
          this.snackBar.open('Email não encontrado', 'Fechar', { 
            duration: 4000, 
            panelClass: ['error-snackbar'] 
          });
        } else {
          this.snackBar.open('Erro ao enviar email. Tenta novamente.', 'Fechar', { 
            duration: 4000, 
            panelClass: ['error-snackbar'] 
          });
        }
      }
    });
  }
}
