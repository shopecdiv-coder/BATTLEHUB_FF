import React, { useState, useEffect } from "react";
import { PhotoLibrary } from "@/entities/PhotoLibrary";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Upload, Trash2, Copy, Check, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function PhotoLibraryManagement() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [copiedId, setCopiedId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    photo_url: "",
    category: "General",
    tags: []
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const allPhotos = await PhotoLibrary.list("-created_date");
      setPhotos(allPhotos || []);
    } catch (error) {
      console.error("Error loading photos:", error);
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Failed to upload photo");
    }
    setUploading(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await PhotoLibrary.create(formData);
      setShowUpload(false);
      setFormData({ title: "", photo_url: "", category: "General", tags: [] });
      await loadPhotos();
      alert("Photo added to library!");
    } catch (error) {
      console.error("Error creating photo:", error);
      alert("Failed to add photo");
    }
  };

  const deletePhoto = async (id) => {
    if (confirm("Delete this photo from library?")) {
      try {
        await PhotoLibrary.delete(id);
        await loadPhotos();
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPhotos = photos.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-100">Photo Library</h3>
          <p className="text-sm text-gray-400">Upload and manage photos for tournaments, banners, and announcements</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Upload Photo
        </Button>
      </div>

      {showUpload && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Photo *</Label>
                {formData.photo_url ? (
                  <div className="relative">
                    <img src={formData.photo_url} alt="Preview" className="w-full h-48 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photo_url: "" })}
                      className="absolute top-2 right-2 bg-red-500 p-2 rounded"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-700 rounded p-8 text-center hover:border-purple-500/50">
                      {uploading ? "Uploading..." : (
                        <>
                          <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                          <p className="text-sm text-gray-400">Click to upload photo</p>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Photo title"
                    className="bg-gray-900 border-gray-700 text-gray-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tournament">Tournament</SelectItem>
                      <SelectItem value="Banner">Banner</SelectItem>
                      <SelectItem value="Announcement">Announcement</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Tags (for easy search)</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag"
                    className="bg-gray-900 border-gray-700 text-gray-100"
                  />
                  <Button type="button" onClick={addTag} variant="outline" className="border-gray-700">
                    Add
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, i) => (
                      <Badge key={i} className="bg-purple-500/20 text-purple-400">
                        {tag}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowUpload(false)} className="border-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={uploading || !formData.photo_url}>
                  Add to Library
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search photos by title or tags..."
            className="pl-10 bg-gray-800 border-gray-700 text-gray-100"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-gray-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Tournament">Tournament</SelectItem>
            <SelectItem value="Banner">Banner</SelectItem>
            <SelectItem value="Announcement">Announcement</SelectItem>
            <SelectItem value="General">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Photo Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
          <p className="text-gray-500">No photos in library</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 border-gray-700 rounded-lg overflow-hidden group relative"
            >
              <img src={photo.photo_url} alt={photo.title} className="w-full h-40 object-cover" />
              <div className="p-3">
                <h4 className="font-semibold text-gray-100 text-sm truncate">{photo.title}</h4>
                <Badge className="bg-purple-500/20 text-purple-400 text-xs mt-1">{photo.category}</Badge>
                {photo.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {photo.tags.slice(0, 2).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] border-gray-600 text-gray-400">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => copyUrl(photo.photo_url, photo.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                  >
                    {copiedId === photo.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copiedId === photo.id ? "Copied!" : "Copy URL"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deletePhoto(photo.id)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}