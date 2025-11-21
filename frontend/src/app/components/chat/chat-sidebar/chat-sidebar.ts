import { Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { User } from '../../../models/user';

@Component({
  selector: 'chat-sidebar',
  imports: [MatIconModule, MatMenuModule, TitleCasePipe],
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
  }
}
