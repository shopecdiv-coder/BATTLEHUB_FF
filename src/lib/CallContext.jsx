import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthContext';
import { db } from '@/api/firebaseClient';
import { collection, doc, setDoc, onSnapshot, query, where, updateDoc, deleteDoc, addDoc, getDocs } from 'firebase/firestore';
import { IncomingAudioRing } from './useAudioTones';
import { Phone, PhoneOff } from 'lucide-react';
import toast from 'react-hot-toast';

const CallContext = createContext({});

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    { urls: ['stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302'] },
    // Free TURN servers for NAT traversal (critical for mobile networks)
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 4,
};

// Low-latency video constraints for mobile
const VIDEO_CONSTRAINTS = {
  facingMode: 'user',
  width: { ideal: 480, max: 640 },
  height: { ideal: 360, max: 480 },
  frameRate: { ideal: 24, max: 30 },
};

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
};

// Optimize SDP for low latency - limit bitrate to prevent buffering
function setMediaBitrate(sdp, mediaType, bitrate) {
  const lines = sdp.split('\n');
  let mediaLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('m=' + mediaType)) {
      mediaLineIdx = i;
      break;
    }
  }
  if (mediaLineIdx === -1) return sdp;
  // Find next m= line or end
  let nextMediaIdx = lines.length;
  for (let i = mediaLineIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('m=')) { nextMediaIdx = i; break; }
  }
  // Check if b=AS already exists
  for (let i = mediaLineIdx + 1; i < nextMediaIdx; i++) {
    if (lines[i].startsWith('b=AS:')) {
      lines[i] = 'b=AS:' + bitrate;
      return lines.join('\n');
    }
  }
  // Insert b=AS line after the m= line  
  lines.splice(mediaLineIdx + 1, 0, 'b=AS:' + bitrate);
  return lines.join('\n');
}

function optimizeSdp(sdp) {
  let optimized = sdp;
  optimized = setMediaBitrate(optimized, 'video', 500); // 500 kbps video max
  optimized = setMediaBitrate(optimized, 'audio', 64);  // 64 kbps audio
  return optimized;
}

