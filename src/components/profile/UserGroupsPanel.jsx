import React, { useState, useEffect } from "react";
import { UserGroup } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, UserPlus, Hash, Settings, Search, Trash2, ArrowRight } from "lucide-react";
import { db } from "@/api/firebaseClient";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import SharedChatInterface from "@/components/chat/SharedChatInterface";

export default function UserGroupsPanel() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDp, setNewGroupDp] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

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
      dp: newGroupDp || "https://api.dicebear.com/7.x/shapes/svg?seed=" + newGroupName,
      invite_code: generateInviteCode(),
      admin_id: user.id,
      members: [user.id],
      created_at: new Date().toISOString()
    };

    try {
      const created = await UserGroup.create(newGroup);
      setIsCreating(false);
      setNewGroupName("");
      setNewGroupDp("");
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
      <div className="bg-[#0a0a0c] border border-gray-800 rounded-xl mt-4 animate-in fade-in duration-500 overflow-hidden flex flex-col" style={{ height: "600px" }}>
        {/* Custom Header for Group Chat */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setActiveGroupId(null)} className="text-gray-400 hover:text-white px-2">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Button>
            <Avatar className="w-10 h-10 border border-gray-800">
              <AvatarImage src={activeGroup.dp} />
              <AvatarFallback>{activeGroup.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-white leading-tight">{activeGroup.name}</h3>
              <p className="text-xs text-gray-500">{activeGroup.members.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-gray-800 rounded-md flex items-center gap-2 border border-gray-700">
              <span className="text-xs text-gray-400">Invite Code:</span>
              <span className="font-mono text-[#00FFFF] font-bold text-sm tracking-wider select-all">{activeGroup.invite_code}</span>
            </div>
            {activeGroup.admin_id === user?.id && (
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white px-2">
                <Settings className="w-5 h-5" />
              </Button>
            )}
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
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0c] border border-gray-800 rounded-xl p-4 md:p-6 mt-4 animate-in fade-in duration-500 min-h-[400px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00FFFF]" />
            Your Groups
          </h2>
          <p className="text-sm text-gray-400 mt-1">Create or join private chat groups with friends.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            onClick={() => { setIsJoining(true); setIsCreating(false); setErrorMsg(""); }} 
            variant="outline" 
            className="flex-1 md:flex-none border-[#00FFFF]/20 text-[#00FFFF] hover:bg-[#00FFFF]/10"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Join
          </Button>
          <Button 
            onClick={() => { setIsCreating(true); setIsJoining(false); setErrorMsg(""); }}
            className="flex-1 md:flex-none bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-6 animate-in slide-in-from-top-2">
          <h3 className="font-semibold text-white mb-3">Create New Group</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Group Name *</label>
              <Input 
                value={newGroupName} 
                onChange={e => setNewGroupName(e.target.value)} 
                placeholder="e.g. Pro Snipers Squad" 
                className="bg-black border-gray-800 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Group DP URL (Optional)</label>
              <Input 
                value={newGroupDp} 
                onChange={e => setNewGroupDp(e.target.value)} 
                placeholder="https://example.com/image.png" 
                className="bg-black border-gray-800 text-white"
              />
            </div>
            {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateGroup} className="bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80">Create</Button>
            </div>
          </div>
        </div>
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
