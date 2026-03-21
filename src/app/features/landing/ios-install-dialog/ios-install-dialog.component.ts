import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-ios-install-dialog',
  templateUrl: './ios-install-dialog.component.html',
  styleUrls: ['./ios-install-dialog.component.scss']
})
export class IosInstallDialogComponent {
  constructor(private dialogRef: MatDialogRef<IosInstallDialogComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}
