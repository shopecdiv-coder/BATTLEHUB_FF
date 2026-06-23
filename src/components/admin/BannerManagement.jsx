import React, { useState } from "react";
import { Banner } from "@/entities/Banner";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Upload, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BannerManagement({ banners, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    caption: "",
    redirect_url: "",
    active: true,
    order: 0
  });
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
    } catch (error) {
      console.error("Error uploading image:", error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await Banner.create(formData);
    setShowForm(false);
    setFormData({
      title: "",
      image_url: "",
      caption: "",
      redirect_url: "",
      active: true,
      order: 0
    });
    onUpdate();
  };

  const toggleActive = async (banner) => {
    await Banner.update(banner.id, { active: !banner.active });
    onUpdate();
  };

  const deleteBanner = async (id) => {
    if (confirm("Are you sure you want to delete this banner?")) {
      await Banner.delete(id);
      onUpdate();
    }
  };

  const changeOrder = async (banner, direction) => {
    const newOrder = banner.order + direction;
    await Banner.update(banner.id, { order: newOrder });
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-100">Banner Management</h3>
          <p className="text-sm text-gray-400">Recommended size: 1200x400px</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Banner
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Banner title"
                      className="bg-gray-900 border-gray-700 text-gray-100"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Caption (Optional)</Label>
                    <Textarea
                      value={formData.caption}
                      onChange={(e) => setFormData({...formData, caption: e.target.value})}
                      placeholder="Banner description..."
                      className="bg-gray-900 border-gray-700 text-gray-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Redirect URL (Optional)</Label>
                    <Input
                      value={formData.redirect_url}
                      onChange={(e) => setFormData({...formData, redirect_url: e.target.value})}
                      placeholder="https://..."
                      className="bg-gray-900 border-gray-700 text-gray-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Banner Image</Label>
                    {formData.image_url ? (
                      <div className="relative">
                        <img src={formData.image_url} alt="Banner" className="w-full h-48 object-cover rounded border-2 border-purple-500/50" />
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, image_url: ""})}
                          className="absolute top-2 right-2 bg-red-500 p-2 rounded"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-700 hover:border-purple-500/50 rounded p-8 text-center">
                          {uploading ? (
                            <p className="text-sm text-gray-400">Uploading...</p>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 mx-auto text-gray-500 mb-2" />
                              <p className="text-sm text-gray-400">Click to upload banner image</p>
                              <p className="text-xs text-gray-500 mt-1">1200x400px recommended</p>
                            </>
                          )}
                        </div>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                      </label>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-gray-700">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={uploading}>
                      Create Banner
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {banners.length === 0 ? (
          <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
            <p className="text-gray-500">No banners yet</p>
          </Card>
        ) : (
          banners.map((banner) => (
            <Card key={banner.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <img src={banner.image_url} alt={banner.title} className="w-32 h-20 object-cover rounded" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-100">{banner.title}</h4>
                      <Badge className={banner.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                        {banner.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {banner.caption && <p className="text-sm text-gray-400">{banner.caption}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => changeOrder(banner, -1)} className="border-gray-700">
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => changeOrder(banner, 1)} className="border-gray-700">
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(banner)} className="border-gray-700">
                      {banner.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteBanner(banner.id)} className="border-red-500/50 text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}