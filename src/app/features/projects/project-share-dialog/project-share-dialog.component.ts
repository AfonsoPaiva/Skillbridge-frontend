import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Project } from '../../../core/models/models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-project-share-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule, MatTooltipModule],
  templateUrl: './project-share-dialog.component.html',
  styleUrls: ['./project-share-dialog.component.scss']
})
export class ProjectShareDialogComponent {
  projectUrl: string;

  constructor(
    public dialogRef: MatDialogRef<ProjectShareDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { project: Project },
    private snack: MatSnackBar
  ) {
    this.projectUrl = `${window.location.origin}/projects/${this.data.project.slug}`;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.projectUrl).then(() => {
      this.snack.open('Link copiado para a área de transferência!', 'Fechar', { duration: 3000 });
    }).catch(() => {
      this.snack.open('Erro ao copiar o link.', 'Fechar', { duration: 3000 });
    });
  }

  shareEmail(): void {
    const subject = encodeURIComponent(`Projeto interessante: ${this.data.project.title}`);
    const body = encodeURIComponent(`Olá!\n\nAchei este projeto interessante e acho que podes ter interesse em dar uma vista de olhos:\n\n${this.data.project.title}\n${this.projectUrl}\n\nAbraço!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }

  shareWhatsApp(): void {
    const text = encodeURIComponent(`Dá uma vista de olhos neste projeto: ${this.data.project.title}\n${this.projectUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  shareTwitter(): void {
    const text = encodeURIComponent(`Dá uma vista de olhos neste projeto: ${this.data.project.title}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(this.projectUrl)}`, '_blank');
  }

  shareLinkedIn(): void {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.projectUrl)}`, '_blank');
  }

  close(): void {
    this.dialogRef.close();
  }
}
