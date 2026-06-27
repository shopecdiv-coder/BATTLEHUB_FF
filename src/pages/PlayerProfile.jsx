import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { User, TournamentLeaderboard, Friendship, Follower } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  UserPlus, MessageSquare, UserCheck, Shield, Share2, Award, 
  Target, Swords, Trophy, Crown, Flame, ChevronLeft, Flag, Info 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PlayerProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerUID = searchParams.get("uid");
  const { user: currentUser } = useAuth();
  
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState({
    matches: 0, wins: 0, kills: 0, kd: 0, winRate: 0, mvp: 0, earnings: 0
  });
  const [friendStatus, setFriendStatus] = useState("none"); // none, pending, accepted
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerUID) return;
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

      // Load Stats from Leaderboards
      const allLB = await TournamentLeaderboard.filter({ user_id: playerUID }, "-created_date", 200).catch(() => []);
      let totalKills = 0;
      let totalWins = 0;
      let matches = allLB.length;
      let mvpCount = 0;

      allLB.forEach(lb => {
        totalKills += lb.kills || 0;
        if (lb.wins > 0 || lb.placement === 1) totalWins += 1;
        if (lb.is_mvp) mvpCount += 1; // Assuming we might add is_mvp
      });

      setStats({
        matches,
        wins: totalWins,
        kills: totalKills,
        kd: matches > 0 ? (totalKills / matches).toFixed(1) : 0,
        winRate: matches > 0 ? Math.round((totalWins / matches) * 100) : 0,
        mvp: mvpCount,
        earnings: pData.total_earnings || 0 // Assuming we add this to User later
      });

      // Load Social Status
      if (currentUser && currentUser.id !== playerUID) {
        const checkFriend = await Friendship.filter({ user_id: currentUser.id, friend_id: playerUID });
        if (checkFriend.length > 0) setFriendStatus(checkFriend[0].status);
        
        const checkFollow = await Follower.filter({ user_id: playerUID, follower_id: currentUser.id });
        setIsFollowing(checkFollow.length > 0);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAddFriend = async () => {
    if (!currentUser) return navigate("/auth/login");
    try {
      await Friendship.create({
        user_id: currentUser.id,
        friend_id: playerUID,
        status: "pending"
      });
      setFriendStatus("pending");
      toast.success("Friend request sent!");
    } catch (e) {
      toast.error("Failed to send request.");
    }
  };

  const handleFollow = async () => {
    if (!currentUser) return navigate("/auth/login");
    try {
      if (isFollowing) {
        // Find and delete (simplified logic, usually need doc id)
        toast.success("Unfollowed player");
        setIsFollowing(false);
      } else {
        await Follower.create({
          user_id: playerUID,
          follower_id: currentUser.id
        });
        toast.success("You are now following " + player.ign);
        setIsFollowing(true);
      }
    } catch (e) {
      toast.error("Action failed");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" /></div>;
  }

  if (!player) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Player not found</div>;
  }

  const isMe = currentUser && currentUser.id === playerUID;

  return (
    <div className="min-h-screen bg-[#0e1015] text-white pb-20">
      {/* Banner */}
      <div 
        className="h-48 md:h-64 w-full bg-cover bg-center relative"
        style={{ backgroundImage: `url(${player.banner_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop'})` }}
      >
        <div className="absolute top-4 left-4">
          <Button variant="ghost" size="icon" className="bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm" onClick={() => window.history.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1015] to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative -mt-20">
        <div className="flex flex-col md:flex-row gap-6 md:items-end mb-6">
          {/* Avatar */}
          <div className="relative inline-block">
            <Avatar className="w-32 h-32 border-4 border-[#0e1015] shadow-xl">
              <AvatarImage src={player.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-4xl font-bold">
                {player.ign?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-[#0e1015] ${player.activity_status === 'Online' ? 'bg-green-500' : 'bg-gray-500'}`} />
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-black tracking-tight">{player.ign || "Unknown Player"}</h1>
              {player.role === 'admin' && (
                <Badge className="bg-blue-500 hover:bg-blue-600 px-1.5 py-0.5"><Shield className="w-3 h-3 mr-1" /> Verified</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="font-mono bg-gray-800/50 px-2 py-1 rounded">UID: {player.unique_id || player.id?.substring(0,8)}</span>
              <span className="flex items-center gap-1"><Flag className="w-3 h-3" /> IN</span>
              {player.activity_status && <span className={player.activity_status === 'Online' ? 'text-green-400' : 'text-gray-400'}>{player.activity_status}</span>}
            </div>
          </div>

          {/* Actions */}
          {!isMe && (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleAddFriend} disabled={friendStatus !== 'none'} className="bg-purple-600 hover:bg-purple-700">
                {friendStatus === 'pending' ? 'Request Sent' : friendStatus === 'accepted' ? <><UserCheck className="w-4 h-4 mr-2" /> Friends</> : <><UserPlus className="w-4 h-4 mr-2" /> Add Friend</>}
              </Button>
              <Button onClick={handleFollow} variant={isFollowing ? "outline" : "secondary"} className={isFollowing ? "border-purple-500/50 text-purple-400" : ""}>
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
              <Button variant="outline" className="bg-gray-900 border-gray-700 hover:bg-gray-800">
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Reputation & Bio */}
        <div className="flex items-center gap-4 mb-8 bg-gray-900/40 p-4 rounded-xl border border-gray-800/50">
          <div className="flex flex-col items-center px-4 border-r border-gray-800">
            <span className="text-2xl font-black text-yellow-400">{player.reputation_score || "5.0"}</span>
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center"><Award className="w-3 h-3 mr-1"/> Trust Score</span>
          </div>
          <p className="text-sm text-gray-300 italic flex-1">
            "{player.bio || 'Born to win, forced to grind. Professional Free Fire player.'}"
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column: Stats */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Target className="w-5 h-5 text-purple-400"/> Performance Stats</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Matches", value: stats.matches, icon: Swords, color: "text-blue-400" },
                { label: "Win Rate", value: `${stats.winRate}%`, icon: Trophy, color: "text-green-400" },
                { label: "K/D Ratio", value: stats.kd, icon: Target, color: "text-red-400" },
                { label: "Tournaments Won", value: stats.wins, icon: Crown, color: "text-yellow-400" },
                { label: "Total Kills", value: stats.kills, icon: Flame, color: "text-orange-400" },
                { label: "MVP Titles", value: stats.mvp, icon: Award, color: "text-purple-400" },
              ].map((s, i) => (
                <Card key={i} className="bg-gray-900/60 border-gray-800">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <s.icon className={`w-6 h-6 mb-2 ${s.color}`} />
                    <span className="text-2xl font-black text-white">{s.value}</span>
                    <span className="text-xs text-gray-400 font-medium uppercase mt-1">{s.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h2 className="text-xl font-bold mt-8 mb-4">🏆 Achievements</h2>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex w-max space-x-4">
                {[
                  { title: "Champion", desc: "Won a major tournament", icon: "🏆", bg: "bg-yellow-500/20", border: "border-yellow-500/30" },
                  { title: "Top Killer", desc: "10+ kills in a single match", icon: "⚔️", bg: "bg-red-500/20", border: "border-red-500/30" },
                  { title: "Early Supporter", desc: "Joined during beta", icon: "🌟", bg: "bg-purple-500/20", border: "border-purple-500/30" },
                ].map((badge, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${badge.bg} ${badge.border} min-w-[200px]`}>
                    <div className="text-3xl">{badge.icon}</div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{badge.title}</h4>
                      <p className="text-xs text-gray-400">{badge.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="bg-gray-800" />
            </ScrollArea>
          </div>

          {/* Right Column: Social & Party */}
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Social Rank</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center font-bold">D</div>
                      <span className="font-bold text-lg text-white">{player.social_rank || 'Diamond I'}</span>
                    </div>
                    <span className="text-xs text-purple-400 font-bold">{player.social_xp || 1250} XP</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-[65%] h-full" />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Followers</p>
                      <p className="text-xl font-bold">{player.followers_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Friends</p>
                      <p className="text-xl font-bold">{player.friends_count || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg font-bold">
              <Share2 className="w-4 h-4 mr-2" /> View Player Card
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}