import React, { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Bookmark, Play, Volume2, VolumeX, ChevronDown, ChevronUp } from "lucide-react";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment } from "@/entities/MediaComment";
import { formatDistanceToNow } from "date-fns";

export default function MediaPostCard({ post, user, onUpdate, onOpenComments }) {
  const [liked, setLiked] = useState(post.likes?.includes(user?.id));
  const [saved, setSaved] = useState(post.saves?.includes(user?.id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const saved = localStorage.getItem('reels_muted');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const clickTimeout = useRef(null);

  useEffect(() => {
    if (post.comments_count === undefined) {
      MediaComment.filter({ post_id: post.id }).then(res => setCommentsCount(res.length));
    }
  }, [post.id, post.comments_count]);

  // Track views and auto-play using IntersectionObserver
  useEffect(() => {
    if (!cardRef.current) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsPlaying(true);
          if (videoRef.current) {
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

  const handleToggleMute = (e) => {
    e.stopPropagation();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    try {
      localStorage.setItem('reels_muted', JSON.stringify(newMuted));
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

  return (
    <div 
      ref={cardRef} 
      className="relative w-full h-full snap-start bg-black flex items-center justify-center overflow-hidden group"
      onClick={handleInteraction}
    >
      {/* Giant Heart Pop-up Animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-in zoom-in duration-300">
          <Heart className="w-32 h-32 text-red-500 fill-red-500 drop-shadow-2xl" />
        </div>
      )}

      {/* Media Layer */}
      {post.type === "video" && post.media_url ? (
        <>
            <video 
              ref={videoRef}
              src={post.media_url} 
              poster={post.thumbnail_url}
              className={`absolute w-full h-full ${post.video_type === 'long' ? 'object-contain' : 'object-cover'}`}
              loop
              playsInline
              muted={isMuted}
            />

          {/* Pause Overlay Icon */}
          {!isPlaying && !showHeart && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none transition-opacity z-10">
              <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white">
                <Play className="w-10 h-10 ml-1 fill-white" />
              </div>
            </div>
          )}
          
          {/* Mute/Unmute Toggle */}
          <button 
            onClick={handleToggleMute}
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

      {/* Dark Gradient Overlay for text readability */}
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

      {/* Info Layer (Bottom Left) */}
      <div className="absolute bottom-0 left-0 p-4 pb-24 w-[85%] z-20 flex flex-col justify-end pointer-events-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full border-2 border-orange-500 overflow-hidden bg-gray-900">
            <img 
              src={post.author_avatar || "https://api.dicebear.com/6.x/bottts/svg?seed=BH"} 
              alt="Author" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.target.src = "https://api.dicebear.com/6.x/bottts/svg?seed=BH"; }} 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-[15px] drop-shadow-md flex items-center gap-2">
              {post.author_name || "BATTLEHUB FF"}
              {post.is_pinned && <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full">Pinned</span>}
            </span>
          </div>
        </div>

        <div 
          className="cursor-pointer group/title"
          onClick={(e) => { e.stopPropagation(); setShowFullDesc(!showFullDesc); }}
        >
          {post.title && post.type !== "text" && (
            <h3 className="text-white font-bold text-lg mb-1 drop-shadow-md flex items-center gap-1">
              {post.title}
              {showFullDesc ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity" />}
            </h3>
          )}
          
          {showFullDesc && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              {post.description && (
                <p className="text-gray-200 text-sm drop-shadow-md w-[90%] whitespace-pre-wrap mb-2">
                  {post.description}
                </p>
              )}
              <span className="text-gray-400 text-xs drop-shadow-md">
                Uploaded {(() => {
                  try {
                    const d = new Date(post.created_date || 0);
                    return isNaN(d.getTime()) ? 'Unknown' : formatDistanceToNow(d, { addSuffix: true });
                  } catch(e) { return 'Unknown'; }
                })()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions Layer (Bottom Right Vertical Stack) */}
      <div className="absolute bottom-0 right-0 p-4 pb-24 z-20 flex flex-col items-center justify-end gap-6 pointer-events-auto">
        
        <div className="flex flex-col items-center gap-1 group">
          <button 
            onClick={handleLike}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${liked ? 'bg-red-500/20' : 'bg-black/40 backdrop-blur'}`}
          >
            <Heart className={`w-7 h-7 ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-md">{likesCount}</span>
        </div>

        {!post.comments_disabled && (
          <div className="flex flex-col items-center gap-1 group">
            <button 
              onClick={(e) => { e.stopPropagation(); onOpenComments(post); }}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center transition-transform hover:scale-110"
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </button>
            <span className="text-white text-xs font-bold drop-shadow-md">{commentsCount}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-1 group">
          <button 
            onClick={handleSave}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${saved ? 'bg-orange-500/20' : 'bg-black/40 backdrop-blur'}`}
          >
            <Bookmark className={`w-7 h-7 ${saved ? 'text-orange-500 fill-orange-500' : 'text-white'}`} />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-md">Save</span>
        </div>

      </div>
    </div>
  );
}
