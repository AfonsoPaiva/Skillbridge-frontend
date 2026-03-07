import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { interval, Subscription } from 'rxjs';
import { getAuth } from 'firebase/auth';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-email-verification-dialog',
  templateUrl: './email-verification-dialog.component.html',
  styleUrls: ['./email-verification-dialog.component.scss']
})
export class EmailVerificationDialogComponent implements OnInit, OnDestroy {
  timeRemaining = 15 * 60; // 15 minutes in seconds
  formattedTime = '15:00';
  checking = false;
  error = '';
  
  private timerSubscription?: Subscription;
  private checkSubscription?: Subscription;
  private readonly STORAGE_KEY = 'sb_email_verification_pending';
  private readonly TIMER_KEY = 'sb_email_verification_timer';

  constructor(
    public dialogRef: MatDialogRef<EmailVerificationDialogComponent>,
    private api: ApiService,
    private auth: AuthService
  ) {
    // Prevent closing the dialog
    this.dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    // Check if there's a saved timer
    this.restoreTimer();
    
    // Mark as pending in localStorage
    localStorage.setItem(this.STORAGE_KEY, 'true');
    
    // Start countdown timer
    this.startTimer();
    
    // Auto-check every 30 seconds
    this.checkSubscription = interval(30000).subscribe(() => {
      this.checkVerification(false);
    });
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.checkSubscription) {
      this.checkSubscription.unsubscribe();
    }
  }

  private restoreTimer(): void {
    const savedTimer = localStorage.getItem(this.TIMER_KEY);
    if (savedTimer) {
      const expiresAt = parseInt(savedTimer, 10);
      const now = Date.now();
      
      if (expiresAt > now) {
        this.timeRemaining = Math.floor((expiresAt - now) / 1000);
      } else {
        this.timeRemaining = 0;
      }
    } else {
      // Set new expiry time
      const expiresAt = Date.now() + (15 * 60 * 1000);
      localStorage.setItem(this.TIMER_KEY, expiresAt.toString());
    }
  }

  private startTimer(): void {
    this.updateFormattedTime();
    
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        this.updateFormattedTime();
      } else {
        this.timeRemaining = 0;
        this.formattedTime = '0:00';
        if (this.timerSubscription) {
          this.timerSubscription.unsubscribe();
        }
      }
    });
  }

  private updateFormattedTime(): void {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  async checkVerification(manual: boolean = true): Promise<void> {
    if (this.checking) return;
    
    this.checking = true;
    this.error = '';

    try {
      const fbAuth = getAuth();
      const currentUser = fbAuth.currentUser;
      
      if (!currentUser) {
        this.error = 'Sessão expirada. Por favor, faz login novamente.';
        this.checking = false;
        return;
      }

      // Reload user data from Firebase to get fresh emailVerified status
      await currentUser.reload();
      
      if (currentUser.emailVerified) {
        // Email is verified in Firebase, now update backend
        this.api.updateEmailVerificationStatus().subscribe({
          next: () => {
            this.checking = false;
            this.clearVerificationState();
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.checking = false;
            if (manual) {
              this.error = 'Erro ao atualizar o estado de verificação. Tenta novamente.';
            }
          }
        });
      } else {
        this.checking = false;
        if (manual) {
          this.error = 'O email ainda não foi verificado. Por favor, verifica a tua caixa de entrada e spam.';
        }
      }
    } catch (err) {
      this.checking = false;
      if (manual) {
        this.error = 'Erro ao verificar. Tenta novamente.';
      }
    }
  }

  async resendEmail(): Promise<void> {
    this.error = '';
    
    try {
      const fbAuth = getAuth();
      const currentUser = fbAuth.currentUser;
      
      if (!currentUser) {
        this.error = 'Sessão expirada.';
        return;
      }

      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(currentUser);
      
      this.error = '';
      // Show temporary success message
      const tempError = this.error;
      this.error = 'Email de verificação enviado com sucesso.';
      setTimeout(() => {
        if (this.error === 'Email de verificação enviado com sucesso.') {
          this.error = '';
        }
      }, 3000);
    } catch (err: any) {
      this.error = 'Erro ao reenviar email. Tenta novamente mais tarde.';
    }
  }

  private clearVerificationState(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TIMER_KEY);
  }

  get isExpired(): boolean {
    return this.timeRemaining === 0;
  }
}
