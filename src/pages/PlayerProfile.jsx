import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { User, TournamentLeaderboard, Friendship, Follower, Registration, Notification } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Trophy, Swords, Settings, Activity, ArrowLeft, UserPlus, MessageSquare, Gamepad2, Users, ShoppingCart, Star, MoreVertical, Plus, Video } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';

// V2 Components
import ProfileHeaderV2 from "@/components/profile/v2/ProfileHeaderV2";
import PerformanceReport from "@/components/profile/v2/PerformanceReport";
import OverviewTabV2 from "@/components/profile/v2/OverviewTabV2";
import TeamPerformanceReport from "@/components/profile/v2/TeamPerformanceReport";
import RecentMatchesV2 from "@/components/profile/v2/RecentMatchesV2";
import ActivityFeedV2 from "@/components/profile/v2/ActivityFeedV2";
import MessagesDrawer from "@/components/profile/v2/MessagesDrawer";
import PartyInviteDrawer from "@/components/profile/v2/PartyInviteDrawer";
import PlayerCardExport from "@/components/profile/PlayerCardExport";
import UserGroupsPanel from "@/components/profile/UserGroupsPanel";
import StoreDrawer from "@/components/profile/StoreDrawer";
import CreatorStudioPanel from "@/components/profile/v2/CreatorStudioPanel";

