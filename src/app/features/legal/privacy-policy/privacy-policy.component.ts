import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.scss']
})
export class PrivacyPolicyComponent {
  today = new Date();
  private readonly email = 'skillbridge.portfolio@gmail.com';

  constructor(private snackBar: MatSnackBar) {}

  copyEmail(): void {
    navigator.clipboard.writeText(this.email).then(() => {
      this.snackBar.open('Email copiado com sucesso!', 'Fechar', { duration: 3000 });
    }).catch(() => {
      this.snackBar.open('Erro ao copiar email', 'Fechar', { duration: 3000 });
    });
  }
}
