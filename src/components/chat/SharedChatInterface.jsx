import React, { useState, useEffect, useRef, useCallback } from "react";
import { User } from "@/entities/User";
import { GlobalChat as GlobalChatEntity } from "@/entities/GlobalChat";
import { TournamentChat as TournamentChatEntity } from "@/entities/TournamentChat";
import { ActiveUser } from "@/entities/ActiveUser";
import { base44 } from "@/api/base44Client";
import { db } from "@/api/firebaseClient";
import { collection, query, orderBy, limit, onSnapshot, where, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send, Pin, Trash2, Reply, X,
  MoreVertical, Shield, Flame, Megaphone, Pencil, Image,
  ChevronDown, SmilePlus, CheckCheck, ArrowDown, Maximize2, Search
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ChatSettings } from "@/entities/ChatSettings";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import UserProfileModal from "./UserProfileModal";

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
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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

export default function SharedChatInterface({ 
  roomType = "global", 
  roomId = null, 
  roomTitle = "BATTLEHUB FF", 
  isClosed = false, 
  isRegistered = true, 
  onExpand, 
  onShrink, 
  user: propUser 
}) {
  const [user, setUser] = useState(propUser || null);
  const Entity = roomType === "global" ? GlobalChatEntity : TournamentChatEntity;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [viewProfileId, setViewProfileId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [chatBgImage, setChatBgImage] = useState("");
  const [chatDP, setChatDP] = useState("");
  const [showReactors, setShowReactors] = useState(null); // { emoji, users }
  const [showPinnedFull, setShowPinnedFull] = useState(false);
  const lastDropdownCloseTime = useRef(0);
  const [ytViewer, setYtViewer] = useState(null); 

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [swipedMessageId, setSwipedMessageId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const isUserScrolledUp = useRef(false);
  const initialScrollDone = useRef(false);
  const prevMessagesLength = useRef(0);
  const touchStartRef = useRef(0);
  const longPressTimer = useRef(null);

  useEffect(() => {
    loadData();
    loadChatSettings();
    localStorage.setItem('unreadChatCount', '0');
    localStorage.setItem('lastChatSeen', Date.now().toString());

    const settingsInterval = setInterval(loadChatSettings, 5 * 60 * 1000);
    const onlineInterval = setInterval(loadOnlineUsers, 5 * 60 * 1000);
    
    // For tournament_chats, avoid composite index requirements by not combining where() and orderBy()
    const colName = roomType === "global" ? "global_chats" : "tournament_chats";
    let qConstraints = [];
    if (roomType === "tournament" && roomId) {
      qConstraints.push(where("tournament_id", "==", roomId));
    } else {
      qConstraints.push(orderBy("created_date", "desc"));
      qConstraints.push(limit(100));
    }
    const q = query(collection(db, colName), ...qConstraints);

    const unsubscribeMsgs = onSnapshot(q, (snap) => {
      let allMessages = [];
      snap.forEach(doc => {
        allMessages.push({ id: doc.id, ...doc.data() });
      });
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      allMessages = allMessages.filter(m => new Date(m.created_date) >= twentyFourHoursAgo);

      if (roomType === "tournament") {
        allMessages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        allMessages = allMessages.slice(0, 100);
      }
        
      localStorage.setItem('lastChatSeen', Date.now().toString());
      localStorage.setItem('unreadChatCount', '0');
      const reversed = allMessages.reverse();
      
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
        if (settings[0].background_url) setChatBgImage(settings[0].background_url);
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
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const activeUsers = await ActiveUser.list("-last_active");
      const recent = activeUsers.filter(u => new Date(u.last_active) > new Date(fiveMinutesAgo)).length;
      setOnlineCount(Math.max(1, recent));
    } catch { setOnlineCount(1); }
  };

  const loadMessages = async () => {};

  // Handle typing indicator
  useEffect(() => {
    const activeRoomId = roomId || "global";
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
  }, [roomId, user]);

  const updateTypingStatus = async (isTyping) => {
    if (!user) return;
    const activeRoomId = roomId || "global";
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
    const atBottom = scrollHeight - scrollTop - clientHeight <= 30;
    setShowScrollBtn(!atBottom);
    isUserScrolledUp.current = !atBottom;
  };

  useEffect(() => {
    if (!messages.length || !chatContainerRef.current) return;
    const container = chatContainerRef.current;
    if (!initialScrollDone.current) {
      container.scrollTop = container.scrollHeight;
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
      await Entity.create({
        user_id: user.id,
        username: user.full_name,
        user_ign: user.ign || user.full_name,
        avatar_url: user.avatar_url,
        message: filteredMessage,
        message_type: mediaType,
        reply_to_id: replyTo?.id || null,
        reply_to_text: replyTo?.message_type === 'image' ? replyTo.message : (replyTo?.message?.substring(0, 50) || null),
        reply_to_user: replyTo?.user_ign || null,
        reply_to_type: replyTo?.message_type || 'text',
        is_deleted: false,
        is_pinned: false,
        reactions: { likes: [], hearts: [], laughs: [], fire: [], claps: [] },
        ...(roomType === "tournament" ? { tournament_id: roomId } : {})
      });
      playChatSound('send'); 
    } catch (error) {
      console.error("Error sending:", error);
    }
    setSending(false);
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
      return uMsg ? (uMsg.user_ign || "Someone") : "Someone";
    }).join(", ");
  };

  const getLatestReactor = (userIds) => {
    if (!userIds || !userIds.length) return null;
    const id = userIds[userIds.length - 1];
    if (id === user?.id) return { ign: user.ign || 'U' };
    const uMsg = messages.find(m => m.user_id === id);
    return { ign: uMsg?.user_ign || 'U' };
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

  const uploadAndSendImage = async (file) => {
    if (!file || !user || user.role !== "admin") return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await sendMessage(file_url, "image");
    } catch {}
    setUploading(false);
  };

  const handleTouchStart = (e, msg) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e, msgId) => {
    const diff = e.touches[0].clientX - touchStartRef.current;
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
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => !m.is_deleted && m.message.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  filteredMessages.forEach((msg, index) => {
    const dateLabel = getDateLabel(msg.created_date);
    if (dateLabel !== lastDate) {
      groupedMessages.push({ type: 'date', label: dateLabel, id: `date-${index}` });
      lastDate = dateLabel;
    }
    groupedMessages.push({ type: 'msg', msg });
  });

  if (loading) {
    return (
      <div className="fixed inset-0 pt-16 flex flex-col bg-gray-950">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Allow unauthenticated users to view the chat, but not send messages.

  const canChat = Boolean(user && (user.role === "admin" || roomType === "global" || isRegistered));

  return (
    <div
      className="w-full h-full flex-1 min-h-0 flex flex-col relative"
      style={{
        background: chatBgImage ? `url(${chatBgImage}) center/cover` : 'rgb(3,7,18)',
      }}
    >
      {chatBgImage && <div className="absolute inset-0 bg-black/75 z-0 pointer-events-none" />}

      {/* ── Header ── */}
      <div className="relative z-10 flex-shrink-0 bg-gray-950/90 backdrop-blur-xl border-b border-white/8 px-4 py-3 shadow-2xl">
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
                    onClick={() => chatDP && setMediaViewer({ url: chatDP, type: 'image' })}
                  >
                    <AvatarImage src={chatDP || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-purple-700">
                      <Flame className="w-5 h-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-gray-950 shadow" />
                </div>
                <div>
                  <h1 className="font-bold text-white text-[15px] leading-tight tracking-tight">{roomTitle}</h1>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    <p className="text-emerald-400 text-xs font-medium">{onlineCount} online</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSearching(true)}
                  className="w-9 h-9 rounded-full bg-gray-800/60 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                >
                  <Search className="w-4.5 h-4.5" />
                </button>
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

      {typingUsers.length > 0 && (
        <div className="absolute top-[70px] left-4 z-20 bg-gray-900/90 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
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
            <p className="text-gray-500 text-xs mt-3">— {pinnedMessage.user_ign}</p>
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
          {groupedMessages.map((item) => {
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
            const isImage = msg.message_type === "image";
            const isDeleted = msg.is_deleted;
            const isAnnouncement = msg.is_announcement;
            const totalReactions = REACTIONS.reduce((acc, r) => acc + (msg.reactions?.[r.key]?.length || 0), 0);

            return (
              <div
                key={msg.id}
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
                  className={`flex gap-2 max-w-[80%] sm:max-w-[72%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end`}
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
                    <button onClick={() => setViewProfileId(msg.user_id)} className="flex-shrink-0 mb-1">
                      <Avatar className="w-8 h-8 ring-1 ring-white/10 hover:ring-cyan-400/50">
                        <AvatarImage src={msg.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${msg.user_id}`} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-xs font-bold">
                          {msg.user_ign?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  )}

                  <div className="flex flex-col min-w-[80px]">
                    <DropdownMenu 
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
                              : isOwn
                                ? 'bg-white/20 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25)] rounded-2xl rounded-tr-sm'
                                : 'bg-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)] rounded-2xl rounded-tl-sm'
                        } ${isImage && !isDeleted ? 'p-1' : 'px-2.5 py-1.5'}`}
                        onClick={(e) => {
                          if (isDeleted) return;
                          if (Math.abs(swipeOffset) > 10) return;
                          // If it was closed within the last 150ms, ignore this click to prevent re-opening
                          if (Date.now() - lastDropdownCloseTime.current < 150) return;
                          setActiveDropdownId(activeDropdownId === msg.id ? null : msg.id);
                        }}
                      >
                        <DropdownMenuTrigger className="absolute inset-0 z-10 pointer-events-none" />
                      {isAnnouncement && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <Megaphone className="w-3 h-3 text-amber-200" />
                          <span className="text-[9px] text-amber-200 font-black tracking-widest uppercase">Announcement</span>
                        </div>
                      )}

                      {!isOwn && !isImage && (
                        <button
                          onClick={() => setViewProfileId(msg.user_id)}
                          className="flex items-center gap-1.5 mb-0.5"
                        >
                          <span className="font-semibold text-xs text-cyan-400 hover:text-cyan-300">
                            {msg.user_ign || msg.username}
                          </span>
                          {msg.sender_role === "admin" && <Shield className="w-3 h-3 text-yellow-400" />}
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
                          {(msg.reply_to_type === 'image' || (msg.reply_to_text.startsWith('http') && msg.reply_to_text.includes('res.cloudinary'))) && (
                            <img src={msg.reply_to_text} alt="Reply" className="w-8 h-8 object-cover rounded shadow-sm flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-cyan-400 font-semibold">↩ {msg.reply_to_user}</p>
                            <p className="text-xs text-gray-300 truncate">
                              {(msg.reply_to_type === 'image' || (msg.reply_to_text.startsWith('http') && msg.reply_to_text.includes('res.cloudinary'))) ? '📸 Photo' : msg.reply_to_text}
                            </p>
                          </div>
                        </div>
                      )}

                      {isDeleted ? (
                        <p className="text-xs text-gray-500 italic">{msg.message}</p>
                      ) : isImage ? (
                        <img
                          src={msg.message}
                          alt="Shared image"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                          className="max-w-[200px] sm:max-w-[240px] rounded-xl cursor-pointer hover:opacity-90 select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMediaViewer({ url: msg.message, type: 'image' });
                          }}
                          loading="lazy"
                        />
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
                          <p className="text-[13px] text-white leading-snug break-words whitespace-pre-wrap inline-block">
                            {(msg.message || "").split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                              part.match(/^https?:\/\//) ? (
                                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline hover:text-cyan-200 break-all text-xs">{part}</a>
                              ) : (
                                highlightText(part, searchQuery)
                              )
                            )}
                          </p>
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
                            <span>{formatTimeIST(msg.created_date)}</span>
                            {isOwn && <CheckCheck className="w-[10px] h-[10px] text-cyan-400" />}
                          </div>
                        </div>
                      )}
                    </div>
                  <DropdownMenuContent side="top" sideOffset={8} align={isOwn ? "end" : "start"} className="bg-transparent border-none shadow-none p-0 w-max min-w-[260px] z-[100] outline-none mb-1">
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
                          <DropdownMenuItem onClick={() => markAsAnnouncement(msg)} className="text-orange-400 text-sm rounded-xl py-3 px-3 cursor-pointer outline-none hover:bg-white/10 focus:bg-white/10">
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
              <img src={replyTo.message} alt="Preview" className="w-8 h-8 object-cover rounded shadow-sm flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-cyan-400 font-semibold">↩ {replyTo.user_ign}</p>
              <p className="text-xs text-gray-400 truncate">
                {replyTo.message_type === 'image' ? '📸 Photo' : replyTo.message}
              </p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white p-1.5 rounded-full hover:bg-white/10 mr-12 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Typing indicator removed from bottom */}

      <div className="relative z-10 flex-shrink-0 bg-gray-950/98 backdrop-blur-xl border-t border-white/5 px-3 py-2 pb-safe">
        {!user ? (
          <div className="w-full text-center py-2">
            <p className="text-gray-400 text-sm font-medium">Please wait... loading user data.</p>
          </div>
        ) : !canChat ? (
          <div className="w-full text-center py-2">
            <p className="text-gray-400 text-sm font-medium">Only registered participants can chat.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex items-end gap-2 relative">
          
          {showEmojiPicker && (
            <div className="absolute bottom-14 left-0 z-50 bg-gray-900 border border-white/10 rounded-2xl p-3 shadow-2xl w-72 h-48 overflow-y-auto grid grid-cols-6 gap-2 backdrop-blur-xl scrollbar-thin">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    setNewMessage(prev => prev + emoji);
                  }}
                  className="text-2xl hover:bg-white/10 p-1.5 rounded active:scale-125 transition-transform flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {user?.role === "admin" && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadAndSendImage(e.target.files[0])} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-10 h-10 rounded-full bg-purple-600/90 hover:bg-purple-600 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mb-0.5"
              >
                {uploading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Image className="w-4 h-4 text-white" />
                }
              </button>
            </>
          )}

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 mb-0.5 transition-colors ${showEmojiPicker ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-400' : 'bg-gray-800/80 border-white/10 text-gray-400 hover:text-white'}`}
          >
            😊
          </button>

          <div className="flex-1 relative">
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
              placeholder="Type a message..."
              className="w-full bg-gray-800/70 border border-white/10 text-white placeholder-gray-500 rounded-2xl px-4 py-2 resize-none overflow-hidden min-h-[38px] max-h-28 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/25 text-sm leading-relaxed"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                } else {
                  updateTypingStatus(true);
                }
              }}
              onBlur={() => updateTypingStatus(false)}
              onClick={() => {
                setShowEmojiPicker(false);
              }}
              disabled={sending}
              rows={1}
            />
          </div>

          <Button
            onClick={() => sendMessage()}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 hover:opacity-90 p-0 flex-shrink-0 mb-0.5 disabled:opacity-25 shadow-lg shadow-violet-900/30"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </Button>
        </div>
        )}
      </div>

      {/* Reactions logic separated out */}

      <Dialog open={!!mediaViewer} onOpenChange={() => setMediaViewer(null)}>
        <DialogContent className="bg-black/97 border-white/10 max-w-4xl p-1 rounded-2xl">
          {mediaViewer?.type === 'image' && (
            <img src={mediaViewer.url} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain rounded-xl" />
          )}
        </DialogContent>
      </Dialog>

      {viewProfileId && (
        <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />
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