export default function PlayerProfile({ inlineUid, isDrawer, onClose }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const scrollContainerRef = useRef(null);

  const playerUID = inlineUid || searchParams.get("uid") || searchParams.get("ign") || currentUser?.id || "player";
  const urlIgn = searchParams.get("ign") || (currentUser?.id === playerUID ? (currentUser?.ign || currentUser?.full_name) : "Player");
  const isMe = currentUser && (currentUser.id === playerUID || currentUser.ff_uid === playerUID);

  const [player, setPlayer] = useState(() => ({
    id: playerUID,
    ign: urlIgn,
    full_name: urlIgn,
    avatar_url: currentUser?.id === playerUID ? (currentUser?.avatar_url || "") : ""
  }));
  const [stats, setStats] = useState({ matches: 0, wins: 0, kills: 0, kd: 0, winRate: 0, mvp: 0 });
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanelState] = useState(() => searchParams.get("panel") || null);
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [receivedRelId, setReceivedRelId] = useState(null);

  useEffect(() => {
    const p = searchParams.get("panel");
    if (p) setActivePanelState(p);
  }, [searchParams]);

  const setActivePanel = (panelName) => {
    if (!panelName) {
      if (searchParams.get('from') === 'leaderboard' || searchParams.get('panel')) {
        navigate('/Leaderboard');
        return;
      }
    }
    setActivePanelState(panelName);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadProfile = async () => {
      setIsDataLoading(true);
      try {
        const initialPlayer = await User.get(playerUID).catch(() => null);
        const activeUserObj = initialPlayer || {
          id: playerUID,
          ign: urlIgn,
          full_name: urlIgn,
          avatar_url: ""
        };

        if (isMounted) setPlayer(activeUserObj);

        let allLB = [];
        try {
          allLB = await TournamentLeaderboard.filter({ user_id: playerUID }).catch(() => []);
        } catch (e) {
          allLB = [];
        }

        let totalWins = 0;
        let totalKills = 0;
        let totalMatches = 0;
        let totalMvp = 0;

        (allLB || []).forEach(entry => {
          totalWins += (entry.wins || 0);
          totalKills += (entry.kills || 0);
          totalMatches += (entry.matches_played || 1);
          totalMvp += (entry.mvp_count || 0);
        });

        const calcKd = totalMatches > 0 ? (totalKills / totalMatches).toFixed(2) : (totalKills || 0);
        const calcWinRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : 0;

        if (isMounted) {
          setStats({
            matches: totalMatches,
            wins: totalWins,
            kills: totalKills,
            kd: parseFloat(calcKd),
            winRate: parseFloat(calcWinRate),
            mvp: totalMvp
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        if (isMounted) setIsDataLoading(false);
      }
    };

    loadProfile();
    return () => { isMounted = false; };
  }, [playerUID, urlIgn]);

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
              setActivePanelState(null);
              navigate('/Leaderboard', { replace: true });
            }}
            className="w-10 h-10 rounded-full bg-gray-900 border border-orange-500/60 text-orange-400 flex items-center justify-center transition-all hover:bg-orange-500/20 active:scale-95 shadow-md cursor-pointer shrink-0"
            title="Back to Leaderboard"
          >
            <ArrowLeft className="w-5 h-5 text-orange-500" />
          </button>
            <h1 className="text-sm sm:text-base font-black uppercase text-white tracking-wider truncate ml-3">
              {activePanel === 'your_performance' 
                ? (isMe ? 'Your Performance' : `${player?.ign || urlIgn || 'Player'} Performance`) 
                : `${player?.ign || urlIgn || 'Team'} Performance`}
            </h1>
          </div>

          <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4">
            {isDataLoading ? (
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
              <PerformanceReport player={player} stats={stats} />
            ) : (
              <TeamPerformanceReport player={player} />
            )}
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }

  if (loading) {
    return (
      <div className={`${isDrawer ? 'h-full overflow-y-auto pb-10' : 'min-h-screen pb-20'} bg-slate-950 text-white p-2 sm:p-4 md:p-8 relative`}>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-8 w-20 bg-slate-900 rounded-xl animate-pulse mb-4" />
          <div className="h-[200px] w-full bg-slate-900 rounded-2xl animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="h-[80px] flex-1 bg-slate-900 rounded-xl animate-pulse" />)}
          </div>
          <div className="flex gap-2 mt-2">
            {[1, 2].map(i => <div key={i} className="h-[80px] flex-1 bg-slate-900 rounded-xl animate-pulse" />)}
          </div>
          <div className="h-[400px] w-full bg-slate-900 rounded-2xl animate-pulse mt-4" />
        </div>
      </div>
    );
  }
  if (!player) return <div className="min-h-screen bg-slate-950 text-white p-20 text-center">Player not found</div>;

  const handleAddFriend = async () => {
    if (!currentUser || isMe) return;
    // If we received a request from this player, accept it
    if (friendshipStatus === 'received' && receivedRelId) {
      try {
        await Friendship.update(receivedRelId, { status: 'accepted' });
        toast.success("Friend request accepted!");
        setFriendshipStatus('friends');
      } catch (e) {
        toast.error("Error accepting request");
      }
      return;
    }
    if (friendshipStatus !== 'none') return;
    try {
      await Friendship.create({
        user_id: currentUser.id,
        friend_id: playerUID,
        status: 'pending'
      });
      
      await Notification.create({
        recipient_id: playerUID,
        type: "Friend Request",
        title: "🤝 New Friend Request",
        message: `${currentUser.ign || currentUser.username || 'Someone'} sent you a friend request!`,
        link: `/profile?uid=${currentUser.id}`,
        priority: "High",
        dismissable: true,
        created_at: new Date().toISOString()
      }).catch(err => console.error("Notification error:", err));

      toast.success("Friend request sent!");
      setFriendshipStatus('pending');
    } catch (e) {
      toast.error("Error sending request");
    }
  };

  return (
    <div 
      ref={scrollContainerRef}
      id="profile-page-container" 
      className={`${isDrawer ? 'h-full overflow-y-auto pb-10' : 'min-h-screen pb-20'} bg-slate-950 text-white p-2 sm:p-4 md:p-8 relative`}
    >
      <div className="max-w-7xl mx-auto">

        {/* Back / Close button row */}
        <div className="flex items-center justify-between mb-3 relative z-50">
          <button
            onClick={() => {
              if (searchParams.get('from') === 'leaderboard' || searchParams.get('panel')) {
                navigate('/Leaderboard');
              } else if (isDrawer) {
                onClose();
              } else {
                navigate('/Leaderboard');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-[#0ea5e9]/10 border border-slate-700 hover:border-[#0ea5e9]/50 text-gray-400 hover:text-[#0ea5e9] rounded-xl transition-all duration-200 text-sm font-bold uppercase tracking-wider group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
          
          {isMe && (
             <div className="bg-orange-600/10 border border-orange-600/20 px-3 py-1.5 rounded-lg">
                <span className="text-sm font-bold text-orange-500 tracking-wider uppercase">Your Channel</span>
             </div>
          )}
        </div>
        
        {/* Profile Info Header */}
        <ProfileHeaderV2 player={player} isMe={isMe} isFriend={friendshipStatus === 'friends'} />

        {/* Action Buttons (Moved Down) */}
        {isMe && (
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { id: 'groups', icon: Users, label: 'Create Group' },
              { id: 'creator_studio', icon: Video, label: 'Post' },
              { id: 'store', icon: ShoppingCart, label: 'Store' },
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
        )}

        {/* Remaining 2 Buttons */}
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { id: 'your_performance', icon: BarChart, label: isMe ? 'Your Performance' : `${player?.ign?.split(' ')[0] || 'Player'} Performance` },
            { id: 'team_performance', icon: Users, label: isMe ? 'Team Performance' : `${player?.ign?.split(' ')[0] || 'Player'} Team` },
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
        {isMe && (
          <ActivityFeedV2 
            player={player} 
            limit={2} 
            onViewAll={() => setActivePanel('activity_feed')} 
          />
        )}
        
        {/* Export Card at Bottom */}
        <div className="mt-4 flex justify-center w-full pb-20">
          <PlayerCardExport 
            player={player} 
            stats={stats} 
            inline={true} 
            isMe={isMe}
            isFriend={friendshipStatus === 'friends'}
            scrollContainerRef={isDrawer ? scrollContainerRef : undefined} 
          />
        </div>

      </div>

        {/* Sliding Panel Overlay */}
        {createPortal(
          <AnimatePresence>
            {/* Overlays */}
            <StoreDrawer isOpen={activePanel === 'store'} onClose={() => setActivePanel(null)} />
      
            {activePanel && activePanel !== 'store' && (
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[200] bg-slate-950 overflow-y-auto"
              >
              
              {activePanel === 'creator_studio' ? (
                <CreatorStudioPanel user={currentUser} onClose={() => setActivePanel(null)} />
              ) : (
                <>
                  {/* Panel Header */}
                  <div className="sticky top-0 z-10 bg-slate-950 border-b border-gray-800 px-4 py-4 flex items-center justify-between">
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
                      
                      {activePanel === 'groups' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
                              <MoreVertical className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[250] w-56 bg-slate-900 border-gray-800 rounded-xl p-2 shadow-2xl">
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
                      )}
                    </div>
      
                  {/* Panel Content */}
                  <div className="p-4 max-w-7xl mx-auto pb-20">
                    {activePanel === 'your_performance' && (
                      <div className="animate-in fade-in duration-500">
                        <PerformanceReport player={player} stats={stats} />
                      </div>
                    )}
                    {activePanel === 'team_performance' && (
                      <div className="animate-in fade-in duration-500">
                        <TeamPerformanceReport player={player} />
                      </div>
                    )}
      
                    {activePanel === 'groups' && (
                      <UserGroupsPanel />
                    )}
                    {activePanel === 'social' && (
                      <div className="text-center text-gray-500 py-20 bg-slate-950 rounded-2xl border border-gray-800 mt-4 animate-in fade-in duration-500">
                        Friend List & Feed Coming Soon
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
    </div>
  );
}