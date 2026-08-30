import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Friendship, DirectMessage } from '@/api/entities';
import { MessageSquare, ChevronLeft, Search, Send, X, Phone, Video, MoreVertical } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';

import SharedChatInterface from "@/components/chat/SharedChatInterface";
import { GroupChatMessage } from "@/api/entities";

function DirectChatWrapper({ user, recipient, onClose }) {
  const chatId = `direct_${[user.id, recipient.id].sort().join('_')}`;

  const handleClearChat = async () => {
    if (!window.confirm("Are you sure you want to clear this chat? This will only clear it for you.")) return;
    try {
      const q = query(collection(db, 'group_chat_messages'), where("group_id", "==", chatId));
      const snap = await getDocs(q);
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      await Promise.all(msgs.map(msg => {
        const clearedBy = msg.cleared_by || [];
        if (!clearedBy.includes(user.id)) {
          const newClearedBy = [...clearedBy, user.id];
          if (newClearedBy.length >= 2) {
            return GroupChatMessage.delete(msg.id);
          }
          return GroupChatMessage.update(msg.id, { cleared_by: newClearedBy });
        }
        return Promise.resolve();
      }));
      toast.success("Chat cleared successfully!");
    } catch(e) {
      console.error(e);
      toast.error("Failed to clear chat");
    }
  };



  const isBlocked = user?.blocked_users?.includes(recipient.id);
  const amIBlocked = recipient?.blocked_users?.includes(user.id);

  const handleBlockUser = async () => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        blocked_users: arrayUnion(recipient.id)
      });
      toast.success(`You have blocked ${recipient.ign}`);
      onClose(); // Optional: might want to keep it open to show blocked status
    } catch(e) {
      toast.error("Failed to block user");
    }
  };

  const handleUnblockUser = async () => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        blocked_users: arrayRemove(recipient.id)
      });
      toast.success(`You have unblocked ${recipient.ign}`);
    } catch(e) {
      toast.error("Failed to unblock user");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <SharedChatInterface
        roomType="group"
        groupId={chatId}
        roomTitle={recipient.ign}
        user={user}
        recipient={recipient}
        onShrink={onClose}
        customMenuItems={
          <>
            <DropdownMenuItem onClick={handleClearChat} className="text-gray-300 hover:text-white hover:bg-slate-800 cursor-pointer">
              Clear Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1f2029]" />
            {isBlocked ? (
              <DropdownMenuItem onClick={handleUnblockUser} className="text-[#00e676] hover:text-[#00c853] hover:bg-[#00e676]/10 cursor-pointer">
                Unblock User
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleBlockUser} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer">
                Block User
              </DropdownMenuItem>
            )}
          </>
        }
      />
    </div>
  );
}

