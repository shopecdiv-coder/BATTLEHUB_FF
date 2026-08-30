import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DirectMessage, User } from '@/api/entities';
import { MessageSquare, ChevronLeft } from 'lucide-react';
import ChatWindow from '@/components/social/ChatWindow';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';

export default function RecentChatsDrawer({ children, user }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentChats, setRecentChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    let unsubs = [];
    let isMounted = true;

    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [sent, received] = await Promise.all([
          DirectMessage.filter({ sender_id: user.id }),
          DirectMessage.filter({ recipient_id: user.id })
        ]);
        
        const allMsgs = [...sent, ...received];
        
        // Group by the other user's ID
        const grouped = {};
        allMsgs.forEach(msg => {
          const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
          if (!grouped[otherId]) {
            grouped[otherId] = msg;
          } else {
            // Keep the latest message
            if (new Date(msg.created_at) > new Date(grouped[otherId].created_at)) {
              grouped[otherId] = msg;
            }
          }
        });

        // Sort by latest message date descending
        const sortedKeys = Object.keys(grouped).sort((a, b) => 
          new Date(grouped[b].created_at) - new Date(grouped[a].created_at)
        );

        // Fetch user objects
        const chatsMap = new Map();

        const updateChatsState = () => {
          if (!isMounted) return;
          // preserve sorting
          const updatedChats = sortedKeys.map(k => chatsMap.get(k)).filter(Boolean);
          setRecentChats(updatedChats);
        };

        for (const otherId of sortedKeys) {
          chatsMap.set(otherId, { otherUser: {}, latestMessage: grouped[otherId] });
          
          const unsub = onSnapshot(doc(db, 'users', otherId), (docSnap) => {
            if (docSnap.exists()) {
              const otherUser = docSnap.data();
              const current = chatsMap.get(otherId);
              chatsMap.set(otherId, { ...current, otherUser });
              updateChatsState();
            }
          });
          unsubs.push(unsub);
        }

      } catch (e) {
        console.error("Failed to load recent chats", e);
      }
      if (isMounted) setLoading(false);
    };

    if (open && user && !selectedUser) {
      loadData();
    }

    return () => {
      isMounted = false;
      unsubs.forEach(unsub => unsub());
    };
  }, [open, user, selectedUser]);

  return (
    <Sheet open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setSelectedUser(null);
    }}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      {/* 
        Using w-full sm:max-w-md or similar allows it to slide in from the right.
        By default, SheetContent slides from right. 
      */}
      <SheetContent side="right" className="w-full sm:max-w-[400px] p-0 bg-slate-950 border-slate-800 flex flex-col h-full overflow-hidden">
        {selectedUser ? (
          <div className="flex-1 flex flex-col h-full w-full">
            <ChatWindow 
              user={user} 
              recipient={selectedUser} 
              onBack={() => setSelectedUser(null)} 
            />
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            <SheetHeader className="p-4 border-b border-slate-800 bg-slate-900">
              <SheetTitle className="text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#0ea5e9]" />
                Recent Chats
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0ea5e9]"></div>
                </div>
              ) : recentChats.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                  <p>No recent chats.</p>
                  <p className="text-xs mt-1">Start messaging your friends!</p>
                </div>
              ) : (
                <div className="divide-y divide-[#1f2029]">
                  {recentChats.map(chat => (
                    <div 
                      key={chat.otherUser.id} 
                      onClick={() => setSelectedUser(chat.otherUser)}
                      className="flex items-center gap-4 p-4 hover:bg-slate-900 cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12 border border-slate-700">
                          <AvatarImage src={chat.otherUser.avatar_url} />
                          <AvatarFallback>{chat.otherUser.ign?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a0c] ${chat.otherUser.activity_status === 'Online' ? 'bg-[#00e676]' : 'bg-gray-500'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-white truncate text-sm">{chat.otherUser.ign}</p>
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {new Date(chat.latestMessage.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${chat.latestMessage.sender_id !== user.id && !chat.latestMessage.read ? 'text-white font-semibold' : 'text-gray-400'}`}>
                          {chat.latestMessage.sender_id === user.id ? 'You: ' : ''}
                          {chat.latestMessage.message || chat.latestMessage.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
