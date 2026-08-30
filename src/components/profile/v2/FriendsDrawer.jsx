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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Friendship, User } from '@/api/entities';
import { Search, Users, MessageSquare, Gamepad2, UserPlus, Check, X, Swords, ChevronLeft, MoreVertical, Trash2, User as UserIcon, Ban } from 'lucide-react';
import { toast } from 'sonner';
import PlayerProfile from "@/pages/PlayerProfile";
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';

export default function FriendsDrawer({ children, user, isMe = true }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  // Data states
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ONLINE, IN_MATCH, OFFLINE

  useEffect(() => {
    let isMounted = true;
    const friendsMap = new Map();
    const userUnsubs = new Map();

    const updateFriendsState = () => {
      if (!isMounted) return;
      setFriends(Array.from(friendsMap.values()));
    };

    if (!user || !open) return;
    setLoading(true);

    const handleFriendships = (allRels) => {
      const currentIds = new Set(allRels.map(r => r.user_id === user.id ? r.friend_id : r.user_id));
      
      // Remove deleted friends
      for (const id of friendsMap.keys()) {
        if (!currentIds.has(id)) {
          friendsMap.delete(id);
          if (userUnsubs.has(id)) {
            userUnsubs.get(id)();
            userUnsubs.delete(id);
          }
        }
      }

      // Add new friends
      for (const rel of allRels) {
        const otherId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
        if (!friendsMap.has(otherId)) {
          friendsMap.set(otherId, { ...rel, otherUser: {}, richStatus: 'OFFLINE' });
          
          const unsub = onSnapshot(doc(db, 'users', otherId), (docSnap) => {
            if (docSnap.exists()) {
              const otherUser = docSnap.data();
              let realStatus = 'OFFLINE';
              if (otherUser.activity_status === 'Online') realStatus = 'ONLINE';
              else if (otherUser.activity_status === 'In Match') realStatus = 'IN_MATCH';
              
              const current = friendsMap.get(otherId);
              if (current) {
                friendsMap.set(otherId, { ...current, otherUser, richStatus: realStatus });
                updateFriendsState();
              }
            }
          });
          userUnsubs.set(otherId, unsub);
        }
      }
      
      updateFriendsState();
      setLoading(false);
    };

    let sentRels = [];
    let recvRels = [];

    const checkCombine = () => handleFriendships([...sentRels, ...recvRels]);

    const qSent = query(collection(db, 'friendships'), where('user_id', '==', user.id), where('status', '==', 'accepted'));
    const unsubSent = onSnapshot(qSent, (snap) => {
      sentRels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      checkCombine();
    });

    const qRecv = query(collection(db, 'friendships'), where('friend_id', '==', user.id), where('status', '==', 'accepted'));
    const unsubRecv = onSnapshot(qRecv, (snap) => {
      recvRels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      checkCombine();
    });

    return () => {
      isMounted = false;
      unsubSent();
      unsubRecv();
      userUnsubs.forEach(unsub => unsub());
    };
  }, [open, user]);

  const handleProfileClick = (profileData) => {
    setSelectedProfile(profileData);
  };
  
  const handleViewFullProfile = (id) => {
    setOpen(false);
    setSelectedProfile(null);
    navigate(`/PlayerProfile?uid=${id}`);
  };

  // Stats calculation
  const stats = {
    total: friends.length,
    online: friends.filter(f => f.richStatus === 'ONLINE').length,
    inMatch: friends.filter(f => f.richStatus === 'IN_MATCH').length,
    offline: friends.filter(f => f.richStatus === 'OFFLINE').length,
  };

  // Filtered friends
  const filteredFriends = friends.filter(f => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === '' || 
                          f.otherUser?.ign?.toLowerCase().includes(q) || 
                          f.otherUser?.unique_id?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || f.richStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    if (status === 'ONLINE') return 'bg-[#00e676]';
    if (status === 'IN_MATCH') return 'bg-[#0ea5e9]';
    return 'bg-gray-500';
  };
  
  const getStatusText = (status) => {
    if (status === 'ONLINE') return 'Online';
    if (status === 'IN_MATCH') return 'In Match';
    return 'Offline';
  };

  const handleRemoveFriend = async (e, relId, friendId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this friend? All chat history will be deleted.")) return;
    try {
      await Friendship.delete(relId);
      
      const chatId = `direct_${[user.id, friendId].sort().join('_')}`;
      const { deleteDoc, doc, collection, getDocs, query, where, writeBatch } = await import('firebase/firestore');
      
      // Delete metadata document
      await deleteDoc(doc(db, "direct_chats", chatId)).catch(() => {});
      
      // Delete all messages in the chat
      const q = query(collection(db, "group_chat_messages"), where("group_id", "==", chatId));
      const snap = await getDocs(q).catch(() => ({ empty: true }));
      if (snap && !snap.empty) {
         const batch = writeBatch(db);
         snap.docs.forEach(d => batch.delete(d.ref));
         await batch.commit().catch(() => {});
      }

      toast.success('Friend removed successfully');
      setFriends(prev => prev.filter(f => f.id !== relId));
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error('Failed to remove friend');
    }
  };

  const handleBlockUser = async (e, otherUser) => {
    e.stopPropagation();
    const isBlocked = user?.blocked_users?.includes(otherUser.id);
    if (isBlocked) {
      if (window.confirm(`Are you sure you want to unblock ${otherUser.ign || otherUser.username || "User"}?`)) {
        const newBlockedList = (user?.blocked_users || []).filter(id => id !== otherUser.id);
        await User.update(user.id, { blocked_users: newBlockedList });
        if (user) user.blocked_users = newBlockedList;
        setFriends(prev => [...prev]); // Trigger re-render to update UI immediately
        toast.success("User unblocked");
      }
    } else {
      if (window.confirm(`Are you sure you want to block ${otherUser.ign || otherUser.username || "User"}?`)) {
        const blockedList = user?.blocked_users || [];
        await User.update(user.id, { blocked_users: [...blockedList, otherUser.id] });
        if (user) user.blocked_users = [...blockedList, otherUser.id];
        setFriends(prev => [...prev]); // Trigger re-render to update UI immediately
        toast.success("User blocked");
      }
    }
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
        <SheetHeader className="px-4 py-3 sm:px-5 bg-[#0c0d12] flex flex-row items-center gap-3 space-y-0 border-b border-slate-800/50">
          <SheetClose asChild>
            <button className="p-1.5 bg-slate-900 hover:bg-[#0ea5e9] text-gray-400 hover:text-white border border-slate-700 hover:border-[#0ea5e9] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </SheetClose>
          <SheetTitle className="text-lg font-black tracking-widest text-white uppercase flex items-center gap-2 m-0">
            <Users className="w-5 h-5 text-[#0ea5e9]" />
            {isMe ? 'My Friends' : `${user?.ign?.split(' ')[0] || 'Player'}'s Friends`}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-[#0c0d12]">
          {isMe && (
            <div className="px-3 sm:px-5 pt-1.5 border-b border-slate-800">
              <div className="grid grid-cols-3 w-full">
                {[
                  { id: 'ALL', label: 'ALL', count: stats.total },
                  { id: 'ONLINE', label: 'ONLINE', count: stats.online },
                  { id: 'IN_MATCH', label: 'IN MATCH', count: stats.inMatch }
                ].map(status => (
                  <button
                    key={status.id}
                    onClick={() => setStatusFilter(status.id)}
                    className={`pb-1.5 text-[9px] sm:text-[10px] font-black tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 border-b-2 ${
                      statusFilter === status.id 
                        ? 'border-[#0ea5e9] text-white' 
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span className="uppercase whitespace-nowrap">{status.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${
                      statusFilter === status.id 
                        ? 'bg-[#0ea5e9]/20 text-[#0ea5e9]' 
                        : 'bg-[#1f2029] text-gray-500'
                    }`}>
                      {status.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="px-4 sm:px-5 py-3 bg-slate-950">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input 
                placeholder="Search by Username or UID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-gray-600 h-9 rounded-xl focus-visible:ring-[#0ea5e9] text-sm"
              />
            </div>
          </div>

          {/* Friend List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-6 space-y-1.5">
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
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">No friends found matching your filters.</div>
            ) : (
              filteredFriends.map(f => {
                const isUserBlocked = user?.blocked_users?.includes(f.otherUser.id);
                return (
                <div 
                  key={f.id} 
                  onClick={() => isMe && handleProfileClick(f.otherUser)}
                  className={`bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center gap-3 transition-all ${isMe ? 'cursor-pointer hover:border-[#0ea5e9]/50 hover:bg-slate-800' : ''} ${isUserBlocked ? 'opacity-50' : ''}`}
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10 border-2 border-transparent">
                      <AvatarImage src={f.otherUser.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-gray-800 text-white font-bold text-xs uppercase">{f.otherUser.ign ? f.otherUser.ign[0] : 'U'}</AvatarFallback>
                    </Avatar>
                    {isMe && (
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#111115] ${getStatusColor(f.richStatus)}`} />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-[14px] truncate ${isUserBlocked ? 'text-gray-500 line-through' : 'text-white'}`}>{f.otherUser.ign || 'Unknown Player'}</p>
                      {isUserBlocked && (
                        <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 shrink-0">Blocked</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <p className="text-[10px] text-gray-400">UID: {f.otherUser.unique_id}</p>
                      {isMe && (
                        <p className={`text-[10px] font-bold ${
                          f.richStatus === 'ONLINE' ? 'text-[#00e676]' : 
                          f.richStatus === 'IN_MATCH' ? 'text-[#0ea5e9]' : 'text-gray-500'
                        }`}>
                          {getStatusText(f.richStatus)}
                        </p>
                      )}
                    </div>
                  </div>
                  {isMe && (
                    <div onClick={e => e.stopPropagation()}>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 bg-transparent text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition-all outline-none">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-white min-w-[150px]">
                          <DropdownMenuItem 
                            onClick={() => handleProfileClick(f.otherUser)}
                            className="focus:bg-slate-800 focus:text-white cursor-pointer py-2.5"
                          >
                            <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => handleRemoveFriend(e, f.id, f.otherUser.id)}
                            className="focus:bg-red-950/30 focus:text-red-500 text-red-500 cursor-pointer py-2.5"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Friend
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-orange-400 focus:bg-orange-500/10 focus:text-orange-400 cursor-pointer py-2.5"
                            onClick={(e) => handleBlockUser(e, f.otherUser)}
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            {isUserBlocked ? "Unblock User" : "Block User"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              )})
            )}
          </div>
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
