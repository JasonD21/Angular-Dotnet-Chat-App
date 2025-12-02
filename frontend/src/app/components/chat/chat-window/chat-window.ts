import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { ChatService } from '../../../services/chat.service';
import { TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ChatBox } from '../chat-box/chat-box';
import { MatDialog } from '@angular/material/dialog';
import { VideoChatService } from '../../../services/video-chat.service';
import { VideoChat } from '../../video-chat/video-chat';

@Component({
  selector: 'chat-window',
  imports: [TitleCasePipe, MatIconModule, FormsModule, ChatBox],
  templateUrl: './chat-window.html',
})
export class ChatWindow {
  @ViewChild('chatBox') chatContainer?: ElementRef;
  chatService = inject(ChatService);
  signalR = inject(VideoChatService);
  dialog = inject(MatDialog);
  message: string = '';

  sendMessage() {
    if (!this.message) return;
    this.chatService.sendMessage(this.message);
    this.message = '';
    this.scrollToBottom();
  }

  displayDialog(receiverId?: string) {
    console.log('displayDialog called with receiverId:', receiverId);

    const dialogRef = this.dialog.open(VideoChat, {
      width: '420px',
      height: '640px',
      disableClose: true,
      autoFocus: false,
      data: { receiverId },
    });

    dialogRef.afterOpened().subscribe(() => console.log('VideoChat dialog opened'));
    dialogRef.afterClosed().subscribe(() => console.log('VideoChat dialog closed'));
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }
}
