import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Diamond } from "@/entities/Diamond";
import { Registration } from "@/entities/Registration";
import { GlobalChat } from "@/entities/GlobalChat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Gamepad2, Coins, Shield, UserPlus, Copy, Check, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { useAuth } from "@/lib/AuthContext";
import { Friendship } from "@/api/entities";

export default function UserProfileModal({ userId, onClose }) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ coins: 0, tournaments: 0, kills: 0, wins: 0 });
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFriendRequest, setShowFriendRequest] = useState(false);
  const [friendRequestMsg, setFriendRequestMsg] = useState("");
  const [isFriend, setIsFriend] = useState(false);

  const handleCopy = (text, id) => {
    if (!text) return;
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-HTTPS or mobile LAN testing
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error("Copy failed", err);
      }
      document.body.removeChild(textArea);
    }
    
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Direct fetch by ID (UID or Email)
      let foundUser = await User.get(userId);
      if (!foundUser && typeof userId === 'string' && userId.includes('@')) {
        foundUser = await User.get(userId.toLowerCase());
      }
      
      if (foundUser) {
        setProfile(foundUser);
        
        // Load stats
        const [diamonds, regs, leaderboards, myFriends, theirFriends] = await Promise.all([
          Diamond.filter({ user_id: userId }).catch(() => []),
          Registration.filter({ team_leader_id: userId }).catch(() => []),
          TournamentLeaderboard.filter({ user_id: userId }).catch(() => []),
          currentUser ? Friendship.filter({ user_id: currentUser.id, friend_id: foundUser.id }).catch(() => []) : [],
          currentUser ? Friendship.filter({ friend_id: currentUser.id, user_id: foundUser.id }).catch(() => []) : []
        ]);

        const friendship = [...(myFriends || []), ...(theirFriends || [])].find(f => f.status === 'accepted');
        setIsFriend(!!friendship);
        
        let total_kills = 0;
        let total_wins = 0;
        (leaderboards || []).forEach(lb => {
          total_kills += (lb.kills || 0);
          if (lb.wins > 0) total_wins += 1;
        });

        setStats({
          coins: diamonds.length > 0 ? diamonds[0].amount : 0,
          tournaments: regs.length,
          kills: total_kills,
          wins: total_wins
        });
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error:", error);
      setProfile(null);
    }
    setLoading(false);
  };

  const handleSendFriendRequest = () => {
    // The user will provide the actual logic later. For now, just alert.
    alert(`Friend request sent with message: ${friendRequestMsg || "No message"}`);
    setShowFriendRequest(false);
    setFriendRequestMsg("");
  };

  if (!userId) return null;

  return (
    <Dialog open={!!userId} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        ) : profile ? (
          <div className="text-center space-y-4">
            <Avatar className="w-24 h-24 mx-auto ring-4 ring-cyan-500">
              <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${profile.id}`} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white text-2xl">
                {profile.full_name?.[0]?.toUpperCase() || profile.ign?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="text-xl font-bold text-white flex items-center justify-center gap-1.5">
                {profile.full_name || profile.ign || 'Player'}
                {(profile.role === 'admin' || profile.email === 'shopecdiv@gmail.com' || profile.ign?.toUpperCase().includes('ADMIN') || profile.full_name?.toUpperCase().includes('ADMIN') || profile.ign?.toUpperCase().includes('BATTLEHUB')) && (
                  <BadgeCheck className="w-5 h-5 text-blue-500 fill-white drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                )}
              </h3>
              <div className="flex justify-center items-center gap-2 mt-1">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/50">
                   {profile.unique_id || 'N/A'}
                </div>
                <button onClick={() => handleCopy(profile.unique_id || 'N/A', 'bhid')} className="p-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors" title="Copy BattleHub ID">
                  {copiedId === 'bhid' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </div>
              {profile.bio && (
                <p className="text-sm text-gray-400 mt-2 italic">"{profile.bio}"</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-yellow-400">{stats.wins || 0}</p>
                <p className="text-xs text-gray-500">Wins</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <Target className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-red-400">{stats.kills || 0}</p>
                <p className="text-xs text-gray-500">Kills</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <Gamepad2 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-purple-400">{stats.tournaments}</p>
                <p className="text-xs text-gray-500">Tournaments</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 flex flex-col justify-center items-center">
                <p className="text-sm font-bold text-cyan-400 font-mono break-all">{profile.game_uid || 'N/A'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xs text-gray-500">FF UID</p>
                  {profile.game_uid && (
                    <button onClick={() => handleCopy(profile.game_uid, 'ffuid')} className="p-0.5 rounded hover:bg-gray-700 transition-colors" title="Copy FF UID">
                      {copiedId === 'ffuid' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Friend Request Section */}
            {currentUser?.id !== profile.id && !isFriend && (
              <div className="pt-4 border-t border-gray-800">
                {!showFriendRequest ? (
                  <Button 
                    onClick={() => setShowFriendRequest(true)}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend
                  </Button>
                ) : (
                  <div className="space-y-3 text-left">
                    <p className="text-sm font-medium text-gray-300">Send Friend Request</p>
                    <Textarea 
                      placeholder="Add an optional message..." 
                      value={friendRequestMsg}
                      onChange={(e) => setFriendRequestMsg(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white resize-none h-20"
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        onClick={() => { setShowFriendRequest(false); setFriendRequestMsg(""); }}
                        className="flex-1 text-gray-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSendFriendRequest}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">User not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}