export default function MessagesDrawer({ children, user }) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [pendingChatId, setPendingChatId] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.IS_MESSAGES_DRAWER_OPEN = open;
    if (open) {
      document.body.classList.add('hide-bottom-nav');
    } else {
      document.body.classList.remove('hide-bottom-nav');
    }
    return () => { 
      window.IS_MESSAGES_DRAWER_OPEN = false; 
      document.body.classList.remove('hide-bottom-nav');
    };
  }, [open]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openDrawer') === 'message') {
      setOpen(true);
      const cId = params.get('chatId');
      if (cId) setPendingChatId(cId);
      
      // Clear URL params
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (pendingChatId && friends.length > 0) {
      const parts = pendingChatId.split('_');
      const friendId = parts[1] === user?.id ? parts[2] : parts[1];
      const friendObj = friends.find(f => f.friendId === friendId);
      if (friendObj && friendObj.otherUser) {
        // Wait for parent drawer animation to finish before mounting the inner chat
        setTimeout(() => {
          setActiveChat(friendObj.otherUser);
        }, 350);
        setPendingChatId(null);
      }
    }
  }, [pendingChatId, friends, user]);

  useEffect(() => {
    let userUnsubs = new Map();
    let chatUnsubs = new Map();

    if (user) {
      if (friends.length === 0) {
        setLoading(true);
      }
      
      let sentRels = [];
      let recvRels = [];
      const friendsMap = new Map();

      const updateFriendsState = () => {
        const arr = Array.from(friendsMap.values());
        arr.sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          
          if (timeA !== timeB) {
            return timeB - timeA;
          }
          
          const aOnline = a.otherUser?.activity_status === 'Online';
          const bOnline = b.otherUser?.activity_status === 'Online';
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;
          return 0;
        });
        setFriends([...arr]);
      };

      const handleFriendships = (allRels) => {
        const currentIds = new Set();
        
        allRels.forEach(rel => {
           const friendId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
           currentIds.add(friendId);
           if (!friendsMap.has(friendId)) {
             friendsMap.set(friendId, { rel, friendId, otherUser: null, unreadCount: 0, lastMessage: null, lastMessageTime: null });
             
             const unsubUser = onSnapshot(doc(db, "users", friendId), (docSnap) => {
                if (docSnap.exists()) {
                  const friendData = { id: docSnap.id, ...docSnap.data() };
                  const current = friendsMap.get(friendId);
                  if (current) {
                    friendsMap.set(friendId, { ...current, otherUser: friendData });
                    updateFriendsState();
                  }
                }
             });
             userUnsubs.set(friendId, unsubUser);

             const chatId = `direct_${[user.id, friendId].sort().join('_')}`;
             const chatRef = doc(db, "direct_chats", chatId);
             const unsubChat = onSnapshot(chatRef, (docSnap) => {
                let unreadCount = 0;
                let lastMessage = null;
                let lastMessageTime = null;
                
                if (docSnap.exists()) {
                  const data = docSnap.data();
                  unreadCount = data[`unread_count_${user.id}`] || 0;
                  lastMessage = data.last_message || null;
                  lastMessageTime = data.last_message_timestamp || null;
                }
                
                const current = friendsMap.get(friendId);
                if (current) {
                  friendsMap.set(friendId, { ...current, unreadCount, lastMessage, lastMessageTime });
                  updateFriendsState();
                }
             });
             chatUnsubs.set(friendId, unsubChat);
           }
        });

        for (const id of friendsMap.keys()) {
          if (!currentIds.has(id)) {
            friendsMap.delete(id);
            if (userUnsubs.has(id)) {
               userUnsubs.get(id)();
               userUnsubs.delete(id);
            }
            if (chatUnsubs.has(id)) {
               chatUnsubs.get(id)();
               chatUnsubs.delete(id);
            }
          }
        }
        
        updateFriendsState();
        setLoading(false);
      };

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
    }

    return () => {
      userUnsubs.forEach(unsub => unsub());
      chatUnsubs.forEach(unsub => unsub());
    };
  }, [user]);

  const formatLastMessagePreview = (msg) => {
    if (!msg) return "Tap to start chatting...";
    if (msg.startsWith('https://res.cloudinary.com/')) {
       if (msg.includes('/image/')) return '🖼️ Photo';
       if (msg.includes('/video/')) return '🎥 Video';
       if (msg.includes('/raw/')) return '📄 Document';
       return '📎 Media';
    }
    if (msg.includes('::')) return '📄 Document';
    if (msg.startsWith('http://') || msg.startsWith('https://')) return '🔗 Link';
    return msg;
  };

  const filteredFriends = friends.filter(f => 
    f.otherUser?.ign?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.otherUser?.unique_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="z-[150] w-full sm:w-[450px] sm:max-w-md h-full bg-slate-950 border-l border-slate-800 p-0 flex flex-col overflow-hidden [&>button]:hidden"
      >
        <SheetHeader className="p-4 sm:p-6 border-b border-slate-800 bg-[#0c0d12] flex flex-row items-center gap-4 space-y-0">
          <SheetClose asChild>
            <button className="p-2 bg-slate-900 hover:bg-[#0ea5e9] text-gray-400 hover:text-white border border-slate-700 hover:border-[#0ea5e9] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </SheetClose>
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase flex items-center gap-2 m-0">
            <MessageSquare className="w-6 h-6 text-white" />
            Messages
          </SheetTitle>
        </SheetHeader>

        {pendingChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            <div className="w-10 h-10 border-4 border-[#0ea5e9]/30 border-t-[#0ea5e9] rounded-full animate-spin" />
            <p className="text-gray-400 font-medium text-sm animate-pulse">Opening chat...</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="p-4 sm:p-6 pb-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Username or UID..."
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#0ea5e9] transition-colors"
                />
              </div>
            </div>

            {/* Friend List */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 space-y-2 mt-4 scrollbar-hide">
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4 animate-pulse">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 bg-gray-800 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-800 rounded w-1/3" />
                          <div className="h-3 bg-gray-800 rounded w-1/4" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="h-3 bg-gray-800 rounded w-8" />
                        <div className="w-4 h-4 bg-gray-800 rounded-full" />
                      </div>
                    </div>
                  ))}
                </>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No friends found. Add friends to chat!</div>
              ) : (
                filteredFriends.map(f => (
                  <div 
                    key={f.friendId} 
                    onClick={() => {
                      const chatId = `direct_${[user.id, f.friendId].sort().join('_')}`;
                      // Mark as read immediately + notify ProfileUnreadTracker instantly
                      localStorage.setItem(`chat_read_${chatId}`, Date.now().toString());
                      window.dispatchEvent(new CustomEvent('chatRead', { detail: { chatId } }));
                      setActiveChat(f.otherUser);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4 cursor-pointer hover:border-[#0ea5e9]/50 hover:bg-slate-800 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <Avatar className="w-12 h-12 border-2 border-transparent">
                          <AvatarImage src={f.otherUser.avatar_url} className="object-cover" />
                          <AvatarFallback className="bg-gray-800 text-white font-bold">{f.otherUser.ign?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#111115] ${f.otherUser?.activity_status === 'Online' ? 'bg-[#00e676]' : 'bg-red-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className="font-bold text-white truncate text-[15px]">{f.otherUser?.ign}</p>
                          {f.lastMessageTime && (
                            <span className={`text-[11px] ${f.unreadCount > 0 ? 'text-[#00e676] font-bold' : 'text-gray-500'}`}>
                              {new Date(f.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <p className={`text-[13px] truncate flex-1 ${f.unreadCount > 0 ? 'text-white font-semibold' : 'text-gray-400'}`}>
                            {formatLastMessagePreview(f.lastMessage)}
                          </p>
                          {f.unreadCount > 0 && (
                            <div className="w-5 h-5 rounded-full bg-[#00e676] flex items-center justify-center text-[10px] font-bold text-slate-900 flex-shrink-0">
                              {f.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Chat Window Nested Sheet */}
        <Sheet open={!!activeChat} onOpenChange={(val) => {
          if (!val) {
             if (activeChat) {
                // Mark as read on close too + notify tracker
                const chatId = `direct_${[user.id, activeChat.id].sort().join('_')}`;
                localStorage.setItem(`chat_read_${chatId}`, Date.now().toString());
                window.dispatchEvent(new CustomEvent('chatRead', { detail: { chatId } }));
             }
             setActiveChat(null);
          }
        }}>
          <SheetContent 
            onInteractOutside={(e) => e.preventDefault()}
            className="z-[150] bg-slate-950 border-slate-800 p-0 flex flex-col w-full sm:max-w-none sm:w-[500px] md:w-[600px] overflow-hidden [&>button]:hidden"
          >
            {activeChat && (
              <DirectChatWrapper 
                user={user} 
                recipient={activeChat} 
                onClose={() => setActiveChat(null)} 
              />
            )}
          </SheetContent>
        </Sheet>
      </SheetContent>
    </Sheet>
  );
}
