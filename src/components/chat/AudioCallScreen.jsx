import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useCall } from '@/lib/CallContext';
import { useAuth } from '@/lib/AuthContext';
import { Phone, Mic, MicOff, Video, VideoOff, PhoneOff, RefreshCcw, Volume2, Volume1 } from 'lucide-react';
import { motion } from 'framer-motion';

// Bulletproof Portal: Mounts to document.body and stops ALL event propagation
function CallPortal({ children }) {
  if (typeof window === 'undefined') return null;
  return createPortal(
    <div 
      className="fixed inset-0 z-[2147483647]"
      style={{ pointerEvents: 'auto' }}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

export default function AudioCallScreen() {
  const { 
    activeCall, endCall, incomingCall, acceptCall, rejectCall, 
    localStream, remoteStream, flipCamera, toggleSpeaker, isSpeakerOn, facingMode
  } = useCall();
  const { user } = useAuth();
  
  const localVideoFsRef = useRef(null);
  const localVideoPipRef = useRef(null);
  const remoteVideoFsRef = useRef(null);
  const remoteVideoPipRef = useRef(null);
  const audioRef = useRef(null);
  const constraintsRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isLocalLarge, setIsLocalLarge] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const timerRef = useRef(null);
  
  const isCallerRinging = activeCall?.isCaller && !activeCall?.isGroup && activeCall?.status === 'ringing';
  const isCallConnected = activeCall && activeCall.status === 'accepted';

  // Call timer
  useEffect(() => {
    if (isCallConnected) {
      setCallDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallConnected]);

  // Reset mute and video state when a new call connects
  useEffect(() => {
    if (activeCall?.roomId) {
      setIsMuted(false);
      setIsVideoOn(true);
      setIsLocalLarge(false);
      setShowControls(true);
    }
  }, [activeCall?.roomId]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Attach local stream to video elements
  // Uses a callback ref pattern for reliability
  const attachLocalStream = useCallback(() => {
    if (!localStream || !activeCall?.isVideo) return;
    
    if (localVideoFsRef.current && localVideoFsRef.current.srcObject !== localStream) {
      localVideoFsRef.current.srcObject = localStream;
      localVideoFsRef.current.play().catch(() => {});
    }
    if (localVideoPipRef.current && localVideoPipRef.current.srcObject !== localStream) {
      localVideoPipRef.current.srcObject = localStream;
      localVideoPipRef.current.play().catch(() => {});
    }
  }, [localStream, activeCall?.isVideo]);

  // Attach remote stream to video/audio elements
  const attachRemoteStream = useCallback(() => {
    if (!remoteStream) return;
    
    if (activeCall?.isVideo) {
      if (remoteVideoFsRef.current && remoteVideoFsRef.current.srcObject !== remoteStream) {
        remoteVideoFsRef.current.srcObject = remoteStream;
        remoteVideoFsRef.current.play().catch(() => {});
      }
      if (remoteVideoPipRef.current && remoteVideoPipRef.current.srcObject !== remoteStream) {
        remoteVideoPipRef.current.srcObject = remoteStream;
        remoteVideoPipRef.current.play().catch(() => {});
      }
    }
    if (audioRef.current && audioRef.current.srcObject !== remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch(() => {});
    }
  }, [remoteStream, activeCall?.isVideo]);

  // Trigger stream attachment whenever streams or connection status changes
  useEffect(() => {
    attachLocalStream();
  }, [attachLocalStream, isCallConnected]);

  useEffect(() => {
    attachRemoteStream();
  }, [attachRemoteStream, isCallConnected]);

  // Also re-attach when isLocalLarge changes (because hidden elements lose their srcObject)
  useEffect(() => {
    attachLocalStream();
    attachRemoteStream();
  }, [isLocalLarge]);

  const toggleMute = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoOn(track.enabled);
      }
    }
  };

  // Sync video state when stream changes (e.g. after camera flip)
  useEffect(() => {
    if (localStream && activeCall?.isVideo) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) setIsVideoOn(videoTrack.enabled);
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) setIsMuted(!audioTrack.enabled);
    }
  }, [localStream, activeCall?.isVideo]);

  if (!activeCall) return null;

  // =================== CALLER RINGING ===================
  if (isCallerRinging) {
    return (
      <CallPortal>
        <div className="w-full h-full bg-black flex items-center justify-center p-4">
          <div className="bg-[#111116] border border-gray-800 rounded-2xl p-6 text-center max-w-sm w-full relative overflow-hidden">
            <div className="absolute inset-0 bg-[#00FFFF]/5 animate-pulse" />
            
            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto bg-gray-800 rounded-full mb-4 overflow-hidden border-2 border-gray-600 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {activeCall.recipient?.avatar_url ? (
                  <img src={activeCall.recipient.avatar_url} alt="Recipient" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
                    {activeCall.recipient?.ign?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{activeCall.recipient?.ign || 'User'}</h3>
              <p className="text-gray-400 mb-8 flex items-center justify-center gap-2">
                Calling <span className="flex space-x-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span>
              </p>
              
              <div className="flex justify-center">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); endCall(); }}
                  onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); endCall(); }}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white active:bg-red-700 active:scale-90 shadow-[0_0_20px_rgba(239,68,68,0.5)] select-none"
                >
                  <PhoneOff className="w-7 h-7 pointer-events-none" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </CallPortal>
    );
  }

  // =================== CALL CONNECTED ===================
  if (isCallConnected) {
    return (
      <CallPortal>
        <div className="w-full h-full bg-black relative flex flex-col overflow-hidden" ref={constraintsRef}>
          {/* Hidden audio element - always present for remote audio */}
          <audio ref={audioRef} autoPlay playsInline />

          {/* Video / Avatar Area - Full Screen */}
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer z-0 bg-gray-900"
            onClick={() => setShowControls(prev => !prev)}
          >
            {activeCall.isVideo ? (
              <>
                {/* Full Screen Videos */}
                <video 
                  ref={remoteVideoFsRef} 
                  autoPlay playsInline disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback"
                  style={{ willChange: 'transform' }}
                  className={`w-full h-full object-cover ${isLocalLarge ? 'hidden' : 'block'}`}
                />
                <video 
                  ref={localVideoFsRef} 
                  autoPlay playsInline muted disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback"
                  style={{ willChange: 'transform' }}
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''} ${!isLocalLarge ? 'hidden' : 'block'}`}
                />
                
                {showControls && (
                  <div className="absolute top-12 left-6 bg-black/50 px-3 py-1 rounded-full z-50 border border-white/10 backdrop-blur-sm transition-opacity pointer-events-none">
                    <p className="text-white font-mono text-sm tracking-wider">
                      {formatTime(callDuration)}
                    </p>
                  </div>
                )}
                
                {/* Framer Motion Draggable PIP */}
                <motion.div 
                  drag 
                  dragConstraints={constraintsRef}
                  dragMomentum={false}
                  dragElastic={0}
                  className="absolute right-6 top-12 w-28 h-40 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700/50 z-50 cursor-move pointer-events-auto bg-gray-800"
                  onClick={(e) => { e.stopPropagation(); setIsLocalLarge(prev => !prev); setShowControls(true); }}
                >
                  <video 
                    ref={remoteVideoPipRef} 
                    autoPlay playsInline disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback"
                    className={`w-full h-full object-cover pointer-events-none ${!isLocalLarge ? 'hidden' : 'block'}`}
                  />
                  <video 
                    ref={localVideoPipRef} 
                    autoPlay playsInline muted disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback"
                    className={`w-full h-full object-cover pointer-events-none ${facingMode === 'user' ? 'transform -scale-x-100' : ''} ${isLocalLarge ? 'hidden' : 'block'}`}
                  />
                </motion.div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900">
                <div className="w-32 h-32 bg-gray-800 rounded-full overflow-hidden border-4 border-cyan-500/50 mb-6 shadow-[0_0_30px_rgba(0,255,255,0.2)]">
                  {activeCall.recipient?.avatar_url ? (
                    <img src={activeCall.recipient.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-500">
                      {activeCall.recipient?.ign?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {activeCall.recipient?.ign || 'User'}
                </h2>
                <p className="text-cyan-400 mt-2 font-mono text-lg">{formatTime(callDuration)}</p>
              </div>
            )}
          </div>

          {/* Controls Overlay - Floating at the bottom */}
          <div className={`absolute bottom-0 left-0 right-0 p-8 flex items-center justify-center gap-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-10 z-50 transition-transform duration-300 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
            
            {/* 1. Leftmost Button: Speaker (Audio) or Flip (Video) */}
            {!activeCall.isVideo ? (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleSpeaker(audioRef); }}
                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleSpeaker(audioRef); }}
                className={`w-14 h-14 rounded-full flex items-center justify-center select-none backdrop-blur-md transition-all ${
                  !isSpeakerOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6 pointer-events-none" /> : <Volume1 className="w-6 h-6 pointer-events-none" />}
              </button>
            ) : (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); flipCamera(); }}
                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); flipCamera(); }}
                className="w-14 h-14 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center select-none backdrop-blur-md transition-all"
              >
                <RefreshCcw className="w-6 h-6 pointer-events-none" />
              </button>
            )}

            {/* 2. Mic Mute Button (Both Audio & Video) */}
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleMute(); }}
              className={`w-14 h-14 rounded-full flex items-center justify-center select-none backdrop-blur-md transition-all ${
                isMuted ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6 pointer-events-none" /> : <Mic className="w-6 h-6 pointer-events-none" />}
            </button>

            {/* 3. Video Toggle (Video Only) */}
            {activeCall.isVideo && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleVideo(); }}
                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleVideo(); }}
                className={`w-14 h-14 rounded-full flex items-center justify-center select-none backdrop-blur-md transition-all ${
                  !isVideoOn ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {!isVideoOn ? <VideoOff className="w-6 h-6 pointer-events-none" /> : <Video className="w-6 h-6 pointer-events-none" />}
              </button>
            )}

            {/* 4. End Call Button */}
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); endCall(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); endCall(); }}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white active:scale-90 shadow-[0_0_20px_rgba(239,68,68,0.5)] select-none transition-transform"
            >
              <PhoneOff className="w-7 h-7 pointer-events-none" />
            </button>
          </div>
        </div>
      </CallPortal>
    );
  }

  return null;
}
