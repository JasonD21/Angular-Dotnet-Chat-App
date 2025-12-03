import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VideoChatService {
  private hubUrl = 'http://localhost:5431/hubs/video';
  private authService = inject(AuthService);

  public hub!: HubConnection;
  public pc!: RTCPeerConnection;

  // shared UI state
  public incomingCall = false;
  public isCallActive = false;
  public remoteUserId = '';

  // signaling streams
  public offerReceived = new BehaviorSubject<{
    senderId: string;
    offer: RTCSessionDescriptionInit;
  } | null>(null);
  public answerReceived = new BehaviorSubject<{
    senderId: string;
    answer: RTCSessionDescription;
  } | null>(null);
  public iceCandidateReceived = new BehaviorSubject<{
    senderId: string;
    candidate: RTCIceCandidate;
  } | null>(null);

  startConnection() {
    this.hub = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.authService.token! || '',
      })
      .withAutomaticReconnect()
      .build();

    this.hub
      .start()
      .then(() => console.log('Video Chat Hub Connection Started'))
      .catch((err) => console.log('Error while starting connection: ' + err));

    // In VideoChatService, add offerReceived listener
    this.hub.on('ReceiveOffer', (senderId, offer) => {
      console.log('Offer received from:', senderId, offer);
      this.remoteUserId = senderId; // Set the remote user ID
      this.incomingCall = true;
      this.offerReceived.next({
        senderId,
        offer: JSON.parse(offer),
      });
    });
    this.hub.on('ReceiveAnswer', (senderId, answer) => {
      this.answerReceived.next({ senderId, answer: JSON.parse(answer) });
    });
    this.hub.on('ReceiveIceCandidate', (senderId, candidate) => {
      this.iceCandidateReceived.next({ senderId, candidate: JSON.parse(candidate) });
    });
  }

  sendOffer(receiverId: string, offer: RTCSessionDescriptionInit) {
    this.hub.invoke('SendOffer', receiverId, JSON.stringify(offer));
  }

  sendAnswer(receiverId: string, answer: RTCSessionDescriptionInit) {
    this.hub.invoke('SendAnswer', receiverId, JSON.stringify(answer));
  }

  sendIceCandidate(receiverId: string, candidate: RTCIceCandidate) {
    this.hub.invoke('SendIceCandidate', receiverId, JSON.stringify(candidate));
  }

  sendEndCall(receiverId: string) {
    this.hub.invoke('EndCall', receiverId);
  }
}
