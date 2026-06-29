import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { User, TournamentLeaderboard, Friendship, Follower } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Trophy, Swords, Settings, Activity, ArrowLeft, UserPlus, MessageSquare, Gamepad2, Users, ShoppingCart } from "lucide-react";
import { toast } from 'sonner';

// V2 Components
import ProfileHeaderV2 from "@/components/profile/v2/ProfileHeaderV2";
import OverviewTabV2 from "@/components/profile/v2/OverviewTabV2";
import RecentMatchesV2 from "@/components/profile/v2/RecentMatchesV2";
import ActivityFeedV2 from "@/components/profile/v2/ActivityFeedV2";
import PlayerCardExport from "@/components/profile/PlayerCardExport";
import UserGroupsPanel from "@/components/profile/UserGroupsPanel";
import StorePanel from "@/components/profile/StorePanel";

export default function PlayerProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerUID = searchParams.get("uid");
  const { user: currentUser } = useAuth();
  
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState({ matches: 0, wins: 0, kills: 0, kd: 0, winRate: 0, mvp: 0 });
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState(null);
  const [friendshipStatus, setFriendshipStatus] = useState('none');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!playerUID) {
      setLoading(false);
      return;
    }
    loadProfile();
  }, [playerUID]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const pData = await User.get(playerUID);
      if (!pData) {
        setLoading(false);
        return;
      }
      setPlayer(pData);

      if (currentUser && currentUser.id !== playerUID) {
        try {
          const [sent, received] = await Promise.all([
            Friendship.filter({ user_id: currentUser.id, friend_id: playerUID }),
            Friendship.filter({ user_id: playerUID, friend_id: currentUser.id })
          ]);
          const rel = sent[0] || received[0];
          if (rel) {
            if (rel.status === 'accepted') setFriendshipStatus('friends');
            else if (rel.status === 'pending') setFriendshipStatus('pending');
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Load Stats from Leaderboards
      const allLB = await TournamentLeaderboard.filter({ user_id: playerUID }, "-created_date", 200).catch(() => []);
      let totalKills = 0;
      let totalWins = 0;
      let matches = allLB.length;

      allLB.forEach(lb => {
        totalKills += lb.kills || 0;
        if (lb.wins > 0 || lb.placement === 1) totalWins += 1;
      });

      setStats({
        matches,
        wins: totalWins,
        kills: totalKills,
        kd: matches > 0 ? (totalKills / matches).toFixed(2) : "0.00",
        winRate: matches > 0 ? ((totalWins / matches) * 100).toFixed(1) : "0.0",
        mvp: 27 // Mock data matching image
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex justify-center p-20"><div className="animate-spin w-8 h-8 border-b-2 border-[#ff5500] rounded-full" /></div>;
  if (!player) return <div className="min-h-screen bg-[#050505] text-white p-20 text-center">Player not found</div>;

  const isMe = currentUser && currentUser.id === playerUID;

  const handleAddFriend = async () => {
    if (!currentUser || isMe) return;
    if (friendshipStatus !== 'none') return;
    try {
      await Friendship.create({
        user_id: currentUser.id,
        friend_id: playerUID,
        status: 'pending'
      });
      toast.success("Friend request sent!");
      setFriendshipStatus('pending');
    } catch (e) {
      toast.error("Error sending request");
    }
  };

  return (
    <div 
      id="profile-page-container" 
      className="min-h-screen bg-[#050505] text-white pb-20 p-2 sm:p-4 md:p-8"
    >
      <div className="max-w-7xl mx-auto">
        
        {/* Profile Info Header */}
        <ProfileHeaderV2 player={player} isMe={false} />

        {/* Navigation Buttons Grid */}
        <div className="flex flex-wrap gap-2 mt-6">
          {[
            { id: 'add_friend', icon: friendshipStatus === 'friends' ? Users : friendshipStatus === 'pending' ? Activity : UserPlus, label: friendshipStatus === 'friends' ? 'Friends' : friendshipStatus === 'pending' ? 'Pending' : 'Add Friend' },
            { id: 'message', icon: MessageSquare, label: 'Message' },
            { id: 'party', icon: Gamepad2, label: 'Party Invite' },
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => {
                if (btn.id === 'add_friend') handleAddFriend();
              }}
              disabled={btn.id === 'add_friend' && friendshipStatus !== 'none'}
              className={`flex-1 min-w-[100px] basis-[30%] bg-[#0a0a0c] hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-1 sm:px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${btn.id === 'add_friend' && friendshipStatus !== 'none' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <btn.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${btn.id === 'add_friend' && friendshipStatus !== 'none' ? 'text-[#ff5500]' : 'text-white'}`} />
              <span className={`text-[9px] sm:text-[11px] uppercase font-bold text-center leading-tight w-full ${btn.id === 'add_friend' && friendshipStatus !== 'none' ? 'text-[#ff5500]' : 'text-gray-400'}`}>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Action Buttons (Moved Down) */}
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { id: 'groups', icon: Users, label: 'Create Group' },
            { id: 'social', icon: Settings, label: 'Post' },
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
            { id: 'your_performance', icon: BarChart, label: 'Your Performance' },
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
          player={player} 
          limit={2} 
          onViewAll={() => setActivePanel('activity_feed')} 
        />

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
                  <OverviewTabV2 player={player} tabType="your" />
                  <RecentMatchesV2 />
                  
                  <div className="mt-8 max-w-sm mx-auto sm:max-w-none sm:w-[350px]">
                    <h3 className="font-bold text-white mb-4 uppercase text-sm tracking-wider">BattleHub Player Card</h3>
                    <PlayerCardExport player={player} stats={stats} />
                  </div>
                </div>
              )}
              {activePanel === 'team_performance' && (
                <div className="animate-in fade-in duration-500">
                  <OverviewTabV2 player={player} tabType="team" />
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
                <div className="text-center text-gray-500 py-20 bg-[#0a0a0c] rounded-2xl border border-gray-800 mt-4 animate-in fade-in duration-500">
                  Friend List & Feed Coming Soon
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}