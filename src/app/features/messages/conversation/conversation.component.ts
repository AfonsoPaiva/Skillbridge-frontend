import {
  Component, OnInit, ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TextFieldModule } from '@angular/cdk/text-field';
import { ApiService } from '../../../core/services/api.service';
import { Conversation, Message, User } from '../../../core/models/models';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    TextFieldModule
  ],
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.scss']
})
export class ConversationComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLElement>;
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  conversationId = 0;
  conversation?: Conversation;
  messages: Message[] = [];
  me?: User;
  otherUser?: User;

  newMessage = '';
  loading = true;
  sending = false;
  error = '';
  shouldScroll = false;
  respondingIds = new Set<number>();
  readonly MAX_MESSAGE_LENGTH = 100;

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.conversationId = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getMyProfile().subscribe({
      next: me => {
        this.me = me;
        this.loadConversation();
      },
      error: () => this.router.navigate(['/messages'])
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private loadConversation(): void {
    // Start a conversation stub to get participants — or just load messages directly
    this.api.listConversations().subscribe({
      next: convs => {
        this.conversation = convs.find(c => c.id === this.conversationId);
        if (this.conversation && this.me) {
          this.otherUser = this.conversation.user_a_id === this.me.id
            ? this.conversation.user_b
            : this.conversation.user_a;
        }
        this.loadMessages();
      },
      error: () => this.loadMessages()
    });
  }

  loadMessages(): void {
    this.loading = true;
    this.api.getMessages(this.conversationId).subscribe({
      next: msgs => {
        // Backend returns newest first — reverse to show oldest at top
        this.messages = [...msgs].reverse();
        this.loading = false;
        this.shouldScroll = true;
        this.api.markRead(this.conversationId).subscribe();
      },
      error: () => { this.loading = false; this.error = 'Erro ao carregar mensagens.'; }
    });
  }

  /** Decode base64 text sent with ephemeral_key='plain' */
  decodeText(msg: Message): string {
    if (msg.ephemeral_key !== 'plain') return '[mensagem cifrada]';
    try {
      return decodeURIComponent(escape(atob(msg.encrypted_content)));
    } catch {
      return '[erro de descodificação]';
    }
  }

  isMine(msg: Message): boolean {
    return !!this.me && msg.sender_id === this.me.id;
  }

  send(): void {
    const text = this.newMessage.trim();
    if (!text || this.sending) return;
    
    // Validate message length
    if (text.length > this.MAX_MESSAGE_LENGTH) {
      this.snack.open(`Mensagem demasiado longa. Máximo: ${this.MAX_MESSAGE_LENGTH} caracteres.`, 'Fechar', { duration: 3000 });
      return;
    }
    
    this.sending = true;
    this.newMessage = '';
    this.api.sendMessage(this.conversationId, text).subscribe({
      next: msg => {
        this.messages.push(msg);
        this.sending = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.newMessage = text;
        this.sending = false;
      }
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  scrollToBottom(): void {
    try {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        return;
      }

      this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch {}
  }

  getInitial(name?: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  goBack(): void {
    this.router.navigate(['/messages']);
  }

  respondApplication(msg: Message, action: 'accept' | 'reject'): void {
    if (!msg.meta_project_id || !msg.meta_member_id) return;
    this.respondingIds.add(msg.meta_member_id);
    this.api.respondApplication(msg.meta_project_id, msg.meta_member_id, action).subscribe({
      next: () => {
        this.respondingIds.delete(msg.meta_member_id!);
        const label = action === 'accept' ? 'Candidatura aceite!' : 'Candidatura rejeitada.';
        this.snack.open(label, 'Fechar', { duration: 3000 });
        this.loadMessages();
      },
      error: err => {
        this.respondingIds.delete(msg.meta_member_id!);
        const e = err?.error?.error || 'Erro ao responder à candidatura.';
        this.snack.open(e, 'Fechar', { duration: 4000 });
      }
    });
  }

  isResponding(msg: Message): boolean {
    return !!msg.meta_member_id && this.respondingIds.has(msg.meta_member_id);
  }

  formatTime(isoDate: string): string {
    try {
      const d = new Date(isoDate);
      return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  /** Returns a date label if this message is on a different day than the previous one */
  getDateSeparator(index: number): string | null {
    const msg = this.messages[index];
    if (!msg) return null;
    const d = new Date(msg.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (index === 0 || !isSameDay(d, new Date(this.messages[index - 1].created_at))) {
      if (isSameDay(d, today)) return 'Hoje';
      if (isSameDay(d, yesterday)) return 'Ontem';
      return d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
    }
    return null;
  }
}
