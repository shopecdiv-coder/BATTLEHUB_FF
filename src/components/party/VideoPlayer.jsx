import React, { useRef, useEffect } from 'react';

export default function VideoPlayer({ track, className = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!track || !containerRef.current) return;
    
    track.play(containerRef.current, { fit: 'cover' });

    // Fix browser overlays (PiP, Translate, Lens) showing up over the video
    // We disable pointer events on the actual video tag so browser hovering doesn't trigger them
    setTimeout(() => {
      if (containerRef.current) {
        const videos = containerRef.current.getElementsByTagName('video');
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          video.setAttribute('disablePictureInPicture', 'true');
          video.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
          video.style.pointerEvents = 'none'; // CRITICAL: Hides hover-based overlays (Translate, Lens)
        }
      }
    }, 50);

    return () => {
      // Clean up when component unmounts or track changes
      track.stop();
    };
  }, [track]);

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full bg-black overflow-hidden rounded-xl ${className}`}
    />
  );
}
