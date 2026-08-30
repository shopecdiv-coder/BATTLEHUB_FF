import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserGroup } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, UserPlus, Hash, Settings, Search, Trash2, ArrowRight, Shield, Gamepad2, Lock, Globe, Tag, Image as ImageIcon, FileText } from "lucide-react";
import { db } from "@/api/firebaseClient";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import SharedChatInterface from "@/components/chat/SharedChatInterface";
import GroupSettingsDrawer from "./GroupSettingsDrawer";

export default function UserGroupsPanel() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTag, setNewGroupTag] = useState("");
  const [newGroupDp, setNewGroupDp] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupPrivacy, setNewGroupPrivacy] = useState("Public");
  const [newGroupPlaystyle, setNewGroupPlaystyle] = useState("Casual");
  
  // WhatsApp-like Group Settings
  const [newGroupSettingsEditInfo, setNewGroupSettingsEditInfo] = useState("all");
  const [newGroupSettingsSendMessages, setNewGroupSettingsSendMessages] = useState("all");
  const [newGroupSettingsApproveNew, setNewGroupSettingsApproveNew] = useState(false);
  
  const [joinCode, setJoinCode] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

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

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setErrorMsg("Group name is required");
      return;
    }
    setErrorMsg("");
    const newGroup = {
      name: newGroupName,
      tag: newGroupTag.trim().toUpperCase().substring(0, 4) || "",
      description: newGroupDesc,
      privacy: newGroupPrivacy,
      playstyle: newGroupPlaystyle,
      dp: newGroupDp || "https://api.dicebear.com/7.x/shapes/svg?seed=" + newGroupName,
      invite_code: generateInviteCode(),
      admin_id: user.id,
      admins: [user.id],
      settings_edit_info: newGroupSettingsEditInfo,
      settings_send_messages: newGroupSettingsSendMessages,
      settings_approve_new: newGroupSettingsApproveNew,
      members: [user.id],
      created_at: new Date().toISOString()
    };

    try {
      const created = await UserGroup.create(newGroup);
      setIsCreating(false);
      setNewGroupName("");
      setNewGroupTag("");
      setNewGroupDp("");
      setNewGroupDesc("");
      setNewGroupPrivacy("Public");
      setNewGroupPlaystyle("Casual");
      setNewGroupSettingsEditInfo("all");
      setNewGroupSettingsSendMessages("all");
      setNewGroupSettingsApproveNew(false);
      setActiveGroupId(created.id);
    } catch (err) {
      console.error("Create group error:", err);
      setErrorMsg("Failed to create group");
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      setErrorMsg("Invite code is required");
      return;
    }
    setErrorMsg("");
    try {
      // Find group by invite code
      const list = await UserGroup.filter({ invite_code: joinCode.trim().toUpperCase() });
      if (list.length === 0) {
        setErrorMsg("Invalid invite code");
        return;
      }
      const groupToJoin = list[0];
      if (groupToJoin.members.includes(user.id)) {
        setErrorMsg("You are already in this group");
        return;
      }
      // Add user to members
      await UserGroup.update(groupToJoin.id, {
        members: [...groupToJoin.members, user.id]
      });
      setIsJoining(false);
      setJoinCode("");
      setActiveGroupId(groupToJoin.id);
    } catch (err) {
      console.error("Join group error:", err);
      setErrorMsg("Failed to join group");
    }
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);

  if (activeGroup) {
      return (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[300] bg-slate-950 flex flex-col shadow-2xl"
        >
          {/* Custom Header for Group Chat */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(true); }}>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setActiveGroupId(null); }} className="text-gray-400 hover:text-white rounded-full bg-gray-900 hover:bg-gray-800 transition-colors">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </Button>
              <Avatar className="w-10 h-10 border border-gray-800 group-hover:border-[#00FFFF]/50 transition-colors">
                <AvatarImage src={activeGroup.dp} />
                <AvatarFallback>{activeGroup.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-white leading-tight group-hover:text-[#00FFFF] transition-colors">{activeGroup.name}</h3>
                <p className="text-xs text-gray-500">{activeGroup.members.length} members</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(true); }} className="text-gray-400 hover:text-white px-2">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 relative">
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
            onClose={() => setIsSettingsOpen(false)}
            onLeaveGroup={async () => {
              try {
                const newMembers = activeGroup.members.filter(m => m !== user.id);
                await UserGroup.update(activeGroup.id, { members: newMembers });
                setActiveGroupId(null);
                setIsSettingsOpen(false);
              } catch(e) {
                console.error("Leave group error", e);
              }
            }}
          />
        </motion.div>
      );
    }

    return (
      <div className="bg-slate-950 border border-gray-800 rounded-xl p-4 md:p-6 mt-4 animate-in fade-in duration-500 min-h-[400px]">
        {isCreating && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[300] bg-slate-950 flex flex-col overflow-y-auto"
          >
            {/* Header for Create Group */}
            <div className="sticky top-0 z-10 p-4 border-b border-gray-800 flex items-center gap-3 bg-slate-950">
              <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-white rounded-full bg-gray-900 hover:bg-gray-800 transition-colors">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </Button>
              <h2 className="text-lg font-black uppercase tracking-wider text-white">Create Group</h2>
            </div>
            
            <div className="p-4 md:p-6 max-w-4xl mx-auto w-full pb-20">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FFFF] to-blue-600 flex items-center justify-center shadow-lg shadow-[#00FFFF]/20">
                  <Users className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-wider">New Group</h3>
                  <p className="text-xs text-gray-400 font-medium">Assemble your squad for battle</p>
                </div>
              </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              {/* Group Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#00FFFF]" /> Group Name *
                </label>
                <Input 
                  value={newGroupName} 
                  onChange={e => setNewGroupName(e.target.value)} 
                  placeholder="e.g. Pro Snipers Squad" 
                  className="bg-slate-950/50 border-slate-800 text-white focus-visible:ring-[#00FFFF]/50 h-11 rounded-xl"
                />
              </div>

              {/* Group Tag */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-400" /> Group Tag
                </label>
                <Input 
                  value={newGroupTag} 
                  onChange={e => setNewGroupTag(e.target.value)} 
                  placeholder="e.g. SNIP" 
                  maxLength={4}
                  className="bg-slate-950/50 border-slate-800 text-white font-mono uppercase focus-visible:ring-purple-500/50 h-11 rounded-xl"
                />
              </div>

              {/* Group DP */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-pink-400" /> Avatar URL
                </label>
                <Input 
                  value={newGroupDp} 
                  onChange={e => setNewGroupDp(e.target.value)} 
                  placeholder="https://..." 
                  className="bg-slate-950/50 border-slate-800 text-white focus-visible:ring-pink-500/50 h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-5">
              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-yellow-400" /> Description
                </label>
                <textarea 
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="What is your group about?"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Privacy */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-red-400" /> Privacy
                  </label>
                  <select 
                    value={newGroupPrivacy}
                    onChange={e => setNewGroupPrivacy(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 appearance-none font-medium"
                  >
                    <option value="Public">ðŸŒ Public</option>
                    <option value="Invite Only">âœ‰ï¸ Invite Only</option>
                    <option value="Private">ðŸ”’ Private</option>
                  </select>
                </div>

                {/* Playstyle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Gamepad2 className="w-3 h-3 text-green-400" /> Playstyle
                  </label>
                  <select 
                    value={newGroupPlaystyle}
                    onChange={e => setNewGroupPlaystyle(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none font-medium"
                  >
                    <option value="Casual">Casual / Fun</option>
                    <option value="Rank Push">Rank Push</option>
                    <option value="Competitive">Competitive</option>
                  </select>
                </div>
              </div>

                {/* Group Permissions Section */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#00FFFF]" /> Group Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-200">Edit Group Info</p>
                        <p className="text-xs text-gray-500">Who can change name, icon, description</p>
                      </div>
                      <select
                        value={newGroupSettingsEditInfo}
                        onChange={e => setNewGroupSettingsEditInfo(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg text-xs text-white p-1.5 focus:outline-none"
                      >
                        <option value="all">All Members</option>
                        <option value="admins">Admins Only</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-200">Send Messages</p>
                        <p className="text-xs text-gray-500">Who can send messages to this group</p>
                      </div>
                      <select
                        value={newGroupSettingsSendMessages}
                        onChange={e => setNewGroupSettingsSendMessages(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg text-xs text-white p-1.5 focus:outline-none"
                      >
                        <option value="all">All Members</option>
                        <option value="admins">Admins Only</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-200">Require Admin Approval</p>
                        <p className="text-xs text-gray-500">New members must be approved</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newGroupSettingsApproveNew}
                          onChange={(e) => setNewGroupSettingsApproveNew(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00FFFF]"></div>
                      </label>
                    </div>
                  </div>
                </div>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" /> {errorMsg}
            </div>
          )}

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-800/50">
              <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl font-bold text-gray-400 hover:text-white hover:bg-slate-800 px-6">
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} className="rounded-xl bg-gradient-to-r from-[#00FFFF] to-blue-500 text-slate-950 hover:opacity-90 font-black tracking-wider px-8 shadow-lg shadow-[#00FFFF]/20">
                CREATE NOW
              </Button>
            </div>
            </div>
          </motion.div>
        )}

      {isJoining && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-6 animate-in slide-in-from-top-2">
          <h3 className="font-semibold text-white mb-3">Join a Group</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Invite Code *</label>
              <Input 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value)} 
                placeholder="e.g. A1B2C3" 
                className="bg-black border-gray-800 text-white font-mono uppercase"
                maxLength={6}
              />
            </div>
            {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsJoining(false)}>Cancel</Button>
              <Button size="sm" onClick={handleJoinGroup} className="bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80">Join</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#00FFFF] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 px-4 bg-gray-900/30 rounded-xl border border-gray-800/50 border-dashed">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-300 mb-2">No Groups Yet</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">Create your own private group or join an existing one using an invite code.</p>
          <Button onClick={() => setIsCreating(true)} className="bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold">
            Create Your First Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map(group => (
            <div 
              key={group.id}
              onClick={() => setActiveGroupId(group.id)}
              className="bg-black border border-gray-800 hover:border-[#00FFFF]/50 rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-1 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-12 h-12 border border-gray-800 group-hover:border-[#00FFFF]/30 transition-colors">
                  <AvatarImage src={group.dp} />
                  <AvatarFallback>{group.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-bold text-white text-sm line-clamp-1">{group.name}</h4>
                  <p className="text-xs text-gray-500">{group.members.length} member{group.members.length !== 1 && 's'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Hash className="w-3 h-3" />
                  <span className="font-mono">{group.invite_code}</span>
                </div>
                <div className="text-[#00FFFF] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Open Chat <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
