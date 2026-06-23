import React, { useState, useEffect, useRef } from "react";
import { TournamentChat as TournamentChatEntity } from "@/entities/TournamentChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, X, Reply, Trash2, Heart, ThumbsUp, Lock, Users } from "lucide-react";

function getIST(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
}

export default function TournamentChatFullscreen({ tournament, user, isRegistered, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const isClosed = tournament.status === "Completed" || tournament.status === "Cancelled";

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [tournament.id]);

  const loadMessages = async () => {
    const msgs = await TournamentChatEntity.filter({ tournament_id: tournament.id }, "created_date", 100);
    setMessages(msgs || []);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending || !user || !isRegistered) return;
    setSending(true);
    await TournamentChatEntity.create({
      tournament_id: tournament.id,
      user_id: user.id,
      user_ign: user.ign || user.full_name,
      avatar_url: user.avatar_url || "",
      message: inputText.trim(),
      reply_to_id: replyTo?.id || null,
      reply_to_text: replyTo?.message || null,
      reply_to_user: replyTo?.user_ign || null,
    });
    setInputText("");
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header - same style as GlobalChat */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white text-sm truncate">{tournament.title}</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-xs text-gray-400">Tournament Chat</span>
            <span className="text-xs text-gray-500">·</span>
            <Users className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500">{activeMessages.length} msgs</span>
          </div>
        </div>
        {isClosed && <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs"><Lock className="w-3 h-3 mr-1" />Closed</Badge>}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Not registered notice */}
      {!isRegistered && !isClosed && (
        <div className="flex-shrink-0 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
          <p className="text-yellow-400 text-xs text-center">🔒 Only registered players can send messages</p>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-950"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#374151 transparent" }}
      >
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <MessageCircle className="w-16 h-16 text-gray-700" />
            <p className="text-gray-500">No messages yet. Be the first to chat!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.user_id === user?.id;
          if (msg.is_deleted) {
            return (
              <div key={msg.id} className="flex gap-2 items-center justify-center">
                <span className="text-xs text-gray-600 italic">🗑️ Message deleted</span>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <Avatar className="w-8 h-8 flex-shrink-0 mt-1 border border-gray-700">
                <AvatarImage src={msg.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${msg.user_id}`} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-xs font-bold">
                  {msg.user_ign?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className={`max-w-[75%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                  <span className="text-xs font-bold text-cyan-400">{isOwn ? "You" : msg.user_ign}</span>
                  <span className="text-[10px] text-gray-600">{getIST(msg.created_date)}</span>
                </div>

                {msg.reply_to_text && (
                  <div className={`text-xs bg-gray-800/80 border-l-2 border-cyan-500 pl-2 py-1 rounded mb-1 max-w-full ${isOwn ? "border-r-2 border-l-0 pr-2 pl-0 text-right" : ""}`}>
                    <span className="text-cyan-400 font-semibold">{msg.reply_to_user}: </span>
                    <span className="text-gray-400">{msg.reply_to_text?.substring(0, 60)}{msg.reply_to_text?.length > 60 ? "..." : ""}</span>
                  </div>
                )}

                <div className={`rounded-2xl px-4 py-2 text-sm text-white break-words ${
                  isOwn
                    ? "bg-gradient-to-br from-cyan-600 to-blue-700 rounded-tr-sm"
                    : "bg-gray-800 border border-gray-700 rounded-tl-sm"
                }`}>
                  {msg.message}
                </div>

                {/* Reactions + Actions */}
                <div className="flex items-center gap-2 mt-1">
                  {(msg.reactions?.likes?.length > 0 || msg.reactions?.hearts?.length > 0) && (
                    <div className="flex gap-1">
                      {msg.reactions?.likes?.length > 0 && (
                        <span className="text-xs bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5">👍 {msg.reactions.likes.length}</span>
                      )}
                      {msg.reactions?.hearts?.length > 0 && (
                        <span className="text-xs bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5">❤️ {msg.reactions.hearts.length}</span>
                      )}
                    </div>
                  )}
                  <div className="hidden group-hover:flex items-center gap-1">
                    {isRegistered && !isClosed && (
                      <button onClick={() => reactMessage(msg, "likes")} className="text-gray-500 hover:text-blue-400 p-0.5 rounded">
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isRegistered && !isClosed && (
                      <button onClick={() => reactMessage(msg, "hearts")} className="text-gray-500 hover:text-red-400 p-0.5 rounded">
                        <Heart className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isRegistered && !isClosed && (
                      <button onClick={() => setReplyTo(msg)} className="text-gray-500 hover:text-cyan-400 p-0.5 rounded">
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(isOwn || user?.role === "admin") && (
                      <button onClick={() => deleteMessage(msg)} className="text-gray-500 hover:text-red-400 p-0.5 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-700 px-3 py-3 space-y-2">
        {isClosed ? (
          <div className="text-center py-2">
            <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Chat is closed — tournament has ended
            </p>
          </div>
        ) : !isRegistered ? (
          <div className="text-center py-2">
            <p className="text-gray-500 text-sm">Register for this tournament to join the chat</p>
          </div>
        ) : (
          <>
            {replyTo && (
              <div className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2 text-xs border border-gray-700">
                <span className="text-cyan-400">Replying to <strong>{replyTo.user_ign}</strong>: <span className="text-gray-300">{replyTo.message?.substring(0, 40)}...</span></span>
                <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white ml-2">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Avatar className="w-8 h-8 flex-shrink-0 border border-gray-700">
                <AvatarImage src={user?.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${user?.id}`} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-xs">
                  {(user?.ign || user?.full_name)?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..."
                className="bg-gray-800 border-gray-700 text-white rounded-2xl flex-1"
                disabled={sending}
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !inputText.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 rounded-2xl px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}