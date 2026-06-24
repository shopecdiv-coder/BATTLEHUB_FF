import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Bell, Search, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function NotificationManager() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    User.list().then(setUsers);
  }, []);

  const filteredUsers = users.filter(u => 
    (u.ign || u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const copyToken = (token) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    toast({
      title: "Token Copied",
      description: "Paste this in Firebase Console to send a notification."
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2 text-emerald-400">
          <Bell className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">Push Notifications</h2>
        </div>
        
        <div className="bg-black/30 border border-emerald-500/20 rounded-xl p-4 mb-6">
          <p className="text-gray-300 text-sm mb-3">
            To send a personal push notification directly to a user's phone:
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-sm text-gray-400">
            <li>Find the user below and click <strong>Copy Token</strong>.</li>
            <li>Open <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center">Firebase Console <ExternalLink className="w-3 h-3 ml-1" /></a>.</li>
            <li>Go to <strong>Engage &gt; Messaging &gt; New Campaign &gt; Notifications</strong>.</li>
            <li>Write your message, then click <strong>Send test message</strong> and paste the token!</li>
          </ol>
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
                    onClick={() => copyToken(u.fcm_token)} 
                    variant="outline" 
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-8 text-xs font-medium"
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    Copy Token
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
    </div>
  );
}
