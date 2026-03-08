import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

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

  private async getFirebaseApp() {
    const { getApps, initializeApp } = await import('firebase/app');
    if (getApps().length > 0) return getApps()[0];
    return initializeApp({
      apiKey: environment.firebaseApiKey,
      authDomain: environment.firebaseAuthDomain
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading) return;

    const email = this.form.value.email.trim();
    this.loading = true;

    try {
      const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
      const auth = getAuth(await this.getFirebaseApp());
      await sendPasswordResetEmail(auth, email);
      
      this.loading = false;
      this.close();
      this.snackBar.open(
        `Email enviado para ${email}. Verifica a tua caixa de entrada e spam.`,
        'OK',
        { duration: 6000, panelClass: ['success-snackbar'] }
      );
    } catch (err: any) {
      this.loading = false;
      const code = err?.code || '';
      
      if (code === 'auth/user-not-found') {
        // Don't reveal if user exists for security
        this.close();
        this.snackBar.open(
          `Se o email existir, receberás um link de redefinição.`,
          'OK',
          { duration: 6000 }
        );
      } else if (code === 'auth/invalid-email') {
        this.snackBar.open('Email inválido', 'Fechar', { 
          duration: 4000, 
          panelClass: ['error-snackbar'] 
        });
      } else if (code === 'auth/too-many-requests') {
        this.snackBar.open('Demasiadas tentativas. Aguarda uns minutos.', 'Fechar', { 
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
  }
}
