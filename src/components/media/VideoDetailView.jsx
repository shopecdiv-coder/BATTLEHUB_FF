import React, { useState, useEffect, useRef, useCallback } from "react";
import { ThumbsUp, ThumbsDown, Share2, Bookmark, BadgeCheck, ChevronDown, ChevronUp, MessageCircle, X, Send, Loader2, MoreVertical, Clock, Flag } from "lucide-react";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment } from "@/entities/MediaComment";
import { Channel, Follower } from "@/api/entities";
import { formatDistanceToNow } from "date-fns";
import { createPortal } from "react-dom";
import VideoCard from "@/components/media/VideoCard";
import BHTVPlayer from "@/components/ui/BHTVPlayer";

const _channelCache = new Map();

const safeDate = (d) => {
  try {
    if (!d) return "";
    const obj = new Date(d);
    if (isNaN(obj.getTime())) return "";
    return formatDistanceToNow(obj, { addSuffix: true });
  } catch { return ""; }
};

const formatViews = (n) => {
  if (!n) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
};

const renderTextWithLinks = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-words">{part}</a>;
    }
    return part;
  });
};

export default function VideoDetailView({ post, user, onShare, onViewProfile, suggestedPosts = [], onSelectVideo, onOpenComments, sharedVideoState, onMinimize }) {
  const [liked, setLiked] = useState(post.likes?.includes(user?.id));
  const [saved, setSaved] = useState(post.saves?.includes(user?.id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [channelInfo, setChannelInfo] = useState(null);
  const [followId, setFollowId] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [disliked, setDisliked] = useState(post.dislikes?.includes(user?.id) || false);
  const [dislikesCount, setDislikesCount] = useState(post.dislikes?.length || 0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const uid = post.user_id || post.author_id;

  useEffect(() => {
    setLiked(post.likes?.includes(user?.id) || false);
    setSaved(post.saves?.includes(user?.id) || false);
    setLikesCount(post.likes?.length || 0);
    setDisliked(post.dislikes?.includes(user?.id) || false);
    setDislikesCount(post.dislikes?.length || 0);
  }, [post, user?.id]);

  const [followerCount, setFollowerCount] = useState(post.author_followers || 0);

  useEffect(() => {
    if (!uid) return;
    if (_channelCache.has(uid)) {
      setChannelInfo(_channelCache.get(uid));
    } else {
      Channel.filter({ user_id: uid }).then(res => {
        const info = (res && res.length > 0) ? res[0] : null;
        _channelCache.set(uid, info);
        setChannelInfo(info);
      }).catch(() => {});
    }
    
    Follower.filter({ following_id: uid }).then(res => {
      if (res) setFollowerCount(res.length);
    }).catch(() => {});
    if (user && user.id !== uid) {
      Follower.filter({ follower_id: user.id, following_id: uid }).then(res => {
        if (res && res.length > 0) setFollowId(res[0].id);
        else setFollowId(null);
      }).catch(() => {});
    }
  }, [uid, user]);

  const [currentUserChannel, setCurrentUserChannel] = useState(null);
  useEffect(() => {
    if (user?.id) {
      Channel.filter({ user_id: user.id }).then(c => {
        if (c && c.length > 0) setCurrentUserChannel(c[0]);
      }).catch(() => {});
    }
  }, [user?.id]);

  const [localViews, setLocalViews] = useState(post.views || 0);
  useEffect(() => {
    if (user?.id) {
      MediaPost.incrementView(post.id, user.id).then(newCount => {
        if (newCount !== undefined && newCount !== localViews) {
          setLocalViews(newCount);
        }
      }).catch(() => {});
    }
  }, [post.id, user?.id]);

  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments_count || 0);

  useEffect(() => {
    // Skip loading state on re-fetches to avoid flickering
    if (comments.length === 0) setCommentsLoading(true);
    
    MediaComment.filter({ post_id: post.id, is_deleted: false }).then(res => {
      const fetched = res || [];
      // Sort by newest first so the preview shows the latest comment!
      fetched.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setComments(fetched);
      const trueCount = fetched.length + fetched.reduce((acc, c) => acc + (c.replies?.length || 0), 0);
      setLocalCommentsCount(trueCount);
      setCommentsLoading(false);
    }).catch(() => setCommentsLoading(false));
  }, [post.id, post.comments_count]);

  const handleLike = async () => {
    if (!user) return;
    const origLiked = liked;
    setLiked(!origLiked);
    setLikesCount(p => origLiked ? p - 1 : p + 1);
    
    if (!origLiked && disliked) {
      setDisliked(false);
      setDislikesCount(p => p - 1);
      MediaPost.toggleDislike(post.id, user.id);
    }

    try {
      const isLiked = await MediaPost.toggleLike(post.id, user.id);
      setLiked(isLiked);
    } catch {
      setLiked(origLiked);
      setLikesCount(p => origLiked ? p + 1 : p - 1);
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    const origDisliked = disliked;
    setDisliked(!origDisliked);
    setDislikesCount(p => origDisliked ? p - 1 : p + 1);
    
    if (!origDisliked && liked) {
      setLiked(false);
      setLikesCount(p => p - 1);
      MediaPost.toggleLike(post.id, user.id);
    }

    try {
      const isDisliked = await MediaPost.toggleDislike(post.id, user.id);
      setDisliked(isDisliked);
    } catch {
      setDisliked(origDisliked);
      setDislikesCount(p => origDisliked ? p + 1 : p - 1);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const orig = saved;
    setSaved(!orig);
    try {
      const isSaved = await MediaPost.toggleSave(post.id, user.id);
      setSaved(isSaved);
    } catch { setSaved(orig); }
  };

  const handleFollow = async () => {
    if (!user) return;
    try {
      if (followId) {
        await Follower.delete(followId);
        setFollowId(null);
        setFollowerCount(p => Math.max(0, p - 1));
      } else {
        // Prevent duplicate: check if already following
        const existing = await Follower.filter({ follower_id: user.id, following_id: uid });
        if (existing && existing.length > 0) {
          setFollowId(existing[0].id);
          return;
        }
        const res = await Follower.create({ follower_id: user.id, following_id: uid });
        setFollowId(res.id);
        setFollowerCount(p => p + 1);
      }
    } catch (err) { console.error(err); }
  };



  const channelName = channelInfo?.name || post.author_name || "Unknown";
  const avatar = channelInfo?.logo_url || post.author_avatar;
  const isVerified = post.author_role === "admin" || post.author_name?.includes("BATTLEHUB") || post.author_id === "shopecdiv@gmail.com";
  const firstComment = comments[0];

  // Process suggested videos: Smart Mix
  const relatedVideos = React.useMemo(() => {
    const valid = suggestedPosts.filter(p => p.id !== post.id && p.type === 'video');
    const sameChannel = valid.filter(p => (p.user_id || p.author_id) === uid);
    const others = valid.filter(p => (p.user_id || p.author_id) !== uid);
    
    // Shuffle others to simulate a mix of similar/followed content
    const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
    
    const result = [];
    // 1st slot: One video from the same channel
    if (sameChannel.length > 0) result.push(sameChannel[0]);
    
    // Next 3 slots: Videos from other channels (mixed variety)
    result.push(...shuffledOthers.slice(0, 3));
    
    // Fill the rest with remaining videos from same channel and others
    if (sameChannel.length > 1) result.push(...sameChannel.slice(1));
    result.push(...shuffledOthers.slice(3));
    
    return result;
  }, [suggestedPosts, post.id, uid]);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0f0f0f] no-scrollbar">

      {/* ── Always-Sticky Video Player ── */}
      <div
        className="w-full bg-black flex-shrink-0 sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.8)] bhtv-video-container"
        style={{ aspectRatio: '16/9' }}
      >
        <BHTVPlayer 
          src={post.media_url || post.video_url} 
          autoPlay 
          className="w-full h-full max-h-[85vh] sm:max-h-[100dvh]" 
          sharedState={sharedVideoState}
          onSwipeDown={() => onMinimize && onMinimize()}
          userId={user?.id}
          postId={post.id}
        />
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col px-4 pt-4 pb-28 bhtv-video-content">

        {/* Title — click to expand description */}
        <div
          className="cursor-pointer mb-1 flex flex-col gap-0.5 px-1"
          onClick={() => post.description && setDescExpanded(v => !v)}
        >
          <h1 className="text-white font-bold text-lg leading-tight">{post.title || "Untitled"}</h1>
          <div className="flex items-center text-gray-400 text-[13px] gap-2 mt-1">
            <span>{formatViews(localViews)} views</span>
            <span>•</span>
            <span>{safeDate(post.created_date || post.created_at)}</span>
            {post.description && (
              <span className="ml-auto flex items-center gap-0.5 text-gray-400 text-xs font-semibold">
                {descExpanded ? (
                  <><ChevronUp className="w-4 h-4" /> less</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> more</>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Description — expands on title click */}
        {post.description && descExpanded && (
          <div className="mt-2 mb-3 text-gray-300 text-[13px] whitespace-pre-wrap leading-relaxed bg-white/5 rounded-xl p-3">
            {renderTextWithLinks(post.description)}
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex items-center gap-2 mt-3 mb-4 w-full">
          {/* Like / Dislike Group */}
          <div className="flex items-center bg-white/10 rounded-full flex-shrink-0">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-l-full text-[13px] font-semibold transition-all hover:bg-white/20 text-white`}
            >
              <ThumbsUp className="w-[18px] h-[18px]" fill={liked ? "currentColor" : "none"} />
              <span>{likesCount}</span>
            </button>
            <div className="w-[1px] h-5 bg-white/20" />
            <button
              onClick={handleDislike}
              className={`flex items-center gap-1.5 justify-center px-3 py-2 rounded-r-full hover:bg-white/20 transition-all text-white`}
            >
              <ThumbsDown className="w-[18px] h-[18px]" fill={disliked ? "currentColor" : "none"} />
              <span>{dislikesCount}</span>
            </button>
          </div>

          <button
            onClick={() => onShare && onShare(post)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold bg-white/10 text-white hover:bg-white/20 transition-all whitespace-nowrap flex-shrink-0"
          >
            <Share2 className="w-[18px] h-[18px]" />
            Share
          </button>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap flex-shrink-0 bg-white/10 text-white hover:bg-white/20`}
          >
            <Bookmark className="w-[18px] h-[18px]" fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>

          {/* 3 Dot Menu Button */}
          <div className="relative ml-auto">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex-shrink-0"
            >
              <MoreVertical className="w-6 h-6" />
            </button>

            {/* Bottom Sheet Menu via Portal */}
            {showMoreMenu && createPortal(
              <>
                <div 
                  className="fixed inset-0 bg-black/60 z-[100] animate-in fade-in" 
                  onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); }} 
                />
                <div className="fixed bottom-0 left-0 right-0 bg-[#212121] rounded-t-2xl z-[101] animate-in slide-in-from-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10 pb-safe">
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2" />
                  <div className="flex flex-col py-2">
                    <button 
                      onClick={() => { setShowMoreMenu(false); alert("Added to Watch later"); }}
                      className="w-full flex items-center gap-4 px-6 py-4 text-white hover:bg-white/10 transition-colors"
                    >
                      <Clock className="w-6 h-6" />
                      <span className="text-[15px] font-medium">Save to Watch later</span>
                    </button>
                    <button 
                      onClick={() => { setShowMoreMenu(false); setReportModalOpen(true); }}
                      className="w-full flex items-center gap-4 px-6 py-4 text-white hover:bg-white/10 transition-colors"
                    >
                      <Flag className="w-6 h-6" />
                      <span className="text-[15px] font-medium">Report</span>
                    </button>
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>

        {/* ── Channel Row ── */}
        <div className="flex items-center gap-3 mt-1 mb-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 cursor-pointer"
            onClick={() => onViewProfile && onViewProfile(uid)}
          >
            {avatar ? (
              <img src={avatar} alt={channelName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {channelName[0]?.toUpperCase()}
              </div>
            )}
          </div>

          {/* Name & Subs */}
          <div
            className="flex flex-col flex-1 min-w-0 cursor-pointer"
            onClick={() => onViewProfile && onViewProfile(uid)}
          >
            <div className="flex items-center gap-1 text-white font-bold text-[14px]">
              <span className="truncate">{channelName}</span>
              {isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
            </div>
            <span className="text-gray-400 text-[12px]">{followerCount} followers</span>
          </div>

          {/* Subscribe / Following button */}
          {user && uid !== user.id && (
            <button
              onClick={handleFollow}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-all ${
                followId
                  ? "bg-white/10 text-gray-300 hover:bg-white/15 border border-white/10"
                  : "bg-white text-black hover:bg-gray-200"
              }`}
            >
              {followId ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* ── Comments Preview (click to open bottom sheet) ── */}
        <div
          className="bg-white/5 hover:bg-white/8 rounded-xl p-4 cursor-pointer transition-colors"
          onClick={() => onOpenComments && onOpenComments(post)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-white text-[14px]">
              Comments <span className="text-gray-400 font-normal">{localCommentsCount}</span>
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>

          {commentsLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : firstComment ? (
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                <img 
                  src={(firstComment.user_id === user?.id && currentUserChannel) ? currentUserChannel.logo_url : (firstComment.user_avatar || firstComment.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${firstComment.user_id || firstComment.id}`)} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-white text-[12px] font-semibold mr-2">
                  {(firstComment.user_id === user?.id && currentUserChannel) ? currentUserChannel.name : firstComment.username}
                </span>
                <span className="text-gray-300 text-[12px] line-clamp-1">{firstComment.content || firstComment.text}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-[13px]">No comments yet. Be the first!</p>
          )}
        </div>

        {/* ── Suggested Videos ── */}
        {relatedVideos.length > 0 && (
          <div className="mt-6 -mx-1">
            <h3 className="text-white font-bold text-[16px] mb-3 px-1">Up next</h3>
            <div className="flex flex-col gap-1">
              {relatedVideos.map(p => (
                <VideoCard
                  key={p.id}
                  post={p}
                  user={user}
                  onShare={onShare}
                  onClick={() => onSelectVideo && onSelectVideo(p)}
                />
              ))}
            </div>
          </div>
        )}
      </div>



      {/* Report Modal */}
      {reportModalOpen && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 animate-in fade-in" onClick={() => setReportModalOpen(false)} />
          <div className="relative bg-[#212121] w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 border border-white/10">
            <h3 className="text-white text-lg font-bold mb-4">Report Video</h3>
            <p className="text-gray-400 text-sm mb-3">Please describe why you are reporting this video:</p>
            <textarea
              autoFocus
              className="w-full bg-black/50 text-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#00FFFF]/50 border border-white/10 resize-none min-h-[100px] text-sm placeholder-gray-500"
              placeholder="Reason for reporting..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("Report submitted: " + reportReason);
                  setReportModalOpen(false);
                  setReportReason("");
                }}
                disabled={!reportReason.trim()}
                className="px-4 py-2 text-sm font-bold text-black bg-[#00FFFF] rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-300 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
