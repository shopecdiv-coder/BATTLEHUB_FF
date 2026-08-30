import React, { useState, useEffect } from "react";
import { SupportTicket } from "@/entities/SupportTicket";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, X, HelpCircle, ArrowLeft, RefreshCw, MessageCircle, Paperclip, Video, Trash2, MoreVertical, Star, MessageSquare
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import SharedChatInterface from "@/components/chat/SharedChatInterface";

export default function Support() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Create Ticket State
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackTicket, setFeedbackTicket] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");

  const [activeTab, setActiveTab] = useState("active");
  const [category, setCategory] = useState("");

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
            loadData(); // refresh list to show updated status
          }
        }
      } catch (error) {}
    }, 30000);
    return () => clearInterval(pollInterval);
  }, [selectedTicket?.id, selectedTicket?.status]);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await User.me();
      setUser(currentUser);

      const fetchedTickets = await SupportTicket.filter(
        { user_id: currentUser.id },
        "-created_date" 
      );
      
      const sorted = (fetchedTickets || []).sort((a, b) => 
        new Date(b.created_date || 0) - new Date(a.created_date || 0)
      );
      
      setTickets(sorted);

      if (selectedTicket) {
        const updatedSelectedTicket = sorted.find(t => t.id === selectedTicket.id);
        if (updatedSelectedTicket) {
          setSelectedTicket(updatedSelectedTicket);
        }
      }
    } catch (error) {
      console.error("Error loading support tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const uploadedUrls = [];
    const { UploadFile } = await import('@/integrations/Core');

    for (const file of files) {
      try {
        const { file_url } = await UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (error) {
        console.error("Error uploading file:", error);
        alert(`Failed to upload ${file.name}.`);
      }
    }

    setAttachments(prev => [...prev, ...uploadedUrls]);
    setUploadingFiles(false);
  };

  const createNewTicket = async () => {
    const finalSubject = category === "Other" ? newSubject : category;
    if (!finalSubject.trim() || !newMessage.trim()) {
      alert("Please select a subject and enter a message for your ticket.");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newTicketData = {
        user_id: user.id,
        user_name: user.full_name || user.username || "Player",
        user_ign: user.ign || user.full_name || "Player",
        subject: finalSubject,
        status: "Open",
        priority: "Medium",
        created_date: now
      };
      
      const created = await SupportTicket.create(newTicketData);
      
      // Inject initial messages into Firebase for SharedChatInterface to pick up
      const { GroupChatMessage } = await import('@/api/entities');
      
      // Create the text message
      await GroupChatMessage.create({
         user_id: user.id,
         username: user.full_name || user.username || "Player",
         user_ign: user.ign || user.full_name || "Player",
         avatar_url: user.avatar_url || null,
         sender_email: user.email || "",
         sender_role: user.role || "user",
         message: newMessage,
         message_type: 'text',
         is_deleted: false,
         is_pinned: false,
         is_read: false,
         created_at: new Date().toISOString(),
         group_id: created.id
      });
      
      // Create attachment messages individually
      if (attachments.length > 0) {
         for (const mediaUrl of attachments) {
             const isVideo = mediaUrl.match(/\.(mp4|webm|mov)$/i);
             await GroupChatMessage.create({
                user_id: user.id,
                username: user.full_name || user.username || "Player",
                user_ign: user.ign || user.full_name || "Player",
                avatar_url: user.avatar_url || null,
                sender_email: user.email || "",
                sender_role: user.role || "user",
                message: mediaUrl,
                message_type: isVideo ? 'video' : 'image',
                is_deleted: false,
                is_pinned: false,
                is_read: false,
                created_at: new Date().toISOString(),
                group_id: created.id
             });
         }
      }

      // Create Auto-Reply Bot Message
      await GroupChatMessage.create({
         user_id: "system_bot",
         username: "Support Bot",
         user_ign: "Support Bot",
         avatar_url: null,
         sender_email: "support@battlehub.in",
         sender_role: "admin",
         message: "Aapki ticket ban gayi hai! Hamari team jald hi reply karegi. Kripya apna Game UID aur zaroori proof (agar koi ho) yahan bhej dein.",
         message_type: 'text',
         is_deleted: false,
         is_pinned: false,
         is_read: false,
         created_at: new Date(Date.now() + 1000).toISOString(),
         group_id: created.id
      });

      setShowNewTicket(false);
      setNewSubject("");
      setCategory("");
      setNewMessage("");
      setAttachments([]);
      
      setTickets(prev => [created, ...prev]);
      setSelectedTicket(created);
      
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveTicket = tickets.some(t => t.status !== "Resolved" && t.status !== "Closed");

  const handleNewTicketClick = () => {
    if (hasActiveTicket) {
      alert("You already have an active ticket. Please wait for it to be resolved before creating a new one.");
      return;
    }
    setShowNewTicket(true);
  };

  const handleMarkResolved = async () => {
    if (!selectedTicket || selectedTicket.status === "Resolved" || selectedTicket.status === "Closed") return;
    try {
      await SupportTicket.update(selectedTicket.id, { status: "Resolved" });
      const updatedTicket = { ...selectedTicket, status: "Resolved" };
      setSelectedTicket(updatedTicket);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));

      // Fetch chat history for the email
      const { GroupChatMessage } = await import('@/api/entities');
      const { SendEmail } = await import('@/api/integrations');
      
      const chatHistory = await GroupChatMessage.filter({ group_id: selectedTicket.id });
      // Sort by creation date
      chatHistory.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const messagesHtml = chatHistory.map(msg => {
        const isBot = msg.sender_role === 'admin' || msg.user_id === 'system_bot';
        const senderName = isBot ? 'Support Team' : (msg.username || 'You');
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

      const plainTextBody = `Hello ${user?.full_name || 'Player'},\n\nYour support ticket has been resolved.\n\nTicket ID: ${selectedTicket.id}\nSubject: ${selectedTicket.subject}\nStatus: Resolved\n\nThank you for using BattleHub!\nOfficial Support Team`;
      
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
                Hi <strong>${user?.full_name || 'Player'}</strong>,<br/><br/>
                Your support ticket has been marked as resolved. Below are the details and full conversation history of your request:
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

              <div style="margin-top: 30px;">
                <a href="https://play.google.com/store/apps/details?id=com.battlehub.ff" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold;">Return to App</a>
              </div>
            </div>
            
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                © ${new Date().getFullYear()} BattleHub FF. All rights reserved.<br/>
                This is an automated message, please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `;

      if (user?.email) {
        await SendEmail({
          to: user.email,
          subject: `Resolved: Support Ticket - ${selectedTicket.subject}`,
          body: plainTextBody,
          html: emailHtml
        });
      }

    } catch (error) {
      console.error("Error marking ticket as resolved:", error);
    }
  };

  const handleDeleteTicket = async (e, ticketId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this ticket?")) {
      try {
        await SupportTicket.delete(ticketId);
        setTickets(prev => prev.filter(t => t.id !== ticketId));
      } catch (error) {
        console.error("Error deleting ticket:", error);
      }
    }
  };

  const handleOpenFeedback = (e, ticket) => {
    e.stopPropagation();
    setFeedbackTicket(ticket);
    setFeedbackRating(5);
    setFeedbackText("");
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackTicket) return;
    setSubmitting(true);
    try {
      await SupportTicket.update(feedbackTicket.id, { 
        feedback_rating: feedbackRating,
        feedback_text: feedbackText
      });
      setTickets(prev => prev.map(t => 
        t.id === feedbackTicket.id ? { ...t, feedback_rating: feedbackRating, feedback_text: feedbackText } : t
      ));
      if (selectedTicket && selectedTicket.id === feedbackTicket.id) {
        setSelectedTicket(prev => ({ ...prev, feedback_rating: feedbackRating, feedback_text: feedbackText }));
      }
      // Try to add a chat message if possible
      try {
        const { GroupChatMessage } = await import('@/api/entities');
        await GroupChatMessage.create({
          user_id: user.id,
          username: user.full_name || user.username || "Player",
          user_ign: user.ign || user.full_name || "Player",
          avatar_url: user.avatar_url || null,
          sender_email: user.email || "",
          sender_role: user.role || "user",
          message: `Left Feedback: ${feedbackRating} Stars\n${feedbackText}`,
          message_type: 'text',
          is_deleted: false,
          is_pinned: false,
          is_read: false,
          created_at: new Date().toISOString(),
          group_id: feedbackTicket.id
        });
      } catch (e) {
        console.error("Could not add chat message", e);
      }
      setShowFeedbackModal(false);
      alert("Thank you for your feedback!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] overflow-y-auto bg-slate-950 text-slate-100 pb-24 ">
        {/* Sticky Header Skeleton */}
        <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
            <div className="w-24 h-9 bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Tickets Skeletons */}
        <div className="max-w-2xl mx-auto px-4 mt-4 space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.03] rounded-2xl p-4 flex items-center justify-between h-20 animate-pulse">
              <div className="flex-1 pr-4 space-y-3">
                <div className="h-4 w-3/4 bg-white/5 rounded" />
                <div className="flex gap-2">
                   <div className="h-3 w-16 bg-white/5 rounded" />
                   <div className="h-3 w-20 bg-white/5 rounded" />
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 1. ACTIVE CHAT CONVERSATION VIEW (Fullscreen via SharedChatInterface)
  // ═══════════════════════════════════════════════════════════
  if (selectedTicket) {
    return createPortal(
      <div className="fixed top-16 left-0 right-0 bottom-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
        
        {/* Custom Header for Support Ticket */}
        <div className="flex-shrink-0 bg-slate-950 border-b border-white/5 px-3 py-2 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              onClick={() => setSelectedTicket(null)}
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">
                {selectedTicket.subject}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0 border-0 ${
                  selectedTicket.status === "Open" ? "bg-orange-600/15 text-orange-500" :
                  selectedTicket.status === "In Progress" ? "bg-yellow-500/15 text-yellow-400" :
                  selectedTicket.status === "Resolved" ? "bg-emerald-500/15 text-emerald-400" :
                  "bg-slate-800 text-slate-400"
                }`}>
                  {selectedTicket.status}
                </Badge>
                <span className="text-[10px] text-slate-500 font-mono">
                  ID: {selectedTicket.id.substring(0,6).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0 relative z-20">
            {selectedTicket.status !== "Resolved" && selectedTicket.status !== "Closed" && (
              <Button
                onClick={handleMarkResolved}
                size="sm"
                className="h-7 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors rounded-lg"
              >
                Mark Resolved
              </Button>
            )}
          </div>
        </div>
        {/* Shared Chat Interface taking up the rest of the screen */}
        <div className="flex-1 relative bg-slate-950">
           <SharedChatInterface 
              roomType="group" 
              groupId={selectedTicket.id} 
              roomTitle={selectedTicket.subject}
              user={user}
              hideHeader={true} // We use our custom header above
           />
           
           {/* If resolved/closed, overlay a blocker to prevent typing */}
           {(selectedTicket.status === "Resolved" || selectedTicket.status === "Closed") && (
             <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-950/80 backdrop-blur-md border-t border-emerald-500/20 flex items-center justify-center z-20">
               <span className="text-emerald-400 text-sm font-bold bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                  This ticket has been {selectedTicket.status.toLowerCase()}.
               </span>
             </div>
           )}
        </div>
      </div>,
      document.body
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 2. TICKETS LIST VIEW
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar bg-slate-950 text-slate-100 pb-24 ">
      
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-full hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-base font-bold text-white">Support Center</h1>
              <p className="text-[11px] text-slate-500">{tickets.length} Ticket{tickets.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <Button 
            onClick={handleNewTicketClick}
            className={`font-bold h-9 rounded-xl px-4 shadow-sm transition-all text-xs ${hasActiveTicket ? 'bg-slate-800 text-slate-500 hover:bg-slate-800' : 'bg-orange-700 hover:bg-sky-700 text-white'}`}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* ── Tickets List & Tabs ── */}
      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-2.5">
        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-white/5">
            <TabsTrigger value="active" className="data-[state=active]:bg-orange-700 data-[state=active]:text-white">Active Tickets</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">History</TabsTrigger>
          </TabsList>
        </Tabs>

        {tickets.filter(t => activeTab === "active" ? (t.status === "Open" || t.status === "In Progress") : (t.status === "Resolved" || t.status === "Closed")).length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center px-6">
            <div className="w-16 h-16 bg-white/[0.02] rounded-full flex items-center justify-center mb-4 border border-white/5">
              <HelpCircle className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-200 mb-1">No {activeTab === "active" ? "Active" : "Past"} Tickets</h3>
            <p className="text-xs text-slate-500 max-w-xs mb-6">
              {activeTab === "active" ? "Need help? Create a ticket to chat with our support team." : "You have no resolved tickets yet."}
            </p>
            {activeTab === "active" && (
              <Button 
                onClick={handleNewTicketClick}
                className={`font-bold h-10 rounded-xl px-6 transition-all ${hasActiveTicket ? 'bg-slate-800 text-slate-500 hover:bg-slate-800' : 'bg-white text-slate-950 hover:bg-slate-200'}`}
              >
                Create Support Ticket
              </Button>
            )}
          </div>
        ) : (
          tickets.filter(t => activeTab === "active" ? (t.status === "Open" || t.status === "In Progress") : (t.status === "Resolved" || t.status === "Closed")).map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] hover:border-white/[0.06] rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-sm font-bold text-slate-200 truncate mb-1">
                  {ticket.subject}
                </h3>
                <div className="flex items-center gap-3">
                  <Badge className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0 border-0 ${
                    ticket.status === "Open" ? "bg-orange-600/15 text-orange-500" :
                    ticket.status === "In Progress" ? "bg-yellow-500/15 text-yellow-400" :
                    ticket.status === "Resolved" ? "bg-emerald-500/15 text-emerald-400" :
                    "bg-slate-800 text-slate-400"
                  }`}>
                    {ticket.status}
                  </Badge>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    Chat
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {format(new Date(ticket.created_date || Date.now()), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {ticket.status === "Resolved" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="w-8 h-8 rounded-full bg-white/[0.02] hover:bg-white/[0.05] text-slate-400 flex items-center justify-center transition-colors border border-white/5">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-white/10" onClick={(e) => e.stopPropagation()}>
                      {ticket.feedback_rating ? (
                        <DropdownMenuItem disabled className="cursor-not-allowed text-slate-500 bg-white/5">
                          <Star className="w-4 h-4 mr-2 text-slate-500 fill-slate-500" />
                          Feedback Submitted
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          className="cursor-pointer text-slate-200 hover:text-white hover:bg-white/5"
                          onClick={(e) => handleOpenFeedback(e, ticket)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2 text-slate-400" />
                          Provide Feedback
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem 
                        className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
                        onClick={(e) => handleDeleteTicket(e, ticket.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Ticket
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <div className="w-8 h-8 rounded-full bg-white/[0.02] group-hover:bg-white/[0.05] flex items-center justify-center transition-colors border border-white/5">
                   <ArrowLeft className="w-4 h-4 text-slate-400 rotate-180" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ═══ Create Ticket Modal ═══ */}
      {showNewTicket && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => !submitting && setShowNewTicket(false)}>
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-sm bg-slate-950 rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          >
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <h2 className="text-base font-bold text-white">Create Ticket</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowNewTicket(false)}
                className="rounded-full hover:bg-white/10 text-slate-400 w-8 h-8"
                disabled={submitting}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              {/* FAQ Banner */}
              <div className="bg-orange-600/10 border border-orange-600/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-orange-500 mb-0.5">Common Questions</h3>
                  <p className="text-[10px] text-sky-200/70">Check FAQs before creating a ticket</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/faqs')}
                  className="h-7 text-[10px] px-3 border-orange-600/30 text-orange-500 hover:bg-orange-600/10 rounded-lg bg-transparent"
                >
                  Read FAQs
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-400">What do you need help with?</Label>
                <Select value={category} onValueChange={setCategory} disabled={submitting}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-slate-200 text-sm h-12 rounded-xl focus:border-orange-600/40 focus:ring-0">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000] bg-slate-900 border-white/10">
                    <SelectItem value="Payment / Diamond Issue" className="text-slate-200">Payment / Diamond Issue</SelectItem>
                    <SelectItem value="Tournament Dispute" className="text-slate-200">Tournament Dispute</SelectItem>
                    <SelectItem value="Profile Update" className="text-slate-200">Profile Update</SelectItem>
                    <SelectItem value="Other" className="text-slate-200">Other</SelectItem>
                  </SelectContent>
                </Select>
                
                {category === "Other" && (
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Enter custom subject..."
                    className="mt-3 bg-white/5 border-white/10 text-slate-200 text-sm placeholder:text-slate-600 rounded-xl h-12 focus:border-orange-600/40"
                    disabled={submitting}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-400">Detailed Message</Label>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Explain the problem in detail..."
                  className="bg-white/5 border-white/10 text-slate-200 text-sm placeholder:text-slate-600 rounded-xl min-h-[100px] resize-none focus:border-orange-600/40"
                  disabled={submitting}
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-2">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-black/20 rounded-xl border border-white/5">
                    {attachments.map((url, index) => (
                      <div key={index} className="relative group">
                        {url.match(/\.(mp4|webm|mov)$/i) ? (
                          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center border border-white/10">
                            <Video className="w-5 h-5 text-slate-400" />
                          </div>
                        ) : (
                          <img src={url} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-white/10" />
                        )}
                        <button
                          type="button"
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors">
                  <Paperclip className="w-3.5 h-3.5" />
                  {uploadingFiles ? "Uploading..." : "Attach Proof (Images/Videos)"}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFiles || submitting}
                  />
                </label>
              </div>

            </div>

            <div className="p-5 border-t border-white/5 bg-white/[0.01]">
              <Button
                onClick={createNewTicket}
                disabled={!category || (category === "Other" && !newSubject.trim()) || !newMessage.trim() || submitting || uploadingFiles}
                className="w-full bg-white text-slate-950 hover:bg-slate-200 font-bold h-12 rounded-xl transition-all"
              >
                {submitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  "Create Ticket"
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ Feedback Modal ═══ */}
      {showFeedbackModal && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => !submitting && setShowFeedbackModal(false)}>
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-sm bg-slate-950 rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <h2 className="text-base font-bold text-white">Provide Feedback</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowFeedbackModal(false)}
                className="rounded-full hover:bg-white/10 text-slate-400 w-8 h-8"
                disabled={submitting}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex flex-col items-center space-y-3">
                <Label className="text-sm font-semibold text-slate-300">How would you rate our support?</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star 
                        className={`w-8 h-8 ${star <= feedbackRating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-400">Additional Comments (Optional)</Label>
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what you liked or how we can improve..."
                  className="bg-white/5 border-white/10 text-slate-200 text-sm placeholder:text-slate-600 rounded-xl min-h-[80px] resize-none focus:border-emerald-500/40"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="p-5 border-t border-white/5 bg-white/[0.01]">
              <Button
                onClick={handleSubmitFeedback}
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl transition-all"
              >
                {submitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
