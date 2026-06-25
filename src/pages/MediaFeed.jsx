import React, { useState, useEffect } from "react";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment as MediaCommentEntity } from "@/entities/MediaComment";
import { User } from "@/entities/User";
import MediaPostCard from "@/components/media/MediaPostCard";
import MediaAllCard from "@/components/media/MediaAllCard";
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

export default function MediaFeed() {
  const [mainTab, setMainTab] = useState("announcements"); // "announcements" | "reels" | "videos" | "saved"
  const [reelsTab, setReelsTab] = useState("latest"); // "latest" | "trending" | "saved"
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Comments Drawer State
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    User.me().then(setUser).catch(() => setUser(null));
  }, []);

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

      setPosts(fetchedPosts);
    } catch (e) {
      console.error("Error loading posts", e);
    }
    setLoading(false);
  };

  const handleUpdate = (postId, updates) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
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

  return (
    <div className="fixed inset-0 bg-gray-950 text-white flex flex-col z-50">
      
      {/* Top Main Navigation (Phase 4 Tabs) */}
      <div className="flex items-center justify-between px-2 sm:px-4 pt-4 pb-2 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 z-40 sticky top-0">
        <div className="flex gap-2 sm:gap-4 w-full justify-around sm:justify-start">
          <button onClick={() => setMainTab("announcements")} className={`flex flex-col items-center gap-1 ${mainTab === "announcements" ? "text-orange-500 scale-110" : "text-gray-400 hover:text-white"} transition-all`}>
            <Megaphone className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Announcements</span>
          </button>
          <button onClick={() => setMainTab("reels")} className={`flex flex-col items-center gap-1 ${mainTab === "reels" ? "text-orange-500 scale-110" : "text-gray-400 hover:text-white"} transition-all`}>
            <Smartphone className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Reels</span>
          </button>
          <button onClick={() => setMainTab("videos")} className={`flex flex-col items-center gap-1 ${mainTab === "videos" ? "text-orange-500 scale-110" : "text-gray-400 hover:text-white"} transition-all`}>
            <MonitorPlay className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Videos</span>
          </button>
          <button onClick={() => setMainTab("saved")} className={`flex flex-col items-center gap-1 ${mainTab === "saved" ? "text-orange-500 scale-110" : "text-gray-400 hover:text-white"} transition-all`}>
            <Bookmark className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Saved</span>
          </button>
        </div>
      </div>

      {/* Reels Secondary Navigation Overlay */}
      {mainTab === "reels" && (
        <div className="absolute top-[70px] left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent pt-2 pb-8 pointer-events-none">
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto pointer-events-auto px-4">
            <button 
              onClick={() => setReelsTab("latest")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg transition-all ${reelsTab === "latest" ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm"}`}
            >
              <Film className="w-4 h-4" /> Latest
            </button>
            <button 
              onClick={() => setReelsTab("trending")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg transition-all ${reelsTab === "trending" ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm"}`}
            >
              <TrendingUp className="w-4 h-4" /> Trending
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className={`flex-1 overflow-y-auto no-scrollbar relative ${mainTab === "reels" ? "snap-y snap-mandatory bg-black" : "bg-gray-950 pb-24"}`}>
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

      <BottomNavigation />

      {/* Comments Drawer (Modernized) */}
      {selectedPost && (
        <>
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[60] transition-opacity" 
            onClick={handleCloseComments}
          />
          <div className="absolute bottom-0 left-0 right-0 h-[75dvh] bg-gray-950 rounded-t-[2rem] z-[60] flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] border-t border-gray-800 overflow-hidden pb-safe">
            
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
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700">
                      <img 
                        src={comment.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${comment.user_id}`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${comment.user_id}`; }}
                      />
                    </div>
                    <div className="flex-1">
                      {/* Parent Comment */}
                      <div className="bg-gray-900/80 rounded-2xl rounded-tl-none p-3.5 border border-gray-800/60 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-gray-200">{comment.username}</span>
                          <span className="text-[11px] text-gray-500">{safeFormatDistance(comment.created_date)}</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
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
                              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                                <img src={reply.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${reply.user_id}`} alt="Avatar" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-900/60 rounded-2xl rounded-tl-none p-2.5 border border-gray-800/40">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-bold text-xs text-gray-200">{reply.username}</span>
                                    <span className="text-[10px] text-gray-500">{safeFormatDistance(reply.created_date)}</span>
                                  </div>
                                  <p className="text-sm text-gray-300 leading-snug">{reply.text}</p>
                                </div>
                                <div className="flex items-center gap-4 mt-1.5 px-2">
                                  <button 
                                    onClick={() => handleLikeReply(comment.id, reply.id)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-white"
                                  >
                                    <Heart className={`w-3 h-3 ${(reply.likes || []).includes(user?.id) ? "fill-red-500 text-red-500" : ""}`} />
                                    {(reply.likes || []).length > 0 && <span>{(reply.likes || []).length}</span>}
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
                  <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4"/></button>
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
        </>
      )}
    </div>
  );
}
