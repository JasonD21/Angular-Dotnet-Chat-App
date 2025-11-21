import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { User } from '../models/user';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private authService = inject(AuthService);
  private hubUrl = 'http://localhost:5431/hubs/chat';
  private hubConnection?: HubConnection;

  onlineUsers = signal<User[]>([]);
  currentOpenedChat = signal<User | null>({} as User);

  startConnection(token: string, senderId?: string) {
    // Prevent reconnecting if already connected
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      console.log('Hub already connected.');
      return;
    }

    // Build connection only once
    if (!this.hubConnection) {
      this.hubConnection = new HubConnectionBuilder()
        .withUrl(`${this.hubUrl}?senderId=${senderId ?? ''}`, {
          accessTokenFactory: () => token,
        })
        .withAutomaticReconnect()
        .build();

      this.registerHubEvents();
    }

    this.hubConnection
      .start()
      .then(() => console.log('SignalR connection started'))
      .catch((err) => console.error('SignalR connection error:', err));
  }

  private registerHubEvents() {
    if (!this.hubConnection) return;

    this.hubConnection.on('OnlineUsers', (users: User[]) => {
      const currentUser = this.authService.currentUser?.userName;

      this.onlineUsers.set(currentUser ? users.filter((u) => u.userName !== currentUser) : users);
    });
  }

  endConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      this.hubConnection
        .stop()
        .then(() => console.log('SignalR connection stopped'))
        .catch((err) => console.error('Stop connection error:', err));
    }
  }
}
