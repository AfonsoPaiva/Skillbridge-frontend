import { Routes } from '@angular/router';
import { ConversationsListComponent } from './conversations-list/conversations-list.component';
import { ConversationComponent } from './conversation/conversation.component';

export const MESSAGES_ROUTES: Routes = [
  {
    path: '',
    component: ConversationsListComponent,
    children: [
      { path: ':id', component: ConversationComponent }
    ]
  }
];
