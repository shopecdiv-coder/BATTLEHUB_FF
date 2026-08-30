import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Party, User, Friendship, PartyInvite } from '@/api/entities';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Users, Copy, Gamepad2, Check, Search, UserPlus, Plus, Settings,
  Crown, ChevronLeft, RefreshCw, Send, Zap, Share2, QrCode, MessageSquare, X, LogOut, Lock, Mic2, MicOff, Volume2, Map, Camera, CameraOff, Megaphone, SmilePlus, MonitorUp, Maximize, Minimize, ChevronUp, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import SharedChatInterface from '@/components/chat/SharedChatInterface';
import { Share } from '@capacitor/share';
import { db } from '@/api/firebaseClient';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { useCall } from '@/lib/CallContext';
import { useAgoraVoice } from '@/hooks/useAgoraVoice';
import StrategyMap from '@/components/party/StrategyMap';
import ShareDrawer from '@/components/shared/ShareDrawer';
import VideoPlayer from '@/components/party/VideoPlayer';
import PlayerProfile from '@/pages/PlayerProfile';

// ─── helpers ──────────────────────────────────────────────────────────────────
function generateCode() {
  const chars = '0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── member slot ──────────────────────────────────────────────────────────────
function MemberSlot({ member, isLeader, isYou, canKick, onKick, onClick }) {
  if (member) {
    return (
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className="flex flex-col items-center gap-2 relative group cursor-pointer"
        onClick={() => onClick && onClick(member)}
      >
        {canKick && !isLeader && !isYou && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to kick ${member.ign}?`)) {
                onKick(member);
              }
            }}
            className="absolute -top-2 -right-4 bg-red-600 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-[0_0_10px_rgba(220,38,38,0.5)] hover:bg-red-500 hover:scale-110"
          >
            KICK
          </button>
        )}
        <div className="relative">
          <Avatar className={`w-12 h-12 border-2 ring-2 ring-offset-2 ring-offset-black ${isLeader ? 'border-yellow-500 ring-yellow-500/30' : 'border-purple-500 ring-purple-500/30'}`}>
            <AvatarImage src={member.avatar_url} className="object-cover" />
            <AvatarFallback className="bg-gray-900 text-white font-black text-sm">
              {member.ign?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isLeader && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,1)]" />
            </div>
          )}
          {isYou && !isLeader && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
          )}
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-white truncate max-w-[60px]">{member.ign}</p>
          {isLeader && <p className="text-[8px] text-yellow-500 font-black uppercase tracking-wider">Leader</p>}
          {isYou && !isLeader && <p className="text-[8px] text-green-500 font-black uppercase tracking-wider">You</p>}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center">
        <Users className="w-4 h-4 text-white/20" />
      </div>
      <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Open</p>
    </div>
  );
}

// ─── friend row ───────────────────────────────────────────────────────────────
function FriendRow({ friend: initialFriend, currentParty, onInvite, onProfileClick }) {
  const [friend, setFriend] = useState(initialFriend);
  const [invited, setInvited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);
  const isInParty = currentParty?.members?.includes(friend.id);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000); // 5 sec interval for REAL TIME
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setFriend(initialFriend);
    
    if (!initialFriend?.id) return;
    
    const unsubscribe = onSnapshot(doc(db, 'users', initialFriend.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFriend(prev => ({
          ...prev,
          activity_status: data.activity_status,
          status: data.status,
          last_seen: data.last_seen,
          last_active: data.last_active
        }));
      }
    });

    return () => unsubscribe();
  }, [initialFriend?.id, initialFriend]);

  const handleInvite = async () => {
    if (isInParty || invited) return;
    setLoading(true);
    await onInvite(friend);
    setInvited(true);
    setLoading(false);
  };

  const getStatus = () => {
    if (!friend) return { color: 'bg-gray-500' };
    
    const status = friend.activity_status || 'Offline';
    
    if (status === 'In Match') {
      return { color: 'bg-[#0ea5e9]' }; // Blue for In Match
    }
    
    if (status === 'Online') {
      const diff = new Date() - new Date(friend.last_active || 0);
      if (diff < 15 * 60 * 1000) { // 15 minutes like ProfileHeaderV2
        return { color: 'bg-[#00e676]' }; // Green for Online
      }
    }
    
    return { color: 'bg-gray-500' }; // Grey for Offline
  };

  const currentStatus = getStatus();

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center gap-3 backdrop-blur-md"
    >
      <div className="relative cursor-pointer" onClick={onProfileClick}>
        <Avatar className="w-10 h-10 border border-white/10 hover:border-purple-500 transition-colors">
          <AvatarImage src={friend.avatar_url} className="object-cover" />
          <AvatarFallback className="bg-gray-800 text-white font-black">{friend.ign?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className={`absolute bottom-0 right-0 w-3 h-3 ${currentStatus.color} border-2 border-[#161a20] rounded-full ${currentStatus.color === 'bg-[#00e676]' || currentStatus.color === 'bg-[#0ea5e9]' ? `shadow-[0_0_5px_rgba(${currentStatus.color === 'bg-[#00e676]' ? '0,230,118' : '14,165,233'},0.5)]` : ''}`}></div>
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onProfileClick}>
        <p className="font-bold text-white text-sm truncate hover:text-purple-400 transition-colors">{friend.ign}</p>
        <p className="text-[10px] text-gray-400">UID: {friend.unique_id || friend.id?.slice(0, 8)}</p>
      </div>
      <button
        onClick={handleInvite}
        disabled={isInParty || invited || loading}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0
          ${isInParty
            ? 'bg-white/5 text-gray-500'
            : invited
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)] active:scale-95'
          }
        `}
      >
        {loading ? (
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isInParty ? (
          <Check className="w-4 h-4" />
        ) : invited ? (
          <Check className="w-4 h-4" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </button>
    </motion.div>
  );
}

// ─── code card ────────────────────────────────────────────────────────────────
function PartyCodeCard({ code, onCopy, copied }) {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-purple-900/40 to-red-950/40 border border-purple-500/30 p-1">
      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/20 blur-2xl rounded-full pointer-events-none" />
      <div className="bg-black/60 backdrop-blur-xl rounded-xl p-5 flex flex-col items-center">
        <p className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em] mb-3">Party Code</p>
        
        <div className="flex gap-2 mb-2">
          {code?.split('').map((char, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.02, type: 'spring', stiffness: 600, damping: 28 }}
              className="w-8 h-10 sm:w-10 sm:h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shadow-inner"
            >
              <span className="text-xl sm:text-2xl font-black text-white font-mono">{char}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DRAWER COMPONENT ────────────────────────────────────────────────────
export default function PartyInviteDrawer({ children, user }) {
  const [open, setOpen] = useState(false);
  const [currentParty, setCurrentParty] = useState(null);
  const [partyMembers, setPartyMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [editPartyName, setEditPartyName] = useState('');
  const [editPartyPrivacy, setEditPartyPrivacy] = useState('public');
  const [editPartyVoice, setEditPartyVoice] = useState(true);
  const [editPartyEmojiSound, setEditPartyEmojiSound] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('lobby'); // lobby | chat | voice | strategy
  const [voiceEffectIndex, setVoiceEffectIndex] = useState(0);
  const [expandedVideoId, setExpandedVideoId] = useState(null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [showShareDrawer, setShowShareDrawer] = useState(false);
  const [viewProfileId, setViewProfileId] = useState(null);
  const voiceEffects = [
    { id: 'OFF', label: 'Normal Voice' },
    { id: 'ROOM_ACOUSTICS_KTV', label: 'KTV Echo' },
    { id: 'VOICE_CHANGER_EFFECT_HULK', label: 'Monster Voice' },
    { id: 'VOICE_CHANGER_EFFECT_UNCLE', label: 'Deep Voice' }
  ];

  const handleVoiceChanger = () => {
    if (!voiceController || !voiceController.setVoiceEffect) {
      toast.error("Voice controller not ready");
      return;
    }
    const nextIndex = (voiceEffectIndex + 1) % voiceEffects.length;
    setVoiceEffectIndex(nextIndex);
    voiceController.setVoiceEffect(voiceEffects[nextIndex].id);
    toast.success(`Voice Effect: ${voiceEffects[nextIndex].label}`);
  };

  // local state for tabs
  // friends logic
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [unreadMap, setUnreadMap] = useState({});

  const [swipeOffset, setSwipeOffset] = useState(0);

  const voiceController = useAgoraVoice({ 
    partyId: currentParty?.id, 
    user,
    partyMembers
  });

  const hasActiveVideo = Boolean(voiceController?.localVideoTrack || (voiceController?.remoteVideoTracks && Object.keys(voiceController.remoteVideoTracks).length > 0));


  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPrivacy, setNewPartyPrivacy] = useState('public');
  const [newPartyVoice, setNewPartyVoice] = useState(true);
  const prevMemberIdsRef = useRef([]);
  const userActionRef = useRef(false);
  const [kickInProgress, setKickInProgress] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.IS_PARTY_DRAWER_OPEN = open;
    if (open) {
      document.body.classList.add('hide-bottom-nav');
    } else {
      document.body.classList.remove('hide-bottom-nav');
    }
    return () => { 
      window.IS_PARTY_DRAWER_OPEN = false; 
      document.body.classList.remove('hide-bottom-nav');
    };
  }, [open]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openDrawer') === 'party') {
      setOpen(true);
      
      const incomingCode = params.get('joinCode');
      if (incomingCode) {
        setActiveTab('lobby');
        setTimeout(() => {
          handleJoinParty(null, incomingCode);
        }, 500); // small delay to ensure states are ready
      } else {
        setActiveTab('chat');
      }

      // Clear URL params
      navigate(location.pathname, { replace: true });
    } else if (params.get('openDrawer') && params.get('openDrawer') !== 'party') {
      // If URL wants to open a different drawer (e.g. message), close this one
      setOpen(false);
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-party-drawer', handleOpen);
    
    const handleUnreadUpdate = (e) => {
      if (e.detail?.unreadMap) {
        setUnreadMap(e.detail.unreadMap);
      }
    };
    window.addEventListener('profileUnreadUpdated', handleUnreadUpdate);
    
    return () => {
      window.removeEventListener('open-party-drawer', handleOpen);
      window.removeEventListener('profileUnreadUpdated', handleUnreadUpdate);
    };
  }, []);

  useEffect(() => {
    if (currentParty?.settings?.voice_enabled === false && activeTab === 'voice') {
      setActiveTab('code');
    }
  }, [currentParty?.settings?.voice_enabled, activeTab]);

  useEffect(() => {
    if (!user || !user.id) return;

    setLoading(true);
    const q = query(
      collection(db, 'parties'),
      where('members', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      if (!snap.empty) {
        // Assume user is in at most one party
        const partyDoc = snap.docs[0];
        const myParty = { id: partyDoc.id, ...partyDoc.data() };
        setCurrentParty(myParty);
        
        const membersData = await Promise.all(
          (myParty.members || []).map(async (uid) => await User.get(uid).catch(() => null))
        );
        const validMembers = membersData.filter(Boolean);
        setPartyMembers(validMembers);
        
        // Check for new members to play sound
        const newIds = validMembers.map(m => m.id);
        const oldIds = prevMemberIdsRef.current;
        if (oldIds.length > 0) {
          if (oldIds.length < newIds.length) {
            const addedMembers = validMembers.filter(m => !oldIds.includes(m.id));
            if (addedMembers.length > 0) {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {});
              addedMembers.forEach(m => {
                const name = m.ign || m.full_name || 'A user';
                toast.custom((t) => (
                  <div className="bg-emerald-950/90 backdrop-blur-xl border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-emerald-100 text-xs font-bold tracking-wide">{name} joined</span>
                  </div>
                ), { duration: 2500, id: `join-${m.id}` });
              });
            }
          } else if (oldIds.length > newIds.length) {
            const removed = oldIds.filter(id => !newIds.includes(id));
            if (removed.length > 0) {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
              audio.volume = 0.5;
              audio.play().catch(() => {});
              removed.forEach(async (id) => {
                const u = await User.get(id).catch(() => null);
                const name = u?.ign || u?.full_name || 'A user';
                toast.custom((t) => (
                  <div className="bg-red-950/90 backdrop-blur-xl border border-red-500/30 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-red-100 text-xs font-bold tracking-wide">{name} left</span>
                  </div>
                ), { duration: 2500, id: `leave-${id}` });
              });
            }
          }
        }
        prevMemberIdsRef.current = newIds;
        setLoading(false);
      } else {
        // Not in any party
        const wasInParty = prevMemberIdsRef.current.length > 0;
        setCurrentParty(null);
        setPartyMembers([]);
        prevMemberIdsRef.current = [];
        
        if (wasInParty && !userActionRef.current) {
          // If they were involuntarily removed, close the drawer so the global popup is clickable
          setOpen(false);
        }
        
        userActionRef.current = false;
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  const lastSoundTimestampRef = useRef(0);

  useEffect(() => {
    if (!currentParty?.id) return;
    const unsub = onSnapshot(doc(db, 'party_sounds', currentParty.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.timestamp > Date.now() - 5000 && data.timestamp > lastSoundTimestampRef.current) {
          lastSoundTimestampRef.current = data.timestamp;
          
          if (data.triggeredBy && data.triggeredBy !== (user?.ign || user?.username)) {
            toast(`${data.triggeredBy} played a sound! 🔊`, { duration: 2000, position: 'top-center' });
          }

          // Play sound
          const soundUrls = {
            airhorn: 'https://www.myinstants.com/media/sounds/mlg-airhorn.mp3',
            laugh: 'https://www.myinstants.com/media/sounds/laugh-track.mp3',
            op: 'https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3',
            oof: 'https://www.myinstants.com/media/sounds/roblox-death-sound_1.mp3',
            vine_boom: 'https://www.myinstants.com/media/sounds/vine-boom.mp3',
            fart: 'https://www.myinstants.com/media/sounds/fart-with-reverb.mp3',
            bruh: 'https://www.myinstants.com/media/sounds/movie_1.mp3',
            nani: 'https://www.myinstants.com/media/sounds/dun-dun-dun.mp3'
          };
          if (soundUrls[data.soundId] && currentParty.settings?.emoji_sound_enabled !== false) {
            const audio = new Audio(soundUrls[data.soundId]);
            audio.volume = 0.5;
            audio.play().catch(e => console.error("Audio play blocked", e));
          }
        }
      }
    });
    return () => unsub();
  }, [currentParty?.id, user]);

  const triggerSound = async (soundId) => {
    if (!currentParty?.id) return;
    if (currentParty.settings?.emoji_sound_enabled === false) {
      toast.error("Emoji sounds are disabled by host");
      return;
    }
    try {
      await setDoc(doc(db, 'party_sounds', currentParty.id), {
        soundId,
        timestamp: Date.now(),
        triggeredBy: user?.ign || user?.username || 'Someone'
      });
    } catch (err) {
      console.error("Failed to trigger sound", err);
    }
  };

  useEffect(() => {
    if (open) {
      loadFriends();
      setActiveTab('code'); // reset to code tab on open
    }
  }, [open]);

  useEffect(() => {
    if (activeTab === 'chat' && currentParty?.id) {
      localStorage.setItem(`chat_read_${currentParty.id}`, Date.now().toString());
      window.dispatchEvent(new CustomEvent('chatRead', { detail: { chatId: currentParty.id } }));
    }
  }, [activeTab, currentParty?.id]);

  // Keep a stub for loadParty as onSnapshot handles real-time updates now
  const loadParty = async () => {};

  const loadFriends = async () => {
    setFriendsLoading(true);
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
      if (uniqueConvos.length > 0) {
        const friendData = await Promise.all(uniqueConvos.map(id => User.get(id).catch(() => null)));
        setFriends(friendData.filter(Boolean));
      } else {
        setFriends([]);
      }
    } catch (e) { console.error(e); }
    setFriendsLoading(false);
  };

  const handleCreateParty = async (e) => {
    if (e) e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const code = generateCode();
      const newPartyData = {
        name: newPartyName.trim() || `${user.ign || 'My'} Squad`,
        leader_id: user.id,
        members: [user.id],
        join_code: code,
        status: 'waiting',
        settings: {
          privacy: newPartyPrivacy,
          max_members: 10,
          voice_chat: newPartyVoice,
          party_chat: true
        }
      };
      await Party.create(newPartyData);
      toast.success("Party created!");
      setShowCreateForm(false);
      await loadParty();
    } catch (e) {
      toast.error("Failed to create party");
    }
    setCreating(false);
  };

  const handleJoinParty = async (e, specificCode = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const codeToUse = specificCode || joinCode;
    if (!codeToUse || !codeToUse.trim()) return;
    try {
      const parties = await Party.filter({ join_code: codeToUse });
      if (parties.length === 0) {
        toast.error("Invalid join code");
        return;
      }
      const targetParty = parties[0];
      
      if (targetParty.members?.includes(user.id)) {
        toast.info("You are already joined in this party!");
        setJoinCode('');
        return;
      }
      
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
      await loadParty();
    } catch (err) { toast.error("Failed to join party"); }
  };

  const copyCode = () => {
    if (currentParty?.join_code) {
      navigator.clipboard.writeText(currentParty.join_code);
      setCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sharePartyLink = () => {
    setShowShareDrawer(true);
  };

  const handleInviteFriend = async (friend) => {
    if (!currentParty) return;
    try {
      await PartyInvite.create({
        sender_id: user.id,
        sender_name: user.ign || 'Someone',
        recipient_id: friend.id,
        party_id: currentParty.id,
        status: 'pending',
        timestamp: Date.now()
      });
      toast.success(`Invite sent to ${friend.ign}`);
    } catch (err) {
      toast.error("Failed to send invite");
    }
  };

  const filteredFriends = friends.filter(f => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (f.ign && f.ign.toLowerCase().includes(query)) ||
           (f.username && f.username.toLowerCase().includes(query)) ||
           (f.name && f.name.toLowerCase().includes(query));
  });

  const handleDisband = async () => {
    if (!currentParty || currentParty.leader_id !== user.id) return;
    if (!window.confirm("Are you sure you want to delete this party?")) return;
    userActionRef.current = true;
    try {
      await Party.update(currentParty.id, { status: 'disbanded' });
      await Party.delete(currentParty.id);
      toast.success("Party disbanded successfully!");
      setOpen(false);
    } catch(e) {
      toast.error("Failed to disband party");
    }
  };

  const handleLeaveParty = async () => {
    if (!currentParty || currentParty.leader_id === user.id) return;
    if (!window.confirm("Are you sure you want to leave the party?")) return;
    userActionRef.current = true;
    window.__partyLeaveVoluntary = true; // prevent kicked popup
    try {
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
      
      toast.success("You left the party.");
      setOpen(false);
    } catch (err) { 
      window.__partyLeaveVoluntary = false;
      toast.error("Failed to leave party"); 
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!currentParty || currentParty.leader_id !== user.id) return;
    
    setSavingSettings(true);
    try {
      await Party.update(currentParty.id, {
        name: editPartyName || 'SQUAD HUB',
        settings: {
          ...currentParty.settings,
          privacy: editPartyPrivacy,
          voice_enabled: editPartyVoice,
          emoji_sound_enabled: editPartyEmojiSound
        }
      });
      toast.success("Party settings updated");
      setShowSettingsPanel(false);
    } catch(err) {
      toast.error("Failed to update settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleKickMember = async (targetUser) => {
    if (!currentParty || currentParty.leader_id !== user.id) return;
    try {
      const newMembers = currentParty.members.filter(id => id !== targetUser.id);
      const newActivity = {
        id: Date.now().toString(),
        type: 'kick',
        text: `${targetUser.ign || 'User'} was kicked by the leader`,
        timestamp: Date.now()
      };
      const updatedActivities = [...(currentParty.activities || []), newActivity];

      await Party.update(currentParty.id, { 
        members: newMembers,
        activities: updatedActivities
      });
      
      toast.success(`${targetUser.ign || 'User'} was kicked.`);
      await loadParty();
    } catch (err) { toast.error("Failed to kick member"); }
  };

  const baseTabs = [
    { id: 'code', icon: QrCode, label: 'Lobby' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' }
  ];
  
  const tabs = currentParty?.settings?.voice_enabled === false 
    ? baseTabs 
    : [...baseTabs, { id: 'voice', icon: Mic2, label: 'Voice & Video' }, { id: 'strategy', icon: Map, label: 'Strategy' }];

  if (!user) return null;

  return (
    <>
      {children && React.cloneElement(children, {
        onClick: (e) => {
          if (children.props.onClick) children.props.onClick(e);
          setOpen(true);
        }
      })}

      {open && (
        <div className="fixed inset-0 w-full h-full max-w-none sm:max-w-none bg-[#0c0d12] border-none !p-0 flex flex-col z-[1000] overflow-hidden [&>button]:hidden gap-0 animate-in slide-in-from-right-full duration-300">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-600/5 blur-[150px] rounded-full pointer-events-none" />

          {/* ── Header ── */}
          {activeTab !== 'strategy' && (
            <div className="p-3 border-b border-white/10 bg-white/[0.02] flex flex-row items-center justify-between gap-4 space-y-0 relative z-10">
            <div className="flex items-center gap-3">
              <button onClick={() => setOpen(false)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-white font-black uppercase tracking-widest text-lg sm:text-xl truncate max-w-[200px] sm:max-w-[250px]">
                {currentParty?.name || 'SQUAD HUB'}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
            {currentParty && currentParty.leader_id === user.id ? (
              <>
                <button 
                  onClick={() => {
                    setEditPartyName(currentParty.name);
                    setEditPartyPrivacy(currentParty.settings?.privacy || 'public');
                    setEditPartyVoice(currentParty.settings?.voice_enabled ?? true);
                    setEditPartyEmojiSound(currentParty.settings?.emoji_sound_enabled ?? true);
                    setShowSettingsPanel(true);
                  }}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-lg border border-white/10 transition-all flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" /> <span className="hidden sm:inline">SETTINGS</span>
                </button>
                <button 
                  onClick={handleDisband}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-lg border border-red-500/30 transition-all flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4 hidden sm:block" /> DELETE PARTY
                </button>
              </>
            ) : currentParty && currentParty.leader_id !== user.id ? (
              <button 
                onClick={handleLeaveParty}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-lg border border-red-500/30 transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4 hidden sm:block" /> LEAVE PARTY
              </button>
            ) : null}
            </div>
            </div>
          )}

          <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
          {!loading && !currentParty && (
            <div className="p-6 h-full flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto custom-scrollbar">
              <div className="relative w-24 h-24 flex-shrink-0">
                <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-500 to-red-600 p-[2px]">
                  <div className="w-full h-full bg-[#0c0d12] rounded-2xl flex items-center justify-center">
                    <Users className="w-10 h-10 text-purple-400" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">NO PARTY YET</h3>
                <p className="text-sm text-gray-400">Create a 10-player party to play together, chat, and voice call with ultra-low latency.</p>
              </div>
              {!showCreateForm ? (
                <button
                  onClick={() => {
                    setNewPartyName(`${user.ign || 'My'} Squad`);
                    setShowCreateForm(true);
                  }}
                  disabled={creating}
                  className="w-full py-4 bg-white hover:bg-gray-200 text-black font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 active:scale-95"
                >
                  CREATE PARTY NOW
                </button>
              ) : (
                <form onSubmit={handleCreateParty} className="w-full space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Party Name</label>
                    <Input
                      placeholder="My Awesome Squad"
                      value={newPartyName}
                      onChange={e => setNewPartyName(e.target.value)}
                      maxLength={30}
                      className="bg-black/60 border-white/10 text-white rounded-lg focus:border-purple-500 h-10"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Privacy</h4>
                      <p className="text-[10px] text-gray-500">Who can join your party</p>
                    </div>
                    <select 
                      value={newPartyPrivacy}
                      onChange={e => setNewPartyPrivacy(e.target.value)}
                      className="bg-black/60 border border-white/10 text-white text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-purple-500"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Voice Chat</h4>
                      <p className="text-[10px] text-gray-500">Enable squad voice channel</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewPartyVoice(!newPartyVoice)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${newPartyVoice ? 'bg-purple-600' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newPartyVoice ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Confirm'}
                    </button>
                  </div>
                </form>
              )}

              <div className="w-full pt-6 border-t border-white/10 space-y-4">
                <div>
                  <h4 className="text-white font-bold mb-1">Join existing party</h4>
                  <p className="text-xs text-gray-500">Enter a 6-digit code to join your friends.</p>
                </div>
                <form onSubmit={handleJoinParty} className="flex gap-2">
                  <Input
                    placeholder="CODE"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="flex-1 bg-black/60 border-white/10 text-center text-lg tracking-[0.2em] font-mono uppercase text-white rounded-xl placeholder:text-gray-700 focus:border-purple-500/50 h-12"
                  />
                  <button
                    type="submit"
                    disabled={joinCode.length < 6}
                    className="px-6 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/30 text-white font-bold rounded-xl transition-all disabled:text-white/30 h-12"
                  >
                    JOIN
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Party Content */}
          {!loading && currentParty && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Tab Bar */}
              <div className="flex border-b border-white/5 bg-black/40 flex-shrink-0">
                {tabs.map(tab => {
                  const hasUnread = tab.id === 'chat' && currentParty?.id && unreadMap[currentParty.id] > 0;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex-1 flex items-center justify-center gap-2 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-colors border-b-2
                        ${activeTab === tab.id
                          ? 'border-purple-500 text-white bg-purple-500/5'
                          : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {hasUnread && (
                        <span className="absolute top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col flex-1 relative overflow-hidden bg-black/20">
                  <div
                    className={`absolute inset-0 p-5 space-y-6 overflow-y-auto custom-scrollbar transition-all duration-200 ${activeTab === 'code' ? 'opacity-100 z-10 pointer-events-auto translate-x-0' : 'opacity-0 z-0 pointer-events-none -translate-x-4'}`}
                  >
                    <div>
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">SQUAD LOBBY (10 MAX)</h4>
                      {/* Compact 10 member grid for drawer */}
                      <div className="grid grid-cols-5 gap-y-4 gap-x-2">
                        {Array.from({ length: 10 }).map((_, i) => {
                          const member = partyMembers[i];
                          const isLeader = member && member.id === currentParty.leader_id;
                          const isYou = member && member.id === user.id;
                          const iAmLeader = currentParty.leader_id === user.id;
                          return (
                            <MemberSlot 
                              key={member ? member.id : `empty-${i}`} 
                              member={member} 
                              isLeader={isLeader} 
                              isYou={isYou} 
                              canKick={iAmLeader}
                              onKick={handleKickMember}
                              onClick={(m) => m.id !== user.id && setViewProfileId(m.id)}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-px bg-white/10" />

                    {currentParty.settings?.privacy === 'private' && currentParty.leader_id !== user.id ? (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-2">
                        <Lock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">PRIVATE PARTY</h4>
                        <p className="text-xs text-gray-400">Only the party leader can see the join code and invite friends.</p>
                      </div>
                    ) : (
                      <>
                        <PartyCodeCard
                          code={currentParty.join_code}
                          onCopy={copyCode}
                          copied={copied}
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={copyCode}
                            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.98]
                              ${copied 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                              }
                            `}
                          >
                            {copied ? <><Check className="w-4 h-4 mb-1" /> Copied!</> : <><Copy className="w-4 h-4 mb-1" /> Copy</>}
                          </button>
                          <button
                            onClick={sharePartyLink}
                            className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.98]"
                          >
                            <Share2 className="w-4 h-4 mb-1" /> Share
                          </button>
                          <button
                            onClick={() => setShowFriendsPanel(true)}
                            className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.98]"
                          >
                            <UserPlus className="w-4 h-4 mb-1" /> Friends
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                
                  <div
                    className={`absolute inset-0 flex flex-col bg-black/20 overflow-hidden transition-all duration-200 ${activeTab === 'chat' ? 'opacity-100 z-10 pointer-events-auto translate-x-0' : 'opacity-0 z-0 pointer-events-none translate-x-4'}`}
                  >
                    <SharedChatInterface 
                      roomType="group" 
                      groupId={currentParty.id} 
                      roomTitle="Party Chat"
                      isGlobal={false}
                      user={user}
                      hideHeader={true}
                    />
                  </div>
                  
                  <div
                    className={`absolute inset-0 flex flex-col bg-black/20 overflow-hidden transition-all duration-200 ${activeTab === 'voice' ? 'opacity-100 z-10 pointer-events-auto translate-x-0' : 'opacity-0 z-0 pointer-events-none translate-x-4'}`}
                  >
                    {/* Main Content Area (Video Grid + Members Panel overlay) */}
                    <div className="flex-1 flex relative overflow-hidden">
                      {/* Grid Layout (Takes available space) */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative z-10">
                        {(() => {
                          if (!hasActiveVideo) {
                            // AUDIO-ONLY LAYOUT (No videos active)
                            return (
                              <div className="p-4 grid gap-3 flex-1 min-h-[300px] grid-cols-2 sm:grid-cols-3 md:grid-cols-4 content-start">
                                {partyMembers.map(member => {
                                  const isSpeakingMember = voiceController.activeSpeakers[member.id] === true;
                                  return (
                                    <div key={member.id} className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all bg-gray-900/50 group ${isSpeakingMember ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.2)]' : 'border-white/5 hover:border-white/20'}`}>
                                      <div className="relative">
                                        <Avatar className={`w-20 h-20 ring-4 transition-all duration-300 ${isSpeakingMember ? 'ring-green-400 shadow-[0_0_15px_rgba(74,222,128,0.4)] scale-110' : 'ring-white/10'}`}>
                                          <AvatarImage src={member.avatar_url} className="object-cover" />
                                          <AvatarFallback className="bg-gray-800 text-2xl font-black">{member.ign?.[0]}</AvatarFallback>
                                        </Avatar>
                                        {member.id === currentParty.leader_id && (
                                          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center z-10 border-4 border-gray-900">
                                            <Crown className="w-4 h-4 text-black" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-4 text-center w-full">
                                        <p className="text-sm font-bold text-white truncate px-2">{member.ign || 'Player'} {member.id === user.id && <span className="text-purple-400 text-[10px] font-black">(YOU)</span>}</p>
                                        {currentParty.voice_states?.[member.id]?.muted && (
                                           <div className="flex items-center justify-center gap-1 mt-1.5 text-red-500 bg-red-500/10 w-max mx-auto px-2 py-0.5 rounded-full">
                                              <MicOff className="w-3 h-3" />
                                              <span className="text-[10px] font-black uppercase tracking-wider">Muted</span>
                                           </div>
                                        )}
                                      </div>
                                      {/* Admin Controls on Hover */}
                                      {currentParty.leader_id === user.id && member.id !== user.id && (
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => {
                                              const currentlyVideoOff = currentParty.voice_states?.[member.id]?.videoOff || false;
                                              voiceController.disableVideoRemotely(member.id, !currentlyVideoOff);
                                            }}
                                            className={`p-1.5 rounded-full transition-colors ${currentParty.voice_states?.[member.id]?.videoOff ? 'bg-red-500/20 text-red-500' : 'bg-black/60 text-gray-400 hover:text-white hover:bg-white/20'}`}
                                            title={currentParty.voice_states?.[member.id]?.videoOff ? "Allow Camera Access" : "Disable Camera"}
                                          >
                                            {currentParty.voice_states?.[member.id]?.videoOff ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                                          </button>
                                          <button 
                                            onClick={() => {
                                              const currentlyMuted = currentParty.voice_states?.[member.id]?.muted || false;
                                              voiceController.muteUserRemotely(member.id, !currentlyMuted);
                                            }}
                                            className={`p-1.5 rounded-full transition-colors ${currentParty.voice_states?.[member.id]?.muted ? 'bg-red-500/20 text-red-500' : 'bg-black/60 text-gray-400 hover:text-white hover:bg-white/20'}`}
                                            title={currentParty.voice_states?.[member.id]?.muted ? "Unmute" : "Mute"}
                                          >
                                            {currentParty.voice_states?.[member.id]?.muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic2 className="w-3.5 h-3.5" />}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }

                          // VIDEO LAYOUT (At least 1 active video)
                          const activeVideos = [];
                          if (voiceController.localVideoTrack) {
                            activeVideos.push({ id: 'local', track: voiceController.localVideoTrack, name: 'You' });
                          }
                          if (voiceController.remoteVideoTracks) {
                            Object.entries(voiceController.remoteVideoTracks).forEach(([uid, track]) => {
                              const member = partyMembers.find(m => m.id === uid);
                              activeVideos.push({ id: uid, track, name: member?.ign || 'Player' });
                            });
                          }
                          
                          // Strict Speaking Indicator: only active when actual volume is high
                          const isSpeaking = (uid) => {
                             const targetUid = uid === 'local' ? user.id.toString() : uid;
                             return voiceController.activeSpeakers[targetUid] === true;
                          };

                          const expandedVideo = expandedVideoId 
                            ? activeVideos.find(v => v.id === expandedVideoId)
                            : null;

                          if (!expandedVideo) {
                            // WHATSAPP STYLE GROUP CALL LAYOUT
                            const count = activeVideos.length;
                            
                            let gridClass = "";
                            let overflowClass = "overflow-hidden";
                            
                            if (count === 1) {
                              gridClass = "grid-cols-1 grid-rows-1";
                            } else if (count === 2) {
                              gridClass = "grid-cols-1 grid-rows-2";
                            } else if (count === 3 || count === 4) {
                              gridClass = "grid-cols-2 grid-rows-2";
                            } else if (count === 5 || count === 6) {
                              gridClass = "grid-cols-2 grid-rows-3";
                            } else {
                              // 7 to 10 people: scrollable grid
                              gridClass = "grid-cols-2 auto-rows-[180px] sm:auto-rows-[220px]";
                              overflowClass = "overflow-y-auto custom-scrollbar";
                            }

                            return (
                              <div className={`p-1 sm:p-2 grid gap-1 sm:gap-2 flex-1 w-full h-full bg-black ${gridClass} ${overflowClass}`}>
                                {activeVideos.map((v, index) => {
                                  // For 3 people, make the first one span 2 columns if we want true WhatsApp style (optional, let's keep it simple grid for now, or wait, WhatsApp puts 1 on top, 2 on bottom)
                                  // We will just let CSS grid handle it (the last item in a 3-item grid might not span, leaving an empty spot, which is standard).
                                  const isThreePeopleAndFirst = count === 3 && index === 0;
                                  
                                  return (
                                    <div key={v.id} className={`relative rounded-xl overflow-hidden bg-gray-900 border ${isSpeaking(v.id) ? 'border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'border-white/10'} ${isThreePeopleAndFirst ? 'col-span-2' : ''} group flex items-center justify-center`}>
                                      <VideoPlayer track={v.track} />
                                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] sm:text-xs font-bold text-white shadow-lg flex items-center gap-1.5 z-10">
                                        {v.name}
                                        {isSpeaking(v.id) && (
                                           <div className="flex items-end gap-[2px] h-2.5 w-3 overflow-hidden">
                                              {[...Array(3)].map((_, j) => (
                                                <motion.div key={j} className="w-[2.5px] bg-green-400 rounded-full" animate={{ height: ['2px', `${4 + Math.random() * 5}px`, '2px'] }} transition={{ duration: 0.3 + Math.random() * 0.2, repeat: Infinity, ease: 'easeInOut' }} />
                                              ))}
                                           </div>
                                        )}
                                      </div>
                                      
                                      {/* Controls overlay */}
                                      <div className="absolute top-2 right-2 flex gap-1 z-20">
                                        {activeVideos.length > 1 && (
                                          <button onClick={() => setExpandedVideoId(v.id)} className="p-1.5 sm:p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100 shadow" title="Expand Video">
                                            <Maximize className="w-3 h-3 sm:w-4 sm:h-4" />
                                          </button>
                                        )}
                                        {v.id === 'local' && voiceController.cameras?.length > 1 && (
                                          <button onClick={voiceController.flipCamera} className="p-1.5 sm:p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100 shadow" title="Flip Camera">
                                            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }

                          // HERO LAYOUT
                          const thumbnailVideos = activeVideos.filter(v => v.id !== expandedVideo.id);

                          return (
                            <div className="p-3 flex flex-col flex-1 gap-2 min-h-[300px]">
                               <div className={`relative flex-1 min-h-[220px] rounded-xl overflow-hidden border-2 transition-all ${isSpeaking(expandedVideo.id) ? 'border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'border-white/10'} bg-gray-900 group`}>
                                  <VideoPlayer track={expandedVideo.track} />
                                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-white shadow flex items-center gap-2">
                                    {expandedVideo.name}
                                    {isSpeaking(expandedVideo.id) && (
                                       <div className="flex items-end gap-[2px] h-3 w-4 overflow-hidden">
                                          {[...Array(3)].map((_, j) => (
                                            <motion.div key={j} className="w-[3px] bg-green-400 rounded-full" animate={{ height: ['3px', `${6 + Math.random() * 6}px`, '3px'] }} transition={{ duration: 0.3 + Math.random() * 0.2, repeat: Infinity, ease: 'easeInOut' }} />
                                          ))}
                                       </div>
                                    )}
                                  </div>
                                  <button onClick={() => setExpandedVideoId(null)} className="absolute top-2 left-2 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100 z-10" title="Minimize Video">
                                    <Minimize className="w-4 h-4" />
                                  </button>
                                  {expandedVideo.id === 'local' && voiceController.cameras?.length > 1 && (
                                    <button onClick={voiceController.flipCamera} className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100 z-10" title="Flip Camera">
                                      <RefreshCw className="w-4 h-4" />
                                    </button>
                                  )}
                               </div>

                               {thumbnailVideos.length > 0 && (
                                 <div className="flex gap-2 overflow-x-auto h-20 flex-shrink-0 custom-scrollbar pb-1">
                                   {thumbnailVideos.map(v => (
                                      <div 
                                        key={v.id} 
                                        onClick={() => setExpandedVideoId(v.id)}
                                        className={`relative w-28 h-full rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isSpeaking(v.id) ? 'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)]' : 'border-white/10 hover:border-white/30'} bg-gray-900`}
                                      >
                                        <VideoPlayer track={v.track} />
                                        <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-white max-w-[90%] truncate">
                                          {v.name}
                                        </div>
                                      </div>
                                   ))}
                                 </div>
                               )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Right-Side Members Sliding Panel (Only shown if video is active) */}
                      <AnimatePresence>
                        {hasActiveVideo && showVoicePanel && (
                          <motion.div
                            key="overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowVoicePanel(false)}
                            className="absolute inset-0 z-40 bg-black/10 backdrop-blur-[2px] cursor-pointer"
                            title="Close Members"
                          />
                        )}
                        {hasActiveVideo && showVoicePanel && (
                          <motion.div
                            key="panel"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute top-0 right-0 w-3/4 sm:w-[50%] h-full bg-black/95 backdrop-blur-3xl border-l border-white/10 flex flex-col z-50 shadow-[-20px_0_40px_rgba(0,0,0,0.8)]"
                          >
                            <div className="px-4 py-3 flex justify-between items-center border-b border-white/10">
                              <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-400" /> Members
                              </h3>
                              <button onClick={() => setShowVoicePanel(false)} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Voice Members (Compact List) */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                              {partyMembers.map((member, i) => {
                                const isSpeakingMember = voiceController.activeSpeakers[member.id] === true;
                                
                                return (
                                  <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="flex items-center gap-2.5 hover:bg-white/5 rounded-lg p-2 transition-colors group"
                                  >
                                    <div className="relative flex-shrink-0">
                                      <Avatar className={`w-8 h-8 ring-2 transition-all duration-300 ${isSpeakingMember ? 'ring-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)] scale-110' : 'ring-white/10'}`}>
                                        <AvatarImage src={member.avatar_url} className="object-cover" />
                                        <AvatarFallback className="bg-gray-800 text-[10px] font-black">{member.ign?.[0]}</AvatarFallback>
                                      </Avatar>
                                      {member.id === currentParty.leader_id && (
                                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center z-10 border border-black">
                                          <Crown className="w-[8px] h-[8px] text-black" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-semibold truncate flex items-center gap-1.5 ${isSpeakingMember ? 'text-white' : 'text-gray-300'}`}>
                                        {member.ign || 'Player'}
                                        {member.id === user.id && <span className="text-purple-400 text-[9px] font-bold">(YOU)</span>}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                      {currentParty.leader_id === user.id && member.id !== user.id && (
                                        <>
                                          <button 
                                            onClick={() => {
                                              const currentlyVideoOff = currentParty.voice_states?.[member.id]?.videoOff || false;
                                              voiceController.disableVideoRemotely(member.id, !currentlyVideoOff);
                                            }}
                                            className={`p-1 rounded-full transition-colors ${currentParty.voice_states?.[member.id]?.videoOff ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                                            title={currentParty.voice_states?.[member.id]?.videoOff ? "Allow Camera Access" : "Disable Camera"}
                                          >
                                            {currentParty.voice_states?.[member.id]?.videoOff ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                                          </button>
                                          <button 
                                            onClick={() => {
                                              const currentlyMuted = currentParty.voice_states?.[member.id]?.muted || false;
                                              voiceController.muteUserRemotely(member.id, !currentlyMuted);
                                            }}
                                            className={`p-1 rounded-full transition-colors ${currentParty.voice_states?.[member.id]?.muted ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                                            title={currentParty.voice_states?.[member.id]?.muted ? "Unmute" : "Mute"}
                                          >
                                            {currentParty.voice_states?.[member.id]?.muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic2 className="w-3.5 h-3.5" />}
                                          </button>
                                        </>
                                      )}
                                      <div className="flex items-end gap-[1.5px] h-3 w-4 overflow-hidden mr-1">
                                        {isSpeakingMember ? (
                                          [...Array(3)].map((_, j) => (
                                            <motion.div
                                              key={j}
                                              className="w-[2px] bg-green-400 rounded-full"
                                              animate={{ height: ['2px', `${4 + Math.random() * 6}px`, '2px'] }}
                                              transition={{ duration: 0.3 + Math.random() * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                                            />
                                          ))
                                        ) : (
                                          <div className="w-full h-[2px] bg-white/10 rounded-full mb-0.5" />
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Toggle Members Button (Only shown if video is active) */}
                      <AnimatePresence>
                        {hasActiveVideo && !showVoicePanel && (
                          <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onClick={() => setShowVoicePanel(true)}
                            className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full border border-white/10 z-30 transition-colors shadow-lg backdrop-blur-md"
                            title="Show Members"
                          >
                            <Users className="w-4 h-4" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Fixed Voice Controls & Soundboard at Bottom */}
                    <div className="p-2 sm:p-3 border-t border-white/10 bg-black/95 flex items-center justify-between relative z-20 gap-2 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                      {/* Left: Empty space to balance flex */}
                      <div className="flex-1 flex justify-start items-center">
                        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                          {[
                            { id: 'airhorn', emoji: '📯', color: 'hover:bg-yellow-500/20 hover:border-yellow-500/50 hover:shadow-[0_0_12px_rgba(234,179,8,0.4)]' },
                            { id: 'laugh', emoji: '😂', color: 'hover:bg-orange-500/20 hover:border-orange-500/50 hover:shadow-[0_0_12px_rgba(59,130,246,0.4)]' },
                            { id: 'op', emoji: '🔥', color: 'hover:bg-orange-500/20 hover:border-orange-500/50 hover:shadow-[0_0_12px_rgba(249,115,22,0.4)]' },
                            { id: 'oof', emoji: '💀', color: 'hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]' }
                          ].map(snd => (
                            <button 
                              key={snd.id} 
                              onClick={() => triggerSound(snd.id)} 
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-xs sm:text-sm transition-all duration-300 active:scale-75 ${snd.color}`}
                              title={snd.id}
                            >
                              {snd.emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Center: Camera & Mic */}
                      <div className="flex items-center justify-center gap-2 sm:gap-4 shrink-0">
                        <button 
                          onClick={voiceController.toggleVideo} 
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${voiceController.isVideoOn ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'}`}
                        >
                          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button 
                          onClick={voiceController.toggleMic} 
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${voiceController.isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]'}`}
                        >
                          {voiceController.isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </button>
                      </div>
                      
                      <div className="flex-1 flex justify-end items-center">
                        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                          {[
                            { id: 'vine_boom', emoji: '💥', color: 'hover:bg-orange-600/20 hover:border-orange-600/50 hover:shadow-[0_0_12px_rgba(234,88,12,0.4)]' },
                            { id: 'fart', emoji: '💨', color: 'hover:bg-green-500/20 hover:border-green-500/50 hover:shadow-[0_0_12px_rgba(34,197,94,0.4)]' },
                            { id: 'bruh', emoji: '😑', color: 'hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_12px_rgba(168,85,247,0.4)]' },
                            { id: 'nani', emoji: '❓', color: 'hover:bg-pink-500/20 hover:border-pink-500/50 hover:shadow-[0_0_12px_rgba(236,72,153,0.4)]' }
                          ].map(snd => (
                            <button 
                              key={snd.id} 
                              onClick={() => triggerSound(snd.id)} 
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-xs sm:text-sm transition-all duration-300 active:scale-75 ${snd.color}`}
                              title={snd.id}
                            >
                              {snd.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div
                    className={`absolute inset-0 flex flex-col bg-[#0c0c11] overflow-hidden transition-all duration-200 ${activeTab === 'strategy' ? 'opacity-100 z-10 pointer-events-auto translate-x-0' : 'opacity-0 z-0 pointer-events-none translate-x-4'}`}
                  >
                    <StrategyMap partyId={currentParty.id} user={user} partyMembers={partyMembers} />
                  </div>
              </div>
            </div>
          )}
        </div>

        {/* Friends Slide-over Panel */}
        <AnimatePresence>
          {showFriendsPanel && (
            <>
              {/* Overlay for clicking outside */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFriendsPanel(false)}
                className="absolute inset-0 z-[140] bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="absolute right-0 top-0 bottom-0 w-[85%] sm:w-1/2 z-[150] bg-[#0d0d12] border-l border-white/10 backdrop-blur-3xl flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.6)]"
              >
                <div className="p-4 sm:p-6 border-b border-white/10 bg-white/[0.02] flex items-center gap-4">
                  <button 
                    onClick={() => setShowFriendsPanel(false)}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-white font-black uppercase tracking-widest text-lg">Friends</h3>
                </div>
              
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="p-4 pb-2">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search friends..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 text-white placeholder:text-gray-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all text-sm shadow-inner"
                    />
                  </div>
                </div>

                {friendsLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-black text-sm uppercase tracking-wider">
                      {searchQuery ? 'No results' : 'No friends yet'}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      {searchQuery ? 'Try a different name' : 'Add friends to invite them!'}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {filteredFriends.map(friend => (
                      <FriendRow
                        key={friend.id}
                        friend={friend}
                        currentParty={currentParty}
                        onInvite={handleInviteFriend}
                        onProfileClick={() => setViewProfileId(friend.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showSettingsPanel && (
            <>
              {/* Overlay for clicking outside */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettingsPanel(false)}
                className="absolute inset-0 z-[140] bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="absolute right-0 top-0 bottom-0 w-[85%] sm:w-1/2 z-[150] bg-[#0d0d12] border-l border-white/10 backdrop-blur-3xl flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.6)]"
              >
                <div className="p-4 sm:p-6 border-b border-white/10 bg-white/[0.02] flex items-center gap-4">
                  <button 
                    onClick={() => setShowSettingsPanel(false)}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-white font-black uppercase tracking-widest text-lg">Settings</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Party Name</label>
                      <Input
                        value={editPartyName}
                        onChange={e => setEditPartyName(e.target.value)}
                        maxLength={30}
                        className="bg-black/60 border-white/10 text-white rounded-lg focus:border-purple-500 h-12"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <h4 className="text-sm font-bold text-white">Privacy</h4>
                        <p className="text-xs text-gray-500">Who can join your party</p>
                      </div>
                      <select 
                        value={editPartyPrivacy}
                        onChange={e => setEditPartyPrivacy(e.target.value)}
                        className="bg-black/80 border border-white/10 text-white text-sm font-bold rounded-lg px-4 py-2 outline-none focus:border-purple-500"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <h4 className="text-sm font-bold text-white">Voice Chat</h4>
                        <p className="text-xs text-gray-500">Enable squad voice channel</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditPartyVoice(!editPartyVoice)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${editPartyVoice ? 'bg-purple-600' : 'bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${editPartyVoice ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <h4 className="text-sm font-bold text-white">Emoji Sounds</h4>
                        <p className="text-xs text-gray-500">Allow funny soundboard effects</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditPartyEmojiSound(!editPartyEmojiSound)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${editPartyEmojiSound ? 'bg-purple-600' : 'bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${editPartyEmojiSound ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <button
                        type="submit"
                        disabled={savingSettings}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50"
                      >
                        {savingSettings ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>


        {currentParty && (
          <ShareDrawer 
            open={showShareDrawer}
            shareUrl={`battlehub://app/profile?openDrawer=party&joinCode=${currentParty.join_code}`}
            shareText={`Join my BATTLEHUB FF party using code: ${currentParty.join_code} or click the link below!`}
            shareType="party_invite"
            user={user} 
            onClose={() => setShowShareDrawer(false)}
            hideMoreOptions={true} 
          />
        )}

        {viewProfileId && (
          <div className="fixed inset-0 z-[600] bg-slate-950 overflow-y-auto animate-in slide-in-from-right-full duration-300">
             <PlayerProfile 
               inlineUid={viewProfileId} 
               isDrawer={true} 
               onClose={() => setViewProfileId(null)} 
             />
          </div>
        )}
        </div>
      )}
      </>
    );
}
