import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Diamond } from "@/entities/Diamond";
import { Registration } from "@/entities/Registration";
import { GlobalChat } from "@/entities/GlobalChat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Gamepad2, Coins, Shield } from "lucide-react";

export default function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ coins: 0, tournaments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Try multiple approaches to find the user
      let foundUser = null;
      
      // Method 1: Direct filter by ID
      const users = await User.filter({ id: userId }).catch(() => []);
      if (users.length > 0) {
        foundUser = users[0];
      }
      
      // Method 2: List all and find (fallback)
      if (!foundUser) {
        const allUsers = await User.list("-created_date", 500).catch(() => []);
        foundUser = allUsers.find(u => u.id === userId);
      }
      
      // Method 3: Try list without filters
      if (!foundUser) {
        const allUsers = await User.list().catch(() => []);
        foundUser = allUsers.find(u => u.id === userId);
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
                {profile.ign?.[0]?.toUpperCase() || profile.full_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="text-xl font-bold text-white">{profile.ign || profile.full_name}</h3>
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
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-cyan-400">{profile.rank || 'Unranked'}</p>
                <p className="text-xs text-gray-500">Rank</p>
              </div>
            </div>

            {profile.game_uid && (
              <div className="pt-2 border-t border-gray-800">
                <p className="text-xs text-gray-500">Game UID</p>
                <p className="text-cyan-400 font-mono">{profile.game_uid}</p>
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