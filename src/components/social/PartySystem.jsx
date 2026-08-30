import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Party, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gamepad2, LogOut, Copy, Users, Play, Settings, Volume2, MessageSquare, Shield, Activity, X } from 'lucide-react';
import { toast } from 'sonner';
import SharedChatInterface from '@/components/chat/SharedChatInterface';
import PartyGroupVoice from '@/components/chat/PartyGroupVoice';

export default function PartySystem({ user }) {
  const [currentParty, setCurrentParty] = useState(null);
  const [partyMembers, setPartyMembers] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showVoice, setShowVoice] = useState(false);

  const loadParty = async () => {
    setLoading(true);
    try {
      const allParties = await Party.list("-created_date", 50);
      let myParty = null;
      for (const p of allParties) {
        if (p.leader_id === user.id || (p.members && p.members.includes(user.id))) {
          myParty = p;
          break;
        }
      }

      if (myParty) {
        setCurrentParty(myParty);
        const membersData = await Promise.all(
          (myParty.members || []).map(async (uid) => await User.get(uid).catch(() => null))
        );
        setPartyMembers(membersData.filter(Boolean));
      } else {
        setCurrentParty(null);
        setPartyMembers([]);
        setShowInvitePanel(false);
        setShowVoice(false);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    loadParty();
  }, [user.id]);

  const handleCreateParty = async () => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      const newPartyData = {
        leader_id: user.id,
        members: [user.id],
        join_code: code,
        status: 'waiting',
        settings: {
          privacy: 'public',
          max_members: 10,
          voice_chat: true,
          party_chat: true
        },
        activities: [{
          id: Date.now().toString(),
          type: 'system',
          text: 'Party Created',
          timestamp: Date.now()
        }]
      };
      
      await Party.create(newPartyData);
      toast.success("Party created successfully!");
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
      if (targetParty.members?.length >= (targetParty.settings?.max_members || 10)) {
        toast.error("Party is full");
        return;
      }
      
      const newMembers = [...(targetParty.members || []), user.id];
      const newActivity = {
        id: Date.now().toString(),
        type: 'join',
        text: `${user.ign || 'User'} joined the party`,
        timestamp: Date.now()
      };
      const updatedActivities = [...(targetParty.activities || []), newActivity];

      await Party.update(targetParty.id, { 
        members: newMembers,
        activities: updatedActivities
      });
      
      toast.success("Joined party!");
      setJoinCode('');
      loadParty();
    } catch (e) { toast.error("Failed to join party"); }
  };

  const handleLeaveParty = async () => {
    if (!currentParty) return;
    try {
      if (currentParty.leader_id === user.id) {
        await Party.delete(currentParty.id);
        toast.success("Party disbanded");
      } else {
        const newMembers = currentParty.members.filter(id => id !== user.id);
        const newActivity = {
          id: Date.now().toString(),
          type: 'leave',
          text: `${user.ign || 'User'} left the party`,
          timestamp: Date.now()
        };
        const updatedActivities = [...(currentParty.activities || []), newActivity];

        await Party.update(currentParty.id, { 
          members: newMembers,
          activities: updatedActivities
        });
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
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full animate-ping" />
          <div className="absolute inset-2 border-4 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 px-4 pb-20">
      {!currentParty ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mt-10"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-2xl p-8 sm:p-12 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-purple-600/30 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-red-600/30 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 text-center md:text-left space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-red-600 p-[2px] shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                  <div className="w-full h-full rounded-3xl bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400 mb-4">
                    SQUAD UP
                  </h1>
                  <p className="text-lg text-gray-400 leading-relaxed">
                    Create a massive 10-player party. Talk in real-time with ultra-low latency group voice, coordinate strategies, and dominate the tournaments.
                  </p>
                </div>
                <Button 
                  onClick={handleCreateParty} 
                  className="w-full sm:w-auto px-8 h-14 bg-white hover:bg-gray-200 text-black rounded-xl font-black text-lg transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                  <Gamepad2 className="w-5 h-5 mr-3" /> CREATE PARTY
                </Button>
              </div>

              <div className="w-full md:w-px md:h-64 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

              <div className="flex-1 w-full space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Have a code?</h3>
                  <p className="text-sm text-gray-500">Join your squad's existing lobby.</p>
                </div>
                <form onSubmit={handleJoinParty} className="space-y-4">
                  <div className="relative">
                    <Input 
                      placeholder="ENTER 6-DIGIT CODE" 
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="h-16 bg-black/60 border-white/10 text-center text-3xl tracking-[0.3em] font-mono uppercase text-white rounded-2xl placeholder:text-gray-700 placeholder:text-lg focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={joinCode.length < 6} 
                    className="w-full h-14 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 hover:text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-purple-600/20"
                  >
                    JOIN PARTY
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Main Party View */}
          <div className="xl:col-span-3 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)]"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              
              {/* Header */}
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-red-600 p-[1px]">
                    <div className="w-full h-full bg-black/80 rounded-[15px] flex items-center justify-center">
                      <Gamepad2 className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-wide">PARTY LOBBY</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm font-medium">
                      <span className="text-purple-400">{partyMembers.length}/{currentParty.settings?.max_members || 10} MEMBERS</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600" />
                      <span className="text-gray-400 uppercase tracking-widest text-xs">Code: <span className="text-white font-mono">{currentParty.join_code}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <Button 
                    onClick={() => setShowVoice(!showVoice)}
                    className={`flex-1 sm:flex-none h-12 px-6 rounded-xl font-bold transition-all ${
                      showVoice ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    }`}
                  >
                    <Volume2 className="w-5 h-5 mr-2" />
                    {showVoice ? 'LEAVE VOICE' : 'JOIN VOICE'}
                  </Button>
                  <Button 
                    onClick={() => setShowInvitePanel(true)}
                    className="flex-1 sm:flex-none h-12 px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all border border-white/10"
                  >
                    <Users className="w-5 h-5 mr-2" /> INVITE
                  </Button>
                </div>
              </div>

              <div className="p-6 sm:p-8 relative min-h-[300px]">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none" />
                
                {showVoice && (
                  <div className="mb-8">
                    <PartyGroupVoice partyId={currentParty.id} user={user} onLeave={() => setShowVoice(false)} />
                  </div>
                )}

                {/* 10 Member Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 relative z-10">
                  {Array.from({ length: currentParty.settings?.max_members || 10 }).map((_, i) => {
                    const member = partyMembers[i];
                    const isLeader = member && member.id === currentParty.leader_id;
                    
                    if (member) {
                      return (
                        <motion.div 
                          key={member.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className={`relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center min-h-[160px] border ${
                            isLeader ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/10 bg-white/5'
                          }`}
                        >
                          {isLeader && (
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-600" />
                          )}
                          <Avatar className={`w-20 h-20 mb-4 ring-2 ring-offset-4 ring-offset-black ${isLeader ? 'ring-yellow-500' : 'ring-purple-500'}`}>
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="bg-gray-800 text-xl font-black">{member.ign?.[0]}</AvatarFallback>
                          </Avatar>
                          <p className="font-bold text-white text-sm text-center truncate w-full">{member.ign}</p>
                          {isLeader && <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mt-1">LEADER</span>}
                        </motion.div>
                      );
                    } else {
                      return (
                        <div key={i} className="rounded-2xl p-4 flex flex-col items-center justify-center min-h-[160px] border border-dashed border-white/10 bg-white/[0.02]">
                          <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-white/20" />
                          </div>
                          <p className="text-xs text-white/30 font-bold uppercase tracking-wider">Empty Slot</p>
                        </div>
                      );
                    }
                  })}
                </div>

                <div className="mt-12 flex justify-center">
                  <Button 
                    size="lg" 
                    disabled={currentParty.leader_id !== user.id} 
                    className="h-16 px-16 bg-white hover:bg-gray-200 text-black font-black text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
                  >
                    <Play className="w-6 h-6 mr-3 fill-current" /> FIND MATCH
                  </Button>
                </div>
                {currentParty.leader_id !== user.id && (
                  <p className="text-center text-xs text-gray-500 mt-6 font-bold uppercase tracking-widest">WAITING FOR PARTY LEADER TO START...</p>
                )}
              </div>
            </motion.div>

            {/* Chat Interface Integrated Below LOBBY */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="h-[500px] overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)]"
            >
              <SharedChatInterface 
                roomType="group" 
                groupId={currentParty.id} 
                roomTitle="Party Chat & Polls" 
                isGlobal={false} 
                user={user} 
              />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Settings</h3>
                {currentParty.leader_id === user.id && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Host</span>
                )}
              </div>
              
              <div className="p-6 space-y-6">
                {/* Privacy */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Party Privacy
                  </label>
                  <div className="flex flex-col gap-2">
                    {['public', 'friends', 'private'].map((type) => (
                      <button
                        key={type}
                        disabled={currentParty.leader_id !== user.id}
                        onClick={() => {
                          if (currentParty.leader_id === user.id) {
                            Party.update(currentParty.id, { 'settings.privacy': type });
                          }
                        }}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                          currentParty.settings?.privacy === type 
                            ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' 
                            : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <span className="capitalize">
                          {type === 'private' ? 'Private (Code)' : type}
                        </span>
                        {currentParty.settings?.privacy === type && <div className="w-2 h-2 bg-purple-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,1)]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                <div className="pt-2">
                  <Button 
                    variant="destructive" 
                    onClick={handleLeaveParty} 
                    className="w-full h-12 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-500 font-bold border border-red-500/30 transition-all"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> 
                    {currentParty.leader_id === user.id ? 'DISBAND PARTY' : 'LEAVE PARTY'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      )}

      {/* Modern Invite Slide-in Panel */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showInvitePanel && (
            <div className="fixed inset-0 z-[99999] flex justify-end" style={{ pointerEvents: 'auto' }}>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={() => setShowInvitePanel(false)}
              />
              
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full sm:w-[400px] h-full bg-slate-950 border-l border-white/10 shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="font-black text-white text-lg tracking-wide flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    INVITE SQUAD
                  </h3>
                  <button 
                    onClick={() => setShowInvitePanel(false)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-8 flex-1 overflow-y-auto">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 to-red-600/20 border border-purple-500/30 p-8 text-center mb-8 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full" />
                    <h4 className="text-purple-300 text-xs font-black uppercase tracking-widest mb-4">Your Party Code</h4>
                    <div className="text-5xl font-black text-white tracking-[0.2em] font-mono mb-6 bg-black/50 py-6 rounded-xl border border-white/10 shadow-inner">
                      {currentParty?.join_code}
                    </div>
                    <Button onClick={copyCode} className="w-full h-14 bg-white hover:bg-gray-200 text-black font-black text-sm rounded-xl">
                      <Copy className="w-4 h-4 mr-2" /> COPY CODE
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
