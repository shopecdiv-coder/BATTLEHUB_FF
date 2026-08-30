import React, { useState, useEffect } from "react";
import { SupportTicket } from "@/entities/SupportTicket";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCall } from "@/lib/CallContext";
import { SendEmail } from "@/api/integrations";
import { 
  MessageCircle, RefreshCw, Phone, CheckCircle2, Inbox,
  Mail, Send, ExternalLink, Globe, User as UserIcon, Gamepad2, MessageSquare, Clock, XCircle
} from "lucide-react";
import { format } from "date-fns";
import SharedChatInterface from "@/components/chat/SharedChatInterface";

export default function SupportTicketManagement() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  const { initiateCall } = useCall();

  useEffect(() => {
    loadData();
  }, []);

  // Poll for status updates
  useEffect(() => {
    if (!selectedTicket) return;
    const pollInterval = setInterval(async () => {
      try {
        const updatedTickets = await SupportTicket.filter({ id: selectedTicket.id });
        if (updatedTickets.length > 0) {
          const newTicket = updatedTickets[0];
          if (newTicket.status !== selectedTicket.status) {
            setSelectedTicket(newTicket);
            loadData();
          }
        }
      } catch (error) {}
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [selectedTicket?.id, selectedTicket?.status]);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await User.me();
      setUser(currentUser);

      const fetchedTickets = await SupportTicket.list("-created_date");
      // Exclude website inquiries so Support Tickets is 100% dedicated to in-app player disputes
      const appOnlyTickets = (fetchedTickets || []).filter(t => 
        !t.source?.toLowerCase().includes('website') && 
        !t.subject?.startsWith('[Website]')
      );
      setTickets(appOnlyTickets);

      if (selectedTicket) {
        const updatedSelectedTicket = appOnlyTickets.find(t => t.id === selectedTicket.id);
        if (updatedSelectedTicket) {
          setSelectedTicket(updatedSelectedTicket);
        }
      }
    } catch (error) {
      console.error("Error loading tickets for admin:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallUser = () => {
    if (!selectedTicket) return;
    if (selectedTicket.phone || selectedTicket.user_phone) {
      window.open(`tel:${selectedTicket.phone || selectedTicket.user_phone}`);
      return;
    }
    try {
      initiateCall(selectedTicket.user_id, false);
    } catch (error) {
      console.error("Error starting WebRTC audio call:", error);
      alert("Failed to initiate voice call. Please verify WebRTC configuration.");
    }
  };

  const handleSendEmailReply = async () => {
    if (!replyText.trim()) {
      alert("Please write a reply message first!");
      return;
    }

    const recipientEmail = selectedTicket.user_email || selectedTicket.email;
    if (!recipientEmail) {
      alert("No email address found for this inquiry.");
      return;
    }

    setSendingReply(true);
    setReplySuccess(false);

    try {
      const res = await fetch("http://localhost:5174/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          to: recipientEmail,
          recipientName: selectedTicket.user_name || "Player",
          subject: `[BattleHub Support] Re: ${selectedTicket.subject || "Your Inquiry"}`,
          replyText: replyText.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReplySuccess(true);
        setReplyText("");
        if (selectedTicket.status === "Open") {
          await updateTicketStatus("In Progress");
        }
        setTimeout(() => setReplySuccess(false), 5000);
      } else {
        alert("Failed to send reply email: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error sending email reply:", err);
      alert("Error sending email: " + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const updateTicketStatus = async (status) => {
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      await SupportTicket.update(selectedTicket.id, { status });
      setSelectedTicket({ ...selectedTicket, status });
      await loadData();

      if (status === "Resolved" && selectedTicket.user_id) {
        try {
          const userData = await User.get(selectedTicket.user_id);
          if (userData?.email) {
            const { GroupChatMessage } = await import('@/api/entities');
            const chatHistory = await GroupChatMessage.filter({ group_id: selectedTicket.id });
            chatHistory.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            const messagesHtml = chatHistory.map(msg => {
              const isBot = msg.sender_role === 'admin' || msg.user_id === 'system_bot';
              const senderName = isBot ? 'Support Team' : (msg.username || 'User');
              const color = isBot ? '#3b82f6' : '#64748b'; 
              const time = new Date(msg.created_at).toLocaleString();
              
              let contentHtml = '';
              if (msg.message_type === 'image') contentHtml = `<p style="font-style: italic; color: #94a3b8;">[Image attachment sent]</p>`;
              else if (msg.message_type === 'video') contentHtml = `<p style="font-style: italic; color: #94a3b8;">[Video attachment sent]</p>`;
              else contentHtml = `<p style="margin: 5px 0;">${msg.message}</p>`;

              return `
                <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 13px; color: ${color}; font-weight: bold;">${senderName} <span style="color: #94a3b8; font-weight: normal; font-size: 11px; margin-left: 10px;">${time}</span></p>
                  <div style="font-size: 15px; color: #334155; margin-top: 4px;">
                    ${contentHtml}
                  </div>
                </div>
              `;
            }).join('');

            const plainTextBody = `Hello ${selectedTicket.user_name || 'Player'},\n\nYour support ticket has been resolved by the BattleHub Support Team.\n\nTicket ID: ${selectedTicket.id}\nSubject: ${selectedTicket.subject}\nStatus: Resolved\n\nThank you for using BattleHub!\nOfficial Support Team`;
            
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 20px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                  
                  <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 4px solid #3b82f6;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px;">BATTLEHUB FF</h1>
                    <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Official Support Team</p>
                  </div>
                  
                  <div style="padding: 30px;">
                    <h2 style="color: #1e293b; font-size: 22px; margin-top: 0;">Ticket Resolved ✅</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                      Hi <strong>${selectedTicket.user_name || 'Player'}</strong>,<br/><br/>
                      Good news! Your support ticket has been successfully resolved by our team. Below are the details and full conversation history of your request:
                    </p>
                    
                    <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                      <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Ticket ID:</strong> <span style="color: #64748b;">${selectedTicket.id}</span></p>
                      <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Subject:</strong> <span style="color: #64748b;">${selectedTicket.subject}</span></p>
                      <p style="margin: 0; font-size: 15px;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Resolved</span></p>
                    </div>

                    <h3 style="color: #1e293b; font-size: 18px; margin-top: 35px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Conversation History</h3>
                    <div style="background-color: #ffffff; margin-top: 15px;">
                      ${messagesHtml.length > 0 ? messagesHtml : '<p style="color: #64748b;">No conversation history available.</p>'}
                    </div>
                    
                    <div style="margin-top: 25px;">
                      <a href="https://play.google.com/store/apps/details?id=com.battlehub.ff" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold;">Return to App</a>
                    </div>
                  </div>
                  
                  <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">
                      © ${new Date().getFullYear()} BattleHub. All rights reserved.<br/>
                      This is an automated message, please do not reply to this email.
                    </p>
                  </div>
                  
                </div>
              </div>
            `;

            await SendEmail({
              to: userData.email,
              subject: `Resolved: Support Ticket - ${selectedTicket.subject}`,
              body: plainTextBody,
              html: emailHtml
            });
          }
        } catch (mailErr) {
          console.error("Failed to send resolution email:", mailErr);
        }
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
      alert("Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter === "All") return true;
    return ticket.status === statusFilter;
  });

  const statusCounts = {
    All: tickets.length,
    Open: tickets.filter(t => t.status === "Open").length,
    "In Progress": tickets.filter(t => t.status === "In Progress").length,
    Resolved: tickets.filter(t => t.status === "Resolved").length,
    Closed: tickets.filter(t => t.status === "Closed").length,
  };

  return (
    <div className="space-y-4">
      
      {/* ── Filter Tabs & Refresh ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["All", "Open", "In Progress", "Resolved", "Closed"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`h-8 text-xs rounded-lg px-3 font-medium transition-all ${
                statusFilter === status 
                  ? "bg-orange-700 text-white shadow-sm" 
                  : "bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] border border-white/5"
              }`}
            >
              {status}
              {statusCounts[status] > 0 && (
                <span className={`ml-1.5 text-[10px] ${statusFilter === status ? 'text-sky-200' : 'text-slate-500'}`}>
                  {statusCounts[status]}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <Button
          onClick={loadData}
          variant="ghost"
          disabled={loading}
          className="h-8 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ── Left: Ticket List ── */}
        <div className="lg:col-span-4 space-y-2 max-h-[500px] lg:max-h-[700px] overflow-y-auto pr-1 custom-scrollbar">
          {loading && tickets.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-600/20 border-t-orange-500 mb-4"></div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Loading Tickets</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-white/[0.02] rounded-full flex items-center justify-center mb-3 border border-white/5">
                <Inbox className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">No Tickets</h3>
              <p className="text-xs text-slate-500 mt-1">No tickets match this filter.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`relative p-3.5 rounded-xl cursor-pointer transition-all border flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-orange-600/10 border-orange-600/20'
                      : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.03] hover:border-white/[0.06]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-orange-500 rounded-full" />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {(ticket.source?.toLowerCase().includes('website') || ticket.user_email || ticket.phone) && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                            WEB
                          </span>
                        )}
                        <h4 className={`font-bold text-[13px] truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {ticket.subject}
                        </h4>
                      </div>
                    </div>
                    <Badge className={`text-[8px] uppercase font-bold tracking-wider border-0 px-1.5 py-0 shrink-0 ${
                      ticket.status === "Open" ? "bg-orange-600/15 text-orange-500" :
                      ticket.status === "In Progress" ? "bg-yellow-500/15 text-yellow-400" :
                      ticket.status === "Resolved" ? "bg-emerald-500/15 text-emerald-400" :
                      "bg-slate-800 text-slate-400"
                    }`}>
                      {ticket.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span className="truncate">
                      {ticket.user_name || ticket.name || 'User'} 
                      {ticket.phone ? ` • ${ticket.phone}` : ticket.user_email ? ` • ${ticket.user_email}` : ''}
                    </span>
                    <span>{format(new Date(ticket.created_date || ticket.created_at || Date.now()), "MMM d, HH:mm")}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Right: Ticket Panel ── */}
        <div className="lg:col-span-8">
          {selectedTicket ? (
            <div className="border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[520px] lg:h-[700px] bg-slate-950">
              
              {/* Ticket Admin Header */}
              <div className="p-3 bg-white/[0.02] border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {(selectedTicket.source?.toLowerCase().includes('website') || selectedTicket.user_email || selectedTicket.phone) && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Website Inquiry
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-white truncate">
                      {selectedTicket.subject}
                    </h3>
                    <Badge className={`text-[9px] uppercase tracking-wider font-bold border-0 px-1.5 py-0 ${
                      selectedTicket.status === "Open" ? "bg-orange-600/15 text-orange-500" :
                      selectedTicket.status === "In Progress" ? "bg-yellow-500/15 text-yellow-400" :
                      selectedTicket.status === "Resolved" ? "bg-emerald-500/15 text-emerald-400" :
                      "bg-slate-800 text-slate-400"
                    }`}>
                      {selectedTicket.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {selectedTicket.user_name || selectedTicket.name || 'User'} 
                    {selectedTicket.phone ? ` • Tel: ${selectedTicket.phone}` : ''}
                    {(selectedTicket.user_email || selectedTicket.email) ? ` • Email: ${selectedTicket.user_email || selectedTicket.email}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedTicket.status !== "In Progress" && selectedTicket.status !== "Resolved" && (
                    <Button
                      size="sm"
                      onClick={() => updateTicketStatus("In Progress")}
                      className="bg-yellow-600/80 hover:bg-yellow-600 text-white font-bold h-8 text-[11px] rounded-lg px-2.5 flex items-center gap-1 transition-all active:scale-95"
                      disabled={submitting}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      In Progress
                    </Button>
                  )}
                  {selectedTicket.status !== "Resolved" && (
                    <Button
                      size="sm"
                      onClick={() => updateTicketStatus("Resolved")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-[11px] rounded-lg px-3 flex items-center gap-1.5 transition-all active:scale-95"
                      disabled={submitting}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolve
                    </Button>
                  )}
                  {(selectedTicket.phone || selectedTicket.user_phone) ? (
                    <Button
                      onClick={handleCallUser}
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-8 text-[11px] rounded-lg px-3 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCallUser}
                      size="sm"
                      className="bg-orange-700 hover:bg-sky-700 text-white font-bold h-8 text-[11px] rounded-lg px-3 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call
                    </Button>
                  )}
                </div>
              </div>

              {/* Specialized Website Inquiry Detail & Reply Panel */}
              {(selectedTicket.source?.toLowerCase().includes('website') || selectedTicket.user_email || selectedTicket.email || selectedTicket.phone) ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-950">
                  
                  {/* 1. Sender Details 4-Card Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <UserIcon className="w-4 h-4 text-orange-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Sender Name</span>
                        <strong className="text-white text-sm">{selectedTicket.user_name || selectedTicket.name || 'Anonymous'}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Email Address</span>
                        <a href={`mailto:${selectedTicket.user_email || selectedTicket.email}`} className="text-sky-400 hover:underline font-semibold truncate block">
                          {selectedTicket.user_email || selectedTicket.email || 'N/A'}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Phone Number</span>
                        <div className="flex items-center gap-2">
                          <a href={`tel:${selectedTicket.phone || selectedTicket.user_phone}`} className="text-emerald-400 hover:underline font-semibold">
                            {selectedTicket.phone || selectedTicket.user_phone || 'N/A'}
                          </a>
                          {(selectedTicket.phone || selectedTicket.user_phone) && (
                            <a 
                              href={`https://wa.me/${String(selectedTicket.phone || selectedTicket.user_phone).replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-bold"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Gamepad2 className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">BattleHub ID</span>
                        <strong className="text-purple-300 font-mono text-sm">
                          {selectedTicket.battlehub_id || selectedTicket.battlehubId || selectedTicket.user_ign || 'Not Provided'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* 2. User's Inquiry Message Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                        Inquiry Message Body
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {format(new Date(selectedTicket.created_date || selectedTicket.created_at || Date.now()), "PPpp")}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-orange-600/[0.04] border border-orange-500/20 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap select-text">
                      {selectedTicket.description || selectedTicket.message || 'No description provided.'}
                    </div>
                  </div>

                  {/* 3. Direct Email Reply Section */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-orange-400" />
                        Send Official Email Reply to {selectedTicket.user_name || 'User'} (from contact@battlehub.site)
                      </span>
                      {replySuccess && (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Email Delivered!
                        </span>
                      )}
                    </div>

                    {/* Quick Reply Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "✅ Your issue has been resolved! Please check your account.",
                        "⏳ We are currently reviewing your inquiry. Please allow 15-30 minutes.",
                        "🎮 Room ID & Password will be available in the app 15 mins before match.",
                        "💰 Your withdrawal request has been approved and processed."
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReplyText(chip)}
                          className="text-[10px] font-medium px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all text-left cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* Textarea */}
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Type your reply to ${selectedTicket.user_email || selectedTicket.email || 'user'} here...`}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none"
                    />

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <a
                        href={`mailto:${selectedTicket.user_email || selectedTicket.email}?subject=Re: ${encodeURIComponent(selectedTicket.subject || 'Support Inquiry')}&body=${encodeURIComponent(replyText)}`}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open in External Email App
                      </a>

                      <Button
                        onClick={handleSendEmailReply}
                        disabled={sendingReply || !replyText.trim() || !(selectedTicket.user_email || selectedTicket.email)}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20 active:scale-95 disabled:opacity-50"
                      >
                        {sendingReply ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending Email...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Email Reply</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Regular In-App Chat Thread */
                <div className="flex-1 relative bg-slate-950">
                  <SharedChatInterface 
                    roomType="group" 
                    groupId={selectedTicket.id} 
                    roomTitle={selectedTicket.subject}
                    user={user}
                    hideHeader={true}
                  />
                  
                  {/* Visual Blocker for Resolved Tickets */}
                  {(selectedTicket.status === "Resolved" || selectedTicket.status === "Closed") && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-950/80 backdrop-blur-md border-t border-white/5 flex items-center justify-center z-20">
                      <span className="text-slate-400 text-sm font-medium bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                        Ticket is {selectedTicket.status.toLowerCase()}. Actions disabled.
                      </span>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="h-[500px] lg:h-[700px] border border-white/[0.03] bg-white/[0.01] rounded-2xl flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-white/[0.02] rounded-full flex items-center justify-center mb-4 border border-white/5">
                <MessageCircle className="w-7 h-7 text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-300 mb-1">Select a Ticket</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Choose a ticket from the list to assist players via the built-in messaging system.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
