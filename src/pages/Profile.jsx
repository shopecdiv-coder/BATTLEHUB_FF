import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Shield, Copy, Link2, X, Plus, Trash2, Users, Save, Download, BarChart2, Bookmark, MessageSquare, Gamepad2, Swords, Activity, ArrowLeft, UserPlus, UserCog, ChevronRight, Ban, ShoppingCart, Star, Search, MoreVertical, Video } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/AuthContext";
import UserGroupsPanel from "../components/profile/UserGroupsPanel";
import StoreDrawer from "../components/profile/StoreDrawer";
import CreatorStudioPanel from "@/components/profile/v2/CreatorStudioPanel";
import AccountSettingsDrawer from "@/components/profile/v2/AccountSettingsDrawer";
import ProfileSettingsDrawer from "@/components/profile/v2/ProfileSettingsDrawer";
import BlockedUsersDrawer from "@/components/profile/v2/BlockedUsersDrawer";
import FriendList from "@/components/social/FriendList";
import DirectMessageList from "@/components/social/DirectMessageList";
import PartySystem from "@/components/social/PartySystem";

import ProfileHeaderV2 from "@/components/profile/v2/ProfileHeaderV2";
import SquadsDrawer from '@/components/profile/v2/SquadsDrawer';
import FindTeammatesDrawer from '@/components/profile/v2/FindTeammatesDrawer';
import PartyInviteDrawer from '@/components/profile/v2/PartyInviteDrawer';
import TeamPerformanceReport from '@/components/profile/v2/TeamPerformanceReport';
import PerformanceReport from "@/components/profile/v2/PerformanceReport";
import ActivityFeedV2 from "@/components/profile/v2/ActivityFeedV2";
import PlayerCardExport from "@/components/profile/PlayerCardExport";
import AddFriendDrawer from "@/components/profile/v2/AddFriendDrawer";

const LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5NzMxNiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJIPC90ZXh0Pjwvc3ZnPg==";

