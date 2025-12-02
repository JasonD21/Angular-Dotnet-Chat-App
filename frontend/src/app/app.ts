import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoChatService } from './services/video-chat.service';
import { AuthService } from './services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { VideoChat } from './components/video-chat/video-chat';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('frontend');

  private signalR = inject(VideoChatService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    // If user has a token, start connection.
    if (this.auth.token) {
      this.signalR.startConnection().catch(console.error);

      // subscribe to offers and open dialog once per offer
      this.signalR.offerReceived.subscribe((payload) => {
        if (!payload) return;
        // open dialog (guard to not open multiple times)
        const alreadyOpen = (this.dialog.openDialogs || []).some(
          (d) => d.componentInstance instanceof VideoChat
        );
        if (!alreadyOpen) {
          let audio = new Audio('/assets/phone-ring.wav');
          audio.play();
          this.dialog.open(VideoChat, { width: '420px', height: '640px' });
        }
        // service sets remoteUserId & incomingCall when offer came in
      });
    } else {
      // user not authenticated — do not attempt connection
      console.log('no auth token — skipping SignalR connect');
    }
  }
}
