import React, { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useCall } from '@/lib/CallContext';
import { useAuth } from '@/lib/AuthContext';

export default function AudioCallScreen() {
  const { activeCall, endCall, ZegoAppID, ZegoServerSecret } = useCall();
  const { user } = useAuth();
  const containerRef = useRef(null);

  useEffect(() => {
    if (!activeCall || !containerRef.current || activeCall.mode !== 'zegocloud') return;
    
    let isMounted = true;
    let zp;

    const startCall = async () => {
      try {
        // Generate Kit Token
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          ZegoAppID,
          ZegoServerSecret,
          activeCall.roomId.toString(),
          user.id.toString(),
          (user.ign || user.full_name || 'Player').toString()
        );

        // Create instance object from Kit Token
        zp = ZegoUIKitPrebuilt.create(kitToken);

        if (!isMounted) return;

        // Start the call
        zp.joinRoom({
          container: containerRef.current,
          sharedLinks: [],
          scenario: {
            mode: activeCall.isGroup ? ZegoUIKitPrebuilt.GroupCall : ZegoUIKitPrebuilt.OneONoneCall, 
          },
          turnOnCameraWhenJoining: false,
          turnOnMicrophoneWhenJoining: true,
          showPreJoinView: false,
          showMyCameraToggleButton: false,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: false,
          showLeavingView: false, // Prevents Zego from showing its own post-call view which can cause white screens
          onLeaveRoom: () => {
            endCall();
          },
          onReturnToHomeScreen: () => {
            endCall();
          },
          onUserLeave: () => {
             // Optionally end call if the other user leaves in a 1-on-1
             if (!activeCall.isGroup) {
               endCall();
             }
          },
          onJoinRoomFailed: (err) => {
             console.error("Failed to join Zego room:", err);
             alert("Connection failed. Please check your network or ZegoCloud AppID settings.");
             endCall();
          }
        });
      } catch (err) {
        console.error("ZegoCloud Error:", err);
        alert("Calling service failed to start. Try again.");
        endCall();
      }
    };

    startCall();

    return () => {
      isMounted = false;
      if (zp) {
        try {
           zp.destroy();
        } catch (e) {}
      }
    };
  }, [activeCall, user, ZegoAppID, ZegoServerSecret]);

  if (!activeCall) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {activeCall.mode === 'zegocloud' ? (
        <div ref={containerRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white flex-col gap-4">
          <div className="animate-pulse w-24 h-24 bg-cyan-500 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold">{activeCall.recipient?.ign?.[0] || 'W'}</span>
          </div>
          <h2 className="text-2xl font-bold">Calling {activeCall.recipient?.ign || 'Unknown'}...</h2>
          <p className="text-gray-400">WebRTC Audio Call (Implementation in progress)</p>
          <button 
            onClick={endCall}
            className="mt-8 px-6 py-3 bg-red-600 rounded-full text-white font-bold hover:bg-red-700 transition-colors"
          >
            End Call
          </button>
        </div>
      )}
    </div>
  );
}
