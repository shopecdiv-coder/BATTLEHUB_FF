import { useEffect, useRef } from 'react';

export function useCallerRingback() {
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);

  const startRingback = () => {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      // Standard Indian/UK ringback tone frequency
      osc.frequency.value = 400;
      osc.type = 'sine';
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Pattern: 0.4s ON, 0.2s OFF, 0.4s ON, 2s OFF
      const playPattern = () => {
        const t = audioCtx.currentTime;
        gainNode.gain.setValueAtTime(0, t);
        
        // First beep
        gainNode.gain.setValueAtTime(0.5, t);
        gainNode.gain.setValueAtTime(0, t + 0.4);
        
        // Second beep
        gainNode.gain.setValueAtTime(0.5, t + 0.6);
        gainNode.gain.setValueAtTime(0, t + 1.0);
      };
      
      playPattern();
      intervalRef.current = setInterval(playPattern, 3000);
      
      osc.start();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked', e);
    }
  };

  const stopRingback = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  return { startRingback, stopRingback };
}

export function useIncomingRingtone() {
  const audioCtxRef = useRef(null);
  const timeoutRef = useRef(null);

  const startRingtone = () => {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'square';
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Fast digital trill
      const playRing = () => {
        let t = audioCtx.currentTime;
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.setValueAtTime(0.3, t + 0.01);
        
        // 1 second of trill
        for (let j = 0; j < 10; j++) {
          osc.frequency.setValueAtTime(800, t);
          t += 0.05;
          osc.frequency.setValueAtTime(600, t);
          t += 0.05;
        }
        
        gainNode.gain.setValueAtTime(0, t);
        
        // Schedule next ring in 2 seconds
        timeoutRef.current = setTimeout(playRing, 2000);
      };
      
      osc.start();
      playRing();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked', e);
    }
  };

  const stopRingtone = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  return { startRingtone, stopRingtone };
}

export function IncomingAudioRing() {
  const { startRingtone, stopRingtone } = useIncomingRingtone();
  useEffect(() => {
    startRingtone();
    return () => stopRingtone();
  }, []);
  return null;
}

export function CallerAudioRingback() {
  const { startRingback, stopRingback } = useCallerRingback();
  useEffect(() => {
    startRingback();
    return () => stopRingback();
  }, []);
  return null;
}
