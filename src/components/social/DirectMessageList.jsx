import React, { useState, useEffect } from 'react';
import { DirectMessage, User, Friendship } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ChatWindow from './ChatWindow';
import { MessageSquare } from 'lucide-react';

export default function DirectMessageList({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Basic implementation: Load friends to chat with
    const loadFriends = async () => {
      setLoading(true);
      try {
        const [sent, received] = await Promise.all([
          Friendship.filter({ user_id: user.id }),
          Friendship.filter({ friend_id: user.id })
        ]);
        const allRelations = [...sent, ...received].filter(rel => rel.status === 'accepted');
        
        const uniqueConvos = [];
        const seen = new Set();
        
        for (const rel of allRelations) {
          const otherId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
          if (!seen.has(otherId)) {
            seen.add(otherId);
            uniqueConvos.push(otherId);
          }
        }
        
        const convos = await Promise.all(
          uniqueConvos.map(async (otherId) => await User.get(otherId).catch(() => null))
        );
        
        setConversations(convos.filter(Boolean));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    loadFriends();
  }, [user]);

  if (activeChat) {
    return <ChatWindow user={user} recipient={activeChat} onBack={() => setActiveChat(null)} />;
  }

  return (
    <Card className="bg-gray-900 border-gray-800 min-h-[60vh]">
      <CardContent className="p-0 flex">
        <div className="w-full">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-bold text-white">Direct Messages</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                No friends to chat with yet. Add friends to start messaging!
              </div>
            ) : conversations.map(cUser => (
              <div 
                key={cUser.id} 
                onClick={() => setActiveChat(cUser)}
                className="flex items-center gap-4 p-4 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={cUser.avatar_url} />
                    <AvatarFallback>{cUser.ign?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${cUser.activity_status === 'Online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{cUser.ign}</p>
                  <p className="text-sm text-gray-400 truncate">Tap to start chatting...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
