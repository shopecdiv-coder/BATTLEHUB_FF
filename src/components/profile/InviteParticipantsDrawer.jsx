import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, UserPlus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Friendship, User, Notification } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { db } from "@/api/firebaseClient";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function InviteParticipantsDrawer({ group, isOpen, onClose }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [invitedMap, setInvitedMap] = useState({}); // { [userId]: true }

  useEffect(() => {
    if (!isOpen || !user || !user.id) return;
    
    let isMounted = true;
    setLoading(true);
    
    const handleFriendships = async (allRels) => {
      try {
        const promises = allRels.map(rel => {
          const otherId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
          return User.get(otherId).catch(err => null);
        });
        
        const friendsData = await Promise.all(promises);
        
        // Remove duplicates and nulls
        const uniqueUsers = [];
        const seen = new Set();
        for (const u of friendsData) {
          if (u && !seen.has(u.id)) {
            seen.add(u.id);
            uniqueUsers.push(u);
          }
        }
        
        if (isMounted) {
          setFriends(uniqueUsers);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading friends:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    let sentRels = [];
    let recvRels = [];
    
    let timerId = null;
    const checkCombine = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        handleFriendships([...sentRels, ...recvRels]);
      }, 50); // fast debounce
    };

    const qSent = query(collection(db, 'friendships'), where('user_id', '==', user.id));
    const unsubSent = onSnapshot(qSent, (snap) => {
      sentRels = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status === 'accepted');
      checkCombine();
    }, (error) => {
      console.error("onSnapshot sent error:", error);
      if (isMounted) setLoading(false);
    });

    const qRecv = query(collection(db, 'friendships'), where('friend_id', '==', user.id));
    const unsubRecv = onSnapshot(qRecv, (snap) => {
      recvRels = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status === 'accepted');
      checkCombine();
    }, (error) => {
      console.error("onSnapshot recv error:", error);
      if (isMounted) setLoading(false);
    });
    
    return () => { 
      isMounted = false; 
      unsubSent();
      unsubRecv();
      if (timerId) clearTimeout(timerId);
    };
  }, [isOpen, user?.id]);

  const handleInvite = async (friendId) => {
    if (!group || !user) return;
    try {
      setInvitedMap(prev => ({ ...prev, [friendId]: true }));
      
      await Notification.create({
        recipient_id: friendId,
        type: "group_invite",
        title: "Group Invitation",
        message: `${user.username || user.name || "A friend"} invited you to join ${group.name}`,
        group_id: group.id,
        group_name: group.name,
        sender_id: user.id,
        sender_name: user.username || user.name,
        read: false,
        status: "pending"
      });
      
      toast.success("Invitation sent!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send invitation");
      setInvitedMap(prev => ({ ...prev, [friendId]: false }));
    }
  };

  const filteredFriends = friends.filter(f => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (f.name && f.name.toLowerCase().includes(query)) ||
           (f.username && f.username.toLowerCase().includes(query)) ||
           (f.ign && f.ign.toLowerCase().includes(query));
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose} modal={false}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-slate-950 border-slate-800 p-0 overflow-y-auto z-[530] pb-24">
        <SheetHeader className="p-4 border-b border-slate-800 sticky top-0 bg-slate-950 z-10 flex flex-row items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white rounded-full bg-slate-900/50 hover:bg-slate-800 mt-2">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </Button>
          <SheetTitle className="text-white text-xl flex-1 text-center pr-10">Invite Friends</SheetTitle>
        </SheetHeader>
        
        <div className="p-4">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search friends..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-white focus:border-[#00FFFF]/50 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/50 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800" />
                      <div className="w-32 h-4 rounded bg-slate-800" />
                    </div>
                    <div className="w-20 h-8 rounded bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-500">No friends found.</p>
              </div>
            ) : (
              filteredFriends.map(friend => {
                const isMember = group?.members?.includes(friend.id);
                const isPending = group?.pending_members?.includes(friend.id);
                const isInvited = invitedMap[friend.id];
                
                return (
                  <div key={friend.id} className="flex items-center justify-between p-3 hover:bg-slate-900 rounded-xl transition-colors border border-transparent hover:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-slate-700 bg-slate-800">
                        <AvatarImage src={friend.avatar_url || friend.avatar || friend.dp} className="object-cover" />
                        <AvatarFallback className="font-bold">{(friend.ign || friend.username || friend.name || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {friend.ign || friend.username || friend.name}
                        </p>
                      </div>
                    </div>
                    
                    {isMember ? (
                      <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">Joined</span>
                    ) : isPending ? (
                      <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Requested</span>
                    ) : isInvited ? (
                      <Button size="sm" variant="ghost" disabled className="text-green-400 bg-green-400/10 cursor-default">
                        <Check className="w-4 h-4 mr-1" /> Sent
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleInvite(friend.id)} className="bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold px-4">
                        Invite
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
