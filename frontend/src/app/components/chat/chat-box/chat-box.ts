import { AfterViewChecked, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { ChatService } from '../../../services/chat.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Message } from '../../../models/message';

@Component({
  selector: 'chat-box',
  imports: [MatProgressSpinnerModule, DatePipe, MatIconModule, CommonModule],
  templateUrl: './chat-box.html',
  styleUrl: './chat-box.css',
})
export class ChatBox implements AfterViewChecked {
  @ViewChild('chatBox', { read: ElementRef }) public chatBox?: ElementRef;
  chatService = inject(ChatService);
  authService = inject(AuthService);
  private pageNumber = 2;

  loadMoreMessages() {
    this.pageNumber++;
    this.chatService.loadMessages(this.pageNumber);
    setTimeout(() => this.scrollToTop(), 50);
  }

  ngAfterViewChecked(): void {
    if (this.chatService.autoScrollEnabled()) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    this.chatService.autoScrollEnabled.set(true);
    this.chatBox?.nativeElement.scrollTo({
      top: this.chatBox.nativeElement.scrollHeight,
      behavior: 'smooth',
    });
  }

  scrollToTop() {
    this.chatService.autoScrollEnabled.set(false);
    this.chatBox?.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  trackByIndex(index: number, item: Message) {
    return index;
  }
}
