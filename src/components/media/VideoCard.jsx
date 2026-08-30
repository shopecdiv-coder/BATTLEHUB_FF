import React, { useState, useEffect, useRef } from "react";
import { BadgeCheck, Share2, Clock, Trash2 } from "lucide-react";
import { Channel } from "@/api/entities";
import { MediaPost } from "@/entities/MediaPost";
import { formatDistanceToNow } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Module-level cache so channel info is only fetched once per session
const _channelCache = new Map();
// Cache video durations by URL
const _durationCache = new Map();
// Cache generated thumbnails by URL
const _thumbnailCache = new Map();

const safeDate = (d) => {
  try {
    if (!d) return "";
    const obj = new Date(d);
    if (isNaN(obj.getTime())) return "";
    return formatDistanceToNow(obj, { addSuffix: true });
  } catch { return ""; }
};

const formatDuration = (secs) => {
  if (!secs || isNaN(secs) || !isFinite(secs)) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
};

const formatViews = (n) => {
  if (!n) return "0 views";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M views`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K views`;
  return `${n} views`;
};

export default function VideoCard({ post, onClick, onShare, user, onRemoveHistory, onRemoveWatchLater, onRemoveLikedVideo }) {
  const [channelInfo, setChannelInfo] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [duration, setDuration] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [watchLaterDone, setWatchLaterDone] = useState(
    post.saves?.includes(user?.id) || false
  );
  const menuRef = useRef(null);
  const uid = post.user_id || post.author_id;
  const videoSrc = post.media_url || post.video_url;

  // History progress
  const [watchProgress, setWatchProgress] = useState(0);

  useEffect(() => {
    if (user?.id) {
      try {
        const hist = JSON.parse(localStorage.getItem(`bh_watch_history_${user.id}`)) || [];
        const entry = hist.find(h => h.postId === post.id);
        if (entry && entry.percentage > 0) {
          setWatchProgress(Math.min(100, entry.percentage));
        }
      } catch (e) {}
    }
  }, [user?.id, post.id]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuOpen]);

  const [generatedThumbnail, setGeneratedThumbnail] = useState(null);

  // Fetch real duration from video metadata and generate thumbnail if missing
  useEffect(() => {
    if (!videoSrc) return;
    
    const needsDuration = !_durationCache.has(videoSrc);
    const needsThumbnail = !post.thumbnail_url && !_thumbnailCache.has(videoSrc);
    
    if (!needsDuration && !needsThumbnail) {
      if (!needsDuration) setDuration(_durationCache.get(videoSrc));
      if (!needsThumbnail && !post.thumbnail_url) setGeneratedThumbnail(_thumbnailCache.get(videoSrc));
      return;
    }

    const vid = document.createElement('video');
    vid.crossOrigin = "anonymous";
    vid.preload = 'metadata';
    vid.src = videoSrc;
    
    vid.onloadedmetadata = () => {
      if (needsDuration) {
        const d = formatDuration(vid.duration);
        _durationCache.set(videoSrc, d);
        setDuration(d);
      }
      if (needsThumbnail && vid.duration > 0) {
        // Seek to 25% of the video to grab a random interesting frame instead of a black screen
        vid.currentTime = Math.max(1, vid.duration * 0.25);
      } else {
        vid.src = '';
      }
    };
    
    vid.onseeked = () => {
      if (needsThumbnail) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = vid.videoWidth || 1280;
          canvas.height = vid.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          _thumbnailCache.set(videoSrc, dataUrl);
          setGeneratedThumbnail(dataUrl);
        } catch (e) {
          console.log('Thumbnail generation failed due to CORS');
        }
      }
      vid.src = '';
    };
    
    vid.onerror = () => { vid.src = ''; };
  }, [videoSrc, post.thumbnail_url]);

  useEffect(() => {
    if (!uid) return;
    if (_channelCache.has(uid)) {
      setChannelInfo(_channelCache.get(uid));
      return;
    }
    Channel.filter({ user_id: uid }).then(res => {
      const info = (res && res.length > 0) ? res[0] : null;
      _channelCache.set(uid, info);
      setChannelInfo(info);
    }).catch(() => {});
  }, [uid]);

  const thumbnail = post.thumbnail_url || generatedThumbnail;
  const channelName = channelInfo?.name || post.author_name || "Unknown";
  const avatar = channelInfo?.logo_url || post.author_avatar;
  const isVerified = post.author_role === "admin" || post.author_name?.includes("BATTLEHUB") || post.author_id === "shopecdiv@gmail.com";

  if (post.type === 'reel' || post.video_type === 'short') {
    return (
      <div
        className="cursor-pointer group relative w-full h-full aspect-[9/16] shadow-sm flex-none rounded-xl"
        onClick={() => onClick && onClick(post)}
      >
        <div className="absolute inset-0 rounded-xl overflow-hidden bg-gray-900 pointer-events-none">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={post.title || "Reel"}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              {imgError ? (
                 <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                 <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin"></div>
              )}
            </div>
          )}
          
          {/* Gradient Overlay for Text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
        </div>
        
        {/* Play/Reel Icon Badge */}
        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md text-white p-1.5 rounded-full pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>

        {/* 3 dot menu */}
        <div className="absolute top-2 right-2 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="bg-black/40 backdrop-blur-md text-white p-1.5 rounded-full hover:bg-black/60 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-48 bg-[#1e1e2e] border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden p-1">
              {onRemoveHistory ? (
                <DropdownMenuItem
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400 focus:bg-white/10 focus:text-red-300 transition-colors cursor-pointer rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveHistory(post);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  Delete from History
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-white focus:bg-white/10 transition-colors cursor-pointer rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onShare) onShare(post);
                    }}
                  >
                    <Share2 className="w-4 h-4 text-gray-400" />
                    Share
                  </DropdownMenuItem>
                  
                  {onRemoveWatchLater ? (
                    <DropdownMenuItem
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400 focus:bg-white/10 focus:text-red-300 transition-colors cursor-pointer rounded-lg"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onRemoveWatchLater(post);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      Remove from Watch Later
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors cursor-pointer rounded-lg focus:bg-white/10"
                      style={{ color: watchLaterDone ? '#38bdf8' : 'white' }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!user) { alert('Please login'); return; }
                        try {
                          const isSaved = await MediaPost.toggleSave(post.id, user.id);
                          setWatchLaterDone(isSaved);
                          if (isSaved) {
                            toast.success("Saved to Watch Later");
                          } else {
                            toast.success("Removed from Watch Later");
                          }
                        } catch { }
                      }}
                    >
                      <Clock className={`w-4 h-4 ${watchLaterDone ? 'text-orange-500' : 'text-gray-400'}`} />
                      {watchLaterDone ? 'Saved to Watch Later' : 'Watch Later'}
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col justify-end pointer-events-none">
          <h3 className="text-white text-sm font-semibold line-clamp-2 leading-tight drop-shadow-md mb-1">
            {post.title || "Untitled Reel"}
          </h3>
          <p className="text-gray-300 text-[11px] font-medium drop-shadow-md">
            {formatViews(post.views)}
          </p>
        </div>

        {/* Watch Progress Bar */}
        {watchProgress > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600/50 rounded-b-xl overflow-hidden pointer-events-none z-10">
            <div className="h-full bg-red-600" style={{ width: `${watchProgress}%` }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer group mb-0"
      onClick={() => onClick && onClick(post)}
    >
      {/* Thumbnail */}
      <div className="relative w-full bg-gray-900 rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={post.title || "Video"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            {imgError ? (
               <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M8 5v14l11-7z" />
               </svg>
            ) : (
               <div className="w-8 h-8 border-4 border-gray-600 border-t-gray-300 rounded-full animate-spin"></div>
            )}
          </div>
        )}
        {/* Real video duration badge */}
        {duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
            {duration}
          </span>
        )}
        {post.is_pinned && (
          <span className="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Pinned
          </span>
        )}
        
        {/* Watch Progress Bar */}
        {watchProgress > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600/50">
            <div 
              className="h-full bg-red-600" 
              style={{ width: `${watchProgress}%` }} 
            />
          </div>
        )}
      </div>

      {/* Info Row */}
      <div className="flex gap-3 pt-3 px-1 pb-4">
        {/* Channel Avatar */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gray-700 mt-0.5">
          {avatar ? (
            <img
              src={avatar}
              alt={channelName}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
              {channelName[0]?.toUpperCase()}
            </div>
          )}
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-[14px] font-semibold leading-snug line-clamp-2 mb-1 group-hover:text-orange-500 transition-colors">
            {post.title || "Untitled"}
          </h3>
          <div className="flex items-center gap-1 text-gray-400 text-[12px]">
            <span className="truncate">{channelName}</span>
            {isVerified && <BadgeCheck className="w-3 h-3 text-gray-400 flex-shrink-0" />}
          </div>
          <div className="text-gray-500 text-[12px] mt-0.5">
            {formatViews(post.views)} • {safeDate(post.created_date || post.created_at)}
          </div>
        </div>

        {/* 3 dot menu */}
        <div className="flex-shrink-0 flex items-start mt-1 relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-gray-500 hover:text-gray-200 p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48 bg-[#1e1e2e] border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden p-1">
              {onRemoveHistory ? (
                <DropdownMenuItem
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400 focus:bg-white/10 focus:text-red-300 transition-colors cursor-pointer rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveHistory(post);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  Delete from History
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-white focus:bg-white/10 transition-colors cursor-pointer rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onShare) onShare(post);
                    }}
                  >
                    <Share2 className="w-4 h-4 text-gray-400" />
                    Share
                  </DropdownMenuItem>
                  
                  {onRemoveWatchLater ? (
                    <DropdownMenuItem
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400 focus:bg-white/10 focus:text-red-300 transition-colors cursor-pointer rounded-lg"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onRemoveWatchLater(post);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      Remove from Watch Later
                    </DropdownMenuItem>
                  ) : onRemoveLikedVideo ? (
                    <DropdownMenuItem
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400 focus:bg-white/10 focus:text-red-300 transition-colors cursor-pointer rounded-lg"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onRemoveLikedVideo(post);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      Remove from Liked Videos
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors cursor-pointer rounded-lg focus:bg-white/10"
                      style={{ color: watchLaterDone ? '#38bdf8' : 'white' }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!user) { alert('Please login'); return; }
                        try {
                          const isSaved = await MediaPost.toggleSave(post.id, user.id);
                          setWatchLaterDone(isSaved);
                          if (isSaved) {
                            toast.success("Saved to Watch Later");
                          } else {
                            toast.success("Removed from Watch Later");
                          }
                        } catch { }
                      }}
                    >
                      <Clock className={`w-4 h-4 ${watchLaterDone ? 'text-orange-500' : 'text-gray-400'}`} />
                      {watchLaterDone ? 'Saved to Watch Later' : 'Watch Later'}
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
