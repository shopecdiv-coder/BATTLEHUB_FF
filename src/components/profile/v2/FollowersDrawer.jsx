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
import { db } from '@/api/firebaseClient';
import { collection, query, where, documentId, getDocs } from 'firebase/firestore';

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
      
      const validRels = [];
      for (const rel of data) {
        const targetId = type === 'followers' ? rel.follower_id : rel.following_id;
        if (seen.has(targetId)) {
          Follower.delete(rel.id).catch(() => {});
          continue;
        }
        seen.add(targetId);
        validRels.push({ ...rel, targetId });
      }

      const uniqueIds = validRels.map(r => r.targetId).filter(Boolean);
      const usersMap = {};
      
      const chunks = [];
      for (let i = 0; i < uniqueIds.length; i += 10) {
        chunks.push(uniqueIds.slice(i, i + 10));
      }

      const chunkPromises = chunks.map(async (chunk) => {
        if (chunk.length === 0) return;
        try {
          const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            usersMap[d.id] = { id: d.id, ...d.data() };
          });
        } catch (err) {
          console.error("Error fetching chunk of users:", err);
        }
      });
      
      await Promise.all(chunkPromises);

      const populated = validRels.map(rel => {
        const targetUser = usersMap[rel.targetId];
        if (!targetUser) {
          // User doesn't exist anymore — delete the orphaned follower record
          Follower.delete(rel.id).catch(() => {});
          return null;
        }
        return { ...rel, otherUser: targetUser };
      }).filter(Boolean);
      
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
        className="w-full sm:w-[450px] sm:max-w-md h-full bg-slate-950 border-l border-slate-800 p-0 flex flex-col overflow-hidden [&>button]:hidden pt-16"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-4 sm:p-6 border-b border-slate-800 bg-[#0c0d12] flex flex-row items-center gap-4 space-y-0">
          <SheetClose asChild>
            <button className="p-2 bg-slate-900 hover:bg-[#0ea5e9] text-gray-400 hover:text-white border border-slate-700 hover:border-[#0ea5e9] rounded-lg transition-colors">
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
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-1/3" />
                    <div className="h-3 bg-slate-800 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : userList.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
            </div>
          ) : (
            userList.map(f => (
              <div 
                key={f.id} 
                className={`bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4 transition-all ${isMe ? 'cursor-pointer hover:border-[#0ea5e9]/50 hover:bg-slate-800' : ''}`}
                onClick={() => isMe && handleProfileClick(f.otherUser)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="w-12 h-12 border-2 border-transparent">
                    <AvatarImage src={f.otherUser.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-gray-800 text-white font-bold">{f.otherUser.ign?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-white text-sm">{f.otherUser.ign || f.otherUser.name || 'Unknown User'}</p>
                    <p className="text-[10px] text-gray-400">UID: {f.otherUser.unique_id || f.otherUser.id?.substring(0,8)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Full Profile Slider */}
        <Sheet open={!!selectedProfile} onOpenChange={(val) => !val && setSelectedProfile(null)}>
          <SheetContent 
            className="bg-slate-950 border-slate-800 p-0 flex flex-col w-full max-w-full sm:max-w-full md:max-w-full overflow-hidden pt-16"
            onInteractOutside={(e) => e.preventDefault()}
          >
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
