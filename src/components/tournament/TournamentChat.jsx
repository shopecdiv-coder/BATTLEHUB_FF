import React, { useState, useEffect, useRef, useCallback } from "react";
import { TournamentChat as TournamentChatEntity } from "@/entities/TournamentChat";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, X, Reply, Trash2, Heart, ThumbsUp, Lock, ChevronDown } from "lucide-react";

function getIST(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
}

const EMOJI_LIST = ["😀","😂","😍","🔥","💪","👑","🎮","🏆","💀","😭","👏","🤝","😎","❤️","😱","🥇"];

export default function TournamentChat({ tournament, user, isRegistered }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojis, setShowEmojis] = useState(false);
  const [activeActionMsg, setActiveActionMsg] = useState(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const isScrolledUp = useRef(false);
  const initialScrollDone = useRef(false);
  const prevLen = useRef(0);

  const isClosed = tournament.status === "Completed" || tournament.status === "Cancelled";

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [tournament.id]);

  // Scroll tracking
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      const atBottom = dist < 80;
      setShowScrollBtn(!atBottom);
      if (atBottom) { isScrolledUp.current = false; setUnreadCount(0); }
      else { isScrolledUp.current = true; }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!messages.length || !chatContainerRef.current) return;
    const el = chatContainerRef.current;
    if (!initialScrollDone.current) {
      el.scrollTop = el.scrollHeight;
      initialScrollDone.current = true;
      prevLen.current = messages.length;
      return;
    }
    if (messages.length > prevLen.current) {
      const newCount = messages.length - prevLen.current;
      prevLen.current = messages.length;
      const lastMsg = messages[messages.length - 1];
      if (!isScrolledUp.current || lastMsg?.user_id === user?.id) {
        el.scrollTop = el.scrollHeight;
        setUnreadCount(0);
      } else {
        setUnreadCount(c => c + newCount);
      }
    }
  }, [messages, user]);

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
      setUnreadCount(0);
      isScrolledUp.current = false;
    }
  }, []);

  const loadMessages = async () => {
    const msgs = await TournamentChatEntity.filter({ tournament_id: tournament.id }, "created_date", 100);
    setMessages(msgs || []);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending || !user || !isRegistered) return;
    setSending(true);
    const text = inputText.trim();
    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await TournamentChatEntity.create({
      tournament_id: tournament.id,
      user_id: user.id,
      user_ign: user.ign || user.full_name,
      avatar_url: user.avatar_url || "",
      message: text,
      reply_to_id: replyTo?.id || null,
      reply_to_text: replyTo?.message || null,
      reply_to_user: replyTo?.user_ign || null,
    });
    setReplyTo(null);
    await loadMessages();
    setSending(false);
  };

  const deleteMessage = async (msg) => {
    if (msg.user_id !== user?.id && user?.role !== "admin") return;
    await TournamentChatEntity.update(msg.id, { is_deleted: true });
    await loadMessages();
  };

  const reactMessage = async (msg, type) => {
    if (!user) return;
    const reactions = msg.reactions || { likes: [], hearts: [] };
    const arr = [...(reactions[type] || [])];
    const idx = arr.indexOf(user.id);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(user.id);
    await TournamentChatEntity.update(msg.id, { reactions: { ...reactions, [type]: arr } });
    await loadMessages();
  };

  const activeMessages = messages.filter(m => !m.is_deleted);

  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-2xl overflow-hidden border border-gray-800/80" onClick={() => { showEmojis && setShowEmojis(false); activeActionMsg && setActiveActionMsg(null); }}>
      {/* Header */}
      <div className="px-4 py-2.5 bg-gray-900/95 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-bold text-white text-sm">{tournament.title}</span>
          {isClosed && <Badge className="bg-red-500/20 text-red-400 text-xs border-red-500/30"><Lock className="w-3 h-3 mr-1" />Closed</Badge>}
        </div>
        <span className="text-xs text-gray-500">{activeMessages.length} msgs</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={chatContainerRef}
          className="h-full overflow-y-auto px-3 py-3 space-y-1.5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#374151 transparent" }}
        >
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <MessageCircle className="w-14 h-14 text-gray-800 mb-3" />
              <p className="text-gray-500 text-sm">No messages yet. Be the first to chat!</p>
            </div>
          )}

          {messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            const showActions = activeActionMsg === msg.id;
            if (msg.is_deleted) return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-xs text-gray-700 italic bg-gray-900 px-2 py-0.5 rounded-full">🗑️ Message deleted</span>
              </div>
            );
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                {!isOwn && (
                  <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                    <AvatarImage src={msg.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${msg.user_id}`} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-xs">
                      {msg.user_ign?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={`max-w-[78%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                  {!isOwn && (
                    <span className="text-xs font-bold text-cyan-400 mb-0.5">{msg.user_ign}</span>
                  )}

                  {msg.reply_to_text && (
                    <div className={`text-xs bg-gray-800/80 border-l-2 border-cyan-500 pl-2 py-1 rounded mb-1 max-w-full ${isOwn ? "border-r-2 border-l-0 pr-2 pl-0" : ""}`}>
                      <span className="text-cyan-400 text-[10px] font-semibold">{msg.reply_to_user}: </span>
                      <span className="text-gray-400 text-[10px]">{msg.reply_to_text?.substring(0, 50)}</span>
                    </div>
                  )}

                  {/* Tap bubble to show actions (mobile-friendly) */}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm text-white break-words leading-relaxed cursor-pointer select-none ${
                      isOwn
                        ? "bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg"
                        : "bg-gray-800/95 border border-white/8"
                    }`}
                    onClick={(e) => { e.stopPropagation(); setActiveActionMsg(showActions ? null : msg.id); }}
                  >
                    {msg.message}
                  </div>

                  {/* Actions row — shown on tap */}
                  {showActions && (
                    <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? "flex-row-reverse" : ""}`} onClick={e => e.stopPropagation()}>
                      {isRegistered && !isClosed && (
                        <>
                          <button onClick={() => { reactMessage(msg, "likes"); setActiveActionMsg(null); }} className="text-xs bg-gray-800 border border-gray-700 rounded-full px-2 py-1 text-gray-300 hover:bg-blue-900/50 active:scale-95">👍 {msg.reactions?.likes?.length > 0 ? msg.reactions.likes.length : ""}</button>
                          <button onClick={() => { reactMessage(msg, "hearts"); setActiveActionMsg(null); }} className="text-xs bg-gray-800 border border-gray-700 rounded-full px-2 py-1 text-gray-300 hover:bg-red-900/50 active:scale-95">❤️ {msg.reactions?.hearts?.length > 0 ? msg.reactions.hearts.length : ""}</button>
                          <button onClick={() => { setReplyTo(msg); setActiveActionMsg(null); }} className="text-xs bg-gray-800 border border-gray-700 rounded-full px-2 py-1 text-cyan-400 active:scale-95">↩</button>
                        </>
                      )}
                      {(isOwn || user?.role === "admin") && (
                        <button onClick={() => { deleteMessage(msg); setActiveActionMsg(null); }} className="text-xs bg-gray-800 border border-red-800 rounded-full px-2 py-1 text-red-400 active:scale-95"><Trash2 className="w-3 h-3 inline" /></button>
                      )}
                    </div>
                  )}

                  <div className={`flex items-center gap-2 mt-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                    <span className="text-[10px] text-gray-600">{getIST(msg.created_date)}</span>
                    {!showActions && (msg.reactions?.likes?.length > 0) && (
                      <span className="text-[10px] bg-gray-800 rounded-full px-1.5 py-0.5 text-gray-300">👍 {msg.reactions.likes.length}</span>
                    )}
                    {!showActions && (msg.reactions?.hearts?.length > 0) && (
                      <span className="text-[10px] bg-gray-800 rounded-full px-1.5 py-0.5 text-gray-300">❤️ {msg.reactions.hearts.length}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Scroll to Bottom button with unread badge */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 right-3 bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl px-3 py-2 shadow-2xl z-10 flex flex-col items-center gap-0.5 border border-white/20 active:scale-95"
            style={{ boxShadow: "0 0 20px rgba(139,92,246,0.6)" }}
          >
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border border-gray-950">
                {unreadCount}
              </span>
            )}
            <ChevronDown className="w-4 h-4" />
            <span className="text-[9px] font-bold leading-none">Latest</span>
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/95">
        {isClosed ? (
          <div className="p-4 text-center">
            <p className="text-gray-500 text-sm flex items-center justify-center gap-2"><Lock className="w-4 h-4" /> Chat is closed</p>
          </div>
        ) : !isRegistered ? (
          <div className="p-4 text-center">
            <p className="text-gray-500 text-sm">🔒 Register for this tournament to join the chat</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {replyTo && (
              <div className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-1.5 border-l-2 border-cyan-500">
                <span className="text-[11px] text-cyan-400">↩ <strong>{replyTo.user_ign}</strong>: <span className="text-gray-300">{replyTo.message?.substring(0, 40)}</span></span>
                <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white ml-2"><X className="w-3 h-3" /></button>
              </div>
            )}
            
            {/* Emoji picker */}
            {showEmojis && (
              <div className="flex flex-wrap gap-1 p-2 bg-gray-800 rounded-xl border border-gray-700" onClick={e => e.stopPropagation()}>
                {EMOJI_LIST.map(em => (
                  <button key={em} onClick={() => { setInputText(t => t + em); textareaRef.current?.focus(); }} className="text-lg hover:scale-125 transition-transform">
                    {em}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 items-end">
              {/* Emoji toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowEmojis(v => !v); }}
                className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-lg flex-shrink-0 hover:bg-gray-700"
              >
                😊
              </button>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = "auto";
                    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + "px";
                  }
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..."
                className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-2xl px-4 py-2.5 resize-none overflow-hidden min-h-[40px] max-h-24 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/25 text-sm leading-relaxed"
                disabled={sending}
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !inputText.trim()}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 hover:opacity-90 p-0 flex-shrink-0 disabled:opacity-30"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}