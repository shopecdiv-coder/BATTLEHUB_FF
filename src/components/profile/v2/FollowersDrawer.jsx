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

export default function FollowersDrawer({ children, user, type = 'followers' }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = type === 'followers' 
        ? await Follower.filter({ following_id: user.id })
        : await Follower.filter({ follower_id: user.id });
      
      const populated = [];
      const seen = new Set();
      
      for (const rel of data) {
        const targetId = type === 'followers' ? rel.follower_id : rel.following_id;
        if (seen.has(targetId)) {
          Follower.delete(rel.id).catch(() => {});
          continue;
        }
        seen.add(targetId);
        const targetUser = await User.get(targetId).catch(() => null);
        if (targetUser) populated.push({ ...rel, otherUser: targetUser });
      }
      
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

  const handleProfileClick = (id) => {
    setOpen(false);
    navigate(`/PlayerProfile?uid=${id}`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-full sm:w-[450px] sm:max-w-md h-full bg-[#0a0a0c] border-l border-[#1f2029] p-0 flex flex-col z-50 overflow-hidden [&>button]:hidden"
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
              <div key={f.id} className="bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex items-center justify-between gap-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                  onClick={() => handleProfileClick(f.otherUser.id)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={f.otherUser.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-gray-800 text-white font-bold">{f.otherUser.ign?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-white text-sm">{f.otherUser.ign}</p>
                    <p className="text-[10px] text-gray-400">UID: {f.otherUser.unique_id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleProfileClick(f.otherUser.id)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-xs font-bold transition-colors"
                >
                  PROFILE
                </button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
