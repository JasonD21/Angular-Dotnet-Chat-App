import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { VideoChatService } from '../../services/video-chat.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-video-chat',
  imports: [MatIconModule, CommonModule, MatButtonModule],
  templateUrl: './video-chat.html',
})
export class VideoChat implements AfterViewInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  remoteUserId: string | undefined;

  public signalR = inject(VideoChatService);
  private dialogRef = inject(MatDialogRef<VideoChat>);
  private pc!: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private localStreamPromise: Promise<MediaStream> | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  private subs: Subscription[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    console.log('VideoChat constructor, received data:', data);

    if (data?.receiverId) {
      this.signalR.remoteUserId = data.receiverId;
    }
  }

  ngAfterViewInit(): void {
    console.log('VideoChat ngAfterViewInit called');
    this.initPeerConnection();
    this.registerSignalListeners();
    this.startLocalVideo()
      .then(() => console.log('Local video started'))
      .catch((e) => console.error('Local video error', e));
  }

  ngOnDestroy(): void {
    this.cleanup();
    this.subs.forEach((s) => s.unsubscribe());
  }

  async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) {
      // Reuse existing stream
      return this.localStream;
    }

    try {
      console.log('[VideoChat] requesting camera and microphone...');
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      return this.localStream;
    } catch (err: any) {
      console.error('[VideoChat] getUserMedia error:', err.name, err.message);
      throw err;
    }
  }

  private initPeerConnection() {
    console.log('initPeerConnection called');
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
      ],
    });

    this.pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        // send as RTCIceCandidateInit
        this.signalR.sendIceCandidate(this.signalR.remoteUserId, ev.candidate.toJSON());
      }
    };

    this.pc.ontrack = (ev) => {
      // first stream in event
      console.log('Remote track received', ev.streams[0]);
      this.remoteVideo.nativeElement.srcObject = ev.streams[0];
    };

    // optional: monitor connection state for UI
    this.pc.onconnectionstatechange = () => {
      console.log('pc state', this.pc.connectionState);
      if (
        this.pc.connectionState === 'disconnected' ||
        this.pc.connectionState === 'failed' ||
        this.pc.connectionState === 'closed'
      ) {
        this.endCallLocalCleanup();
      }
    };
  }

  private registerSignalListeners() {
    // incoming offer from remote
    this.subs.push(
      this.signalR.offerReceived.subscribe(async (data) => {
        if (!data) return;
        // set incomingCall flags - App handles opening this dialog; here we already open
        // set remoteUserId already set in service
        // keep the offer for accept flow; acceptCall will pull it from the BehaviorSubject
        console.log('Incoming offer received:', data);
      })
    );

    this.subs.push(
      this.signalR.answerReceived.subscribe(async (data) => {
        if (!data) return;
        try {
          await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
          console.error('setRemoteDescription (answer) error', e);
        }
      })
    );

    this.subs.push(
      this.signalR.iceCandidateReceived.subscribe(async (data) => {
        if (!data) return;
        try {
          if (this.pc && this.pc.remoteDescription) {
            await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            // Remote description not set yet, queue it
            this.pendingCandidates.push(data.candidate);
          }
        } catch (e) {
          console.error('addIceCandidate error', e);
        }
      })
    );

    this.subs.push(
      this.signalR.callEnded.subscribe((payload) => {
        console.log('callEnded event received', payload);
        this.endCallLocalCleanup();
        this.dialogRef.close();
      })
    );
  }

  async startLocalVideo() {
    console.log('[VideoChat] startLocalVideo called');

    if (this.localStream) {
      console.log('[VideoChat] localStream already exists, tracks:', this.localStream.getTracks());
      return;
    }

    // try {
    //   console.log('[VideoChat] requesting camera and microphone...');
    //   this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    //   console.log('[VideoChat] got localStream:', this.localStream);

    //   this.localVideo.nativeElement.srcObject = this.localStream;

    //   if (this.pc.signalingState !== 'closed' && this.localStream) {
    //     const senders = this.pc.getSenders();
    //     this.localStream.getTracks().forEach((track) => {
    //       if (!senders.find((s) => s.track === track)) {
    //         this.pc.addTrack(track, this.localStream!);
    //         console.log('[VideoChat] added track to pc:', track);
    //       }
    //     });
    //   }
    // } catch (e) {
    //   console.error('[VideoChat] startLocalVideo error', e);
    //   console.log('[VideoChat] localStream at error time:', this.localStream);
    // }

    await this.getLocalStream();
  }

  async startCall() {
    try {
      this.signalR.isCallActive = true;
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.signalR.sendOffer(this.signalR.remoteUserId, offer);
    } catch (e) {
      console.error('startCall error', e);
    }
  }

  async acceptCall() {
    console.log('[VideoChat] acceptCall called');
    const incoming = this.signalR.offerReceived.getValue();
    if (!incoming) {
      console.log('[VideoChat] no incoming offer');
      return;
    }

    try {
      // 1️⃣ Ensure we have local media
      const localStream = await this.getLocalStream();

      // 2️⃣ Set the remote description from the incoming offer
      console.log('[VideoChat] setting remote description');
      await this.pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));

      // 3️⃣ Add local tracks to the peer connection if not already added
      const senders = this.pc.getSenders();
      localStream.getTracks().forEach((track) => {
        if (!senders.find((s) => s.track === track)) {
          this.pc.addTrack(track, localStream);
        }
      });

      // 4️⃣ Create an answer and set it as local description
      console.log('[VideoChat] creating answer...');
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      // 5️⃣ Send the answer to the remote peer via your signaling service
      await this.signalR.sendAnswer(this.signalR.remoteUserId, answer);

      // 6️⃣ Flush any pending ICE candidates that arrived before remote description was set
      console.log('[VideoChat] flushing pending ICE candidates:', this.pendingCandidates.length);
      for (const candidate of this.pendingCandidates) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.pendingCandidates = [];

      // ✅ Mark call state flags
      this.signalR.isCallActive = true;
      this.signalR.incomingCall = false;

      console.log('[VideoChat] acceptCall completed successfully');
    } catch (e) {
      console.error('[VideoChat] acceptCall error', e);
      console.log('[VideoChat] localStream at error time:', this.localStream);
    }
  }

  declineCall() {
    this.signalR.sendEndCall(this.signalR.remoteUserId);
    this.signalR.incomingCall = false;
    this.signalR.isCallActive = false;
    this.dialogRef.close();
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.pc.close();
    this.pc = new RTCPeerConnection();
  }

  private endCallLocalCleanup() {
    if (!this.pc) return;
    // stop tracks and clear video elements, close pc
    console.log('[VideoChat] ending call, stopping local tracks');
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        console.log('[VideoChat] stopping track:', track);
        track.stop();
      });
      this.localStream = null;
    }

    try {
      if (this.remoteVideo && this.remoteVideo.nativeElement) {
        (this.remoteVideo.nativeElement.srcObject as MediaStream | null) = null;
      }
      if (this.localVideo && this.localVideo.nativeElement) {
        (this.localVideo.nativeElement.srcObject as MediaStream | null) = null;
      }
    } catch (e) {
      // ignore
    }

    try {
      if (this.pc) {
        this.pc.close();
      }
    } catch (e) {
      /* ignore */
    }

    // reset flags
    this.signalR.isCallActive = false;
    this.signalR.incomingCall = false;
    this.signalR.remoteUserId = '';
  }

  private cleanup() {
    this.endCallLocalCleanup();
  }
}
