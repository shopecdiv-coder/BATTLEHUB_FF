import React, { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Bookmark, Play, Volume2, VolumeX, ChevronDown, ChevronUp, Flag, Pin, BadgeCheck, Send, MoreVertical, EyeOff, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment } from "@/entities/MediaComment";
import { Report } from "@/entities/Report";
import { Channel } from "@/api/entities";
import { Follower } from "@/api/entities";
import { formatDistanceToNow } from "date-fns";

export default function MediaPostCard({ 
  post, 
  user, 
  onUpdate, 
  onOpenComments, 
  onShare, 
  onViewProfile,
  bottomOffset = 0,
  onScrollNext
}) {
  const isAdmin = user?.role === 'admin' || user?.email === 'shopecdiv@gmail.com';
  const isMe = user?.id === (post.user_id || post.author_id);
  const [liked, setLiked] = useState(post.likes?.includes(user?.id));
  const [saved, setSaved] = useState(post.saves?.includes(user?.id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [progress, setProgress] = useState(0);

  const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-cyan-400 hover:text-cyan-300 hover:underline break-words relative z-50"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const [isMuted, setIsMuted] = useState(() => {
    try {
      const saved = localStorage.getItem('global_muted');
      return saved !== null ? saved === 'true' : false;
    } catch { return false; }
  });
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [channelInfo, setChannelInfo] = useState(null);
  const [followId, setFollowId] = useState(null);
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const clickTimeout = useRef(null);
  const progressBarRef = useRef(null);

  useEffect(() => {
    if (post.comments_count === undefined) {
      MediaComment.filter({ post_id: post.id }).then(res => setCommentsCount(res.length));
    }
  }, [post.id, post.comments_count]);

  useEffect(() => {
    if (post.user_id || post.author_id) {
      const uid = post.user_id || post.author_id;
      Channel.filter({ user_id: uid }).then(res => {
        if (res && res.length > 0) setChannelInfo(res[0]);
      }).catch(console.error);

      if (user && user.id !== uid) {
        Follower.filter({ follower_id: user.id, following_id: uid }).then(res => {
          if (res && res.length > 0) setFollowId(res[0].id);
          else setFollowId(null);
        }).catch(console.error);
      }
    }
  }, [post.user_id, post.author_id, user]);

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!user) return alert("Please login to follow");
    
    const targetId = post.user_id || post.author_id;
    try {
      if (followId) {
        await Follower.delete(followId);
        setFollowId(null);
      } else {
        // Prevent duplicate: check if already following
        const existing = await Follower.filter({ follower_id: user.id, following_id: targetId });
        if (existing && existing.length > 0) {
          setFollowId(existing[0].id);
          return;
        }
        const res = await Follower.create({
          follower_id: user.id,
          following_id: targetId
        });
        setFollowId(res.id);
      }
    } catch (err) {
      console.error("Follow error", err);
    }
  };

  // Track views and auto-play using IntersectionObserver
  useEffect(() => {
    if (!cardRef.current) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsPlaying(true);
          if (videoRef.current) {
            // Check if we have history to resume
            if (user?.id) {
              try {
                const hist = JSON.parse(localStorage.getItem(`bh_watch_history_${user.id}`)) || [];
                const histEntry = hist.find(h => h.postId === post.id);
                if (histEntry && histEntry.percentage < 95 && histEntry.progress > 0) {
                  videoRef.current.currentTime = histEntry.progress;
                }
              } catch (e) {}
            }
            videoRef.current.play().catch(() => setIsPlaying(false));
          }
          
          // Increment view logic
          const viewedPosts = JSON.parse(sessionStorage.getItem("viewed_posts") || "[]");
          if (!viewedPosts.includes(post.id)) {
            setTimeout(() => {
              MediaPost.incrementView(post.id).catch(console.error);
              viewedPosts.push(post.id);
              sessionStorage.setItem("viewed_posts", JSON.stringify(viewedPosts));
              if (onUpdate) onUpdate(post.id, { views: (post.views || 0) + 1 });
            }, 2000);
          }
        } else {
          setIsPlaying(false);
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      });
    }, { threshold: 0.6 }); // 60% of card must be visible

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.id, onUpdate]);

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

  const handleLike = async (e) => {
    e?.stopPropagation?.();
    if (!user) { alert("Please login to like"); return; }
    const originalLiked = liked;
    setLiked(!originalLiked);
    setLikesCount(prev => originalLiked ? prev - 1 : prev + 1);
    
    try {
      const isLiked = await MediaPost.toggleLike(post.id, user.id);
      setLiked(isLiked);
    } catch (err) {
      setLiked(originalLiked);
      setLikesCount(prev => originalLiked ? prev + 1 : prev - 1);
    }
  };

  const handleSave = async (e) => {
    e?.stopPropagation?.();
    if (!user) { alert("Please login to save"); return; }
    const originalSaved = saved;
    setSaved(!originalSaved);
    try {
      const isSaved = await MediaPost.toggleSave(post.id, user.id);
      setSaved(isSaved);
    } catch (err) {
      setSaved(originalSaved);
    }
  };

  const toggleVideoPlayback = () => {
    setIsPlaying(!isPlaying);
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play().catch(() => {});
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    try {
      localStorage.setItem('global_muted', String(newMuted));
      window.dispatchEvent(new Event('mute_changed'));
    } catch {}
  };

  const handleInteraction = (e) => {
    e.stopPropagation();
    if (clickTimeout.current) {
      // Double tap
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
      if (!liked) {
        handleLike(e);
      }
    } else {
      // Single tap
      clickTimeout.current = setTimeout(() => {
        toggleVideoPlayback();
        clickTimeout.current = null;
      }, 250);
    }
  };

  const handleReport = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert("Please login to report this post");
      return;
    }
    const reason = window.prompt("Why are you reporting this media post?");
    if (!reason || !reason.trim()) return;

    try {
      await Report.create({
        type: 'media_post',
        target_id: post.id,
        reporter_id: user.id,
        reporter_ign: user.ign || user.full_name || 'User',
        reported_user_id: post.author_id || 'unknown',
        reported_ign: post.author_name || 'Unknown User',
        reason: "Media Post Violation",
        description: `Reason: ${reason.trim()}\nPost Title: ${post.title || 'Untitled'}`,
        evidence_urls: post.media_url ? [post.media_url] : [],
        status: 'Pending',
        created_date: new Date().toISOString()
      });
      alert("Post reported to admins for review.");
    } catch (err) {
      console.error("Failed to report", err);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(post);
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title || 'BATTLEHUB FF',
          text: 'Check out this awesome content!',
          url: window.location.origin + '/MediaFeed'
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin + '/MediaFeed');
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  const handlePin = async (e) => {
    e.stopPropagation();
    if (!isAdmin) return;
    try {
      await MediaPost.update(post.id, { is_pinned: !post.is_pinned });
      if (onUpdate) onUpdate(post.id, { is_pinned: !post.is_pinned });
    } catch(err) {
      console.error("Failed to pin", err);
    }
  };

  return (
    <div 
      ref={cardRef} 
      className={`relative w-full h-full snap-start bg-black flex items-center justify-center overflow-hidden group ${post.is_pinned ? 'ring-2 ring-inset ring-blue-400 bg-gradient-to-t from-blue-900/40 to-transparent' : ''}`}
      onClick={handleInteraction}
    >
      {/* Giant Heart Pop-up Animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-in zoom-in duration-300">
          <Heart className="w-32 h-32 text-red-500 fill-red-500 drop-shadow-2xl" />
        </div>
      )}

      {/* Media Layer */}
      {(post.type === "video" || post.type === "reel") && (post.media_url || post.video_url) ? (
        <>
            <video 
              ref={videoRef}
              src={post.media_url || post.video_url} 
              poster={post.thumbnail_url}
              className={`absolute w-full h-full ${post.type === 'video' ? 'object-contain bg-black' : 'object-cover'}`}
              playsInline
              muted={isMuted}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onCanPlay={() => setIsBuffering(false)}
              onTimeUpdate={(e) => {
                const current = e.target.currentTime;
                const duration = e.target.duration;
                if (duration) {
                  setProgress((current / duration) * 100);
                  // Save watch history
                  if (user?.id && post.id && duration > 0) {
                    try {
                      const hist = JSON.parse(localStorage.getItem(`bh_watch_history_${user.id}`)) || [];
                      const idx = hist.findIndex(h => h.postId === post.id);
                      const entry = { postId: post.id, progress: current, duration: duration, percentage: (current / duration) * 100, lastWatched: Date.now() };
                      if (idx > -1) hist[idx] = entry;
                      else hist.push(entry);
                      hist.sort((a, b) => b.lastWatched - a.lastWatched);
                      if (hist.length > 50) hist.length = 50;
                      localStorage.setItem(`bh_watch_history_${user.id}`, JSON.stringify(hist));
                    } catch (err) {}
                  }
                }
              }}
              onEnded={() => {
                setIsPlaying(false);
                setProgress(100);
                
                // Auto-remove from Watch Later when fully watched
                if (user?.id && post?.saves?.includes(user.id)) {
                  MediaPost.toggleSave(post.id, user.id).catch(()=>{});
                }

                if (onScrollNext) {
                  onScrollNext();
                } else if (cardRef.current && cardRef.current.parentElement && cardRef.current.parentElement.nextElementSibling) {
                  cardRef.current.parentElement.nextElementSibling.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />

          {/* Custom Buffering Loader */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-14 h-14 rounded-full border-[3px] border-white/10 border-t-[#00FFFF] animate-spin shadow-[0_0_15px_rgba(0,255,255,0.4)]"></div>
            </div>
          )}

          {/* Pause Overlay Icon */}
          {!isPlaying && !showHeart && !isBuffering && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none transition-opacity z-10">
              <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white animate-in zoom-in duration-200">
                <Play className="w-10 h-10 ml-1 fill-white" />
              </div>
            </div>
          )}
          
          {/* Mute/Unmute Toggle */}
          <button 
            onClick={toggleMute}
            className="absolute top-20 right-4 z-20 w-10 h-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </>
      ) : post.type === "image" && post.media_url ? (
        <img src={post.media_url} alt={post.title} className="absolute w-full h-full object-cover md:object-contain" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-8">
          <p className="text-2xl text-center font-bold text-white leading-tight">{post.title}</p>
        </div>
      )}

      {/* Sleek Progress Bar (Interactive Scrubbing) */}
      {(post.type === "video" || post.type === "reel") && (post.media_url || post.video_url) && (
        <div 
          ref={progressBarRef}
          className="absolute left-0 right-0 h-5 z-30 cursor-pointer touch-none group/timeline flex flex-col justify-end"
          style={{ bottom: `${bottomOffset}px` }}
          onPointerDown={(e) => {
            e.stopPropagation();
            // Optional: pause video while scrubbing for smoother perf
            const handleTimelineDrag = (evt) => {
              if (!videoRef.current || !progressBarRef.current) return;
              if (evt.cancelable) evt.preventDefault();
              const rect = progressBarRef.current.getBoundingClientRect();
              const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
              const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
              const percent = clickX / rect.width;
              setProgress(percent * 100);
              if (videoRef.current.duration) {
                videoRef.current.currentTime = percent * videoRef.current.duration;
              }
            };
            
            handleTimelineDrag(e);
            
            const handleMove = (moveEvt) => {
              moveEvt.stopPropagation();
              handleTimelineDrag(moveEvt);
            };
            const handleUp = (upEvt) => {
              upEvt.stopPropagation();
              // videoRef.current?.play().catch(()=>{});
              document.removeEventListener('pointermove', handleMove);
              document.removeEventListener('pointerup', handleUp);
              document.removeEventListener('pointercancel', handleUp);
            };
            
            document.addEventListener('pointermove', handleMove, { passive: false });
            document.addEventListener('pointerup', handleUp);
            document.addEventListener('pointercancel', handleUp);
          }}
        >
          {/* Hit area and visual bar */}
          <div className="w-full h-1 group-hover/timeline:h-2 bg-white/30 transition-all duration-200 relative pointer-events-none">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-orange-500 to-[#00FFFF] shadow-[0_0_8px_rgba(0,255,255,0.6)] transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Dark Gradient Overlay for text readability */}
      <div 
        className="absolute left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" 
        style={{ bottom: `${bottomOffset}px` }}
      />

      {/* Info Layer (Bottom Left) */}
      <div 
        className="absolute left-0 p-4 pb-4 w-[80%] z-20 flex flex-col justify-end pointer-events-auto"
        style={{ bottom: `${bottomOffset}px` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div 
            className={`w-9 h-9 rounded-full border-[1.5px] border-white/50 overflow-hidden bg-gray-900 shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${!isMe ? 'cursor-pointer' : ''}`}
            onClick={(e) => { e.stopPropagation(); if(!isMe && onViewProfile) onViewProfile(post.user_id || post.author_id); }}
          >
            <img 
              src={channelInfo?.logo_url || post.author_avatar || "https://api.dicebear.com/6.x/bottts/svg?seed=BH"} 
              alt="Author" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.target.src = "https://api.dicebear.com/6.x/bottts/svg?seed=BH"; }} 
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span 
              className={`text-white font-bold text-[14.5px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center gap-1.5 ${!isMe ? 'cursor-pointer hover:underline' : ''}`}
              onClick={(e) => { e.stopPropagation(); if(!isMe && onViewProfile) onViewProfile(post.user_id || post.author_id); }}
            >
              {channelInfo?.name || post.author_name || "BATTLEHUB FF"}
              {(post.author_role === 'admin' || post.author_name?.includes("BATTLEHUB") || post.author_id === 'shopecdiv@gmail.com') && (
                <BadgeCheck className="w-[15px] h-[15px] text-orange-500 fill-white shrink-0" />
              )}
              {post.is_pinned && <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded-sm ml-1 font-semibold uppercase tracking-wide shrink-0 shadow-[0_0_5px_rgba(59,130,246,0.5)]">Pinned</span>}
            </span>
            {user && (post.user_id || post.author_id) !== user.id && (
              <button 
                onClick={handleFollow}
                className={`ml-1 text-[11px] font-bold px-3 py-1 rounded border ${followId ? 'bg-transparent border-white/50 text-white hover:bg-white/10' : 'bg-transparent text-white border-white hover:bg-white hover:text-black'} transition-colors shadow-md`}
              >
                {followId ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <div 
          className="cursor-pointer group/title ml-1"
          onClick={(e) => { e.stopPropagation(); setShowFullDesc(!showFullDesc); }}
        >
          {post.title && post.type !== "text" && (
            <div className={`text-white font-medium text-[14px] leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${!showFullDesc ? 'line-clamp-2' : ''}`}>
              {renderTextWithLinks(post.title)}
              {post.description && !showFullDesc && (
                <span className="text-gray-300 font-normal ml-1 hover:text-white cursor-pointer opacity-90">... more</span>
              )}
            </div>
          )}
          
          {showFullDesc && (
            <div className="animate-in fade-in duration-200 mt-1.5">
              {post.description && (
                <div 
                  className="max-h-[30vh] overflow-y-auto no-scrollbar overscroll-contain pointer-events-auto mb-1.5"
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  <p className="text-gray-100 text-[13.5px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] whitespace-pre-wrap leading-relaxed">
                    {renderTextWithLinks(post.description)}
                  </p>
                </div>
              )}
              <span className="text-gray-400 text-[11px] drop-shadow-md font-medium uppercase tracking-wider">
                {(() => {
                  try {
                    const d = new Date(post.created_date || 0);
                    return isNaN(d.getTime()) ? 'Unknown' : formatDistanceToNow(d, { addSuffix: true });
                  } catch(e) { return 'Unknown'; }
                })()}
                {` • ${post.views || 0} view${(post.views || 0) === 1 ? '' : 's'}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions Layer (Bottom Right Vertical Stack) */}
      <div 
        className="absolute right-0 p-4 pb-4 z-20 flex flex-col items-center justify-end gap-5 pointer-events-auto"
        style={{ bottom: `${bottomOffset}px` }}
      >
        
        <div className="flex flex-col items-center gap-1 group">
          <button 
            onClick={handleLike}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${liked ? 'bg-red-500/20' : 'bg-black/40 backdrop-blur'}`}
          >
            <Heart className={`w-6 h-6 sm:w-7 sm:h-7 ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-md">{likesCount}</span>
        </div>

        {post.comments_enabled !== false && !post.comments_disabled && (
          <div className="flex flex-col items-center gap-1 group">
            <button 
              onClick={(e) => { e.stopPropagation(); onOpenComments(post); }}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center transition-transform hover:scale-110"
            >
              <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </button>
            <span className="text-white text-xs font-bold drop-shadow-md">{commentsCount}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-1 group">
          <button 
            onClick={handleSave}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${saved ? 'bg-orange-600/20' : 'bg-black/40 backdrop-blur'}`}
          >
            <Bookmark className={`w-6 h-6 sm:w-7 sm:h-7 ${saved ? 'text-orange-600 fill-orange-600' : 'text-white'}`} />
          </button>
          <span className="text-white text-[11px] font-bold drop-shadow-md">Save</span>
        </div>

        <div className="flex flex-col items-center gap-1 group">
          <button 
            onClick={handleShare}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center transition-transform hover:scale-110"
          >
            <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white hover:text-orange-500 transition-colors -ml-1" />
          </button>
          <span className="text-white text-[11px] font-bold drop-shadow-md">Share</span>
        </div>

        <div className="flex flex-col items-center gap-1 group relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 bg-black/40 backdrop-blur"
              >
                <MoreVertical className="w-6 h-6 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-48 bg-gray-900 border-gray-800 text-white z-[60] mb-2">
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); handleReport(e); }}
                className="cursor-pointer hover:bg-gray-800 text-red-400 hover:text-red-300 focus:bg-gray-800 focus:text-red-300"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  alert("We'll show fewer posts like this."); 
                  if (onUpdate) onUpdate(post.id, { is_hidden: true });
                }}
                className="cursor-pointer hover:bg-gray-800 text-gray-300 focus:bg-gray-800 focus:text-white"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Not Interested
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </div>
  );
}
