import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment } from "@/entities/MediaComment";
import { User } from "@/entities/User";
import MediaPostCard from "@/components/media/MediaPostCard";
import { ArrowLeft, Loader2, Send, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { createPageUrl } from "@/utils";

export default function MediaPostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  
  // Check if we are inside the actual BATTLEHUB Android App
  const hasAndroidApp = typeof window.AndroidDownload !== 'undefined' || typeof window.AndroidBridge !== 'undefined';
  const showDownloadPrompt = !hasAndroidApp;

  useEffect(() => {
    User.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    loadPostData();
  }, [id]);

  const loadPostData = async () => {
    setLoading(true);
    try {
      const fetchedPost = await MediaPost.get(id);
      setPost(fetchedPost);
      
      if (fetchedPost && !fetchedPost.comments_disabled) {
        const fetchedComments = await MediaComment.filter({ post_id: id, is_deleted: false });
        fetchedComments.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
        setComments(fetchedComments);
      }
    } catch (e) {
      console.error("Error loading post", e);
    }
    setLoading(false);
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to comment");
      return;
    }
    if (!newComment.trim() || sending) return;
    
    setSending(true);
    try {
      const commentData = {
        post_id: id,
        user_id: user.id,
        username: user.ign || user.full_name?.split(' ')[0],
        avatar_url: user.avatar_url,
        text: newComment.trim(),
        created_date: new Date().toISOString(),
        is_deleted: false,
        likes: []
      };
      await MediaComment.create(commentData);
      setNewComment("");
      await loadPostData(); // reload comments
    } catch (err) {
      alert("Failed to send comment");
    }
    setSending(false);
  };

  if (showDownloadPrompt) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl p-1 mb-6 shadow-2xl shadow-orange-500/20">
          <img src="/app-logo.png" alt="App Logo" className="w-full h-full rounded-2xl bg-gray-900 object-cover" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Experience BATTLEHUB FF</h1>
        <p className="text-gray-400 mb-8 max-w-md text-lg">
          You need to download the BATTLEHUB FF app to view this post and interact with the community.
        </p>
        <Button onClick={() => window.location.href = "/download"} className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8 py-6 rounded-2xl text-lg font-bold shadow-lg shadow-orange-500/30 flex items-center gap-3">
          <Download className="w-6 h-6" /> Download App Now
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <h2 className="text-xl font-bold mb-2">Post not found</h2>
        <Button onClick={() => navigate(createPageUrl("MediaFeed"))} variant="ghost">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800 flex items-center h-16 px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-bold">Post</h1>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-4">
        <MediaPostCard post={post} user={user} isDetail={true} />

        {/* Comments Section */}
        {!post.comments_disabled ? (
          <div className="mt-6 border-t border-gray-800 pt-6">
            <h3 className="text-lg font-bold mb-4">Comments ({comments.length})</h3>
            
            <div className="space-y-4 mb-8">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                    <img 
                      src={comment.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${comment.user_id}`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1 bg-gray-900 rounded-2xl rounded-tl-none p-3 border border-gray-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-orange-400">{comment.username}</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_date || 0), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.text}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-gray-500 text-center py-4">No comments yet. Be the first!</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 border-t border-gray-800 pt-6 text-center text-gray-500">
            Comments are disabled for this post.
          </div>
        )}
      </div>

      {/* Comment Input Fixed Bottom */}
      {!post.comments_disabled && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur border-t border-gray-800 p-4">
          <div className="max-w-xl mx-auto">
            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              <Input 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={user ? "Write a comment..." : "Login to comment..."}
                disabled={!user || sending}
                className="bg-gray-900 border-gray-800 focus-visible:ring-orange-500 rounded-full"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!user || !newComment.trim() || sending}
                className="rounded-full bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
