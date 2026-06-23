import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, X } from "lucide-react";

export default function PeekableAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "नमस्ते! 👋 मैं BattleHub AI Assistant हूं।\n\n✅ Tournament details\n✅ Registration process\n✅ Prize & payment info\n✅ Rules & eligibility\n✅ Room ID/Password timing\n✅ Account & profile help\n\nकुछ भी पूछें!"
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const buildContext = async () => {
    let context = `You are BattleHub AI Assistant - a Free Fire tournament platform helper.

CRITICAL RULES:
- Answer in user's language (Hindi/English based on question)
- Be friendly and professional
- Keep answers SHORT (2-3 sentences max)
- Only provide CONFIRMED information from knowledge base or system data
- If you don't know, say "Support se contact karein" - NEVER guess
- All times are in IST (Indian Standard Time, UTC+5:30)

PLATFORM PAGES:
1. HOME: Active tournaments, banners, countdown timers
2. TOURNAMENTS: Browse all tournaments with filters
3. TOURNAMENT DETAIL: Full info, registration, rules, room ID, leaderboard
4. MY TOURNAMENTS: Your registered tournaments
5. PAST TOURNAMENTS: Completed results
6. WALLET: Coins, redeem to bank (1🪙 = ₹1)
7. PROFILE: Edit IGN, UID, stats
8. LEADERBOARD: Top players
9. GLOBAL CHAT: Community chat
10. SUPPORT: Tickets for help
11. REFERRALS: Invite & earn
12. RATINGS: Rate tournaments
13. ABOUT US: Platform info

CORE FACTS:
- Prize: Credited 24-72 hours after match completion
- Room ID/Password: Shows 5-10 minutes before match
- Coins: 1🪙 = ₹1 INR, min redeem 1 coin
- UID: Each UID only once per tournament
- Team Head: Gets all prize coins in Duo/Squad
- Payment: Coins credited within 30 min after verification
- Room Auto-hide: 20 minutes after display

`;

    // Load admin knowledge
    try {
      const knowledge = await base44.entities.AIKnowledge.filter({ is_active: true }, "-priority", 50);
      if (knowledge && knowledge.length > 0) {
        context += `\nADMIN KNOWLEDGE BASE:\n`;
        knowledge.forEach(kb => {
          context += `\n[${kb.title}]\n${kb.content}\n`;
        });
      }
    } catch (error) {
      console.error("Knowledge load error:", error);
    }

    // Load real-time tournaments
    try {
      const tournaments = await base44.entities.Tournament.list("-created_date", 10);
      if (tournaments && tournaments.length > 0) {
        context += `\nREAL-TIME TOURNAMENTS:\n`;
        tournaments.forEach(t => {
          const matchTime = new Date(t.date_time).toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short'
          });
          context += `- ${t.title}\n  Mode: ${t.mode}, Map: ${t.map}\n  Time: ${matchTime} IST\n  Prize: ₹${t.prize_pool}\n  Slots: ${t.current_teams}/${t.max_teams}\n  Status: ${t.status}\n`;
        });
      }
    } catch (error) {
      console.error("Tournament load error:", error);
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
      const context = await buildContext();
      const fullPrompt = `${context}\n\nUser Question: "${userMessage}"\n\nAnswer in user's language (Hindi if Hindi, English if English). Be helpful. Keep it 2-3 sentences. Use emojis. Don't guess - only provide confirmed info.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false
      });

      const aiAnswer = typeof response === 'string' ? response : (response.text || "मुझे कुछ समस्या हो रही है। Support se contact karein।");

      setMessages(prev => [...prev, { role: "assistant", content: aiAnswer }]);

      // Save chat
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
      } catch (e) {}
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Sorry, I'm having trouble. Please contact support."
      }]);
    }

    setLoading(false);
  };

  return (
    <>
      {/* Floating AI Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-full flex items-center justify-center shadow-xl z-40"
          style={{ boxShadow: '0 4px 20px rgba(168, 85, 247, 0.5)' }}
        >
          <Bot className="w-7 h-7 text-white" />
        </button>
      )}

      {/* AI Panel */}
      {isOpen && (
        <div className="fixed top-16 right-4 bottom-24 lg:bottom-4 w-[360px] max-w-[calc(100vw-2rem)] bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/50 rounded-2xl shadow-2xl z-40 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-cyan-600 p-3 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">AI Assistant</h3>
                <p className="text-xs text-purple-100">BattleHub Help</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white"
                    : "bg-gray-700/80 text-gray-100"
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-700/80 rounded-xl px-3 py-2">
                  <p className="text-gray-400 text-xs">Typing...</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 p-2 bg-gray-800/50 rounded-b-xl">
            <div className="flex gap-2">
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
                className="bg-gray-700 border-gray-600 text-white resize-none text-sm"
                rows={2}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-90 h-auto px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}