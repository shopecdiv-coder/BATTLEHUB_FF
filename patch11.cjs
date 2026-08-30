const fs = require("fs");
const path = "src/components/profile/GroupSettingsDrawer.jsx";

const fileContent = `import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Shield, Users, LogOut, Settings, UserPlus, X, Save, ArrowRight } from "lucide-react";
import { UserGroup, User } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";

export default function GroupSettingsDrawer({ group, isOpen, onClose, onGroupUpdated, onLeaveGroup }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editEditInfo, setEditEditInfo] = useState("all");
  const [editSendMessages, setEditSendMessages] = useState("all");
  const [editApproveNew, setEditApproveNew] = useState(false);

  useEffect(() => {
    if (group && user) {
      const adminList = group.admins || [group.admin_id];
      setIsAdmin(adminList.includes(user.id));
      setEditName(group.name);
      setEditDesc(group.description || "");
      setEditEditInfo(group.settings_edit_info || "all");
      setEditSendMessages(group.settings_send_messages || "all");
      setEditApproveNew(group.settings_approve_new || false);
      
      const loadMembers = async () => {
        try {
          const loaded = [];
          for (const uid of group.members) {
            const u = await User.read(uid);
            if (u) loaded.push(u);
          }
          setMembers(loaded);
        } catch (e) {
          console.error(e);
        }
      };
      loadMembers();
    }
  }, [group, user]);

  const handleSaveSettings = async () => {
    try {
      await UserGroup.update(group.id, {
        name: editName,
        description: editDesc,
        settings_edit_info: editEditInfo,
        settings_send_messages: editSendMessages,
        settings_approve_new: editApproveNew
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

  if (!group) return null;

  const adminList = group.admins || [group.admin_id];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-slate-950 border-slate-800 p-0 overflow-y-auto z-[400]">
        <SheetHeader className="p-4 border-b border-slate-800 sticky top-0 bg-slate-950 z-10 flex flex-row items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white rounded-full bg-slate-900/50 hover:bg-slate-800 mt-2">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Button>
            <SheetTitle className="text-white text-xl flex-1 text-center pr-10">Group Info</SheetTitle>
          </SheetHeader>
        
        <div className="p-6 space-y-8 pb-20">
          {/* Group Header Info */}
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="w-32 h-32 border-4 border-slate-800">
              <AvatarImage src={group.dp} />
              <AvatarFallback className="text-4xl font-bold bg-slate-900">{group.name.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-white">{group.name}</h2>
              <p className="text-slate-400">Group · {group.members.length} participants</p>
            </div>
            {group.description && <p className="text-sm text-slate-300 px-4">{group.description}</p>}
          </div>

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
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Edit Group Info</span><span className="text-white capitalize">{group.settings_edit_info || "all"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Send Messages</span><span className="text-white capitalize">{group.settings_send_messages || "all"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Require Approval</span><span className="text-white">{group.settings_approve_new ? "Yes" : "No"}</span></div>
                </div>
              )}
            </div>
          )}

          {/* Participants */}
          <div className="space-y-4 bg-slate-900 rounded-xl p-4 border border-slate-800">
            <h3 className="text-sm font-bold text-[#00FFFF] uppercase tracking-wider flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" /> Participants ({group.members.length})
            </h3>
            
            {isAdmin && (
              <div className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg cursor-pointer mb-2 transition-colors border border-dashed border-slate-700 hover:border-[#00FFFF]/30">
                <div className="w-10 h-10 rounded-full bg-[#00FFFF]/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#00FFFF]" />
                </div>
                <span className="text-[#00FFFF] font-medium">Add Participants</span>
              </div>
            )}

            <div className="space-y-1">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded-lg group transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-slate-700 bg-slate-800">
                      <AvatarImage src={member.avatar || member.dp} />
                      <AvatarFallback className="font-bold">{(member.name || member.username || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">
                        {member.id === user.id ? "You" : member.username || member.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{member.status || "Available"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {adminList.includes(member.id) && (
                      <span className="text-[10px] uppercase font-bold text-[#00FFFF] border border-[#00FFFF]/30 px-2 py-0.5 rounded bg-[#00FFFF]/5">Admin</span>
                    )}
                    
                    {isAdmin && member.id !== user.id && (
                      <div className="hidden group-hover:flex gap-1">
                        {!adminList.includes(member.id) && (
                          <Button size="icon" variant="ghost" className="w-7 h-7 text-green-400 hover:bg-green-400/20" title="Make Admin" onClick={() => handleMakeAdmin(member.id)}>
                            <Shield className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-red-400 hover:bg-red-400/20" title="Remove" onClick={() => handleRemoveMember(member.id)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exit Group */}
          <Button 
            variant="ghost" 
            className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-400 justify-start h-12 rounded-xl border border-red-500/20 mt-6"
            onClick={onLeaveGroup}
          >
            <LogOut className="w-5 h-5 mr-3" /> Exit Group
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
`;

fs.writeFileSync(path, fileContent, "utf8");
console.log("Written successfully!");