export function CallProvider({ children }) {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [rejectedCallIds, setRejectedCallIds] = useState(new Set());
  const [facingMode, setFacingMode] = useState('user');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const activeCallRef = useRef(null);
  const pc = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const candidatesUnsubRef = useRef(null);
  const callDocUnsubRef = useRef(null);
  const ringingTimeoutRef = useRef(null);
  const iceRestartTimeoutRef = useRef(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const cleanupWebRTC = useCallback(() => {
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
    if (iceRestartTimeoutRef.current) {
      clearTimeout(iceRestartTimeoutRef.current);
      iceRestartTimeoutRef.current = null;
    }
    if (candidatesUnsubRef.current) {
      try { candidatesUnsubRef.current(); } catch(e) {}
      candidatesUnsubRef.current = null;
    }
    if (callDocUnsubRef.current) {
      try { callDocUnsubRef.current(); } catch(e) {}
      callDocUnsubRef.current = null;
    }
    if (pc.current) {
      pc.current.onicecandidate = null;
      pc.current.ontrack = null;
      pc.current.oniceconnectionstatechange = null;
      pc.current.onconnectionstatechange = null;
      try { pc.current.close(); } catch(e) {}
      pc.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch(e) {}
      });
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setFacingMode('user');
    setIsSpeakerOn(false);
  }, []);

  // Clean stale call docs on mount
  useEffect(() => {
    if (!user) return;
    const cleanOldCalls = async () => {
      try {
        const q1 = query(collection(db, 'calls'), where('caller_id', '==', user.id.toString()));
        const snap1 = await getDocs(q1);
        snap1.docs.forEach(d => {
          const data = d.data();
          if (data.status === 'ended' || data.status === 'rejected' || (Date.now() - (data.created_at || 0) > 60000)) {
            deleteDoc(d.ref).catch(() => {});
          }
        });
        const q2 = query(collection(db, 'calls'), where('recipient_id', '==', user.id.toString()));
        const snap2 = await getDocs(q2);
        snap2.docs.forEach(d => {
          const data = d.data();
          if (data.status === 'ended' || data.status === 'rejected' || (Date.now() - (data.created_at || 0) > 60000)) {
            deleteDoc(d.ref).catch(() => {});
          }
        });
      } catch(e) {
        console.warn("Failed to clean old calls:", e);
      }
    };
    cleanOldCalls();
  }, [user]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'calls'), where('recipient_id', '==', user.id.toString()));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        let foundCall = null;
        snapshot.docs.forEach(docSnap => {
          const callData = docSnap.data();
          if (callData.status === 'ringing' && !rejectedCallIds.has(docSnap.id) && !activeCallRef.current) {
            foundCall = { id: docSnap.id, ...callData };
          }
        });
        if (foundCall) {
          setIncomingCall(foundCall);
        } else {
          setIncomingCall(null);
        }
      } else {
        setIncomingCall(null);
      }
    });
    return () => unsubscribe();
  }, [user, rejectedCallIds]);

  // Setup ICE connection state handler - handles disconnects gracefully
  const setupIceHandlers = useCallback((peerConnection) => {
    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      console.log('[WebRTC] ICE state:', state);
      
      if (state === 'failed') {
        // ICE completely failed - try restart once, then end call
        if (iceRestartTimeoutRef.current) clearTimeout(iceRestartTimeoutRef.current);
        iceRestartTimeoutRef.current = setTimeout(() => {
          if (pc.current && pc.current.iceConnectionState === 'failed') {
            console.log('[WebRTC] ICE failed permanently, ending call');
            endCall();
          }
        }, 5000);
      } else if (state === 'disconnected') {
        // Temporary disconnect - give it 15 seconds to recover (mobile network switches etc.)
        if (iceRestartTimeoutRef.current) clearTimeout(iceRestartTimeoutRef.current);
        iceRestartTimeoutRef.current = setTimeout(() => {
          if (pc.current && pc.current.iceConnectionState === 'disconnected') {
            console.log('[WebRTC] ICE disconnected for too long, ending call');
            endCall();
          }
        }, 15000);
      } else if (state === 'connected' || state === 'completed') {
        // Connection recovered or established - clear any pending timeout
        if (iceRestartTimeoutRef.current) {
          clearTimeout(iceRestartTimeoutRef.current);
          iceRestartTimeoutRef.current = null;
        }
      }
    };
  }, []);

  // Setup ontrack handler - creates new MediaStream for React re-render
  const setupTrackHandler = useCallback((peerConnection) => {
    peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      // Use event.streams[0] directly if available (most efficient)
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        setRemoteStream(event.streams[0]);
      } else {
        // Fallback: Create a fresh MediaStream
        const newStream = new MediaStream();
        peerConnection.getReceivers().forEach(receiver => {
          if (receiver.track) {
            newStream.addTrack(receiver.track);
          }
        });
        remoteStreamRef.current = newStream;
        setRemoteStream(newStream);
      }
    };
  }, []);

  // Listen for call updates when active (caller side - waits for answer)
  useEffect(() => {
    if (!activeCall || activeCall.isGroup) return;

    const unsub = onSnapshot(doc(db, 'calls', activeCall.roomId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'rejected' || data.status === 'ended') {
          endCall();
        } else if (data.status === 'accepted') {
          setActiveCall(prev => prev ? { ...prev, status: 'accepted', accepted_at: prev.accepted_at || Date.now() } : null);
          if (activeCall.isCaller && data.answer && pc.current && !pc.current.remoteDescription) {
            try {
              await pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
              // Process any queued ICE candidates
              if (pc.current.remoteCandidatesQueue && pc.current.remoteCandidatesQueue.length > 0) {
                for (const c of pc.current.remoteCandidatesQueue) {
                  try {
                    await pc.current.addIceCandidate(new RTCIceCandidate(c));
                  } catch(e) {
                    console.warn('[WebRTC] Failed to add queued ICE candidate:', e);
                  }
                }
                pc.current.remoteCandidatesQueue = [];
              }
            } catch(e) {
              console.error("Error setting remote description:", e);
            }
          }
        }
      } else {
        // Call doc was deleted
        cleanupWebRTC();
        setActiveCall(null);
      }
    });

    callDocUnsubRef.current = unsub;
    return () => {
      unsub();
      callDocUnsubRef.current = null;
    };
  }, [activeCall?.roomId, activeCall?.isCaller]);

  const endCall = useCallback(async () => {
    const currentCall = activeCallRef.current;
    // Prevent double-calling
    if (!currentCall && !activeCallRef.current) return;
    
    setActiveCall(null);
    setIncomingCall(null);
    activeCallRef.current = null;
    cleanupWebRTC();
    
    if (currentCall && !currentCall.isGroup) {
      try {
        await updateDoc(doc(db, 'calls', currentCall.roomId), { status: 'ended' });
        
        // Update the call log message with duration if we are the caller
        if (currentCall.isCaller && currentCall.chatContext) {
          const { msgId, collection: collName } = currentCall.chatContext;
          if (msgId && collName) {
            let msgText = `Missed ${currentCall.isVideo ? 'Video' : 'Audio'} Call`;
            if (currentCall.accepted_at) {
              const durationSecs = Math.floor((Date.now() - currentCall.accepted_at) / 1000);
              const m = Math.floor(durationSecs / 60);
              const s = durationSecs % 60;
              msgText = `${currentCall.isVideo ? 'Video' : 'Audio'} Call - ${m}:${s.toString().padStart(2, '0')} mins`;
            }
            try {
               await updateDoc(doc(db, collName, msgId), { message: msgText });
            } catch(e) { console.error("Could not update call log message:", e); }
          }
        }

        setTimeout(() => {
          deleteDoc(doc(db, 'calls', currentCall.roomId)).catch(() => {});
        }, 2000);
      } catch(e) {
        console.warn("Could not update call doc:", e);
      }
    }
  }, [cleanupWebRTC]);

  const initiateCall = useCallback(async (recipient, provider = 'webrtc', isVideo = false, chatContext = null) => {
    if (!user) return;
    if (recipient.isGroup) return alert("Use the Party Voice feature for group calls.");

    const roomId = `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const callDoc = doc(db, 'calls', roomId);

    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection(servers);
      pc.current = peerConnection;
      
      // Get user media with optimized constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: isVideo ? { ...VIDEO_CONSTRAINTS } : false, 
        audio: AUDIO_CONSTRAINTS
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Setup track handler for receiving remote media
      setupTrackHandler(peerConnection);
      
      // Setup ICE connection monitoring (with graceful disconnect handling)
      setupIceHandlers(peerConnection);

      // Collect ICE candidates
      const offerCandidates = collection(callDoc, 'callerCandidates');
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(offerCandidates, event.candidate.toJSON()).catch(console.error);
        }
      };

      // Create and set offer with low-latency SDP
      const offerDescription = await peerConnection.createOffer();
      // Optimize SDP for low latency
      const optimizedOffer = new RTCSessionDescription({
        type: offerDescription.type,
        sdp: optimizeSdp(offerDescription.sdp)
      });
      await peerConnection.setLocalDescription(optimizedOffer);

      // Write call document to Firestore
      await setDoc(callDoc, {
        caller_id: user.id.toString(),
        caller: { id: user.id, ign: user.ign || user.full_name || 'Player', avatar_url: user.avatar_url || null },
        recipient_id: recipient.id.toString(),
        status: 'ringing',
        mode: 'webrtc',
        isVideo: isVideo,
        chatContext: chatContext,
        offer: { sdp: optimizedOffer.sdp, type: optimizedOffer.type },
        created_at: Date.now()
      });

      // Queue for ICE candidates that arrive before remote description is set
      peerConnection.remoteCandidatesQueue = [];

      // Listen for callee's ICE candidates
      candidatesUnsubRef.current = onSnapshot(collection(callDoc, 'calleeCandidates'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (pc.current && pc.current.remoteDescription) {
              pc.current.addIceCandidate(new RTCIceCandidate(data)).catch(e => console.warn('[WebRTC] Add ICE candidate error:', e));
            } else if (pc.current) {
              pc.current.remoteCandidatesQueue.push(data);
            }
          }
        });
      });

      setActiveCall({
        roomId,
        isCaller: true,
        recipient,
        status: 'ringing',
        mode: 'webrtc',
        isVideo,
        chatContext
      });

      // Ringing timeout - auto end after 30 seconds if not accepted
      ringingTimeoutRef.current = setTimeout(() => {
        if (activeCallRef.current?.roomId === roomId && activeCallRef.current?.status === 'ringing') {
          endCall();
        }
      }, 30000);

    } catch (err) {
      console.error("Failed to start call:", err);
      alert("Microphone/Camera permission denied. Please allow access.");
      cleanupWebRTC();
    }
  }, [user, endCall, cleanupWebRTC, setupTrackHandler, setupIceHandlers]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const callData = incomingCall;
    setRejectedCallIds(prev => new Set(prev).add(callData.id));
    setIncomingCall(null);

    const callDoc = doc(db, 'calls', callData.id);

    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection(servers);
      pc.current = peerConnection;
      
      // Get user media with optimized constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: callData.isVideo ? { ...VIDEO_CONSTRAINTS } : false, 
        audio: AUDIO_CONSTRAINTS
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Setup track handler for receiving remote media
      setupTrackHandler(peerConnection);
      
      // Setup ICE connection monitoring
      setupIceHandlers(peerConnection);

      // Collect ICE candidates
      const answerCandidates = collection(callDoc, 'calleeCandidates');
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(answerCandidates, event.candidate.toJSON()).catch(console.error);
        }
      };

      // Set remote description (offer from caller)
      if (callData.offer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
      }
      
      // Create and set answer with low-latency SDP
      const answerDescription = await peerConnection.createAnswer();
      const optimizedAnswer = new RTCSessionDescription({
        type: answerDescription.type,
        sdp: optimizeSdp(answerDescription.sdp)
      });
      await peerConnection.setLocalDescription(optimizedAnswer);

      // Write answer to Firestore
      await updateDoc(callDoc, {
        status: 'accepted',
        answer: { type: optimizedAnswer.type, sdp: optimizedAnswer.sdp }
      });

      // Listen for caller's ICE candidates
      candidatesUnsubRef.current = onSnapshot(collection(callDoc, 'callerCandidates'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (pc.current) {
              pc.current.addIceCandidate(new RTCIceCandidate(data)).catch(e => console.warn('[WebRTC] Add ICE candidate error:', e));
            }
          }
        });
      });

      setActiveCall({ 
        roomId: callData.id, 
        isCaller: false, 
        recipient: callData.caller, 
        status: 'accepted', 
        mode: 'webrtc', 
        isVideo: callData.isVideo, 
        accepted_at: Date.now() 
      });
    } catch (err) {
      console.error("Failed to accept call:", err);
      alert("Error picking up call. Please check permissions.");
      updateDoc(doc(db, 'calls', callData.id), { status: 'rejected' }).catch(() => {});
      cleanupWebRTC();
    }
  }, [incomingCall, endCall, cleanupWebRTC, setupTrackHandler, setupIceHandlers]);

  const rejectCall = useCallback(async () => {
    if (incomingCall) {
      const callData = incomingCall;
      setRejectedCallIds(prev => new Set(prev).add(callData.id));
      setIncomingCall(null);
      updateDoc(doc(db, 'calls', callData.id), { status: 'rejected' }).catch(() => {});
    }
  }, [incomingCall]);

  const flipCamera = useCallback(async () => {
    if (!localStream || !activeCall?.isVideo || !pc.current) return;
    
    try {
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
      const oldVideoTrack = localStream.getVideoTracks()[0];
      
      // Stop current track to free up hardware
      if (oldVideoTrack) oldVideoTrack.stop();
      
      // Give hardware a moment to release
      await new Promise(resolve => setTimeout(resolve, 100));

      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: newFacingMode }, width: { ideal: 480, max: 640 }, height: { ideal: 360, max: 480 }, frameRate: { ideal: 24, max: 30 } }
        });
      } catch (err) {
        console.warn("Exact constraints failed, trying ideal:", err);
        newStream = await navigator.mediaDevices.getUserMedia({
           video: { facingMode: newFacingMode }
        });
      }
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace track on the RTCPeerConnection
      const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }
      
      // Build a new MediaStream with the new video + existing audio
      const audioTracks = localStream.getAudioTracks();
      const updatedStream = new MediaStream([newVideoTrack, ...audioTracks]);
      
      // Update all refs and state
      localStreamRef.current = updatedStream;
      setFacingMode(newFacingMode);
      setLocalStream(updatedStream);
    } catch (error) {
      console.error("Failed to flip camera:", error);
      toast.error("Failed to switch camera!");
    }
  }, [localStream, activeCall, facingMode]);

  const toggleSpeaker = useCallback(async (audioElementRef) => {
    try {
      const newSpeakerState = !isSpeakerOn;
      setIsSpeakerOn(newSpeakerState);
      
      if (audioElementRef?.current && typeof audioElementRef.current.setSinkId === 'function') {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        
        if (audioOutputs.length > 1) {
          let targetDevice;
          if (newSpeakerState) {
            targetDevice = audioOutputs.find(d => d.label.toLowerCase().includes('speaker')) || audioOutputs[1];
          } else {
            targetDevice = audioOutputs.find(d => d.label.toLowerCase().includes('earpiece') || d.label.toLowerCase().includes('phone')) || audioOutputs[0];
          }
          if (targetDevice) {
            await audioElementRef.current.setSinkId(targetDevice.deviceId);
          }
        }
      }
    } catch (e) {
      console.error("Failed to toggle speaker:", e);
    }
  }, [isSpeakerOn]);

  // Fix: endCall needs to be available in setupIceHandlers
  // We use a ref to break the circular dependency
  const endCallRef = useRef(endCall);
  useEffect(() => { endCallRef.current = endCall; }, [endCall]);

  return (
    <CallContext.Provider value={{
      activeCall, incomingCall, initiateCall, endCall, acceptCall, rejectCall, 
      localStream, remoteStream, flipCamera, toggleSpeaker, isSpeakerOn, facingMode
    }}>
      {children}
      {/* Incoming Call Overlay - Bulletproof Portal */}
      {incomingCall && !activeCall && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[2147483647] bg-black/90 flex items-center justify-center p-4"
          style={{ pointerEvents: 'auto' }}
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          <IncomingAudioRing />
          <div className="bg-[#111116] border border-gray-800 rounded-2xl p-6 text-center max-w-sm w-full relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[#00FFFF]/5 animate-pulse" />
            
            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto bg-gray-800 rounded-full mb-4 overflow-hidden border-2 border-[#00FFFF] shadow-[0_0_15px_rgba(0,255,255,0.3)] pointer-events-none">
                {incomingCall.caller?.avatar_url ? (
                  <img src={incomingCall.caller.avatar_url} alt="Caller" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
                    {incomingCall.caller?.ign?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 pointer-events-none">
                {incomingCall.caller?.ign || 'Unknown'}
              </h3>
              <p className="text-gray-400 mb-8 animate-pulse pointer-events-none">
                Incoming {incomingCall.isVideo ? 'Video' : 'Audio'} Call...
              </p>
              
              <div className="flex justify-center gap-6">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); rejectCall(); }}
                  onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); rejectCall(); }}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] active:bg-red-700 active:scale-90 transition-transform select-none"
                >
                  <PhoneOff className="w-7 h-7 pointer-events-none" />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); acceptCall(); }}
                  onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); acceptCall(); }}
                  className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] active:bg-green-700 active:scale-90 transition-transform animate-pulse select-none"
                >
                  <Phone className="w-7 h-7 pointer-events-none" />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
