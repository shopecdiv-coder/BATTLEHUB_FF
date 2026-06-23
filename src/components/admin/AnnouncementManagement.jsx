import React, { useState, useEffect } from "react";
import { Announcement } from "@/entities/Announcement";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Save, X, Megaphone, Upload, Eye, EyeOff } from "lucide-react";

import { format } from "date-fns";

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "General",
    priority: "Medium",
    image_url: "",
    link: "",
    active: true,
    show_on_home: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await Announcement.list("-created_date");
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData({...formData, image_url: file_url});
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.message) {
      alert("Title and Message are required!");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await Announcement.update(editingId, formData);
      } else {
        await Announcement.create(formData);
      }
      await loadData();
      resetForm();
    } catch (error) {
      console.error("Error saving:", error);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await Announcement.delete(id);
      await loadData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      title: item.title,
      message: item.message,
      type: item.type || "General",
      priority: item.priority || "Medium",
      image_url: item.image_url || "",
      link: item.link || "",
      active: item.active !== false,
      show_on_home: item.show_on_home !== false
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const toggleActive = async (item) => {
    try {
      await Announcement.update(item.id, { active: !item.active });
      await loadData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      type: "General",
      priority: "Medium",
      image_url: "",
      link: "",
      active: true,
      show_on_home: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Urgent": return "bg-red-500/20 text-red-400 border-red-500/50";
      case "High": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "Medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      default: return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Announcements</h2>
          <Badge className="bg-orange-500/20 text-orange-400">{announcements.length}</Badge>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-gradient-to-r from-orange-500 to-red-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div>
          <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  {editingId ? "Edit Announcement" : "New Announcement"}
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Announcement title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["General", "Tournament", "Maintenance", "Event", "Urgent"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Message *</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                    placeholder="Announcement message..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Low", "Medium", "High", "Urgent"].map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Redirect Link (optional)</Label>
                    <Input
                      value={formData.link}
                      onChange={(e) => setFormData({...formData, link: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="https://example.com or any website URL"
                    />
                    <p className="text-xs text-gray-500">User can click to open this link</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Image (optional)</Label>
                  {formData.image_url ? (
                    <div className="relative inline-block">
                      <img src={formData.image_url} alt="Preview" className="w-32 h-20 object-cover rounded" />
                      <button
                        onClick={() => setFormData({...formData, image_url: ""})}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-600 rounded p-4 text-center hover:border-orange-500/50">
                        {uploading ? "Uploading..." : (
                          <>
                            <Upload className="w-6 h-6 mx-auto text-gray-500 mb-1" />
                            <p className="text-xs text-gray-500">Click to upload</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.active}
                      onCheckedChange={(v) => setFormData({...formData, active: v})}
                    />
                    <Label className="text-gray-300">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.show_on_home}
                      onCheckedChange={(v) => setFormData({...formData, show_on_home: v})}
                    />
                    <Label className="text-gray-300">Show on Home</Label>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : editingId ? "Update" : "Create Announcement"}
                </Button>
              </CardContent>
          </Card>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700 p-8 text-center">
            <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No announcements yet</p>
          </Card>
        ) : (
          announcements.map((item) => (
            <Card key={item.id} className={`bg-gray-800 border-gray-700 ${!item.active ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                      <Badge variant="outline" className="text-gray-400 border-gray-600">{item.type}</Badge>
                      {!item.active && <Badge className="bg-gray-600 text-gray-300">Inactive</Badge>}
                      {item.show_on_home && <Badge className="bg-green-500/20 text-green-400">Home</Badge>}
                      {item.link && <Badge className="bg-cyan-500/20 text-cyan-400">🔗 Has Link</Badge>}
                    </div>
                    <h3 className="font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{item.message}</p>
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline mt-1 inline-block">
                        🔗 {item.link}
                      </a>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {format(new Date(item.created_date), "PPP p")}
                    </p>
                  </div>
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="w-20 h-14 object-cover rounded" />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(item)} className="text-gray-400">
                      {item.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} className="text-blue-400">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-400">
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