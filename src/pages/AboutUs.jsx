import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { AboutUsContent as AboutContent } from "@/entities/AboutUsContent";
import { AppSettings } from "@/entities/AppSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Target, Shield, Star, Edit, Save, X, Circle, Wifi, WifiOff, Clock, Info } from "lucide-react";


const DEFAULT_CONTENT = {
  title: "Battle Hub Tournament",
  tagline: "India's Premier Free Fire Tournament Platform",
  description: "Welcome to Battle Hub - your ultimate destination for competitive Free Fire gaming. We organize daily tournaments with real cash prizes, bringing together the best players from across India.",
  features: [
    { icon: "Trophy", title: "Daily Tournaments", desc: "Multiple tournaments every day with exciting prizes" },
    { icon: "Users", title: "Growing Community", desc: "Join thousands of active players" },
    { icon: "Target", title: "Fair Play", desc: "Anti-cheat systems and transparent results" },
    { icon: "Shield", title: "Secure Payments", desc: "Fast and secure prize distribution" }
  ],
  contact: {
    email: "support@battlehub.in",
    phone: "+91 9876543210",
    instagram: "@battlehub_official"
  },
  founder: "Battle Hub Team"
};

const STATUS_OPTIONS = [
  { value: "online", label: "🟢 Online", color: "bg-green-500" },
  { value: "offline", label: "🔴 Offline", color: "bg-red-500" },
  { value: "maintenance", label: "🟡 Maintenance", color: "bg-yellow-500" },
  { value: "busy", label: "🟠 Busy", color: "bg-orange-500" }
];

export default function AboutUs() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState({ content: "" });
  const [contentId, setContentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appStatus, setAppStatus] = useState("online");
  const [statusMessage, setStatusMessage] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load user, about us content, and app status in parallel
      const [currentUser, aboutUsData, statusSettings, statusMsgSettings] = await Promise.all([
        User.me().catch(() => null),
        AboutContent.list("-created_date", 1).catch(() => []),
        AppSettings.filter({ setting_key: "app_status" }).catch(() => []),
        AppSettings.filter({ setting_key: "app_status_message" }).catch(() => [])
      ]);
      
      setUser(currentUser);
      
      // Use saved content if exists
      if (aboutUsData && aboutUsData.length > 0) {
        setContent(aboutUsData[0]);
        setContentId(aboutUsData[0].id);
      } else {
        setContent({ content: "" });
      }
      
      // Load app status
      if (statusSettings.length > 0) {
        setAppStatus(statusSettings[0].setting_value || "online");
      }
      if (statusMsgSettings.length > 0) {
        setStatusMessage(statusMsgSettings[0].setting_value || "");
      }
    } catch (error) {
      // Silent fail
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        title: content.title || "Battle Hub",
        content: content.content || ""
      };
      
      if (contentId) {
        await AboutContent.update(contentId, dataToSave);
      } else {
        const newContent = await AboutContent.create(dataToSave);
        setContentId(newContent.id);
      }
      setIsEditing(false);
      alert("✅ About Us saved! All users will see the updated content.");
      await loadData();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save");
    }
  };

  const saveAppStatus = async () => {
    try {
      // Save app status
      const statusSettings = await AppSettings.filter({ setting_key: "app_status" }).catch(() => []);
      if (statusSettings.length > 0) {
        await AppSettings.update(statusSettings[0].id, { setting_value: appStatus });
      } else {
        await AppSettings.create({
          setting_key: "app_status",
          setting_value: appStatus,
          is_enabled: true,
          description: "BattleHub app status"
        });
      }
      
      // Save status message
      const msgSettings = await AppSettings.filter({ setting_key: "app_status_message" }).catch(() => []);
      if (msgSettings.length > 0) {
        await AppSettings.update(msgSettings[0].id, { setting_value: statusMessage });
      } else {
        await AppSettings.create({
          setting_key: "app_status_message",
          setting_value: statusMessage,
          is_enabled: true,
          description: "BattleHub status message"
        });
      }
      
      setEditingStatus(false);
      alert("Status updated!");
    } catch (error) {
      console.error("Error saving status:", error);
    }
  };

  const getStatusInfo = () => {
    return STATUS_OPTIONS.find(s => s.value === appStatus) || STATUS_OPTIONS[0];
  };

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* App Status Card - Visible to all users */}
        <div>
          <Card className={`border-2 ${
            appStatus === 'online' ? 'bg-green-900/20 border-green-500/50' :
            appStatus === 'offline' ? 'bg-red-900/20 border-red-500/50' :
            appStatus === 'maintenance' ? 'bg-yellow-900/20 border-yellow-500/50' :
            'bg-orange-900/20 border-orange-500/50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${getStatusInfo().color} animate-pulse`}></div>
                  <div>
                    <p className="font-bold text-white text-lg">BattleHub Status</p>
                    <p className="text-sm text-gray-400">{getStatusInfo().label}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    onClick={() => setEditingStatus(!editingStatus)}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300"
                  >
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                )}
              </div>
              
              {statusMessage && (
                <div className="mt-3 p-3 bg-black/30 rounded-lg">
                  <p className="text-gray-300 text-sm">{statusMessage}</p>
                </div>
              )}
              
              {/* Admin Edit Status */}
              {isAdmin && editingStatus && (
                <div className="mt-4 p-4 bg-black/30 rounded-lg space-y-3">
                  <div>
                    <Label className="text-gray-300 text-sm">Status</Label>
                    <div className="flex gap-2 mt-1">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAppStatus(opt.value)}
                          className={`px-3 py-2 rounded-lg text-sm ${
                            appStatus === opt.value 
                              ? 'bg-white/20 text-white border-2 border-white/50' 
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Status Message (optional)</Label>
                    <Input
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="e.g., Tournament in progress, Back in 1 hour..."
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveAppStatus} className="bg-green-500 hover:bg-green-600">
                      <Save className="w-4 h-4 mr-2" /> Save Status
                    </Button>
                    <Button onClick={() => setEditingStatus(false)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Content Editor (Admin) or Display (Users) */}
        {isAdmin && isEditing ? (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100">Edit About Us Page (HTML Supported)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Page Title</Label>
                <Input
                  value={content.title || ""}
                  onChange={(e) => setContent({...content, title: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Battle Hub"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Content (HTML Supported)</Label>
                <Textarea
                  value={content.content || ""}
                  onChange={(e) => setContent({...content, content: e.target.value})}
                  rows={20}
                  placeholder="Enter HTML content: <h2>Section Title</h2><p>Description...</p>"
                  className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                />
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline">
                  <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-6 lg:p-8">
              {isAdmin && !isEditing && (
                <div className="flex justify-end mb-4">
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="border-orange-500 text-orange-400">
                    <Edit className="w-4 h-4 mr-2" /> Edit Page
                  </Button>
                </div>
              )}
              
              {content.content ? (
                <div 
                  className="text-gray-300 leading-relaxed space-y-4"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {content.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-base leading-7">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {isAdmin ? (
                    <>
                      <Info className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                      <p>No content yet. Click "Edit Page" to add content.</p>
                    </>
                  ) : (
                    <p>Content coming soon...</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 text-lg">
            Made with ❤️ in India
          </Badge>
        </div>
      </div>
    </div>
  );
}