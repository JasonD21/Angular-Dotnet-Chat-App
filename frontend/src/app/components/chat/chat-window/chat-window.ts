import { Component, ElementRef, inject, ViewChild } from '@angular/core';
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
  @ViewChild('chatBox') chatContainer?: ElementRef;
  chatService = inject(ChatService);
  message: string = '';

  sendMessage() {
    if (!this.message) return;
    this.chatService.sendMessage(this.message);
    this.message = '';
    this.scrollToBottom();
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }
}
