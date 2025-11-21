import { Component, inject } from '@angular/core';
import { ChatService } from '../../../services/chat.service';
import { TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ChatBox } from '../chat-box/chat-box';

@Component({
  selector: 'chat-window',
  imports: [TitleCasePipe, MatIconModule, FormsModule, ChatBox],
  templateUrl: './chat-window.html',
})
export class ChatWindow {
  chatService = inject(ChatService);
  message: string = '';

  sendMessage() {
    if (!this.message) return;
    this.chatService.sendMessage(this.message);
  }
}
