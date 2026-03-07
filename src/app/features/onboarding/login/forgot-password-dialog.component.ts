import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-forgot-password-dialog',
  template: `
    <div class="forgot-password-dialog">
      <h2 mat-dialog-title>
        <mat-icon>lock_reset</mat-icon>
        Recuperar palavra-passe
      </h2>
      
      <mat-dialog-content>
        <p class="description" *ngIf="!success && !error">
          Insere o teu email e enviaremos um link para redefinir a tua palavra-passe.
        </p>

        <form [formGroup]="form" *ngIf="!success" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput 
                   type="email" 
                   formControlName="email"
                   placeholder="exemplo@email.com"
                   [disabled]="loading"
                   autocomplete="email">
            <mat-icon matPrefix>email</mat-icon>
            <mat-error *ngIf="form.get('email')?.hasError('required')">
              Email obrigatório
            </mat-error>
            <mat-error *ngIf="form.get('email')?.hasError('email')">
              Email inválido
            </mat-error>
          </mat-form-field>
        </form>

        <div class="success-message" *ngIf="success">
          <mat-icon color="primary">check_circle</mat-icon>
          <h3>Email enviado!</h3>
          <p>Enviámos um link de recuperação para <strong>{{ emailSent }}</strong>.</p>
          <p class="hint">Verifica a tua caixa de entrada e spam.</p>
        </div>

        <div class="error-message" *ngIf="error">
          <mat-icon color="warn">error</mat-icon>
          <p>{{ error }}</p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button 
                (click)="close()" 
                [disabled]="loading"
                *ngIf="!success">
          Cancelar
        </button>
        <button mat-raised-button 
                color="primary"
                (click)="submit()"
                [disabled]="loading || form.invalid"
                *ngIf="!success">
          <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
          <span *ngIf="!loading">Enviar</span>
        </button>
        <button mat-raised-button 
                color="primary"
                (click)="close()"
                *ngIf="success">
          Fechar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .forgot-password-dialog {
      min-width: 400px;
      max-width: 500px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      color: #68007A;
      
      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    mat-dialog-content {
      padding: 20px 24px;
      min-height: 150px;
    }

    .description {
      margin: 0 0 24px;
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }

    .full-width {
      width: 100%;
    }

    .success-message,
    .error-message {
      text-align: center;
      padding: 20px;
      
      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
      }
      
      h3 {
        margin: 0 0 12px;
        color: #68007A;
        font-size: 20px;
      }
      
      p {
        margin: 8px 0;
        color: #666;
        font-size: 14px;
        line-height: 1.6;
        
        strong {
          color: #333;
        }
      }
      
      .hint {
        font-size: 13px;
        color: #999;
      }
    }

    .error-message {
      mat-icon {
        color: #d32f2f;
      }
      
      p {
        color: #d32f2f;
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;
      
      button {
        mat-spinner {
          display: inline-block;
          margin-right: 8px;
        }
      }
    }

    @media (max-width: 600px) {
      .forgot-password-dialog {
        min-width: unset;
        width: 100%;
      }
    }
  `]
})
export class ForgotPasswordDialogComponent {
  form: FormGroup;
  loading = false;
  success = false;
  error = '';
  emailSent = '';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private dialogRef: MatDialogRef<ForgotPasswordDialogComponent>
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    const email = this.form.get('email')!.value.trim();
    this.loading = true;
    this.error = '';

    this.api.requestPasswordReset(email).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.emailSent = email;
      },
      error: (err) => {
        this.loading = false;
        console.error('Password reset error:', err);
        
        if (err.status === 404) {
          this.error = 'Email não encontrado. Não existe nenhuma conta registada com esse email.';
        } else {
          this.error = 'Erro ao enviar email. Tenta novamente mais tarde.';
        }
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