import { format } from "date-fns";
import { ProfileSkeleton } from "@/components/SkeletonLoader";
import { db } from "@/api/firebaseClient";
import { collection, query, where, onSnapshot } from "firebase/firestore";

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
  const [profileUnread, setProfileUnread] = useState(0);
  const [partyUnread, setPartyUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const [requestsUnread, setRequestsUnread] = useState(0);
  const [friends, setFriends] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showAvatarInput, setShowAvatarInput] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [userDiamond, setUserDiamond] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activePanel = searchParams.get('panel');
  const location = useLocation();

  const setActivePanel = (panelName) => {
    if (!panelName && location.state?.returnTo) {
      navigate(location.state.returnTo);
      return;
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (panelName) {
        next.set('panel', panelName);
      } else {
        next.delete('panel');
        next.delete('chatId');
        next.delete('drawer');
      }
      return next;
    }, { replace: false });
  };

  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [isGroupSearchVisible, setIsGroupSearchVisible] = useState(false);
  const [activeParty, setActiveParty] = useState(null);
  const [hasGroups, setHasGroups] = useState(false);

  useEffect(() => {
    if (!authUser?.id) return;
    const q = query(
      collection(db, 'user_groups'),
      where('members', 'array-contains', authUser.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      setHasGroups(!snap.empty);
    });
    return () => unsub();
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id) return;
    const q = query(
      collection(db, 'parties'),
      where('members', 'array-contains', authUser.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveParty({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setActiveParty(null);
      }
    });
    return () => unsub();
  }, [authUser?.id]);

  useEffect(() => {
    const handleProfileUnread = (e) => {
      if (e && e.detail) {
        setProfileUnread(e.detail.direct !== undefined ? e.detail.direct : e.detail.total);
        setPartyUnread(e.detail.party || 0);
        setGroupUnread(e.detail.group || 0);
        setRequestsUnread(e.detail.requests || 0);
      } else {
        setProfileUnread(parseInt(localStorage.getItem('directProfileUnread') || localStorage.getItem('totalProfileUnread') || '0'));
        setPartyUnread(parseInt(localStorage.getItem('partyProfileUnread') || '0'));
        setGroupUnread(parseInt(localStorage.getItem('groupProfileUnread') || '0'));
        setRequestsUnread(parseInt(localStorage.getItem('requestsProfileUnread') || '0'));
      }
    };
    handleProfileUnread();
    window.addEventListener('profileUnreadUpdated', handleProfileUnread);
    return () => window.removeEventListener('profileUnreadUpdated', handleProfileUnread);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleOpenGroups = () => {
      setActivePanel('groups');
    };
    window.addEventListener('open-groups-panel', handleOpenGroups);
    return () => window.removeEventListener('open-groups-panel', handleOpenGroups);
  }, []);

  // Prevent background scrolling when a full-screen panel is open
  useEffect(() => {
    if (activePanel) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activePanel]);


  useEffect(() => {
    loadUser();
  }, []);



  const loadUser = async () => {
    if (user) {
      setLoading(false);
      setBackgroundSyncing(true); // Show progress bar since we're doing a background sync
    }

    try {
      const currentUser = await User.me();
      

      
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
      setAvatarUrl(currentUser.avatar_url || "");
      
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

  const stats = {
    matches: user?.matches_played || 0,
    wins: user?.wins || 0,
    kills: user?.kills || 0,
    kd: user?.kd_ratio || 0,
    winRate: user?.matches_played ? ((user?.wins || 0) / user?.matches_played * 100).toFixed(1) : 0,
    mvp: user?.mvp_count || 0,
    tournaments: userRegistrations.length || 0
  };

  if (activePanel === 'your_performance' || activePanel === 'team_performance') {
    return createPortal(
      <AnimatePresence>
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="fixed inset-0 z-[9999] bg-slate-950 text-white overflow-y-auto pb-32 flex flex-col"
        >
          {/* Sticky Header with Back Button */}
          <div className="sticky top-0 z-[10000] bg-slate-950/98 backdrop-blur-xl px-4 py-3 border-b border-gray-800 flex items-center justify-between shadow-2xl shrink-0">
            <button
              onClick={() => {
                setActivePanel(null);
                navigate('/Leaderboard', { replace: true });
              }}
              className="w-10 h-10 rounded-full bg-gray-900 border border-orange-500/60 text-orange-400 flex items-center justify-center transition-all hover:bg-orange-500/20 active:scale-95 shadow-md cursor-pointer shrink-0"
              title="Back to Leaderboard"
            >
              <ArrowLeft className="w-5 h-5 text-orange-500" />
            </button>
            <h1 className="text-sm sm:text-base font-black uppercase text-white tracking-wider truncate ml-3">
              {activePanel === 'your_performance' ? 'Your Performance' : 'Team Performance'}
            </h1>
          </div>

          <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {/* Header Card Skeleton */}
                <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 sm:p-6 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-800 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-40 bg-gray-800 rounded-lg" />
                    <div className="h-3 w-24 bg-gray-800 rounded-md" />
                    <div className="flex gap-2 pt-1">
                      <div className="h-6 w-16 bg-gray-800 rounded-full" />
                      <div className="h-6 w-16 bg-gray-800 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Grid Stats Skeleton */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-2">
                      <div className="h-3 w-16 bg-gray-800 rounded" />
                      <div className="h-7 w-20 bg-gray-800 rounded-lg" />
                    </div>
                  ))}
                </div>

                {/* Team Members / Match History Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-800 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-4 w-28 bg-gray-800 rounded" />
                          <div className="h-3 w-20 bg-gray-800 rounded" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="h-10 bg-gray-800 rounded-lg" />
                        <div className="h-10 bg-gray-800 rounded-lg" />
                        <div className="h-10 bg-gray-800 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activePanel === 'your_performance' ? (
              <PerformanceReport player={user} stats={stats} userRegistrations={userRegistrations} />
            ) : (
              <TeamPerformanceReport player={user} />
            )}
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen-safe bg-slate-950 text-white pb-32 pb-safe overflow-x-hidden w-full relative">
      {/* Top Loading Progress Bar */}
      {(loading || backgroundSyncing) && (
        <div className="fixed top-0 left-0 w-full h-1 z-[999] overflow-hidden bg-gray-900/50">
          <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-[loading-bar_1.5s_ease-in-out_infinite]" style={{ width: '50%', transformOrigin: 'left' }}></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
      {/* Header & Main Actions */}
      <ProfileHeaderV2 player={user} isMe={true} unreadMessages={profileUnread} requestsUnread={requestsUnread} groupUnread={groupUnread} />

        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 mt-6 px-1 sm:px-0">
          {[
            { id: 'squads', icon: Users, label: 'Your Team' },
            { id: 'find_teammates', icon: Search, label: 'Find Teammates' },
            { id: 'party', icon: Gamepad2, label: activeParty ? `${activeParty.name} PARTY` : 'CREATE PARTY' },
          ].map(btn => {
            const buttonContent = (
              <button 
                key={btn.id}
                className="relative w-full h-full bg-slate-950 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-1 sm:px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
              >
                <div className="relative">
                  <btn.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  {btn.id === 'squads' && requestsUnread > 0 && (
                    <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)] z-10">
                      {requestsUnread > 99 ? '99+' : requestsUnread}
                    </span>
                  )}
                  {btn.id === 'party' && partyUnread > 0 && (
                    <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)] z-10">
                      {partyUnread > 99 ? '99+' : partyUnread}
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[11px] uppercase font-bold text-gray-400 text-center leading-tight w-full">{btn.label}</span>
              </button>
            );

            if (btn.id === 'squads') {
              return (
                <SquadsDrawer user={user} key={btn.id}>
                  {buttonContent}
                </SquadsDrawer>
              );
            }
            if (btn.id === 'find_teammates') {
              return (
                <FindTeammatesDrawer user={user} key={btn.id}>
                  {buttonContent}
                </FindTeammatesDrawer>
              );
            }
            if (btn.id === 'party') {
              return (
                <div 
                  key={btn.id} 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-party-drawer'))}
                  className="cursor-pointer w-full h-full"
                >
                  {buttonContent}
                </div>
              );
            }

            return <React.Fragment key={btn.id}>{buttonContent}</React.Fragment>;
          })}
        </div>

        {/* Action Buttons (Moved Down) */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 mt-2 px-1 sm:px-0">
          {[
            { id: 'add_friend', icon: UserPlus, label: 'Add Friend' },
            { id: 'creator_studio', icon: Video, label: 'Post' },
            { id: 'store', icon: ShoppingCart, label: 'Store' },
          ].map(btn => {
            const buttonContent = (
              <button 
                key={btn.id}
                onClick={() => {
                  if (btn.id !== 'add_friend') setActivePanel(btn.id);
                }}
                className="w-full h-full bg-slate-950 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-1 sm:px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
              >
                <div className="relative">
                  <btn.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  {btn.id === 'add_friend' && requestsUnread > 0 && (
                    <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)] z-10">
                      {requestsUnread > 99 ? '99+' : requestsUnread}
                    </span>
                  )}
                </div>
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

            return <React.Fragment key={btn.id}>{buttonContent}</React.Fragment>;
          })}
        </div>

        {/* Remaining 2 Buttons */}
        <div className="flex flex-wrap gap-2 mt-2 px-1 sm:px-0">
          {[
            { id: 'your_performance', icon: BarChart2, label: 'Your Performance' },
            { id: 'team_performance', icon: Users, label: 'Team Performance' },
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => setActivePanel(btn.id)}
              className="flex-1 min-w-[100px] basis-[30%] bg-slate-950 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-1 sm:px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
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
        <div className="pb-8 pb-safe flex flex-col gap-3 px-1 sm:px-0">
          <AccountSettingsDrawer user={user}>
            <button className="w-full bg-[#0c0d12] border border-slate-800 hover:bg-slate-900 hover:border-slate-700 rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-colors group">
              <div className="flex items-center gap-4">
                <UserCog className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                <span className="text-[15px] sm:text-[16px] font-medium text-gray-200">Account Settings</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </AccountSettingsDrawer>

          <BlockedUsersDrawer user={user}>
            <button className="w-full bg-[#0c0d12] border border-slate-800 hover:bg-slate-900 hover:border-red-900/50 rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-colors group">
              <div className="flex items-center gap-4">
                <Ban className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-red-400 transition-colors" />
                <span className="text-[15px] sm:text-[16px] font-medium text-gray-400 group-hover:text-red-400 transition-colors">Blocked Users</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-red-400 transition-colors" />
            </button>
          </BlockedUsersDrawer>

          <div className="flex justify-center w-full mt-2">
            <PlayerCardExport player={user} inline={true} isMe={true} />
          </div>
        </div>

      </div>

      {/* Sliding Panel Overlay */}
      {createPortal(
        <AnimatePresence>
          {activePanel && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`fixed inset-0 ${['creator_studio', 'your_performance', 'team_performance'].includes(activePanel) ? 'z-[999] h-[100dvh] top-0' : 'z-[40] top-16 h-[calc(100dvh-4rem)]'} bg-slate-950 overflow-y-auto`}
            >
              {activePanel === 'creator_studio' ? (
                <CreatorStudioPanel user={user} onClose={() => setActivePanel(null)} />
              ) : (
                <>
                  {/* Panel Header */}
                  <div className="flex items-center justify-between sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 px-4 py-3 border-b border-gray-800">
                {activePanel === 'groups' && isGroupSearchVisible ? (
                  <div className="flex items-center w-full gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input 
                        autoFocus
                        value={groupSearchQuery}
                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                        placeholder="Search groups..."
                        className="w-full bg-slate-900 border-gray-800 pl-9 pr-8 h-10 rounded-full text-sm text-white focus:border-[#00FFFF]/50"
                      />
                      {groupSearchQuery && (
                        <button onClick={() => setGroupSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Button variant="ghost" onClick={() => { setIsGroupSearchVisible(false); setGroupSearchQuery(""); }} className="text-gray-400 hover:text-white px-2">Cancel</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          if (searchParams.get('from') === 'leaderboard' || searchParams.get('panel')) {
                            navigate('/Leaderboard');
                          } else {
                            setActivePanel(null);
                          }
                        }}
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
                    
                    {activePanel === 'activity_feed' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-400 hover:text-white uppercase text-xs tracking-wider"
                        onClick={() => window.dispatchEvent(new CustomEvent('clearActivityFeed'))}
                      >
                        Clear All
                      </Button>
                    )}

                    {activePanel === 'groups' && (
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors relative z-[300]" 
                          onClick={(e) => { e.stopPropagation(); setIsGroupSearchVisible(true); }}
                        >
                          <Search className="w-5 h-5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors relative z-[300]" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                              <MoreVertical className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[500] w-56 bg-slate-900 border-gray-800 rounded-xl p-2 shadow-2xl">
                            <DropdownMenuItem 
                              onClick={() => window.dispatchEvent(new CustomEvent('openJoinGroup'))}
                              className="flex items-center gap-3 cursor-pointer rounded-lg text-gray-200 hover:text-white hover:bg-slate-800 py-2.5 px-3 mb-1 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700">
                                <UserPlus className="w-4 h-4 text-[#00FFFF]" /> 
                              </div>
                              <span className="font-medium">Join Group</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => window.dispatchEvent(new CustomEvent('openCreateGroup'))}
                              className="flex items-center gap-3 cursor-pointer rounded-lg text-slate-950 bg-white hover:bg-gray-200 py-2.5 px-3 transition-colors shadow-sm"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-200/80 flex items-center justify-center">
                                <Plus className="w-4 h-4 text-slate-900" />
                              </div>
                              <span className="font-bold">Create Group</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Panel Content */}
              <div className="p-4 max-w-7xl mx-auto pb-20">
                {activePanel === 'your_performance' && (
                  <div className="animate-in fade-in duration-500">
                    <PerformanceReport player={user} stats={stats} userRegistrations={userRegistrations} />
                  </div>
                )}
                {activePanel === 'team_performance' && (
                  <div className="animate-in fade-in duration-500">
                    <TeamPerformanceReport player={user} />
                  </div>
                )}
                {activePanel === 'groups' && (
                  <UserGroupsPanel searchQuery={groupSearchQuery} />
                )}
                {activePanel === 'social' && (
                  <div className="bg-slate-950 border border-gray-800 rounded-xl p-4 md:p-6 mt-4 animate-in fade-in duration-500">
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
                    {activePanel === 'activity_feed' && (
                      <div className="animate-in fade-in duration-500">
                        <ActivityFeedV2 player={user} hideHeader={true} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {/* Store Drawer (Overlays Everything) */}
      <StoreDrawer isOpen={activePanel === 'store'} onClose={() => setActivePanel(null)} />

    </div>
  );
}