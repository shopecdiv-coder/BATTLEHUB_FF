import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, RotateCcw, RotateCw, Settings, Check, MonitorPlay, Moon, Smartphone } from 'lucide-react';

export default function BHTVPlayer({ 
  src, 
  poster, 
  autoPlay = false, 
  loop = false,
  className = '', 
  style = {},
  sharedState, 
  onSwipeDown,
  postId,
  userId
}) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('global_muted') === 'true';
    } catch { return false; }
  });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverProgress, setHoverProgress] = useState(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isAmbientMode, setIsAmbientMode] = useState(true);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isRotateLocked, setIsRotateLocked] = useState(false);
  const qualities = ['Auto', '1080p', '720p', '480p'];
  const speeds = [0.25, 0.5, 1, 1.25, 1.5, 2];
  
  // Double tap to skip state
  const lastTapRef = useRef({ time: 0, side: null });
  const [skipAnim, setSkipAnim] = useState(null); // 'forward' | 'backward' | null
  const [rippleAnim, setRippleAnim] = useState(null); // { side: 'left'|'right', id: Date.now() }

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const progressBarRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isNativeFs && containerRef.current?.dataset.cssFs !== 'true') {
        setIsFullscreen(false);
      } else if (isNativeFs) {
        setIsFullscreen(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleMuteChange = () => {
      try {
        const muted = localStorage.getItem('global_muted') === 'true';
        setIsMuted(muted);
        if (videoRef.current) videoRef.current.muted = muted;
      } catch {}
    };
    window.addEventListener('mute_changed', handleMuteChange);
    return () => window.removeEventListener('mute_changed', handleMuteChange);
  }, []);

  // Auto-fullscreen on landscape rotation (YouTube-style)
  useEffect(() => {
    const handleOrientationChange = () => {
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      if (!isMobile) return;

      const isLandscape = window.innerWidth > window.innerHeight;

      if (isLandscape && !isFullscreen) {
        // Phone rotated to landscape → enter fullscreen automatically
        enterCssFullscreen();
      } else if (!isLandscape && isFullscreen && !isRotateLocked) {
        // Phone rotated back to portrait → exit fullscreen
        exitCssFullscreen();
      }
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isFullscreen, isRotateLocked]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('bhtv-fs-active');
    };
  }, []);

  const enterCssFullscreen = () => {
    if (!containerRef.current) return;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isMobile && isPortrait) {
      // CSS rotation trick: rotate 90deg and swap w/h to fake landscape in portrait browsers
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      containerRef.current.dataset.cssFs = 'rotated';
      containerRef.current.style.cssText = `
        position: fixed !important;
        top: ${(vh - vw) / 2}px !important;
        left: ${(vw - vh) / 2}px !important;
        width: ${vh}px !important;
        height: ${vw}px !important;
        z-index: 99999 !important;
        background: black !important;
        border-radius: 0 !important;
        transform: rotate(90deg) !important;
        transform-origin: center center !important;
      `;
    } else {
      // Normal fullscreen (Desktop or already in landscape Mobile)
      containerRef.current.dataset.cssFs = 'true';
      containerRef.current.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100dvh !important;
        z-index: 99999 !important;
        background: black !important;
        border-radius: 0 !important;
      `;
    }
    document.body.style.overflow = 'hidden';
    document.body.classList.add('bhtv-fs-active');
    setIsFullscreen(true);
  };

  const exitCssFullscreen = () => {
    if (!containerRef.current) return;
    containerRef.current.dataset.cssFs = 'false';
    containerRef.current.style.cssText = '';
    document.body.style.overflow = '';
    document.body.classList.remove('bhtv-fs-active');
    setIsFullscreen(false);
  };

  // Ambient Mode Canvas Sync
  useEffect(() => {
    let animFrame;
    const drawAmbient = () => {
      if (isAmbientMode && canvasRef.current && videoRef.current && !videoRef.current.paused) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      animFrame = requestAnimationFrame(drawAmbient);
    };
    if (isPlaying) animFrame = requestAnimationFrame(drawAmbient);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, isAmbientMode]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          e.preventDefault();
          setIsTheaterMode(prev => !prev);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          skipBackward();
          break;
        case 'arrowright':
          e.preventDefault();
          skipForward();
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(prev => {
            const nv = Math.min(1, prev + 0.05);
            if (videoRef.current) {
              videoRef.current.volume = nv;
              if (nv > 0 && isMuted) {
                videoRef.current.muted = false;
                setIsMuted(false);
              }
            }
            return nv;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => {
            const nv = Math.max(0, prev - 0.05);
            if (videoRef.current) {
              videoRef.current.volume = nv;
              if (nv === 0) {
                videoRef.current.muted = true;
                setIsMuted(false); // keep actual muted state sync
              }
            }
            return nv;
          });
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMuted]); // Add isMuted dependency so arrow keys have latest state

  // Sync with sharedState on mount/src change
  useEffect(() => {
    if (videoRef.current && sharedState?.current) {
      videoRef.current.currentTime = sharedState.current.currentTime || 0;
      if (sharedState.current.isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [src, sharedState]);

  // Resume playback from history if available
  useEffect(() => {
    if (userId && postId && videoRef.current && !sharedState?.current?.currentTime) {
      try {
        const hist = JSON.parse(localStorage.getItem(`bh_watch_history_${userId}`)) || [];
        const entry = hist.find(h => h.postId === postId);
        // Only resume if we haven't finished the video (e.g. less than 95% watched)
        if (entry && entry.percentage < 95 && entry.progress > 0) {
          videoRef.current.currentTime = entry.progress;
          setCurrentTime(entry.progress);
        }
      } catch (err) {}
    }
  }, [userId, postId, sharedState]);



  // Clear timeout if video is paused, seeking, or menus are open
  useEffect(() => {
    if (!isPlaying || isSeeking || showQualityMenu || showSpeedMenu) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else if (showControls) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [isPlaying, isSeeking, showQualityMenu, showSpeedMenu, showControls]);

  const handleMouseMove = () => {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) return; // Rely only on taps for mobile

    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isPlaying || isSeeking || showQualityMenu || showSpeedMenu) return;
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  const handleMouseLeave = () => {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) return;

    if (!isSeeking && isPlaying && !showQualityMenu && !showSpeedMenu) {
      setShowControls(false);
    }
    setHoverProgress(null);
  };

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (isDraggingRef.current) return;
    if (videoRef.current) {
      if (!videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        setIsPlaying(true);
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Video play failed:", error);
            setIsPlaying(false);
          });
        }
      }
    }
  };

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      try {
        localStorage.setItem('global_muted', String(newMuted));
        window.dispatchEvent(new Event('mute_changed'));
      } catch {}
    }
  };

  const toggleFullscreen = async (e) => {
    if (e) e.stopPropagation();
    if (!containerRef.current) return;

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    // ── EXIT ──────────────────────────────────────────────
    if (isFullscreen) {
      // CSS fullscreen exit (mobile rotated or desktop css)
      const fsVal = containerRef.current.dataset.cssFs;
      if (fsVal === 'rotated' || fsVal === 'true') {
        exitCssFullscreen();
        return;
      }
      // Native fullscreen exit (desktop)
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      return;
    }

    // ── ENTER ─────────────────────────────────────────────
    if (isMobile) {
      // Try native video fullscreen first (iOS Safari)
      if (videoRef.current?.webkitEnterFullscreen) {
        videoRef.current.webkitEnterFullscreen();
        return;
      }
      // CSS rotation trick for landscape fullscreen
      enterCssFullscreen();
    } else {
      // Desktop: standard fullscreen on container div
      try {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (containerRef.current.webkitRequestFullscreen) {
          containerRef.current.webkitRequestFullscreen();
        }
      } catch (err) {
        console.error('Fullscreen error:', err);
      }
    }
  };


  const skipBackward = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      setSkipAnim('backward');
      setTimeout(() => setSkipAnim(null), 500);
    }
  };

  const skipForward = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      setSkipAnim('forward');
      setTimeout(() => setSkipAnim(null), 500);
    }
  };

  const handleSingleTap = (e) => {
    if (e) e.stopPropagation();
    
    // Close menus if they are open
    if (showQualityMenu || showSpeedMenu) {
      setShowQualityMenu(false);
      setShowSpeedMenu(false);
      return;
    }

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) {
      setShowControls(prev => !prev);
    } else {
      togglePlay(e);
    }
  };

  const handleVideoAreaTap = (e, side) => {
    e.stopPropagation();
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    
    if (!isMobile) {
      // Desktop: Instant play/pause, no double-tap to seek
      handleSingleTap(e);
      return;
    }

    // Mobile: Instant UI toggle + Double tap to seek
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap.side === side && now - lastTap.time < 300) {
      // Double tap detected
      setShowControls(true); // Keep controls visible during seek
      setRippleAnim({ side, id: now });
      setTimeout(() => setRippleAnim(null), 600);
      
      if (side === 'left') {
        skipBackward(e);
      } else {
        skipForward(e);
      }
      lastTapRef.current = { time: 0, side: null };
    } else {
      // Single tap (first tap) - Instantly toggle UI! No sluggish delay!
      lastTapRef.current = { time: now, side };
      handleSingleTap(e);
    }
  };

  const handleQualityChange = (e, q) => {
    e.stopPropagation();
    setCurrentQuality(q);
    setShowQualityMenu(false);
    
    // Simulate quality switch loading
    if (videoRef.current) {
      const wasPlaying = !videoRef.current.paused;
      setIsBuffering(true);
      videoRef.current.pause();
      
      setTimeout(() => {
        if (videoRef.current) {
          if (wasPlaying) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => setIsPlaying(false));
            }
          }
          setIsBuffering(false);
        }
      }, 800);
    }
  };

  const handleSpeedChange = (e, speed) => {
    e.stopPropagation();
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- Seek logic (click + drag) ---
  const getProgressFromEvent = useCallback((e) => {
    const bar = progressBarRef.current;
    if (!bar || !duration) return null;
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pos = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return pos;
  }, [duration]);

  const seekTo = useCallback((pos) => {
    if (videoRef.current && duration) {
      videoRef.current.currentTime = pos * duration;
      setProgress(pos * 100);
    }
  }, [duration]);

  const handleProgressMouseDown = (e) => {
    e.stopPropagation();
    setIsSeeking(true);
    const pos = getProgressFromEvent(e);
    if (pos !== null) seekTo(pos);
  };

  const handleProgressTouchStart = (e) => {
    e.stopPropagation();
    setIsSeeking(true);
    const pos = getProgressFromEvent(e);
    if (pos !== null) seekTo(pos);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isSeeking) return;
      const bar = progressBarRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const pos = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      seekTo(pos);
    };
    const handleTouchMove = (e) => {
      if (!isSeeking) return;
      const bar = progressBarRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const pos = Math.min(1, Math.max(0, (e.touches[0].clientX - rect.left) / rect.width));
      seekTo(pos);
    };
    const handleUp = () => {
      if (isSeeking) setIsSeeking(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isSeeking, seekTo, duration]);

  const handleProgressHover = (e) => {
    const bar = progressBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverProgress(pos * 100);
  };

  const pointerStartY = useRef(null);
  const pointerStartX = useRef(null);
  const handlePointerDown = (e) => {
    if (e.target.closest('.bhtv-controls') || e.target.closest('.bhtv-center-play')) return;
    pointerStartY.current = e.clientY;
    pointerStartX.current = e.clientX;
    isDraggingRef.current = false;
  };

  const handlePointerUp = (e) => {
    if (pointerStartY.current === null || pointerStartX.current === null) return;
    const dy = e.clientY - pointerStartY.current;
    const dx = e.clientX - pointerStartX.current;
    
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 40) {
      isDraggingRef.current = true;
      if (dy > 0) {
        // Swipe Down
        if (isFullscreen) toggleFullscreen();
        else if (onSwipeDown) onSwipeDown();
      } else {
        // Swipe Up
        if (!isFullscreen) toggleFullscreen();
      }
    } else if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      isDraggingRef.current = true;
    }
    
    setTimeout(() => isDraggingRef.current = false, 100);
    pointerStartY.current = null;
    pointerStartX.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black flex items-center justify-center ${className} ${
        isFullscreen ? 'w-screen h-screen rounded-none' : 
        isTheaterMode ? 'w-[100vw] rounded-none !max-h-[85vh]' : 'rounded-lg shadow-2xl'
      }`}
      style={isTheaterMode && !isFullscreen ? { marginLeft: 'calc(-50vw + 50%)' } : {}}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleSingleTap}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <video
        ref={videoRef}
        src={src}
        poster={!isPlaying && currentTime === 0 ? poster : undefined}
        autoPlay={autoPlay}
        playsInline
        muted={isMuted}
        onClick={handleSingleTap}
        onWaiting={() => setIsBuffering(true)}
        onPlay={() => { setIsPlaying(true); if(sharedState) sharedState.current.isPlaying = true; }}
        onPlaying={() => { setIsBuffering(false); setIsPlaying(true); if(sharedState) sharedState.current.isPlaying = true; }}
        onPause={() => { setIsPlaying(false); if(sharedState) sharedState.current.isPlaying = false; }}
        onCanPlay={() => setIsBuffering(false)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => {
          const cTime = e.target.currentTime;
          const dur = e.target.duration || duration;
          if (!isSeeking) {
            setCurrentTime(cTime);
            if (dur) setProgress((cTime / dur) * 100);
          }
          if (sharedState) {
            sharedState.current.currentTime = cTime;
            sharedState.current.isPlaying = !e.target.paused;
          }
          
          // Save watch history periodically (every 1 second approx, or every time it updates)
          // To avoid performance issues, only save if progress changed significantly or just let localStorage handle it (it's fast enough)
          if (userId && postId && dur > 0) {
            try {
              const hist = JSON.parse(localStorage.getItem(`bh_watch_history_${userId}`)) || [];
              const idx = hist.findIndex(h => h.postId === postId);
              const entry = { postId, progress: cTime, duration: dur, percentage: (cTime / dur) * 100, lastWatched: Date.now() };
              
              if (idx > -1) hist[idx] = entry;
              else hist.push(entry);
              
              hist.sort((a, b) => b.lastWatched - a.lastWatched);
              if (hist.length > 50) hist.length = 50;
              localStorage.setItem(`bh_watch_history_${userId}`, JSON.stringify(hist));
            } catch (err) {}
          }
        }}
        onEnded={() => setIsPlaying(false)}
        className="w-full h-full object-contain max-h-[100dvh] relative z-10 rounded-[inherit]"
      />

      {/* Ambient Canvas (Cinematic Glow) */}
      {isAmbientMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-[inherit]">
          <canvas
            ref={canvasRef}
            width={128}
            height={72}
            className="w-full h-full object-cover opacity-60 scale-110"
            style={{ filter: 'blur(80px)' }}
          />
        </div>
      )}

      {/* Double Tap Areas */}
      <div 
        className="absolute inset-y-0 left-0 w-1/2 z-20 overflow-hidden rounded-l-[inherit]"
        onClick={(e) => handleVideoAreaTap(e, 'left')}
      >
        {/* Ripple Effect */}
        {rippleAnim?.side === 'left' && (
          <div key={rippleAnim.id} className="absolute top-1/2 left-4 -translate-y-1/2 w-32 h-32 bg-white/20 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '0.5s' }} />
        )}
      </div>
      <div 
        className="absolute inset-y-0 right-0 w-1/2 z-20 overflow-hidden rounded-r-[inherit]"
        onClick={(e) => handleVideoAreaTap(e, 'right')}
      >
        {/* Ripple Effect */}
        {rippleAnim?.side === 'right' && (
          <div key={rippleAnim.id} className="absolute top-1/2 right-4 -translate-y-1/2 w-32 h-32 bg-white/20 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '0.5s' }} />
        )}
      </div>

      {/* Skip Animations */}
      {skipAnim === 'backward' && (
        <div className="absolute left-10 top-1/2 -translate-y-1/2 bg-black/50 text-white p-4 rounded-full animate-in fade-in zoom-in duration-200 z-20 pointer-events-none">
          <RotateCcw className="w-8 h-8 mb-1 mx-auto" />
          <span className="text-xs font-bold">-10s</span>
        </div>
      )}
      {skipAnim === 'forward' && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 bg-black/50 text-white p-4 rounded-full animate-in fade-in zoom-in duration-200 z-20 pointer-events-none">
          <RotateCw className="w-8 h-8 mb-1 mx-auto" />
          <span className="text-xs font-bold">+10s</span>
        </div>
      )}

      {/* Buffering Loader */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Center Play/Pause Button (tied to showControls) */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-300 pb-12 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {!isPlaying && <div className="absolute inset-0 bg-black/40 transition-opacity"></div>}
        
        {(!isBuffering && !skipAnim) && (
          <div 
            className={`bhtv-center-play relative w-[72px] h-[72px] bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-300 cursor-pointer active:scale-95 ${showControls ? 'pointer-events-auto' : 'pointer-events-none'}`} 
            onClick={togglePlay}
          >
            {isPlaying ? (
               <Pause className="w-8 h-8 fill-white pointer-events-none" />
            ) : (
               <Play className="w-8 h-8 ml-1 fill-white pointer-events-none" />
            )}
          </div>
        )}
      </div>

      {/* Settings Button — top right overlay on the video */}
      <div
        className={`absolute top-2 right-2 z-40 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }}
            className={`w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/70 hover:text-[#00FFFF] transition-all ${showQualityMenu ? 'text-[#00FFFF]' : ''}`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Settings Menu */}
          {showQualityMenu && (
            <div className="absolute top-full right-0 mt-2 w-44 bg-[#0f0f0f]/95 backdrop-blur-xl rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden z-[100] flex flex-col">
              
              {/* Quality */}
              <div className="p-2 border-b border-white/10">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quality</div>
                <div className="space-y-0.5 mt-1">
                  {qualities.map(q => (
                    <button
                      key={q}
                      onClick={(e) => handleQualityChange(e, q)}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-lg flex items-center justify-between transition-colors"
                    >
                      <span className={currentQuality === q ? 'font-semibold' : ''}>{q}</span>
                      {currentQuality === q && <Check className="w-4 h-4 text-[#00FFFF]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed & Ambient */}
              <div className="p-2 space-y-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(true); setShowQualityMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-lg flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5"><Play className="w-4 h-4 text-gray-400" /> <span>Speed</span></div>
                  <span className="text-gray-400 text-xs font-medium">{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsAmbientMode(!isAmbientMode); setShowQualityMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-lg flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5"><Moon className="w-4 h-4 text-gray-400" /> <span>Ambient Mode</span></div>
                  {isAmbientMode && <Check className="w-4 h-4 text-[#00FFFF]" />}
                </button>
              </div>
            </div>
          )}

          {/* Speed Submenu */}
          {showSpeedMenu && (
            <div className="absolute top-full right-0 mt-2 w-44 bg-[#0f0f0f]/95 backdrop-blur-xl rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden z-[100]">
              <div className="p-2 border-b border-white/10 flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(false); setShowQualityMenu(true); }}
                  className="p-1 hover:bg-white/10 rounded-lg text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Playback Speed</span>
              </div>
              <div className="p-2 space-y-0.5">
                {speeds.map(s => (
                  <button
                    key={s}
                    onClick={(e) => handleSpeedChange(e, s)}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-lg flex items-center justify-between transition-colors"
                  >
                    <span className={playbackSpeed === s ? 'font-semibold' : ''}>{s === 1 ? 'Normal' : `${s}x`}</span>
                    {playbackSpeed === s && <Check className="w-4 h-4 text-[#00FFFF]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 pt-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 z-20 bhtv-controls ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* === INSTAGRAM-STYLE SEEKBAR === */}
        <div
          ref={progressBarRef}
          className="w-full relative flex items-center mb-3 cursor-pointer touch-none"
          style={{ height: '20px' }}
          onMouseDown={handleProgressMouseDown}
          onTouchStart={handleProgressTouchStart}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverProgress(null)}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Track background */}
          <div className={`w-full rounded-full bg-white/25 transition-all duration-150 ${isSeeking ? 'h-[6px]' : 'h-[4px] hover:h-[6px]'}`} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}>
            {/* Hover ghost */}
            {hoverProgress !== null && !isSeeking && (
              <div
                className="h-full rounded-full bg-white/30 absolute top-0 left-0"
                style={{ width: `${hoverProgress}%` }}
              />
            )}
            {/* Filled progress */}
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-[#00FFFF] rounded-full shadow-[0_0_8px_rgba(0,255,255,0.7)] absolute top-0 left-0 transition-none"
              style={{ width: `${progress}%` }}
            />
            {/* Thumb dot */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-md transition-all duration-150 ${isSeeking ? 'w-5 h-5 opacity-100' : 'w-4 h-4 opacity-0 group-hover:opacity-100'}`}
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={togglePlay} className="hover:text-[#00FFFF] transition-colors focus:outline-none">
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>

            <div className="flex items-center gap-2 ml-1 group/volume">
              <button onClick={toggleMute} className="hover:text-[#00FFFF] transition-colors focus:outline-none">
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              
              {/* Volume Slider */}
              <div className="flex overflow-hidden transition-all duration-300 items-center w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100">
                <input 
                  type="range" 
                  min="0" max="1" step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (videoRef.current) {
                      videoRef.current.volume = v;
                      if (v > 0 && isMuted) {
                        videoRef.current.muted = false;
                        setIsMuted(false);
                        try {
                          localStorage.setItem('global_muted', 'false');
                          window.dispatchEvent(new Event('mute_changed'));
                        } catch {}
                      }
                    }
                  }}
                  className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-[#00FFFF]"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <span className="text-xs font-semibold tracking-wide text-white/90 hidden sm:inline-block">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <span className="text-xs font-semibold tracking-wide text-white/90 sm:hidden">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theater Mode Button - desktop only */}
            <button onClick={(e) => { e.stopPropagation(); setIsTheaterMode(!isTheaterMode); }} className="hover:text-[#00FFFF] transition-colors focus:outline-none hidden sm:block" title="Theater Mode">
              <MonitorPlay className="w-5 h-5" />
            </button>

            {/* Single YouTube-style fullscreen button */}
            <button onClick={toggleFullscreen} className="hover:text-[#00FFFF] transition-colors focus:outline-none" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              {isFullscreen ? (
                // Minimize: two arrows pointing inward
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                </svg>
              ) : (
                // Maximize: four arrows pointing outward — YouTube style
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
