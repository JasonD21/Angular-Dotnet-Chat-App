import { Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { User } from '../../../models/user';
import { TypingIndicator } from '../typing-indicator/typing-indicator';

@Component({
  selector: 'chat-sidebar',
  imports: [MatIconModule, MatMenuModule, TitleCasePipe, TypingIndicator, CommonModule],
  templateUrl: './chat-sidebar.html',
})
export class ChatSidebar implements OnInit {
  authService = inject(AuthService);
  chatService = inject(ChatService);
  router = inject(Router);

  ngOnInit(): void {
    this.chatService.startConnection(this.authService.token!);
  }

  Logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.chatService.endConnection();
  }

  openChatWindow(user: User) {
    this.chatService.currentOpenedChat.set(user);
    this.chatService.loadMessages(1);
  }

  trackByUserId(index: number, user: User) {
    return user.id; // must be unique
  }
}
