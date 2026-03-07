import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-account-dialog',
  templateUrl: './delete-account-dialog.component.html',
  styleUrls: ['./delete-account-dialog.component.scss']
})
export class DeleteAccountDialogComponent {
  confirmationText = '';
  
  constructor(public dialogRef: MatDialogRef<DeleteAccountDialogComponent>) {}

  get canDelete(): boolean {
    return this.confirmationText.toLowerCase() === 'eliminar';
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    if (this.canDelete) {
      this.dialogRef.close(true);
    }
  }
}
