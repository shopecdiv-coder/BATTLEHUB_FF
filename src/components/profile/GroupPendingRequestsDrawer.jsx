import React, { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, ArrowLeft, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { UserGroup, User } from "@/api/entities";

export default function GroupPendingRequestsDrawer({ group, isOpen, onClose }) {
  const { user: currentUser } = useAuth();
  const isAdmin = group?.admins?.includes(currentUser?.id) || group?.admin_id === currentUser?.id;
  
  const [pendingData, setPendingData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPending() {
      if (!group || !isOpen) return;
      setLoading(true);
      try {
        const promises = (group.pending_members || []).map(async (memberId) => {
           const uList = await User.filter({ id: memberId });
           return uList.length > 0 ? uList[0] : { id: memberId, username: memberId };
        });
        const users = await Promise.all(promises);
        setPendingData(users);
      } catch (err) {
        console.error("Failed to load pending requests", err);
      }
      setLoading(false);
    }
    loadPending();
  }, [group, isOpen]);

  const handleApprovePending = async (memberId) => {
    try {
      const newPending = (group.pending_members || []).filter(m => m !== memberId);
      const newMembers = [...(group.members || []), memberId];
      await UserGroup.update(group.id, { pending_members: newPending, members: newMembers });
      setPendingData(prev => prev.filter(m => m.id !== memberId));
    } catch(e) {
      console.error(e);
    }
  };
  
  const handleRejectPending = async (memberId) => {
    try {
      const newPending = (group.pending_members || []).filter(m => m !== memberId);
      await UserGroup.update(group.id, { pending_members: newPending });
      setPendingData(prev => prev.filter(m => m.id !== memberId));
    } catch(e) {
      console.error(e);
    }
  };

  if (!group) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-slate-950 border-gray-800 text-white z-[530] overflow-y-auto pb-24">
        <div className="sticky top-0 z-10 bg-slate-950 border-b border-gray-800 px-4 py-4 flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 bg-gray-900 rounded-full text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-yellow-500">Join Requests</h2>
            <p className="text-xs text-slate-400">{(group.pending_members || []).length} request{((group.pending_members || []).length !== 1) ? "s" : ""}</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
              <p className="text-sm">Loading requests...</p>
            </div>
          ) : pendingData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
              <p className="text-sm">No pending requests.</p>
            </div>
          ) : (
            pendingData.map((member) => {
              const displayName = member.ign || member.username || member.name || member.id;
              return (
                <div key={member.id} className="group flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 border bg-slate-900/40 border-slate-800/50 hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-12 h-12 border-2 border-slate-700 shadow-lg transition-transform duration-300 group-hover:scale-105">
                        <AvatarImage src={member.avatar_url || member.dp || member.avatar || member.photoURL} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-slate-300 font-bold text-lg">
                          {displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-[15px] leading-none text-white">
                          {displayName}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-medium text-slate-400 line-clamp-1">Wants to join</span>
                      </div>
                    </div>
                  </div>
                  
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="w-9 h-9 rounded-full text-green-400 hover:bg-green-400/20 bg-green-400/10 transition-colors" title="Approve" onClick={() => handleApprovePending(member.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-9 h-9 rounded-full text-red-400 hover:bg-red-400/20 bg-red-400/10 transition-colors" title="Reject" onClick={() => handleRejectPending(member.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-500 font-bold bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                      Pending
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
