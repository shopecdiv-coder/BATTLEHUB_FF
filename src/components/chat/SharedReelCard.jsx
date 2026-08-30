import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { MediaPost } from '@/api/entities';
import { useNavigate } from 'react-router-dom';

export default function SharedReelCard({ postId }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    if (postId) {
      MediaPost.get(postId).then(res => {
        if (isMounted && res) {
          setPost(res);
        }
        if (isMounted) setLoading(false);
      }).catch(() => {
        if (isMounted) setLoading(false);
      });
    } else {
      setLoading(false);
    }
    return () => { isMounted = false; };
  }, [postId]);

  if (loading) {
    return (
      <div className="w-full h-48 bg-gray-800 rounded-xl animate-pulse mt-2 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-gray-700"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="w-full p-4 bg-gray-800 rounded-xl mt-2 text-center text-xs text-gray-400">
        Reel unavailable or deleted.
      </div>
    );
  }

  const isLandscape = post.type === 'video' || post.type === 'image' || post.type === 'post';
  const dimensions = isLandscape 
    ? "w-[240px] h-[140px] sm:w-[280px] sm:h-[160px]" 
    : "w-[140px] h-[250px] sm:w-[160px] sm:h-[280px]";

  return (
    <div 
      onClick={() => navigate(`/MediaFeed?postId=${post.id}`)}
      className={`mt-2 relative ${dimensions} rounded-xl overflow-hidden cursor-pointer group shadow-lg bg-black border border-gray-700/50 flex-shrink-0`}
    >
      {/* Background Image / Thumbnail */}
      <img 
        src={post.thumbnail_url || post.media_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"} 
        alt={post.title || "Reel"} 
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
      />
      
      {/* Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-orange-600/80 transition-colors border border-white/20">
          <Play className="w-5 h-5 text-white ml-1 fill-white" />
        </div>
      </div>

      {/* Reel Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2 mb-1">
          <img 
            src={post.author_avatar || "https://api.dicebear.com/6.x/bottts/svg?seed=BH"} 
            alt="Author" 
            className="w-5 h-5 rounded-full border border-gray-600 bg-black"
          />
          <span className="text-white text-[10px] font-bold line-clamp-1">
            {post.author_name || "User"}
          </span>
        </div>
        <p className="text-white text-xs font-medium line-clamp-2 leading-tight">
          {post.title || post.description || "Check out this reel!"}
        </p>
      </div>
    </div>
  );
}
