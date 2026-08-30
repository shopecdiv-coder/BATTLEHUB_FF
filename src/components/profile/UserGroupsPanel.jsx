import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { UserGroup, User, ActiveUser } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, UserPlus, Hash, Settings, Search, Trash2, ArrowRight, Shield, Gamepad2, Lock, Globe, Tag, Image as ImageIcon, FileText, Upload, Loader2, QrCode, ChevronLeft } from "lucide-react";
import CustomScanner from "@/components/CustomScanner";
import { Camera } from '@capacitor/camera';
import { UploadFile } from "@/integrations/Core";
import { db } from "@/api/firebaseClient";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import toast from "react-hot-toast";
import SharedChatInterface from "@/components/chat/SharedChatInterface";
import GroupSettingsDrawer from "./GroupSettingsDrawer";
import { useSearchParams, useNavigate } from "react-router-dom";

const AnimatedScanIcon = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="7" x2="17" y1="12" y2="12">
      <animate attributeName="y1" values="7;17;7" dur="2s" repeatCount="indefinite" />
      <animate attributeName="y2" values="7;17;7" dur="2s" repeatCount="indefinite" />
    </line>
  </svg>
);

export default function UserGroupsPanel({ searchQuery = "" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeGroupId = searchParams.get('chatId');
  const isSettingsOpen = searchParams.get('settings') === 'true';

  const setActiveGroupId = (id) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id) next.set('chatId', id);
      else {
        next.delete('chatId');
        next.delete('settings');
        next.delete('drawer');
      }
      return next;
    }, { replace: !id });
  };

  const setIsSettingsOpen = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('settings', 'true');
      else {
        next.delete('settings');
        next.delete('drawer');
      }
      return next;
    }, { replace: !isOpen });
  };

  const [groupOnlineCount, setGroupOnlineCount] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState({});

  const activeGroupIdRef = useRef(activeGroupId);
  useEffect(() => {
    activeGroupIdRef.current = activeGroupId;
    
    // Hide bottom nav when chat is open
    if (activeGroupId) {
      document.body.classList.add('hide-bottom-nav');
    } else {
      document.body.classList.remove('hide-bottom-nav');
    }
    
    if (activeGroupId) {
      setUnreadCounts(prev => {
        if (prev[activeGroupId]) {
          const next = { ...prev };
          delete next[activeGroupId];
          return next;
        }
        return prev;
      });
    }
    
    return () => {
      document.body.classList.remove('hide-bottom-nav');
    };
  }, [activeGroupId]);

  useEffect(() => {
    if (!groups || groups.length === 0 || !user) return;
    const unsubscribes = [];

    groups.forEach(group => {
      const q = query(
        collection(db, "group_chat_messages"),
        where("group_id", "==", group.id),
        orderBy("created_at", "desc"),
        limit(1)
      );
      
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const lastMessage = snap.docs[0].data();
          const lastRead = parseInt(localStorage.getItem(`chat_read_${group.id}`) || '0');
          const msgTime = new Date(lastMessage.created_at || lastMessage.created_date).getTime();
          
          if (msgTime > lastRead && lastMessage.user_id !== user.id) {
            setUnreadCounts(prev => {
               return { ...prev, [group.id]: { time: msgTime, count: (prev[group.id]?.count || 0) + 1 } };
            });
          } else if (msgTime <= lastRead) {
            setUnreadCounts(prev => {
              if (prev[group.id]) {
                const next = { ...prev };
                delete next[group.id];
                return next;
              }
              return prev;
            });
          }
        }
      });
      unsubscribes.push(unsub);
    });

    const onChatRead = (e) => {
      const { chatId } = e.detail || {};
      if (chatId) {
        setUnreadCounts(prev => {
          if (prev[chatId]) {
            const next = { ...prev };
            delete next[chatId];
            return next;
          }
          return prev;
        });
      }
    };
    window.addEventListener('chatRead', onChatRead);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      window.removeEventListener('chatRead', onChatRead);
    };
  }, [groups, user]);

  useEffect(() => {
    let activeInterval;
    if (activeGroupId && groups.length > 0) {
      const activeGroup = groups.find(g => g.id === activeGroupId);
      if (activeGroup) {
        const fetchOnlineCount = async () => {
          try {
            const activeUsers = await ActiveUser.list("-last_active");
            const recent = activeUsers.filter(u => new Date(u.last_active) > new Date(Date.now() - 5 * 60 * 1000));
            setGroupOnlineCount(Math.max(1, recent.filter(u => activeGroup.members.includes(u.user_id)).length));
          } catch {
            setGroupOnlineCount(1);
          }
        };
        fetchOnlineCount();
        activeInterval = setInterval(fetchOnlineCount, 30000);
      }
    }
    return () => clearInterval(activeInterval);
  }, [activeGroupId, groups]);

  const isCreating = searchParams.get('action') === 'create';
  const isJoining = searchParams.get('action') === 'join';
  const isScannerOpen = searchParams.get('action') === 'scan';

  const setIsCreating = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('action', 'create');
      else next.delete('action');
      return next;
    }, { replace: !isOpen });
  };

  const setIsJoining = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('action', 'join');
      else next.delete('action');
      return next;
    }, { replace: !isOpen });
  };

  const setIsScannerOpen = (isOpen) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isOpen) next.set('action', 'scan');
      else next.delete('action');
      return next;
    }, { replace: !isOpen });
  };

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTag, setNewGroupTag] = useState("");
  const [newGroupDp, setNewGroupDp] = useState("");
  const [newGroupBanner, setNewGroupBanner] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupPrivacy, setNewGroupPrivacy] = useState("private");
  const [newGroupPlaystyle, setNewGroupPlaystyle] = useState("Casual");



  const [uploadingNewBanner, setUploadingNewBanner] = useState(false);

  const handleNewBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNewBanner(true);
    try {
      const { file_url } = await UploadFile({ file });
      setNewGroupBanner(file_url);
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingNewBanner(false);
    }
  };

  const [newGroupSettingsEditInfo, setNewGroupSettingsEditInfo] = useState("admins");
  const [newGroupSettingsSendMessages, setNewGroupSettingsSendMessages] = useState("all");
  const [newGroupSettingsApproveNew, setNewGroupSettingsApproveNew] = useState(true);
  const [newGroupSettingsAddMembers, setNewGroupSettingsAddMembers] = useState("all");
  
  const [joinCode, setJoinCode] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Custom event listeners for header buttons
  useEffect(() => {
    const handleOpenCreate = () => { setIsCreating(true); setIsJoining(false); setErrorMsg(""); };
    const handleOpenJoin = () => { setIsJoining(true); setIsCreating(false); setErrorMsg(""); };

    window.addEventListener('openCreateGroup', handleOpenCreate);
    window.addEventListener('openJoinGroup', handleOpenJoin);

    return () => {
      window.removeEventListener('openCreateGroup', handleOpenCreate);
      window.removeEventListener('openJoinGroup', handleOpenJoin);
    };
  }, []);

  // Fetch groups where current user is a member
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "user_groups"),
      where("members", "array-contains", user.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const gList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(gList);
      setLoading(false);
    }, (err) => {
      console.error("Failed to fetch groups:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { file_url } = await UploadFile({ file });
      setNewGroupDp(file_url);
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const generateInviteCode = () => {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setErrorMsg("Group name is required");
      return;
    }
    setErrorMsg("");
    const newGroup = {
      name: newGroupName,
      
      description: newGroupDesc,
      privacy: newGroupPrivacy,
      banner: newGroupBanner,
      
      dp: newGroupDp || "https://api.dicebear.com/7.x/shapes/svg?seed=" + newGroupName,
      invite_code: generateInviteCode(),
      admin_id: user.id,
      admins: [user.id],
      settings_edit_info: newGroupSettingsEditInfo,
      settings_send_messages: newGroupSettingsSendMessages,
      settings_approve_new: newGroupSettingsApproveNew,
      settings_add_members: newGroupSettingsAddMembers,
      members: [user.id],
      created_at: new Date().toISOString()
    };

    setIsCreatingGroup(true);
    try {
      const createdGroup = await UserGroup.create(newGroup);
      const gId = createdGroup.id;
      
      setIsCreating(false);
      setNewGroupName("");
      setNewGroupTag("");
      setNewGroupDp("");
      setActiveGroupId(gId);
    } catch (err) {
      console.error("Create group error:", err);
      setErrorMsg(err.message || "Failed to create group");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleJoinGroup = async (code = null, isDirectScan = false) => {
    const finalCode = code || joinCode;
    if (!finalCode.trim()) {
      setErrorMsg("Invite code is required");
      return;
    }
    setErrorMsg("");
    try {
      // Find group by invite code
      const list = await UserGroup.filter({ invite_code: finalCode.trim().toUpperCase() });
      if (list.length === 0) {
        setErrorMsg("Invalid invite code");
        return;
      }
      const groupToJoin = list[0];
      if (groupToJoin.members.includes(user.id)) {
        setErrorMsg("You are already in this group");
        return;
      }
      if (groupToJoin.pending_members?.includes(user.id)) {
        setErrorMsg("Your request is already pending approval");
        return;
      }

      if (groupToJoin.settings_approve_new) {
        await UserGroup.update(groupToJoin.id, {
          pending_members: [...(groupToJoin.pending_members || []), user.id]
        });
        alert("Request to join sent. Waiting for admin approval.");
        setIsJoining(false);
        setJoinCode("");
      } else {
        // Add user to members (Direct join)
        await UserGroup.update(groupToJoin.id, {
          members: [...groupToJoin.members, user.id],
          // If they were pending, remove them
          pending_members: (groupToJoin.pending_members || []).filter(id => id !== user.id)
        });
        setIsJoining(false);
        setJoinCode("");
        setIsScannerOpen(false);
        setActiveGroupId(groupToJoin.id);
      }
    } catch (err) {
      console.error("Join group error:", err);
      setErrorMsg("Failed to join group");
    }
  };

  const handleScan = (decodedText) => {
    if (decodedText && decodedText.length > 0) {
      const text = decodedText[0].rawValue;
      if (text.startsWith("BATTLEHUB_GROUP:")) {
        const code = text.replace("BATTLEHUB_GROUP:", "").trim();
        handleJoinGroup(code, true);
      } else {
        setErrorMsg("Invalid BattleHub Group QR Code");
        setIsScannerOpen(false);
      }
    }
  };

  const handleScanClick = async () => {
    try {
      const status = await Camera.checkPermissions();
      if (status.camera !== 'granted') {
        const reqStatus = await Camera.requestPermissions({ permissions: ['camera'] });
        if (reqStatus.camera !== 'granted') {
          alert('Camera permission is required to scan QR codes.');
          return;
        }
      }
    } catch (e) {
      console.log('Web environment or permission check failed, proceeding to scan...', e);
    }
    setIsScannerOpen(true);
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);
  
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (g.invite_code && g.invite_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (activeGroup) {
      return typeof document !== "undefined" ? createPortal(
      (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[510] bg-slate-950 flex flex-col shadow-2xl"
        >
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="text-gray-400 hover:text-white rounded-full bg-gray-900 hover:bg-gray-800 transition-colors">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </Button>
              <Avatar className="w-10 h-10 border border-gray-800 group-hover:border-[#00FFFF]/50 transition-colors">
                <AvatarImage src={activeGroup.dp} />
                <AvatarFallback>{activeGroup.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-white leading-tight group-hover:text-[#00FFFF] transition-colors">{activeGroup.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-gray-500">{activeGroup.members.length} members</p>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <p className="text-xs text-[#00e676]">{groupOnlineCount} online</p>
                </div>
              </div>
            </div>
            {!activeGroup.is_banned && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("openChatSearch", { detail: { chatId: activeGroup.id } })); }} className="text-gray-400 hover:text-white px-2">
                  <Search className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(true); }} className="text-gray-400 hover:text-white px-2">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex-1 relative min-h-0">
            <SharedChatInterface 
              roomType="group" 
              groupId={activeGroup.id} 
              hideHeader={true} 
              allowImageUpload={true}
            />
          </div>
          
          <GroupSettingsDrawer 
            group={activeGroup} 
            isOpen={isSettingsOpen} 
            onClose={() => navigate(-1)}
            onLeaveGroup={async () => {
              const newMembers = activeGroup.members.filter(m => m !== user.id);
              const newAdmins = (activeGroup.admins || []).filter(m => m !== user.id);
              await UserGroup.update(activeGroup.id, { members: newMembers, admins: newAdmins });
              setActiveGroupId(null);
              setIsSettingsOpen(false);
            }}
            onDeleteGroup={async () => {
              await UserGroup.delete(activeGroup.id);
              setActiveGroupId(null);
              setIsSettingsOpen(false);
            }}
          />
        </motion.div>
      ),
      document.body
    ) : null;
    }

    return (
      <div className="animate-in fade-in duration-500 min-h-[400px] w-full pt-4">

        {isCreating && typeof document !== "undefined" && createPortal(
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-16 z-[9999] bg-[#0A0C10] flex flex-col h-[calc(100dvh-4rem)] w-screen overflow-hidden"
          >
            <div className="flex-none p-4 border-b border-gray-800 flex items-center gap-4 bg-[#0A0C10]">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white rounded-full bg-slate-900/50 hover:bg-slate-800 mt-2">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </Button>
              <h2 className="text-lg font-bold text-white">Create New Group</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
                  <div className="flex flex-col items-center justify-center mb-8 relative pt-4">
                    <label className="relative group cursor-pointer w-full h-32 mb-12 block">
                      <div className="absolute inset-0 bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden flex items-center justify-center transition-colors group-hover:border-[#00FFFF]/50 shadow-inner">
                        {newGroupBanner ? (
                          <img src={newGroupBanner} className="w-full h-full object-cover opacity-70" />
                        ) : (
                          <div className="flex flex-col items-center text-gray-500">
                            <ImageIcon className="w-8 h-8 mb-2" />
                            <span className="text-xs uppercase tracking-wider font-semibold">Upload Banner</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {uploadingNewBanner ? <Loader2 className="w-8 h-8 animate-spin text-[#00FFFF]" /> : <Upload className="w-8 h-8 text-[#00FFFF]" />}
                        </div>
                      </div>
                      <div className="absolute -top-3 -right-2 bg-[#00FFFF] rounded-full p-2 text-black shadow-lg z-10 transition-transform group-hover:scale-110">
                        <Upload className="w-4 h-4" />
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleNewBannerUpload} disabled={uploadingNewBanner} />
                    </label>

                    <div className="absolute top-[5rem]">
                      <label className="relative group cursor-pointer block hover:scale-105 transition-transform">
                         <div className="w-24 h-24 rounded-full border-4 border-[#0A0C10] flex items-center justify-center bg-gray-900 shadow-xl overflow-hidden relative">
                           {newGroupDp ? <img src={newGroupDp} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-gray-500" />}
                         </div>
                         <div className="absolute -bottom-1 -right-1 bg-[#00FFFF] rounded-full p-2 text-black shadow-lg">
                           <Upload className="w-4 h-4" />
                         </div>
                         <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploadingAvatar} />
                      </label>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-4">Group Details</h3>
                    <p className="text-sm text-gray-500">Provide some basic info about your group</p>
                  </div>

                <div className="space-y-6 pb-6">
                  <div className="space-y-4 bg-[#111318] p-5 rounded-2xl border border-gray-800/50">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Group Name</label>
                      <Input 
                        value={newGroupName} 
                        onChange={e => setNewGroupName(e.target.value)} 
                        placeholder="e.g. Pro Snipers Squad" 
                        className="bg-[#0A0C10] border-gray-800 text-white focus-visible:ring-[#00FFFF]/50 h-12 rounded-xl placeholder:text-gray-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description (Optional)</label>
                      <textarea 
                        value={newGroupDesc}
                        onChange={e => setNewGroupDesc(e.target.value)}
                        placeholder="What is your group about?"
                        className="w-full bg-[#0A0C10] border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/50 h-24 resize-none placeholder:text-gray-600"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4 bg-[#111318] p-5 rounded-2xl border border-gray-800/50">
                    <h4 className="text-sm font-semibold text-white mb-2">Admin Settings</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-200">Edit Group Info</p>
                          <p className="text-xs text-gray-500">Who can change name and description</p>
                        </div>
                        <Select value={newGroupSettingsEditInfo} onValueChange={setNewGroupSettingsEditInfo}>
                          <SelectTrigger className="bg-[#0A0C10] border-gray-800 h-10 w-[140px] rounded-lg text-white">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="z-[500] bg-[#111318] border-gray-800 text-white">
                            <SelectItem value="all">All Members</SelectItem>
                            <SelectItem value="admins">Admins Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-200">Send Messages</p>
                          <p className="text-xs text-gray-500">Who can send messages</p>
                        </div>
                        <Select value={newGroupSettingsSendMessages} onValueChange={setNewGroupSettingsSendMessages}>
                          <SelectTrigger className="bg-[#0A0C10] border-gray-800 h-10 w-[140px] rounded-lg text-white">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="z-[500] bg-[#111318] border-gray-800 text-white">
                            <SelectItem value="all">All Members</SelectItem>
                            <SelectItem value="admins">Admins Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-b border-gray-800 pb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-200">Require Approval</p>
                          <p className="text-xs text-gray-500">New members must be approved</p>
                        </div>
                        <Switch 
                          checked={newGroupSettingsApproveNew} 
                          onCheckedChange={setNewGroupSettingsApproveNew} 
                          className="data-[state=checked]:bg-[#00FFFF] data-[state=unchecked]:bg-slate-700"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-200">Add Members</p>
                          <p className="text-xs text-gray-500">Who can add members</p>
                        </div>
                        <Select value={newGroupSettingsAddMembers} onValueChange={setNewGroupSettingsAddMembers}>
                          <SelectTrigger className="bg-[#0A0C10] border-gray-800 h-10 w-[140px] rounded-lg text-white">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="z-[500] bg-[#111318] border-gray-800 text-white">
                            <SelectItem value="all">All Members</SelectItem>
                            <SelectItem value="admins">Admins Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" /> {errorMsg}
                    </div>
                  )}
                  
                </div>
              </div>
            </div>

            {/* Footer Action Bar - Fixed at bottom of modal */}
            <div className="flex-none p-4 border-t border-gray-800 bg-[#0A0C10] flex justify-end gap-3 pb-24 sm:pb-8">
              <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl font-semibold text-gray-400 hover:text-white hover:bg-slate-800 px-6 h-12" disabled={isCreatingGroup}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={isCreatingGroup} className="rounded-xl bg-white text-black hover:bg-gray-200 font-bold px-8 h-12">
                {isCreatingGroup ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating...</>
                ) : (
                  "Create Group"
                )}
              </Button>
            </div>
          </motion.div>,
          document.body
        )}

      {isJoining && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsJoining(false)}>
          <div className="bg-slate-950 border border-gray-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">
              Join Group
            </h3>
            <div className="space-y-4 mb-4">
              <div className="relative flex items-center">
                <Input 
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="Enter Invite Code"
                  className="bg-[#0A0C10] border-gray-800 text-white uppercase pr-12 w-full"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleScanClick} 
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[#00FFFF] hover:text-[#00FFFF] hover:bg-[#00FFFF]/10 rounded-md w-9 h-9 transition-all duration-200 hover:scale-105 active:scale-95 group flex items-center justify-center"
                  title="Scan QR Code"
                >
                  <AnimatedScanIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
            {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => setIsJoining(false)}>Cancel</Button>
              <Button size="sm" onClick={() => handleJoinGroup(joinCode, false)} className="bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80">Join</Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isScannerOpen} onOpenChange={(val) => !val && navigate(-1)}>
        <DialogContent className="bg-slate-950 border-none p-0 max-w-none w-screen h-screen m-0 overflow-hidden rounded-none flex flex-col z-[100000] pt-safe">
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center gap-4 bg-slate-950 relative z-10">
            <button 
              onClick={() => setIsScannerOpen(false)}
              className="p-2 bg-slate-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black tracking-widest text-white uppercase m-0">Scan QR Code</h2>
          </div>
          
          <div className="flex-1 relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
            <div className="w-[280px] h-[280px] rounded-3xl overflow-hidden relative shadow-[0_0_50px_rgba(0,255,255,0.15)] ring-4 ring-[#00FFFF]/30 ring-offset-4 ring-offset-[#0a0a0c]">
              <CustomScanner onScan={handleScan} onError={(err) => console.log(err)} />
              
              {/* Custom Corner Accents */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#00FFFF] rounded-tl-3xl" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#00FFFF] rounded-tr-3xl" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#00FFFF] rounded-bl-3xl" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#00FFFF] rounded-br-3xl" />
                {/* Scan line */}
                <div className="absolute left-4 right-4 h-0.5 bg-[#00FFFF] shadow-[0_0_15px_#00FFFF] animate-scan-line" />
              </div>
            </div>
            
            <div className="mt-12 text-center px-6">
              <p className="text-white font-bold tracking-wider mb-2">SCAN TO JOIN GROUP</p>
              <p className="text-gray-500 text-sm max-w-[250px] mx-auto">
                Align the group's QR code within the frame above.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-black border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 border border-gray-800 rounded-full bg-gray-900 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-900 rounded animate-pulse"></div>
                  <div className="h-3 w-20 bg-gray-900 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="h-3 w-16 bg-gray-900 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 px-4 bg-gray-900/30 rounded-xl border border-gray-800/50 border-dashed">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-300 mb-2">No Groups Yet</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">Create your own private group or join an existing one using an invite code.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button onClick={() => setIsCreating(true)} className="bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold">
              Create Your First Group
            </Button>
            <Button onClick={() => setIsJoining(true)} variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 font-bold">
              Join a Group
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full max-w-4xl mx-auto">
          {groups.map(group => (
            <div 
              key={group.id}
              onClick={() => setActiveGroupId(group.id)}
              className="bg-slate-900/40 border border-slate-800 hover:bg-slate-900/80 hover:border-slate-700 rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-14 h-14 border border-slate-700 group-hover:border-[#00FFFF]/50 transition-colors shadow-lg">
                    <AvatarImage src={group.dp} />
                    <AvatarFallback className="bg-slate-800 text-[#00FFFF] font-black">{group.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {unreadCounts[group.id] && (
                    <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-white text-base md:text-lg tracking-wide group-hover:text-[#00FFFF] transition-colors">{group.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-gray-400 font-medium">{group.members.length} member{group.members.length !== 1 && 's'}</p>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="bg-slate-800 text-gray-300 group-hover:text-white transition-colors group-hover:bg-slate-700 rounded-full h-10 w-10">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
