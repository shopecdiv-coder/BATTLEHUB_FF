import React, { useState, useEffect } from "react";
import { Heart, MessageCircle, Bookmark, Share2, Eye, Pin, BadgeCheck } from "lucide-react";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment } from "@/entities/MediaComment";
import { Channel, Follower } from "@/api/entities";
import { formatDistanceToNow } from "date-fns";

export default function MediaAllCard({ post, user, onUpdate, onOpenComments, onShare, onViewProfile }) {
  const isAdmin = user?.role === 'admin' || user?.email === 'shopecdiv@gmail.com';
  const isMe = user?.id === (post.user_id || post.author_id);
  const [liked, setLiked] = useState(post.likes?.includes(user?.id) || false);
  const [saved, setSaved] = useState(post.saves?.includes(user?.id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [followerCount, setFollowerCount] = useState(post.author_followers || 0);
  const [channelInfo, setChannelInfo] = useState(null);
  const [followId, setFollowId] = useState(null);

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
      
      Follower.filter({ following_id: uid }).then(res => {
        if (res) setFollowerCount(res.length);
      }).catch(console.error);
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
        setFollowerCount(p => Math.max(0, p - 1));
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
        setFollowerCount(p => p + 1);
      }
    } catch (err) {
      console.error("Follow error", err);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) { alert("Please login to like"); return; }
    const originalLiked = liked;
    setLiked(!originalLiked);
    setLikesCount(prev => originalLiked ? prev - 1 : prev + 1);
    
    try {
      const isLiked = await MediaPost.toggleLike(post.id, user.id);
      setLiked(isLiked);
    } catch (e) {
      setLiked(originalLiked);
      setLikesCount(prev => originalLiked ? prev + 1 : prev - 1);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!user) { alert("Please login to save"); return; }
    const originalSaved = saved;
    setSaved(!originalSaved);
    try {
      const isSaved = await MediaPost.toggleSave(post.id, user.id);
      setSaved(isSaved);
    } catch (e) {
      setSaved(originalSaved);
    }
  };

  const handlePin = async (e) => {
    e.stopPropagation();
    if (!isAdmin) return;
    try {
      await MediaPost.update(post.id, { is_pinned: !post.is_pinned });
      if (onUpdate) onUpdate(post.id, { is_pinned: !post.is_pinned });
    } catch (e) {}
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(post);
    }
  };

  const safeDate = (() => {
    try {
      const d = new Date(post.created_date || 0);
      return isNaN(d.getTime()) ? 'Unknown' : formatDistanceToNow(d, { addSuffix: true });
    } catch(e) { return 'Unknown'; }
  })();

  return (
    <div className={`sm:border sm:rounded-xl overflow-hidden mb-2 sm:mb-4 shadow-lg flex flex-col ${post.is_pinned ? 'border-2 border-blue-400 bg-gradient-to-br from-blue-950/80 to-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-gray-900 border-y border-gray-800'}`}>
      
      {/* 1. Media Area (Top) */}
      {post.type !== "text" && (post.media_url || post.video_url) && (
        <div className="w-full bg-black relative flex items-center justify-center" style={{ maxHeight: post.type === 'video' ? 'auto' : '650px', aspectRatio: post.type === 'video' ? '16/9' : 'auto' }}>
          {(post.type === "video" || post.type === "reel") ? (
            <video 
              src={post.media_url || post.video_url} 
              poster={post.thumbnail_url}
              className="w-full max-h-[650px] object-contain"
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img 
              src={post.media_url || post.video_url} 
              alt="Post media" 
              className="w-full max-h-[650px] object-contain"
            />
          )}
        </div>
      )}

      {/* 2. Details Area (Bottom) */}
      <div className={`p-3 sm:p-4 flex flex-col gap-3 ${post.is_pinned ? 'bg-black/20' : 'bg-[#0c0d12]'}`}>
        
        {/* Title and Stats */}
        <div className="flex flex-col gap-1">
          {post.title && <h3 className="text-white font-bold text-base sm:text-[17px] leading-tight line-clamp-2">{renderTextWithLinks(post.title)}</h3>}
          <div className="flex items-center gap-1.5 text-gray-400 text-xs sm:text-[13px] mt-0.5">
            <span>{(post.views || 0).toLocaleString()} views</span>
            <span>•</span>
            <span>{safeDate}</span>
            {post.is_pinned && <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full ml-2">Pinned</span>}
          </div>
        </div>

        {/* Channel Info Row */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className={`w-10 h-10 rounded-full border border-gray-800 overflow-hidden bg-black flex-shrink-0 ${!isMe ? 'cursor-pointer' : ''}`}
              onClick={(e) => { e.stopPropagation(); if(!isMe && onViewProfile) onViewProfile(post.user_id || post.author_id); }}
            >
              <img 
                src={channelInfo?.logo_url || post.author_avatar || "https://api.dicebear.com/6.x/bottts/svg?seed=BH"} 
                alt="Author" 
                className="w-full h-full object-cover" 
                onError={(e) => { e.target.src = "https://api.dicebear.com/6.x/bottts/svg?seed=BH"; }} 
              />
            </div>
            <div 
              className="flex flex-col min-w-0 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); if(!isMe && onViewProfile) onViewProfile(post.user_id || post.author_id); }}
            >
              <span className="text-white font-bold text-[14px] flex items-center gap-1.5 truncate hover:underline">
                {channelInfo?.name || post.author_name || "BATTLEHUB FF"}
                {(post.author_role === 'admin' || post.author_name?.includes("BATTLEHUB") || post.author_id === 'shopecdiv@gmail.com') && (
                  <BadgeCheck className="w-3.5 h-3.5 text-gray-400 fill-white flex-shrink-0" />
                )}
              </span>
              <span className="text-gray-400 text-[11px] truncate">{followerCount} followers</span>
            </div>
            {user && (post.user_id || post.author_id) !== user.id && (
              <button 
                onClick={handleFollow}
                className={`ml-2 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${followId ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-200'}`}
              >
                {followId ? 'Following' : 'Subscribe'}
              </button>
            )}
          </div>
        </div>

        {/* Action Pills Row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-1 pb-1">
          <div className="flex items-center bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <button onClick={handleLike} className="flex items-center gap-1.5 px-4 py-1.5 border-r border-white/10">
              <Heart className={`w-4 h-4 ${liked ? 'fill-white text-white' : 'text-white'}`} />
              <span className="text-sm font-medium text-white">{likesCount}</span>
            </button>
            {post.comments_enabled !== false && !post.comments_disabled && (
              <button onClick={(e) => { e.stopPropagation(); onOpenComments(post); }} className="flex items-center gap-1.5 px-4 py-1.5">
                <MessageCircle className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">{commentsCount}</span>
              </button>
            )}
          </div>

          <button onClick={handleShare} className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">Share</span>
          </button>

          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-white text-white' : 'text-white'}`} />
            <span className="text-sm font-medium">Save</span>
          </button>
          
          {isAdmin && (
            <button onClick={handlePin} className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
              <Pin className={`w-4 h-4 ${post.is_pinned ? 'fill-white text-white' : 'text-white'}`} />
            </button>
          )}
        </div>

        {/* Description Box */}
        {post.description && (
          <div className="mt-2 bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-3 text-sm text-gray-200 whitespace-pre-wrap">
            {renderTextWithLinks(post.description)}
          </div>
        )}
      </div>
    </div>
  );
}
