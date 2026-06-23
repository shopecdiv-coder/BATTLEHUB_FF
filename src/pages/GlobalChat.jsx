import React, { useState, useEffect, useRef, useCallback } from "react";
import { User } from "@/entities/User";
import { GlobalChat as ChatEntity } from "@/entities/GlobalChat";
import { ActiveUser } from "@/entities/ActiveUser";
import { base44 } from "@/api/base44Client";
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
import UserProfileModal from "../components/chat/UserProfileModal";

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

export default function GlobalChat() {
  const [user, setUser] = useState(null);
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
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showPinnedFull, setShowPinnedFull] = useState(false);
  const [ytViewer, setYtViewer] = useState(null); 

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [swipedMessageId, setSwipedMessageId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedLongPressedMessage, setSelectedLongPressedMessage] = useState(null);

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

    const msgInterval = setInterval(loadMessages, 4000);
    const settingsInterval = setInterval(loadChatSettings, 60000);
    const onlineInterval = setInterval(loadOnlineUsers, 30000);
    return () => {
      clearInterval(msgInterval);
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
      const activeUsers = await ActiveUser.list();
      setOnlineCount(activeUsers.filter(u => new Date(u.last_active) > new Date(fiveMinutesAgo)).length);
    } catch { setOnlineCount(0); }
  };

  const loadMessages = async () => {
    try {
      const allMessages = await ChatEntity.list("-created_date", 200);
      localStorage.setItem('lastChatSeen', Date.now().toString());
      localStorage.setItem('unreadChatCount', '0');
      const reversed = (allMessages || []).reverse();
      
      setMessages(prev => {
        const newLastId = reversed[reversed.length - 1]?.id;
        const oldLastId = prev[prev.length - 1]?.id;
        
        if (isUserScrolledUp.current && newLastId !== oldLastId && prev.length > 0) {
          const newMsgs = reversed.filter(m => !prev.some(p => p.id === m.id));
          if (newMsgs.length > 0) {
            setUnreadCount(c => c + newMsgs.length);
          }
        }
        return reversed;
      });
      
      const pinned = (allMessages || []).find(m => m.is_pinned && !m.is_deleted);
      setPinnedMessage(pinned);
    } catch {}
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distFromBottom = scrollHeight - scrollTop - clientHeight;
      const atBottom = distFromBottom < 60;
      setShowScrollBtn(!atBottom);
      if (atBottom) {
        isUserScrolledUp.current = false;
        setUnreadCount(0);
      } else {
        isUserScrolledUp.current = true;
      }
    };
    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [loading, messages.length]);

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
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
      setUnreadCount(0);
      isUserScrolledUp.current = false;
    }
  }, []);

  const sendMessage = async (mediaUrl = null, mediaType = "text") => {
    if ((!newMessage.trim() && !mediaUrl) || !user || sending) return;
    if (user.chat_muted_until && new Date(user.chat_muted_until) > new Date()) {
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
      await ChatEntity.create({
        user_id: user.id,
        username: user.full_name,
        user_ign: user.ign || user.full_name,
        avatar_url: user.avatar_url,
        message: filteredMessage,
        message_type: mediaType,
        reply_to_id: replyTo?.id || null,
        reply_to_text: replyTo?.message?.substring(0, 50) || null,
        reply_to_user: replyTo?.user_ign || null,
        is_deleted: false,
        is_pinned: false,
        reactions: { likes: [], hearts: [], laughs: [], fire: [], claps: [] }
      });
      await loadMessages();
    } catch (error) {
      console.error("Error sending:", error);
    }
    setSending(false);
  };

  const saveEditMessage = async (msgId) => {
    if (!editText.trim()) return;
    try {
      await ChatEntity.update(msgId, { message: filterBadWords(editText.trim()), edited: true, edited_at: new Date().toISOString() });
      setEditingMessageId(null);
      setEditText("");
      await loadMessages();
    } catch {}
  };

  const deleteMessage = async (msg) => {
    try {
      const deletedBy = user.role === "admin" ? "admin" : "user";
      await ChatEntity.update(msg.id, {
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
      if (!msg.is_pinned && pinnedMessage) await ChatEntity.update(pinnedMessage.id, { is_pinned: false });
      await ChatEntity.update(msg.id, { is_pinned: !msg.is_pinned });
      await loadMessages();
    } catch {}
  };

  const markAsAnnouncement = async (msg) => {
    try {
      await ChatEntity.update(msg.id, { is_announcement: !msg.is_announcement });
      await loadMessages();
    } catch {}
  };

  const addReaction = async (msg, type) => {
    try {
      const reactions = { likes: [], hearts: [], laughs: [], fire: [], claps: [], ...(msg.reactions || {}) };
      const arr = reactions[type] || [];
      reactions[type] = arr.includes(user.id) ? arr.filter(id => id !== user.id) : [...arr, user.id];
      await ChatEntity.update(msg.id, { reactions });
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
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setSelectedLongPressedMessage(msg);
      setShowBottomSheet(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchMove = (e, msgId) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    const diff = e.touches[0].clientX - touchStartRef.current;
    if (diff > 0 && diff < 100) {
      setSwipedMessageId(msgId);
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = (msg) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    if (swipeOffset > 60) {
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Flame className="w-10 h-10 text-gray-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-300 mb-2">Login Required</h2>
          <p className="text-gray-500">Please login to access Chat</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 pt-16 flex flex-col"
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
                  <h1 className="font-bold text-white text-[15px] leading-tight tracking-tight">BattleHub Chat</h1>
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
                <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold px-2.5 py-1">
                  🔴 LIVE
                </Badge>
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
            const isOwn = msg.user_id === user.id;
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

                  <div className="flex flex-col min-w-0">
                    {/* Bubble */}
                    <div
                      className={`relative rounded-2xl overflow-visible ${
                        isAnnouncement
                          ? 'bg-gradient-to-br from-amber-600/95 to-orange-700/95 border border-amber-400/30 shadow-lg shadow-amber-900/20 rounded-2xl'
                          : isDeleted
                            ? 'bg-gray-800/40'
                            : isOwn
                              ? 'bg-gradient-to-br from-cyan-500 to-violet-600 shadow-lg shadow-cyan-500/10 border border-white/10 rounded-2xl rounded-tr-sm'
                              : 'bg-gray-900/90 border border-white/5 rounded-2xl rounded-tl-sm backdrop-blur-sm shadow-md'
                      } ${isImage && !isDeleted ? 'p-1.5' : 'px-3.5 py-2.5'}`}
                    >
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
                          className={`rounded-xl p-2 mb-2 border-l-2 cursor-pointer ${isOwn ? 'bg-black/20 border-violet-300/50' : 'bg-black/20 border-cyan-500/50'}`}
                          onClick={() => {
                            const el = document.getElementById(`msg-${msg.reply_to_id}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.classList.add('ring-2', 'ring-cyan-400');
                              setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-400'), 1500);
                            }
                          }}
                        >
                          <p className="text-[10px] text-cyan-400 font-semibold">↩ {msg.reply_to_user}</p>
                          <p className="text-xs text-gray-300 truncate">{msg.reply_to_text}</p>
                        </div>
                      )}

                      {isDeleted ? (
                        <p className="text-xs text-gray-500 italic">{msg.message}</p>
                      ) : isImage ? (
                        <img
                          src={msg.message}
                          alt="Shared image"
                          className="max-w-[200px] sm:max-w-[240px] rounded-xl cursor-pointer hover:opacity-90"
                          onClick={() => setMediaViewer({ url: msg.message, type: 'image' })}
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
                        <div className="space-y-1.5">
                          <p className="text-sm text-white leading-relaxed break-words whitespace-pre-wrap">
                            {msg.message.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                              part.match(/^https?:\/\//) ? (
                                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline hover:text-cyan-200 break-all text-xs">{part}</a>
                              ) : (
                                highlightText(part, searchQuery)
                              )
                            )}
                          </p>
                          {msg.message.split(/\s+/).map((word, wi) => {
                            const ytId = getYouTubeId(word);
                            if (!ytId) return null;
                            return (
                              <button
                                key={wi}
                                onClick={() => setYtViewer({ id: ytId })}
                                className="relative block rounded-xl overflow-hidden mt-1.5 group"
                                style={{ maxWidth: 260 }}
                              >
                                <img
                                  src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                  alt="YouTube video"
                                  className="w-full rounded-xl"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl group-hover:bg-black/60 transition-colors">
                                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  </div>
                                </div>
                                <div className="absolute top-1.5 right-1.5 bg-black/60 rounded p-0.5">
                                  <Maximize2 className="w-3 h-3 text-white" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {!isImage && (
                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {msg.edited && <span className="text-[9px] text-white/30 italic">edited</span>}
                          <span className="text-[10px] text-white/25">{formatTimeIST(msg.created_date)}</span>
                          {isOwn && <CheckCheck className="w-3 h-3 text-violet-300/50" />}
                        </div>
                      )}
                      {isImage && !isDeleted && (
                        <p className="text-[10px] text-white/30 px-1 pb-0.5 text-right mt-0.5">{formatTimeIST(msg.created_date)}</p>
                      )}
                    </div>

                    {totalReactions > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {REACTIONS.map(r => {
                          const count = msg.reactions?.[r.key]?.length || 0;
                          if (!count) return null;
                          const hasReacted = msg.reactions?.[r.key]?.includes(user.id);
                          return (
                            <button
                              key={r.key}
                              onClick={() => addReaction(msg, r.key)}
                              className={`text-xs px-1.5 py-0.5 rounded-full border ${hasReacted ? 'bg-violet-600/40 border-violet-400/40' : 'bg-gray-800/80 border-white/10 hover:bg-gray-700/80'}`}
                            >
                              {r.emoji}<span className="text-[10px] text-white/60 ml-0.5">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {!isDeleted && (
                    <div className={`flex flex-col gap-1 self-center md:flex ${showReactionPicker === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isOwn ? 'order-first' : 'order-last'} transition-opacity`}>
                      <div className="relative">
                        <button
                          onPointerDown={(e) => { e.stopPropagation(); setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id); }}
                          className="w-7 h-7 rounded-full bg-gray-800/90 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 active:scale-95"
                        >
                          <SmilePlus className="w-3.5 h-3.5" />
                        </button>
                        {showReactionPicker === msg.id && (
                          <div className={`absolute bottom-8 ${isOwn ? 'right-0' : 'left-0'} z-30 flex gap-1 bg-gray-900 border border-white/10 rounded-2xl px-2 py-1.5 shadow-2xl backdrop-blur`} onPointerDown={e => e.stopPropagation()}>
                            {REACTIONS.map(r => (
                              <button
                                key={r.key}
                                onPointerDown={(e) => { e.stopPropagation(); addReaction(msg, r.key); }}
                                className="text-lg active:scale-125 touch-manipulation"
                              >{r.emoji}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-7 h-7 rounded-full bg-gray-800/90 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-900/95 border-gray-700/80 min-w-[150px] rounded-xl backdrop-blur">
                          <DropdownMenuItem onClick={() => setReplyTo(msg)} className="text-gray-200 text-sm rounded-lg">
                            <Reply className="w-3.5 h-3.5 mr-2 text-cyan-400" /> Reply
                          </DropdownMenuItem>
                          {isOwn && (
                            <>
                              <DropdownMenuItem onClick={() => { setEditingMessageId(msg.id); setEditText(msg.message); }} className="text-blue-400 text-sm rounded-lg">
                                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteMessage(msg)} className="text-red-400 text-sm rounded-lg">
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                          {user.role === "admin" && (
                            <>
                              <DropdownMenuSeparator className="bg-white/5" />
                              {!isOwn && (
                                <DropdownMenuItem onClick={() => deleteMessage(msg)} className="text-red-400 text-sm rounded-lg">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete for All
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => togglePin(msg)} className="text-amber-400 text-sm rounded-lg">
                                <Pin className="w-3.5 h-3.5 mr-2" /> {msg.is_pinned ? 'Unpin' : 'Pin'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => markAsAnnouncement(msg)} className="text-orange-400 text-sm rounded-lg">
                                <Megaphone className="w-3.5 h-3.5 mr-2" /> {msg.is_announcement ? 'Un-announce' : 'Announce'}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {showScrollBtn && (
        <div className="fixed z-[9999]" style={{ bottom: '90px', right: '16px' }}>
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
            <div className="flex-1 min-w-0">
              <p className="text-xs text-cyan-400 font-semibold">↩ {replyTo.user_ign}</p>
              <p className="text-xs text-gray-400 truncate">{replyTo.message}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white p-1.5 rounded-full hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex-shrink-0 bg-gray-950/98 backdrop-blur-xl border-t border-white/5 px-3 py-3 pb-20">
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
              className="w-full bg-gray-800/70 border border-white/10 text-white placeholder-gray-500 rounded-2xl px-4 py-2.5 resize-none overflow-hidden min-h-[42px] max-h-28 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/25 text-sm leading-relaxed"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              onClick={() => setShowEmojiPicker(false)}
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
      </div>

      {showBottomSheet && selectedLongPressedMessage && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowBottomSheet(false)}>
          <div
            className="w-full max-w-md bg-gray-950 border-t border-white/10 rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-800 rounded-full mx-auto mb-4" onClick={() => setShowBottomSheet(false)} />
            
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 px-1">Message Options</p>
            
            <div className="space-y-1">
              <button
                onClick={() => {
                  setReplyTo(selectedLongPressedMessage);
                  setShowBottomSheet(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-xl text-left text-sm text-gray-200"
              >
                <Reply className="w-4 h-4 text-cyan-400" /> Reply
              </button>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedLongPressedMessage.message);
                  setShowBottomSheet(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-xl text-left text-sm text-gray-200"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" /> Copy Text
              </button>

              {selectedLongPressedMessage.user_id === user.id && !selectedLongPressedMessage.is_deleted && (
                <>
                  <button
                    onClick={() => {
                      setEditingMessageId(selectedLongPressedMessage.id);
                      setEditText(selectedLongPressedMessage.message);
                      setShowBottomSheet(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-xl text-left text-sm text-blue-400"
                  >
                    <Pencil className="w-4 h-4" /> Edit Message
                  </button>
                  <button
                    onClick={() => {
                      deleteMessage(selectedLongPressedMessage);
                      setShowBottomSheet(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-red-500/10 rounded-xl text-left text-sm text-red-400"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Message
                  </button>
                </>
              )}

              {user.role === "admin" && (
                <>
                  {selectedLongPressedMessage.user_id !== user.id && !selectedLongPressedMessage.is_deleted && (
                    <button
                      onClick={() => {
                        deleteMessage(selectedLongPressedMessage);
                        setShowBottomSheet(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-red-500/10 rounded-xl text-left text-sm text-red-400"
                    >
                      <Trash2 className="w-4 h-4" /> Delete for All
                    </button>
                  )}
                  <button
                    onClick={() => {
                      togglePin(selectedLongPressedMessage);
                      setShowBottomSheet(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-xl text-left text-sm text-amber-400"
                  >
                    <Pin className="w-4 h-4" /> {selectedLongPressedMessage.is_pinned ? 'Unpin Message' : 'Pin Message'}
                  </button>
                  <button
                    onClick={() => {
                      markAsAnnouncement(selectedLongPressedMessage);
                      setShowBottomSheet(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-xl text-left text-sm text-orange-400"
                  >
                    <Megaphone className="w-4 h-4" /> {selectedLongPressedMessage.is_announcement ? 'Un-announce' : 'Announce Message'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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