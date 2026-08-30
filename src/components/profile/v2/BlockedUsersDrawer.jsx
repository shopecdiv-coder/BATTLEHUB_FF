import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Loader2 } from 'lucide-react';
import { User } from '@/entities/User';

export default function BlockedUsersDrawer({ children, user }) {
  const [open, setOpen] = useState(false);
  const [blockedUsersList, setBlockedUsersList] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  useEffect(() => {
    if (open) {
      loadBlockedUsers();
    }
  }, [open, user]);

  const loadBlockedUsers = async () => {
    if (!user?.blocked_users || user.blocked_users.length === 0) {
      setBlockedUsersList([]);
      return;
    }
    setLoadingBlocked(true);
    try {
      const promises = user.blocked_users.map(id => User.filter({ id }).then(res => res[0] || { id, username: 'Unknown User' }));
      const users = await Promise.all(promises);
      setBlockedUsersList(users);
    } catch (e) {
      console.error(e);
    }
    setLoadingBlocked(false);
  };

  const handleUnblock = async (targetId) => {
    if (window.confirm("Unblock this user?")) {
      const newBlockedList = (user?.blocked_users || []).filter(id => id !== targetId);
      await User.update(user.id, { blocked_users: newBlockedList });
      // Update local state temporarily for UX
      user.blocked_users = newBlockedList;
      setBlockedUsersList(prev => prev.filter(u => u.id !== targetId));
      alert("User unblocked successfully.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      <SheetContent 
        side="bottom" 
        className="w-full h-[60vh] sm:h-[50vh] bg-slate-950 border-t border-slate-800 rounded-t-3xl p-0 flex flex-col z-[100] pb-16 sm:pb-0 overflow-hidden [&>button]:bg-slate-900 [&>button]:text-white [&>button]:p-2 [&>button]:rounded-lg [&>button]:border [&>button]:border-slate-700 [&>button:hover]:bg-[#0ea5e9] [&>button:hover]:border-[#0ea5e9] [&>button]:transition-all [&>button]:right-6 [&>button]:top-6 [&>button]:shadow-lg"
      >
        <SheetHeader className="p-6 border-b border-slate-800 bg-[#0c0d12]">
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase text-left pr-10">
            Blocked Users
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-3 bg-slate-950">
          {loadingBlocked ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
          ) : blockedUsersList.length === 0 ? (
            <div className="text-center text-gray-500 p-10 font-bold uppercase text-sm">No blocked users</div>
          ) : (
            blockedUsersList.map(bu => (
              <div key={bu.id} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <img src={bu.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bu.username}`} className="w-10 h-10 rounded-full bg-slate-800 object-cover" />
                  <div>
                    <div className="font-bold text-white text-sm">{bu.ign || bu.username || bu.name}</div>
                    <div className="text-[10px] text-gray-500 uppercase">{bu.unique_id || bu.id}</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleUnblock(bu.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
