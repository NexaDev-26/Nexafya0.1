/**
 * WebRTC Service for Video Calls
 * Uses Firebase Realtime Database or Firestore for signaling
 */

import { db as firestore } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup';
  from: string;
  to: string;
  data?: any;
  timestamp?: any;
}

class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private signalingUnsubscribes: Map<string, () => void> = new Map();

  /**
   * Get user media (camera and microphone)
   */
  async getUserMedia(constraints: MediaStreamConstraints = {}): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints.video !== false ? { facingMode: 'user' } : false,
        audio: constraints.audio !== false,
        ...constraints,
      });
      this.localStream = stream;
      return stream;
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      throw new Error(`Failed to access camera/microphone: ${error.message}`);
    }
  }

  /**
   * Get screen share stream
   */
  async getDisplayMedia(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      return stream;
    } catch (error: any) {
      console.error('Error accessing display media:', error);
      throw new Error(`Failed to access screen share: ${error.message}`);
    }
  }

  /**
   * Create RTCPeerConnection
   */
  createPeerConnection(
    roomId: string,
    userId: string,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onTrack: (stream: MediaStream) => void,
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  ): RTCPeerConnection {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers if needed (requires credentials)
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: import.meta.env.VITE_TURN_USERNAME,
        //   credential: import.meta.env.VITE_TURN_PASSWORD,
        // },
      ],
    };

    const pc = new RTCPeerConnection(config);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      onTrack(event.streams[0]);
    };

    // Handle connection state changes
    if (onConnectionStateChange) {
      pc.onconnectionstatechange = () => {
        onConnectionStateChange(pc.connectionState);
      };
    }

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    this.peerConnections.set(roomId, pc);
    return pc;
  }

  /**
   * Setup signaling listener
   */
  setupSignaling(
    roomId: string,
    userId: string,
    onMessage: (message: SignalingMessage) => void
  ): () => void {
    const signalingRef = collection(firestore, 'videoCalls', roomId, 'signaling');
    
    const unsubscribe = onSnapshot(signalingRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const message = change.doc.data() as SignalingMessage;
          // Only process messages meant for this user
          if (message.to === userId && message.from !== userId) {
            onMessage(message);
          }
        }
      });
    });

    this.signalingUnsubscribes.set(roomId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Send signaling message
   */
  async sendSignalingMessage(
    roomId: string,
    message: Omit<SignalingMessage, 'timestamp'>
  ): Promise<void> {
    const signalingRef = doc(
      firestore,
      'videoCalls',
      roomId,
      'signaling',
      `${Date.now()}-${message.from}`
    );

    await setDoc(signalingRef, {
      ...message,
      timestamp: serverTimestamp(),
    });
  }

  /**
   * Create offer
   */
  async createOffer(
    pc: RTCPeerConnection,
    roomId: string,
    from: string,
    to: string
  ): Promise<RTCSessionDescriptionInit> {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await this.sendSignalingMessage(roomId, {
      type: 'offer',
      from,
      to,
      data: offer,
    });

    return offer;
  }

  /**
   * Create answer
   */
  async createAnswer(
    pc: RTCPeerConnection,
    roomId: string,
    from: string,
    to: string,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await this.sendSignalingMessage(roomId, {
      type: 'answer',
      from,
      to,
      data: answer,
    });

    return answer;
  }

  /**
   * Handle remote answer
   */
  async handleAnswer(pc: RTCPeerConnection, answer: RTCSessionDescriptionInit): Promise<void> {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(pc: RTCPeerConnection, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * Replace video track (for screen sharing)
   */
  replaceVideoTrack(pc: RTCPeerConnection, newStream: MediaStream): void {
    const videoTrack = newStream.getVideoTracks()[0];
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (sender && videoTrack) {
      sender.replaceTrack(videoTrack);
    }
  }

  /**
   * Toggle audio track
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle video track
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * End call and cleanup
   */
  async endCall(roomId: string, userId: string): Promise<void> {
    // Close peer connection
    const pc = this.peerConnections.get(roomId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(roomId);
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Unsubscribe from signaling
    const unsubscribe = this.signalingUnsubscribes.get(roomId);
    if (unsubscribe) {
      unsubscribe();
      this.signalingUnsubscribes.delete(roomId);
    }

    // Send hangup message
    try {
      await this.sendSignalingMessage(roomId, {
        type: 'hangup',
        from: userId,
        to: '', // Broadcast to all
        data: { reason: 'User ended call' },
      });
    } catch (error) {
      console.error('Error sending hangup message:', error);
    }
  }

  /**
   * Get connection stats
   */
  async getStats(pc: RTCPeerConnection): Promise<RTCStatsReport | null> {
    try {
      return await pc.getStats();
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;

