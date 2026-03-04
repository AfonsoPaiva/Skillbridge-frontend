import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from '../../../core/services/api.service';
import { User } from '../../../core/models/models';

export interface FollowListDialogData {
  userId: string | number;
  type: 'followers' | 'following';
}

@Component({
  selector: 'app-follow-list-dialog',
  templateUrl: './follow-list-dialog.component.html',
  styleUrls: ['./follow-list-dialog.component.scss']
})
export class FollowListDialogComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error = '';

  constructor(
    private api: ApiService,
    private dialogRef: MatDialogRef<FollowListDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FollowListDialogData
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get title(): string {
    return this.data.type === 'followers' ? 'Seguidores' : 'A seguir';
  }

  private loadUsers(): void {
    this.loading = true;
    this.error = '';

    const request = this.data.type === 'followers'
      ? this.api.getFollowers(this.data.userId)
      : this.api.getFollowing(this.data.userId);

    request.subscribe({
      next: (result) => {
        this.users = result.users;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erro ao carregar utilizadores.';
        this.loading = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
