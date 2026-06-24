import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Bell, Search, Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function NotificationManager() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  
  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [title, setTitle] = useState("BATTLEHUB APP");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    User.list().then(setUsers);
  }, []);

  const filteredUsers = users.filter(u => 
    (u.ign || u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSendPush = async () => {
    if (!selectedUser || !selectedUser.fcm_token) return;
    if (!title || !body) {
      toast({ title: "Error", description: "Title and Body are required.", variant: "destructive" });
      return;
    }
    
    setIsSending(true);
    try {
      const res = await fetch('/api/sendPush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: selectedUser.fcm_token,
          title: title,
          body: body
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: "Sent!", description: "Push notification has been sent successfully." });
        setSelectedUser(null);
        setBody("");
      } else {
        toast({ title: "Failed", description: data.error || "Could not send notification.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error occurred.", variant: "destructive" });
    }
    setIsSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2 text-emerald-400">
          <Bell className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">Push Notifications</h2>
        </div>
        
        <div className="bg-black/30 border border-emerald-500/20 rounded-xl p-4 mb-6">
          <p className="text-gray-300 text-sm">
            Search for a user below and click <strong>Send Push</strong> to instantly send them a notification on their device.
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search by name, IGN or email..." 
            className="pl-10 bg-black/40 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {filteredUsers.map(u => (
            <div key={u.id} className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={u.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed="+u.id} className="w-10 h-10 rounded-full bg-white/10" alt="avatar" />
                <div>
                  <div className="text-white font-medium">{u.ign || u.full_name || "Unnamed Player"}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
              </div>
              <div>
                {u.fcm_token ? (
                  <Button 
                    onClick={() => setSelectedUser(u)} 
                    variant="outline" 
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-8 text-xs font-medium"
                  >
                    <Send className="w-3.5 h-3.5 mr-2" />
                    Send Push
                  </Button>
                ) : (
                  <span className="text-xs text-gray-500 italic bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">No Token yet</span>
                )}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="text-center text-gray-500 py-8 text-sm">No users found.</div>
          )}
        </div>
      </div>

      {/* Modal for sending push */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-white mb-4">Send to {selectedUser.ign || selectedUser.full_name}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Title</label>
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Message Body</label>
                <textarea 
                  value={body} 
                  onChange={e => setBody(e.target.value)} 
                  className="w-full bg-black/40 border-white/10 border rounded-md text-white p-3 text-sm min-h-[100px] outline-none focus:border-emerald-500/50"
                  placeholder="Enter your message here..."
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">Cancel</Button>
              <Button 
                onClick={handleSendPush} 
                disabled={isSending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
