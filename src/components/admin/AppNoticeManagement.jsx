
import React, { useState } from "react";
import { AppNotice } from "@/entities/AppNotice";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Image as ImageIcon, Trash2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AppNoticeManagement({ notices, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "Announcement",
    priority: "Medium",
    active: true,
    link: "",
    image_url: ""
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
    await AppNotice.create(formData);

    // Create notifications for all users
    const allUsers = await User.list();
    for (const user of allUsers) {
      await Notification.create({
        recipient_id: user.id,
        type: "App Update",
        title: formData.title,
        message: formData.message,
        link: formData.link || createPageUrl("Home"),
        priority: formData.priority,
        dismissable: true,
        created_at: new Date().toISOString()
      });
    }

    setShowForm(false);
    setFormData({
      title: "",
      message: "",
      type: "Announcement",
      priority: "Medium",
      active: true,
      link: "",
      image_url: ""
    });
    onUpdate();
  };

  const toggleActive = async (notice) => {
    await AppNotice.update(notice.id, { active: !notice.active });
    onUpdate();
  };

  const deleteNotice = async (id) => {
    if (confirm("Delete this notice?")) {
      await AppNotice.delete(id);
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-100">📢 Latest Notices & Updates</h3>
          <p className="text-sm text-gray-400">Manage app-wide announcements and feature updates</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add App Notice
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
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-gray-900 border-gray-700 text-gray-100"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Message</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="bg-gray-900 border-gray-700 text-gray-100 min-h-[100px]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Feature Update">Feature Update</SelectItem>
                          <SelectItem value="Bug Fix">Bug Fix</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Announcement">Announcement</SelectItem>
                          <SelectItem value="Event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Redirect Link (Optional)</Label>
                    <Input
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      className="bg-gray-900 border-gray-700 text-gray-100"
                      placeholder="e.g., /tournaments"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Image (Optional)</Label>
                    {formData.image_url ? (
                      <div className="relative group">
                        <img
                          src={formData.image_url}
                          alt="Notice"
                          className="w-full h-48 object-cover rounded border-2 border-blue-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: "" })}
                          className="absolute top-2 right-2 bg-red-500 p-2 rounded opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-700 hover:border-blue-500/50 rounded p-6 text-center">
                          {uploading ? (
                            <p className="text-sm text-gray-400">Uploading...</p>
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                              <p className="text-sm text-gray-400">Click to upload image</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="border-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={uploading}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Create & Notify All Users
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {notices.length === 0 ? (
          <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
            <p className="text-gray-500">No app notices yet</p>
          </Card>
        ) : (
          notices.map((notice) => (
            <Card key={notice.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {notice.image_url && (
                    <img
                      src={notice.image_url}
                      alt="Notice"
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        notice.priority === "Urgent" ? "bg-red-500/20 text-red-400" :
                        notice.priority === "High" ? "bg-orange-500/20 text-orange-400" :
                        "bg-blue-500/20 text-blue-400"
                      }>
                        {notice.type}
                      </Badge>
                      <Badge className={notice.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                        {notice.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-gray-100 mb-1">{notice.title}</h4>
                    <p className="text-gray-300 text-sm">{notice.message}</p>
                    {notice.link && (
                      <p className="text-blue-400 text-xs mt-1">Link: {notice.link}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(notice)}
                      className="border-gray-700"
                    >
                      {notice.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteNotice(notice.id)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
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
