import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { Tournament } from "@/entities/Tournament";
import { AIChat } from "@/entities/AIChat";
import { InvokeLLM } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, X, ThumbsUp, ThumbsDown, Loader } from "lucide-react";

export default function AITournamentAssistant({ tournamentId, onClose }) {
  const [user, setUser] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    const currentUser = await User.me().catch(() => null);
    setUser(currentUser);

    if (tournamentId) {
      const tournamentData = await Tournament.filter({ id: tournamentId }).catch(() => []);
      if (tournamentData.length > 0) {
        setTournament(tournamentData[0]);
      }
    }

    // Welcome message
    setMessages([{
      role: "assistant",
      content: "👋 Hello! I'm your AI Tournament Assistant. I can help you with:\n\n✅ Tournament details & rules\n✅ Registration help\n✅ Room ID & password info\n✅ Prize & reward questions\n✅ Account & profile guidance\n✅ Team formation (Duo/Squad)\n\nAsk me anything! 🚀"
    }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const buildSystemPrompt = () => {
    let prompt = `You are an AI Tournament Assistant for Battle Hub, a Free Fire tournament platform.

Your role:
- Answer user questions about tournaments, registration, rules, prizes, etc.
- Be helpful, polite, and clear
- Only provide confirmed information
- If you don't know something, say "Please contact support for this."
- Never make promises about prizes or admin decisions

TOURNAMENT SYSTEM RULES:
1. Account Details: Users must complete IGN, UID, payment details for rewards
2. Registration: Opens before tournament start, closes when slots are full
3. UID Rules: Each UID can only be used once per tournament
4. Team Head: In Duo/Squad, Team Head receives prize coins
5. Room ID: Unlocks 5-10 minutes before match start
6. Emulator: Not allowed unless mentioned in rules
7. Recording: Required only if mentioned in tournament rules
8. Prize Timeline: 24-72 hours after match completion
9. Redeem: Users can redeem coins to UPI/Bank account
10. Referral: Each user has unique referral code from admin dashboard

`;

    if (tournament) {
      prompt += `\nCURRENT TOURNAMENT INFO:
- Name: ${tournament.title}
- Mode: ${tournament.mode}
- Map: ${tournament.map}
- Entry Fee: ₹${tournament.entry_fee || 0}
- Prize Pool: ₹${tournament.prize_pool || 0}
- Status: ${tournament.status}
- Max Teams: ${tournament.max_teams}
`;
    }

    return prompt;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt();
      const fullPrompt = `${systemPrompt}\n\nUser Question: ${userMessage}\n\nProvide a clear, helpful answer in 2-4 sentences. Use emojis where appropriate.`;

      const response = await InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false
      });

      const aiAnswer = typeof response === 'string' ? response : response.text || "I'm having trouble processing that. Please try again or contact support.";

      setMessages(prev => [...prev, { role: "assistant", content: aiAnswer }]);

      // Save to database
      if (user) {
        await AIChat.create({
          user_id: user.id,
          question: userMessage,
          answer: aiAnswer,
          context: tournamentId || "general"
        });
      }
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ I'm having trouble right now. Please try again or contact support from the Support section."
      }]);
    }

    setLoading(false);
  };

  const handleFeedback = async (messageIndex, helpful) => {
    const message = messages[messageIndex];
    if (message.role !== "assistant") return;

    // Update feedback in UI
    const updatedMessages = [...messages];
    updatedMessages[messageIndex].feedback = helpful;
    setMessages(updatedMessages);

    // Save feedback (would need to update AIChat entity with message ID tracking)
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 max-w-2xl w-full h-[600px] flex flex-col">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">AI Tournament Assistant</CardTitle>
                <p className="text-xs text-gray-400">Always here to help 24/7</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white"
                  : "bg-gray-800 text-gray-100"
              }`}>
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                
                {message.role === "assistant" && !message.feedback && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-700">
                    <button
                      onClick={() => handleFeedback(index, true)}
                      className="text-xs text-gray-400 hover:text-green-400 flex items-center gap-1"
                    >
                      <ThumbsUp className="w-3 h-3" /> Helpful
                    </button>
                    <button
                      onClick={() => handleFeedback(index, false)}
                      className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1"
                    >
                      <ThumbsDown className="w-3 h-3" /> Not Helpful
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg p-3 flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t border-gray-700 p-4">
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
              placeholder="Ask me anything about tournaments..."
              className="bg-gray-800 border-gray-700 text-white resize-none"
              rows={2}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}