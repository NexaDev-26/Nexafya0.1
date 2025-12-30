
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Bell, ChevronRight, Activity, Heart, Wind, User, Settings, MoreVertical, Maximize2, Minimize2, Monitor, Upload, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';

// Mock Socket type for video calls (Firebase real-time will replace this)
type Socket = any;

interface VideoCallProps {
  onEnd: () => void;
  doctorName?: string;
  roomId?: string;
}

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export const VideoCall: React.FC<VideoCallProps> = ({ onEnd, doctorName = "Dr. Dianne Russell", roomId = "room-1" }) => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; message: string; timestamp: Date }>>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const startCall = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasVideo = devices.some(device => device.kind === 'videoinput');
            const hasAudio = devices.some(device => device.kind === 'audioinput');

            if (!hasVideo && !hasAudio) {
                setCameraError(true);
                setConnectionStatus("Device Error");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: hasVideo ? { facingMode: 'user' } : false, 
                audio: hasAudio 
            });
            
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            createPeerConnection();
            stream.getTracks().forEach(track => {
                peerConnection.current?.addTrack(track, stream);
            });
        } catch (err) {
            console.error("Error accessing media devices:", err);
            setCameraError(true);
            setConnectionStatus("Camera/Mic Blocked");
        }
    };

    try {
        // Firebase signaling not wired yet; run in “local preview” mode safely.
        socketRef.current = null;
        setConnectionStatus("Offline Mode");
    } catch (e) {
        setConnectionStatus("Offline Mode");
    }

    startCall();

    return () => {
        if(socketRef.current) socketRef.current.disconnect();
        peerConnection.current?.close();
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  const createPeerConnection = async () => {
      if (peerConnection.current) return;
      
      // Use WebRTC service
      const { webrtcService } = await import('../services/webrtcService');
      
      peerConnection.current = webrtcService.createPeerConnection(
          roomId,
          user?.id || 'user',
          (candidate) => {
              // Send ICE candidate via signaling
              webrtcService.sendSignalingMessage(roomId, {
                  type: 'ice-candidate',
                  from: user?.id || 'user',
                  to: '', // Broadcast
                  data: candidate,
              });
          },
          (stream) => {
              // Handle remote stream
              if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = stream;
                  setConnectionStatus("Connected");
              }
          },
          (state) => {
              setConnectionStatus(state);
          }
      );
  };

  const createOffer = async () => {
      if (!peerConnection.current) createPeerConnection();
      const offer = await peerConnection.current?.createOffer();
      await peerConnection.current?.setLocalDescription(offer);
      socketRef.current?.emit('offer', { offer, roomId });
  };

  const toggleMute = () => {
      const stream = localVideoRef.current?.srcObject as MediaStream;
      if (stream) {
          stream.getAudioTracks().forEach(track => track.enabled = isMuted); 
          setIsMuted(!isMuted);
      }
  };

  const toggleVideo = () => {
      const stream = localVideoRef.current?.srcObject as MediaStream;
      if (stream) {
          stream.getVideoTracks().forEach(track => track.enabled = isVideoOff);
          setIsVideoOff(!isVideoOff);
      }
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        stream.getTracks().forEach(track => {
          peerConnection.current?.addTrack(track, stream);
        });

        stream.getVideoTracks()[0].onended = () => {
          handleStopScreenShare();
        };

        setIsScreenSharing(true);
        notify('Screen sharing started', 'success');
      } else {
        handleStopScreenShare();
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      notify('Failed to share screen. Please try again.', 'error');
    }
  };

  const handleStopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error restoring camera:', error);
    }

    setIsScreenSharing(false);
    notify('Screen sharing stopped', 'info');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      notify(`File ${file.name} shared successfully`, 'success');
      setShowFileUpload(false);
    }
  };

  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: 'You',
      message: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
  };

  const VITALS = [
      { label: 'Resp', value: '18', unit: 'rpm', color: '#10B981', icon: Wind },
      { label: 'HR', value: '72', unit: 'bpm', color: '#EF4444', icon: Heart },
      { label: 'SpO2', value: '98', unit: '%', color: '#3B82F6', icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black flex font-sans overflow-hidden">
      
      {/* Main Video Canvas - Expanded */}
      <div className={`relative transition-all duration-300 ${isSidebarOpen ? 'w-full lg:w-[calc(100%-320px)]' : 'w-full'} h-full bg-black`}>
          <video 
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none"></div>

          {/* Top Bar (Overlay) */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <img src={`https://ui-avatars.com/api/?name=${doctorName}&background=random`} className="w-full h-full rounded-2xl opacity-90" alt="Doctor" />
                  </div>
                  <div>
                      <h2 className="text-white text-xl font-bold shadow-black/50 drop-shadow-md">{doctorName}</h2>
                      <p className="text-white/80 text-xs font-medium flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                          {connectionStatus} • {formatTime(duration)}
                      </p>
                  </div>
              </div>
              <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
              >
                  {isSidebarOpen ? <Maximize2 size={20}/> : <Minimize2 size={20}/>}
              </button>
          </div>

          {/* Local Video (Floating) */}
          <div className="absolute top-24 right-6 w-32 h-48 sm:w-40 sm:h-56 bg-gray-900 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl transition-all hover:scale-105 group z-20">
              {cameraError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-white/50 gap-2">
                      <VideoOff size={24} />
                  </div>
              ) : (
                  <video 
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transform scale-x-[-1] ${isVideoOff ? 'hidden' : ''}`}
                  />
              )}
              {isVideoOff && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white/50">
                      <VideoOff size={24} />
                  </div>
              )}
          </div>

          {/* Bottom Controls - Floating Capsule */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl z-20">
              <button onClick={toggleMute} className={`p-4 rounded-full transition-all ${isMuted ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30'}`} title={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button onClick={toggleVideo} className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30'}`} title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}>
                  {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
              </button>
              <button onClick={handleScreenShare} className={`p-4 rounded-full transition-all ${isScreenSharing ? 'bg-blue-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
                  <Monitor size={24} />
              </button>
              <button onClick={() => setShowFileUpload(!showFileUpload)} className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all" title="Share file">
                  <Upload size={24} />
              </button>
              <button onClick={() => setShowChat(!showChat)} className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all relative" title="Toggle chat">
                  <MessageSquare size={24} />
                  {chatMessages.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-xs font-bold flex items-center justify-center">
                      {chatMessages.length}
                    </span>
                  )}
              </button>
              <div className="w-px h-8 bg-white/20 mx-1"></div>
              <button onClick={() => setShowEndConfirm(true)} className="bg-[#FF4D4D] hover:bg-red-600 text-white p-4 rounded-full shadow-lg shadow-red-600/40 transition-transform hover:scale-110" title="End call">
                  <PhoneOff size={28} fill="currentColor" />
              </button>
          </div>

          {/* File Upload Modal */}
          {showFileUpload && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white dark:bg-[#0F172A] rounded-2xl p-6 shadow-2xl z-50 min-w-[300px] border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Share File</h3>
                <button
                  onClick={() => setShowFileUpload(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                Choose File
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                Share documents, images, or other files during the call
              </p>
            </div>
          )}

          {/* Chat Panel */}
          {showChat && (
            <div className="absolute right-4 top-4 bottom-24 w-80 bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl z-50 border border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white">Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="flex flex-col">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {msg.sender}
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-sm text-gray-900 dark:text-white">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handleSendChatMessage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Sidebar - Compact & Collapsible */}
      <div className={`${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 translate-x-full'} bg-white dark:bg-[#0A0F1C] border-l border-gray-200 dark:border-gray-800 transition-all duration-300 absolute right-0 inset-y-0 z-30 flex flex-col`}>
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white">Session Vitals</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-4 flex items-center gap-4">
                  <div className="relative w-16 h-16">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={[{ value: 69 }, { value: 31 }]} innerRadius={20} outerRadius={28} startAngle={90} endAngle={-270} dataKey="value">
                                  <Cell fill="#3B82F6" /><Cell fill="#E5E7EB" />
                              </Pie>
                          </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">69%</div>
                  </div>
                  <div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">1,236</p>
                      <p className="text-xs text-gray-500 font-bold uppercase">Kcal Burned</p>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  {VITALS.map((vital, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-[#0F172A] rounded-2xl p-3 flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-2">
                              <vital.icon size={16} color={vital.color} />
                              <span className="text-[10px] font-bold text-gray-400 uppercase">{vital.label}</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-gray-900 dark:text-white">{vital.value}</span>
                              <span className="text-[10px] text-gray-500">{vital.unit}</span>
                          </div>
                      </div>
                  ))}
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl p-4 border border-yellow-100 dark:border-yellow-900/20">
                  <h4 className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase mb-2">AI Transcription</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">
                      "Patient mentions mild headaches in the morning. Recommending hydration and reduced screen time..."
                  </p>
              </div>
          </div>
      </div>

                        {/* File Upload Modal */}
                        {showFileUpload && (
                            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white dark:bg-[#0F172A] rounded-2xl p-6 shadow-2xl z-50 min-w-[300px] border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-900 dark:text-white">Share File</h3>
                                    <button
                                        onClick={() => setShowFileUpload(false)}
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <Upload size={18} />
                                    Choose File
                                </button>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                                    Share documents, images, or other files during the call
                                </p>
                            </div>
                        )}

                        {/* Chat Panel */}
                        {showChat && (
                            <div className="absolute right-4 top-4 bottom-20 w-80 bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl z-50 border border-gray-200 dark:border-gray-700 flex flex-col">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 dark:text-white">Chat</h3>
                                    <button
                                        onClick={() => setShowChat(false)}
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {chatMessages.map((msg) => (
                                        <div key={msg.id} className="flex flex-col">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                {msg.sender}
                                            </div>
                                            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
                                                <p className="text-sm text-gray-900 dark:text-white">{msg.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                                        placeholder="Type a message..."
                                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <button
                                        onClick={handleSendChatMessage}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}

                        {showEndConfirm && (
        <div className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><PhoneOff size={32} /></div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">End Call?</h3>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 bg-gray-100 dark:bg-[#0A0F1C] text-gray-700 dark:text-white rounded-xl font-bold text-sm">Cancel</button>
                    <button onClick={onEnd} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg">End Now</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
