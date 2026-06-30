import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Friendship, DirectMessage } from '@/api/entities';
import { MessageSquare, ChevronLeft, Search, Send, X, Phone, Video, MoreVertical } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';

import SharedChatInterface from "@/components/chat/SharedChatInterface";
import { GroupChatMessage } from "@/api/entities";

function DirectChatWrapper({ user, recipient, onClose }) {
  const chatId = `direct_${Math.min(user.id, recipient.id)}_${Math.max(user.id, recipient.id)}`;

  const handleClearChat = async () => {
    try {
      const msgs = await GroupChatMessage.filter({ group_id: chatId });
      await Promise.all(msgs.map(msg => GroupChatMessage.delete(msg.id)));
      toast.success("Chat cleared successfully!");
    } catch(e) {
      toast.error("Failed to clear chat");
    }
  };

  const handleExportChat = async () => {
    try {
      const msgs = await GroupChatMessage.filter({ group_id: chatId });
      msgs.sort((a, b) => new Date(a.created_date || a.created_at) - new Date(b.created_date || b.created_at));
      
      let content = `Chat Export with ${recipient.ign}\nGenerated at: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n\n`;
      msgs.forEach(msg => {
        const senderName = msg.user_id === user.id ? user.ign || 'You' : recipient.ign;
        const time = format(new Date(msg.created_date || msg.created_at), 'yyyy-MM-dd HH:mm:ss');
        content += `[${time}] ${senderName}: ${msg.message}\n`;
        if (msg.image_url) {
          content += `[Image: ${msg.image_url}]\n`;
        }
      });
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Chat_${recipient.ign}_${format(new Date(), 'yyyyMMdd')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Chat exported successfully!");
    } catch(e) {
      toast.error("Failed to export chat");
    }
  };

  const handleBlockUser = async () => {
    try {
      const [sent, received] = await Promise.all([
        Friendship.filter({ user_id: user.id }),
        Friendship.filter({ friend_id: user.id })
      ]);
      const rel = [...sent, ...received].find(f => f.friend_id === recipient.id || f.user_id === recipient.id);
      if (rel) {
        await Friendship.update(rel.id, { status: 'blocked' });
        toast.success(`You have blocked ${recipient.ign}`);
        onClose();
      }
    } catch(e) {
      toast.error("Failed to block user");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      <SharedChatInterface
        roomType="group"
        groupId={chatId}
        roomTitle={recipient.ign}
        user={user}
        onShrink={onClose}
        customMenuItems={
          <>
            <DropdownMenuItem onClick={handleClearChat} className="text-gray-300 hover:text-white hover:bg-[#1a1a20] cursor-pointer">
              Clear Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportChat} className="text-gray-300 hover:text-white hover:bg-[#1a1a20] cursor-pointer">
              Export Chat (.txt)
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1f2029]" />
            <DropdownMenuItem onClick={handleBlockUser} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer">
              Block User
            </DropdownMenuItem>
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

  useEffect(() => {
    if (open && user) {
      loadFriends();
    }
  }, [open, user]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const [sent, received] = await Promise.all([
        Friendship.filter({ user_id: user.id }),
        Friendship.filter({ friend_id: user.id })
      ]);
      const allRelations = [...sent, ...received].filter(rel => rel.status === 'accepted');
      
      const uniqueFriendIds = [];
      const seen = new Set();
      
      for (const rel of allRelations) {
        const friendId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
        if (!seen.has(friendId)) {
          seen.add(friendId);
          uniqueFriendIds.push({ rel, friendId });
        }
      }
      
      const populated = await Promise.all(
        uniqueFriendIds.map(async ({ rel, friendId }) => {
          const friendUser = await User.get(friendId).catch(() => null);
          if (!friendUser) return null;

          let unreadCount = 0;
          try {
            const chatId = `direct_${Math.min(user.id, friendId)}_${Math.max(user.id, friendId)}`;
            const lastRead = parseInt(localStorage.getItem(`chat_read_${chatId}`) || '0');
            
            const q = query(
              collection(db, "group_chat_messages"),
              where("group_id", "==", chatId),
              orderBy("created_at", "desc"),
              limit(20)
            );
            const snap = await getDocs(q);
            unreadCount = snap.docs.filter(d => {
              const data = d.data();
              const msgTime = new Date(data.created_at || data.created_date).getTime();
              return msgTime > lastRead && data.user_id !== user.id;
            }).length;
          } catch (err) {
            console.error("Unread fetch error:", err);
          }

          return { ...rel, otherUser: friendUser, unreadCount };
        })
      );
      
      // Sort by unread count first
      const finalFriends = populated.filter(Boolean);
      finalFriends.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
      setFriends(finalFriends);
    } catch(e) { console.error(e); }
    setLoading(false);
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
        className="z-[150] w-full sm:w-[450px] sm:max-w-md h-full bg-[#0a0a0c] border-l border-[#1f2029] p-0 pb-16 flex flex-col overflow-hidden [&>button]:hidden"
      >
        <SheetHeader className="p-4 sm:p-6 border-b border-[#1f2029] bg-[#0c0d12] flex flex-row items-center gap-4 space-y-0">
          <SheetClose asChild>
            <button className="p-2 bg-[#111115] hover:bg-[#ff5500] text-gray-400 hover:text-white border border-[#2a2a35] hover:border-[#ff5500] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </SheetClose>
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase flex items-center gap-2 m-0">
            <MessageSquare className="w-6 h-6 text-white" />
            Messages
          </SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="p-4 sm:p-6 pb-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Username or UID..."
              className="w-full bg-[#111115] border border-[#1f2029] text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#ff5500] transition-colors"
            />
          </div>
        </div>

        {/* Friend List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 space-y-2 mt-4 scrollbar-hide">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-[#ff5500] border-t-transparent rounded-full" /></div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No friends found. Add friends to chat!</div>
          ) : (
            filteredFriends.map(f => (
              <div 
                key={f.id} 
                onClick={() => setActiveChat(f.otherUser)}
                className="bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex items-center justify-between gap-4 cursor-pointer hover:border-[#ff5500]/50 hover:bg-[#1a1a20] transition-all"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="w-12 h-12 border-2 border-transparent">
                    <AvatarImage src={f.otherUser.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-gray-800 text-white font-bold">{f.otherUser.ign?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{f.otherUser?.ign}</p>
                    <p className="text-sm text-gray-400 truncate">
                      {f.unreadCount > 0 ? (
                        <span className="text-emerald-400 font-medium">New messages</span>
                      ) : (
                        "Tap to start chatting..."
                      )}
                    </p>
                  </div>
                  {f.unreadCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                      {f.unreadCount}
                    </div>
                  )}
                  <ChevronLeft className="w-5 h-5 text-gray-600 rotate-180" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Window Nested Sheet */}
        <Sheet open={!!activeChat} onOpenChange={(val) => {
          if (!val) {
             if (activeChat) {
                const chatId = `direct_${Math.min(user.id, activeChat.id)}_${Math.max(user.id, activeChat.id)}`;
                localStorage.setItem(`chat_read_${chatId}`, Date.now().toString());
                loadFriends();
             }
             setActiveChat(null);
          }
        }}>
          <SheetContent 
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="z-[150] bg-[#050505] border-[#1f2029] p-0 pb-16 flex flex-col w-full sm:max-w-none sm:w-[500px] md:w-[600px] overflow-hidden [&>button]:hidden"
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
