import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoChatService } from './services/video-chat.service';
import { AuthService } from './services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { VideoChatComponent } from './components/video-chat/video-chat';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('frontend');

  private signalRService = inject(VideoChatService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    if (!this.authService.token) return;
    this.signalRService.startConnection();
    this.startOfferReceive();
  }

  startOfferReceive() {
    this.signalRService.offerReceived.subscribe(async (data) => {
      if (!data || this.signalRService.isCallActive) return;

      this.signalRService.remoteUserId = data.senderId;
      this.signalRService.incomingCall = true;

      let audio = new Audio('assets/phone-ring.wav');
      audio.play();

      this.dialog.open(VideoChatComponent, {
        width: '400px',
        height: '600px',
        disableClose: false,
      });
    });
  }
}
