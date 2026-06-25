import React, { useState, useEffect } from "react";
import { MediaPost } from "@/entities/MediaPost";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit, Image as ImageIcon, Video, FileText, UploadCloud, Loader2, Star, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MediaManagement() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "text", // image, video, text
    media_url: "",
    thumbnail_url: "",
    status: "published",
    is_pinned: false,
    is_featured: false,
    comments_disabled: false
  });
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await MediaPost.list();
      data.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      setPosts(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file_url) {
        setFormData(prev => ({ ...prev, [field]: file_url }));
      } else {
        alert("Upload failed or returned empty URL.");
      }
    } catch (error) {
      alert("Error uploading file.");
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (editingPost) {
        await MediaPost.update(editingPost.id, formData);
      } else {
        const user = await User.me().catch(() => null);
        await MediaPost.create({
          ...formData,
          author_id: user?.id || "system",
          author_name: user?.ign || user?.full_name?.split(' ')[0] || "Admin",
          author_avatar: user?.avatar_url || "https://api.dicebear.com/6.x/bottts/svg?seed=Admin",
          created_date: new Date().toISOString(),
          views: 0,
          likes: [],
          saves: [],
          shares: 0
        });
      }
      setEditingPost(null);
      setFormData({
        title: "", description: "", type: "text", media_url: "",
        thumbnail_url: "", status: "published", is_pinned: false,
        is_featured: false, comments_disabled: false
      });
      await loadPosts();
    } catch (error) {
      alert("Failed to save post");
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      await MediaPost.delete(id);
      await loadPosts();
    } catch (error) {
      alert("Failed to delete post");
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title || "",
      description: post.description || "",
      type: post.type || "text",
      media_url: post.media_url || "",
      thumbnail_url: post.thumbnail_url || "",
      status: post.status || "published",
      is_pinned: post.is_pinned || false,
      is_featured: post.is_featured || false,
      comments_disabled: post.comments_disabled || false
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ImageIcon className="text-orange-400" /> Media Management
        </h2>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">
          {editingPost ? "Edit Post" : "Create New Post"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Title</Label>
              <Input 
                required 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Post title..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Type</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Content Type" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="text">Text / Announcement</SelectItem>
                  <SelectItem value="image">Image Post</SelectItem>
                  <SelectItem value="video">Video Post (File or YouTube)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.type === "video" && (
            <div className="space-y-2">
              <Label className="text-gray-300">Video Format</Label>
              <Select 
                value={formData.video_type || "short"} 
                onValueChange={(val) => setFormData({ ...formData, video_type: val })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Video Format" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="short">Short (Vertical Reel/Shorts)</SelectItem>
                  <SelectItem value="long">Long (Horizontal Video)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-gray-300">Description</Label>
            <Textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
              placeholder="What's on your mind?"
            />
          </div>

          {formData.type !== "text" && (
            <div className="space-y-2 p-4 border border-dashed border-gray-700 rounded-xl bg-gray-800/50">
              <Label className="text-gray-300">Media Source ({formData.type})</Label>
              <Input 
                placeholder={formData.type === "video" ? "Paste YouTube Link or direct URL..." : "Paste Image URL..."}
                value={formData.media_url || ""} 
                onChange={e => setFormData({ ...formData, media_url: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mb-4"
              />
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                <hr className="flex-1 border-gray-700" /> OR UPLOAD <hr className="flex-1 border-gray-700" />
              </div>
              {formData.media_url && formData.media_url.includes("res.cloudinary.com") ? (
                <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
                  <Check className="w-4 h-4" /> Cloud Media Uploaded Successfully
                </div>
              ) : (
                <div className="flex items-center gap-4 mt-2">
                  <input type="file" id="media-upload" className="hidden" accept={formData.type === "video" ? "video/*" : "image/*"} onChange={e => handleFileUpload(e, "media_url")} />
                  <Label htmlFor="media-upload" className="cursor-pointer bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-white flex items-center gap-2 transition-colors">
                    <UploadCloud className="w-4 h-4" /> Choose File
                  </Label>
                  <span className="text-xs text-gray-500">
                    {formData.type === "video" ? "Upload to Cloudinary" : "Images supported"}
                  </span>
                </div>
              )}
            </div>
          )}

          {formData.type === "video" && (
             <div className="space-y-2 p-4 border border-dashed border-gray-700 rounded-xl bg-gray-800/50">
              <Label className="text-gray-300">Video Thumbnail (Optional)</Label>
              {formData.thumbnail_url ? (
                <img src={formData.thumbnail_url} className="h-20 rounded" alt="thumb" />
              ) : (
                <div className="flex items-center gap-4 mt-2">
                  <input type="file" id="thumb-upload" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, "thumbnail_url")} />
                  <Label htmlFor="thumb-upload" className="cursor-pointer bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-white flex items-center gap-2 transition-colors">
                    <UploadCloud className="w-4 h-4" /> Choose Thumbnail
                  </Label>
                </div>
              )}
             </div>
          )}

          <div className="flex flex-wrap gap-6 p-4 bg-gray-800/30 rounded-xl">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={formData.is_pinned} onChange={e => setFormData({...formData, is_pinned: e.target.checked})} className="rounded bg-gray-700" />
              Pin to Top
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} className="rounded bg-gray-700" />
              Feature Post
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={formData.comments_disabled} onChange={e => setFormData({...formData, comments_disabled: e.target.checked})} className="rounded bg-gray-700" />
              Disable Comments
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={formData.status === "draft"} onChange={e => setFormData({...formData, status: e.target.checked ? "draft" : "published"})} className="rounded bg-gray-700" />
              Save as Draft
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {editingPost && (
              <Button type="button" variant="outline" className="border-gray-600 text-gray-300 hover:text-white" onClick={() => setEditingPost(null)}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={uploading} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {editingPost ? "Update Post" : "Publish Post"}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800 text-gray-400 text-sm">
              <tr>
                <th className="p-4">Post</th>
                <th className="p-4">Type</th>
                <th className="p-4">Metrics</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No posts found.</td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="text-gray-300 hover:bg-gray-800/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white mb-1 line-clamp-1">{post.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{post.description}</p>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-800 rounded-full w-fit capitalize">
                        {post.type === "video" ? <Video className="w-3 h-3 text-cyan-400" /> : post.type === "image" ? <ImageIcon className="w-3 h-3 text-green-400" /> : <FileText className="w-3 h-3 text-gray-400" />}
                        {post.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex gap-4">
                        <span className="text-blue-400">{post.views || 0} views</span>
                        <span className="text-red-400">{post.likes?.length || 0} likes</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${post.status === "draft" ? "bg-gray-700" : "bg-green-500/20 text-green-400"}`}>
                        {post.status}
                      </span>
                      {post.is_pinned && <Star className="w-3 h-3 inline ml-2 text-yellow-400 fill-current" />}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(post)} className="text-blue-400 hover:bg-blue-500/10">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(post.id)} className="text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
