import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment as MediaCommentEntity } from "@/entities/MediaComment";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { containsProfanity } from '@/utils/profanityFilter';
import MediaPostCard from "@/components/media/MediaPostCard";
import MediaAllCard from "@/components/media/MediaAllCard";
import UserProfileModal from "@/components/chat/UserProfileModal";
import { Film, TrendingUp, Bookmark, Loader2, X, Send, Megaphone, MonitorPlay, Smartphone, Heart, MessageCircle } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

// Safe date parsing helper to prevent white screens
const parseDate = (d) => {
  try {
    if (!d) return 0;
    const time = new Date(d).getTime();
    return isNaN(time) ? 0 : time;
  } catch (e) {
    return 0;
  }
};

const safeFormatDistance = (d) => {
  try {
    if (!d) return "Unknown";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "Unknown";
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (e) {
    return "Unknown";
  }
};

export default function MediaFeed({ isSavedView = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mainTab, setMainTab] = useState(isSavedView ? "saved" : "reels"); // "reels" | "videos" | "saved"
  const [reelsTab, setReelsTab] = useState("latest"); // "latest" | "trending" | "saved"
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [dialRotation, setDialRotation] = useState(isSavedView ? 90 : 0);
  const [isDragging, setIsDragging] = useState(false);
  const navTimeoutRef = useRef(null);
  const scrollRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, rotation: 0 });

  // Free Dragging FAB state with Persistence
  const savedOffset = localStorage.getItem('battlehub_dial_offset');
  const initialOffset = savedOffset ? JSON.parse(savedOffset) : { x: 0, y: 0 };
  
  const [dragOffset, setDragOffset] = useState(initialOffset);
  const [isMovingFab, setIsMovingFab] = useState(false);
  const dragOffsetRef = useRef(initialOffset);
  const longPressTimerRef = useRef(null);
  const moveStartRef = useRef({ x: 0, y: 0, initialOffsetX: 0, initialOffsetY: 0 });

  const tabs = [
    { id: "saved", label: "Saved", icon: Bookmark, angle: -90 },
    { id: "reels", label: "Reels", icon: Smartphone, angle: 0 },
    { id: "videos", label: "Videos", icon: MonitorPlay, angle: 90 },
  ];
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Comments Drawer State
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewProfileId, setViewProfileId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    User.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Handle Deep Linking
  useEffect(() => {
    const postId = searchParams.get('postId');
    if (postId && !selectedPost) {
      MediaPost.get(postId).then(post => {
        if (post) {
          handleOpenComments(post);
        }
      }).catch(() => {});
    }
  }, [searchParams]);

  useEffect(() => {
    loadPosts();
  }, [mainTab, reelsTab, user]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      let fetchedPosts = await MediaPost.filter({ status: "published" });

      if (mainTab === "announcements") {
        fetchedPosts = fetchedPosts.filter(p => p.type === "text" || p.type === "image");
        fetchedPosts.sort((a, b) => parseDate(b.created_date) - parseDate(a.created_date));
      } else if (mainTab === "videos") {
        fetchedPosts = fetchedPosts.filter(p => p.type === "video" && p.video_type === "long");
        fetchedPosts.sort((a, b) => parseDate(b.created_date) - parseDate(a.created_date));
      } else if (mainTab === "reels") {
        // Reels now includes short videos AND images (if we want images in reels too)
        fetchedPosts = fetchedPosts.filter(p => (p.type === "video" && p.video_type !== "long") || p.type === "image");
        
        if (reelsTab === "latest") {
          fetchedPosts.sort((a, b) => parseDate(b.created_date) - parseDate(a.created_date));
        } else if (reelsTab === "trending") {
          fetchedPosts.sort((a, b) => ((b.views || 0) + (b.likes?.length || 0)) - ((a.views || 0) + (a.likes?.length || 0)));
        } else if (reelsTab === "saved") {
          if (!user) fetchedPosts = [];
          else fetchedPosts = fetchedPosts.filter(p => p.saves?.includes(user.id));
        }
      } else if (mainTab === "saved") {
        if (!user) fetchedPosts = [];
        else fetchedPosts = fetchedPosts.filter(p => p.saves?.includes(user.id));
        fetchedPosts.sort((a, b) => parseDate(b.created_date) - parseDate(a.created_date));
      }

      // Sort pinned posts to the top while preserving the underlying order
      fetchedPosts.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0;
      });

      setPosts(fetchedPosts);
      
      // Reset scroll position to top when switching tabs
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    } catch (e) {
      console.error("Error loading posts", e);
    }
    setLoading(false);
  };

  const handleUpdate = (postId, updates) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    setIsNavExpanded(true);
    dragStartRef.current = {
      x: e.clientX || (e.touches && e.touches[0].clientX) || 0,
      rotation: dialRotation,
    };
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const dx = clientX - dragStartRef.current.x;
    setDialRotation(dragStartRef.current.rotation + dx);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    let closest = Math.round(dialRotation / 90) * 90;
    if (closest > 90) closest = 90;
    if (closest < -90) closest = -90;
    
    setDialRotation(closest);
    
    if (closest === 0) setMainTab("reels");
    else if (closest === -90) setMainTab("videos"); 
    else if (closest === 90) setMainTab("saved");
    
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    navTimeoutRef.current = setTimeout(() => setIsNavExpanded(false), 2000);
  };

  const handleFabPointerDown = (e) => {
    if (isNavExpanded) return;
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    longPressTimerRef.current = setTimeout(() => {
      setIsMovingFab(true);
      moveStartRef.current = {
        x: clientX,
        y: clientY,
        initialOffsetX: dragOffsetRef.current.x,
        initialOffsetY: dragOffsetRef.current.y
      };
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400); 
  };

  const handleFabPointerMove = (e) => {
    if (isMovingFab) {
      e.preventDefault();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const dx = clientX - moveStartRef.current.x;
      const dy = clientY - moveStartRef.current.y;
      
      const newX = moveStartRef.current.initialOffsetX + dx;
      const newY = moveStartRef.current.initialOffsetY + dy;
      
      dragOffsetRef.current = { x: newX, y: newY };
      setDragOffset({ x: newX, y: newY });
    }
  };

  const handleFabPointerUp = (e, tabId, targetAngle) => {
    if (e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    
    if (isMovingFab) {
      setIsMovingFab(false);
      localStorage.setItem('battlehub_dial_offset', JSON.stringify(dragOffsetRef.current));
      return;
    }
    handleNavClick(tabId, targetAngle);
  };

  const handleNavClick = (tabId, targetAngle) => {
    if (!isNavExpanded) {
      setIsNavExpanded(true);
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
      navTimeoutRef.current = setTimeout(() => setIsNavExpanded(false), 3000);
      return;
    }

    setDialRotation(-targetAngle);
    setMainTab(tabId);
    
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    navTimeoutRef.current = setTimeout(() => setIsNavExpanded(false), 1200);
  };

  const handleOpenComments = async (post) => {
    setSelectedPost(post);
    setCommentsLoading(true);
    try {
      const fetchedComments = await MediaCommentEntity.filter({ post_id: post.id, is_deleted: false });
      fetchedComments.sort((a, b) => parseDate(a.created_date) - parseDate(b.created_date));
      setComments(fetchedComments);
    } catch (e) {
      console.error("Error loading comments", e);
    }
    setCommentsLoading(false);
  };

  const handleCloseComments = () => {
    setSelectedPost(null);
    setComments([]);
    setReplyingTo(null);
    setNewComment("");
  };

  const handleLikeComment = async (comment) => {
    if (!user) { alert("Please login to like"); return; }
    try {
      const isLiked = await MediaCommentEntity.toggleLike(comment.id, user.id);
      
      if (isLiked && comment.user_id !== user.id) {
        Notification.create({
          recipient_id: comment.user_id,
          type: "Media",
          priority: "Normal",
          title: "New Like",
          message: `${user.ign || user.full_name?.split(' ')[0] || "Someone"} liked your comment.`,
          action_url: `/MediaFeed?postId=${selectedPost.id}`,
          read: false
        }).catch(() => {});
      }

      setComments(prev => prev.map(c => {
        if (c.id === comment.id) {
          const newLikes = isLiked 
            ? [...(c.likes || []).filter(id => id !== user.id), user.id]
            : (c.likes || []).filter(id => id !== user.id);
          return { ...c, likes: newLikes };
        }
        return c;
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLikeReply = async (commentId, replyId) => {
    if (!user) { alert("Please login to like"); return; }
    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;
      
      const updatedReplies = (comment.replies || []).map(r => {
        if (r.id === replyId) {
          const isLiked = !(r.likes || []).includes(user.id);
          const newLikes = isLiked 
            ? [...(r.likes || []).filter(id => id !== user.id), user.id]
            : (r.likes || []).filter(id => id !== user.id);
            
          if (isLiked && r.user_id !== user.id) {
            Notification.create({
              recipient_id: r.user_id,
              type: "Media",
              priority: "Normal",
              title: "New Like",
              message: `${user.ign || user.full_name?.split(' ')[0] || "Someone"} liked your reply.`,
              action_url: `/MediaFeed?postId=${selectedPost.id}`,
              read: false
            }).catch(() => {});
          }

          return { ...r, likes: newLikes };
        }
        return r;
      });
      
      // Optimistic UI update
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, replies: updatedReplies } : c));
      
      // Save to backend
      await MediaCommentEntity.update(commentId, { replies: updatedReplies });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!user) { alert("Please login to comment"); return; }
    if (!newComment.trim() || sendingComment || !selectedPost) return;

    if (containsProfanity(newComment)) {
      alert("Inappropriate language detected. Please modify your text.");
      return;
    }
    
    setSendingComment(true);
    try {
      if (replyingTo) {
        // Threaded Reply Logic
        const parentComment = comments.find(c => c.id === replyingTo.id);
        if (parentComment) {
          const newReply = {
            id: Date.now().toString(), // Simple unique ID for array
            user_id: user.id,
            username: user.ign || user.full_name?.split(' ')[0] || "User",
            avatar_url: user.avatar_url || "",
            text: newComment.trim(),
            created_date: new Date().toISOString(),
            likes: []
          };
          const updatedReplies = [...(parentComment.replies || []), newReply];
          await MediaCommentEntity.update(parentComment.id, { replies: updatedReplies });
          
          if (parentComment.user_id !== user.id) {
            Notification.create({
              recipient_id: parentComment.user_id,
              type: "Media",
              priority: "Normal",
              title: "New Reply",
              message: `${user.ign || user.full_name?.split(' ')[0] || "Someone"} replied to your comment: "${newComment.substring(0, 30)}${newComment.length > 30 ? '...' : ''}"`,
              action_url: `/MediaFeed?postId=${selectedPost.id}`,
              read: false
            }).catch(() => {});
          }
          
          // Refresh locally
          setComments(prev => prev.map(c => c.id === parentComment.id ? { ...c, replies: updatedReplies } : c));
        }
      } else {
        // Top-Level Comment Logic
        const commentData = {
          post_id: selectedPost.id,
          user_id: user.id,
          username: user.ign || user.full_name?.split(' ')[0] || "User",
          avatar_url: user.avatar_url || "",
          text: newComment.trim(),
          created_date: new Date().toISOString(),
          is_deleted: false,
          likes: [],
          replies: []
        };
        await MediaCommentEntity.create(commentData);
        
        // Refetch top-level comments to get accurate IDs
        const fetchedComments = await MediaCommentEntity.filter({ post_id: selectedPost.id, is_deleted: false });
        fetchedComments.sort((a, b) => parseDate(a.created_date) - parseDate(b.created_date));
        setComments(fetchedComments);
      }
      
      setNewComment("");
      setReplyingTo(null);
    } catch (err) {
      console.error(err);
      alert("Failed to send comment");
    }
    setSendingComment(false);
  };

  const renderCommentText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-orange-400 font-medium">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-950 text-white flex flex-col z-50">
      
      {/* Top Main Navigation Removed. Now moved to bottom floating glass bar. */}
      {/* Reels Secondary Navigation Overlay */}
      {mainTab === "reels" && !isSavedView && (
        <div className="absolute top-2 left-0 right-0 z-40 bg-transparent pt-2 pb-8 pointer-events-none">
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto pointer-events-auto px-4">
            <button 
              onClick={() => setReelsTab("latest")}
              className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-bold shadow-lg transition-all backdrop-blur-md border ${reelsTab === "latest" ? "bg-white/20 border-white/30 text-white" : "bg-black/20 border-white/5 text-white/60 hover:text-white hover:bg-white/10"}`}
            >
              <Film className="w-4 h-4" /> Latest
            </button>
            <button 
              onClick={() => setReelsTab("trending")}
              className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-bold shadow-lg transition-all backdrop-blur-md border ${reelsTab === "trending" ? "bg-white/20 border-white/30 text-white" : "bg-black/20 border-white/5 text-white/60 hover:text-white hover:bg-white/10"}`}
            >
              <TrendingUp className="w-4 h-4" /> Trending
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto no-scrollbar relative ${mainTab === "reels" ? "snap-y snap-mandatory bg-black" : "bg-gray-950 pb-24"}`}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 mt-20">
            <Film className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-bold text-gray-400">No posts found</p>
            <p className="mt-2 text-sm text-center px-8">Check back later for new content.</p>
          </div>
        ) : (
          <div className={mainTab !== "reels" ? "max-w-2xl mx-auto sm:p-4" : ""}>
            {posts.map(post => (
              mainTab === "reels" ? (
                <div key={post.id} className="h-[calc(100dvh-60px)] w-full relative snap-start snap-always">
                  <MediaPostCard 
                    post={post} 
                    user={user} 
                    onUpdate={handleUpdate} 
                    onOpenComments={handleOpenComments}
                  />
                </div>
              ) : (
                <MediaAllCard
                  key={post.id}
                  post={post}
                  user={user}
                  onUpdate={handleUpdate}
                  onOpenComments={handleOpenComments}
                />
              )
            ))}
          </div>
        )}
      </div>

      {/* Invisible backdrop to close the dial when clicking outside */}
      {isNavExpanded && (
        <div 
          className="fixed inset-0 z-40 touch-auto"
          onClick={() => setIsNavExpanded(false)}
          onTouchStart={() => setIsNavExpanded(false)}
        />
      )}

      {/* Render BottomNavigation only if comments drawer is closed */}
      {!isSavedView && (
        <div 
          className="fixed bottom-[-90px] left-1/2 z-50 w-[220px] h-[220px] pointer-events-none ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            transform: `translateX(calc(-50% + ${dragOffset.x}px)) translateY(calc(${isNavExpanded ? 0 : 25}px + ${dragOffset.y}px))`,
            transitionProperty: 'transform',
            transitionDuration: isMovingFab ? '0ms' : '700ms'
          }}
        >
          {/* Circular Dial Background */}
          <div 
            className={`absolute inset-0 rounded-full border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-opacity duration-500 ${
              isNavExpanded ? 'opacity-100 pointer-events-auto touch-none' : 'opacity-0 pointer-events-none'
            }`}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
            
          {/* Dial Items */}
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = mainTab === tab.id;
            const isVisible = isNavExpanded || isActive;
            
            // Calculate relative rotation
            let relRot = (dialRotation + tab.angle) % 360;
            if (relRot > 180) relRot -= 360;
            if (relRot < -180) relRot += 360;

            // Deterministic tucking logic
            const tuckAngles = {
              reels: { videos: 25, saved: -25 },
              videos: { reels: -25, saved: 25 },
              saved: { reels: 25, videos: -25 }
            };
            const collapsedRelRot = isActive ? 0 : tuckAngles[mainTab]?.[tab.id] || 25;
            const displayRelRot = isNavExpanded ? relRot : collapsedRelRot;

            return (
              <button
                key={tab.id}
                onPointerDown={handleFabPointerDown}
                onPointerMove={handleFabPointerMove}
                onPointerUp={(e) => { e.stopPropagation(); handleFabPointerUp(e, tab.id, tab.angle); }}
                onPointerLeave={(e) => { 
                  if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                }}
                className={`absolute top-1/2 left-1/2 w-14 h-14 -ml-7 -mt-7 flex flex-col items-center justify-center rounded-full pointer-events-auto transition-all duration-500 touch-none ${isVisible ? 'opacity-100 z-10' : 'opacity-40 scale-[0.6] blur-[0.5px] pointer-events-none z-0'}`}
                style={{
                  transform: `rotate(${displayRelRot}deg) translateY(-100px) rotate(${-displayRelRot}deg)`,
                  transitionDuration: isDragging ? '0ms' : '500ms',
                  transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)',
                  transitionProperty: 'transform'
                }}
              >
                <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-500 ${
                  isActive 
                    ? (isNavExpanded ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.6)] scale-110' : 'bg-white/10 text-white/80 backdrop-blur-xl border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]') 
                    : 'bg-gray-900/50 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}>
                  <Icon className="w-5 h-5 mb-0.5" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
      {/* Comments Drawer (Modernized via Portal to ensure absolute top layer) */}
      {selectedPost && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
            onClick={handleCloseComments}
          />
          <div className="absolute bottom-0 left-0 right-0 h-[65dvh] bg-gray-950 rounded-t-[2rem] flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] border-t border-gray-800 overflow-hidden pb-safe">
            
            {/* Header */}
            <div className="flex flex-col items-center pt-4 pb-3 border-b border-gray-800/60 bg-gray-900/50 backdrop-blur-md">
              <div className="w-12 h-1.5 bg-gray-700 rounded-full mb-4" />
              <div className="w-full px-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-bold text-white">Comments <span className="text-gray-500 text-sm font-normal">({comments.length})</span></h3>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCloseComments} className="rounded-full text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {commentsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10">
                  <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                  <p>No comments yet. Start the conversation!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div 
                      className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700 cursor-pointer"
                      onClick={() => setViewProfileId(comment.user_id)}
                    >
                      <img 
                        src={comment.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${comment.user_id}`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${comment.user_id}`; }}
                      />
                    </div>
                    <div className="flex-1">
                      {/* Parent Comment */}
                      <div 
                        className="bg-gray-900/80 rounded-2xl rounded-tl-none p-3.5 border border-gray-800/60 shadow-sm cursor-pointer select-none"
                        onClick={(e) => {
                          if (e.detail === 2) handleLikeComment(comment);
                          if (e.detail === 3) setReplyingTo(comment);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-gray-200">
                            {comment.username}
                          </span>
                          <span className="text-[11px] text-gray-500">{safeFormatDistance(comment.created_date)}</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{renderCommentText(comment.text)}</p>
                      </div>
                      
                      {/* Comment Actions */}
                      <div className="flex items-center gap-4 mt-2 px-2">
                        <button 
                          onClick={() => handleLikeComment(comment)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                        >
                          <Heart className={`w-3.5 h-3.5 ${(comment.likes || []).includes(user?.id) ? "fill-red-500 text-red-500" : ""}`} />
                          {(comment.likes || []).length > 0 && <span>{(comment.likes || []).length}</span>}
                        </button>
                        <button 
                          onClick={() => setReplyingTo(comment)}
                          className="text-xs font-medium text-gray-400 hover:text-white transition-colors"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Replies List */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-800/60">
                          {comment.replies.map(reply => (
                            <div key={reply.id} className="flex gap-2">
                              <div 
                                className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 cursor-pointer"
                                onClick={() => setViewProfileId(reply.user_id)}
                              >
                                <img src={reply.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${reply.user_id}`} alt="Avatar" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <div 
                                  className="bg-gray-900/60 rounded-2xl rounded-tl-none p-2.5 border border-gray-800/40 cursor-pointer select-none"
                                  onClick={(e) => {
                                    if (e.detail === 2) handleLikeReply(comment.id, reply.id);
                                    if (e.detail === 3) {
                                      setReplyingTo(comment);
                                      setNewComment(`@${reply.username} `);
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-bold text-xs text-gray-200">
                                      {reply.username}
                                    </span>
                                    <span className="text-[10px] text-gray-500">{safeFormatDistance(reply.created_date)}</span>
                                  </div>
                                  <p className="text-sm text-gray-300 leading-snug">{renderCommentText(reply.text)}</p>
                                </div>
                                <div className="flex items-center gap-4 mt-1.5 px-2">
                                  <button 
                                    onClick={() => handleLikeReply(comment.id, reply.id)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-white"
                                  >
                                    <Heart className={`w-3 h-3 ${(reply.likes || []).includes(user?.id) ? "fill-red-500 text-red-500" : ""}`} />
                                    {(reply.likes || []).length > 0 && <span>{(reply.likes || []).length}</span>}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setReplyingTo(comment);
                                      setNewComment(`@${reply.username} `);
                                    }}
                                    className="text-[11px] font-medium text-gray-500 hover:text-white transition-colors"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Form Fixed at Bottom */}
            <div className="border-t border-gray-800 bg-gray-950 p-4 pb-6 sm:pb-4 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] relative z-10">
              {replyingTo && (
                <div className="flex items-center justify-between mb-2 px-2">
                  <span className="text-xs text-orange-400 font-medium">Replying to {replyingTo.username}</span>
                  <button onClick={() => { setReplyingTo(null); setNewComment(""); }} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4"/></button>
                </div>
              )}
              <form onSubmit={handleSendComment} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700 shadow-inner">
                  {user ? (
                    <img src={user.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${user.email}`} alt="Me" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800" />
                  )}
                </div>
                <div className="flex-1 relative">
                  <Input 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder={user ? (replyingTo ? "Write a reply..." : "Add a comment...") : "Login to comment..."}
                    disabled={!user || sendingComment}
                    className="bg-gray-900 border-gray-800 focus-visible:ring-1 focus-visible:ring-orange-500/50 rounded-full h-12 text-sm px-5 pr-12 text-white placeholder:text-gray-500 shadow-inner"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    variant="ghost"
                    disabled={!user || !newComment.trim() || sendingComment}
                    className="absolute right-1 top-1 w-10 h-10 rounded-full text-orange-500 hover:text-white hover:bg-orange-500 transition-colors"
                  >
                    {sendingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                  </Button>
                </div>
              </form>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Profile Modal */}
      {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}
    </div>
  );
}
