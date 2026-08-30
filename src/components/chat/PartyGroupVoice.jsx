import React, { useRef, useEffect, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Mic, MicOff, PhoneOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function PartyGroupVoice({ partyId, user, onLeave }) {
  const [joined, setJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [participants, setParticipants] = useState([]);
  
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  
  const appId = import.meta.env.VITE_AGORA_APP_ID;

  useEffect(() => {
    if (!partyId || !user) return;
    if (!appId) {
      console.warn("Agora App ID is missing. Group voice is disabled.");
      return;
    }

    let isMounted = true;

    const initAgora = async () => {
      try {
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        client.on("user-published", async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === "audio") {
             remoteUser.audioTrack?.play();
          }
          setParticipants(prev => {
             if(prev.find(p => p.uid === remoteUser.uid)) return prev;
             return [...prev, remoteUser];
          });
        });

        client.on("user-unpublished", (remoteUser) => {
          setParticipants(prev => prev.filter(p => p.uid !== remoteUser.uid));
        });

        client.on("user-left", (remoteUser) => {
          setParticipants(prev => prev.filter(p => p.uid !== remoteUser.uid));
        });

        // Use partyId as channel name
        await client.join(appId, partyId, null, user.id.toString());
        
        // Create local audio track
        const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = localAudioTrack;
        localAudioTrack.setEnabled(false); // start muted
        
        await client.publish([localAudioTrack]);
        
        if (isMounted) {
          setJoined(true);
        }
      } catch (err) {
        console.error("Agora init error:", err);
      }
    };

    initAgora();

    return () => {
      isMounted = false;
      const cleanup = async () => {
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.close();
        }
        if (clientRef.current) {
          await clientRef.current.leave();
        }
      };
      cleanup();
    };
  }, [partyId, user, appId]);

  const toggleMute = () => {
    if (localAudioTrackRef.current) {
      const newState = !isMuted;
      localAudioTrackRef.current.setEnabled(!newState);
      setIsMuted(newState);
    }
  };

  const handleLeave = async () => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.close();
    }
    if (clientRef.current) {
      await clientRef.current.leave();
    }
    setJoined(false);
    if (onLeave) onLeave();
  };

  if (!appId) {
    return (
      <div className="w-full rounded-2xl p-6 text-center border border-red-500/30 bg-black/40 backdrop-blur-xl mt-4">
        <p className="text-red-400">Waiting for Agora App ID configuration...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full rounded-2xl overflow-hidden border border-purple-500/30 bg-[#0a0a0f] relative mt-4 p-4"
    >
      {!joined && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-purple-400 tracking-wider">JOINING VOICE CHANNEL...</span>
          </div>
        </div>
      )}
      
      <div className="flex flex-col h-full gap-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
           <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
             <Users className="w-4 h-4 text-purple-400" />
             Party Voice Chat ({participants.length + 1})
           </h4>
        </div>

        <div className="flex-1 flex flex-wrap gap-4 items-center justify-center min-h-[100px]">
           {/* Self */}
           <div className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted ? 'bg-gray-800' : 'bg-purple-900 shadow-[0_0_15px_rgba(168,85,247,0.5)] border-2 border-purple-500'}`}>
                 <span className="text-lg font-bold text-white">{user?.ign?.charAt(0) || 'U'}</span>
              </div>
              <span className="text-xs text-gray-400">You</span>
           </div>

           {/* Remote Participants */}
           {participants.map(p => (
             <div key={p.uid} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-800 border-2 border-gray-600">
                   <span className="text-lg font-bold text-white">{p.uid.toString().charAt(0)}</span>
                </div>
                <span className="text-xs text-gray-400">User {p.uid.toString().substring(0, 4)}</span>
             </div>
           ))}
        </div>

        <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/5">
           <Button 
             variant="ghost"
             onClick={toggleMute}
             className={`w-12 h-12 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
           >
             {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
           </Button>

           <Button 
             variant="destructive"
             onClick={handleLeave}
             className="w-12 h-12 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:bg-red-600"
           >
             <PhoneOff className="w-5 h-5" />
           </Button>
        </div>
      </div>
    </motion.div>
  );
}
