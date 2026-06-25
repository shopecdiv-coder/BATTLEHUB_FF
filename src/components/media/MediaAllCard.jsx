import React, { useState } from "react";
import { Heart, MessageCircle, Bookmark, Play } from "lucide-react";
import { MediaPost } from "@/entities/MediaPost";
import { formatDistanceToNow } from "date-fns";
import ReactPlayer from 'react-player';

export default function MediaAllCard({ post, user, onUpdate, onOpenComments }) {
  const [liked, setLiked] = useState(post.likes?.includes(user?.id));
  const [saved, setSaved] = useState(post.saves?.includes(user?.id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);

  const isYouTube = post.media_url && (post.media_url.includes("youtube.com") || post.media_url.includes("youtu.be"));

  const getSafeVideoUrl = (url) => {
    if (!url) return url;
    if (url.includes("youtube.com/shorts/")) {
      const videoId = url.split("youtube.com/shorts/")[1].split("?")[0];
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return url;
  };
  const safeMediaUrl = getSafeVideoUrl(post.media_url);

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

  const safeDate = (() => {
    try {
      const d = new Date(post.created_date || 0);
      return isNaN(d.getTime()) ? 'Unknown' : formatDistanceToNow(d, { addSuffix: true });
    } catch(e) { return 'Unknown'; }
  })();

  return (
    <div className="bg-gray-900 sm:border border-y border-gray-800 sm:rounded-xl overflow-hidden mb-2 sm:mb-4 shadow-lg">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-gray-700 overflow-hidden bg-black">
            <img 
              src={post.author_avatar || "https://api.dicebear.com/6.x/bottts/svg?seed=BH"} 
              alt="Author" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.target.src = "https://api.dicebear.com/6.x/bottts/svg?seed=BH"; }} 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-[15px] flex items-center gap-2">
              {post.author_name || "BATTLEHUB FF"}
              {post.is_pinned && <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full">Pinned</span>}
            </span>
            <span className="text-gray-400 text-xs">{safeDate}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        {post.title && <h3 className="text-white font-bold text-lg mb-1">{post.title}</h3>}
        {post.description && <p className="text-gray-300 text-sm whitespace-pre-wrap mb-3">{post.description}</p>}
      </div>

      {/* Media */}
      {post.type !== "text" && post.media_url && (
        <div className="w-full bg-black relative" style={{ maxHeight: post.video_type === 'long' ? '400px' : '650px' }}>
          {post.type === "video" ? (
            isYouTube ? (
              <div className="relative w-full pb-[56.25%] sm:pb-[56.25%]">
                <ReactPlayer 
                  url={safeMediaUrl}
                  controls={true}
                  width="100%"
                  height="100%"
                  className="absolute top-0 left-0"
                  config={{ youtube: { playerVars: { modestbranding: 1 } } }}
                />
              </div>
            ) : (
              <video 
                src={post.media_url} 
                poster={post.thumbnail_url}
                className="w-full h-full max-h-[650px] object-cover sm:object-contain"
                controls
                playsInline
              />
            )
          ) : (
            <img src={post.media_url} alt={post.title} className="w-full max-h-[650px] object-cover sm:object-contain" loading="lazy" />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-2 border-t border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={handleLike} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors group">
            <Heart className={`w-5 h-5 ${liked ? 'text-red-500 fill-red-500' : 'text-gray-400 group-hover:text-red-400'}`} />
            <span className={`text-sm font-medium ${liked ? 'text-red-500' : 'text-gray-400 group-hover:text-red-400'}`}>{likesCount}</span>
          </button>
          
          {!post.comments_disabled && (
            <button onClick={() => onOpenComments(post)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors group">
              <MessageCircle className="w-5 h-5 text-gray-400 group-hover:text-blue-400" />
              <span className="text-sm font-medium text-gray-400 group-hover:text-blue-400">Comment</span>
            </button>
          )}
        </div>

        <button onClick={handleSave} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors group">
          <Bookmark className={`w-5 h-5 ${saved ? 'text-orange-500 fill-orange-500' : 'text-gray-400 group-hover:text-orange-400'}`} />
        </button>
      </div>
    </div>
  );
}
