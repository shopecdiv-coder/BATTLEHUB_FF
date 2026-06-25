import React, { useState, useEffect } from "react";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment as MediaCommentEntity } from "@/entities/MediaComment";
import { User } from "@/entities/User";
import MediaPostCard from "@/components/media/MediaPostCard";
import { Film, TrendingUp, Bookmark, Loader2, X, Send } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

export default function MediaFeed() {
  const [activeTab, setActiveTab] = useState("latest");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Comments Drawer State
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    User.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    loadPosts();
  }, [activeTab, user]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      let fetchedPosts = [];
      if (activeTab === "latest") {
        fetchedPosts = await MediaPost.filter({ status: "published" });
        fetchedPosts.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      } else if (activeTab === "trending") {
        fetchedPosts = await MediaPost.filter({ status: "published" });
        fetchedPosts.sort((a, b) => ((b.views || 0) + (b.likes?.length || 0)) - ((a.views || 0) + (a.likes?.length || 0)));
      } else if (activeTab === "saved") {
        if (!user) {
          fetchedPosts = [];
        } else {
          fetchedPosts = await MediaPost.filter({ status: "published" });
          fetchedPosts = fetchedPosts.filter(p => p.saves?.includes(user.id));
        }
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

  // --- Comments Drawer Logic ---
  const handleOpenComments = async (post) => {
    setSelectedPost(post);
    setCommentsLoading(true);
    try {
      const fetchedComments = await MediaCommentEntity.filter({ post_id: post.id, is_deleted: false });
      fetchedComments.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
      setComments(fetchedComments);
    } catch (e) {
      console.error("Error loading comments", e);
    }
    setCommentsLoading(false);
  };

  const handleCloseComments = () => {
    setSelectedPost(null);
    setComments([]);
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!user) { alert("Please login to comment"); return; }
    if (!newComment.trim() || sendingComment || !selectedPost) return;
    
    setSendingComment(true);
    try {
      const commentData = {
        post_id: selectedPost.id,
        user_id: user.id,
        username: user.ign || user.full_name?.split(' ')[0],
        avatar_url: user.avatar_url,
        text: newComment.trim(),
        created_date: new Date().toISOString(),
        is_deleted: false,
        likes: []
      };
      await MediaCommentEntity.create(commentData);
      setNewComment("");
      
      // Reload comments
      const fetchedComments = await MediaCommentEntity.filter({ post_id: selectedPost.id, is_deleted: false });
      fetchedComments.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
      setComments(fetchedComments);
    } catch (err) {
      alert("Failed to send comment");
    }
    setSendingComment(false);
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col z-50">
      
      {/* Top Floating Header Tabs */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent pt-4 pb-8 pointer-events-none">
        <div className="flex items-center justify-center gap-4 max-w-md mx-auto pointer-events-auto px-4">
          <button 
            onClick={() => setActiveTab("latest")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "latest" ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"}`}
          >
            <Film className="w-4 h-4" /> Latest
          </button>
          <button 
            onClick={() => setActiveTab("trending")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "trending" ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"}`}
          >
            <TrendingUp className="w-4 h-4" /> Trending
          </button>
          <button 
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "saved" ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"}`}
          >
            <Bookmark className="w-4 h-4" /> Saved
          </button>
        </div>
      </div>

      {/* Snap Scrolling Feed Container */}
      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide no-scrollbar relative">
        {activeTab === "saved" && !user && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Bookmark className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-bold text-white">Save your favorite clips</p>
            <p className="mt-2 text-sm">Please login to view saved posts</p>
          </div>
        )}

        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-white" />
          </div>
        ) : posts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Film className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-bold text-white">No posts found</p>
            <p className="mt-2 text-sm text-center px-8">Check back later for new highlights and gaming content.</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="h-[100dvh] w-full relative snap-start snap-always">
              <MediaPostCard 
                post={post} 
                user={user} 
                onUpdate={handleUpdate} 
                onOpenComments={handleOpenComments}
              />
            </div>
          ))
        )}
      </div>

      <BottomNavigation />

      {/* Comments Bottom Sheet Overlay */}
      {selectedPost && (
        <>
          <div 
            className="absolute inset-0 bg-black/60 z-50 transition-opacity" 
            onClick={handleCloseComments}
          />
          <div className="absolute bottom-0 left-0 right-0 h-[65dvh] bg-gray-950 rounded-t-3xl z-50 flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Sheet Handle & Header */}
            <div className="flex flex-col items-center pt-3 pb-2 border-b border-gray-800">
              <div className="w-12 h-1.5 bg-gray-700 rounded-full mb-3" />
              <div className="w-full px-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Comments</h3>
                <Button variant="ghost" size="icon" onClick={handleCloseComments} className="rounded-full text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {commentsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10">
                  <MessageCircle className="w-12 h-12 mb-2 opacity-20" />
                  <p>No comments yet. Start the conversation!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                      <img 
                        src={comment.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${comment.user_id}`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-gray-200">{comment.username}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_date || 0), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-white whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Fixed at Bottom of Sheet */}
            <div className="p-4 border-t border-gray-800 bg-gray-950 pb-safe">
              <form onSubmit={handleSendComment} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700">
                  {user ? (
                    <img src={user.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${user.email}`} alt="Me" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800" />
                  )}
                </div>
                <Input 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={user ? "Add a comment..." : "Login to comment..."}
                  disabled={!user || sendingComment}
                  className="bg-gray-900 border-transparent focus-visible:ring-1 focus-visible:ring-gray-700 rounded-full h-10 text-sm"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  variant="ghost"
                  disabled={!user || !newComment.trim() || sendingComment}
                  className="rounded-full text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 flex-shrink-0"
                >
                  {sendingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </form>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
