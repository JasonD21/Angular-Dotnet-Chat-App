import { Component, inject } from '@angular/core';
import { ChatService } from '../../../services/chat.service';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'chat-right-sidebar',
  imports: [TitleCasePipe],
  templateUrl: './chat-right-sidebar.html',
})
export class ChatRightSidebar {
  chatService = inject(ChatService);
}
