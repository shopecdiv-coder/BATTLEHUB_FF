import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Shield, Users, LogOut, Settings, UserPlus, X, Save, ArrowRight, Check, Upload, Loader2, QrCode, Copy, Trash2, BellOff, Image as ImageIcon, Search, AlertTriangle, RefreshCw, FileText } from "lucide-react";
import { UserGroup, User } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/api/firebaseClient";
import { doc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { UploadFile } from "@/integrations/Core";
import InviteParticipantsDrawer from "./InviteParticipantsDrawer";
import GroupParticipantsDrawer from "./GroupParticipantsDrawer";
import GroupPendingRequestsDrawer from "./GroupPendingRequestsDrawer";
import GroupMediaDrawer from "./GroupMediaDrawer";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function GroupSettingsDrawer({ group, isOpen, onClose, onGroupUpdated, onLeaveGroup, onDeleteGroup }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const isInviteOpen = searchParams.get('drawer') === 'invite';
  const isParticipantsOpen = searchParams.get('drawer') === 'participants';
  const isPendingRequestsOpen = searchParams.get('drawer') === 'requests';
  const isQrOpen = searchParams.get('drawer') === 'qr';

  const setIsInviteOpen = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('drawer', 'invite');
      else next.delete('drawer');
      return next;
    }, { replace: !isOpen });
  };

  const setIsParticipantsOpen = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('drawer', 'participants');
      else next.delete('drawer');
      return next;
    }, { replace: !isOpen });
  };

  const setIsPendingRequestsOpen = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('drawer', 'requests');
      else next.delete('drawer');
      return next;
    }, { replace: !isOpen });
  };

  const setIsQrOpen = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('drawer', 'qr');
      else next.delete('drawer');
      return next;
    }, { replace: !isOpen });
  };
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(3);
  
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editBanner, setEditBanner] = useState("");
  const [editDp, setEditDp] = useState("");
  const [editEditInfo, setEditEditInfo] = useState("all");
  const [editSendMessages, setEditSendMessages] = useState("all");
  const [editApproveNew, setEditApproveNew] = useState(false);
  const [editAddMembers, setEditAddMembers] = useState("all");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingDp, setUploadingDp] = useState(false);
  
  const isMediaDrawerOpen = searchParams.get('drawer') === 'media';
  
  const setIsMediaDrawerOpen = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('drawer', 'media');
      else next.delete('drawer');
      return next;
    }, { replace: !isOpen });
  };

  const isMuteModalOpen = searchParams.get('drawer') === 'mute';
  const setIsMuteModalOpen = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('drawer', 'mute');
      else next.delete('drawer');
      return next;
    }, { replace: !isOpen });
  };
  
  const [muteDuration, setMuteDuration] = useState("");
  
  const isReportModalOpen = searchParams.get('drawer') === 'report';
  const setIsReportModalOpen = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('drawer', 'report');
      else next.delete('drawer');
      return next;
    }, { replace: !isOpen });
  };
  const [reportReasonText, setReportReasonText] = useState("");
  const [reportProofFile, setReportProofFile] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const reportFileInputRef = React.useRef(null);
  
  const isMuted = user?.muted_chats?.[group?.id] > Date.now();




  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const { file_url } = await UploadFile({ file });
      setEditBanner(file_url);
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDpUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDp(true);
    try {
      const { file_url } = await UploadFile({ file });
      setEditDp(file_url);
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingDp(false);
    }
  };

  useEffect(() => {
    if (group && user) {
      const adminList = group.admins || [group.admin_id];
      setIsAdmin(adminList.includes(user.id));
      setEditName(group.name);
      setEditDesc(group.description || "");
      setEditBanner(group.banner || "");
      setEditDp(group.dp || "");
      setEditEditInfo(group.settings_edit_info || "all");
      setEditSendMessages(group.settings_send_messages || "all");
      setEditApproveNew(group.settings_approve_new || false);
      setEditAddMembers(group.settings_add_members || "all");
      
      const loadUsers = async () => {
        try {
          // Load members
          const loadedMembers = [];
          for (const uid of group.members || []) {
            const u = await User.get(uid);
            if (u) loadedMembers.push(u);
          }
          setMembers(loadedMembers);
          
          // Load pending members
          const loadedPending = [];
          for (const uid of group.pending_members || []) {
            const u = await User.get(uid);
            if (u) loadedPending.push(u);
          }
          setPendingUsers(loadedPending);
        } catch (e) {
          console.error(e);
        }
      };
      loadUsers();
    }
  }, [group, user]);

  const handleSaveSettings = async () => {
    try {
      await UserGroup.update(group.id, {
        name: editName,
        description: editDesc,
        banner: editBanner,
        dp: editDp,
        settings_edit_info: editEditInfo,
        settings_send_messages: editSendMessages,
        settings_approve_new: editApproveNew,
        settings_add_members: editAddMembers
      });
      setIsEditing(false);
      if (onGroupUpdated) onGroupUpdated();
    } catch(e) {
      console.error(e);
    }
  };

  const handleMakeAdmin = async (memberId) => {
    try {
      const admins = group.admins || [group.admin_id];
      if (!admins.includes(memberId)) {
        await UserGroup.update(group.id, { admins: [...admins, memberId] });
        if (onGroupUpdated) onGroupUpdated();
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const newMembers = group.members.filter(m => m !== memberId);
      await UserGroup.update(group.id, { members: newMembers });
      if (onGroupUpdated) onGroupUpdated();
    } catch(e) {
      console.error(e);
    }
  };
  
  const handleMute = async () => {
    if (!muteDuration) return;
    try {
      let durationMs = 0;
      if (muteDuration === "8h") durationMs = 8 * 60 * 60 * 1000;
      else if (muteDuration === "1w") durationMs = 7 * 24 * 60 * 60 * 1000;
      else if (muteDuration === "always") durationMs = 100 * 365 * 24 * 60 * 60 * 1000;
      
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        [`muted_chats.${group.id}`]: Date.now() + durationMs
      });
      
      toast.success("Group notifications muted");
      setIsMuteModalOpen(false);
    } catch(e) {
      console.error(e);
      toast.error("Failed to mute group");
    }
  };
  
  const handleUnmute = async () => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        [`muted_chats.${group.id}`]: 0
      });
      toast.success("Group unmuted");
    } catch(e) {
      console.error(e);
      toast.error("Failed to unmute group");
    }
  };

  const handleClearChat = async () => {
    if (!confirm("Are you sure you want to clear chat history for this group? This will only clear it for you.")) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        [`cleared_group_chats.${group.id}`]: Date.now()
      });
      toast.success("Chat cleared successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to clear chat");
    }
  };

  const handleReportGroup = async () => {
    if (!reportReasonText.trim()) {
      toast.error("Please describe why you are reporting this group.");
      return;
    }
    if (!reportProofFile) {
      toast.error("Please attach an image as proof.");
      return;
    }
    
    setIsSubmittingReport(true);
    try {
      let evidenceUrl = null;
      if (reportProofFile) {
        const { file_url } = await UploadFile({ file: reportProofFile });
        evidenceUrl = file_url;
      }
      
      await addDoc(collection(db, "reports"), {
        type: "group",
        group_id: group.id,
        reported_ign: `Group: ${group.name}`,
        reporter_id: user.id,
        reporter_ign: user.ign || user.full_name || "Unknown",
        reason: "Group Abuse/Spam",
        description: reportReasonText.trim(),
        evidence_urls: evidenceUrl ? [evidenceUrl] : [],
        status: "Pending",
        created_date: new Date().toISOString(),
        created_at: serverTimestamp()
      });
      toast.success("Group reported for review. Thank you.");
      setIsReportModalOpen(false);
      setReportReasonText("");
      setReportProofFile(null);
    } catch(e) {
      toast.error("Failed to report group");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleResetQr = async () => {
    if (!confirm("Are you sure you want to reset the invite link? The old link/QR will no longer work.")) return;
    try {
      const newCode = Math.floor(100000000 + Math.random() * 900000000).toString();
      await UserGroup.update(group.id, { invite_code: newCode });
      if (onGroupUpdated) onGroupUpdated();
      toast.success("Invite link has been reset!");
    } catch(e) {
      toast.error("Failed to reset link");
    }
  };
  
  useEffect(() => {
    let timer;
    if (isDeleteConfirmOpen && deleteCountdown > 0) {
      timer = setTimeout(() => setDeleteCountdown(deleteCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isDeleteConfirmOpen, deleteCountdown]);

  const handleExitGroup = () => {
    const admins = group.admins || [group.admin_id];
    if (isAdmin && admins.length === 1 && group.members.length > 1) {
      alert("You are the only admin. Please make someone else an admin before exiting.");
      return;
    }
    if (onLeaveGroup) onLeaveGroup();
  };

  const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /((?:https?:\/\/|www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        let href = part;
        if (!href.startsWith('http://') && !href.startsWith('https://')) {
          href = 'https://' + href;
        }
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!group) return null;

  const adminList = group.admins || [group.admin_id];

  const canAddMembers = isAdmin || group.settings_add_members !== 'admins';

  const isAnyNestedDrawerOpen = searchParams.get('drawer') !== null || isDeleteConfirmOpen;

  return (
    <>
    <Sheet open={isOpen} onOpenChange={(val) => {
      if (!val && !isAnyNestedDrawerOpen) {
        onClose();
      }
    }} modal={false}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md bg-slate-950 border-slate-800 p-0 overflow-y-auto z-[520] pb-24"
        onInteractOutside={(e) => {
          if (isAnyNestedDrawerOpen) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (isAnyNestedDrawerOpen) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          if (isAnyNestedDrawerOpen) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader className="p-4 border-b border-slate-800 sticky top-0 bg-slate-950 z-10 flex flex-row items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white rounded-full bg-slate-900/50 hover:bg-slate-800 mt-2">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Button>
            <SheetTitle className="text-white text-xl flex-1 text-center pr-10">Group Info</SheetTitle>
          </SheetHeader>
        
        <div className="p-6 space-y-8 pb-20">
          {/* Group Header Info */}
          <div className="relative -mt-6 -mx-6 mb-16">
            {group.banner ? (
              <div className="h-40 w-full bg-slate-800">
                <img src={group.banner} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-40 w-full bg-gradient-to-r from-slate-900 to-slate-800"></div>
            )}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <div className="relative group">
                <Avatar className="w-28 h-28 border-4 border-slate-950 shadow-xl bg-slate-950">
                  <AvatarImage src={isEditing ? editDp : group.dp} />
                  <AvatarFallback className="text-4xl font-bold bg-slate-900">{group.name.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center cursor-pointer transition-opacity z-10">
                    {uploadingDp ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Upload className="w-6 h-6 text-white" />}
                    <input type="file" accept="image/*" className="hidden" onChange={handleDpUpload} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{group.name}</h2>
              <p className="text-slate-400">Group · {group.members.length} participants</p>
            </div>

            <div className="flex gap-2 mt-4 w-full px-4">
              {canAddMembers && (
                <Button 
                  onClick={() => setIsInviteOpen(true)}
                  className="flex-1 bg-[#00FFFF]/10 hover:bg-[#00FFFF]/20 text-[#00FFFF] border border-[#00FFFF]/20 font-bold"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Add Participants
                </Button>
              )}
              <Button 
                onClick={() => setIsQrOpen(true)}
                className={`bg-[#00FFFF]/10 hover:bg-[#00FFFF]/20 text-[#00FFFF] border border-[#00FFFF]/20 ${canAddMembers ? "px-3" : "flex-1 font-bold"}`}
              >
                <QrCode className={canAddMembers ? "w-5 h-5" : "w-4 h-4 mr-2"} />
                {!canAddMembers && "Group QR Code"}
              </Button>
            </div>
            
            <div className="flex gap-4 mt-6 justify-center w-full px-4 text-xs font-bold text-gray-400">
              <div 
                className="flex flex-col items-center gap-2 cursor-pointer hover:text-white transition-colors"
                onClick={() => {
                  if (isMuted) handleUnmute();
                  else setIsMuteModalOpen(true);
                }}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isMuted ? "bg-[#00FFFF]/20 text-[#00FFFF]" : "bg-slate-900 border border-slate-800"}`}>
                  <BellOff className="w-5 h-5" />
                </div>
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </div>
            </div>
          </div>

          {group.description && (
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#00FFFF]/50 rounded-l-xl"></div>
              <h3 className="text-xs font-bold text-[#00FFFF] uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Description
              </h3>
              <div className={`text-sm text-slate-300 whitespace-pre-wrap break-words ${!isDescExpanded ? 'line-clamp-3' : ''}`}>
                {renderTextWithLinks(group.description)}
              </div>
              {(group.description.split('\n').length > 3 || group.description.length > 120) && (
                <button 
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="text-[#00FFFF] text-xs font-bold mt-2 hover:underline focus:outline-none"
                >
                  {isDescExpanded ? "Read less" : "Read more"}
                </button>
              )}
            </div>
          )}

          <Dialog open={isMuteModalOpen} onOpenChange={(val) => !val && navigate(-1)}>
            <DialogContent className="bg-slate-950 border border-gray-800 text-white max-w-xs rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-4">Mute Notifications</h2>
              <p className="text-sm text-gray-400 mb-6">Other participants will not see that you muted this chat.</p>
              
              <div className="space-y-3">
                {['8h', '1w', 'always'].map(val => (
                  <label key={val} className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 hover:bg-slate-900 cursor-pointer transition-colors">
                    <input 
                      type="radio" 
                      name="muteDuration" 
                      value={val} 
                      checked={muteDuration === val}
                      onChange={() => setMuteDuration(val)}
                      className="accent-[#00FFFF]"
                    />
                    <span className="capitalize">{val === '8h' ? '8 Hours' : val === '1w' ? '1 Week' : 'Always'}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => navigate(-1)} className="w-full">Cancel</Button>
                <Button onClick={handleMute} className="bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold" disabled={!muteDuration}>OK</Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* Removed QR Dialog from here, it will be added outside Sheet */}

          {/* Group Settings (If Admin) */}
          {isAdmin && (
            <div className="space-y-4 bg-slate-900 rounded-xl p-4 border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#00FFFF] uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Group Settings
                </h3>
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(group.name);
                        setEditDesc(group.description || "");
                        setEditBanner(group.banner || "");
                        setEditDp(group.dp || "");
                        setEditEditInfo(group.settings_edit_info || "all");
                        setEditSendMessages(group.settings_send_messages || "all");
                        setEditApproveNew(group.settings_approve_new || false);
                      }}
                      className="text-gray-400 hover:text-white hover:bg-slate-800 font-bold px-4"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => isEditing ? handleSaveSettings() : setIsEditing(true)}
                    className={isEditing ? "bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold px-4" : "bg-slate-800 text-gray-200 hover:text-white hover:bg-slate-700 font-bold px-4"}
                  >
                  {isEditing ? <><Save className="w-4 h-4 mr-1"/> Save</> : "Edit"}
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Group Name</label>
                    <input 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-[#00FFFF]/50" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Description</label>
                    <textarea 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-[#00FFFF]/50" 
                      value={editDesc} 
                      onChange={e => setEditDesc(e.target.value)} 
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Banner Image</label>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 h-14 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex items-center justify-center relative shadow-inner">
                        {editBanner ? (
                          <img src={editBanner} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-600">No banner</span>
                        )}
                      </div>
                      <label className="cursor-pointer shrink-0 bg-slate-900 hover:bg-[#00FFFF]/20 border border-slate-700 hover:border-[#00FFFF]/50 text-[#00FFFF] p-3 rounded-lg transition-all flex items-center justify-center shadow-sm">
                        {uploadingBanner ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-200">
                    <span>Edit Group Info</span>
                    <select className="bg-slate-950 border border-slate-700 rounded-lg p-2 focus:outline-none text-xs" value={editEditInfo} onChange={e => setEditEditInfo(e.target.value)}>
                      <option value="all">All Members</option>
                      <option value="admins">Admins Only</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-200">
                    <span>Send Messages</span>
                    <select className="bg-slate-950 border border-slate-700 rounded-lg p-2 focus:outline-none text-xs" value={editSendMessages} onChange={e => setEditSendMessages(e.target.value)}>
                      <option value="all">All Members</option>
                      <option value="admins">Admins Only</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-200">
                    <span>Require Admin Approval</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={editApproveNew} onChange={e => setEditApproveNew(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00FFFF]"></div>
                    </label>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-200">
                    <span>Add New Members</span>
                    <select className="bg-slate-950 border border-slate-700 rounded-lg p-2 focus:outline-none text-xs" value={editAddMembers} onChange={e => setEditAddMembers(e.target.value)}>
                      <option value="all">All Members</option>
                      <option value="admins">Admins Only</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Edit Group Info</span><span className="text-white capitalize">{group.settings_edit_info || "all"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Send Messages</span><span className="text-white capitalize">{group.settings_send_messages || "all"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Require Approval</span><span className="text-white">{group.settings_approve_new ? "Yes" : "No"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Add Members</span><span className="text-white capitalize">{group.settings_add_members || "all"}</span></div>
                </div>
              )}
            </div>
          )}
          
          {/* Media Links Docs */}
          <div className="space-y-4 bg-slate-900 rounded-xl p-4 border border-slate-800">
            <h3 
              className="text-sm font-bold text-white tracking-wider flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-800 p-2 -mx-2 rounded-lg transition-colors"
              onClick={() => setIsMediaDrawerOpen(true)}
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gray-400" /> Media, Links, and Docs
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </h3>
          </div>
          
          {/* Pending Requests Button */}
          {pendingUsers.length > 0 && (
            <div className="space-y-4 bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
              <h3 
                className="text-sm font-bold text-yellow-500 uppercase tracking-wider flex items-center justify-between gap-2 cursor-pointer hover:bg-black/20 p-2 -mx-2 rounded-lg transition-colors"
                onClick={() => setIsPendingRequestsOpen(true)}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Join Requests ({pendingUsers.length})
                </div>
                <ArrowRight className="w-4 h-4" />
              </h3>
            </div>
          )}

          {/* Participants Button */}
          <div className="space-y-4 bg-slate-900 rounded-xl p-4 border border-slate-800">
            <h3 
              className="text-sm font-bold text-[#00FFFF] uppercase tracking-wider flex items-center justify-between gap-2 mb-4 cursor-pointer hover:bg-slate-800 p-2 -mx-2 rounded-lg transition-colors"
              onClick={() => setIsParticipantsOpen(true)}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Participants ({group.members.length})
              </div>
              <ArrowRight className="w-4 h-4" />
            </h3>
          </div>

          {/* Clear Chat */}
          <Button 
            variant="ghost" 
            className="w-full text-white hover:bg-slate-800 justify-start h-12 rounded-xl border border-slate-800 mt-6"
            onClick={handleClearChat}
          >
            <Trash2 className="w-5 h-5 mr-3 text-gray-400" /> Clear Chat
          </Button>

          {/* Report Group */}
          <Button 
            variant="ghost" 
            className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-400 justify-start h-12 rounded-xl border border-red-500/20 mt-2"
            onClick={() => setIsReportModalOpen(true)}
          >
            <AlertTriangle className="w-5 h-5 mr-3" /> Report Group
          </Button>

          {/* Exit Group */}
          <Button 
            variant="ghost" 
            className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-400 justify-start h-12 rounded-xl border border-red-500/20 mt-2"
            onClick={handleExitGroup}
          >
            <LogOut className="w-5 h-5 mr-3" /> Exit Group
          </Button>

          {/* Delete Group */}
          {isAdmin && (
            <Button 
              variant="ghost" 
              className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-400 justify-start h-12 rounded-xl border border-red-500/20 mt-2"
              onClick={() => {
                setDeleteCountdown(3);
                setIsDeleteConfirmOpen(true);
              }}
            >
              <Trash2 className="w-5 h-5 mr-3" /> Delete Group
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
    
    <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
      <DialogContent className="bg-slate-950 border border-red-900/50 text-white max-w-sm rounded-3xl p-6 flex flex-col items-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Delete Group?</h2>
        <p className="text-sm text-gray-400 text-center mb-6">
          Are you sure you want to delete <b>{group.name}</b>? This action cannot be undone and all data will be permanently lost.
        </p>
        
        <div className="flex w-full gap-3">
          <Button 
            variant="outline" 
            className="flex-1 bg-transparent border-slate-700 text-white hover:bg-slate-800"
            onClick={() => setIsDeleteConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
            disabled={deleteCountdown > 0}
            onClick={() => {
              setIsDeleteConfirmOpen(false);
              if (onDeleteGroup) onDeleteGroup();
            }}
          >
            {deleteCountdown > 0 ? `Delete in ${deleteCountdown}s` : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    
      <InviteParticipantsDrawer 
        group={group} 
        isOpen={isInviteOpen} 
        onClose={() => navigate(-1)} 
      />
      <GroupParticipantsDrawer
        group={group}
        isOpen={isParticipantsOpen}
        onClose={() => navigate(-1)}
      />
      <GroupPendingRequestsDrawer
        group={group}
        isOpen={isPendingRequestsOpen}
        onClose={() => navigate(-1)}
      />
      <GroupMediaDrawer
        group={group}
        isOpen={isMediaDrawerOpen}
        onClose={() => navigate(-1)}
      />
      <Dialog open={isReportModalOpen} onOpenChange={(val) => !val && navigate(-1)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[90vw] max-w-md rounded-2xl">
          <h2 className="text-xl font-bold mb-2">Report Group</h2>
          <p className="text-sm text-gray-400 mb-4">Please provide details and proof (image) so admins can take action.</p>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Description</label>
              <textarea 
                value={reportReasonText}
                onChange={e => setReportReasonText(e.target.value)}
                placeholder="Why are you reporting this group?"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white resize-none h-24 focus:outline-none focus:border-[#00FFFF]/50"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Proof Image</label>
              <div 
                className={`w-full border-2 border-dashed ${reportProofFile ? 'border-[#00FFFF]/50' : 'border-slate-800'} rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-colors`}
                onClick={() => reportFileInputRef.current?.click()}
              >
                {reportProofFile ? (
                  <div className="flex flex-col items-center">
                    <Check className="w-8 h-8 text-[#00FFFF] mb-2" />
                    <span className="text-sm text-[#00FFFF] font-medium">{reportProofFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 text-gray-500 mb-2" />
                    <span className="text-sm text-gray-400">Tap to attach proof image</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  ref={reportFileInputRef}
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) setReportProofFile(e.target.files[0]);
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            <Button 
              onClick={() => setIsReportModalOpen(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReportGroup}
              disabled={isSubmittingReport || !reportReasonText.trim() || !reportProofFile}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-50"
            >
              {isSubmittingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {createPortal(
        <AnimatePresence>
          {isQrOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setIsQrOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-950 border border-slate-800 text-white max-w-sm w-full rounded-3xl p-8 flex flex-col items-center shadow-2xl relative"
              >
                <button 
                  onClick={() => setIsQrOpen(false)} 
                  className="absolute top-4 right-4 text-gray-400 hover:text-white p-2"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <h2 className="text-xl font-bold mb-2">Group QR Code</h2>
                <p className="text-sm text-gray-400 text-center mb-6">Scan this code to join {group?.name} instantly.</p>
                
                <div className="bg-white p-4 rounded-2xl shadow-inner mb-6">
                  {group?.invite_code ? (
                    <QRCodeSVG 
                      value={`BATTLEHUB_GROUP:${group.invite_code}`} 
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-sm">
                      No code available
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 w-full bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="flex-1 text-center font-mono text-lg tracking-widest text-[#00FFFF]">
                    {group?.invite_code || "N/A"}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-400 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(group?.invite_code || "");
                      alert("Invite code copied!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    className="w-full mt-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 text-sm"
                    onClick={handleResetQr}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Reset Link
                  </Button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
