// Utility to play a professional, synthesized "pop/ding" notification sound using Web Audio API

export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Professional subtle "ding" sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // Slide up quickly to A6

    // Smooth envelope to avoid clicks
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02); // Quick attack (not too loud)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); // Fade out

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3); // Sound lasts 300ms
  } catch (error) {
    console.error("Audio playback failed:", error);
  }
};
