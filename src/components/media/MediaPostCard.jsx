import React, { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Bookmark, MoreVertical, Flag, Play, Trash } from "lucide-react";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment } from "@/entities/MediaComment";
import { User } from "@/entities/User";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MediaPostCard({ post, user, onUpdate, isDetail = false }) {
  const [liked, setLiked] = useState(post.likes?.includes(user?.id));
  const [saved, setSaved] = useState(post.saves?.includes(user?.id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [savesCount, setSavesCount] = useState(post.saves?.length || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigate = useNavigate();

  // Track if this post was already viewed in this session
  useEffect(() => {
    if (!post || !post.id) return;
    const viewedPosts = JSON.parse(sessionStorage.getItem("viewed_posts") || "[]");
    if (!viewedPosts.includes(post.id)) {
      // Small timeout to simulate "watching" instead of just passing by
      const timer = setTimeout(() => {
        MediaPost.incrementView(post.id).catch(console.error);
        viewedPosts.push(post.id);
        sessionStorage.setItem("viewed_posts", JSON.stringify(viewedPosts));
        if (onUpdate) onUpdate(post.id, { views: (post.views || 0) + 1 });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [post.id]);

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
    setSavesCount(prev => originalSaved ? prev - 1 : prev + 1);
    
    try {
      const isSaved = await MediaPost.toggleSave(post.id, user.id);
      setSaved(isSaved);
    } catch (e) {
      setSaved(originalSaved);
      setSavesCount(prev => originalSaved ? prev + 1 : prev - 1);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const shareUrl = `https://battlehubff.site/media/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.description,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    if (!isDetail) {
      navigate(createPageUrl("MediaPostDetail").replace(":id", post.id));
    }
  };

  const handleCardClick = () => {
    if (!isDetail) {
      navigate(createPageUrl("MediaPostDetail").replace(":id", post.id));
    }
  };

  return (
    <div 
      className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6 ${!isDetail ? "cursor-pointer transition-transform hover:scale-[1.01]" : ""}`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center p-[2px]">
            <img src="/app-logo.png" alt="BATTLEHUB" className="w-full h-full rounded-full object-cover bg-gray-900" onError={(e) => { e.target.src = "https://api.dicebear.com/6.x/bottts/svg?seed=BH"; }} />
          </div>
          <div>
            <p className="text-white font-bold text-sm">BATTLEHUB FF</p>
            <p className="text-gray-400 text-xs flex items-center gap-1">
              {formatDistanceToNow(new Date(post.created_date || Date.now()), { addSuffix: true })}
              {post.is_pinned && <span className="text-orange-400">• Pinned</span>}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white rounded-full">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        {post.title && <h3 className="text-lg font-bold text-white mb-2 leading-tight">{post.title}</h3>}
        {post.description && (
          <p className={`text-gray-300 text-sm whitespace-pre-wrap ${!isDetail ? "line-clamp-3" : ""} mb-4`}>
            {post.description}
          </p>
        )}
      </div>

      {/* Media */}
      {post.type === "image" && post.media_url && (
        <div className="w-full bg-black relative max-h-[500px] flex items-center justify-center overflow-hidden">
          <img src={post.media_url} alt={post.title} className="w-full h-auto max-h-[500px] object-contain" loading="lazy" />
        </div>
      )}

      {post.type === "video" && post.media_url && (
        <div className="w-full bg-black relative max-h-[600px] flex items-center justify-center">
          <video 
            src={post.media_url} 
            poster={post.thumbnail_url}
            className="w-full h-auto max-h-[600px] object-contain"
            controls={isDetail || isPlaying}
            preload="metadata"
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(true);
            }}
          />
          {!isPlaying && !isDetail && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white">
                <Play className="w-8 h-8 ml-1" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between p-2 border-t border-gray-800/50">
        <div className="flex items-center gap-1">
          <Button variant="ghost" className={`flex items-center gap-2 rounded-xl px-3 ${liked ? 'text-red-500' : 'text-gray-300 hover:bg-gray-800 hover:text-red-400'}`} onClick={handleLike}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">{likesCount}</span>
          </Button>
          {!post.comments_disabled && (
            <Button variant="ghost" className="flex items-center gap-2 rounded-xl px-3 text-gray-300 hover:bg-gray-800 hover:text-white" onClick={handleCommentClick}>
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Comment</span>
            </Button>
          )}
          <Button variant="ghost" className="flex items-center gap-2 rounded-xl px-3 text-gray-300 hover:bg-gray-800 hover:text-white" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2 pr-2">
           <span className="text-xs text-gray-500">{post.views || 0} views</span>
           <Button variant="ghost" size="icon" className={`rounded-xl ${saved ? 'text-orange-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} onClick={handleSave}>
             <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
           </Button>
        </div>
      </div>
    </div>
  );
}
