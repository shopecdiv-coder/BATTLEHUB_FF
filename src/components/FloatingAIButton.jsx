import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, X } from "lucide-react";

export default function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "नमस्ते! 👋 मैं BattleHub AI Assistant हूं।\n\nमैं आपकी मदद कर सकता हूं:\n✅ Tournament details\n✅ Registration process\n✅ Prize & payment\n✅ Rules & timing\n✅ Profile help\n\nकुछ भी पूछें!"
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const buildKnowledgeContext = async () => {
    let context = `You are BattleHub AI Assistant - a helpful AI for a Free Fire tournament platform.

CRITICAL INSTRUCTIONS:
- Answer ONLY in user's language (Hindi if they ask in Hindi, English if in English)
- Be friendly, clear, and concise (2-4 sentences max)
- Use emojis to be engaging
- Provide ONLY confirmed information from the context below
- If you don't know, say "Support se contact karein" instead of guessing
- Always include IST timezone for times

PLATFORM STRUCTURE:
📱 Available Pages:
1. HOME - Active tournaments, banners, announcements, match countdown
2. TOURNAMENTS - All tournaments with search & filters
3. TOURNAMENT DETAIL - Full info, registration, rules, room ID/password, leaderboard
4. MY TOURNAMENTS - User's registered tournaments
5. PAST TOURNAMENTS - Results and winners of completed tournaments
6. WALLET - Coin balance, buy coins, redeem to bank (1 Coin = ₹1)
7. PROFILE - User stats, edit IGN/UID/level
8. LEADERBOARD - Top players by wins and kills
9. GLOBAL CHAT - Community chat with reactions
10. SUPPORT - Create tickets, chat with admins
11. REFERRALS - Invite friends, earn coins
12. RATINGS - Rate tournaments
13. ABOUT US - Platform info
14. FAQS - Common questions

🎮 CORE FEATURES:
- Registration: Click tournament → Register → Fill team details → Submit
- Prize Distribution: Winners get coins credited 24-72 hours after match
- Room Credentials: Unlock 5-10 minutes before match starts
- Redeem: Wallet → Redeem → Enter bank/UPI details → Submit
- Payment: Wallet → Buy Coins → Scan QR → Pay → Enter transaction ID
- UID Rules: Each UID registers only once per tournament
- Team Prizes: Team head receives all prize coins (Duo/Squad)
- Auto-hide: Room ID/password auto-hide after 20 minutes

💰 MONEY SYSTEM:
- 1 Coin = ₹1 INR
- Buy: Scan QR → Pay → Submit transaction ID → Coins credited in 30 min
- Redeem: Min 1 coin → Bank/UPI details → Processed in 5 hours
- Win prizes: Automatically credited as coins 24-72 hours after match

⏰ TIMING:
- All times shown in IST (Indian Standard Time, UTC+5:30)
- Room credentials unlock: 5-10 minutes before match
- Payment processing: Within 30 minutes
- Redeem processing: Within 5 hours
- Prize credit: 24-72 hours after match completion

`;

    // Load custom knowledge from admin
    try {
      const knowledge = await base44.entities.AIKnowledge.filter({ is_active: true }, "-priority", 50);
      if (knowledge && knowledge.length > 0) {
        context += `\n📚 ADMIN PROVIDED KNOWLEDGE:\n`;
        knowledge.forEach(kb => {
          context += `\n[${kb.title}]\n${kb.content}\n`;
        });
      }
    } catch (error) {
      // Ignore
    }

    // Load REAL-TIME tournament data
    try {
      const tournaments = await base44.entities.Tournament.filter(
        { status: "Registration Open" }, 
        "-created_date", 
        10
      );
      if (tournaments && tournaments.length > 0) {
        context += `\n🔴 ACTIVE TOURNAMENTS (Real-time Data):\n`;
        tournaments.forEach(t => {
          const matchDate = new Date(t.date_time);
          const matchIST = matchDate.toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short'
          });
          context += `\n• ${t.title}\n  Mode: ${t.mode} | Map: ${t.map}\n  Match: ${matchIST} IST\n  Prize: ₹${t.prize_pool}\n  Teams: ${t.current_teams}/${t.max_teams}\n  Entry: ${t.entry_fee} coins\n`;
        });
      } else {
        context += `\n⚠️ No active tournaments right now. New tournaments coming soon!\n`;
      }
    } catch (error) {
      // Ignore
    }

    return context;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const context = await buildKnowledgeContext();
      const fullPrompt = `${context}\n\nUser Question: "${userMessage}"\n\nAnswer in the SAME language as the question (Hindi or English). Be helpful and concise. Use emojis.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false
      });

      const aiAnswer = typeof response === 'string' ? response : (response.text || response.response || "मुझे कुछ समस्या हो रही है। कृपया support से संपर्क करें।");

      setMessages(prev => [...prev, { role: "assistant", content: aiAnswer }]);

      // Save to history
      try {
        const user = await base44.auth.me().catch(() => null);
        if (user) {
          await base44.entities.AIChat.create({
            user_id: user.id,
            question: userMessage,
            answer: aiAnswer,
            context: "general"
          });
        }
      } catch (e) {
        // Ignore
      }
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ क्षमा करें, मुझे कुछ समस्या हो रही है। कृपया फिर से कोशिश करें या support से संपर्क करें।"
      }]);
    }

    setLoading(false);
  };

  return (
    <>
      {/* Small Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 w-12 h-12 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-full flex items-center justify-center shadow-xl z-40"
          style={{ boxShadow: '0 4px 20px rgba(168, 85, 247, 0.5)' }}
        >
          <Bot className="w-6 h-6 text-white" />
        </button>
      )}

      {/* AI Panel */}
      {isOpen && (
        <div className="fixed top-16 right-4 bottom-24 w-80 max-w-[calc(100vw-2rem)] bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/50 rounded-2xl shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-cyan-600 px-3 py-2 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xs">AI Assistant</h3>
                <p className="text-[10px] text-purple-100">BattleHub Help</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-2 py-1.5 text-xs ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white"
                    : "bg-gray-700/80 text-gray-100"
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-700/80 rounded-xl px-2 py-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 p-2 bg-gray-800/50 rounded-b-xl">
            <div className="flex gap-1.5">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="पूछें..."
                className="bg-gray-700 border-gray-600 text-white resize-none text-xs"
                rows={2}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-90 h-auto px-2"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}