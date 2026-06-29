import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Friendship, User } from '@/api/entities';
import { UserPlus, Check, X, ChevronLeft, Search, QrCode, ScanLine } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { toast } from 'sonner';

export default function AddFriendDrawer({ children, user }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  const [requestsReceived, setRequestsReceived] = useState([]);
  const [requestsSent, setRequestsSent] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [allUsersCache, setAllUsersCache] = useState([]);
  const [allRelationsCache, setAllRelationsCache] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sent, received] = await Promise.all([
        Friendship.filter({ user_id: user.id }),
        Friendship.filter({ friend_id: user.id })
      ]);
      
      const allRelations = [...sent, ...received];
      setAllRelationsCache(allRelations);
      const pendingRecv = [];
      const pendingSent = [];
      
      for (const rel of allRelations) {
        const otherId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
        const otherUser = await User.get(otherId).catch(() => null);
        if (!otherUser) continue;
        
        const data = { ...rel, otherUser };
        
        if (rel.status === 'pending') {
          if (rel.friend_id === user.id) pendingRecv.push(data);
          else pendingSent.push(data);
        }
      }
      
      setRequestsReceived(pendingRecv);
      setRequestsSent(pendingSent);

      // Fetch some random users for suggestions
      const allUsers = await User.list();
      setAllUsersCache(allUsers);
      const notFriends = allUsers.filter(u => 
        u.id !== user.id && 
        !allRelations.some(r => r.user_id === u.id || r.friend_id === u.id)
      ).slice(0, 10);
      setSuggestions(notFriends);

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, user]);

  const handleAccept = async (relId) => {
    try {
      await Friendship.update(relId, { status: 'accepted' });
      toast.success("Friend request accepted!");
      loadData();
    } catch (e) { toast.error("Error accepting request"); }
  };

  const handleReject = async (relId) => {
    try {
      await Friendship.delete(relId);
      toast.success("Request removed");
      loadData();
    } catch (e) { toast.error("Error rejecting request"); }
  };

  const handleAddFriend = async (friendId) => {
    try {
      await Friendship.create({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending'
      });
      toast.success("Friend request sent!");
      loadData();
    } catch (e) {
      toast.error("Error sending request");
    }
  };

  const handleProfileClick = (id) => {
    setOpen(false);
    navigate(`/PlayerProfile?uid=${id}`);
  };

  const searchResults = searchQuery.trim() === "" ? [] : allUsersCache.filter(u => 
    u.id !== user?.id &&
    (
      (u.ign && u.ign.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.unique_id && u.unique_id.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  ).slice(0, 20);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-full sm:w-[450px] sm:max-w-md h-full bg-[#0a0a0c] border-l border-[#1f2029] p-0 flex flex-col z-50 overflow-hidden [&>button]:hidden"
      >
        <SheetHeader className="p-4 sm:p-6 border-b border-[#1f2029] bg-[#0c0d12] flex flex-row items-center gap-4 space-y-0 relative">
          <SheetClose asChild>
            <button className="p-2 bg-[#111115] hover:bg-[#ff5500] text-gray-400 hover:text-white border border-[#2a2a35] hover:border-[#ff5500] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </SheetClose>
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase flex items-center gap-2 m-0 flex-1">
            <UserPlus className="w-6 h-6 text-white" />
            Add Friend
          </SheetTitle>
          <button 
            onClick={() => setShowMyQR(true)}
            className="p-2 bg-[#111115] hover:bg-[#ff5500]/20 text-gray-400 hover:text-[#ff5500] border border-[#2a2a35] hover:border-[#ff5500]/50 rounded-lg transition-colors absolute right-4 sm:right-6"
          >
            <QrCode className="w-5 h-5" />
          </button>
        </SheetHeader>

        <div className="p-4 sm:px-6 pb-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by Username or UID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111115] border border-[#1f2029] focus:border-[#ff5500] text-white placeholder:text-gray-600 rounded-lg py-2.5 pl-10 pr-10 outline-none transition-colors text-sm"
            />
            <button 
              onClick={() => setShowScanner(true)}
              className="absolute right-2 p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            >
              <ScanLine className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
          {searchQuery.trim() !== "" ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Search Results</h3>
              {searchResults.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No users found</div>
              ) : (
                searchResults.map(s => {
                  const relation = allRelationsCache.find(r => r.user_id === s.id || r.friend_id === s.id);
                  const isFriend = relation?.status === 'accepted';
                  const isPending = relation?.status === 'pending';
                  
                  return (
                    <div key={s.id} className="bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex items-center justify-between gap-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                        onClick={() => handleProfileClick(s.id)}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={s.avatar_url} className="object-cover" />
                          <AvatarFallback className="bg-gray-800 text-white font-bold">{s.ign?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-white text-sm">{s.ign}</p>
                          <p className="text-[10px] text-gray-400">UID: {s.unique_id}</p>
                        </div>
                      </div>
                      {isFriend ? (
                        <span className="px-3 py-1.5 text-xs text-gray-500 font-bold uppercase bg-gray-800/30 rounded-lg">Friends</span>
                      ) : isPending ? (
                        <span className="px-3 py-1.5 text-xs text-yellow-500/70 font-bold uppercase bg-yellow-500/10 rounded-lg">Pending</span>
                      ) : (
                        <button 
                          onClick={() => handleAddFriend(s.id)} 
                          className="px-3 py-1.5 bg-[#ff5500]/10 border border-[#ff5500]/30 text-[#ff5500] hover:bg-[#ff5500] hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-bold uppercase"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <Tabs defaultValue="received" className="w-full">
            <TabsList className="bg-transparent border-b border-[#1f2029] p-0 h-auto w-full flex rounded-none mb-4">
              <TabsTrigger value="received" className="flex-1 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#ff5500] data-[state=active]:text-white text-gray-500 rounded-none py-3 text-[10px] font-bold uppercase tracking-wider">
                Received ({requestsReceived.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex-1 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#ff5500] data-[state=active]:text-white text-gray-500 rounded-none py-3 text-[10px] font-bold uppercase tracking-wider">
                Sent ({requestsSent.length})
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex-1 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#ff5500] data-[state=active]:text-white text-gray-500 rounded-none py-3 text-[10px] font-bold uppercase tracking-wider">
                Suggestions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="space-y-2 mt-0">
              {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-[#ff5500] border-t-transparent rounded-full" /></div>
              ) : requestsReceived.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No pending requests</div>
              ) : (
                requestsReceived.map(req => (
                  <div key={req.id} className="bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex items-center justify-between gap-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleProfileClick(req.otherUser.id)}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={req.otherUser.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-gray-800 text-white font-bold">{req.otherUser.ign?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white text-sm">{req.otherUser.ign}</p>
                        <p className="text-[10px] text-gray-400">UID: {req.otherUser.unique_id}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(req.id)} className="p-2 bg-[#00e676] text-black hover:bg-[#00c853] rounded-lg transition-colors">
                        <Check className="w-4 h-4 font-bold" />
                      </button>
                      <button onClick={() => handleReject(req.id)} className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-2 mt-0">
              {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-[#ff5500] border-t-transparent rounded-full" /></div>
              ) : requestsSent.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No requests sent</div>
              ) : (
                requestsSent.map(req => (
                  <div key={req.id} className="bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex items-center justify-between gap-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleProfileClick(req.otherUser.id)}
                    >
                      <Avatar className="w-10 h-10 opacity-50">
                        <AvatarImage src={req.otherUser.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-gray-800 text-white font-bold">{req.otherUser.ign?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-gray-400 text-sm">{req.otherUser.ign}</p>
                        <p className="text-[10px] text-gray-500">Pending Approval...</p>
                      </div>
                    </div>
                    <button onClick={() => handleReject(req.id)} className="px-3 py-1.5 bg-gray-800 text-xs text-gray-400 hover:text-white rounded-lg transition-colors font-bold uppercase">
                      Cancel
                    </button>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-2 mt-0">
              {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-[#ff5500] border-t-transparent rounded-full" /></div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No suggestions available</div>
              ) : (
                suggestions.map(s => (
                  <div key={s.id} className="bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex items-center justify-between gap-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleProfileClick(s.id)}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={s.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-gray-800 text-white font-bold">{s.ign?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white text-sm">{s.ign}</p>
                        <p className="text-[10px] text-gray-400">UID: {s.unique_id}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAddFriend(s.id)} 
                      className="px-3 py-1.5 bg-[#ff5500]/10 border border-[#ff5500]/30 text-[#ff5500] hover:bg-[#ff5500] hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-bold uppercase"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
          )}
        </div>

        {showMyQR && (
          <div className="absolute inset-0 bg-[#0a0a0c] z-50 flex flex-col">
            <div className="p-4 sm:p-6 border-b border-[#1f2029] flex items-center gap-4">
              <button 
                onClick={() => setShowMyQR(false)}
                className="p-2 bg-[#111115] hover:bg-gray-800 text-gray-400 hover:text-white border border-[#2a2a35] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black tracking-widest text-white uppercase m-0">My QR Code</h2>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="w-20 h-20 border-4 border-[#ff5500]/20">
                  <AvatarImage src={user?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-gray-800 text-white font-bold text-xl">{user?.ign?.[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-black text-2xl text-white tracking-wider">{user?.ign}</p>
                  <p className="text-gray-400 text-xs mt-1">UID: {user?.unique_id}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(255,85,0,0.15)]">
                <QRCodeSVG 
                  value={user?.unique_id || ""} 
                  size={200}
                  level="H"
                  imageSettings={{
                    src: user?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback",
                    x: undefined,
                    y: undefined,
                    height: 48,
                    width: 48,
                    excavate: true,
                  }}
                />
              </div>
              <p className="text-gray-500 text-sm max-w-[250px] text-center">
                Let your friends scan this QR code to instantly send you a friend request.
              </p>
            </div>
          </div>
        )}

        {showScanner && (
          <div className="absolute inset-0 bg-[#0a0a0c] z-50 flex flex-col">
             <div className="p-4 sm:p-6 border-b border-[#1f2029] flex items-center gap-4 bg-[#0a0a0c] relative z-10">
              <button 
                onClick={() => setShowScanner(false)}
                className="p-2 bg-[#111115] hover:bg-gray-800 text-gray-400 hover:text-white border border-[#2a2a35] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black tracking-widest text-white uppercase m-0">Scan QR Code</h2>
            </div>
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
              <Scanner 
                onScan={(result) => {
                  if (result && result.length > 0) {
                    setSearchQuery(result[0].rawValue);
                    setShowScanner(false);
                    toast.success("QR Code scanned!");
                  }
                }}
                onError={(error) => {
                  console.error("Scanner Error:", error);
                  toast.error("Camera error: Please check permissions or ensure HTTPS connection.");
                }}
                constraints={{ facingMode: "environment" }}
                components={{ audio: false, finder: true }}
                styles={{ container: { width: '100%', height: '100%' } }}
              />
              <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                <p className="text-white/70 text-sm bg-black/50 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
                  Point your camera at a friend's QR code
                </p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
