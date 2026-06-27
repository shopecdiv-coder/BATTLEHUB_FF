import React, { useState, useEffect, useRef } from 'react';
import { DirectMessage } from '@/api/entities';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatWindow({ user, recipient, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const loadMessages = async () => {
    try {
      // Basic poll since we removed real-time presence/sockets for now
      // A full implementation would use Firebase onSnapshot for real-time
      const [sent, received] = await Promise.all([
        DirectMessage.filter({ sender_id: user.id, recipient_id: recipient.id }),
        DirectMessage.filter({ sender_id: recipient.id, recipient_id: user.id })
      ]);
      const allMsgs = [...sent, ...received].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setMessages(allMsgs);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // Simple 5s poll for new messages
    return () => clearInterval(interval);
  }, [user.id, recipient.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const msgData = {
      sender_id: user.id,
      recipient_id: recipient.id,
      message: newMessage,
      type: 'text',
      read: false,
      created_at: new Date().toISOString()
    };
    
    // Optimistic UI update
    setMessages(prev => [...prev, { id: 'temp_' + Date.now(), ...msgData }]);
    setNewMessage('');
    
    try {
      await DirectMessage.create(msgData);
      loadMessages(); // Refresh actual ids
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gray-950 border-b border-gray-800">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={recipient.avatar_url} />
          <AvatarFallback>{recipient.ign?.[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-bold text-white">{recipient.ign}</h3>
          <p className="text-xs text-gray-400">{recipient.activity_status || 'Offline'}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Start the conversation!</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-gray-800 text-gray-200 rounded-bl-sm'}`}>
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-purple-200' : 'text-gray-500'}`}>
                    {format(new Date(msg.created_at), 'hh:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-950 border-t border-gray-800">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder={`Message @${recipient.ign}...`}
            className="flex-1 bg-gray-900 border-gray-800 text-white"
          />
          <Button type="submit" disabled={!newMessage.trim()} className="bg-purple-600 hover:bg-purple-700">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
