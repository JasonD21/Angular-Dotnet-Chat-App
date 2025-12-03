import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { VideoChatService } from '../../services/video-chat.service';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-video-chat',
  imports: [MatIconModule, CommonModule, MatButtonModule],
  templateUrl: './video-chat.html',
})
export class VideoChatComponent implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private peerConnection!: RTCPeerConnection;
  private dialogRef: MatDialogRef<VideoChatComponent> = inject(MatDialogRef);
  private pendingIceCandidates: RTCIceCandidate[] = [];
  signalRService = inject(VideoChatService);

  ngOnInit(): void {
    console.log('VideoChatComponent initialized');
    this.setupPeerConnection();
    this.setupSignalListeners();
    this.startLocalVideo();
  }

  setupSignalListeners() {
    console.log('Setting up SignalR listeners');
    this.signalRService.hub.on('CallEnded', () => {
      console.log('Received CallEnded from SignalR');
      this.endCall();
    });

    this.signalRService.answerReceived.subscribe(async (data) => {
      if (data) {
        console.log('Answer received from:', data.senderId, data.answer);
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    // this.signalRService.iceCandidateReceived.subscribe(async (data) => {
    //   if (data) {
    //     try {
    //       console.log('ICE candidate received from:', data.senderId, data.candidate);
    //       await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));

    //     } catch (e) {
    //       console.error('Error adding received ice candidate', e);
    //     }
    //   }
    // });

    // Modify ICE candidate handler
    this.signalRService.iceCandidateReceived.subscribe(async (data) => {
      if (data) {
        try {
          console.log('ICE candidate received from:', data.senderId, data.candidate);
          const candidate = new RTCIceCandidate(data.candidate);

          // If remote description isn't set yet, buffer the candidate
          if (!this.peerConnection.remoteDescription) {
            console.log('Buffering ICE candidate until remote description is set');
            this.pendingIceCandidates.push(candidate);
          } else {
            await this.peerConnection.addIceCandidate(candidate);
          }
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });
  }

  setupPeerConnection() {
    console.log('Setting up RTCPeerConnection');
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
      ],
    });
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Local ICE candidate generated:', event.candidate);
        this.signalRService.sendIceCandidate(this.signalRService.remoteUserId, event.candidate);
      }
    };
    this.peerConnection.ontrack = (event) => {
      console.log('Remote track received', event.streams[0]);
      this.remoteVideo.nativeElement.srcObject = event.streams[0];
    };
  }

  // async startLocalVideo() {
  //   console.log('Starting local video');
  //   const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  //   this.localVideo.nativeElement.srcObject = stream;
  //   console.log('Local stream obtained:', stream);

  //   stream.getTracks().forEach((track) => {
  //     console.log('Adding local track to peerConnection:', track.kind);
  //     this.peerConnection.addTrack(track, stream);
  //   });
  // }

  async startLocalVideo() {
    console.log('Starting local video');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.localVideo.nativeElement.srcObject = stream;
      console.log('Local stream obtained:', stream);

      stream.getTracks().forEach((track) => {
        console.log('Adding local track to peerConnection:', track.kind);
        this.peerConnection.addTrack(track, stream);
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      // Try with just audio if video fails
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        this.localVideo.nativeElement.srcObject = null; // Clear video element
        // Audio-only call
        audioStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, audioStream);
        });
      } catch (audioError) {
        console.error('Failed to get audio too:', audioError);
      }
    }
  }

  declineCall() {
    // this.signalRService.incomingCall = false;
    // this.signalRService.isCallActive = false;
    // this.signalRService.sendEndCall(this.signalRService.remoteUserId);
    // this.dialogRef.close();
    console.log('Call declined by user');
    this.endCall();
  }

  async acceptCall() {
    console.log('Accepting call from:', this.signalRService.remoteUserId);
    this.signalRService.incomingCall = false;
    this.signalRService.isCallActive = true;

    // Further implementation for accepting the call goes here
    let offer = await this.signalRService.offerReceived.getValue()?.offer;

    if (offer) {
      console.log('Setting remote description with offer:', offer);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Process any pending ICE candidates
      this.processPendingIceCandidates();

      const answer = await this.peerConnection.createAnswer();
      console.log('Created local answer:', answer);
      await this.peerConnection.setLocalDescription(answer);

      this.signalRService.sendAnswer(this.signalRService.remoteUserId, answer);
      console.log('Sent answer via SignalR');
    } else {
      console.warn('No offer available to accept');
    }
  }

  // Add helper method
  private async processPendingIceCandidates() {
    console.log('Processing', this.pendingIceCandidates.length, 'pending ICE candidates');
    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection.addIceCandidate(candidate);
        console.log('Added buffered ICE candidate');
      } catch (e) {
        console.error('Error adding buffered ICE candidate', e);
      }
    }
    this.pendingIceCandidates = [];
  }

  // async startCall() {
  //   console.log('Starting call to:', this.signalRService.remoteUserId);
  //   this.signalRService.isCallActive = true;

  //   // Further implementation for starting the call goes here
  //   const offer = await this.peerConnection.createOffer();
  //   console.log('Created local offer:', offer);
  //   await this.peerConnection.setLocalDescription(offer);
  //   this.signalRService.sendOffer(this.signalRService.remoteUserId, offer);
  //   console.log('Sent offer via SignalR');
  // }

  // In VideoChatComponent, modify startCall
  async startCall() {
    if (!this.signalRService.hub || this.signalRService.hub.state !== 'Connected') {
      console.error('SignalR not connected');
      return;
    }

    console.log('Starting call to:', this.signalRService.remoteUserId);
    this.signalRService.isCallActive = true;

    // Wait a bit before creating offer to ensure tracks are added
    setTimeout(async () => {
      const offer = await this.peerConnection.createOffer();
      console.log('Created local offer:', offer);
      await this.peerConnection.setLocalDescription(offer);
      this.signalRService.sendOffer(this.signalRService.remoteUserId, offer);
      console.log('Sent offer via SignalR');
    }, 1000);
  }

  async endCall() {
    // keep reference BEFORE clearing
    console.log('Ending call with:', this.signalRService.remoteUserId);
    const receiverId = this.signalRService.remoteUserId;

    // Clear pending ICE candidates
    this.pendingIceCandidates = [];

    // Notify the other user
    if (receiverId) {
      console.log('Sending end call signal to:', receiverId);
      this.signalRService.sendEndCall(receiverId);
    }

    // Stop local stream
    const localStream = this.localVideo.nativeElement.srcObject as MediaStream | null;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log('Stopping local track:', track.kind);
        track.stop();
      });
    }

    // Clear video elements
    this.localVideo.nativeElement.srcObject = null;
    this.remoteVideo.nativeElement.srcObject = null;

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.close();
      this.peerConnection = null!;
      console.log('PeerConnection closed');
    }

    // Reset UI state
    this.signalRService.isCallActive = false;
    this.signalRService.incomingCall = false;
    this.signalRService.remoteUserId = '';

    // Close dialog
    console.log('Closing VideoChat dialog');
    this.dialogRef.close();
  }
}
