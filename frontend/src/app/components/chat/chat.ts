import { Component } from '@angular/core';
import { ChatWindow } from './chat-window/chat-window';
import { ChatSidebar } from './chat-sidebar/chat-sidebar';

@Component({
  selector: 'app-chat',
  imports: [ChatWindow, ChatSidebar],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {}
