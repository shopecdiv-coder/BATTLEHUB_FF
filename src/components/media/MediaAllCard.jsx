import React, { useState, useEffect } from "react";
import { Heart, MessageCircle, Bookmark, Share2, Eye, Pin, BadgeCheck } from "lucide-react";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment } from "@/entities/MediaComment";
import { formatDistanceToNow } from "date-fns";

export default function MediaAllCard({ post, user, onUpdate, onOpenComments }) {
  const isAdmin = user?.role === 'admin' || user?.email === 'shopecdiv@gmail.com';
  const [liked, setLiked] = useState(post.likes?.includes(user?.id));
  const [saved, setSaved] = useState(post.saves?.includes(user?.id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);

  useEffect(() => {
    if (post.comments_count === undefined) {
      MediaComment.filter({ post_id: post.id }).then(res => setCommentsCount(res.length));
    }
  }, [post.id, post.comments_count]);

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

  const safeDate = (() => {
    try {
      const d = new Date(post.created_date || 0);
      return isNaN(d.getTime()) ? 'Unknown' : formatDistanceToNow(d, { addSuffix: true });
    } catch(e) { return 'Unknown'; }
  })();

  return (
    <div className={`sm:border sm:rounded-xl overflow-hidden mb-2 sm:mb-4 shadow-lg flex flex-col ${post.is_pinned ? 'border-2 border-blue-400 bg-gradient-to-br from-blue-950/80 to-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-gray-900 border-y border-gray-800'}`}>
      
      {/* 1. Header & Content (Title/DP Above Video) */}
      <div className={`p-4 flex flex-col gap-3 ${post.is_pinned ? 'bg-transparent' : 'bg-gray-900'}`}>
        {/* Author Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-gray-700 overflow-hidden bg-black flex-shrink-0">
            <img 
              src={post.author_avatar || "https://api.dicebear.com/6.x/bottts/svg?seed=BH"} 
              alt="Author" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.target.src = "https://api.dicebear.com/6.x/bottts/svg?seed=BH"; }} 
            />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-white font-bold text-[14px] flex items-center gap-1.5 truncate">
              {post.author_name || "BATTLEHUB FF"}
              {(post.author_role === 'admin' || post.author_name?.includes("BATTLEHUB") || post.author_id === 'shopecdiv@gmail.com') && (
                <BadgeCheck className="w-4 h-4 text-blue-500 fill-white flex-shrink-0" />
              )}
              {post.is_pinned && <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full flex-shrink-0 ml-1 shadow-[0_0_10px_rgba(59,130,246,0.6)]">Pinned</span>}
            </span>
            <span className="text-gray-400 text-xs truncate">{safeDate}</span>
          </div>
        </div>

        {/* Title & Desc */}
        <div>
          {post.title && <h3 className="text-white font-bold text-base sm:text-lg mb-1 leading-snug">{post.title}</h3>}
          {post.description && <p className="text-gray-300 text-sm whitespace-pre-wrap">{post.description}</p>}
        </div>
      </div>

      {/* 2. Media Area (Middle) */}
      {post.type !== "text" && post.media_url && (
        <div className="w-full bg-black relative" style={{ maxHeight: post.video_type === 'long' ? '400px' : '650px' }}>
          {post.type === "video" ? (
            <video 
              src={post.media_url} 
              poster={post.thumbnail_url}
              className="w-full h-full object-contain max-h-[650px]"
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img 
              src={post.media_url} 
              alt="Post media" 
              className="w-full h-full object-contain"
              style={{ maxHeight: '650px' }}
            />
          )}
        </div>
      )}

      {/* 3. Footer Actions (One Line) */}
      <div className={`px-4 py-3 border-t flex items-center justify-between ${post.is_pinned ? 'bg-black/20 border-blue-500/30' : 'bg-gray-900 border-gray-800/50'}`}>
        <div className="flex items-center gap-6">
          {/* Like */}
          <button onClick={handleLike} className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-red-500' : ''}`} />
            <span className="text-sm font-medium">{likesCount}</span>
          </button>
          
          {/* Comment */}
          {!post.comments_disabled && (
            <button 
              onClick={() => onOpenComments && onOpenComments(post)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{commentsCount}</span>
            </button>
          )}

          {/* Views */}
          <div className="flex items-center gap-1.5 text-gray-400">
            <Eye className="w-5 h-5" />
            <span className="text-sm font-medium">{(post.views || 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <button onClick={handlePin} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <Pin className={`w-5 h-5 ${post.is_pinned ? 'text-blue-400 fill-blue-400' : ''}`} />
            </button>
          )}
          {/* Save */}
          <button onClick={handleSave} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <Bookmark className={`w-5 h-5 ${saved ? 'text-orange-500 fill-orange-500' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
