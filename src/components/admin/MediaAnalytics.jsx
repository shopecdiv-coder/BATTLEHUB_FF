import React, { useState, useEffect } from "react";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment } from "@/entities/MediaComment";
import { BarChart2, Eye, Heart, MessageCircle, TrendingUp, Loader2 } from "lucide-react";

export default function MediaAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
  });
  const [topPosts, setTopPosts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const posts = await MediaPost.list();
      const comments = await MediaComment.list();

      let totalViews = 0;
      let totalLikes = 0;

      posts.forEach(post => {
        totalViews += (post.views || 0);
        totalLikes += (post.likes?.length || 0);
      });

      setStats({
        totalPosts: posts.length,
        totalViews,
        totalLikes,
        totalComments: comments.length
      });

      const sortedPosts = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
      setTopPosts(sortedPosts);

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart2 className="w-8 h-8 text-orange-400" />
        <h2 className="text-2xl font-bold text-white">Media Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h3 className="text-gray-400 font-medium">Total Posts</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalPosts}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-5 h-5 text-blue-400" />
            <h3 className="text-gray-400 font-medium">Total Views</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalViews}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-5 h-5 text-red-400" />
            <h3 className="text-gray-400 font-medium">Total Likes</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalLikes}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="w-5 h-5 text-green-400" />
            <h3 className="text-gray-400 font-medium">Total Comments</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalComments}</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white">Most Viewed Posts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 text-sm">
              <tr>
                <th className="p-4">Post Title</th>
                <th className="p-4">Type</th>
                <th className="p-4">Views</th>
                <th className="p-4">Likes</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {topPosts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No data available</td>
                </tr>
              ) : (
                topPosts.map(post => (
                  <tr key={post.id} className="text-gray-300 hover:bg-gray-800/30">
                    <td className="p-4 font-medium">{post.title || 'Untitled'}</td>
                    <td className="p-4 capitalize">{post.type}</td>
                    <td className="p-4 text-blue-400 font-bold">{post.views || 0}</td>
                    <td className="p-4 text-red-400 font-bold">{post.likes?.length || 0}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(post.created_date || 0).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
