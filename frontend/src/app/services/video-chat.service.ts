import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VideoChatService {
  private hubUrl = 'http://localhost:5431/hubs/video';
  private authService = inject(AuthService);

  public hub!: HubConnection;

  // shared UI state
  public incomingCall = false;
  public isCallActive = false;
  public remoteUserId = '';

  // signaling streams
  public offerReceived = new BehaviorSubject<{
    senderId: string;
    offer: RTCSessionDescriptionInit;
  } | null>(null);
  public answerReceived = new Subject<{ senderId: string; answer: RTCSessionDescriptionInit }>();
  public iceCandidateReceived = new Subject<{ senderId: string; candidate: RTCIceCandidateInit }>();
  public callEnded = new Subject<{ senderId: string }>();

  async startConnection(): Promise<void> {
    if (this.hub && this.hub.state === HubConnectionState.Connected) return;

    this.hub = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.authService.token || '',
      })
      .withAutomaticReconnect()
      .build();

    this.registerListeners();

    try {
      await this.hub.start();
      console.log('SignalR connected');
    } catch (err) {
      console.error('SignalR start error', err);
      // caller can retry startConnection()
    }
  }

  private registerListeners() {
    if (!this.hub) return;

    // note: server sends "ReceiveOffer", "ReceiveAnswer", "ReceiveIceCandidate", "CallEnded"
    this.hub.on('ReceiveOffer', (senderId: string, offerJson: string) => {
      try {
        const offer = JSON.parse(offerJson) as RTCSessionDescriptionInit;
        this.offerReceived.next({ senderId, offer });
        this.remoteUserId = senderId;
        this.incomingCall = true;
      } catch (e) {
        console.error('Invalid offer payload', e);
      }
    });

    this.hub.on('ReceiveAnswer', (senderId: string, answerJson: string) => {
      try {
        const answer = JSON.parse(answerJson) as RTCSessionDescriptionInit;
        this.answerReceived.next({ senderId, answer });
      } catch (e) {
        console.error('Invalid answer payload', e);
      }
    });

    this.hub.on('ReceiveIceCandidate', (senderId: string, candidateJson: string) => {
      try {
        const candidate = JSON.parse(candidateJson) as RTCIceCandidateInit;
        this.iceCandidateReceived.next({ senderId, candidate });
      } catch (e) {
        console.error('Invalid ice candidate payload', e);
      }
    });

    this.hub.on('CallEnded', (senderId: string) => {
      this.callEnded.next({ senderId });
      // reset flags - UI/components should respond and do cleanup
      this.incomingCall = false;
      this.isCallActive = false;
      this.remoteUserId = '';
    });
  }

  private isConnected(): boolean {
    return !!this.hub && this.hub.state === HubConnectionState.Connected;
  }

  sendOffer(receiverId: string, offer: RTCSessionDescriptionInit) {
    console.log('sendOffer called, receiverId:', receiverId, 'offer:', offer);
    if (!this.isConnected()) return console.warn('Hub not connected, cannot send offer');
    this.hub.invoke('SendOffer', receiverId, JSON.stringify(offer));
  }

  sendAnswer(receiverId: string, answer: RTCSessionDescriptionInit) {
    console.log('sendAnswer called, receiverId:', receiverId, 'answer:', answer);
    if (!this.isConnected()) return console.warn('Hub not connected, cannot send answer');
    this.hub.invoke('SendAnswer', receiverId, JSON.stringify(answer));
  }

  sendIceCandidate(receiverId: string, candidate: RTCIceCandidateInit) {
    console.log('sendIceCandidate called, receiverId:', receiverId, 'candidate:', candidate);
    if (!this.isConnected()) return console.warn('Hub not connected, cannot send ICE');
    this.hub.invoke('SendIceCandidate', receiverId, JSON.stringify(candidate));
  }

  sendEndCall(receiverId: string) {
    console.log('sendEndCall called, receiverId:', receiverId);
    if (!this.isConnected()) return console.warn('Hub not connected, cannot send end call');
    this.hub.invoke('EndCall', receiverId);
  }
  async stopConnection() {
    if (this.hub && this.hub.state === HubConnectionState.Connected) {
      await this.hub.stop();
    }
  }
}
