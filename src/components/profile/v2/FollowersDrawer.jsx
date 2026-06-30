import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Follower, User } from '@/api/entities';
import { Users, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import PlayerProfile from "@/pages/PlayerProfile";

export default function FollowersDrawer({ children, user, type = 'followers', isMe }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {

      const seen = new Set();
      
      // If viewing Followers: find records where this user is being followed (following_id = user.id)
      // If viewing Following: find records where this user is the follower (follower_id = user.id)
      const data = type === 'followers' 
        ? await Follower.filter({ following_id: user.id })
        : await Follower.filter({ follower_id: user.id });
      
      const fetchPromises = data.map(async (rel) => {
        const targetId = type === 'followers' ? rel.follower_id : rel.following_id;
        
        if (seen.has(targetId)) {
          Follower.delete(rel.id).catch(() => {});
          return null;
        }
        seen.add(targetId);
        
        const targetUser = await User.get(targetId).catch(() => null);
        return targetUser ? { ...rel, otherUser: targetUser } : null;
      });
      
      const results = await Promise.all(fetchPromises);
      const populated = results.filter(Boolean);
      
      setUserList(populated);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, user]);

  const handleProfileClick = (user) => {
    setSelectedProfile(user);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-full sm:w-[450px] sm:max-w-md h-full bg-[#0a0a0c] border-l border-[#1f2029] p-0 flex flex-col overflow-hidden [&>button]:hidden pt-16"
      >
        <SheetHeader className="p-4 sm:p-6 border-b border-[#1f2029] bg-[#0c0d12] flex flex-row items-center gap-4 space-y-0">
          <SheetClose asChild>
            <button className="p-2 bg-[#111115] hover:bg-[#ff5500] text-gray-400 hover:text-white border border-[#2a2a35] hover:border-[#ff5500] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </SheetClose>
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase flex items-center gap-2 m-0">
            <Users className="w-6 h-6 text-white" />
            {type === 'followers' ? `Followers (${userList.length})` : `Following (${userList.length})`}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-[#ff5500] border-t-transparent rounded-full" /></div>
          ) : userList.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
            </div>
          ) : (
            userList.map(f => (
              <div 
                key={f.id} 
                className={`bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex items-center justify-between gap-4 transition-all ${isMe ? 'cursor-pointer hover:border-[#ff5500]/50 hover:bg-[#1a1a20]' : ''}`}
                onClick={() => isMe && handleProfileClick(f.otherUser)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="w-12 h-12 border-2 border-transparent">
                    <AvatarImage src={f.otherUser.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-gray-800 text-white font-bold">{f.otherUser.ign?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-white text-sm">{f.otherUser.ign}</p>
                    <p className="text-[10px] text-gray-400">UID: {f.otherUser.unique_id}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Full Profile Slider */}
        <Sheet open={!!selectedProfile} onOpenChange={(val) => !val && setSelectedProfile(null)}>
          <SheetContent className="bg-[#050505] border-[#1f2029] p-0 flex flex-col w-full sm:max-w-none sm:w-[500px] md:w-[600px] overflow-y-auto pt-16">
            {selectedProfile && (
              <PlayerProfile 
                inlineUid={selectedProfile.id} 
                isDrawer={true} 
                onClose={() => setSelectedProfile(null)} 
              />
            )}
          </SheetContent>
        </Sheet>
      </SheetContent>
    </Sheet>
  );
}
