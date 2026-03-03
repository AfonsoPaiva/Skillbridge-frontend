import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { Conversation, User } from '../../../core/models/models';

@Component({
  selector: 'app-conversations-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatRippleModule],
  templateUrl: './conversations-list.component.html',
  styleUrls: ['./conversations-list.component.scss']
})
export class ConversationsListComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  loading = true;
  error = '';
  currentUserId: number | null = null;
  activeConvId: number | null = null;
  private routerSub?: Subscription;

  constructor(
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Track active child route for sidebar highlight
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.syncActiveId());
    this.syncActiveId();

    this.api.getMyProfile().subscribe({
      next: me => { this.currentUserId = me.id; this.load(); },
      error: () => { this.error = 'Erro ao carregar perfil.'; this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private syncActiveId(): void {
    const child = this.route.firstChild;
    const id = child?.snapshot.paramMap.get('id');
    this.activeConvId = id ? Number(id) : null;
  }

  load(): void {
    this.loading = true;
    this.api.listConversations().subscribe({
      next: convs => { this.conversations = convs; this.loading = false; },
      error: () => { this.error = 'Erro ao carregar conversas.'; this.loading = false; }
    });
  }

  getOtherUser(conv: Conversation): User | undefined {
    if (!this.currentUserId) return conv.user_a;
    return conv.user_a_id === this.currentUserId ? conv.user_b : conv.user_a;
  }

  open(conv: Conversation): void {
    this.router.navigate([conv.id], { relativeTo: this.route });
  }

  getInitial(name?: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }
}
