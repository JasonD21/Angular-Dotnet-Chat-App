import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'chat-sidebar',
  imports: [MatIconModule, MatMenuModule],
  templateUrl: './chat-sidebar.html',
})
export class ChatSidebar {}
