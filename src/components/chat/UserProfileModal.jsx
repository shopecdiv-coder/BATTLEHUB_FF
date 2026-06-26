import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Diamond } from "@/entities/Diamond";
import { Registration } from "@/entities/Registration";
import { GlobalChat } from "@/entities/GlobalChat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Gamepad2, Coins, Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ coins: 0, tournaments: 0 });
  const [loading, setLoading] = useState(true);
  const [showFriendRequest, setShowFriendRequest] = useState(false);
  const [friendRequestMsg, setFriendRequestMsg] = useState("");

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
        const [diamonds, regs] = await Promise.all([
          Diamond.filter({ user_id: userId }).catch(() => []),
          Registration.filter({ team_leader_id: userId }).catch(() => [])
        ]);
        
        setStats({
          coins: diamonds.length > 0 ? diamonds[0].amount : 0,
          tournaments: regs.length
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
              <h3 className="text-xl font-bold text-white">{profile.full_name || profile.ign || 'Player'}</h3>
              <div className="inline-flex mt-1 items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/50">
                 {profile.unique_id || `BH${profile.id.replace(/-/g,'').slice(-8).toUpperCase()}`}
              </div>
              {profile.bio && (
                <p className="text-sm text-gray-400 mt-2 italic">"{profile.bio}"</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-yellow-400">{profile.total_wins || 0}</p>
                <p className="text-xs text-gray-500">Wins</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <Target className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-red-400">{profile.total_kills || 0}</p>
                <p className="text-xs text-gray-500">Kills</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <Gamepad2 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-purple-400">{stats.tournaments}</p>
                <p className="text-xs text-gray-500">Tournaments</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm font-bold text-cyan-400 font-mono break-all">{profile.game_uid || 'N/A'}</p>
                <p className="text-xs text-gray-500 mt-1">FF UID</p>
              </div>
            </div>

            {/* Friend Request Section */}
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

          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">User not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}