import React, { useState, useEffect } from "react";
import { MediaPost } from "@/entities/MediaPost";
import { User } from "@/entities/User";
import MediaPostCard from "@/components/media/MediaPostCard";
import { Film, TrendingUp, Bookmark, Loader2 } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";

export default function MediaFeed() {
  const [activeTab, setActiveTab] = useState("latest");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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
        // Fetch all published posts, sort by date
        fetchedPosts = await MediaPost.filter({ status: "published" });
        fetchedPosts.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      } else if (activeTab === "trending") {
        // Sort by views + likes
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

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24 pt-20">
      {/* Header Tabs */}
      <div className="fixed top-16 left-0 right-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="flex items-center justify-around p-2 max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab("latest")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === "latest" ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white"}`}
          >
            <Film className="w-4 h-4" /> Latest
          </button>
          <button 
            onClick={() => setActiveTab("trending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === "trending" ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white"}`}
          >
            <TrendingUp className="w-4 h-4" /> Trending
          </button>
          <button 
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === "saved" ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white"}`}
          >
            <Bookmark className="w-4 h-4" /> Saved
          </button>
        </div>
      </div>

      {/* Feed Container */}
      <div className="max-w-xl mx-auto px-4 mt-4">
        {activeTab === "saved" && !user && (
          <div className="text-center py-20 text-gray-400">
            <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Please login to view saved posts</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>No posts found.</p>
          </div>
        ) : (
          posts.map(post => (
            <MediaPostCard 
              key={post.id} 
              post={post} 
              user={user} 
              onUpdate={handleUpdate} 
            />
          ))
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
