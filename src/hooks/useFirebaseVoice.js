import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/api/firebaseClient';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
};

export function useFirebaseVoice({ partyId, user, partyMembers = [] }) {
  const [joined, setJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState({});
  
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); 
  const audioElementsRef = useRef({});
  const containerRef = useRef(null);
  const analysersRef = useRef({});
  const animationFrameRef = useRef(null);
  const unsubsRef = useRef({});

  useEffect(() => {
    if (!partyId || !user) return;
    const unsub = onSnapshot(doc(db, 'parties', partyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const myState = data.voice_states?.[user.id];
        if (myState && myState.muted !== undefined) {
          if (myState.muted && !remoteMuted) {
            setRemoteMuted(true);
            setIsMuted(true);
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach(t => t.enabled = false);
            }
            toast.error("You have been muted by the Party Leader", { duration: 3000 });
          } else if (!myState.muted && remoteMuted) {
            setRemoteMuted(false);
            toast.success("Party Leader unmuted you", { duration: 3000 });
          }
        }
      }
    });
    return () => unsub();
  }, [partyId, user, remoteMuted]);

  useEffect(() => {
    if (!document.getElementById('firebase-audio-container')) {
      const div = document.createElement('div');
      div.id = 'firebase-audio-container';
      div.style.display = 'none';
      document.body.appendChild(div);
      containerRef.current = div;
    } else {
      containerRef.current = document.getElementById('firebase-audio-container');
    }
  }, []);

  useEffect(() => {
    if (!partyId || !user) {
      setJoined(false);
      return;
    }
    
    setJoined(true);
    const partyDocRef = doc(db, 'parties', partyId);

    const setupSignaling = async (peerId) => {
      if (unsubsRef.current[peerId]) return;

      const isCaller = user.id < peerId;
      const docId = [user.id, peerId].sort().join('_');

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[peerId] = pc;

      const dummyStream = new MediaStream();
      pc.addTransceiver('audio', { direction: 'sendrecv', streams: [dummyStream] });

      const waitForIce = () => new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
          return;
        }
        const timeout = setTimeout(() => {
          resolve();
        }, 3000);
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        };
      });

      pc.ontrack = (event) => {
        const track = event.track;
        let stream = event.streams[0];
        if (!stream) {
          stream = new MediaStream([track]);
        }

        if (!audioElementsRef.current[peerId]) {
          const audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.srcObject = stream;
          containerRef.current.appendChild(audioEl);
          audioElementsRef.current[peerId] = audioEl;
          audioEl.play().catch(e => console.warn('Audio play blocked:', e));

          try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analysersRef.current[peerId] = { analyser, dataArray: new Uint8Array(analyser.frequencyBinCount) };
          } catch(err) {
            console.error("AudioContext error:", err);
          }
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIce();
        
        // Write offer directly to the party document
        await setDoc(partyDocRef, { 
          webrtc_signaling: {
            [docId]: {
              offer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
              answer: null
            }
          }
        }, { merge: true }).catch(err => {
          console.error("Signaling error:", err);
        });

        const unsub = onSnapshot(partyDocRef, async (snap) => {
          const data = snap.data();
          const signal = data?.webrtc_signaling?.[docId];
          if (signal?.answer && pc.signalingState !== 'closed') {
            try {
              const answerDesc = new RTCSessionDescription(signal.answer);
              if (pc.currentRemoteDescription === null) {
                await pc.setRemoteDescription(answerDesc);
              }
            } catch(e) {}
          }
        });
        
        unsubsRef.current[peerId] = unsub;

      } else {
        const unsub = onSnapshot(partyDocRef, async (snap) => {
          const data = snap.data();
          const signal = data?.webrtc_signaling?.[docId];
          if (signal?.offer && pc.signalingState !== 'closed') {
            try {
              const offerDesc = new RTCSessionDescription(signal.offer);
              if (pc.currentRemoteDescription === null) {
                await pc.setRemoteDescription(offerDesc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await waitForIce();
                
                await setDoc(partyDocRef, { 
                  webrtc_signaling: {
                    [docId]: {
                      answer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }
                    }
                  }
                }, { merge: true }).catch(err => {
                  console.error("Signaling error:", err);
                });
              }
            } catch (e) {}
          }
        });
        
        unsubsRef.current[peerId] = unsub;
      }
    };

    partyMembers.forEach(member => {
      if (member.id !== user.id) {
        setupSignaling(member.id);
      }
    });

    const currentMemberIds = partyMembers.map(m => m.id);
    Object.keys(peerConnectionsRef.current).forEach(peerId => {
      if (!currentMemberIds.includes(peerId)) {
        if (peerConnectionsRef.current[peerId]) {
          peerConnectionsRef.current[peerId].close();
          delete peerConnectionsRef.current[peerId];
        }
        if (audioElementsRef.current[peerId]) {
          audioElementsRef.current[peerId].remove();
          delete audioElementsRef.current[peerId];
        }
        if (unsubsRef.current[peerId]) {
          unsubsRef.current[peerId]();
          delete unsubsRef.current[peerId];
        }
        if (analysersRef.current[peerId]) {
          delete analysersRef.current[peerId];
        }
      }
    });

    const checkAudioLevels = () => {
      let changed = false;
      setActiveSpeakers(prev => {
        const next = { ...prev };
        Object.keys(analysersRef.current).forEach(peerId => {
          const { analyser, dataArray } = analysersRef.current[peerId];
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const isSpeaking = avg > 15; 
          
          if (next[peerId] !== isSpeaking) {
            next[peerId] = isSpeaking;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      animationFrameRef.current = requestAnimationFrame(checkAudioLevels);
    };
    
    if (!animationFrameRef.current) {
      checkAudioLevels();
    }

  }, [partyId, user, partyMembers]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      Object.values(unsubsRef.current).forEach(unsub => unsub());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      Object.values(audioElementsRef.current).forEach(el => el.remove());
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const toggleMic = useCallback(async () => {
    if (remoteMuted) {
      toast.error("You cannot unmute because the Leader has muted you.");
      return;
    }
    
    if (!joined) {
      toast.error("Still connecting to voice server... please wait a second.", { id: "voice-connect" });
      return;
    }

    if (!localStreamRef.current) {
      try {
        toast.loading("Connecting to microphone...", { id: "voice-connect" });
        if (!navigator.mediaDevices) {
          throw new Error("HTTPS_REQUIRED");
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        
        const audioTrack = stream.getAudioTracks()[0];
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track === null || s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(audioTrack).catch(e => console.error(e));
          } else {
             pc.addTrack(audioTrack, stream);
          }
        });

        setIsMuted(false);
        toast.success("Mic is ON", { id: "voice-connect" });
      } catch (err) {
        console.error("Error creating/publishing stream:", err);
        localStreamRef.current = null;
        if (err.message === "HTTPS_REQUIRED") {
          toast.error("Microphone access blocked! You must use 'localhost' or an 'HTTPS' URL for WebRTC to work.", { id: "voice-connect", duration: 6000 });
        } else {
          toast.error("Failed to connect microphone. Please try again.", { id: "voice-connect" });
        }
      }
    } else {
      const newMutedState = !isMuted;
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
    }
  }, [isMuted, remoteMuted, joined]);

  const muteUserRemotely = useCallback(async (targetUserId, muteState) => {
    if (!partyId) return;
    try {
      await setDoc(doc(db, 'parties', partyId), {
        voice_states: {
          [targetUserId]: { muted: muteState }
        }
      }, { merge: true });
    } catch (e) {
      console.error("Error setting remote mute:", e);
    }
  }, [partyId]);

  return {
    joined,
    isMuted,
    remoteMuted,
    activeSpeakers,
    toggleMic,
    muteUserRemotely
  };
}
