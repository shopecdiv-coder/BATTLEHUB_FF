import React, { useState, useEffect } from "react";
import { LeaderboardEntry } from "@/entities/LeaderboardEntry";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Plus, Trash2, Edit, Save, X, RefreshCw, Crown, Users } from "lucide-react";

export default function LeaderboardControl() {
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    rank: 1,
    player_name: "",
    player_ign: "",
    player_rank: "Unranked",
    total_matches: 0,
    total_wins: 0,
    total_kills: 0,
    is_active: true
  });
  const maxEntries = 20;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allEntries, allUsers] = await Promise.all([
        LeaderboardEntry.list("rank", 20),
        User.list("-created_date", 500)
      ]);
      setEntries(allEntries || []);
      setUsers(allUsers || []);
    } catch (error) {
      console.error("Error loading:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await LeaderboardEntry.update(editingId, formData);
      } else {
        await LeaderboardEntry.create(formData);
      }
      await loadData();
      resetForm();
      alert("✅ Leaderboard updated!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save. Please try again.");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await LeaderboardEntry.delete(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      rank: entry.rank,
      player_name: entry.player_name,
      player_ign: entry.player_ign || "",
      avatar_url: entry.avatar_url || "",
      player_rank: entry.player_rank || "Unranked",
      total_matches: entry.total_matches || 0,
      total_wins: entry.total_wins || 0,
      total_kills: entry.total_kills || 0,
      is_active: entry.is_active !== false
    });
    setEditingId(entry.id);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      rank: entries.length + 1,
      player_name: "",
      player_ign: "",
      player_rank: "Unranked",
      total_matches: 0,
      total_wins: 0,
      total_kills: 0,
      is_active: true
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const syncFromUsers = async () => {
    if (!confirm("This will replace manual entries with auto-generated data from users. Continue?")) return;
    
    setSaving(true);
    try {
      // Delete existing entries
      for (const entry of entries) {
        await LeaderboardEntry.delete(entry.id);
      }

      // Sort users by wins, kills, tournaments
      const sortedUsers = [...users].sort((a, b) => {
        const winsA = a.total_wins || 0;
        const winsB = b.total_wins || 0;
        if (winsB !== winsA) return winsB - winsA;
        const killsA = a.total_kills || 0;
        const killsB = b.total_kills || 0;
        if (killsB !== killsA) return killsB - killsA;
        return (b.total_tournaments || 0) - (a.total_tournaments || 0);
      });

      // Create new entries for top 20 users
      for (let i = 0; i < Math.min(sortedUsers.length, 20); i++) {
        const u = sortedUsers[i];
        await LeaderboardEntry.create({
          rank: i + 1,
          user_id: u.id,
          player_name: u.full_name,
          player_ign: u.ign || u.full_name,
          avatar_url: u.avatar_url,
          player_rank: u.rank || "Unranked",
          total_matches: u.total_tournaments || 0,
          total_wins: u.total_wins || 0,
          total_kills: u.total_kills || 0,
          is_active: true
        });
      }

      await loadData();
      alert("Leaderboard synced from user data (Top 20)!");
    } catch (error) {
      console.error("Error syncing:", error);
      alert("Failed to sync. Please try again.");
    }
    setSaving(false);
  };

  const clearAll = async () => {
    if (!confirm("Delete ALL manual entries? Leaderboard will show auto-generated data.")) return;
    
    setSaving(true);
    try {
      for (const entry of entries) {
        await LeaderboardEntry.delete(entry.id);
      }
      await loadData();
      alert("All manual entries deleted.");
    } catch (error) {
      console.error("Error clearing:", error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  const sortedUsers = [...users].sort((a, b) => {
    const winsA = a.total_wins || 0;
    const winsB = b.total_wins || 0;
    if (winsB !== winsA) return winsB - winsA;
    const killsA = a.total_kills || 0;
    const killsB = b.total_kills || 0;
    if (killsB !== killsA) return killsB - killsA;
    return (b.total_tournaments || 0) - (a.total_tournaments || 0);
  }).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-100">Leaderboard Management (Top 20)</h3>
          <p className="text-sm text-gray-400">
            {entries.length > 0 ? "Manual entries visible to users" : "Auto-generated from user stats visible to users"}
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={syncFromUsers} 
            variant="outline" 
            className="border-cyan-500/50 text-cyan-400"
            disabled={saving}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Auto-Sync from Users
          </Button>
          {entries.length > 0 && (
            <Button 
              onClick={clearAll} 
              variant="outline" 
              className="border-red-500/50 text-red-400"
              disabled={saving}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
          <Button 
            onClick={() => setShowAddForm(true)} 
            className="bg-green-600 hover:bg-green-700"
            disabled={entries.length >= maxEntries}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Player ({entries.length}/{maxEntries})
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="bg-gray-800 border-purple-500/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-purple-400">
                {editingId ? "Edit Leaderboard Entry" : "Add Manual Entry"}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Rank</Label>
                <Input
                  type="number"
                  min="1"
                  max={maxEntries}
                  value={formData.rank}
                  onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value) || 1 })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Player Rank/Title</Label>
                <Input
                  value={formData.player_rank}
                  onChange={(e) => setFormData({ ...formData, player_rank: e.target.value })}
                  placeholder="e.g., Grandmaster, Heroic"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Player Name *</Label>
                <Input
                  value={formData.player_name}
                  onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                  placeholder="Full name"
                  className="bg-gray-900 border-gray-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">IGN *</Label>
                <Input
                  value={formData.player_ign}
                  onChange={(e) => setFormData({ ...formData, player_ign: e.target.value })}
                  placeholder="In-game name"
                  className="bg-gray-900 border-gray-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Total Matches</Label>
                <Input
                  type="number"
                  value={formData.total_matches}
                  onChange={(e) => setFormData({ ...formData, total_matches: parseInt(e.target.value) || 0 })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Total Wins</Label>
                <Input
                  type="number"
                  value={formData.total_wins}
                  onChange={(e) => setFormData({ ...formData, total_wins: parseInt(e.target.value) || 0 })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Total Kills</Label>
                <Input
                  type="number"
                  value={formData.total_kills}
                  onChange={(e) => setFormData({ ...formData, total_kills: parseInt(e.target.value) || 0 })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={resetForm} variant="outline" className="flex-1 border-gray-700">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={saving || !formData.player_name || !formData.player_ign}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Add to Leaderboard"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Entries */}
      {entries.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Manual Leaderboard Entries ({entries.length}/20)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    index === 0 ? 'bg-yellow-900/20 border border-yellow-500/30' :
                    index === 1 ? 'bg-gray-700/50 border border-gray-500/30' :
                    index === 2 ? 'bg-orange-900/20 border border-orange-500/30' :
                    'bg-gray-700/30'
                  }`}
                >
                  <div className="w-8 text-center">
                    {index < 3 ? (
                      <Crown className={`w-5 h-5 mx-auto ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-300' : 'text-orange-400'
                      }`} />
                    ) : (
                      <span className="text-gray-400 font-bold">#{entry.rank}</span>
                    )}
                  </div>

                  <Avatar className="w-10 h-10">
                    <AvatarImage src={entry.avatar_url} />
                    <AvatarFallback className="bg-gray-600 text-white">
                      {entry.player_ign?.[0]?.toUpperCase() || 'P'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{entry.player_ign}</p>
                    <p className="text-xs text-gray-500">{entry.player_rank}</p>
                  </div>

                  <div className="flex gap-4 text-center text-sm">
                    <div>
                      <p className="text-cyan-400 font-bold">{entry.total_matches}</p>
                      <p className="text-[10px] text-gray-500">Matches</p>
                    </div>
                    <div>
                      <p className="text-cyan-400 font-bold">{entry.total_wins}</p>
                      <p className="text-[10px] text-gray-500">Wins</p>
                    </div>
                    <div>
                      <p className="text-red-400 font-bold">{entry.total_kills}</p>
                      <p className="text-[10px] text-gray-500">Kills</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)}>
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Generated Preview (Shows what users see when no manual entries) */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            {entries.length === 0 ? "Current Leaderboard (Auto-Generated - Visible to Users)" : "Preview: Auto-Generated (Hidden - Manual entries shown to users)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No users yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedUsers.map((user, index) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    index === 0 ? 'bg-yellow-900/20 border border-yellow-500/30' :
                    index === 1 ? 'bg-gray-700/50 border border-gray-500/30' :
                    index === 2 ? 'bg-orange-900/20 border border-orange-500/30' :
                    'bg-gray-700/30'
                  }`}
                >
                  <div className="w-8 text-center">
                    {index < 3 ? (
                      <Crown className={`w-5 h-5 mx-auto ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-300' : 'text-orange-400'
                      }`} />
                    ) : (
                      <span className="text-gray-400 font-bold">#{index + 1}</span>
                    )}
                  </div>

                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-gray-600 text-white">
                      {user.ign?.[0]?.toUpperCase() || user.full_name?.[0]?.toUpperCase() || 'P'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{user.ign || user.full_name}</p>
                    <p className="text-xs text-gray-500">{user.rank || 'Unranked'}</p>
                  </div>

                  <div className="flex gap-4 text-center text-sm">
                    <div>
                      <p className="text-cyan-400 font-bold">{user.total_tournaments || 0}</p>
                      <p className="text-[10px] text-gray-500">Matches</p>
                    </div>
                    <div>
                      <p className="text-cyan-400 font-bold">{user.total_wins || 0}</p>
                      <p className="text-[10px] text-gray-500">Wins</p>
                    </div>
                    <div>
                      <p className="text-red-400 font-bold">{user.total_kills || 0}</p>
                      <p className="text-[10px] text-gray-500">Kills</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}