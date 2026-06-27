import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare, Gamepad2 } from 'lucide-react';
import FriendList from '@/components/social/FriendList';
import DirectMessageList from '@/components/social/DirectMessageList';
import PartySystem from '@/components/social/PartySystem';
import { useAuth } from '@/lib/AuthContext';

export default function Social() {
  const { user } = useAuth();
  
  if (!user) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Please login to access social features.</div>;
  }

  return (
    <div className="min-h-screen bg-[#0e1015] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black text-white">Social Hub</h1>
          <p className="text-gray-400">Connect, chat, and party up with friends.</p>
        </div>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="friends" className="flex items-center gap-2"><Users className="w-4 h-4" /> Friends</TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Messages</TabsTrigger>
            <TabsTrigger value="party" className="flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> Party</TabsTrigger>
          </TabsList>
          
          <TabsContent value="friends" className="mt-6">
            <FriendList user={user} />
          </TabsContent>
          
          <TabsContent value="messages" className="mt-6">
            <DirectMessageList user={user} />
          </TabsContent>

          <TabsContent value="party" className="mt-6">
            <PartySystem user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
