
import React, { useState } from "react";
import { DashboardNotice } from "@/entities/DashboardNotice";
import { PlayerMessage } from "@/entities/PlayerMessage";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Image as ImageIcon, Trash2, FileText, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function NoticeManagement({ notices, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    poster_url: "",
    priority: "Medium",
    active: true,
    expires_at: ""
  });
  const [uploading, setUploading] = useState(false);
  const [playerMessages, setPlayerMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);

  React.useEffect(() => {
    loadPlayerMessages();
  }, []);

  const loadPlayerMessages = async () => {
    setLoadingMessages(true);
    const messages = await PlayerMessage.filter({ read: false }).then(res => res.sort((a,b) => new Date(b.sent_at) - new Date(a.sent_at)));
    setPlayerMessages(messages);
    setLoadingMessages(false);
  };

  const deleteAllPlayerMessages = async () => {
    if (!confirm("Are you sure you want to delete ALL player messages (Room Details)? This will remove messages from all registered players.")) {
      return;
    }

    const allMessages = await PlayerMessage.list();
    for (const msg of allMessages) {
      await PlayerMessage.delete(msg.id);
    }
    
    alert("All player messages deleted successfully!");
    await loadPlayerMessages();
  };

  const deletePlayerMessage = async (messageId) => {
    if (confirm("Are you sure you want to delete this message?")) {
      await PlayerMessage.delete(messageId);
      await loadPlayerMessages();
    }
  };

  const editPlayerMessage = async (msg) => {
    const newMessage = prompt("Edit message:", msg.message);
    if (newMessage && newMessage !== msg.message) {
      await PlayerMessage.update(msg.id, { message: newMessage });
      await loadPlayerMessages();
    }
  };

  const handlePosterUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData({ ...formData, poster_url: file_url });
    } catch (error) {
      console.error("Error uploading poster:", error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await DashboardNotice.create(formData);
    setShowForm(false);
    setFormData({
      title: "",
      message: "",
      poster_url: "",
      priority: "Medium",
      active: true,
      expires_at: ""
    });
    onUpdate();
  };

  const toggleActive = async (notice) => {
    await DashboardNotice.update(notice.id, { active: !notice.active });
    onUpdate();
  };

  const deleteNotice = async (id) => {
    await DashboardNotice.delete(id);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Player Messages Section */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-100">Sent Player Messages (Room Details)</CardTitle>
            <Button
              onClick={deleteAllPlayerMessages}
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove from All Registered Players
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMessages ? (
            <p className="text-gray-500 text-center py-4">Loading messages...</p>
          ) : playerMessages.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No active player messages</p>
          ) : (
            <div className="space-y-3">
              {playerMessages.map((msg) => (
                <Card key={msg.id} className="bg-gray-900 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-gray-100">{msg.recipient_ign}</p>
                        <p className="text-sm text-gray-400">{msg.message}</p>
                        {msg.room_code && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-[#00FFFF]">Room ID: {msg.room_code}</p>
                            {msg.room_password && (
                              <p className="text-xs text-[#FF004C]">Password: {msg.room_password}</p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Sent: {format(new Date(msg.sent_at), "PPp")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editPlayerMessage(msg)}
                          className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deletePlayerMessage(msg.id)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Notices Section */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-100">Dashboard Notices</h3>
          <p className="text-sm text-gray-400">Recommended size: 1200x800px for images, PDF/Video supported</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Notice
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

                  <div className="space-y-2">
                    <Label className="text-gray-300">Poster / Media (Photo, Video, PDF)</Label>
                    {formData.poster_url ? (
                      <div className="relative group">
                        {formData.poster_url.endsWith('.pdf') ? (
                          <div className="flex items-center gap-3 p-4 bg-gray-900 rounded border-2 border-orange-500/50">
                            <FileText className="w-8 h-8 text-orange-400" />
                            <span className="text-gray-300">PDF Uploaded</span>
                          </div>
                        ) : (
                          <img
                            src={formData.poster_url}
                            alt="Poster"
                            className="w-full h-64 object-cover rounded border-2 border-orange-500/50"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, poster_url: "" })}
                          className="absolute top-2 right-2 bg-red-500 p-2 rounded opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-700 hover:border-orange-500/50 rounded p-6 text-center">
                          {uploading ? (
                            <p className="text-sm text-gray-400">Uploading...</p>
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                              <p className="text-sm text-gray-400">Click to upload (Image, Video, or PDF)</p>
                              <p className="text-xs text-gray-500 mt-1">Recommended: 1200x800px</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*,video/*,.pdf"
                          onChange={handlePosterUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                    <div className="space-y-2">
                      <Label className="text-gray-300">Expires At (Optional)</Label>
                      <Input
                        type="datetime-local"
                        value={formData.expires_at}
                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                        className="bg-gray-900 border-gray-700 text-gray-100"
                      />
                    </div>
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
                      className="bg-orange-500 hover:bg-orange-600"
                      disabled={uploading}
                    >
                      Create Notice
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
            <p className="text-gray-500">No notices yet</p>
          </Card>
        ) : (
          notices.map((notice) => (
            <Card key={notice.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {notice.poster_url && (
                    notice.poster_url.endsWith('.pdf') ? (
                      <a href={notice.poster_url} target="_blank" rel="noopener noreferrer" className="w-32 h-32 flex items-center justify-center bg-gray-900 rounded border-2 border-orange-500/50 hover:border-orange-500">
                        <FileText className="w-16 h-16 text-orange-400" />
                      </a>
                    ) : (
                      <a href={notice.poster_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={notice.poster_url}
                          alt="Notice"
                          className="w-32 h-32 object-cover rounded border-2 border-orange-500/50 hover:border-orange-500 cursor-pointer"
                        />
                      </a>
                    )
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-gray-100">{notice.title}</h4>
                      <Badge className={
                        notice.priority === "Urgent" ? "bg-red-500/20 text-red-400" :
                        notice.priority === "High" ? "bg-orange-500/20 text-orange-400" :
                        "bg-gray-500/20 text-gray-400"
                      }>
                        {notice.priority}
                      </Badge>
                      <Badge className={notice.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                        {notice.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{notice.message}</p>
                    {notice.expires_at && (
                      <p className="text-xs text-gray-500">
                        Expires: {format(new Date(notice.expires_at), "PPP")}
                      </p>
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
