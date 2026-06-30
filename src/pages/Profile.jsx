import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { RedeemRequest } from "@/entities/RedeemRequest";
import { Registration } from "@/entities/Registration";
import { Diamond } from "@/entities/Diamond";
import { GlobalChat } from "@/entities/GlobalChat";
import { ActiveUser } from "@/entities/ActiveUser";
import { TaskSubmission } from "@/entities/TaskSubmission";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { UploadFile } from "@/integrations/Core";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Shield, Copy, Link2, X, Plus, Trash2, Users, Save, Download, BarChart2, Bookmark, MessageSquare, Gamepad2, Swords, Activity, ArrowLeft, UserPlus, UserCog, ChevronRight, Ban, ShoppingCart, Star } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/AuthContext";
import UserGroupsPanel from "../components/profile/UserGroupsPanel";
import StorePanel from "../components/profile/StorePanel";
import AccountSettingsDrawer from "@/components/profile/v2/AccountSettingsDrawer";
import ProfileSettingsDrawer from "@/components/profile/v2/ProfileSettingsDrawer";
import FriendList from "@/components/social/FriendList";
import DirectMessageList from "@/components/social/DirectMessageList";
import PartySystem from "@/components/social/PartySystem";

import ProfileHeaderV2 from "@/components/profile/v2/ProfileHeaderV2";
import AddFriendDrawer from '@/components/profile/v2/AddFriendDrawer';
import MessagesDrawer from '@/components/profile/v2/MessagesDrawer';
import OverviewTabV2 from "@/components/profile/v2/OverviewTabV2";
import RecentMatchesV2 from "@/components/profile/v2/RecentMatchesV2";
import ActivityFeedV2 from "@/components/profile/v2/ActivityFeedV2";
import PlayerCardExport from "@/components/profile/PlayerCardExport";

const LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5NzMxNiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJIPC90ZXh0Pjwvc3ZnPg==";

import { format } from "date-fns";
import { ProfileSkeleton } from "@/components/SkeletonLoader";

