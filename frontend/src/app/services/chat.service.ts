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
  private hub?: HubConnection;

  onlineUsers = signal<User[]>([]);
  currentOpenedChat = signal<User | null>(null);
  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(false);
  autoScrollEnabled = signal<boolean>(true);

  /** Helpers */
  private get currentUser() {
    return this.authService.currentUser;
  }

  private get selectedChatId() {
    return this.currentOpenedChat()?.id ?? null;
  }

  private isMessageForCurrentChat(msg: Message): boolean {
    const id = this.selectedChatId;
    return id !== null && (msg.senderId === id || msg.receiverId === id);
  }

  /** Start SignalR connection */
  startConnection(token: string, senderId?: string) {
    // If hub exists and is not disconnected, don't start
    if (this.hub && this.hub.state !== HubConnectionState.Disconnected) {
      console.warn('Hub connection already active:', this.hub.state);
      return;
    }

    // Create hub if it doesn't exist
    if (!this.hub) {
      this.hub = new HubConnectionBuilder()
        .withUrl(`${this.hubUrl}?senderId=${senderId ?? ''}`, {
          accessTokenFactory: () => token,
        })
        .withAutomaticReconnect()
        .build();

      this.registerHubEvents();
    } else {
      // Unregister old handlers if reusing the hub
      this.hub.off('ReceiveNewMessage');
      this.hub.off('ReceiveMessageList');
      this.hub.off('OnlineUsers');
      this.hub.off('NotifyTypingToUser');
      this.hub.off('Notify');
      this.registerHubEvents();
    }

    // Only start if disconnected
    if (this.hub.state === HubConnectionState.Disconnected) {
      this.hub
        .start()
        .then(() => console.log('SignalR connection started'))
        .catch((err) => console.error('SignalR error:', err));
    }
  }

  /** Hub events */
  private registerHubEvents() {
    if (!this.hub) return;

    // Online user updates
    this.hub.on('OnlineUsers', (users: User[]) => {
      const currentUser = this.currentUser?.userName;
      this.onlineUsers.set(currentUser ? users.filter((u) => u.userName !== currentUser) : users);
    });

    // Incoming messages
    this.hub.on('ReceiveMessageList', (messages: Message[]) => {
      this.isLoading.update(() => true);
      this.chatMessages.update((prev) => [...messages, ...prev]);
      this.isLoading.set(false);
    });

    this.hub.on('Notify', (user: User) => this.showOnlineNotification(user));

    this.hub.on('ReceiveNewMessage', (msg: Message) => {
      if (!this.isMessageForCurrentChat(msg)) {
        document.title = '(1) New Message';
        return;
      }

      this.chatMessages.update((m) => [...m, msg]);
    });

    this.hub.on('NotifyTypingToUser', (senderUserName: string) => {
      this.updateTypingStatus(senderUserName, true);

      setTimeout(() => {
        this.updateTypingStatus(senderUserName, false);
      }, 2000);
    });
  }

  /** Typing status handler */
  private updateTypingStatus(userName: string, isTyping: boolean) {
    this.onlineUsers.update((users) =>
      users.map((user) => (user.userName === userName ? { ...user, isTyping } : user))
    );
  }

  /** Desktop notification */
  private showOnlineNotification(user: User) {
    Notification.requestPermission().then((res) => {
      if (res === 'granted') {
        new Notification('Active Now 🟠', {
          body: `${user.fullName} is online now`,
          icon: user.profileImageUrl,
        });
      }
    });
  }

  /** Local echo */
  private addLocalMessage(content: string) {
    if (!this.currentUser || !this.selectedChatId) return;

    const msg: Message = {
      id: Date.now(), // unique temporary ID
      content,
      senderId: this.currentUser.id,
      receiverId: this.selectedChatId,
      createdDate: new Date().toISOString(),
      isRead: false,
    };

    this.chatMessages.update((m) => [...m, msg]);
  }

  /** Send to backend */
  sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || !this.hub) return;

    this.addLocalMessage(trimmed);

    this.hub
      .invoke('SendMessage', {
        receiverId: this.selectedChatId,
        content: trimmed,
      })
      .catch((err) => console.error('Send error:', err));
  }

  /** Get user online/typing status */
  getStatus(userName: string): string {
    const user = this.onlineUsers().find((u) => u.userName === userName);
    if (!user) return 'offline';

    return user.isTyping ? 'Typing...' : user.isOnline ? 'online' : 'offline';
  }

  /** Load paginated messages */
  loadMessages(pageNumber: number) {
    this.isLoading.update(() => true);
    const chatUserId = this.currentOpenedChat()?.id;
    if (!this.hub || this.hub.state !== HubConnectionState.Connected || !chatUserId) {
      return console.error('Hub not ready or no chat selected');
    }

    this.isLoading.set(true);

    this.hub
      .invoke<Message[]>('LoadMessages', chatUserId, pageNumber)
      .then((messages) => {
        // fallback to empty array if null/undefined
        const msgs = Array.isArray(messages) ? messages : [];
        this.chatMessages.update((prev) => [...msgs, ...prev]);
      })
      .catch((err) => console.error('Error loading messages:', err))
      .finally(() => this.isLoading.set(false));
  }

  notifyTyping() {
    if (!this.hub) return;

    this.hub.invoke('NotifyTyping', this.currentOpenedChat()?.userName).catch(console.error);
  }

  /** Disconnect hub */
  endConnection() {
    if (this.hub?.state === HubConnectionState.Connected) {
      this.hub.stop();
    }
  }
}
