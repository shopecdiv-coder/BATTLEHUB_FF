import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@/entities/User";
import { GlobalChat as GlobalChatEntity } from "@/entities/GlobalChat";
import { TournamentChat as TournamentChatEntity } from "@/entities/TournamentChat";
import { GroupChatMessage as GroupChatMessageEntity } from "@/api/entities";
import { ActiveUser } from "@/entities/ActiveUser";
import { base44 } from "@/api/base44Client";
import { db } from "@/api/firebaseClient";
import { collection, query, orderBy, limit, onSnapshot, where, doc, setDoc, deleteDoc, serverTimestamp, increment, writeBatch } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCall } from '@/lib/CallContext';
import SharedReelCard from '@/components/chat/SharedReelCard';
import BHTVPlayer from '@/components/ui/BHTVPlayer';
import { Badge } from "@/components/ui/badge";
import {
  Send, Pin, Trash2, Reply, X,
  MoreVertical, Shield, Flame, Megaphone, Pencil, Image,
  ChevronDown, ChevronLeft, ChevronRight, ArrowLeft, SmilePlus, CheckCheck, ArrowDown, Maximize2, Search, BadgeCheck,
  Paperclip, Mic, Square, FileText, Headphones, Phone, Video, BarChart2, Plus, Link, Play, ArrowUpRight, ArrowDownLeft, Pause
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ChatSettings } from "@/entities/ChatSettings";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { uploadFileToAWS } from '@/utils/awsStorage';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import PlayerProfile from "@/pages/PlayerProfile";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY || 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh');

const getYouTubeId = (url) => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const BAD_WORDS = ['fuck','shit','ass','bitch','damn','crap','bastard','dick','pussy','cock','whore','slut','nigga','nigger','chutiya','madarchod','behenchod','bhosdike','gaand','lund','randi'];
const filterBadWords = (text) => {
  let filtered = text;
  BAD_WORDS.forEach(word => {
    filtered = filtered.replace(new RegExp(word, 'gi'), '*'.repeat(word.length));
  });
  return filtered;
};

const formatTimeIST = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
};

const getDateLabel = (dateString) => {
  const date = new Date(dateString);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, 'dd MMM yyyy');
};

const REACTIONS = [
  { key: 'likes', emoji: '👍' },
  { key: 'hearts', emoji: '❤️' },
  { key: 'laughs', emoji: '😂' },
  { key: 'fire', emoji: '🔥' },
  { key: 'claps', emoji: '👏' },
];

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
  '👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤘','🤟','👌','🤏','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','🖖','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄','💋','🩸'
];

const playChatSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'send') {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'receive') {
      const playDing = (time, freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.start(time);
        osc.stop(time + 0.3);
      };
      playDing(ctx.currentTime, 880);
      playDing(ctx.currentTime + 0.1, 1046);
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

const BanBanner = ({ group, user }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealImage, setAppealImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!group?.ban_until) return;
    const updateTimer = () => {
      const end = new Date(group.ban_until).getTime();
      const now = new Date().getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft("Ban expired (refresh required)");
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      let str = "";
      if (d > 0) str += `${d}d `;
      str += `${h}h ${m}m ${s}s`;
      setTimeLeft(str);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [group?.ban_until]);

  const isOwner = group?.admin_id === user?.id;

  const handleAppeal = async () => {
    if (!appealReason.trim()) return alert("Please enter a reason");
    setSubmitting(true);
    try {
      const { Report } = await import("@/entities/Report");
      let evidenceUrls = [];
      if (appealImage) {
        const { UploadFile } = await import("@/integrations/Core");
        const { file_url } = await UploadFile({ file: appealImage });
        evidenceUrls.push(file_url);
      }
      await Report.create({
        type: "group_appeal",
        reporter_id: user.id,
        reporter_ign: user.ign || user.username || "Unknown",
        group_id: group.id,
        reason: "Group Ban Appeal",
        description: appealReason,
        evidence_urls: evidenceUrls,
        status: "Pending",
        created_date: new Date().toISOString()
      });
      alert("Appeal submitted successfully! Admins will review it.");
      setShowAppeal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to submit appeal");
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col items-center justify-center m-2 mx-auto max-w-3xl">
      <p className="text-red-400 text-sm font-bold text-center">This group has been banned by an admin.</p>
      {group.ban_reason && (
        <p className="text-red-400/80 text-xs mt-1 text-center max-w-md">Reason: {group.ban_reason}</p>
      )}
      {group.ban_until && (
        <p className="text-yellow-400 text-xs mt-3 font-mono bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20 font-semibold tracking-wide">
          Unban in: {timeLeft}
        </p>
      )}
      
      {isOwner && (
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/20 bg-red-500/5 font-semibold"
          onClick={() => setShowAppeal(true)}
        >
          Request Review
        </Button>
      )}

      <Dialog open={showAppeal} onOpenChange={setShowAppeal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md z-[99999]">
          <h2 className="text-xl font-bold mb-2">Appeal Group Ban</h2>
          <p className="text-sm text-gray-400 mb-4">Provide a reason why your group should be unbanned. You can optionally attach proof.</p>
          <div className="space-y-4">
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm min-h-[100px] text-white focus:outline-none focus:border-violet-500"
              placeholder="Explain the situation..."
              value={appealReason}
              onChange={e => setAppealReason(e.target.value)}
            />
            <div>
              <p className="text-xs text-gray-400 mb-2">Optional Proof (Image)</p>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setAppealImage(e.target.files[0])}
                className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-500/10 file:text-violet-400 hover:file:bg-violet-500/20"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAppeal(false)} disabled={submitting}>Cancel</Button>
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleAppeal} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Appeal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CustomAudioPlayer = ({ src, isOwn, avatarUrl, isUploading, msg, onCancel }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const audioRef = React.useRef(null);

  const heights = React.useMemo(() => {
    let seed = src ? src.length : 100;
    return Array.from({ length: 30 }, () => {
      seed = (seed * 9301 + 49297) % 233280;
      let rnd = seed / 233280;
      return Math.floor(rnd * 16) + 6;
    });
  }, [src]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current || isUploading) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error(e));
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    setCurrentTime(current);
    if (duration > 0) {
      setProgress((current / duration) * 100);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      if (audioRef.current.duration !== Infinity && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (!audioRef.current || duration === 0 || isUploading) return;
    const percentage = e.target.value / 100;
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(e.target.value);
  };

  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative flex items-center gap-2.5 sm:gap-3 w-[250px] sm:w-[280px] p-2 pr-3 rounded-2xl select-none ${isOwn ? 'bg-[#005c4b]' : 'bg-[#202c33]'}`}>
      <div className="relative">
        <img src={avatarUrl || 'https://api.dicebear.com/6.x/bottts/svg?seed=audio'} className="w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0 object-cover bg-black/20" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center border-2 border-[#005c4b]">
          <Mic className="w-3 h-3 text-white" />
        </div>
      </div>

      <button 
        onClick={togglePlay}
        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 text-gray-300 hover:text-white disabled:opacity-50 transition-colors"
        disabled={isUploading}
      >
        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
      </button>
      
      <div className="flex-1 flex flex-col justify-center gap-1.5 overflow-hidden">
        <div className="flex items-center gap-[2px] h-6 w-full relative">
          <input 
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={isUploading}
          />
          {heights.map((h, i) => {
            const barProgress = (i / heights.length) * 100;
            const isFilled = barProgress <= progress;
            return (
              <div 
                key={i}
                className={`flex-1 rounded-full transition-colors duration-75 ${isFilled ? (isOwn ? 'bg-[#00a884]' : 'bg-cyan-500') : (isOwn ? 'bg-white/30' : 'bg-white/20')}`}
                style={{ height: `${h}px`, minWidth: '2px' }}
              />
            );
          })}
        </div>
        <div className="text-[11px] text-gray-300 font-medium tracking-wide">
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </div>
      </div>
      <audio 
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        preload="metadata"
        className="hidden"
      />
      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/20 rounded-2xl backdrop-blur-[1px]">
           <div className="relative w-8 h-8 flex items-center justify-center bg-black/60 rounded-full backdrop-blur-sm">
              <svg className="absolute inset-0 w-8 h-8 transform -rotate-90">
                  <circle cx="16" cy="16" r="14" stroke="white" strokeWidth="3" fill="none" className="opacity-20" />
                  <circle cx="16" cy="16" r="14" stroke="#06b6d4" strokeWidth="3" fill="none" 
                          strokeDasharray="88" 
                          strokeDashoffset={88 - ((msg.progress || 0) / 100) * 88} 
                          className="transition-all duration-300" />
              </svg>
              <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      onCancel?.();
                  }} 
                  className="absolute w-full h-full flex items-center justify-center"
              >
                  <X className="w-4 h-4 text-white hover:text-red-400 transition-colors" />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default function SharedChatInterface({ 
  roomType = "global", 
  roomId = null, 
  groupId = null,
  roomTitle = "BATTLEHUB FF", 
  roomAvatar = null,
  isClosed = false, 
  isRegistered = true, 
  onExpand, 
  onShrink, 
  user: propUser,
  customHeaderActions,
  customMenuItems: propCustomMenuItems,
  recipient = null,
  isGlobal = false,
  hideHeader = false
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(propUser || null);
  const Entity = roomType === "global" ? GlobalChatEntity : 
                 roomType === "group" ? GroupChatMessageEntity : 
                 TournamentChatEntity;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadDividerId, setUnreadDividerId] = useState(null);
  const unreadCalculatedRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [activeUploads, setActiveUploads] = useState({});
  const [mediaViewer, setMediaViewer] = useState(null);
  const [activeUsersList, setActiveUsersList] = useState([]);
  const [viewProfileId, setViewProfileId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [chatBgImage, setChatBgImage] = useState("");
  const [chatDP, setChatDP] = useState("");
  const [showReactors, setShowReactors] = useState(null); // { emoji, users }
  const [showPinnedFull, setShowPinnedFull] = useState(false);
  const lastDropdownCloseTime = useRef(0);
  const [ytViewer, setYtViewer] = useState(null); 
  const [customMenuItems, setCustomMenuItems] = useState(propCustomMenuItems || null);
  const { initiateCall } = useCall();

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const attachmentMenuRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target)) {
        setShowAttachmentMenu(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showAttachmentMenu || showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachmentMenu, showEmojiPicker]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [swipedMessageId, setSwipedMessageId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const [realtimeRecipient, setRealtimeRecipient] = useState(recipient);

  useEffect(() => {
    if (!recipient?.id) return;
    const unsub = onSnapshot(doc(db, "users", recipient.id), (docSnap) => {
      if (docSnap.exists()) {
        setRealtimeRecipient({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsub();
  }, [recipient?.id]);

  const [realtimeUser, setRealtimeUser] = useState(propUser);
  useEffect(() => {
    if (!propUser?.id) return;
    const unsub = onSnapshot(doc(db, "users", propUser.id), (docSnap) => {
      if (docSnap.exists()) {
        setRealtimeUser({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsub();
  }, [propUser?.id]);

  const [realtimeGroup, setRealtimeGroup] = useState(null);
  useEffect(() => {
    if (roomType !== "group" || !groupId) return;
    const unsub = onSnapshot(doc(db, "user_groups", groupId), (docSnap) => {
      if (docSnap.exists()) {
        setRealtimeGroup({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsub();
  }, [roomType, groupId]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const isBlocked = user?.blocked_users?.includes(realtimeRecipient?.id);
  const amIBlocked = realtimeRecipient?.blocked_users?.includes(user?.id);
  const isChatBlocked = isBlocked || amIBlocked;
  
  const isGroupAdmin = realtimeGroup?.admins?.includes(user?.id) || realtimeGroup?.admin_id === user?.id;
  const canSendGroupMessage = roomType === "group" && realtimeGroup ? !(realtimeGroup?.settings_send_messages === "admins" && !isGroupAdmin) : true;
  
  const recentOnlineList = activeUsersList.filter(u => new Date(u.last_active) > new Date(Date.now() - 5 * 60 * 1000));
  const onlineCount = roomType === "group" && realtimeGroup 
    ? Math.max(1, recentOnlineList.filter(u => realtimeGroup.members.includes(u.user_id)).length)
    : Math.max(1, recentOnlineList.length);
    
  const recordingTimerRef = useRef(null);
  const cancelRecordingRef = useRef(false);

  // Poll states
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState([{ id: '1', text: '' }, { id: '2', text: '' }]);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const isUserScrolledUp = useRef(false);
  const initialScrollDone = useRef(false);
  const prevMessagesLength = useRef(0);
  const touchStartRef = useRef(0);
  const touchStartYRef = useRef(0);
  const longPressTimer = useRef(null);

  const handleOpenMedia = (url, type) => {
    window.history.pushState({ mediaViewer: true }, '');
    
    // Find all media messages in current chat
    const mediaMsgs = messages.filter(m => m.message_type === 'image' || m.message_type === 'video');
    
    // URL could be a raw url or include ::filename
    const currentIndex = mediaMsgs.findIndex(m => m.message?.split('::')[0] === url);
    
    if (currentIndex !== -1) {
      setMediaViewer({ items: mediaMsgs, currentIndex, type: 'gallery' });
    } else {
      setMediaViewer({ url, type });
    }
  };

  const handleCloseMedia = () => {
    if (window.history.state?.mediaViewer) {
      window.history.back();
    } else {
      setMediaViewer(null);
    }
  };

  useEffect(() => {
    const handlePopState = () => setMediaViewer(null);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    loadData();
    loadChatSettings();
    localStorage.setItem('unreadChatCount', '0');
    localStorage.setItem('lastChatSeen', Date.now().toString());

    const messagesLimit = 100;
    const colName = roomType === "global" ? "global_chats" : 
                    roomType === "group" ? "group_chat_messages" : 
                    "tournament_chats";
    const colRef = collection(db, colName);
    let q;
    if (roomType === "tournament" && roomId) {
      q = query(colRef, where("tournament_id", "==", roomId));
    } else if (roomType === "group" && groupId) {
      q = query(colRef, where("group_id", "==", groupId));
    } else {
      q = query(colRef, orderBy("created_at", "desc"), limit(messagesLimit));
    }

    const unsubscribeMsgs = onSnapshot(q, (snap) => {
      let allMessages = [];
      snap.forEach(doc => {
        allMessages.push({ id: doc.id, ...doc.data() });
      });
      
      if (roomType === "global") {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        allMessages = allMessages.filter(m => {
          return new Date(m.created_at || m.created_date) >= twentyFourHoursAgo;
        });
      }

      let unreadKey = "unread_global_chat";
      if (roomType === "tournament") {
        unreadKey = `unread_tourney_${roomId}`;
      } else if (roomType === "group") {
        unreadKey = `unread_group_${groupId}`;
      }

      // Sort in memory to avoid composite index requirements
      allMessages.sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date));
      allMessages = allMessages.slice(0, messagesLimit);
        
      const reversed = allMessages.reverse();

      if (!unreadCalculatedRef.current && reversed.length > 0) {
        const activeId = groupId || roomId || "global";
        const initialLastRead = parseInt(localStorage.getItem(`chat_read_${activeId}`) || '0');
        if (initialLastRead > 0) {
          const firstUnread = reversed.find(m => {
            const msgTime = new Date(m.created_at || m.created_date).getTime();
            return msgTime > initialLastRead && m.user_id !== user?.id;
          });
          if (firstUnread) {
            setUnreadDividerId(firstUnread.id);
            // Auto hide after 15 seconds as per "jab dekh le toh unread hat jaye"
            setTimeout(() => {
              setUnreadDividerId(null);
            }, 15000);
          }
        }
        
        
        localStorage.setItem(`chat_read_${activeId}`, Date.now().toString());
        window.dispatchEvent(new CustomEvent('chatRead', { detail: { chatId: activeId } }));
        if (activeId.startsWith("direct_") && user) {
          import('firebase/firestore').then(({ doc, setDoc }) => {
             setDoc(doc(db, "direct_chats", activeId), { [`unread_count_${user.id}`]: 0 }, { merge: true }).catch(() => {});
          });
        }

        unreadCalculatedRef.current = true;
      }
      
      localStorage.setItem('lastChatSeen', Date.now().toString());
      localStorage.setItem('unreadChatCount', '0');
      
      setMessages(prev => {
        const newLastId = reversed[reversed.length - 1]?.id;
        const oldLastId = prev[prev.length - 1]?.id;
        
        if (prev.length > 0) {
          const newMsgs = reversed.filter(m => !prev.some(p => p.id === m.id));
          if (newMsgs.length > 0) {
            const hasReceivedNew = newMsgs.some(m => m.user_id !== user?.id);
            if (hasReceivedNew) {
              playChatSound('receive');
            }
            if (isUserScrolledUp.current && newLastId !== oldLastId) {
              setUnreadCount(c => c + newMsgs.length);
            } else if (!isUserScrolledUp.current && newLastId !== oldLastId) {
              const activeId = groupId || roomId || "global";
              localStorage.setItem(`chat_read_${activeId}`, Date.now().toString());
              window.dispatchEvent(new CustomEvent('chatRead', { detail: { chatId: activeId } }));
              if (activeId.startsWith("direct_") && user) {
                import('firebase/firestore').then(({ doc, setDoc }) => {
                   setDoc(doc(db, "direct_chats", activeId), { [`unread_count_${user.id}`]: 0 }, { merge: true }).catch(() => {});
                });
              }
            }
          }
        }
        return reversed;
      });
      
      const pinned = allMessages.find(m => m.is_pinned && !m.is_deleted);
      setPinnedMessage(pinned);
      setLoading(false);
    }, (error) => {
      console.error("Chat snapshot error:", error);
      setLoading(false);
    });

    const settingsInterval = setInterval(loadChatSettings, 5 * 60 * 1000);
    const onlineInterval = setInterval(loadOnlineUsers, 5 * 60 * 1000);

    return () => {
      unsubscribeMsgs();
      clearInterval(settingsInterval);
      clearInterval(onlineInterval);
    };
  }, []);

  const loadChatSettings = async () => {
    try {
      const settings = await ChatSettings.list();
      if (settings.length > 0) {
        // if (settings[0].background_url) setChatBgImage(settings[0].background_url); // Disabled for performance (WhatsApp-style smooth open)
        if (settings[0].chat_dp_url) setChatDP(settings[0].chat_dp_url);
      }
    } catch {}
  };

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      await Promise.all([loadMessages(), loadOnlineUsers()]);
    } catch {}
    setLoading(false);
  };

  const loadOnlineUsers = async () => {
    try {
      const activeUsers = await ActiveUser.list("-last_active");
      setActiveUsersList(activeUsers);
    } catch { }
  };

  const loadMessages = async () => {};

  // Handle typing indicator
  useEffect(() => {
    const activeRoomId = roomId || groupId || "global";
    const unsub = onSnapshot(doc(db, "typing_status", activeRoomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = Date.now();
        const typing = Object.entries(data || {})
          .filter(([uid, val]) => uid !== user?.id && val && typeof val === 'object' && val.timestamp && (now - val.timestamp < 10000))
          .map(([_, val]) => val.ign || "Someone");
        setTypingUsers(typing);
      }
    });
    return () => unsub();
  }, [roomId, groupId, user]);

  // Bulletproof active chat tracking
  useEffect(() => {
    const activeId = groupId || roomId || "global";
    window.ACTIVE_CHAT_ID = activeId;
    localStorage.setItem('active_chat_id', activeId);
    
    return () => {
      if (window.ACTIVE_CHAT_ID === activeId) {
        window.ACTIVE_CHAT_ID = null;
      }
      if (localStorage.getItem('active_chat_id') === activeId) {
        localStorage.removeItem('active_chat_id');
      }
    };
  }, [roomId, groupId]);

  useEffect(() => {
    const handleOpenSearch = (e) => {
      const { chatId } = e.detail || {};
      const currentChatId = groupId || roomId;
      if (chatId === currentChatId) {
        setIsSearching(true);
        setTimeout(() => {
          document.getElementById('chat-search-input')?.focus();
        }, 100);
      }
    };
    window.addEventListener("openChatSearch", handleOpenSearch);
    return () => window.removeEventListener("openChatSearch", handleOpenSearch);
  }, [groupId, roomId]);

  const updateTypingStatus = async (isTyping) => {
    if (!user) return;
    const activeRoomId = roomId || groupId || "global";
    const ref = doc(db, "typing_status", activeRoomId);
    try {
      if (isTyping) {
        await setDoc(ref, {
          [user.id]: { ign: user.ign || user.full_name, timestamp: Date.now() }
        }, { merge: true });
      } else {
        await setDoc(ref, {
          [user.id]: { ign: user.ign || user.full_name, timestamp: 0 }
        }, { merge: true });
      }
    } catch {}
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    
    // Save scroll position for this chat
    const activeId = groupId || roomId || "global";
    sessionStorage.setItem(`chat_scroll_${activeId}`, scrollTop);
    
    const atBottom = scrollHeight - scrollTop - clientHeight <= 150;
    setShowScrollBtn(!atBottom);
    isUserScrolledUp.current = !atBottom;
    if (atBottom) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!messages.length || !chatContainerRef.current) return;
    const container = chatContainerRef.current;
    if (!initialScrollDone.current) {
      const activeId = groupId || roomId || "global";
      const savedScroll = sessionStorage.getItem(`chat_scroll_${activeId}`);
      
      const dividerEl = document.getElementById('unread-divider');
      
      if (savedScroll !== null) {
        container.scrollTop = parseInt(savedScroll, 10);
        // Check if restored position is scrolled up
        const { scrollTop, scrollHeight, clientHeight } = container;
        const atBottom = scrollHeight - scrollTop - clientHeight <= 150;
        isUserScrolledUp.current = !atBottom;
        setShowScrollBtn(!atBottom);
      } else if (dividerEl) {
        dividerEl.scrollIntoView({ behavior: 'auto', block: 'center' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
      initialScrollDone.current = true;
      prevMessagesLength.current = messages.length;
      return;
    }
    if (messages.length > prevMessagesLength.current) {
      prevMessagesLength.current = messages.length;
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage?.user_id === user?.id;
      if (!isUserScrolledUp.current || isOwnMessage) {
        container.scrollTop = container.scrollHeight;
        setUnreadCount(0);
      }
    }
  }, [messages, user]);

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    setUnreadCount(0);
    isUserScrolledUp.current = false;
  }, []);

  // WhatsApp-style: Mark messages as read and clear unread count
  useEffect(() => {
    if (roomType === "group" && groupId && groupId.startsWith("direct_") && user) {
      if (!isUserScrolledUp.current) {
        try {
          const otherUserId = recipient?.id || groupId.replace('direct_', '').replace(user.id, '').replace('_', '');
          const chatRef = doc(db, "direct_chats", groupId);
          setDoc(chatRef, {
            participants: [user.id, otherUserId],
            [`unread_count_${user.id}`]: 0
          }, { merge: true }).catch(() => {});

          const unreadMsgs = messages.filter(m => m.user_id !== user.id && m.is_read === false);
          if (unreadMsgs.length > 0) {
            const batch = writeBatch(db);
            unreadMsgs.forEach(msg => {
              const msgRef = doc(db, "group_chat_messages", msg.id);
              batch.update(msgRef, { is_read: true });
            });
            batch.commit().catch(() => {});
          }
        } catch (e) {
          console.error("Read receipt error:", e);
        }
      }
    }
  }, [messages, user, groupId, roomType, recipient]);

  const sendMessage = async (mediaUrl = null, mediaType = "text") => {
    const messageText = mediaUrl ? mediaUrl : newMessage;
    if (!messageText.trim() || !user) return;
    
    updateTypingStatus(false);
    
    if (!mediaUrl && user.chat_muted_until && new Date(user.chat_muted_until) > new Date()) {
      alert(`You are muted until ${new Date(user.chat_muted_until).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      return;
    }
    
    setSending(true);
    const msgText = newMessage.trim();
    setNewMessage("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setReplyTo(null);
    setShowEmojiPicker(false);
    
    try {
      const filteredMessage = mediaUrl ? mediaUrl : filterBadWords(msgText);
      Entity.create({
        user_id: user.id,
        username: user.full_name,
        user_ign: user.ign || user.full_name,
        avatar_url: user.avatar_url,
        sender_email: user.email,
        sender_role: user.role,
        message: filteredMessage,
        message_type: mediaType,
        reply_to_id: replyTo?.id || null,
        reply_to_text: replyTo?.message_type === 'image' ? replyTo.message : (replyTo?.message?.substring(0, 50) || null),
        reply_to_user: replyTo?.username || replyTo?.user_ign || null,
        reply_to_type: replyTo?.message_type || 'text',
        is_deleted: false,
        is_pinned: false,
        is_read: false,
        reactions: { likes: [], hearts: [], laughs: [], fire: [], claps: [] },
        created_at: new Date().toISOString(),
        ...(roomType === "tournament" ? { tournament_id: roomId } : 
            roomType === "group" ? { group_id: groupId } : {})
      }).catch(error => console.error("Error sending message to Firestore:", error));

      if (roomType === "group" && groupId && groupId.startsWith("direct_") && recipient) {
        try {
          let displayLastMessage = filteredMessage.substring(0, 50);
          if (mediaType === 'image') displayLastMessage = '🖼️ Photo';
          else if (mediaType === 'video') displayLastMessage = '🎥 Video';
          else if (mediaType === 'document' || mediaType === 'file') displayLastMessage = '📄 Document';
          else if (mediaType === 'audio') displayLastMessage = '🎵 Audio';
          else if (filteredMessage.startsWith('http://') || filteredMessage.startsWith('https://')) displayLastMessage = '🔗 Link';

          const chatRef = doc(db, "direct_chats", groupId);
          setDoc(chatRef, {
            participants: [user.id, recipient.id],
            [`unread_count_${recipient.id}`]: increment(1),
            last_message: displayLastMessage,
            last_message_timestamp: new Date().toISOString(),
            last_sender_name: user.ign || user.full_name
          }, { merge: true });
        } catch(e) {
          console.error(e);
        }
      }
      
      // Trigger Support Ticket Push Notification if Admin replies
      if (user.role === 'admin' && roomType === "group" && groupId) {
        try {
          const { SupportTicket, User: EntityUser } = await import('@/api/entities');
          const tickets = await SupportTicket.filter({ id: groupId });
          if (tickets && tickets.length > 0) {
            const ticketOwner = await EntityUser.get(tickets[0].user_id);
            if (ticketOwner && ticketOwner.fcm_token) {
              fetch('/api/sendPush', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token: ticketOwner.fcm_token,
                  title: 'Support Ticket Update',
                  body: 'An admin has replied to your support ticket: ' + tickets[0].subject
                })
              }).catch(e => console.error(e));
            }
          }
        } catch(e) { console.error("Support Push Error:", e); }
      }
      
      try {
         await User.addXP(user.id, 1);
      } catch (e) { console.error("Failed to add XP", e); }
      
      playChatSound('send'); 
    } catch (error) {
      console.error("Error sending:", error);
    }
    setSending(false);
  };

  const logCall = async (isVideo) => {
    if (!user) return null;
    
    try {
      const res = await Entity.create({
        user_id: user.id,
        username: user.full_name,
        user_ign: user.ign || user.full_name,
        avatar_url: user.avatar_url,
        sender_email: user.email,
        sender_role: user.role,
        message: isVideo ? "Video Call" : "Audio Call",
        message_type: 'call_log',
        reply_to_id: null,
        reply_to_text: null,
        reply_to_user: null,
        reply_to_type: 'text',
        is_deleted: false,
        is_pinned: false,
        is_read: false,
        reactions: { likes: [], hearts: [], laughs: [], fire: [], claps: [] },
        created_at: new Date().toISOString(),
        ...(roomType === "tournament" ? { tournament_id: roomId } : 
            roomType === "group" ? { group_id: groupId } : {})
      });

      if (roomType === "group" && groupId && groupId.startsWith("direct_") && recipient) {
        try {
          let displayLastMessage = isVideo ? '🎥 Video Call' : '📞 Audio Call';
          import('firebase/firestore').then(({ doc, setDoc, increment }) => {
            const chatRef = doc(db, "direct_chats", groupId);
            setDoc(chatRef, {
              participants: [user.id, recipient.id],
              last_message: displayLastMessage,
              last_message_timestamp: new Date().toISOString(),
              [`unread_count_${recipient.id}`]: increment(1)
            }, { merge: true }).catch(() => {});
          });
        } catch (e) { console.error(e); }
      }

      const colName = roomType === "global" ? "messages" : 
                      roomType === "group" ? "group_chat_messages" : 
                      "tournament_chats";

      return { msgId: res.id, collection: colName };
    } catch (error) {
      console.error("Error logging call:", error);
      return null;
    }
  };

  const sendPoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some(o => !o.text.trim()) || !user) return;
    
    setSending(true);
    setShowPollModal(false);
    
    try {
      await Entity.create({
        user_id: user.id,
        username: user.full_name,
        user_ign: user.ign || user.full_name,
        avatar_url: user.avatar_url,
        sender_email: user.email,
        sender_role: user.role,
        message: "Created a poll",
        message_type: "poll",
        poll_data: {
          question: pollQuestion,
          options: pollOptions.map(o => ({ id: o.id, text: o.text, votes: [] }))
        },
        is_deleted: false,
        is_pinned: false,
        is_read: false,
        reactions: { likes: [], hearts: [], laughs: [], fire: [], claps: [] },
        created_at: new Date().toISOString(),
        ...(roomType === "tournament" ? { tournament_id: roomId } : 
            roomType === "group" ? { group_id: groupId } : {})
      });

      if (roomType === "group" && groupId && groupId.startsWith("direct_") && recipient) {
        try {
          const chatRef = doc(db, "direct_chats", groupId);
          setDoc(chatRef, {
            participants: [user.id, recipient.id],
            [`unread_count_${recipient.id}`]: increment(1),
            last_message: "📊 Poll",
            last_message_timestamp: new Date().toISOString(),
            last_sender_name: user.ign || user.full_name
          }, { merge: true });
        } catch(e) {
          console.error(e);
        }
      }

      playChatSound('send'); 
      setPollQuestion("");
      setPollOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
    } catch (error) {
      console.error("Error sending poll:", error);
    }
    setSending(false);
  };

  const handleVotePoll = async (msg, optionId) => {
    if (!user) return;
    try {
      const updatedOptions = msg.poll_data.options.map(opt => {
        const newVotes = opt.votes.filter(id => id !== user.id);
        if (opt.id === optionId) {
          newVotes.push(user.id);
        }
        return { ...opt, votes: newVotes };
      });
      await Entity.update(msg.id, { poll_data: { ...msg.poll_data, options: updatedOptions } });
    } catch(e) { console.error("Vote error", e); }
  };

  const saveEditMessage = async (msgId) => {
    if (!editText.trim()) return;
    try {
      await Entity.update(msgId, { message: filterBadWords(editText.trim()), edited: true, edited_at: new Date().toISOString() });
      setEditingMessageId(null);
      setEditText("");
      await loadMessages();
    } catch {}
  };

  const deleteMessage = async (msg) => {
    try {
      const deletedBy = user.role === "admin" ? "admin" : "user";
      await Entity.update(msg.id, {
        is_deleted: true,
        deleted_by: deletedBy,
        message: deletedBy === "admin" ? "🚫 Removed by admin" : "🗑️ Message deleted",
        message_type: "text"
      });
      await loadMessages();
    } catch {}
  };

  const togglePin = async (msg) => {
    try {
      if (!msg.is_pinned && pinnedMessage) await Entity.update(pinnedMessage.id, { is_pinned: false });
      await Entity.update(msg.id, { is_pinned: !msg.is_pinned });
      await loadMessages();
    } catch {}
  };

  const markAsAnnouncement = async (msg) => {
    try {
      await Entity.update(msg.id, { is_announcement: !msg.is_announcement });
      await loadMessages();
    } catch {}
  };

  const getReactorNames = (userIds) => {
    if (!userIds || !userIds.length) return "";
    return userIds.map(id => {
      if (id === user?.id) return "You";
      const uMsg = messages.find(m => m.user_id === id);
      return uMsg ? (uMsg.username || uMsg.user_ign || "Someone") : "Someone";
    }).join(", ");
  };

  const getLatestReactor = (userIds) => {
    if (!userIds || !userIds.length) return null;
    const id = userIds[userIds.length - 1];
    if (id === user?.id) return { ign: user.username || 'U' };
    const uMsg = messages.find(m => m.user_id === id);
    return { ign: uMsg?.username || uMsg?.user_ign || 'U' };
  };

  const addReaction = async (msg, type) => {
    try {
      const reactions = { likes: [], hearts: [], laughs: [], fire: [], claps: [], ...(msg.reactions || {}) };
      const arr = reactions[type] || [];
      reactions[type] = arr.includes(user.id) ? arr.filter(id => id !== user.id) : [...arr, user.id];
      await Entity.update(msg.id, { reactions });
      setShowReactionPicker(null);
      await loadMessages();
    } catch {}
  };

  const abortControllerRef = useRef(null);

  const uploadAndSendFile = async (file) => {
    if (!file || !user) return;
    
    let type = "file";
    if (file.type.startsWith('image/')) type = "image";
    else if (file.type.startsWith('audio/')) type = "audio";
    else if (file.type.startsWith('video/')) type = "video";
    else if (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.type.startsWith('text/') || file.type.includes('document')) type = "document";
    else type = "document";

    const tempId = `upload_${Date.now()}`;
    const previewUrl = URL.createObjectURL(file);
    const abortController = new AbortController();

    setActiveUploads(prev => ({
      ...prev,
      [tempId]: { file, progress: 0, loaded: 0, total: file.size, type, previewUrl, abortController }
    }));
    
    try {
      const file_url = await uploadFileToAWS(file, (loaded, total) => {
        if (total > 0) {
          const progress = Math.round((loaded / total) * 100);
          setActiveUploads(prev => {
            if (!prev[tempId]) return prev;
            return { ...prev, [tempId]: { ...prev[tempId], progress, loaded, total } };
          });
        }
      }, abortController.signal);
      
      await sendMessage(`${file_url}::${file.name}::${file.size}`, type);
    } catch (err) {
      if (err.message === "AbortError" || err.code === 'storage/canceled') {
        toast.info("Upload cancelled.");
      } else {
        console.error("Upload error:", err);
        toast.error(`Upload failed: ${err.code || err.message || 'Unknown error'}`);
      }
    } finally {
      setActiveUploads(prev => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
      URL.revokeObjectURL(previewUrl);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      cancelRecordingRef.current = false;
      
      mediaRecorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
        
        if (!cancelRecordingRef.current) {
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const file = new File([audioBlob], `voice-note.${ext}`, { type: mimeType });
          uploadAndSendFile(file);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (mediaRecorderRef.current && isRecording) {
      cancelRecordingRef.current = !shouldSend;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };


  const handleTouchStart = (e, msg) => {
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
       if (!msg.is_deleted) {
          if (navigator.vibrate) navigator.vibrate(50);
          setActiveDropdownId(msg.id);
       }
    }, 500);
  };

  const handleTouchMove = (e, msgId) => {
    const diff = e.touches[0].clientX - touchStartRef.current;
    const diffY = e.touches[0].clientY - (touchStartYRef.current || e.touches[0].clientY);
    
    if (Math.abs(diff) > 5 || Math.abs(diffY) > 5) {
       if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
    
    // Only trigger re-render if the user clearly swipes right (diff > 5)
    // This prevents micro-jiggle from freezing the app on long-press
    if (diff > 5 && diff < 100) {
      setSwipedMessageId(msgId);
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = (msg) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    if (swipeOffset > 10) {
      setReplyTo(msg);
      if (navigator.vibrate) navigator.vibrate(30);
    }
    setSwipedMessageId(null);
    setSwipeOffset(0);
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-400 text-black rounded px-0.5">{part}</mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const groupedMessages = [];
  let lastDate = null;
  const filteredMessages = messages.filter(m => {
    if (m.is_deleted) return false;
    if (searchQuery.trim() && !m.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    let notClearedByMe = true;
    if (roomType === "group" && groupId) {
      const clearedTime = (realtimeUser || user)?.cleared_group_chats?.[groupId] || 0;
      const msgTime = new Date(m.created_at || m.created_date).getTime();
      notClearedByMe = msgTime > clearedTime;
    } else {
      notClearedByMe = !(m.cleared_by && m.cleared_by.includes((realtimeUser || user)?.id));
    }

    // Hide messages from blocked users
    const isSenderBlocked = (realtimeUser || user)?.blocked_users?.includes(m.sender_id);
    if (isSenderBlocked) return false;

    return notClearedByMe;
  });

  filteredMessages.forEach((msg, index) => {
    const dateLabel = getDateLabel(msg.created_at || msg.created_date);
    if (dateLabel !== lastDate) {
      groupedMessages.push({ type: 'date', label: dateLabel, id: `date-${index}` });
      lastDate = dateLabel;
    }
    groupedMessages.push({ type: 'msg', msg });
  });

  Object.values(activeUploads).forEach((upload, index) => {
    groupedMessages.push({
      type: 'msg',
      msg: {
        id: `upload-${index}`,
        isUploading: true,
        user_id: user?.id,
        sender_id: user?.id,
        user_name: user?.full_name,
        user_ign: user?.ign,
        message_type: upload.type,
        message: `${upload.previewUrl}::${upload.file.name}::${upload.file.size}`,
        created_at: new Date().toISOString(),
        created_date: new Date().toISOString(),
        progress: upload.progress,
        loaded: upload.loaded,
        total: upload.total,
        abortController: upload.abortController
      }
    });
  });

  // Replaced full screen loader with inline loader to make chat feel faster

  // Allow unauthenticated users to view the chat, but not send messages.

  const canChat = Boolean(user && (user.role === "admin" || roomType === "global" || roomType === "group" || isRegistered));

  return (
    <div
      className="w-full h-full flex-1 min-h-0 flex flex-col relative"
      style={{
        background: chatBgImage ? `url(${chatBgImage}) center/cover` : `#030712 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cg opacity='0.035' fill='%23ffffff'%3E%3Ctext x='125' y='125' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' font-weight='900' transform='rotate(-30 125 125)'%3EBATTLEHUB FF%3C/text%3E%3Ccircle cx='40' cy='40' r='2' /%3E%3Ccircle cx='210' cy='210' r='1.5' /%3E%3Cpath d='M 20 220 L 30 220 M 25 215 L 25 225' stroke='%23ffffff' stroke-width='1.5' fill='none' /%3E%3Cpath d='M 220 50 L 230 60 M 230 50 L 220 60' stroke='%23ffffff' stroke-width='1.5' fill='none' /%3E%3C/g%3E%3C/svg%3E") repeat`,
      }}
    >
      {chatBgImage && <div className="absolute inset-0 bg-black/75 z-0 pointer-events-none" />}

      {/* ── Header ── */}
      <div className={`relative z-10 flex-shrink-0 bg-gray-950/90 backdrop-blur-xl border-b border-white/8 px-4 py-3 shadow-2xl${hideHeader && !isSearching ? ' hidden' : ''}`}>
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {isSearching ? (
            <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="bg-gray-900 border-gray-800 text-white text-sm h-10 w-full focus:border-cyan-500/50"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery("");
                }}
                className="text-gray-400 hover:text-white px-2.5"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    className="w-11 h-11 ring-2 ring-cyan-500/50 cursor-pointer shadow-lg shadow-cyan-900/30"
                    onClick={() => {
                      const dp = recipient ? (realtimeRecipient || recipient).avatar_url : (roomAvatar || chatDP);
                      if (dp) handleOpenMedia(dp, 'image');
                    }}
                  >
                    <AvatarImage src={(recipient ? (realtimeRecipient || recipient).avatar_url : (roomAvatar || chatDP)) || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-purple-700">
                      <Flame className="w-5 h-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h1 className="font-bold text-white text-[15px] leading-tight tracking-tight">{roomTitle}</h1>
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      if (!recipient) return (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full inline-block bg-emerald-400" />
                          <p className="text-xs font-medium text-emerald-400">{onlineCount} online</p>
                        </>
                      );
                      const t = realtimeRecipient || recipient;
                      const status = t.activity_status || 'Offline';
                      let finalStatus = 'Offline';
                      let color = 'bg-gray-500';
                      let textColor = 'text-gray-500';
                      
                      if (status === 'In Match') {
                        finalStatus = 'In Match';
                        color = 'bg-[#0ea5e9]';
                        textColor = 'text-[#0ea5e9]';
                      } else if (status === 'Online') {
                        const diff = new Date() - new Date(t.last_active || 0);
                        if (diff < 15 * 60 * 1000) {
                          finalStatus = 'Online';
                          color = 'bg-[#00e676]';
                          textColor = 'text-[#00e676]';
                        }
                      }
                      
                      return (
                        <>
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${color}`} />
                          <p className={`text-xs font-medium ${textColor}`}>{finalStatus}</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {roomType === "group" && (
                  <>
                    <button onClick={async () => {
                      if (recipient) {
                        const chatContext = await logCall(true);
                        initiateCall({ ...recipient, isGroup: false }, 'webrtc', true, chatContext);
                      } else {
                        const finalRoomId = groupId || roomId;
                        if (!finalRoomId) return;
                        const callRecipient = { id: finalRoomId, ign: roomTitle, isGroup: true };
                        const chatContext = await logCall(true);
                        initiateCall(callRecipient, 'webrtc', true, chatContext);
                      }
                    }} className="w-9 h-9 rounded-full bg-gray-800/60 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95">
                      <Video className="w-4 h-4" />
                    </button>
                    <button onClick={async () => {
                      if (recipient) {
                        const chatContext = await logCall(false);
                        initiateCall({ ...recipient, isGroup: false }, 'webrtc', false, chatContext);
                      } else {
                        const finalRoomId = groupId || roomId;
                        if (!finalRoomId) return;
                        const callRecipient = { id: finalRoomId, ign: roomTitle, isGroup: true };
                        const chatContext = await logCall(false);
                        initiateCall(callRecipient, 'webrtc', false, chatContext);
                      }
                    }} className="w-9 h-9 rounded-full bg-gray-800/60 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95">
                      <Phone className="w-4 h-4" />
                    </button>
                  </>
                )}
                {roomType === "direct" && (
                  <>
                    <button onClick={async () => {
                      const idParts = roomId.replace('direct_', '').split('_');
                      const otherUserId = idParts.find(id => id.toString() !== user?.id?.toString()) || idParts[0];
                      const recipientObj = { id: otherUserId, ign: roomTitle, avatar_url: roomAvatar };
                      const chatContext = await logCall(true);
                      initiateCall(recipientObj, 'webrtc', true, chatContext);
                    }} className="w-9 h-9 rounded-full bg-gray-800/60 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95">
                      <Video className="w-4 h-4" />
                    </button>
                    <button onClick={async () => {
                      const idParts = roomId.replace('direct_', '').split('_');
                      const otherUserId = idParts.find(id => id.toString() !== user?.id?.toString()) || idParts[0];
                      const recipientObj = { id: otherUserId, ign: roomTitle, avatar_url: roomAvatar };
                      const chatContext = await logCall(false);
                      initiateCall(recipientObj, 'webrtc', false, chatContext);
                    }} className="w-9 h-9 rounded-full bg-gray-800/60 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95">
                      <Phone className="w-4 h-4" />
                    </button>
                  </>
                )}

                {roomType !== "tournament" ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button className="w-9 h-9 rounded-full bg-gray-800/60 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[150] w-48 bg-slate-900 border-slate-800">
                      <DropdownMenuItem onClick={() => setIsSearching(true)} className="text-gray-300 hover:text-white hover:bg-slate-800 cursor-pointer">
                        <Search className="w-4 h-4 mr-2" /> Search Messages
                      </DropdownMenuItem>
                      {customMenuItems && customMenuItems}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    onClick={() => setIsSearching(true)}
                    className="w-9 h-9 rounded-full bg-gray-800/60 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}

                {onExpand && (
                  <button onClick={onExpand} className="w-9 h-9 rounded-full bg-gray-800/60 border border-white/5 flex items-center justify-center text-cyan-400 hover:text-white hover:bg-cyan-900/50 transition-all active:scale-95">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
                {onShrink && (
                  <button onClick={onShrink} className="w-9 h-9 rounded-full bg-gray-800/60 border border-white/5 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-900/50 transition-all active:scale-95">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>



      {/* ── Pinned Message ── */}
      {pinnedMessage && !pinnedMessage.is_deleted && (
        <div
          className="relative z-10 flex-shrink-0 bg-amber-500/8 border-b border-amber-500/20 px-4 py-2 cursor-pointer hover:bg-amber-500/12 active:bg-amber-500/20"
          onClick={() => {
            const el = document.getElementById(`msg-${pinnedMessage.id}`);
            if (el && chatContainerRef.current) {
              chatContainerRef.current.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
              el.classList.add('ring-2', 'ring-yellow-400', 'rounded-2xl');
              setTimeout(() => el.classList.remove('ring-2', 'ring-yellow-400', 'rounded-2xl'), 2000);
            } else {
              setShowPinnedFull(true);
            }
          }}
        >
          <div className="max-w-3xl mx-auto flex items-center gap-2.5">
            <div className="w-0.5 h-7 bg-amber-400 rounded-full flex-shrink-0" />
            <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <p className="text-amber-200/90 text-xs truncate flex-1 font-medium">{pinnedMessage.message}</p>
            <span className="text-amber-500/50 text-[10px] shrink-0">tap</span>
          </div>
        </div>
      )}

      {/* ── Pinned Full Popup ── */}
      {showPinnedFull && pinnedMessage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4" onClick={() => setShowPinnedFull(false)}>
          <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-5 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                <Pin className="w-4 h-4" />Pinned Message
              </span>
              <button onClick={() => setShowPinnedFull(false)} className="text-gray-500 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-white text-sm whitespace-pre-wrap break-words leading-relaxed">{pinnedMessage.message}</p>
            <p className="text-gray-500 text-xs mt-3">— {pinnedMessage.username || pinnedMessage.user_ign}</p>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div
        ref={chatContainerRef}
        className="relative z-10 flex-1 overflow-y-auto px-3 py-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(55,65,81,0.5) transparent' }}
        onPointerDown={() => setShowReactionPicker(null)}
        onScroll={handleScroll}
      >
        <div className="max-w-3xl mx-auto space-y-0.5">
          {loading ? (
            <div className="flex flex-col gap-5 p-2 w-full animate-pulse mt-auto">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`flex w-full ${i % 2 !== 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex items-end gap-2 max-w-[75%] ${i % 2 !== 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
                    <div className={`rounded-2xl p-3 space-y-2.5 ${i % 2 !== 0 ? 'bg-white/5 rounded-bl-none' : 'bg-cyan-900/20 rounded-br-none'}`}>
                      <div className="h-2.5 w-32 bg-white/10 rounded-full" />
                      <div className={`h-2.5 ${i % 3 === 0 ? 'w-48' : 'w-24'} bg-white/10 rounded-full`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : groupedMessages.map((item) => {
            if (item.type === 'date') {
              return (
                <div key={item.id} className="flex items-center gap-3 py-4">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-gray-500 text-xs px-3 py-1 bg-gray-800/50 rounded-full border border-white/5 backdrop-blur">
                    {item.label}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              );
            }

            const { msg } = item;
            const isOwn = msg.user_id === user?.id;
            const displayIgn = (recipient && !isOwn) ? (recipient.ign || recipient.full_name) : (msg.user_ign || msg.username);
            const displayAvatarUrl = (recipient && !isOwn) ? recipient.avatar_url : msg.avatar_url;
            const isImage = msg.message_type === "image";
            const isVideo = msg.message_type === "video";
            const isAudio = msg.message_type === "audio";
            const isFile = msg.message_type === "file" || msg.message_type === "document";
            const isPoll = msg.message_type === "poll";
            const isCallLog = msg.message_type === "call_log";
            const parts = typeof msg.message === 'string' ? msg.message.split('::') : [];
            const fileUrl = parts[0] || msg.message;
            const fileName = parts[1] || 'Attachment';
            const isDeleted = msg.is_deleted;
            const isAnnouncement = msg.is_announcement;
            const isAdmin = msg.sender_email === 'shopecdiv@gmail.com' || msg.sender_role === 'admin';
            const totalReactions = REACTIONS.reduce((acc, r) => acc + (msg.reactions?.[r.key]?.length || 0), 0);

            return (
              <React.Fragment key={msg.id}>
                {unreadDividerId === msg.id && (
                  <div id="unread-divider" className="flex items-center gap-3 py-6 animate-in fade-in slide-in-from-top-2 duration-1000">
                    <div className="flex-1 h-px bg-red-500/50" />
                    <span className="text-red-400 font-black text-[10px] sm:text-xs px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 backdrop-blur shadow-[0_0_15px_rgba(239,68,68,0.2)] uppercase tracking-widest">
                      Unread Messages
                    </span>
                    <div className="flex-1 h-px bg-red-500/50" />
                  </div>
                )}
                <div
                  id={`msg-${msg.id}`}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-1 relative overflow-visible`}
                >
                {swipedMessageId === msg.id && swipeOffset > 10 && (
                  <div
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-cyan-400 transition-opacity"
                    style={{ opacity: Math.min(swipeOffset / 60, 1) }}
                  >
                    <Reply className="w-5 h-5 animate-pulse" />
                  </div>
                )}

                <div
                  className={`flex gap-2 max-w-[80%] sm:max-w-[72%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start`}
                  onTouchStart={(e) => handleTouchStart(e, msg)}
                  onTouchMove={(e) => handleTouchMove(e, msg.id)}
                  onTouchEnd={() => handleTouchEnd(msg)}
                  style={{
                    transform: swipedMessageId === msg.id ? `translateX(${swipeOffset}px)` : 'none',
                    transition: swipedMessageId === msg.id ? 'none' : 'transform 0.15s ease'
                  }}
                >
                  {/* Avatar */}
                  {!isOwn && (
                    <button onClick={() => setViewProfileId(msg.user_id)} className="flex-shrink-0 mt-0.5">
                      <Avatar className="w-8 h-8 ring-1 ring-white/10 hover:ring-cyan-400/50">
                        <AvatarImage src={displayAvatarUrl || `https://api.dicebear.com/6.x/bottts/svg?seed=${msg.user_id}`} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-xs font-bold">
                          {displayIgn?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  )}

                  <div className="flex flex-col min-w-[80px]">
                    <DropdownMenu 
                      modal={false}
                      open={activeDropdownId === msg.id} 
                      onOpenChange={open => {
                        if (!open) {
                          lastDropdownCloseTime.current = Date.now();
                          setActiveDropdownId(null);
                        }
                      }}
                    >
                      <div
                        className={`relative rounded-2xl overflow-visible cursor-pointer transition-transform active:scale-[0.98] ${
                          isAnnouncement
                            ? 'bg-gradient-to-br from-amber-600/60 to-orange-700/60 backdrop-blur-xl border border-amber-400/30 shadow-lg rounded-2xl'
                            : isDeleted
                              ? 'bg-black/20 backdrop-blur-md border border-white/5 cursor-default'
                              : isAdmin
                                ? (isOwn 
                                    ? 'bg-orange-500/20 backdrop-blur-xl border border-blue-400/30 shadow-[0_8px_32px_rgba(0,0,0,0.25)] rounded-2xl rounded-tr-sm' 
                                    : 'bg-orange-500/10 backdrop-blur-xl border border-blue-400/20 shadow-[0_8px_32px_rgba(0,0,0,0.25)] rounded-2xl rounded-tl-sm')
                                : isOwn
                                  ? 'bg-white/20 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25)] rounded-2xl rounded-tr-sm'
                                  : 'bg-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)] rounded-2xl rounded-tl-sm'
                        } ${isImage && !isDeleted ? 'p-1' : 'px-2.5 py-1.5'}`}
                        onContextMenu={(e) => {
                          if (isDeleted) return;
                          e.preventDefault();
                          setActiveDropdownId(msg.id);
                        }}
                      >
                        <DropdownMenuTrigger className="absolute inset-0 z-10 pointer-events-none" />
                      {isAnnouncement && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <Megaphone className="w-3 h-3 text-amber-200" />
                          <span className="text-[9px] text-amber-200 font-black tracking-widest uppercase">Announcement</span>
                        </div>
                      )}

                      {!isOwn && (
                        <button
                          onClick={() => setViewProfileId(msg.user_id)}
                          className={`flex items-center gap-1.5 mb-1 ${isImage || isVideo ? 'px-1.5 pt-1' : ''}`}
                        >
                          <span className={`font-semibold text-xs ${isAdmin ? 'text-blue-400 hover:text-blue-300' : 'text-cyan-400 hover:text-cyan-300'}`}>
                            {displayIgn}
                          </span>
                          {isAdmin && <BadgeCheck className="w-3.5 h-3.5 text-orange-500" />}
                        </button>
                      )}

                      {msg.reply_to_text && !isDeleted && (
                        <div
                          className={`rounded-xl p-2 mb-2 border-l-2 cursor-pointer flex items-center gap-2 ${isOwn ? 'bg-black/20 border-violet-300/50' : 'bg-black/20 border-cyan-500/50'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const el = document.getElementById(`msg-${msg.reply_to_id}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.classList.add('bg-cyan-500/30', 'transition-colors', 'duration-500');
                              setTimeout(() => el.classList.remove('bg-cyan-500/30'), 1500);
                            }
                          }}
                        >
                          {(msg.reply_to_type === 'image' || (msg.reply_to_text?.startsWith('http') && msg.reply_to_text?.includes('res.cloudinary'))) && (
                            <img src={msg.reply_to_text?.split('::')[0]} alt="Reply" className="w-8 h-8 object-cover rounded shadow-sm flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-cyan-400 font-semibold">↩ {msg.reply_to_user}</p>
                            <p className="text-xs text-gray-300 truncate">
                              {(msg.reply_to_type === 'image' || (msg.reply_to_text?.startsWith('http') && msg.reply_to_text?.includes('res.cloudinary'))) ? '📸 Photo' : msg.reply_to_text}
                            </p>
                          </div>
                        </div>
                      )}

                      {isDeleted ? (
                        <div className="flex items-center gap-1.5 opacity-80 px-1">
                          <span className="text-[13px] italic text-white/60">
                            🚫 {msg.deleted_by === 'admin' ? 'Removed by admin' : (isOwn ? 'You deleted this message' : 'This message was deleted')}
                          </span>
                        </div>
                      ) : isImage ? (
                        <div className="relative group max-w-[200px] sm:max-w-[240px] max-h-[250px] inline-block">
                          <img
                            src={fileUrl}
                            alt="Shared image"
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                            className={`w-auto h-auto max-w-[200px] sm:max-w-[240px] max-h-[250px] object-cover object-top rounded-xl cursor-pointer hover:opacity-90 select-none border border-white/10 ${msg.isUploading ? 'opacity-50 blur-[2px]' : ''}`}
                            onClick={(e) => {
                              if (msg.isUploading) return;
                              e.stopPropagation();
                              handleOpenMedia(fileUrl, 'image');
                            }}
                            loading="lazy"
                          />
                          {msg.isUploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                               <div className="relative w-14 h-14 flex items-center justify-center bg-black/40 rounded-full backdrop-blur-sm">
                                  <svg className="absolute inset-0 w-14 h-14 transform -rotate-90">
                                      <circle cx="28" cy="28" r="24" stroke="white" strokeWidth="4" fill="none" className="opacity-20" />
                                      <circle cx="28" cy="28" r="24" stroke="#06b6d4" strokeWidth="4" fill="none" 
                                              strokeDasharray="150.7" 
                                              strokeDashoffset={150.7 - ((msg.progress || 0) / 100) * 150.7} 
                                              className="transition-all duration-300" />
                                  </svg>
                                  <button 
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          msg.abortController?.abort();
                                      }} 
                                      className="absolute w-full h-full flex items-center justify-center"
                                  >
                                      <X className="w-6 h-6 text-white hover:text-red-400 transition-colors" />
                                  </button>
                               </div>
                               <div className="mt-2 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                  {msg.loaded ? (msg.loaded / (1024 * 1024)).toFixed(2) : "0.00"} / {msg.total ? (msg.total / (1024 * 1024)).toFixed(2) : "0.00"} MB
                               </div>
                            </div>
                          )}
                        </div>
                      ) : isVideo ? (
                        <div 
                          className="relative w-[200px] h-[250px] sm:w-[240px] rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-white/10 group bg-black"
                          onClick={(e) => {
                            if (msg.isUploading) return;
                            e.stopPropagation();
                            handleOpenMedia(fileUrl, 'video');
                          }}
                        >
                          <video 
                            src={msg.isUploading ? fileUrl : `${fileUrl}#t=0.001`} 
                            className={`w-full h-full object-cover pointer-events-none [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-start-playback-button]:hidden ${msg.isUploading ? 'opacity-50 blur-[2px]' : ''}`} 
                            muted 
                            playsInline
                            preload="metadata"
                          />
                          {!msg.isUploading && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                                <Play className="w-6 h-6 text-white ml-1 fill-white" />
                              </div>
                            </div>
                          )}
                          
                          {msg.isUploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                               <div className="relative w-14 h-14 flex items-center justify-center bg-black/40 rounded-full backdrop-blur-sm">
                                  <svg className="absolute inset-0 w-14 h-14 transform -rotate-90">
                                      <circle cx="28" cy="28" r="24" stroke="white" strokeWidth="4" fill="none" className="opacity-20" />
                                      <circle cx="28" cy="28" r="24" stroke="#06b6d4" strokeWidth="4" fill="none" 
                                              strokeDasharray="150.7" 
                                              strokeDashoffset={150.7 - ((msg.progress || 0) / 100) * 150.7} 
                                              className="transition-all duration-300" />
                                  </svg>
                                  <button 
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          msg.abortController?.abort();
                                      }} 
                                      className="absolute w-full h-full flex items-center justify-center"
                                  >
                                      <X className="w-6 h-6 text-white hover:text-red-400 transition-colors" />
                                  </button>
                               </div>
                               <div className="mt-2 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                  {msg.loaded ? (msg.loaded / (1024 * 1024)).toFixed(2) : "0.00"} / {msg.total ? (msg.total / (1024 * 1024)).toFixed(2) : "0.00"} MB
                               </div>
                            </div>
                          )}
                        </div>
                      ) : isAudio ? (
                        <CustomAudioPlayer 
                          src={fileUrl} 
                          isOwn={isOwn} 
                          avatarUrl={displayAvatarUrl}
                          isUploading={msg.isUploading}
                          msg={msg}
                          onCancel={() => msg.abortController?.abort()}
                        />
                      ) : isFile ? (
                        <div 
                          onClick={(e) => {
                            if (msg.isUploading) return;
                            e.stopPropagation();
                            handleOpenMedia(fileUrl, 'document');
                          }}
                          className={`relative flex items-center gap-2 p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors ${msg.isUploading ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
                        >
                          <FileText className="w-5 h-5 text-cyan-400" />
                          <span className="text-sm font-medium text-white truncate max-w-[150px]">{fileName}</span>
                          <div className="flex flex-col ml-2 items-center">
                            {msg.isUploading && (
                               <div className="relative w-6 h-6 flex items-center justify-center">
                                  <svg className="absolute inset-0 w-6 h-6 transform -rotate-90">
                                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="none" className="opacity-20" />
                                      <circle cx="12" cy="12" r="10" stroke="#06b6d4" strokeWidth="2" fill="none" 
                                              strokeDasharray="62.8" 
                                              strokeDashoffset={62.8 - ((msg.progress || 0) / 100) * 62.8} 
                                              className="transition-all duration-300" />
                                  </svg>
                                  <button 
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          msg.abortController?.abort();
                                      }} 
                                      className="absolute w-full h-full flex items-center justify-center"
                                  >
                                      <X className="w-3 h-3 text-white hover:text-red-400 transition-colors" />
                                  </button>
                               </div>
                            )}
                            {msg.isUploading && (
                               <span className="text-[8px] font-bold text-cyan-400 mt-1 block">
                                  {msg.loaded ? (msg.loaded / (1024 * 1024)).toFixed(1) : "0.0"}M
                               </span>
                            )}
                          </div>
                        </div>
                      ) : isPoll && msg.poll_data ? (
                        <div className="w-[240px] sm:w-[280px]">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart2 className="w-4 h-4 text-cyan-400" />
                            <p className="text-sm font-bold text-white break-words">{msg.poll_data.question}</p>
                          </div>
                          <div className="space-y-2">
                            {msg.poll_data.options.map((opt) => {
                              const totalVotes = msg.poll_data.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
                              const voteCount = opt.votes?.length || 0;
                              const percentage = totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 100);
                              const hasVoted = opt.votes?.includes(user?.id);
                              
                              return (
                                <div 
                                  key={opt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVotePoll(msg, opt.id);
                                  }}
                                  className={`relative overflow-hidden rounded-xl p-2.5 cursor-pointer border transition-colors ${hasVoted ? 'border-cyan-500 bg-cyan-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                  <div className="absolute inset-y-0 left-0 bg-cyan-500/20 transition-all duration-500" style={{ width: `${percentage}%` }} />
                                  <div className="relative z-10 flex justify-between items-center gap-3">
                                    <span className="text-xs font-semibold text-white truncate">{opt.text}</span>
                                    <span className="text-[10px] text-gray-400 font-bold">{voteCount} ({percentage}%)</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[9px] text-gray-500 mt-3 text-right uppercase tracking-wider font-bold">
                            Total Votes: {msg.poll_data.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0)}
                          </p>
                        </div>
                      ) : isCallLog ? (
                        <div className={`flex items-center gap-3 p-3 rounded-xl border border-white/5 min-w-[200px] sm:min-w-[240px] ${isOwn ? 'bg-black/20' : 'bg-gray-800/80'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.message?.includes('Video') ? 'bg-red-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {msg.message?.includes('Video') ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                          </div>
                          <div className="flex flex-col flex-1">
                            <span className="text-sm font-bold text-white">{msg.message}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              {isOwn ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownLeft className="w-3 h-3 text-red-400" />}
                              <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                                {isOwn ? 'Outgoing' : 'Incoming'} Call
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : editingMessageId === msg.id ? (
                        <div className="space-y-2 min-w-[180px]">
                          <Input
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            className="bg-black/30 border-white/20 text-white text-sm h-8"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEditMessage(msg.id);
                              if (e.key === 'Escape') { setEditingMessageId(null); setEditText(""); }
                            }}
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" onClick={() => saveEditMessage(msg.id)} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 px-3">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingMessageId(null); setEditText(""); }} className="h-7 text-xs text-gray-400 px-2">✕</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {(() => {
                            const rawMessage = msg.message || "";
                            const isReelShare = rawMessage.includes('/media?postId=');
                            let textContent = rawMessage;
                            let reelPostId = null;
                            
                            if (isReelShare) {
                              const match = rawMessage.match(/postId=([^&\s]+)/);
                              if (match) {
                                reelPostId = match[1];
                                textContent = rawMessage.replace(/https?:\/\/[^\s]+/, '').trim();
                                if (!textContent) textContent = "Sent a reel";
                              }
                            }
                            
                            return (
                              <>
                                <p className="text-[13px] text-white leading-snug break-all whitespace-pre-wrap inline-block">
                                  {textContent.split(/((?:https?:\/\/|battlehub:\/\/|www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?|battlehub:\/\/[^\s]+)/g).map((part, i) => {
                              if (part.match(/^(?:https?:\/\/|battlehub:\/\/|www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?$|^battlehub:\/\/[^\s]+$/)) {
                                let href = part;
                                if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('battlehub://')) {
                                  href = 'https://' + href;
                                }
                                const isInternal = href.startsWith('battlehub://app');
                                return (
                                  <a 
                                    key={i} 
                                    href={href} 
                                    target={isInternal ? "_self" : "_blank"} 
                                    rel="noopener noreferrer" 
                                    className="text-cyan-300 underline hover:text-cyan-200 break-all text-xs"
                                    onClick={(e) => {
                                      if (isInternal) {
                                        e.preventDefault();
                                        try {
                                          const url = new URL(href);
                                          navigate(url.pathname + url.search);
                                        } catch (err) {}
                                      }
                                    }}
                                  >
                                    {part}
                                  </a>
                                );
                              }
                              return highlightText(part, searchQuery);
                            })}
                                </p>
                                {reelPostId && (
                                  <SharedReelCard postId={reelPostId} />
                                )}
                              </>
                            );
                          })()}
                          {(msg.message || "").split(/\s+/).map((word, wi) => {
                            const ytId = getYouTubeId(word);
                            if (!ytId) return null;
                            return (
                              <div key={wi} className="mt-2 rounded-xl overflow-hidden" style={{ width: '100%', maxWidth: 280, aspectRatio: '16/9' }}>
                                <iframe
                                  width="100%"
                                  height="100%"
                                  src={`https://www.youtube.com/embed/${ytId}`}
                                  title="YouTube video player"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                ></iframe>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isDeleted && (
                        <div className={`flex items-end justify-between gap-3 mt-1 min-h-[16px] ${isImage ? 'px-1 pb-0.5' : ''}`}>
                          <div className="flex flex-wrap gap-1">
                            {totalReactions > 0 && REACTIONS.map(r => {
                              const count = msg.reactions?.[r.key]?.length || 0;
                              if (!count) return null;
                              const hasReacted = msg.reactions?.[r.key]?.includes(user?.id);
                              return (
                                <button
                                  key={r.key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowReactors({ emoji: r.emoji, users: msg.reactions[r.key] });
                                  }}
                                  title={getReactorNames(msg.reactions[r.key])}
                                  className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 transition-colors ${hasReacted ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}
                                >
                                  <span className="text-[11px] leading-none">{r.emoji}</span>
                                  {count > 1 && <span className="text-[9px] text-white/80 font-medium ml-0.5">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                          
                          <div className="text-[9px] text-white/40 flex items-center gap-1 shrink-0 ml-auto pb-0.5">
                            {msg.edited && <span className="text-[8px] text-white/30 italic">edited</span>}
                            <span>{formatTimeIST(msg.created_at || msg.created_date)}</span>
                            {isOwn && <CheckCheck className="w-[10px] h-[10px] text-cyan-400" />}
                          </div>
                        </div>
                      )}
                    </div>
                  <DropdownMenuContent side="top" sideOffset={8} align={isOwn ? "end" : "start"} className="bg-transparent border-none shadow-none p-0 w-max min-w-[260px] z-[9999] outline-none mb-1">
                    <div className="bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 flex gap-1 justify-between mb-2 shadow-2xl">
                      {REACTIONS.map(r => (
                        <DropdownMenuItem asChild key={r.key}>
                          <button
                            onClick={(e) => {
                              addReaction(msg, r.key);
                            }}
                            className={`text-2xl hover:scale-125 transition-transform active:scale-95 outline-none cursor-pointer ${msg.reactions?.[r.key]?.includes(user?.id) ? 'bg-white/10 rounded-full' : ''}`}
                          >
                            {r.emoji}
                          </button>
                        </DropdownMenuItem>
                      ))}
                    </div>
                    
                    <div className="bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-0.5">
                      <DropdownMenuItem onClick={() => setReplyTo(msg)} className="text-gray-200 text-sm rounded-xl py-3 px-3 cursor-pointer outline-none hover:bg-white/10 focus:bg-white/10">
                        <Reply className="w-4 h-4 mr-3 text-cyan-400" /> Reply
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigator.clipboard.writeText(msg.message)} className="text-gray-200 text-sm rounded-xl py-3 px-3 cursor-pointer outline-none hover:bg-white/10 focus:bg-white/10">
                        <CheckCheck className="w-4 h-4 mr-3 text-emerald-400" /> Copy
                      </DropdownMenuItem>
                      {msg.user_id === user?.id && (
                        <>
                          <DropdownMenuItem onClick={() => { setEditingMessageId(msg.id); setEditText(msg.message); }} className="text-blue-400 text-sm rounded-xl py-3 px-3 cursor-pointer outline-none hover:bg-white/10 focus:bg-white/10">
                            <Pencil className="w-4 h-4 mr-3" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteMessage(msg)} className="text-red-400 text-sm rounded-xl py-3 px-3 cursor-pointer outline-none hover:bg-red-500/10 focus:bg-red-500/10">
                            <Trash2 className="w-4 h-4 mr-3" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                      {user?.role === "admin" && (
                        <>
                          {msg.user_id !== user?.id && (
                            <DropdownMenuItem onClick={() => deleteMessage(msg)} className="text-red-400 text-sm rounded-xl py-3 px-3 cursor-pointer outline-none hover:bg-red-500/10 focus:bg-red-500/10">
                              <Trash2 className="w-4 h-4 mr-3" /> Delete for All
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => togglePin(msg)} className="text-amber-400 text-sm rounded-xl py-3 px-3 cursor-pointer outline-none hover:bg-white/10 focus:bg-white/10">
                            <Pin className="w-4 h-4 mr-3" /> {msg.is_pinned ? 'Unpin' : 'Pin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => markAsAnnouncement(msg)} className="text-orange-500 text-sm rounded-xl py-3 px-3 cursor-pointer outline-none hover:bg-white/10 focus:bg-white/10">
                            <Megaphone className="w-4 h-4 mr-3" /> {msg.is_announcement ? 'Un-announce' : 'Announce'}
                          </DropdownMenuItem>
                        </>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {showScrollBtn && (
        <div className="absolute z-50" style={{ bottom: '80px', right: '16px' }}>
          <div className="relative">
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-1 bg-green-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg z-10 border border-gray-950">
                {unreadCount}
              </div>
            )}
            <button
              onClick={scrollToBottom}
              className="w-10 h-10 flex items-center justify-center bg-gray-800/95 rounded-full border border-white/15 shadow-2xl active:scale-95"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.7)' }}
            >
              <ArrowDown className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {replyTo && (
        <div className="relative z-10 flex-shrink-0 bg-gray-950/95 backdrop-blur border-t border-white/5 px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="w-0.5 h-8 bg-cyan-500 rounded-full flex-shrink-0" />
            {replyTo.message_type === 'image' && (
              <img src={replyTo.message?.split('::')[0]} alt="Preview" className="w-8 h-8 object-cover rounded shadow-sm flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-cyan-400 font-semibold">↩ {replyTo.username || replyTo.user_ign}</p>
              <p className="text-sm text-gray-300 truncate">
                {replyTo.message_type === 'image' ? '📸 Photo' : replyTo.message}
              </p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white p-1.5 rounded-full hover:bg-white/10 mr-12 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Chat Input Area ── */}
      <div className="relative z-10 flex-shrink-0 bg-gray-950/98 backdrop-blur-xl border-t border-white/5 px-3 pt-3 pb-6">
        {typingUsers.length > 0 && (
          <div className="absolute -top-10 left-4 z-20 bg-gray-900/90 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-cyan-400 font-medium truncate max-w-[200px]">
              {typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}
        {!user ? (
          <div className="w-full text-center py-2">
            <p className="text-gray-400 text-sm font-medium">Please wait... loading user data.</p>
          </div>
        ) : !canChat ? (
          <div className="w-full text-center py-2">
            <p className="text-gray-400 text-sm font-medium">Only registered participants can chat.</p>
          </div>
        ) : isChatBlocked ? (
          <div className="w-full text-center py-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <p className="text-red-400 text-sm font-medium">
              {isBlocked ? "You have blocked this user." : "You are blocked by this user."}
            </p>
          </div>
        ) : !canSendGroupMessage ? (
          <div className="w-full text-center py-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <p className="text-gray-400 text-sm font-medium">Only admins can send messages</p>
          </div>
        ) : realtimeGroup?.is_banned ? (
          <BanBanner group={realtimeGroup} user={user} />
        ) : (
          <div className="max-w-3xl mx-auto flex items-end gap-1.5 relative px-2">
            {isRecording ? (
              <div className="flex-1 bg-black/40 backdrop-blur-md border border-purple-500/30 shadow-inner rounded-3xl h-[46px] px-4 flex items-center justify-between animate-in slide-in-from-right-4 fade-in mb-0.5">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 font-mono text-sm">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex-1 px-4 flex items-center gap-1 overflow-hidden justify-end">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="w-1 bg-purple-500 rounded-full animate-pulse opacity-50" style={{ height: `${Math.max(20, Math.random() * 100)}%`, animationDelay: `${i * 100}ms`, minHeight: '4px' }} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => stopRecording(false)} className="w-8 h-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => stopRecording(true)} className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.4)] flex items-center justify-center text-white shrink-0 transition-colors">
                    <Send className="w-4 h-4 -ml-0.5 mt-0.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
              {roomType !== "tournament" && (
                <>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden" 
                    onChange={e => e.target.files[0] && uploadAndSendFile(e.target.files[0])} 
                  />

                  <div className="relative" ref={attachmentMenuRef}>
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAttachmentMenu(!showAttachmentMenu);
                      }}
                      className="w-11 h-11 rounded-full text-gray-400 hover:bg-white/5 hover:text-white flex items-center justify-center flex-shrink-0 transition-colors mb-0.5"
                    >
                      <Plus className="w-6 h-6 pointer-events-none" />
                    </button>
                    
                    {showAttachmentMenu && (
                      <>
                        <div className="absolute bottom-14 left-0 w-[300px] p-2 bg-[#233138] border-none shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 z-[999]">
                          <div className="flex flex-col gap-1">
                            <button 
                              type="button"
                              onClick={() => {
                                if(fileInputRef.current) {
                                  fileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.txt";
                                  fileInputRef.current.click();
                                }
                                setShowAttachmentMenu(false);
                              }} 
                              className="flex items-center gap-4 w-full p-3 hover:bg-white/5 rounded-xl transition-colors group text-left"
                            >
                              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                <FileText className="w-5 h-5 text-white pointer-events-none" />
                              </div>
                              <span className="text-gray-200 font-medium text-[15px] pointer-events-none">Document</span>
                            </button>

                            <button 
                              type="button"
                              onClick={() => {
                                if(fileInputRef.current) {
                                  fileInputRef.current.accept = "image/*,video/*";
                                  fileInputRef.current.click();
                                }
                                setShowAttachmentMenu(false);
                              }} 
                              className="flex items-center gap-4 w-full p-3 hover:bg-white/5 rounded-xl transition-colors group text-left"
                            >
                              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                <Image className="w-5 h-5 text-white pointer-events-none" />
                              </div>
                              <span className="text-gray-200 font-medium text-[15px] pointer-events-none">Photos & videos</span>
                            </button>

                            {!recipient && (
                              <button 
                                type="button"
                                onClick={() => {
                                  setShowPollModal(true);
                                  setShowAttachmentMenu(false);
                                }} 
                                className="flex items-center gap-4 w-full p-3 hover:bg-white/5 rounded-xl transition-colors group text-left"
                              >
                                <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                  <BarChart2 className="w-5 h-5 text-white pointer-events-none" />
                                </div>
                                <span className="text-gray-200 font-medium text-[15px] pointer-events-none">Poll</span>
                              </button>
                            )}
                            
                            <button 
                              type="button"
                              onClick={() => {
                                if(fileInputRef.current) {
                                  fileInputRef.current.accept = "audio/*";
                                  fileInputRef.current.click();
                                }
                                setShowAttachmentMenu(false);
                              }} 
                              className="flex items-center gap-4 w-full p-3 hover:bg-white/5 rounded-xl transition-colors group text-left"
                            >
                              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                <Headphones className="w-5 h-5 text-white pointer-events-none" />
                              </div>
                              <span className="text-gray-200 font-medium text-[15px] pointer-events-none">Audio</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              <div className="flex-1 flex items-end bg-black/40 backdrop-blur-md border border-white/10 focus-within:border-purple-500/50 focus-within:bg-black/60 transition-all shadow-inner rounded-3xl relative overflow-visible">
                
                {roomType !== "tournament" && (
                  <div className="relative flex-shrink-0 flex items-center justify-center pl-2 pb-1" ref={emojiPickerRef}>
                    <button 
                      type="button" 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-gray-400 hover:text-white transition-colors rounded-full"
                    >
                      <SmilePlus className="w-6 h-6" />
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute bottom-[50px] left-0 z-[9999] shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-[#1e1e2d]">
                        <EmojiPicker 
                          theme={Theme.DARK}
                          emojiStyle={EmojiStyle.APPLE}
                          onEmojiClick={(emojiData) => {
                            setNewMessage(prev => prev + emojiData.emoji);
                          }}
                          width={320}
                          height={400}
                          searchDisabled={true}
                          skinTonesDisabled={true}
                        />
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={e => {
                    setNewMessage(e.target.value);
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 112) + 'px';
                    }
                  }}
                  placeholder="Type a message"
                  className="flex-1 bg-transparent text-white placeholder-[#8696a0] py-[11px] px-2 resize-none overflow-hidden min-h-[44px] max-h-28 focus:outline-none text-[16px] leading-[22px] self-end mb-0.5"
                  autoComplete="on"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  spellCheck={true}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendMessage();
                    } else {
                      updateTypingStatus(true);
                    }
                  }}
                  onBlur={() => updateTypingStatus(false)}
                  disabled={sending}
                  rows={1}
                />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (newMessage.trim() && !sending) {
                    sendMessage();
                  } else if (!newMessage.trim()) {
                    startRecording();
                  }
                }}
                disabled={sending}
                className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.4)] flex items-center justify-center flex-shrink-0 text-white transition-all disabled:opacity-50 mb-0.5 cursor-pointer z-10"
              >
                {sending
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin pointer-events-none" />
                  : (newMessage.trim() ? <Send className="w-[22px] h-[22px] ml-1 pointer-events-none" /> : <Mic className="w-[22px] h-[22px] pointer-events-none" />)
                }
              </button>
            </>
          )}
        </div>
        )}
      </div>
      <Dialog open={!!mediaViewer} onOpenChange={handleCloseMedia}>
        <DialogContent className="!z-[9999999] bg-black/95 backdrop-blur-md border-none max-w-none w-screen h-[100dvh] m-0 p-0 rounded-none overflow-hidden [&>button]:hidden flex justify-center items-center">
          
          {mediaViewer?.type === 'gallery' && (
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-[100] flex justify-between items-center pb-10">
              <button onClick={handleCloseMedia} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                 <ArrowLeft className="w-6 h-6" />
              </button>
              {mediaViewer.items[mediaViewer.currentIndex] && (
                 <div className="text-center">
                   <p className="text-white font-bold text-sm">{mediaViewer.items[mediaViewer.currentIndex].username || mediaViewer.items[mediaViewer.currentIndex].user_ign}</p>
                   <p className="text-gray-400 text-xs mt-0.5">{new Date(mediaViewer.items[mediaViewer.currentIndex].created_at || mediaViewer.items[mediaViewer.currentIndex].created_date).toLocaleString()}</p>
                 </div>
              )}
              <div className="w-10"></div>
            </div>
          )}

          {mediaViewer?.type === 'gallery' ? (
             <div 
               className="w-full h-full relative flex items-center justify-center touch-pan-y"
               onTouchStart={(e) => touchStartRef.current = e.touches[0].clientX}
               onTouchEnd={(e) => {
                 const touchEnd = e.changedTouches[0].clientX;
                 const diff = touchStartRef.current - touchEnd;
                 if (diff > 50 && mediaViewer.currentIndex < mediaViewer.items.length - 1) {
                   setMediaViewer({ ...mediaViewer, currentIndex: mediaViewer.currentIndex + 1 });
                 } else if (diff < -50 && mediaViewer.currentIndex > 0) {
                   setMediaViewer({ ...mediaViewer, currentIndex: mediaViewer.currentIndex - 1 });
                 }
               }}
             >
               {mediaViewer.currentIndex > 0 && (
                 <button 
                   className="absolute left-4 z-50 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full hidden sm:block backdrop-blur-sm transition-all"
                   onClick={() => setMediaViewer({ ...mediaViewer, currentIndex: mediaViewer.currentIndex - 1 })}
                 >
                   <ChevronLeft className="w-6 h-6" />
                 </button>
               )}
               
               {mediaViewer.currentIndex < mediaViewer.items.length - 1 && (
                 <button 
                   className="absolute right-4 z-50 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full hidden sm:block backdrop-blur-sm transition-all"
                   onClick={() => setMediaViewer({ ...mediaViewer, currentIndex: mediaViewer.currentIndex + 1 })}
                 >
                   <ChevronRight className="w-6 h-6" />
                 </button>
               )}

               <div className="w-full h-full max-w-5xl mx-auto p-2 pt-20 pb-24 flex items-center justify-center">
                 {(() => {
                   const item = mediaViewer.items[mediaViewer.currentIndex];
                   const url = item?.message?.split('::')[0];
                   if (item?.message_type === 'video') {
                     return <BHTVPlayer src={url} autoPlay className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />;
                   }
                   return (
                     <TransformWrapper
                       minScale={0.5}
                       maxScale={8}
                       initialScale={1}
                       centerOnInit
                       doubleClick={{ mode: "toggle" }}
                     >
                       <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <img src={url} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl cursor-move pointer-events-auto" />
                       </TransformComponent>
                     </TransformWrapper>
                   );
                 })()}
               </div>
             </div>
          ) : mediaViewer?.type === 'image' ? (
            <div className="w-full h-full relative flex items-center justify-center">
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-[100] flex justify-between items-center pb-10">
                <button onClick={handleCloseMedia} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                   <ArrowLeft className="w-6 h-6" />
                </button>
              </div>
              <TransformWrapper
                minScale={0.5}
                maxScale={8}
                initialScale={1}
                centerOnInit
                doubleClick={{ mode: "toggle" }}
              >
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img 
                    src={mediaViewer.url} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain cursor-move"
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
          ) : mediaViewer?.type === 'video' ? (
            <div className="w-full h-full relative flex items-center justify-center p-4">
              <button 
                onClick={handleCloseMedia} 
                className="absolute top-4 left-4 z-[100] p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <BHTVPlayer src={mediaViewer.url} autoPlay className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
            </div>
          ) : mediaViewer?.type === 'document' || mediaViewer?.type === 'file' ? (
            <div className="w-[95vw] h-[90vh] max-w-5xl bg-slate-900 rounded-2xl overflow-hidden flex flex-col pointer-events-auto">
              <div className="p-3 border-b border-white/10 flex justify-between items-center bg-slate-950">
                <h3 className="text-white font-bold text-sm tracking-wider">Document Viewer</h3>
                <div className="flex gap-2">
                  <a 
                    href={mediaViewer.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    title="Open in new tab"
                  >
                    <Link className="w-5 h-5" />
                  </a>
                  <button onClick={handleCloseMedia} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5"/>
                  </button>
                </div>
              </div>
              <iframe 
                src={mediaViewer.url.toLowerCase().split('?')[0].endsWith('.pdf') ? mediaViewer.url : `https://docs.google.com/viewer?url=${encodeURIComponent(mediaViewer.url)}&embedded=true`} 
                className="w-full flex-1 bg-white" 
                title="Document Viewer"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showPollModal} onOpenChange={setShowPollModal}>
        <DialogContent className="bg-gray-950 border-white/10 p-6 rounded-2xl max-w-sm w-[90vw]">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-400" /> Create Poll
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Question</label>
              <Input 
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
                placeholder="Ask something..."
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Options</label>
              {pollOptions.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Input 
                    value={opt.text}
                    onChange={e => {
                      const newOpts = [...pollOptions];
                      newOpts[i].text = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="bg-black/50 border-white/10 text-white"
                  />
                  {pollOptions.length > 2 && (
                    <button 
                      onClick={() => setPollOptions(pollOptions.filter(o => o.id !== opt.id))}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 5 && (
              <Button 
                variant="outline" 
                onClick={() => setPollOptions([...pollOptions, { id: Date.now().toString(), text: '' }])}
                className="w-full border-dashed border-white/20 text-gray-400 bg-transparent hover:bg-white/5"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Option
              </Button>
            )}
            <Button 
              onClick={sendPoll}
              disabled={!pollQuestion.trim() || pollOptions.some(o => !o.text.trim())}
              className="w-full bg-cyan-600 hover:bg-cyan-700 font-bold text-white mt-4"
            >
              Send Poll
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Profile Overlay ── */}
      {viewProfileId && (
        <div className="fixed inset-0 z-[600] bg-slate-950 overflow-y-auto animate-in slide-in-from-right-full duration-300">
           <PlayerProfile 
             inlineUid={viewProfileId} 
             isDrawer={true} 
             onClose={() => setViewProfileId(null)} 
           />
        </div>
      )}

      {ytViewer && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setYtViewer(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 hover:text-white"
            onClick={() => setYtViewer(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-full max-w-2xl aspect-video" onClick={e => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube.com/embed/${ytViewer.id}?autoplay=1`}
              className="w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
            />
          </div>
          <p className="text-gray-500 text-xs mt-3">Tap outside to close</p>
        </div>
      )}
    </div>
  );
}
