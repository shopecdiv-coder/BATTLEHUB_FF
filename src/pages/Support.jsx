import React, { useState, useEffect } from "react";
import { SupportTicket } from "@/entities/SupportTicket";
import { SupportContact } from "@/entities/SupportContact";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, Send, Paperclip, Plus, X, Image as ImageIcon, Video, ExternalLink, Clock, RefreshCw, Upload, MessageSquare, HelpCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

import { format } from "date-fns";
import { Notification } from "@/entities/Notification";
import { createPageUrl } from "@/utils";

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // State for in-app media viewer
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaToView, setMediaToView] = useState({ url: "", type: "" });

  // New state for selected ticket loading
  const [selectedTicketLoading, setSelectedTicketLoading] = useState(false);
  
  // Admin controls
  const [sendingSystemMessage, setSendingSystemMessage] = useState(false);
  const [supportContacts, setSupportContacts] = useState([]);

  const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfoPt-p_9qKtY6EM1rrDzq6qIVOyC78vXOd9ji75eaTjIBD5g/viewform?usp=sharing&ouid=103119406315975933219";

  useEffect(() => {
    SupportContact.list("order", 10).then(c => setSupportContacts(c || [])).catch(() => {});
    loadData();
    
    // Load Tidio script only on Support page
    const script = document.createElement('script');
    script.id = 'tidio-support-script';
    script.src = '//code.tidio.co/alfqiaakxaxhkvuuitc797gssml524wp.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // Cleanup: remove Tidio script and hide widget when leaving Support page
      try {
        const existingScript = document.getElementById('tidio-support-script');
        if (existingScript) document.body.removeChild(existingScript);
        if (window.tidioChatApi) {
          window.tidioChatApi.hide();
        }
        // Remove tidio iframe/container
        const tidioEl = document.getElementById('tidio-chat');
        if (tidioEl) tidioEl.remove();
        const tidioFrame = document.getElementById('tidio-chat-iframe');
        if (tidioFrame) tidioFrame.remove();
      } catch (e) {}
    };
  }, []);

  // Optimize: Real-time polling reduced to 60 seconds
  useEffect(() => {
    if (!selectedTicket) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const updatedTickets = await SupportTicket.filter({ id: selectedTicket.id });
        if (updatedTickets.length > 0) {
          const newTicket = updatedTickets[0];
          if (JSON.stringify(newTicket.messages) !== JSON.stringify(selectedTicket.messages)) {
            setSelectedTicket(newTicket);
            const chatContainer = document.getElementById('chat-messages');
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }
        }
      } catch (error) {}
    }, 60000); // Optimized: Poll every 60 seconds

    return () => clearInterval(pollInterval);
  }, [selectedTicket?.id]);

  const loadData = async () => {
    try {
      setLoading(true); // Set loading true at the start of data load
      const currentUser = await User.me();
      setUser(currentUser);

      let fetchedTickets;
      if (currentUser.role === 'admin') {
        fetchedTickets = await SupportTicket.list("-last_message_at");
      } else {
        fetchedTickets = await SupportTicket.filter(
          { user_id: currentUser.id },
          "-last_message_at"
        );
      }
      setTickets(fetchedTickets);

      // Update selected ticket if exists and its content has changed
      if (selectedTicket) {
        const updatedSelectedTicket = fetchedTickets.find(t => t.id === selectedTicket.id);
        if (updatedSelectedTicket && JSON.stringify(updatedSelectedTicket.messages) !== JSON.stringify(selectedTicket.messages)) {
          setSelectedTicket(updatedSelectedTicket);
        }
      }
    } catch (error) {
      console.error("Error loading support tickets:", error);
    } finally {
      setLoading(false); // Set loading false after data is loaded or if an error occurs
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const uploadedUrls = [];

    for (const file of files) {
      try {
        const { file_url } = await UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (error) {
        console.error("Error uploading file:", error);
        alert(`Failed to upload ${file.name}. Please try again.`);
      }
    }

    setAttachments([...attachments, ...uploadedUrls]);
    setUploadingFiles(false);
  };

  const createNewTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      alert("Please fill in both subject and message");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await SupportTicket.create({
        user_id: user.id,
        user_name: user.full_name,
        user_ign: user.ign || user.full_name,
        subject: newSubject,
        status: "Open",
        priority: "Medium",
        messages: [{
          sender_id: user.id,
          sender_name: user.ign || user.full_name,
          sender_role: user.role,
          message: newMessage,
          attachments: attachments,
          timestamp: now
        }],
        last_message_at: now
      });

      setShowNewTicket(false);
      setNewSubject("");
      setNewMessage("");
      setAttachments([]);
      await loadData();
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("Failed to create ticket. Please try again.");
    }
    setSubmitting(false);
  };

  const sendReply = async () => {
    if (!replyMessage.trim() && attachments.length === 0) return;
    if (!selectedTicket) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newMessageObj = {
        sender_id: user.id,
        sender_name: user.ign || user.full_name,
        sender_role: user.role,
        message: replyMessage,
        attachments: attachments,
        timestamp: now
      };

      await SupportTicket.update(selectedTicket.id, {
        messages: [...(selectedTicket.messages || []), newMessageObj],
        last_message_at: now,
        status: user.role === 'admin' && selectedTicket.status === 'Open' ? "In Progress" : selectedTicket.status
      });

      // If admin sends message, create notification for user
      if (user.role === 'admin' && selectedTicket.user_id !== user.id) {
        await Notification.create({
          recipient_id: selectedTicket.user_id,
          type: "Support Message",
          title: "💬 Support Team Reply",
          message: `New message in ticket: ${selectedTicket.subject}`,
          link: createPageUrl("Support"),
          priority: "High",
          dismissable: true,
          created_at: now
        });
      }

      setReplyMessage("");
      setAttachments([]);
      await loadData();

      // After sending reply, explicitly refresh selected ticket to show new message
      // This is a direct update to reflect the change immediately
      setSelectedTicket(prevTicket => {
        if (!prevTicket) return null;
        return {
          ...prevTicket,
          messages: [...(prevTicket.messages || []), newMessageObj],
          last_message_at: now,
          status: user.role === 'admin' && prevTicket.status === 'Open' ? "In Progress" : prevTicket.status
        };
      });

    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send message. Please try again.");
    }
    setSubmitting(false);
  };

  const updateTicketStatus = async (status) => {
    if (!selectedTicket) return;
    setSubmitting(true); // Disable buttons while status is updating
    try {
      await SupportTicket.update(selectedTicket.id, { status });
      await loadData();
      setSelectedTicket({ ...selectedTicket, status });
    } catch (error) {
      console.error("Error updating ticket status:", error);
      alert("Failed to update ticket status. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewMedia = (url) => {
    let type = "other";
    if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
      type = "image";
    } else if (url.match(/\.(mp4|webm|mov)$/i)) {
      type = "video";
    }
    setMediaToView({ url, type });
    setShowMediaViewer(true);
  };

  const refreshSelectedTicket = async () => {
    if (!selectedTicket) return;
    setSelectedTicketLoading(true);
    try {
      const updatedTicket = await SupportTicket.get(selectedTicket.id);
      setSelectedTicket(updatedTicket);
    } catch (error) {
      console.error("Error refreshing selected ticket:", error);
      alert("Failed to refresh ticket. Please try again.");
    } finally {
      setSelectedTicketLoading(false);
    }
  };

  const sendSystemMessage = async (messageType) => {
    if (!selectedTicket || sendingSystemMessage) return;
    setSendingSystemMessage(true);
    
    const messages = {
      enablePhoto: "To help us resolve your issue faster, you can now upload the required image in this ticket.",
      telegramPhoto: "For better clarity, please upload the required images on our official Telegram support: @BattleHubFF.\nOur support team will assist you further there.",
      telegramSupport: `Further support for this issue will be handled on our official Telegram support channel: @BattleHubFF.\nPlease contact us there with your Ticket ID: ${selectedTicket.id.substring(0, 8).toUpperCase()}`
    };
    
    try {
      const now = new Date().toISOString();
      const systemMsg = {
        sender_id: "system",
        sender_name: "BattleHub Support",
        sender_role: "admin",
        message: messages[messageType],
        is_system_message: true,
        timestamp: now
      };
      
      await SupportTicket.update(selectedTicket.id, {
        messages: [...(selectedTicket.messages || []), systemMsg],
        last_message_at: now
      });
      
      // Send notification
      await Notification.create({
        recipient_id: selectedTicket.user_id,
        type: "Support Message",
        title: "📢 Support Team Update",
        message: messages[messageType].substring(0, 100),
        link: createPageUrl("Support"),
        priority: "High",
        dismissable: true,
        created_at: now
      });
      
      await loadData();
      setSelectedTicket(prev => ({
        ...prev,
        messages: [...(prev.messages || []), systemMsg],
        last_message_at: now
      }));
    } catch (error) {
      console.error("Error sending system message:", error);
    }
    setSendingSystemMessage(false);
  };


  if (loading && tickets.length === 0) { // Only show full loading screen on initial load
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-2">
              Customer Support
            </h1>
            <p className="text-gray-400 text-lg">Choose your preferred support channel</p>
          </div>

          {/* Support Options - Priority Order */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {/* Dynamic WhatsApp Contacts */}
            {supportContacts.length > 0 ? (
              supportContacts.map((contact, idx) => (
                <a
                  key={contact.id}
                  href={`https://wa.me/${contact.whatsapp_number}?text=${encodeURIComponent('Hello, I need help with BattleHub FF')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-2 border-green-500/50 hover:border-green-400 transition-all cursor-pointer h-full group">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MessageCircle className="w-8 h-8 text-green-400" />
                      </div>
                      {idx === 0 && <Badge className="bg-green-500 text-white mb-2">🔥 RECOMMENDED</Badge>}
                      <h3 className="text-xl font-bold text-white mb-2">{contact.name}</h3>
                      <p className="text-gray-300 text-sm">{contact.role || "Direct support via WhatsApp - Fast response"}</p>
                    </CardContent>
                  </Card>
                </a>
              ))
            ) : (
              <a
                href={`https://wa.me/917366877171?text=${encodeURIComponent('Hello, I need help with BattleHub FF')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-2 border-green-500/50 hover:border-green-400 transition-all cursor-pointer h-full group">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <Badge className="bg-green-500 text-white mb-2">🔥 RECOMMENDED</Badge>
                    <h3 className="text-xl font-bold text-white mb-2">WhatsApp Support</h3>
                    <p className="text-gray-300 text-sm">Direct support via WhatsApp - Fast response</p>
                  </CardContent>
                </Card>
              </a>
            )}

            {/* 2. Tidio Live Chat - PRIORITY 2 */}
            <Card 
              className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-2 border-blue-500/50 hover:border-blue-400 transition-all cursor-pointer h-full group"
              onClick={() => {
                if (window.tidioChatApi) {
                  window.tidioChatApi.open();
                } else {
                  alert("Live chat loading... Please wait a moment and try again.");
                }
              }}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-8 h-8 text-blue-400" />
                </div>
                <Badge className="bg-blue-500 text-white mb-2">💬 LIVE CHAT</Badge>
                <h3 className="text-xl font-bold text-white mb-2">Live Chat Support</h3>
                <p className="text-gray-300 text-sm">
                  Chat with our support team in real-time
                </p>
              </CardContent>
            </Card>

            {/* 3. Email Support */}
            <a href="mailto:helpbattlehub@gmail.com" className="block">
              <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-2 border-purple-500/50 hover:border-purple-400 transition-all cursor-pointer h-full group">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ExternalLink className="w-8 h-8 text-purple-400" />
                  </div>
                  <Badge className="bg-purple-500 text-white mb-2">📧 EMAIL</Badge>
                  <h3 className="text-xl font-bold text-white mb-2">Email Support</h3>
                  <p className="text-gray-300 text-sm">
                    helpbattlehub@gmail.com
                  </p>
                </CardContent>
              </Card>
            </a>

            {/* 4. Create Ticket - PRIORITY 4 */}
            {user?.role !== 'admin' && (
              <Card 
                onClick={() => setShowNewTicket(true)}
                className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border-2 border-orange-500/50 hover:border-orange-400 transition-all cursor-pointer h-full group"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <HelpCircle className="w-8 h-8 text-orange-400" />
                  </div>
                  <Badge className="bg-orange-500 text-white mb-2">🎫 TICKET</Badge>
                  <h3 className="text-xl font-bold text-white mb-2">Create Support Ticket</h3>
                  <p className="text-gray-300 text-sm">
                    Submit a detailed support request with attachments
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Existing Ticket System */}
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
          <Card className="lg:col-span-1 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100 text-sm lg:text-base">
                {user?.role === 'admin' ? 'All Tickets' : 'My Tickets'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] lg:max-h-[600px] overflow-y-auto">
              {tickets.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tickets yet</p>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedTicket?.id === ticket.id
                        ? 'bg-orange-500/20 border-2 border-orange-500/50'
                        : 'bg-gray-800/50 hover:bg-gray-800 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-100 text-sm truncate">
                        {ticket.subject}
                      </h4>
                      <Badge className={
                        ticket.status === "Open" ? "bg-blue-500/20 text-blue-400" :
                        ticket.status === "In Progress" ? "bg-yellow-500/20 text-yellow-400" :
                        ticket.status === "Resolved" ? "bg-green-500/20 text-green-400" :
                        "bg-gray-500/20 text-gray-400"
                      }>
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      {ticket.user_ign} • {format(new Date(ticket.created_date), "MMM d")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {ticket.messages?.length || 0} messages
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            {selectedTicket ? (
              <>
                <CardHeader className="border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-100">{selectedTicket.subject}</CardTitle>
                      <p className="text-sm text-gray-400 mt-1">
                        Ticket by {selectedTicket.user_ign}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* Refresh button for all tickets handled by the main refresh button */}
                      <div className="flex gap-2 flex-wrap">
                        {user?.role === 'admin' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const newStatus = !selectedTicket.allow_user_attachments;
                                await SupportTicket.update(selectedTicket.id, {
                                  allow_user_attachments: newStatus
                                });
                                setSelectedTicket({...selectedTicket, allow_user_attachments: newStatus});
                                if (newStatus) {
                                  await sendSystemMessage('enablePhoto');
                                }
                              }}
                              className="border-purple-700 text-purple-400"
                              disabled={submitting || sendingSystemMessage}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              {selectedTicket.allow_user_attachments ? 'Disable' : 'Enable'} Photo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendSystemMessage('telegramPhoto')}
                              className="border-blue-700 text-blue-400"
                              disabled={sendingSystemMessage}
                            >
                              Telegram Photo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendSystemMessage('telegramSupport')}
                              className="border-cyan-700 text-cyan-400"
                              disabled={sendingSystemMessage}
                            >
                              Switch to Telegram
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTicketStatus("In Progress")}
                              className="border-gray-700"
                              disabled={submitting}
                            >
                              In Progress
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateTicketStatus("Resolved")}
                              className="bg-green-500 hover:bg-green-600"
                              disabled={submitting}
                            >
                              Resolve
                            </Button>
                          </>
                        ) : selectedTicket.status !== "Resolved" && (
                          <Button
                            size="sm"
                            onClick={() => updateTicketStatus("Resolved")}
                            className="bg-green-500 hover:bg-green-600"
                            disabled={submitting}
                          >
                            Mark as Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex justify-between items-center p-6 pb-2">
                    <h3 className="text-lg font-bold text-gray-100">Messages</h3>
                    <Button
                      onClick={refreshSelectedTicket}
                      size="sm"
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      disabled={selectedTicketLoading}
                    >
                      {selectedTicketLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                  </div>
                  <div id="chat-messages" className="h-[300px] lg:h-[400px] overflow-y-auto p-3 lg:p-6 space-y-4">
                    {selectedTicket.messages?.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          msg.sender_id === user.id ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <Avatar className="w-8 h-8 ring-2 ring-orange-500/30">
                          <AvatarFallback className="bg-orange-500/20 text-orange-400">
                            {msg.sender_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 max-w-[70%] ${
                          msg.sender_id === user.id ? 'text-right' : 'text-left'
                        }`}>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-semibold text-gray-400">
                              {msg.sender_name}
                            </span>
                            {msg.sender_role === 'admin' && (
                              <Badge className="bg-red-500/20 text-red-400 text-xs">Admin</Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {format(new Date(msg.timestamp), "MMM d, h:mm a")}
                            </span>
                            <span className="text-[10px] text-green-400">✓✓</span>
                          </div>
                          <div className={`p-3 rounded-lg ${
                            msg.is_system_message
                              ? 'bg-blue-500/20 text-blue-100 border-l-4 border-blue-500'
                              : msg.sender_id === user.id
                              ? 'bg-orange-500/20 text-gray-100'
                              : 'bg-gray-800 text-gray-100'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {msg.attachments.map((url, i) => {
                                  const isImage = url.match(/\.(jpg|jpeg|png|gif)$/i);
                                  const isVideo = url.match(/\.(mp4|webm|mov)$/i);

                                  if (isImage || isVideo) {
                                    return (
                                      <div
                                        key={i}
                                        className="cursor-pointer block"
                                        onClick={() => handleViewMedia(url)}
                                      >
                                        {isImage ? (
                                          <img
                                            src={url}
                                            alt="Attachment"
                                            className="max-w-full rounded border border-gray-700 hover:border-orange-500 transition-colors"
                                          />
                                        ) : ( // isVideo
                                          <video
                                            src={url}
                                            controls
                                            className="max-w-full rounded border border-gray-700"
                                          />
                                        )}
                                      </div>
                                    );
                                  } else {
                                    // For other file types, open externally
                                    return (
                                      <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                      >
                                        <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded text-xs hover:bg-gray-900 transition-colors">
                                          <Paperclip className="w-4 h-4" />
                                          <span>Attachment {i + 1}</span>
                                        </div>
                                      </a>
                                    );
                                  }
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedTicket.status !== "Closed" && selectedTicket.status !== "Resolved" && (
                    <div className="border-t border-gray-700 p-4">
                      {attachments.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {attachments.map((url, index) => (
                            <div key={index} className="relative group">
                              {url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <img
                                  src={url}
                                  alt="Preview"
                                  className="w-16 h-16 object-cover rounded border-2 border-orange-500/50"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-800 rounded border-2 border-orange-500/50 flex items-center justify-center">
                                  <Paperclip className="w-6 h-6 text-orange-400" />
                                </div>
                              )}
                              <button
                                onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Input
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="bg-gray-800 border-gray-700 text-gray-100"
                          onKeyPress={(e) => e.key === 'Enter' && !submitting && sendReply()}
                          disabled={submitting || uploadingFiles}
                        />
                        {(user?.role === 'admin' || selectedTicket.allow_user_attachments) && (
                          <label className="cursor-pointer">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="border-gray-700"
                              disabled={uploadingFiles || submitting}
                              asChild
                            >
                              <div>
                                <Paperclip className="w-4 h-4" />
                              </div>
                            </Button>
                            <input
                              type="file"
                              accept="image/*,video/*,.pdf"
                              multiple
                              onChange={handleFileUpload}
                              className="hidden"
                              disabled={uploadingFiles || submitting}
                            />
                          </label>
                        )}
                        <Button
                          onClick={sendReply}
                          disabled={(!replyMessage.trim() && attachments.length === 0) || uploadingFiles || submitting}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          {submitting ? "Sending..." : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="p-12 text-center">
                <MessageCircle className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No ticket selected</h3>
                <p className="text-gray-500">Select a ticket to view the conversation</p>
              </CardContent>
            )}
          </Card>
        </div>

        {showNewTicket && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => !submitting && setShowNewTicket(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl my-8">
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-gray-100">Create New Support Ticket</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Subject</Label>
                      <Input
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="Brief description of your issue"
                        className="bg-gray-800 border-gray-700 text-gray-100"
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Message</Label>
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Describe your issue in detail..."
                        className="bg-gray-800 border-gray-700 text-gray-100 min-h-[120px]"
                        disabled={submitting}
                      />
                    </div>

                    <Alert className="bg-yellow-500/10 border-yellow-500/30">
                      <AlertDescription className="text-yellow-400 text-sm">
                        ⚠️ Photo/file uploads are disabled when creating a ticket. Admin will enable it if needed.
                      </AlertDescription>
                    </Alert>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!submitting) {
                            setShowNewTicket(false);
                            setNewSubject("");
                            setNewMessage("");
                            setAttachments([]);
                          }
                        }}
                        className="border-gray-700"
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={createNewTicket}
                        disabled={!newSubject.trim() || !newMessage.trim() || submitting}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {submitting ? "Creating..." : "Create Ticket"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        {showMediaViewer && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setShowMediaViewer(false)}>
            <div onClick={(e) => e.stopPropagation()} className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center">
              <Button onClick={() => setShowMediaViewer(false)} className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full" size="icon">
                <X className="w-5 h-5" />
              </Button>
              {mediaToView.type === "image" && (
                <img src={mediaToView.url} alt="Full size media" className="max-w-full max-h-full object-contain" />
              )}
              {mediaToView.type === "video" && (
                <video src={mediaToView.url} controls autoPlay className="max-w-full max-h-full object-contain" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}