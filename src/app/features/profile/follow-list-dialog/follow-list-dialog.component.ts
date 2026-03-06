import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
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
    private auth: AuthService,
    private router: Router,
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

  navigateToProfile(slug: string): void {
    this.dialogRef.close();
    
    // Check if this is the current user's profile by comparing firebase_uid
    if (this.auth.isLoggedIn && this.auth.currentUser) {
      const targetUser = this.users.find(u => u.slug === slug);
      if (targetUser && targetUser.firebase_uid === this.auth.currentUser.uid) {
        this.router.navigate(['/perfil/eu']);
        return;
      }
    }
    
    this.router.navigate(['/perfil', slug]);
  }
}
