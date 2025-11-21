import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { User } from '../models/user';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private authService = inject(AuthService);
  private hubUrl = 'http://localhost:5431/hubs/chat';
  private hubConnection?: HubConnection;

  onlineUsers = signal<User[]>([]);
  currentOpenedChat = signal<User | null>(null);
  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(false);

  /** Start SignalR connection */
  startConnection(token: string, senderId?: string) {
    if (this.hubConnection?.state === HubConnectionState.Connected) return;

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
      .catch((err) => console.error('SignalR error:', err));
  }

  /** Hub events */
  private registerHubEvents() {
    if (!this.hubConnection) return;

    // Online user updates
    this.hubConnection.on('OnlineUsers', (users: User[]) => {
      console.log(users); // You want this for debugging
      const currentUser = this.authService.currentUser?.userName;
      this.onlineUsers.set(currentUser ? users.filter((u) => u.userName !== currentUser) : users);
    });

    // Incoming messages
    this.hubConnection.on('ReceiveMessageList', (messages: Message[]) => {
      const currentChatUser = this.currentOpenedChat();
      if (!currentChatUser) return;

      this.chatMessages.update((prev) => [...messages, ...prev]);

      this.isLoading.set(false);
    });

    this.hubConnection.on('ReceiveNewMessage', (message: Message) => {
      const chat = this.currentOpenedChat();

      // If message is NOT for the currently opened chat → DO NOT add it
      if (!chat || (message.senderId !== chat.id && message.receiverId !== chat.id)) {
        document.title = '(1) New Message';
        return;
      }

      this.chatMessages.update((messages) => [...messages, message]);
    });
  }

  /** Local echo before sending */
  private addLocalMessage(message: string) {
    const senderId = this.authService.currentUser?.id!;
    const receiverId = this.currentOpenedChat()?.id!;

    this.chatMessages.update((messages) => [
      ...messages,
      {
        id: 0,
        content: message,
        senderId,
        receiverId,
        createdDate: new Date().toISOString(),
        isRead: false,
      },
    ]);
  }

  /** Send message to backend */
  sendMessage(message: string) {
    if (!message.trim()) return;

    this.addLocalMessage(message);

    this.hubConnection
      ?.invoke('SendMessage', {
        receiverId: this.currentOpenedChat()?.id,
        content: message,
      })
      .catch((err) => console.error('Error sending message:', err));
  }

  /** Get user online/typing status */
  getStatus(userName: string): string {
    const user = this.onlineUsers().find((u) => u.userName === userName);
    if (!user) return 'offline';

    return user.isTyping ? 'Typing...' : user.isOnline ? 'online' : 'offline';
  }

  /** Load paginated messages */
  loadMessages(pageNumber: number) {
    const chatUserId = this.currentOpenedChat()?.id;
    if (
      !this.hubConnection ||
      this.hubConnection.state !== HubConnectionState.Connected ||
      !chatUserId
    ) {
      console.error('Hub not ready or no chat selected');
      return;
    }

    this.isLoading.set(true);

    this.hubConnection
      .invoke<Message[]>('LoadMessages', chatUserId, pageNumber)
      .then((messages) => {
        this.chatMessages.update((prev) => [...messages, ...prev]);
      })
      .catch((err) => console.error('Error loading messages:', err))
      .finally(() => this.isLoading.set(false));
  }

  /** Disconnect hub */
  endConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      this.hubConnection.stop();
    }
  }
}
