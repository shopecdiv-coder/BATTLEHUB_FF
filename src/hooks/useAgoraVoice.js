import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/api/firebaseClient';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

export function useAgoraVoice({ partyId, user, partyMembers = [] }) {
  const [joined, setJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState({});
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteVideoTracks, setRemoteVideoTracks] = useState({});

  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const isMountedRef = useRef(true);

  const appId = import.meta.env.VITE_AGORA_APP_ID;

  // Listen for remote mute/video commands from Party Leader
  useEffect(() => {
    if (!partyId || !user) return;
    const unsub = onSnapshot(doc(db, 'parties', partyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const myState = data.voice_states?.[user.id];
        if (myState) {
          if (myState.muted !== undefined) {
            if (myState.muted && !remoteMuted) {
              setRemoteMuted(true);
              setIsMuted(true);
              if (localAudioTrackRef.current) {
                localAudioTrackRef.current.setEnabled(false);
              }
              toast.error("You have been muted by the Party Leader", { duration: 3000 });
            } else if (!myState.muted && remoteMuted) {
              setRemoteMuted(false);
              toast.success("Party Leader unmuted you", { duration: 3000 });
            }
          }
          if (myState.videoOff !== undefined) {
            if (myState.videoOff && !remoteVideoOff) {
              setRemoteVideoOff(true);
              if (localVideoTrackRef.current) {
                 clientRef.current?.unpublish(localVideoTrackRef.current).catch(e => console.error(e));
                 localVideoTrackRef.current.close();
                 localVideoTrackRef.current = null;
                 setIsVideoOn(false);
              }
              toast.error("Your camera was turned off by the Party Leader", { duration: 3000 });
            } else if (!myState.videoOff && remoteVideoOff) {
              setRemoteVideoOff(false);
              toast.success("Party Leader allowed camera access", { duration: 3000 });
            }
          }
        }
      }
    });
    return () => unsub();
  }, [partyId, user, remoteMuted, remoteVideoOff]);

  // Initialize Agora and join the channel
  useEffect(() => {
    let isActive = true;
    isMountedRef.current = true;
    
    // Only attempt to connect if we have all required data
    if (!partyId || !user || !appId) {
      setJoined(false);
      return;
    }

    const initAgora = async () => {
      try {
        toast.loading("Connecting to Voice Chat...", { id: "agora-conn" });
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        // Enable volume indicator to track active speakers
        client.enableAudioVolumeIndicator();

        client.on("user-published", async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === "audio") {
            remoteUser.audioTrack?.play();
          }
          if (mediaType === "video") {
            setRemoteVideoTracks(prev => ({
              ...prev,
              [remoteUser.uid]: remoteUser.videoTrack
            }));
          }
        });

        client.on("user-unpublished", (remoteUser, mediaType) => {
          if (mediaType === "video") {
            setRemoteVideoTracks(prev => {
              const newState = { ...prev };
              delete newState[remoteUser.uid];
              return newState;
            });
          }
        });

        client.on("user-left", (remoteUser) => {
          setRemoteVideoTracks(prev => {
            const newState = { ...prev };
            delete newState[remoteUser.uid];
            return newState;
          });
        });

        client.on("volume-indicator", (volumes) => {
          if (!isActive) return;
          const speakers = {};
          volumes.forEach((vol) => {
            if (vol.level > 5) { // Threshold for speaking
              speakers[vol.uid] = true;
            }
          });
          setActiveSpeakers(speakers);
        });

        // The channel name is the partyId. We pass the user ID as string for the UID.
        // Note: Agora Web SDK UID must be an integer or string. We use the user.id as string.
        await client.join(appId, partyId, null, user.id.toString());
        
        if (!isActive) {
          // If unmounted while joining, immediately leave
          client.leave();
          return;
        }

        let localAudioTrack = null;
        try {
          if (Capacitor.isNativePlatform()) {
             // Request permissions natively on Android/iOS via cordova plugin
             if (window.cordova?.plugins?.permissions) {
                const permissions = window.cordova.plugins.permissions;
                await new Promise((resolve) => {
                   permissions.requestPermission(permissions.RECORD_AUDIO, resolve, resolve);
                });
                await new Promise((resolve) => {
                   permissions.requestPermission(permissions.CAMERA, resolve, resolve);
                });
             }
          }
          toast.loading("Requesting microphone...", { id: "agora-conn" });
          localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        } catch (micErr) {
          console.warn("Microphone access failed:", micErr);
          toast.error("Microphone access denied. You can still listen, watch, or share screen.", { id: "agora-conn", duration: 4000 });
        }
        
        if (!isActive) {
          if (localAudioTrack) localAudioTrack.close();
          client.leave();
          return;
        }

        if (localAudioTrack) {
          localAudioTrackRef.current = localAudioTrack;
          localAudioTrack.setEnabled(false); // start muted
          await client.publish([localAudioTrack]);
        }
        
        if (isActive) {
          setJoined(true);
          toast.success("Connected to Party!", { id: "agora-conn" });
        }
      } catch (err) {
        if (isActive) {
          console.error("Agora init error:", err);
          // Don't show toast for OPERATION_ABORTED if it somehow slipped through
          if (err?.code !== 'OPERATION_ABORTED') {
            toast.error(`Agora Error: ${err.message || 'Failed to connect'}`, { id: "agora-conn" });
          }
        }
      }
    };

    initAgora();

    return () => {
      isActive = false;
      isMountedRef.current = false;
      const cleanup = async () => {
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
        }
        if (localVideoTrackRef.current) {
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
        }
        if (clientRef.current) {
          await clientRef.current.leave();
          clientRef.current = null;
        }
      };
      cleanup();
    };
  }, [partyId, user, appId]);

  const toggleMic = useCallback(async () => {
    if (remoteMuted) {
      toast.error("You are muted by the Party Leader");
      return;
    }
    if (!joined) {
      toast.error("Still connecting to voice chat...");
      return;
    }
    
    if (localAudioTrackRef.current) {
      const newState = !isMuted;
      localAudioTrackRef.current.setEnabled(!newState);
      setIsMuted(newState);
      if (!newState) {
        toast.success("Mic is ON", { id: "voice-connect" });
      } else {
        toast.success("Mic is OFF", { id: "voice-connect" });
      }
    } else {
       toast.error("Microphone not available.");
    }
  }, [isMuted, remoteMuted, joined]);

  const muteUserRemotely = useCallback(async (targetUserId, muteState) => {
    if (!partyId) return;
    try {
      await updateDoc(doc(db, 'parties', partyId), {
        [`voice_states.${targetUserId}.muted`]: muteState
      });
      toast.success(muteState ? "User Muted" : "User Unmuted");
    } catch (err) {
      console.error("Failed to remote mute:", err);
      toast.error("Failed to update user's mic status");
    }
  }, [partyId]);

  const disableVideoRemotely = useCallback(async (targetUserId, videoState) => {
    if (!partyId) return;
    try {
      await updateDoc(doc(db, 'parties', partyId), {
        [`voice_states.${targetUserId}.videoOff`]: videoState
      });
      toast.success(videoState ? "User Camera Disabled" : "User Camera Access Enabled");
    } catch (err) {
      console.error("Failed to remote disable video:", err);
      toast.error("Failed to update user's camera status");
    }
  }, [partyId]);

  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  useEffect(() => {
    AgoraRTC.getCameras().then(devices => {
      setCameras(devices);
    }).catch(e => console.error("Failed to get cameras", e));
  }, []);

  const setVoiceEffect = useCallback((effectPreset) => {
    if (localAudioTrackRef.current) {
      try {
        if (typeof localAudioTrackRef.current.setAudioEffectPreset === 'function') {
          if (effectPreset === 'OFF') {
            localAudioTrackRef.current.setAudioEffectPreset(0);
          } else {
            localAudioTrackRef.current.setAudioEffectPreset(effectPreset);
          }
          toast.success(`Voice effect changed`);
        } else {
          toast.error("Voice filters require the Agora Voice Extension on Web.", { duration: 4000 });
        }
      } catch (err) {
        console.error("Voice effect error:", err);
        toast.error("Failed to apply voice effect");
      }
    } else {
      toast.error("Microphone not active");
    }
  }, []);

  const flipCamera = useCallback(async () => {
    if (!localVideoTrackRef.current) return toast.error("Camera is not ON");
    if (cameras.length <= 1) return toast.error("No other cameras found");
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    try {
      await localVideoTrackRef.current.setDevice(cameras[nextIndex].deviceId);
      setCurrentCameraIndex(nextIndex);
      toast.success("Camera switched");
    } catch (err) {
      console.error("Camera switch failed", err);
      toast.error("Failed to switch camera");
    }
  }, [cameras, currentCameraIndex]);

  const toggleVideo = useCallback(async () => {
    if (!joined || !clientRef.current) return toast.error("Not connected to party");
    if (!isVideoOn && remoteVideoOff) return toast.error("Camera access is disabled by admin");
    try {
      if (isVideoOn) {
        // Turn off video
        if (localVideoTrackRef.current) {
          await clientRef.current.unpublish(localVideoTrackRef.current);
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
        }
        setIsVideoOn(false);
        toast.success("Camera turned off");
      } else {
        // Turn on video
        if (isScreenSharing) {
          // Unpublish screen share first
          await toggleScreenShare();
        }
        
        if (Capacitor.isNativePlatform()) {
           if (window.cordova?.plugins?.permissions) {
              const permissions = window.cordova.plugins.permissions;
              await new Promise((resolve) => {
                 permissions.requestPermission(permissions.CAMERA, resolve, resolve);
              });
           }
        }
        
        toast.loading("Starting camera...", { id: "video-toast" });
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoTrackRef.current = videoTrack;
        await clientRef.current.publish(videoTrack);
        setIsVideoOn(true);
        toast.success("Camera is ON", { id: "video-toast" });
      }
    } catch (err) {
      console.error("Camera error", err);
      toast.error("Failed to start camera", { id: "video-toast" });
    }
  }, [joined, isVideoOn, isScreenSharing, remoteVideoOff]);

  const toggleScreenShare = useCallback(async () => {
    if (!joined || !clientRef.current) return toast.error("Not connected to party");
    
    // Check if on native mobile app (Capacitor)
    if (Capacitor.isNativePlatform()) {
      return toast.error("Screen sharing is only supported on PC/Desktop browsers.", { duration: 4000 });
    }

    try {
      if (isScreenSharing) {
        // Turn off screen share
        if (localVideoTrackRef.current) {
          await clientRef.current.unpublish(localVideoTrackRef.current);
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
        }
        setIsScreenSharing(false);
        toast.success("Screen sharing stopped");
      } else {
        // Turn on screen share
        if (isVideoOn) {
          await toggleVideo();
        }
        toast.loading("Starting screen share...", { id: "screen-toast" });
        const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
        // screenTrack might be an array if audio is enabled, but we passed "disable" for audio.
        // It returns a single video track.
        localVideoTrackRef.current = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack;
        
        // Handle stop sharing from browser UI
        localVideoTrackRef.current.on("track-ended", async () => {
          if (localVideoTrackRef.current) {
            await clientRef.current.unpublish(localVideoTrackRef.current);
            localVideoTrackRef.current.close();
            localVideoTrackRef.current = null;
          }
          setIsScreenSharing(false);
          toast.success("Screen sharing stopped");
        });

        await clientRef.current.publish(localVideoTrackRef.current);
        setIsScreenSharing(true);
        toast.success("Screen sharing started", { id: "screen-toast" });
      }
    } catch (err) {
      console.error("Screen share error", err);
      toast.error("Failed to start screen share", { id: "screen-toast" });
    }
  }, [joined, isScreenSharing, isVideoOn]);

  return {
    toggleMic,
    isMuted,
    activeSpeakers,
    muteUserRemotely,
    disableVideoRemotely,
    remoteVideoOff,
    joined,
    setVoiceEffect,
    toggleVideo,
    isVideoOn,
    toggleScreenShare,
    isScreenSharing,
    remoteVideoTracks,
    localVideoTrack: localVideoTrackRef.current,
    flipCamera,
    cameras
  };
}
