import React, { useState, useEffect } from 'react';
import { Party, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gamepad2, LogOut, Copy, Users, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function PartySystem({ user }) {
  const [currentParty, setCurrentParty] = useState(null);
  const [partyMembers, setPartyMembers] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(true);

  const loadParty = async () => {
    setLoading(true);
    try {
      // Find if user is in any party (leader or member)
      const allParties = await Party.list("-created_date", 50); // simplified query for mock
      let myParty = null;
      for (const p of allParties) {
        if (p.leader_id === user.id || (p.members && p.members.includes(user.id))) {
          myParty = p;
          break;
        }
      }

      if (myParty) {
        setCurrentParty(myParty);
        // Load member details
        const membersData = await Promise.all(
          (myParty.members || []).map(async (uid) => await User.get(uid).catch(() => null))
        );
        setPartyMembers(membersData.filter(Boolean));
      } else {
        setCurrentParty(null);
        setPartyMembers([]);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    loadParty();
  }, [user.id]);

  const handleCreateParty = async () => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
      await Party.create({
        leader_id: user.id,
        members: [user.id],
        join_code: code,
        status: 'waiting'
      });
      toast.success("Party created!");
      loadParty();
    } catch (e) { toast.error("Failed to create party"); }
  };

  const handleJoinParty = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const parties = await Party.filter({ join_code: joinCode });
      if (parties.length === 0) {
        toast.error("Invalid join code");
        return;
      }
      const targetParty = parties[0];
      if (targetParty.members?.length >= 4) {
        toast.error("Party is full (Max 4)");
        return;
      }
      
      const newMembers = [...(targetParty.members || []), user.id];
      await Party.update(targetParty.id, { members: newMembers });
      toast.success("Joined party!");
      setJoinCode('');
      loadParty();
    } catch (e) { toast.error("Failed to join party"); }
  };

  const handleLeaveParty = async () => {
    if (!currentParty) return;
    try {
      if (currentParty.leader_id === user.id) {
        // Disband party if leader leaves
        await Party.delete(currentParty.id);
        toast.success("Party disbanded");
      } else {
        const newMembers = currentParty.members.filter(id => id !== user.id);
        await Party.update(currentParty.id, { members: newMembers });
        toast.success("Left party");
      }
      loadParty();
    } catch (e) { toast.error("Failed to leave party"); }
  };

  const copyCode = () => {
    if (currentParty?.join_code) {
      navigator.clipboard.writeText(currentParty.join_code);
      toast.success("Join code copied to clipboard!");
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {!currentParty ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left">
              <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto md:mx-0 mb-4 border border-purple-500/50">
                <Gamepad2 className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Play with Friends</h2>
              <p className="text-gray-400 mb-6">Create a party to play tournaments together, or join an existing party using a code.</p>
              <Button onClick={handleCreateParty} className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 font-bold">
                <Users className="w-4 h-4 mr-2" /> Create New Party
              </Button>
            </div>
            <div className="w-full md:w-px md:h-40 bg-gray-800" />
            <div className="flex-1 w-full">
              <h3 className="font-bold text-white mb-4">Have a Join Code?</h3>
              <form onSubmit={handleJoinParty} className="space-y-3">
                <Input 
                  placeholder="Enter 6-digit code" 
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="bg-gray-950 border-gray-800 text-center text-2xl tracking-[0.5em] font-mono h-14 uppercase"
                />
                <Button type="submit" disabled={joinCode.length < 6} className="w-full">
                  Join Party
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 overflow-hidden">
          <div className="bg-purple-900/30 border-b border-purple-500/30 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white">Your Party</h3>
              <span className="text-xs text-gray-400 ml-2">({partyMembers.length}/4)</span>
            </div>
            <div className="flex items-center gap-3">
              <div 
                onClick={copyCode}
                className="flex items-center gap-2 bg-gray-950/50 border border-gray-700 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-900 transition-colors"
              >
                <span className="text-xs text-gray-400 uppercase">Join Code:</span>
                <span className="font-mono font-bold text-white tracking-widest">{currentParty.join_code}</span>
                <Copy className="w-3 h-3 text-purple-400" />
              </div>
              <Button variant="destructive" size="sm" onClick={handleLeaveParty}>
                <LogOut className="w-4 h-4 mr-2" /> {currentParty.leader_id === user.id ? 'Disband' : 'Leave'}
              </Button>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Render Members */}
              {Array.from({ length: 4 }).map((_, i) => {
                const member = partyMembers[i];
                const isLeader = member && member.id === currentParty.leader_id;
                
                if (member) {
                  return (
                    <div key={member.id} className="bg-gray-950/50 rounded-xl p-4 flex flex-col items-center border border-gray-800 relative">
                      {isLeader && <div className="absolute -top-3 bg-yellow-500 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Leader</div>}
                      <Avatar className="w-16 h-16 mb-3 ring-2 ring-purple-500/50 ring-offset-2 ring-offset-gray-900">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>{member.ign?.[0]}</AvatarFallback>
                      </Avatar>
                      <p className="font-bold text-white text-sm text-center truncate w-full">{member.ign}</p>
                    </div>
                  );
                } else {
                  return (
                    <div key={i} className="bg-gray-900/30 rounded-xl p-4 flex flex-col items-center justify-center border border-dashed border-gray-700 h-full min-h-[140px]">
                      <Users className="w-8 h-8 text-gray-700 mb-2" />
                      <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">Empty Slot</p>
                    </div>
                  );
                }
              })}
            </div>
            
            <div className="mt-8 flex justify-center">
              <Button size="lg" disabled={currentParty.leader_id !== user.id} className="bg-green-600 hover:bg-green-700 font-black shadow-lg shadow-green-900/20 px-12">
                <Play className="w-5 h-5 mr-2" /> FIND MATCH
              </Button>
            </div>
            {currentParty.leader_id !== user.id && (
              <p className="text-center text-xs text-gray-500 mt-3">Waiting for party leader to find a match...</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
