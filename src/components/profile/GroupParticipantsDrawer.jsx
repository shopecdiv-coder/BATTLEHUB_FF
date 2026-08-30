import React, { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, ArrowLeft, Loader2, X, MoreVertical, Crown, UserMinus, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { UserGroup, User, Notification } from "@/api/entities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";


export default function GroupParticipantsDrawer({ group, isOpen, onClose }) {
  const { user: currentUser } = useAuth();
  const isAdmin = group?.admins?.includes(currentUser?.id);
  
  const [membersData, setMembersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);


  useEffect(() => {
    async function loadMembers() {
      if (!group || !isOpen) return;
      setLoading(true);
      try {
        const promises = group.members.map(async (memberId) => {
           const uList = await User.filter({ id: memberId });
           return uList.length > 0 ? uList[0] : { id: memberId, username: memberId };
        });
        const users = await Promise.all(promises);
        setMembersData(users);
      } catch (err) {
        console.error("Failed to load members", err);
      }
      setLoading(false);
    }
    loadMembers();
  }, [group, isOpen]);

  const handleRemoveMember = async (member) => {
    if(window.confirm(`Remove ${member.ign || member.username || member.name || "User"} from the group?`)) {
      const newMembers = group.members.filter(m => m !== member.id);
      const newAdmins = (group.admins || []).filter(m => m !== member.id);
      await UserGroup.update(group.id, { members: newMembers, admins: newAdmins });
      
      try {
        await Notification.create({
          recipient_id: member.id,
          type: 'system',
          title: 'Removed from Group',
          message: `You were removed from the group ${group.name} by an admin.`,
          read: false,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to send notification:", err);
      }
      
      const displayName = member.ign || member.username || member.name || "User";
      alert(`${displayName} has been successfully removed from the group.`);
      
      setMembersData(prev => prev.filter(m => m.id !== member.id));
    }
  };

  const handleToggleAdmin = async (member, isCurrentlyAdmin) => {
    let newAdmins = [...(group.admins || [])];
    
    if (isCurrentlyAdmin) {
      if (member.id === group.admin_id) {
         alert("Cannot remove the creator of the group as admin.");
         return;
      }
      if(window.confirm(`Remove admin privileges for ${member.ign || member.username || member.name || "User"}?`)) {
        newAdmins = newAdmins.filter(m => m !== member.id);
        await UserGroup.update(group.id, { admins: newAdmins });
        alert("Admin privileges removed.");
      }
    } else {
      if (newAdmins.length >= 5) {
        alert("Maximum of 5 admins allowed per group.");
        return;
      }
      if(window.confirm(`Make ${member.ign || member.username || member.name || "User"} an admin?`)) {
        newAdmins.push(member.id);
        await UserGroup.update(group.id, { admins: newAdmins });
        alert("User is now an admin.");
      }
    }
  };

  const handleBlockUser = async (member) => {
    const isBlocked = currentUser?.blocked_users?.includes(member.id);
    if (isBlocked) {
      if (window.confirm(`Are you sure you want to unblock ${member.ign || member.username || member.name || "User"}?`)) {
        const newBlockedList = (currentUser?.blocked_users || []).filter(id => id !== member.id);
        await User.update(currentUser.id, { blocked_users: newBlockedList });
        if (currentUser) currentUser.blocked_users = newBlockedList;
        setMembersData(prev => [...prev]); // trigger re-render
        alert("User has been unblocked.");
      }
    } else {
      if (window.confirm(`Are you sure you want to block ${member.ign || member.username || member.name || "User"}?`)) {
        const blockedList = currentUser?.blocked_users || [];
        await User.update(currentUser.id, { blocked_users: [...blockedList, member.id] });
        if (currentUser) currentUser.blocked_users = [...blockedList, member.id];
        setMembersData(prev => [...prev]); // trigger re-render
        alert("User has been blocked. They will no longer be able to message you.");
      }
    }
  };

  if (!group) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 bg-slate-950 border-gray-800 text-white z-[530] overflow-y-auto pb-24"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="sticky top-0 z-10 bg-slate-950 border-b border-gray-800 px-4 py-4 flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 bg-gray-900 rounded-full text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-white">Participants</h2>
            <p className="text-xs text-slate-400">{group.members.length} member{group.members.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
              <Loader2 className="w-8 h-8 text-[#00FFFF] animate-spin mb-4" />
              <p className="text-sm">Loading participants...</p>
            </div>
          ) : (
            membersData.map((member) => {
              const isMemberAdmin = group.admins?.includes(member.id);
              const isMe = member.id === currentUser?.id;
              const isUserBlocked = currentUser?.blocked_users?.includes(member.id);

              return (
                <div key={member.id} className={`group flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 border ${isMe ? "bg-[#00FFFF]/5 border-[#00FFFF]/20 shadow-[0_0_15px_rgba(0,255,255,0.05)]" : "bg-slate-900/40 border-slate-800/50 hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-lg"} ${isUserBlocked ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar 
                        className={`w-12 h-12 border-2 ${isMemberAdmin ? "border-emerald-500" : isMe ? "border-[#00FFFF]" : "border-slate-700"} shadow-lg transition-transform duration-300 group-hover:scale-105 cursor-pointer`}
                        onClick={() => {
                          const dp = member.avatar_url || member.dp || member.avatar || member.photoURL;
                          if (dp) setSelectedImage(dp);
                        }}
                      >
                        <AvatarImage src={member.avatar_url || member.dp || member.avatar || member.photoURL} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-slate-300 font-bold text-lg">
                          {member.username ? member.username.substring(0, 2).toUpperCase() : (member.name ? member.name.substring(0, 2).toUpperCase() : member.id.substring(0, 2).toUpperCase())}
                        </AvatarFallback>
                      </Avatar>
                      {isMemberAdmin && (
                        <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                          <div className="bg-emerald-500 rounded-full p-1 text-slate-950">
                            <Shield className="w-2.5 h-2.5 fill-current" />
                          </div>
                        </div>
                      )}
                      {member.activity_status === 'Online' && (
                        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#00e676] border-2 border-slate-900 rounded-full" />
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-black text-[15px] leading-none ${isMe ? "text-[#00FFFF]" : isUserBlocked ? "text-gray-500 line-through" : "text-white"}`}>
                          {member.ign || member.username || member.name || member.id}
                        </h4>
                        {isMe && (
                          <span className="bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/20 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider leading-none">
                            You
                          </span>
                        )}
                        {isUserBlocked && (
                          <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Blocked</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {!isMe && member.name && member.username && (
                          <span className="text-xs font-medium text-slate-400">{member.name}</span>
                        )}
                        {isMemberAdmin && (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider leading-none">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!isMe && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="w-8 h-8 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 z-[600]">
                        {isAdmin && (
                          <>
                            <DropdownMenuItem 
                              className="text-white hover:bg-slate-800 focus:bg-slate-800 cursor-pointer"
                              onClick={() => handleToggleAdmin(member, isMemberAdmin)}
                            >
                              <Crown className="w-4 h-4 mr-2" />
                              {isMemberAdmin ? "Remove Admin" : "Make Admin"}
                            </DropdownMenuItem>
                            {(!isMemberAdmin || group.admin_id === currentUser.id) && (
                              <DropdownMenuItem 
                                className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer"
                                onClick={() => handleRemoveMember(member)}
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Kick from Group
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        <DropdownMenuItem 
                          className="text-orange-400 hover:bg-orange-500/10 focus:bg-orange-500/10 cursor-pointer"
                          onClick={() => handleBlockUser(member)}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          {isUserBlocked ? "Unblock User" : "Block User"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="sm:max-w-md p-0 bg-transparent border-none shadow-none flex justify-center items-center">
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Profile" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
