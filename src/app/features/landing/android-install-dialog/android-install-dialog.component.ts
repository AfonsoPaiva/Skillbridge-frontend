import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-android-install-dialog',
  templateUrl: './android-install-dialog.component.html',
  styleUrls: ['./android-install-dialog.component.scss']
})
export class AndroidInstallDialogComponent {
  constructor(private dialogRef: MatDialogRef<AndroidInstallDialogComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}
