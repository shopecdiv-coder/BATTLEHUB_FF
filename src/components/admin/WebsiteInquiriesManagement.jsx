import React, { useState, useEffect } from 'react';
import { db } from '@/api/firebaseClient';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import { 
  Globe, Mail, Phone, MessageSquare, CheckCircle2, Clock, 
  Trash2, RefreshCw, Send, ExternalLink, User, Gamepad2, 
  Search, ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function WebsiteInquiriesManagement() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reply State
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let unsubs = [];
    try {
      // 1. Listen to 'inquiries' collection
      const q1 = query(collection(db, 'inquiries'), limit(50));
      let inqDocs = [];
      let ticketDocs = [];

      const syncAll = () => {
        const map = new Map();
        
        // Add from inquiries collection
        inqDocs.forEach(d => {
          map.set(d.id, {
            id: d.id,
            name: d.name || 'Anonymous',
            email: d.email || '',
            phone: d.phone || '',
            battlehubId: d.battlehubId || d.battlehub_id || '',
            message: d.message || d.description || '',
            status: d.status || 'New',
            source: 'Website',
            collection: 'inquiries',
            created_date: d.created_date || (d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString())
          });
        });

        // Add from support_tickets where source is Website
        ticketDocs.forEach(d => {
          const isWeb = (d.source?.toLowerCase().includes('website')) || (d.subject?.startsWith('[Website]'));
          if (isWeb && !map.has(d.id)) {
            map.set(d.id, {
              id: d.id,
              name: d.user_name || d.name || 'Anonymous',
              email: d.user_email || d.email || '',
              phone: d.phone || d.user_phone || '',
              battlehubId: d.battlehub_id || d.battlehubId || d.user_ign || '',
              message: d.description || d.message || '',
              status: d.status || 'New',
              source: 'Website',
              collection: 'support_tickets',
              created_date: d.created_date || d.created_at || new Date().toISOString()
            });
          }
        });

        const list = Array.from(map.values()).sort((a, b) => {
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        });

        setInquiries(list);
        setLoading(false);

        // Keep selected item synced
        setSelectedInquiry(prev => {
          if (!prev && list.length > 0) return list[0];
          if (prev) {
            const updated = list.find(item => item.id === prev.id);
            return updated || (list.length > 0 ? list[0] : null);
          }
          return null;
        });
      };

      const unsub1 = onSnapshot(q1, (snap) => {
        inqDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        syncAll();
      }, (err) => console.warn('Inquiries listener error:', err));

      // 2. Also listen to 'support_tickets' for website tickets
      const q2 = query(collection(db, 'support_tickets'), limit(50));
      const unsub2 = onSnapshot(q2, (snap) => {
        ticketDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        syncAll();
      }, (err) => console.warn('Support tickets listener error:', err));

      unsubs.push(unsub1, unsub2);
    } catch (e) {
      console.error('Error initializing website inquiries listener:', e);
      setLoading(false);
    }

    return () => {
      unsubs.forEach(u => u && u());
    };
  }, []);

  // Update Status
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedInquiry) return;
    setActionLoading(true);
    try {
      const colName = selectedInquiry.collection || 'inquiries';
      await updateDoc(doc(db, colName, selectedInquiry.id), {
        status: newStatus
      });
      setSelectedInquiry(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Inquiry
  const handleDeleteInquiry = async () => {
    if (!selectedInquiry) return;
    if (!window.confirm(`Are you sure you want to delete inquiry from ${selectedInquiry.name}?`)) return;
    setActionLoading(true);
    try {
      const colName = selectedInquiry.collection || 'inquiries';
      await deleteDoc(doc(db, colName, selectedInquiry.id));
      setSelectedInquiry(null);
    } catch (err) {
      console.error('Error deleting inquiry:', err);
      alert('Failed to delete inquiry: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Send Email Reply via AWS SES Backend
  const handleSendEmailReply = async () => {
    if (!replyText.trim()) {
      alert('Please write a reply message first.');
      return;
    }
    if (!selectedInquiry?.email) {
      alert('This inquiry has no valid email address.');
      return;
    }

    setSendingReply(true);
    setReplySuccess(false);

    try {
      const res = await fetch('http://localhost:5174/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          to: selectedInquiry.email,
          recipientName: selectedInquiry.name || 'Player',
          subject: `[BattleHub Support] Re: Inquiry from ${selectedInquiry.name}`,
          replyText: replyText.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReplySuccess(true);
        setReplyText('');
        if (selectedInquiry.status === 'New' || selectedInquiry.status === 'Open') {
          await handleUpdateStatus('In Progress');
        }
        setTimeout(() => setReplySuccess(false), 6000);
      } else {
        alert('Failed to send email: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Email reply error:', err);
      alert('Error sending email: ' + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // Filtered list
  const filteredList = inquiries.filter(item => {
    const matchesStatus = filterStatus === 'All' || item.status?.toLowerCase() === filterStatus.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      item.name?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q) ||
      item.phone?.includes(q) ||
      item.battlehubId?.toLowerCase().includes(q) ||
      item.message?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Metrics
  const totalCount = inquiries.length;
  const newCount = inquiries.filter(i => i.status === 'New' || i.status === 'Open').length;
  const inProgressCount = inquiries.filter(i => i.status === 'In Progress').length;
  const resolvedCount = inquiries.filter(i => i.status === 'Resolved').length;

  return (
    <div className="space-y-6">
      
      {/* ── Page Title & Metrics Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Website Inquiries</h1>
            {newCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-orange-600 text-white animate-pulse">
                {newCount} New
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Direct contact form messages, sponsor inquiries, and tournament queries from battlehub.site.
          </p>
        </div>

        {/* 4 Metric Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5 shrink-0">
            <span className="text-slate-400 text-xs font-medium">Total:</span>
            <strong className="text-white font-bold text-sm">{totalCount}</strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-2.5 shrink-0">
            <span className="text-orange-400 text-xs font-medium">New:</span>
            <strong className="text-orange-400 font-bold text-sm">{newCount}</strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2.5 shrink-0">
            <span className="text-yellow-400 text-xs font-medium">In Progress:</span>
            <strong className="text-yellow-400 font-bold text-sm">{inProgressCount}</strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 shrink-0">
            <span className="text-emerald-400 text-xs font-medium">Resolved:</span>
            <strong className="text-emerald-400 font-bold text-sm">{resolvedCount}</strong>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Row ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/5 w-full sm:w-auto overflow-x-auto">
          {['All', 'New', 'In Progress', 'Resolved'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filterStatus === tab 
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab} {tab === 'All' ? `(${totalCount})` : tab === 'New' ? `(${newCount})` : tab === 'In Progress' ? `(${inProgressCount})` : `(${resolvedCount})`}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, email..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      {/* ── Main 2-Column Interface ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── Left Column: Inquiries List ── */}
        <div className="lg:col-span-5 border border-white/5 rounded-2xl bg-slate-950/80 overflow-hidden flex flex-col h-[650px]">
          <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Messages ({filteredList.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-500">Loading inquiries...</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No inquiries match your criteria.
              </div>
            ) : (
              filteredList.map((item) => {
                const isSelected = selectedInquiry?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedInquiry(item)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected 
                        ? 'bg-orange-600/10 border-orange-500/40 shadow-sm' 
                        : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.04]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-orange-500 rounded-full" />
                    )}

                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {item.phone && <span className="text-emerald-400 font-medium">{item.phone}</span>}
                          {item.phone && item.battlehubId && <span>•</span>}
                          {item.battlehubId && <span className="text-purple-300 font-mono">{item.battlehubId}</span>}
                        </div>
                      </div>

                      <Badge className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 border-0 ${
                        item.status === 'New' || item.status === 'Open' ? 'bg-orange-500/20 text-orange-400' :
                        item.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-300' :
                        item.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {item.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                      <span className="truncate max-w-[180px]">{item.email}</span>
                      <span>{format(new Date(item.created_date), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Column: Selected Inquiry Workspace ── */}
        <div className="lg:col-span-7 border border-white/5 rounded-2xl bg-slate-950/80 overflow-hidden flex flex-col h-[650px]">
          {selectedInquiry ? (
            <div className="flex flex-col h-full">
              
              {/* Header Action Bar */}
              <div className="p-3.5 border-b border-white/5 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-black text-white truncate">
                    {selectedInquiry.name}
                  </span>
                  <Badge className={`text-[9px] uppercase font-bold px-2 py-0.5 border-0 ${
                    selectedInquiry.status === 'New' || selectedInquiry.status === 'Open' ? 'bg-orange-500/20 text-orange-400' :
                    selectedInquiry.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-300' :
                    selectedInquiry.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {selectedInquiry.status}
                  </Badge>
                </div>

                {/* Status Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedInquiry.status !== 'In Progress' && selectedInquiry.status !== 'Resolved' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus('In Progress')}
                      disabled={actionLoading}
                      className="bg-yellow-600/80 hover:bg-yellow-600 text-white font-bold h-8 text-[11px] rounded-lg px-2.5 flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      In Progress
                    </Button>
                  )}
                  {selectedInquiry.status !== 'Resolved' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus('Resolved')}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-[11px] rounded-lg px-2.5 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolve
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleDeleteInquiry}
                    disabled={actionLoading}
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Scrollable Detail Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                
                {/* 1. Contact Information Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                  
                  {/* Name */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Sender Name</span>
                      <strong className="text-white text-sm">{selectedInquiry.name}</strong>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Email Address</span>
                      <a href={`mailto:${selectedInquiry.email}`} className="text-sky-400 hover:underline font-semibold text-xs truncate block">
                        {selectedInquiry.email || 'N/A'}
                      </a>
                    </div>
                  </div>

                  {/* Phone + WhatsApp */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Phone Number</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a href={`tel:${selectedInquiry.phone}`} className="text-emerald-400 hover:underline font-bold text-xs">
                          {selectedInquiry.phone || 'N/A'}
                        </a>
                        {selectedInquiry.phone && (
                          <a
                            href={`https://wa.me/${selectedInquiry.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1 transition-all"
                          >
                            WhatsApp <ArrowUpRight className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BattleHub ID */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                      <Gamepad2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">BattleHub ID</span>
                      <strong className="text-purple-300 font-mono text-sm">
                        {selectedInquiry.battlehubId || 'Not Provided'}
                      </strong>
                    </div>
                  </div>

                </div>

                {/* 2. Message Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                      Inquiry Message
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {format(new Date(selectedInquiry.created_date), 'PPpp')}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-orange-600/[0.04] border border-orange-500/20 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap select-text font-normal">
                    {selectedInquiry.message || 'No message provided.'}
                  </div>
                </div>

                {/* 3. Official Email Reply Box */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-orange-400" />
                      Send Official Email Reply (contact@battlehub.site)
                    </span>
                    {replySuccess && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Email Delivered!
                      </span>
                    )}
                  </div>

                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '✅ Your issue has been resolved! Please check your account.',
                      '⏳ We are reviewing your inquiry. Please allow 15-30 minutes.',
                      '🎮 Room ID & Password will be available in the app 15 mins before match.',
                      '💰 Your withdrawal request has been approved and processed.'
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

                  {/* Reply Textarea */}
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Type your response to ${selectedInquiry.email || 'user'} here...`}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none"
                  />

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <a
                      href={`mailto:${selectedInquiry.email}?subject=Re: Inquiry from ${encodeURIComponent(selectedInquiry.name)}&body=${encodeURIComponent(replyText)}`}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in External Email App
                    </a>

                    <Button
                      onClick={handleSendEmailReply}
                      disabled={sendingReply || !replyText.trim() || !selectedInquiry.email}
                      className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
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

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Globe className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-300">Select an Inquiry</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Click on any message from the left list to review contact details, message body, and send an email reply.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
