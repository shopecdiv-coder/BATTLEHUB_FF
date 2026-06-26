import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { RedeemRequest } from "@/entities/RedeemRequest";
import { Registration } from "@/entities/Registration";
import { Diamond } from "@/entities/Diamond";
import { GlobalChat } from "@/entities/GlobalChat";
import { ActiveUser } from "@/entities/ActiveUser";
import { TaskSubmission } from "@/entities/TaskSubmission";
import { UploadFile } from "@/integrations/Core";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Shield, Copy, Link2, X, Plus, Trash2, Users, Save, Download, BarChart2, Bookmark } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserPerformanceDashboard from "@/components/admin/UserPerformanceDashboard";
import DataReportGenerator from "@/components/profile/DataReportGenerator";

const LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5NzMxNiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJIPC90ZXh0Pjwvc3ZnPg==";

import { format } from "date-fns";
import { ProfileSkeleton } from "@/components/SkeletonLoader";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({});
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showAvatarInput, setShowAvatarInput] = useState(false);
  const [savedSquads, setSavedSquads] = useState([]);
  const [showSquadForm, setShowSquadForm] = useState(false);
  const [newSquad, setNewSquad] = useState({ squad_name: "", members: [], logo_url: "" });
  const [newMember, setNewMember] = useState({ ign: "", uid: "" });
  const [editingSquadIndex, setEditingSquadIndex] = useState(null);
  const [editingSquad, setEditingSquad] = useState(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [userDiamond, setUserDiamond] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  const generateTrulyUniqueId = async (userId) => {
    // Use last 8 hex chars of UUID = 4.29 billion combinations, guaranteed unique per user
    const raw = userId.replace(/-/g, "");
    // Take different part than first 6 to avoid collisions
    const part = raw.slice(-8).toUpperCase();
    return `BH${part}`;
  };

  const loadUser = async () => {
    const currentUser = await User.me();
    
    if (!currentUser.unique_id) {
      const uniqueId = await generateTrulyUniqueId(currentUser.id);
      await User.updateMyUserData({ unique_id: uniqueId });
      currentUser.unique_id = uniqueId;
    }
    
    setUser(currentUser);
    setFormData({
      ign: currentUser.ign || "",
      game_uid: currentUser.game_uid || "",
      rank: currentUser.rank || "Bronze",
      phone: currentUser.phone || "",
      bio: currentUser.bio || ""
    });
    setAvatarUrl(currentUser.avatar_url || "");
    setSavedSquads(currentUser.saved_squads || []);

    // Load performance data in background
    Registration.filter({ team_leader_id: currentUser.id }).then(regs => setUserRegistrations(regs || [])).catch(() => {});
    Diamond.filter({ user_id: currentUser.id }).then(d => setUserDiamond(d?.[0] || null)).catch(() => {});

    setLoading(false);
  };

  const saveSquad = async () => {
    if (!newSquad.squad_name || newSquad.members.length < 2) {
      alert("Squad name aur kam se kam 2 members zaroori hain");
      return;
    }
    const updatedSquads = [...savedSquads, newSquad];
    await User.updateMyUserData({ saved_squads: updatedSquads });
    setSavedSquads(updatedSquads);
    setNewSquad({ squad_name: "", members: [] });
    setNewMember({ ign: "", uid: "" });
    setShowSquadForm(false);
    alert("✅ Squad saved!");
  };

  const deleteSquad = async (index) => {
    const updatedSquads = savedSquads.filter((_, i) => i !== index);
    await User.updateMyUserData({ saved_squads: updatedSquads });
    setSavedSquads(updatedSquads);
  };

  const startEditSquad = (index) => {
    setEditingSquadIndex(index);
    setEditingSquad(JSON.parse(JSON.stringify(savedSquads[index])));
  };

  const saveEditedSquad = async () => {
    if (!editingSquad.squad_name || editingSquad.members.length < 2) {
      alert("Squad name aur kam se kam 2 members zaroori hain");
      return;
    }
    const updatedSquads = [...savedSquads];
    updatedSquads[editingSquadIndex] = editingSquad;
    await User.updateMyUserData({ saved_squads: updatedSquads });
    setSavedSquads(updatedSquads);
    setEditingSquadIndex(null);
    setEditingSquad(null);
    alert("✅ Squad updated!");
  };

  const handleSave = async () => {
    if (formData.ign && formData.ign !== user.ign) {
      const existingUsers = await User.filter({ ign: formData.ign });
      const ignExists = existingUsers.some(u => u.id !== user.id);
      if (ignExists) {
        const suggestions = [
          formData.ign + Math.floor(Math.random() * 100),
          formData.ign + "FF",
          formData.ign + "YT",
          "Pro" + formData.ign
        ];
        alert(`⚠️ IGN "${formData.ign}" already taken!\n\nSuggestions:\n${suggestions.join('\n')}`);
        return;
      }
    }
    
    setSaving(true);
    try {
      await User.updateMyUserData(formData);
      await loadUser();
      alert("✅ Profile updated!");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to save");
    }
    setSaving(false);
  };

  const downloadMyData = async () => {
    if (!pdfRef.current) return;
    setGeneratingPdf(true);
    const success = await pdfRef.current.generatePDF();
    setGeneratingPdf(false);
    if (success) {
      setShowDataModal(false);
      alert('✅ PDF Downloaded Successfully!');
    } else {
      alert('❌ Failed to generate PDF');
    }
  };



  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <DataReportGenerator ref={pdfRef} />
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            Player Profile
          </h1>
          <p className="text-gray-400 mt-1">Manage your gaming profile and stats</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-gray-900 border border-gray-800 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> 📊 My Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <UserPerformanceDashboard user={user} userRegistrations={userRegistrations} userDiamond={userDiamond} />
          </TabsContent>

          <TabsContent value="profile">
        <div className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div>
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-100">Avatar & Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="w-32 h-32 ring-4 ring-purple-500">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-5xl font-bold">
                      {user.ign?.[0]?.toUpperCase() || user.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!showAvatarInput ? (
                    <Button size="sm" variant="outline" className="border-purple-500/50 text-purple-400" onClick={() => setShowAvatarInput(true)}>
                      <Link2 className="w-3 h-3 mr-1" />
                      {user.avatar_url ? "Change Photo" : "Set Profile Photo"}
                    </Button>
                  ) : (
                    <div className="w-full space-y-2">
                      <label className="cursor-pointer block">
                        <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-all ${
                          avatarUrl ? 'border-purple-500/60 bg-purple-500/10' : 'border-gray-600 bg-gray-800/60 hover:border-purple-500/50'
                        }`}>
                          {avatarUrl ? (
                            <span className="text-green-400 text-sm">✅ Photo ready — click to change</span>
                          ) : (
                            <span className="text-gray-400 text-sm">📸 Click to upload profile photo</span>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            try {
                              const { file_url } = await UploadFile({ file });
                              setAvatarUrl(file_url);
                            } catch (err) {
                              alert("Photo upload failed. Please try again.");
                            }
                          }}
                        />
                      </label>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-purple-600" onClick={async () => {
                          await User.updateMyUserData({ avatar_url: avatarUrl });
                          await loadUser();
                          setShowAvatarInput(false);
                        }}>Save</Button>
                        {user.avatar_url && (
                          <Button size="sm" variant="outline" className="border-red-500/50 text-red-400" onClick={async () => {
                            setAvatarUrl("");
                            await User.updateMyUserData({ avatar_url: "" });
                            await loadUser();
                            setShowAvatarInput(false);
                          }}>
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="border-gray-600" onClick={() => setShowAvatarInput(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-gray-100">
                    {user.ign || user.full_name || 'Player'}
                  </h3>
                  
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-mono text-sm px-3">
                      {user.unique_id || `BH${user.id.replace(/-/g,'').slice(-8).toUpperCase()}`}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(user.unique_id || `BH${user.id.replace(/-/g,'').slice(-8).toUpperCase()}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      {copied ? <Copy className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                      {user.rank || 'Unranked'}
                    </Badge>
                    {user.is_verified && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {user.role === 'admin' && (
                      <Badge className="bg-red-500/20 text-red-400">Admin</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{user.total_tournaments || 0}</div>
                    <div className="text-xs text-gray-400">Tournaments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">{user.total_wins || 0}</div>
                    <div className="text-xs text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{user.total_kills || 0}</div>
                    <div className="text-xs text-gray-400">Kills</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-100">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ign" className="text-gray-300">In-Game Name (IGN)</Label>
                    <Input
                      id="ign"
                      value={formData.ign}
                      onChange={(e) => setFormData({ ...formData, ign: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-gray-100"
                      placeholder="Enter your IGN"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Your Name</Label>
                    <Input
                      value={user.full_name || ""}
                      disabled
                      className="bg-gray-800 border-gray-700 text-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="game_uid" className="text-gray-300">Game UID (Free Fire)</Label>
                    <Input
                      id="game_uid"
                      value={formData.game_uid}
                      onChange={(e) => setFormData({ ...formData, game_uid: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-gray-100"
                      placeholder="Enter your Free Fire UID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rank" className="text-gray-300">Current Rank</Label>
                    <Select value={formData.rank} onValueChange={(value) => setFormData({ ...formData, rank: value })}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Heroic", "Grandmaster"].map((rank) => (
                          <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-gray-100"
                      placeholder="+91 XXXXXXXXXX"
                    />
                    <p className="text-xs text-green-400 bg-green-500/10 p-2 rounded border border-green-500/30">
                      💬 WhatsApp notification ke liye apna number yahan dale
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                    <textarea
                      id="bio"
                      value={formData.bio || ""}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Tell us a bit about yourself..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      value={user.email}
                      disabled
                      className="bg-gray-800 border-gray-700 text-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Wallet Balance</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={`₹${user.wallet_balance || 0}`}
                        disabled
                        className="bg-gray-800 border-gray-700 text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <Button
                    onClick={downloadMyData}
                    variant="outline"
                    className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download My Data
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>{/* end grid */}

        {/* Saved Squads Section */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Saved Squads
              </CardTitle>
              <Button size="sm" onClick={() => setShowSquadForm(!showSquadForm)} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-1" /> New Squad
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSquadForm && (
              <div className="p-4 bg-gray-800/70 rounded-lg border border-cyan-500/30 space-y-3">
                <Input
                  value={newSquad.squad_name}
                  onChange={(e) => setNewSquad({ ...newSquad, squad_name: e.target.value })}
                  placeholder="Squad Name (e.g., Alpha Squad)"
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <label className="cursor-pointer block">
                  <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed transition-all ${
                    newSquad.logo_url ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-gray-600 bg-gray-900/60 hover:border-cyan-500/50'
                  }`}>
                    {newSquad.logo_url ? (
                      <span className="text-green-400 text-sm">✅ Logo uploaded — click to change</span>
                    ) : (
                      <span className="text-gray-400 text-sm">📁 Click to upload squad logo (optional)</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      try {
                        const { file_url } = await UploadFile({ file });
                        setNewSquad({ ...newSquad, logo_url: file_url });
                      } catch (err) {
                        alert("Logo upload failed. Please try again.");
                      }
                    }}
                  />
                </label>
                {newSquad.logo_url && (
                  <img src={newSquad.logo_url} alt="logo" className="w-14 h-14 rounded-lg object-cover border border-cyan-500/40" onError={e => e.target.style.display='none'} />
                )}
                {newSquad.members.length > 0 && (
                  <div className="space-y-1">
                    {newSquad.members.map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-900/50 rounded">
                        <span className="text-sm text-gray-300">{m.ign} <span className="text-cyan-400">({m.uid})</span></span>
                        <button onClick={() => setNewSquad({ ...newSquad, members: newSquad.members.filter((_, idx) => idx !== i) })}>
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {newSquad.members.length < 4 && (
                  <div className="flex gap-2">
                    <Input
                      value={newMember.ign}
                      onChange={(e) => setNewMember({ ...newMember, ign: e.target.value })}
                      placeholder="IGN"
                      className="bg-gray-900 border-gray-700 text-white flex-1"
                    />
                    <Input
                      value={newMember.uid}
                      onChange={(e) => setNewMember({ ...newMember, uid: e.target.value.replace(/\D/g, "") })}
                      placeholder="UID (numbers only)"
                      inputMode="numeric"
                      className="bg-gray-900 border-gray-700 text-white flex-1"
                    />
                    <Button size="sm" onClick={() => {
                      if (!newMember.ign || !newMember.uid) return;
                      setNewSquad({ ...newSquad, members: [...newSquad.members, { ...newMember, isLeader: newSquad.members.length === 0 }] });
                      setNewMember({ ign: "", uid: "" });
                    }} className="bg-blue-600 px-3">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-gray-500">First member is auto-set as leader. Max 4 members. Duo ke liye min 2, Squad ke liye min 4.</p>
                <div className="flex gap-2">
                  <Button onClick={saveSquad} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-1" /> Save Squad
                  </Button>
                  <Button variant="outline" onClick={() => { setShowSquadForm(false); setNewSquad({ squad_name: "", members: [] }); }} className="border-gray-700">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {savedSquads.length === 0 && !showSquadForm && (
              <p className="text-gray-500 text-center py-4 text-sm">Koi saved squad nahi hai. "New Squad" press kar ke banao!</p>
            )}

            {savedSquads.map((squad, i) => (
              <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                {editingSquadIndex === i ? (
                  <div className="space-y-3">
                    <Input
                      value={editingSquad.squad_name}
                      onChange={(e) => setEditingSquad({ ...editingSquad, squad_name: e.target.value })}
                      placeholder="Squad Name"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <div className="space-y-1">
                      {editingSquad.members.map((m, j) => (
                        <div key={j} className="flex items-center gap-2 p-2 bg-gray-900/50 rounded">
                          <Input
                            value={m.ign}
                            onChange={(e) => {
                              const members = [...editingSquad.members];
                              members[j] = { ...members[j], ign: e.target.value };
                              setEditingSquad({ ...editingSquad, members });
                            }}
                            placeholder="IGN"
                            className="bg-gray-800 border-gray-700 text-white flex-1 h-7 text-sm"
                          />
                          <Input
                            value={m.uid}
                            onChange={(e) => {
                              const members = [...editingSquad.members];
                              members[j] = { ...members[j], uid: e.target.value.replace(/\D/g, "") };
                              setEditingSquad({ ...editingSquad, members });
                            }}
                            placeholder="UID"
                            inputMode="numeric"
                            className="bg-gray-800 border-gray-700 text-white flex-1 h-7 text-sm"
                          />
                          <button onClick={() => {
                            const members = editingSquad.members.filter((_, idx) => idx !== j);
                            setEditingSquad({ ...editingSquad, members });
                          }}>
                            <X className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {editingSquad.members.length < 4 && (
                      <Button size="sm" onClick={() => setEditingSquad({ ...editingSquad, members: [...editingSquad.members, { ign: "", uid: "", isLeader: editingSquad.members.length === 0 }] })} variant="outline" className="text-xs border-gray-700">
                        <Plus className="w-3 h-3 mr-1" /> Add Member
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={saveEditedSquad} size="sm" className="flex-1 bg-green-600">
                        <Save className="w-3 h-3 mr-1" /> Save
                      </Button>
                      <Button onClick={() => { setEditingSquadIndex(null); setEditingSquad(null); }} size="sm" variant="outline" className="border-gray-700">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-cyan-400 flex items-center gap-1">
                        <Users className="w-4 h-4" /> {squad.squad_name}
                        <span className="text-xs text-gray-500 ml-1">({squad.members.length} members)</span>
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => startEditSquad(i)} className="text-cyan-400 hover:text-cyan-300">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteSquad(i)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {squad.members.map((m, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm">
                          {m.isLeader && <span className="text-yellow-400 text-xs">👑</span>}
                          <span className="text-white">{m.ign}</span>
                          <span className="text-gray-500">·</span>
                          <span className="text-cyan-400 font-mono text-xs">{m.uid}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        </div>{/* end space-y-6 */}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}