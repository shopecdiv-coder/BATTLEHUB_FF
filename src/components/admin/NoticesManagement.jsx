import React, { useState, useEffect } from "react";
import { AppNotice } from "@/entities/AppNotice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Eye, EyeOff, Megaphone, Calendar, Trophy, Bell, Wrench, Wallet, Sparkles, Gift } from "lucide-react";
import { format } from "date-fns";

const NOTICE_CATEGORIES = [
  { value: "announcement", label: "🔔 Big Announcements", icon: Megaphone, color: "bg-red-500/20 text-red-400 border-red-500/50" },
  { value: "upcoming_event", label: "📆 Upcoming Events", icon: Calendar, color: "bg-blue-500/20 text-blue-400 border-blue-500/50" },
  { value: "winners", label: "🏅 Rewards & Winners", icon: Trophy, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" },
  { value: "rule_change", label: "⚠️ Rule Changes", icon: Bell, color: "bg-orange-500/20 text-orange-400 border-orange-500/50" },
  { value: "maintenance", label: "🛠️ System Alerts", icon: Wrench, color: "bg-gray-500/20 text-gray-400 border-gray-500/50" },
  { value: "wallet_update", label: "💰 Wallet Updates", icon: Wallet, color: "bg-green-500/20 text-green-400 border-green-500/50" },
  { value: "new_feature", label: "✨ New Features", icon: Sparkles, color: "bg-purple-500/20 text-purple-400 border-purple-500/50" },
  { value: "offer", label: "🎁 Offers & Bonus", icon: Gift, color: "bg-pink-500/20 text-pink-400 border-pink-500/50" }
];

export default function NoticesManagement() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState({
    category: "announcement",
    title: "",
    content: "",
    priority: 1,
    is_active: true
  });

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      const allNotices = await AppNotice.list("-priority");
      setNotices(allNotices);
    } catch (error) {
      console.error("Error loading notices:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      if (editingNotice) {
        await AppNotice.update(editingNotice.id, formData);
      } else {
        await AppNotice.create(formData);
      }
      await loadNotices();
      setShowForm(false);
      setEditingNotice(null);
      setFormData({ category: "announcement", title: "", content: "", priority: 1, is_active: true });
    } catch (error) {
      console.error("Error saving notice:", error);
      alert("Failed to save notice");
    }
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setFormData(notice);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this notice?")) return;
    try {
      await AppNotice.delete(id);
      await loadNotices();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const toggleActive = async (notice) => {
    try {
      await AppNotice.update(notice.id, { is_active: !notice.is_active });
      await loadNotices();
    } catch (error) {
      console.error("Error toggling:", error);
    }
  };

  const getCategoryConfig = (category) => {
    return NOTICE_CATEGORIES.find(c => c.value === category) || NOTICE_CATEGORIES[0];
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">App Notices Management</h2>
          <p className="text-gray-400 text-sm">Manage all types of user-facing notices and announcements</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingNotice(null);
            setFormData({ category: "announcement", title: "", content: "", priority: 1, is_active: true });
          }}
          className="bg-gradient-to-r from-orange-500 to-red-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Notice
        </Button>
      </div>

      {/* Category Overview */}
      <div className="grid md:grid-cols-4 gap-3">
        {NOTICE_CATEGORIES.map(cat => {
          const count = notices.filter(n => n.category === cat.value && n.is_active).length;
          const Icon = cat.icon;
          return (
            <Card key={cat.value} className={`${cat.color} border-2`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <div>
                    <p className="text-xs opacity-80">{cat.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-gray-100">
              {editingNotice ? "Edit Notice" : "Create New Notice"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTICE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Priority (1 = Highest)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 1})}
                  className="bg-gray-800 border-gray-700 text-gray-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Free Fire Pro League – Daily Tournaments"
                className="bg-gray-800 border-gray-700 text-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Content (Use emoji and line breaks)</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="🔥 Free Fire Pro League&#10;🏆 Prize Pool: ₹10,000&#10;📅 Start: 5th Feb&#10;⏰ Time: 8 PM"
                className="bg-gray-800 border-gray-700 text-gray-100 min-h-32"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              <Label className="text-gray-300">Active (Show on Notices page)</Label>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSubmit} className="bg-green-500 hover:bg-green-600">
                {editingNotice ? "Update" : "Create"} Notice
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingNotice(null); }} className="border-gray-700">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notices List */}
      <div className="space-y-3">
        {NOTICE_CATEGORIES.map(category => {
          const categoryNotices = notices.filter(n => n.category === category.value);
          if (categoryNotices.length === 0) return null;

          const Icon = category.icon;

          return (
            <Card key={category.value} className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  {category.label}
                  <Badge className={category.color}>{categoryNotices.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categoryNotices.map(notice => (
                  <div key={notice.id} className={`p-4 rounded-lg border-2 ${notice.is_active ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-900/50 border-gray-800 opacity-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-100">{notice.title}</h4>
                          <Badge className="text-xs">Priority {notice.priority}</Badge>
                          {!notice.is_active && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                        </div>
                        <p className="text-sm text-gray-400 whitespace-pre-wrap">{notice.content}</p>
                        <p className="text-xs text-gray-600 mt-2">
                          Created: {format(new Date(notice.created_date), "PPP p")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(notice)}>
                          {notice.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(notice)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(notice.id)} className="text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}