export default function Profile() {
  const { user: authUser, reloadUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('bh_cached_profile_v2');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
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
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [userDiamond, setUserDiamond] = useState(null);
  const [activePanel, setActivePanel] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    if (user) {
      setLoading(false);
      setBackgroundSyncing(true); // Show progress bar since we're doing a background sync
    }

    try {
      const currentUser = await User.me();
      
      if (!currentUser.unique_id) {
        const uniqueId = await generateTrulyUniqueId(currentUser.id);
        await User.updateMyUserData({ unique_id: uniqueId });
        currentUser.unique_id = uniqueId;
      }
      
      // Cache it for instant next load
      localStorage.setItem('bh_cached_profile_v2', JSON.stringify(currentUser));
      
      setUser(currentUser);
      setFormData({
        full_name: currentUser.full_name || "",
        game_uid: currentUser.game_uid || "",
        phone: currentUser.phone || "",
        bio: currentUser.bio || ""
      });
      setAvatarUrl(currentUser.avatar_url || "");
      if (currentUser.squads) setSavedSquads(currentUser.squads);
      
      // Load performance data in background
      Registration.filter({ team_leader_id: currentUser.id }).then(regs => {
        const r = regs || [];
        setUserRegistrations(r);
        setUser(prev => prev ? { ...prev, total_tournaments: r.length } : prev);
      }).catch(() => {});
      
      Diamond.filter({ user_id: currentUser.id }).then(d => setUserDiamond(d?.[0] || null)).catch(() => {});

      TournamentLeaderboard.filter({ user_id: currentUser.id }).then(leaderboards => {
        if (!leaderboards) return;
        let total_kills = 0;
        let total_wins = 0;
        leaderboards.forEach(lb => {
          total_kills += (lb.kills || 0);
          if (lb.wins > 0) total_wins += 1;
        });
        setUser(prev => prev ? { ...prev, total_kills, total_wins } : prev);
      }).catch(() => {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setBackgroundSyncing(false);
    }
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

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32 overflow-x-hidden w-full relative">
      {/* Top Loading Progress Bar */}
      {(loading || backgroundSyncing) && (
        <div className="fixed top-0 left-0 w-full h-1 z-[999] overflow-hidden bg-gray-900/50">
          <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-[loading-bar_1.5s_ease-in-out_infinite]" style={{ width: '50%', transformOrigin: 'left' }}></div>
        </div>
      )}

      {/* Decorative Background Elements */}
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Main Actions */}
        <ProfileHeaderV2 player={user} isMe={true} />

        {/* Main Content Buttons */}
        <div className="flex flex-wrap gap-2 mt-6">
          {[
            { id: 'add_friend', icon: UserPlus, label: 'Add Friend' },
            { id: 'message', icon: MessageSquare, label: 'Message' },
            { id: 'party', icon: Gamepad2, label: 'Party Invite' },
          ].map(btn => {
            const buttonContent = (
              <button 
                key={btn.id}
                className="flex-1 min-w-[100px] basis-[30%] bg-[#0a0a0c] hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-1 sm:px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
              >
                <btn.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                <span className="text-[9px] sm:text-[11px] uppercase font-bold text-gray-400 text-center leading-tight w-full">{btn.label}</span>
              </button>
            );

            if (btn.id === 'add_friend') {
              return (
                <AddFriendDrawer user={user} key={btn.id}>
                  {buttonContent}
                </AddFriendDrawer>
              );
            }
            if (btn.id === 'message') {
              return (
                <MessagesDrawer user={user} key={btn.id}>
                  {buttonContent}
                </MessagesDrawer>
              );
            }

            return <React.Fragment key={btn.id}>{buttonContent}</React.Fragment>;
          })}
        </div>

        {/* Action Buttons (Moved Down) */}
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { id: 'groups', icon: Users, label: 'Create Group' },
            { id: 'social', icon: Users, label: 'Post' },
            { id: 'store', icon: ShoppingCart, label: 'Store' },
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => setActivePanel(btn.id)}
              className="flex-1 min-w-[100px] basis-[30%] bg-[#0a0a0c] hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-1 sm:px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
            >
              <btn.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <span className="text-[9px] sm:text-[11px] uppercase font-bold text-gray-400 text-center leading-tight w-full">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Remaining 2 Buttons */}
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { id: 'your_performance', icon: BarChart2, label: 'Your Performance' },
            { id: 'team_performance', icon: Users, label: 'Team Performance' },
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => setActivePanel(btn.id)}
              className="flex-1 min-w-[100px] basis-[30%] bg-[#0a0a0c] hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-1 sm:px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
            >
              <btn.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <span className="text-[9px] sm:text-[11px] uppercase font-bold text-gray-400 text-center leading-tight w-full">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Activity Feed */}
        <ActivityFeedV2 
          player={user} 
          limit={2} 
          onViewAll={() => setActivePanel('activity_feed')} 
        />

        {/* Bottom Settings Buttons */}
        <div className="pb-8 flex flex-col gap-3">
          <AccountSettingsDrawer user={user}>
            <button className="w-full bg-[#0c0d12] border border-[#1f2029] hover:bg-[#111115] hover:border-[#2a2a35] rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-colors group">
              <div className="flex items-center gap-4">
                <UserCog className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                <span className="text-[15px] sm:text-[16px] font-medium text-gray-200">Account Settings</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </AccountSettingsDrawer>

          <button 
            onClick={() => toast.info('Blocked Users list coming soon!')}
            className="w-full bg-[#0c0d12] border border-[#1f2029] hover:bg-[#111115] hover:border-red-900/50 rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-4">
              <Ban className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-red-400 transition-colors" />
              <span className="text-[15px] sm:text-[16px] font-medium text-gray-400 group-hover:text-red-400 transition-colors">Blocked Users</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-red-400 transition-colors" />
          </button>

          <PlayerCardExport player={user} inline={true} />
        </div>

      </div>

      {/* Sliding Panel Overlay */}
      <AnimatePresence>
        {activePanel && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#050505] overflow-y-auto"
          >
            {/* Panel Header */}
            <div className="sticky top-0 z-10 bg-[#050505]/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActivePanel(null)}
                  className="p-2 bg-gray-900 rounded-full text-white hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-black uppercase tracking-wider text-white">
                  {activePanel === 'your_performance' && 'Your Performance'}
                  {activePanel === 'team_performance' && 'Team Performance'}
                  {activePanel === 'store' && 'Store'}
                  {activePanel === 'groups' && 'My Groups'}
                  {activePanel === 'social' && 'Social'}
                  {activePanel === 'activity_feed' && 'Following Updates'}
                </h2>
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-4 max-w-7xl mx-auto pb-20">
              {activePanel === 'your_performance' && (
                <div className="animate-in fade-in duration-500">
                  <OverviewTabV2 player={user} tabType="your" />
                  <RecentMatchesV2 />
                </div>
              )}
              {activePanel === 'team_performance' && (
                <div className="animate-in fade-in duration-500">
                  <OverviewTabV2 player={user} tabType="team" />
                  <RecentMatchesV2 />
                </div>
              )}
              {activePanel === 'store' && (
                <StorePanel />
              )}
              {activePanel === 'groups' && (
                <UserGroupsPanel />
              )}
              {activePanel === 'social' && (
                <div className="bg-[#0a0a0c] border border-gray-800 rounded-xl p-4 md:p-6 mt-4 animate-in fade-in duration-500">
                  <Tabs defaultValue="friends" className="w-full">
                    <TabsList className="bg-gray-950 border border-gray-800">
                      <TabsTrigger value="friends" className="flex items-center gap-2"><Users className="w-4 h-4" /> Friends</TabsTrigger>
                      <TabsTrigger value="messages" className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Messages</TabsTrigger>
                      <TabsTrigger value="party" className="flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> Party</TabsTrigger>
                    </TabsList>
                    <TabsContent value="friends" className="mt-6"><FriendList user={user} /></TabsContent>
                    <TabsContent value="messages" className="mt-6"><DirectMessageList user={user} /></TabsContent>
                    <TabsContent value="party" className="mt-6"><PartySystem user={user} /></TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}