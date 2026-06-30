import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/api/firebaseClient';
import { collection, doc, setDoc, onSnapshot, query, where, updateDoc, deleteDoc } from 'firebase/firestore';

const CallContext = createContext({});

export function CallProvider({ children }) {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState(null); // { roomId, isCaller, recipient, mode: 'zegocloud' | 'webrtc' }
  const [incomingCall, setIncomingCall] = useState(null);
  const [callProvider, setCallProvider] = useState('zegocloud'); // Admin toggled

  // Configuration for ZegoCloud
  const ZegoAppID = 859804911;
  const ZegoServerSecret = "3e935371a08f4bbc647c836a5d129098";

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'calls'),
      where('recipient_id', '==', user.id.toString()),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        setIncomingCall({ id: callDoc.id, ...callDoc.data() });
      } else {
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for caller to see if recipient accepted/rejected
  useEffect(() => {
    if (!activeCall || !activeCall.isCaller) return;

    const unsubscribe = onSnapshot(doc(db, 'calls', activeCall.roomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'rejected' || data.status === 'ended') {
          setActiveCall(null);
        }
      } else {
        setActiveCall(null); // Document deleted
      }
    });

    return () => unsubscribe();
  }, [activeCall]);

  const initiateCall = async (recipient, provider = 'zegocloud') => {
    if (!user) return;
    
    // For groups, use a deterministic room ID and don't ring everyone
    if (recipient.isGroup) {
      setActiveCall({
        roomId: recipient.id,
        isCaller: true,
        recipient,
        mode: provider,
        isGroup: true
      });
      return;
    }

    const roomId = `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    setActiveCall({
      roomId,
      isCaller: true,
      recipient,
      mode: provider
    });

    // Write to Firestore for 1-on-1
    await setDoc(doc(db, 'calls', roomId), {
      caller_id: user.id.toString(),
      caller: {
        id: user.id,
        ign: user.ign || user.full_name || 'Player',
        avatar_url: user.avatar_url || null
      },
      recipient_id: recipient.id.toString(),
      status: 'ringing',
      mode: provider,
      created_at: Date.now()
    });
  };

  const endCall = async () => {
    if (activeCall) {
      if (!activeCall.isGroup) {
        await updateDoc(doc(db, 'calls', activeCall.roomId), { status: 'ended' }).catch(() => {});
      }
      setActiveCall(null);
    }
  };

  const acceptCall = async () => {
    if (incomingCall) {
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'accepted' }).catch(() => {});
      setActiveCall({
        roomId: incomingCall.id,
        isCaller: false,
        recipient: incomingCall.caller,
        mode: incomingCall.mode
      });
      setIncomingCall(null);
    }
  };

  const rejectCall = async () => {
    if (incomingCall) {
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'rejected' }).catch(() => {});
      setIncomingCall(null);
    }
  };

  return (
    <CallContext.Provider value={{
      activeCall,
      incomingCall,
      initiateCall,
      endCall,
      acceptCall,
      rejectCall,
      ZegoAppID,
      ZegoServerSecret
    }}>
      {children}
      
      {/* Universal Incoming Call Popup */}
      {incomingCall && !activeCall && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900 border border-gray-700 shadow-2xl rounded-2xl p-4 w-[90%] max-w-sm flex flex-col items-center animate-in slide-in-from-top-10">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
             {incomingCall.caller?.avatar_url ? (
                <img src={incomingCall.caller.avatar_url} className="w-14 h-14 rounded-full object-cover" />
             ) : (
                <span className="text-xl font-bold text-white">{incomingCall.caller?.ign?.[0] || 'U'}</span>
             )}
          </div>
          <h3 className="text-lg font-bold text-white">{incomingCall.caller?.ign || 'Unknown Caller'}</h3>
          <p className="text-gray-400 mb-6">Incoming Audio Call...</p>
          
          <div className="flex gap-4 w-full">
            <button 
              onClick={rejectCall}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl font-medium transition-colors"
            >
              Decline
            </button>
            <button 
              onClick={acceptCall}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl font-medium transition-colors animate-pulse"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
