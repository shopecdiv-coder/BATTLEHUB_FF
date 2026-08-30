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
import CustomScanner from '@/components/CustomScanner';
import { Camera } from '@capacitor/camera';
import { toast } from 'sonner';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';

const RealtimeUserWrapper = ({ initialUser, children }) => {
  const [user, setUser] = useState(initialUser);
  
  useEffect(() => {
    if (!initialUser?.id) return;
    const unsub = onSnapshot(doc(db, 'users', initialUser.id), (docSnap) => {
      if (docSnap.exists()) {
        // Always include the document ID in the user object
        setUser({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsub();
  }, [initialUser?.id]);

  return children(user);
};
const scanStyle = `
@keyframes scanLine {
  0% { top: 0%; }
  50% { top: 100%; }
  100% { top: 0%; }
}
.animate-scan-line {
  animation: scanLine 2.5s ease-in-out infinite;
}
`;

export default function AddFriendDrawer({ children, user }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [scannedProfile, setScannedProfile] = useState(null);

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
    setShowScanner(true);
  };
  
  const [requestsReceived, setRequestsReceived] = useState([]);
  const [requestsSent, setRequestsSent] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [allUsersCache, setAllUsersCache] = useState([]);
  const [allRelationsCache, setAllRelationsCache] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    
    let isMounted = true;
    let sentRels = [];
    let recvRels = [];

    const handleFriendships = (allRels) => {
      setAllRelationsCache(allRels);
      const pendingRecv = [];
      const pendingSent = [];
      
      const validResults = allRels.map((rel) => {
        const otherId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
        let otherUser = allUsersCache.find(u => u.id === otherId) || { id: otherId };
        return { ...rel, otherUser };
      });
      
      if (!isMounted) return;
      
      for (const data of validResults) {
        if (data.status?.toLowerCase() !== 'accepted') {
          if (data.friend_id === user.id) pendingRecv.push(data);
          else pendingSent.push(data);
        }
      }
      
      setRequestsReceived(pendingRecv);
      setRequestsSent(pendingSent);
      setLoading(false);
    };

    const checkCombine = () => handleFriendships([...sentRels, ...recvRels]);

    setLoading(true);

    const qSent = query(collection(db, 'friendships'), where('user_id', '==', user.id));
    const unsubSent = onSnapshot(qSent, (snap) => {
      sentRels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      checkCombine();
    });

    const qRecv = query(collection(db, 'friendships'), where('friend_id', '==', user.id));
    const unsubRecv = onSnapshot(qRecv, (snap) => {
      recvRels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      checkCombine();
    });

    // Fetch random suggestions ONCE when drawer opens
    const fetchSuggestions = async () => {
      try {
        const allUsers = await User.list("-created_date", 50);
        if (!isMounted) return;
        setAllUsersCache(prev => {
          const newCache = [...prev];
          allUsers.forEach(u => {
            if (!newCache.some(existing => existing.id === u.id)) {
              newCache.push(u);
            }
          });
          return newCache;
        });
      } catch(e) {}
    };
    fetchSuggestions();

    return () => {
      isMounted = false;
      unsubSent();
      unsubRecv();
    };
  }, [open, user]);

  useEffect(() => {
    if (!user) return;
    const notFriends = allUsersCache.filter(u => 
      u.id !== user.id && 
      !allRelationsCache.some(r => r.user_id === u.id || r.friend_id === u.id)
    ).slice(0, 10);
    setSuggestions(notFriends);
  }, [allUsersCache, allRelationsCache, user]);

  useEffect(() => {
    if (open && requestsReceived.length > 0) {
      try {
        const newIds = requestsReceived.map(r => r.id);
        const existing = JSON.parse(localStorage.getItem('viewed_requests') || '[]');
        const combined = [...new Set([...existing, ...newIds])];
        localStorage.setItem('viewed_requests', JSON.stringify(combined));
        window.dispatchEvent(new Event('requestsRead'));
      } catch(e) {}
    }
  }, [open, requestsReceived]);

  // Live UID search
  useEffect(() => {
    if (searchQuery.trim().length > 3) {
      const searchLive = async () => {
        try {
          const query = searchQuery.trim().toUpperCase();
          const exactUsers = await User.filter({ unique_id: query });
          if (exactUsers.length > 0) {
            setAllUsersCache(prev => {
              const newUsers = [...prev];
              let added = false;
              exactUsers.forEach(eu => {
                if (eu && !newUsers.some(u => u.id === eu.id)) {
                  newUsers.push(eu);
                  added = true;
                }
              });
              return added ? newUsers : prev;
            });
          }
        } catch (e) {
          console.error(e);
        }
      };
      // Debounce slightly or just run
      const timer = setTimeout(() => searchLive(), 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const handleAccept = async (relId) => {
    try {
      await Friendship.update(relId, { status: 'accepted' });
      toast.success("Friend request accepted!");
    } catch (e) { toast.error("Error accepting request"); }
  };

  const handleReject = async (relId) => {
    try {
      await Friendship.delete(relId);
      toast.success("Request removed");
    } catch (e) { toast.error("Error rejecting request"); }
  };

  const handleAddFriend = async (friendId) => {
    if (friendId === user?.id) {
      toast.error("You cannot send a friend request to yourself.");
      return;
    }
    const existing = allRelationsCache.find(r => 
      (r.user_id === user.id && r.friend_id === friendId) ||
      (r.friend_id === user.id && r.user_id === friendId)
    );
    if (existing) {
      if (existing.status?.toLowerCase() === 'accepted') toast.error("Already friends!");
      else toast.error("Request already pending!");
      return;
    }

    try {
      await Friendship.create({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending'
      });
      toast.success("Friend request sent!");
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
        className="w-full sm:w-[450px] sm:max-w-md h-full bg-slate-950 border-l border-slate-800 p-0 flex flex-col z-50 overflow-hidden [&>button]:hidden pt-16"
      >
        <SheetHeader className="p-4 sm:p-6 border-b border-slate-800 bg-[#0c0d12] flex flex-row items-center gap-4 space-y-0 relative">
          <SheetClose asChild>
            <button className="p-2 bg-slate-900 hover:bg-[#0ea5e9] text-gray-400 hover:text-white border border-slate-700 hover:border-[#0ea5e9] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </SheetClose>
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase flex items-center gap-2 m-0 flex-1">
            <UserPlus className="w-6 h-6 text-white" />
            Add Friend
          </SheetTitle>
          <button 
            onClick={() => setShowMyQR(true)}
            className="p-2 bg-slate-900 hover:bg-[#0ea5e9]/20 text-gray-400 hover:text-[#0ea5e9] border border-slate-700 hover:border-[#0ea5e9]/50 rounded-lg transition-colors absolute right-4 sm:right-6"
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
              className="w-full bg-slate-900 border border-slate-800 focus:border-[#0ea5e9] text-white placeholder:text-gray-600 rounded-lg py-2.5 pl-10 pr-10 outline-none transition-colors text-sm"
            />
            {searchQuery.length > 0 ? (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleScanClick}
                className="absolute right-2 p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
              >
                <ScanLine className="w-4 h-4" />
              </button>
            )}
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
                  const relation = allRelationsCache.find(r => 
                    (r.user_id === user.id && r.friend_id === s.id) ||
                    (r.friend_id === user.id && r.user_id === s.id)
                  );
                  const isFriend = relation?.status?.toLowerCase() === 'accepted';
                  const isPending = relation && !isFriend;
                  const isSentByMe = isPending && relation?.user_id === user.id;
                  
                  return (
                    <RealtimeUserWrapper key={s.id} initialUser={s}>
                      {(realtimeUser) => (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4">
                          <div 
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                            onClick={() => handleProfileClick(realtimeUser.id)}
                          >
                            <div className="relative">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={realtimeUser.avatar_url} className="object-cover" />
                                <AvatarFallback className="bg-gray-800 text-white font-bold">{realtimeUser.ign?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111115] ${realtimeUser.activity_status === 'Online' ? 'bg-[#00e676]' : realtimeUser.activity_status === 'In Match' ? 'bg-[#0ea5e9]' : 'bg-gray-500'}`} />
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{realtimeUser.ign}</p>
                              <p className="text-[10px] text-gray-400">UID: {realtimeUser.unique_id}</p>
                              <p className={`text-[10px] font-bold ${realtimeUser.activity_status === 'Online' ? 'text-[#00e676]' : realtimeUser.activity_status === 'In Match' ? 'text-[#0ea5e9]' : 'text-gray-500'}`}>
                                {realtimeUser.activity_status === 'Online' ? 'Online' : realtimeUser.activity_status === 'In Match' ? 'In Match' : 'Offline'}
                              </p>
                            </div>
                          </div>
                          {isFriend ? (
                            <span className="px-3 py-1.5 text-xs text-[#00e676] font-bold uppercase bg-[#00e676]/10 border border-[#00e676]/30 rounded-lg flex items-center gap-1">
                              <Check className="w-3 h-3" /> Friends
                            </span>
                          ) : isPending && isSentByMe ? (
                            <span className="px-3 py-1.5 text-xs text-yellow-500/70 font-bold uppercase bg-yellow-500/10 rounded-lg">Request Sent</span>
                          ) : isPending && !isSentByMe ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleAccept(relation.id)} className="p-1.5 bg-[#00e676] text-black hover:bg-[#00c853] rounded-lg transition-colors">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleReject(relation.id)} className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleAddFriend(realtimeUser.id)} 
                              className="px-3 py-1.5 bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-[#0ea5e9] hover:bg-[#0ea5e9] hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-bold uppercase"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Add
                            </button>
                          )}
                        </div>
                      )}
                    </RealtimeUserWrapper>
                  );
                })
              )}
            </div>
          ) : (
            <Tabs defaultValue="received" className="w-full">
            <TabsList className="bg-transparent border-b border-slate-800 p-0 h-auto w-full flex rounded-none mb-4">
              <TabsTrigger value="received" className="flex-1 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#0ea5e9] data-[state=active]:text-white text-gray-500 rounded-none py-3 text-[10px] font-bold uppercase tracking-wider">
                Received ({requestsReceived.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex-1 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#0ea5e9] data-[state=active]:text-white text-gray-500 rounded-none py-3 text-[10px] font-bold uppercase tracking-wider">
                Sent ({requestsSent.length})
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex-1 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#0ea5e9] data-[state=active]:text-white text-gray-500 rounded-none py-3 text-[10px] font-bold uppercase tracking-wider">
                Suggestions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="space-y-2 mt-0">
              {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-[#0ea5e9] border-t-transparent rounded-full" /></div>
              ) : requestsReceived.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No pending requests</div>
              ) : (
                requestsReceived.map(req => (
                  <RealtimeUserWrapper key={req.id} initialUser={req.otherUser}>
                    {(realtimeUser) => (
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleProfileClick(realtimeUser.id)}
                        >
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={realtimeUser.avatar_url} className="object-cover" />
                              <AvatarFallback className="bg-gray-800 text-white font-bold">{realtimeUser.ign?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111115] ${realtimeUser.activity_status === 'Online' ? 'bg-[#00e676]' : realtimeUser.activity_status === 'In Match' ? 'bg-[#0ea5e9]' : 'bg-gray-500'}`} />
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{realtimeUser.ign}</p>
                            <p className="text-[10px] text-gray-400">UID: {realtimeUser.unique_id}</p>
                            <p className={`text-[10px] font-bold ${realtimeUser.activity_status === 'Online' ? 'text-[#00e676]' : realtimeUser.activity_status === 'In Match' ? 'text-[#0ea5e9]' : 'text-gray-500'}`}>
                              {realtimeUser.activity_status === 'Online' ? 'Online' : realtimeUser.activity_status === 'In Match' ? 'In Match' : 'Offline'}
                            </p>
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
                    )}
                  </RealtimeUserWrapper>
                ))
              )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-2 mt-0">
              {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-[#0ea5e9] border-t-transparent rounded-full" /></div>
              ) : requestsSent.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No requests sent</div>
              ) : (
                requestsSent.map(req => (
                  <RealtimeUserWrapper key={req.id} initialUser={req.otherUser}>
                    {(realtimeUser) => (
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleProfileClick(realtimeUser.id)}
                        >
                          <div className="relative">
                            <Avatar className="w-10 h-10 opacity-50">
                              <AvatarImage src={realtimeUser.avatar_url} className="object-cover" />
                              <AvatarFallback className="bg-gray-800 text-white font-bold">{realtimeUser.ign?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111115] opacity-50 ${realtimeUser.activity_status === 'Online' ? 'bg-[#00e676]' : realtimeUser.activity_status === 'In Match' ? 'bg-[#0ea5e9]' : 'bg-gray-500'}`} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-400 text-sm">{realtimeUser.ign}</p>
                            <p className="text-[10px] text-gray-500">Pending Approval...</p>
                            <p className={`text-[10px] font-bold ${realtimeUser.activity_status === 'Online' ? 'text-[#00e676]' : realtimeUser.activity_status === 'In Match' ? 'text-[#0ea5e9]' : 'text-gray-500'}`}>
                              {realtimeUser.activity_status === 'Online' ? 'Online' : realtimeUser.activity_status === 'In Match' ? 'In Match' : 'Offline'}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => handleReject(req.id)} className="px-3 py-1.5 bg-gray-800 text-xs text-gray-400 hover:text-white rounded-lg transition-colors font-bold uppercase">
                          Cancel
                        </button>
                      </div>
                    )}
                  </RealtimeUserWrapper>
                ))
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-2 mt-0">
              {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-[#0ea5e9] border-t-transparent rounded-full" /></div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No suggestions available</div>
              ) : (
                suggestions.map(s => (
                  <RealtimeUserWrapper key={s.id} initialUser={s}>
                    {(realtimeUser) => (
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleProfileClick(realtimeUser.id)}
                        >
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={realtimeUser.avatar_url} className="object-cover" />
                              <AvatarFallback className="bg-gray-800 text-white font-bold">{realtimeUser.ign?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111115] ${realtimeUser.activity_status === 'Online' ? 'bg-[#00e676]' : realtimeUser.activity_status === 'In Match' ? 'bg-[#0ea5e9]' : 'bg-gray-500'}`} />
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{realtimeUser.ign}</p>
                            <p className="text-[10px] text-gray-400">UID: {realtimeUser.unique_id}</p>
                            <p className={`text-[10px] font-bold ${realtimeUser.activity_status === 'Online' ? 'text-[#00e676]' : realtimeUser.activity_status === 'In Match' ? 'text-[#0ea5e9]' : 'text-gray-500'}`}>
                              {realtimeUser.activity_status === 'Online' ? 'Online' : realtimeUser.activity_status === 'In Match' ? 'In Match' : 'Offline'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleAddFriend(realtimeUser.id)} 
                          className="px-3 py-1.5 bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-[#0ea5e9] hover:bg-[#0ea5e9] hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-bold uppercase"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    )}
                  </RealtimeUserWrapper>
                ))
              )}
            </TabsContent>
          </Tabs>
          )}
        </div>

        {showMyQR && (
          <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col pt-16">
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center gap-4">
              <button 
                onClick={() => setShowMyQR(false)}
                className="p-2 bg-slate-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-slate-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black tracking-widest text-white uppercase m-0">My QR Code</h2>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="w-20 h-20 border-4 border-[#0ea5e9]/20">
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
                />
              </div>
              <p className="text-gray-500 text-sm max-w-[250px] text-center">
                Let your friends scan this QR code to instantly send you a friend request.
              </p>
            </div>
          </div>
        )}

        {showScanner && (
          <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col pt-16">
             <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center gap-4 bg-slate-950 relative z-10">
              <button 
                onClick={() => setShowScanner(false)}
                className="p-2 bg-slate-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-slate-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black tracking-widest text-white uppercase m-0">Scan QR Code</h2>
            </div>
            <div className="flex-1 relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
              <div className="w-[280px] h-[280px] rounded-3xl overflow-hidden relative shadow-[0_0_50px_rgba(255,85,0,0.15)] ring-4 ring-[#0ea5e9]/30 ring-offset-4 ring-offset-[#0a0a0c]">
                <CustomScanner 
                  onScan={async (result) => {
                    if (result && result.length > 0) {
                      const scannedUid = result[0].rawValue.trim();
                      setShowScanner(false); // Close instantly for speed
                      
                      let foundUser = allUsersCache.find(u => u.unique_id?.toUpperCase() === scannedUid.toUpperCase());
                      
                      if (!foundUser) {
                        try {
                           const fetched = await User.filter({ unique_id: scannedUid.toUpperCase() }).catch(() => []);
                           if (fetched.length > 0) foundUser = fetched[0];
                        } catch(e) {}
                      }
                      
                      if (foundUser) {
                        setScannedProfile(foundUser);
                      } else {
                        setSearchQuery(scannedUid);
                        toast.error("User not found directly, checking search...");
                      }
                    }
                  }}
                  onError={(error) => {
                    console.error("Scanner Error:", error);
                  }}
                />
                
                {/* Custom Corner Accents */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#0ea5e9] rounded-tl-3xl" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#0ea5e9] rounded-tr-3xl" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#0ea5e9] rounded-bl-3xl" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#0ea5e9] rounded-br-3xl" />
                  {/* Scan line */}
                  <div className="absolute left-4 right-4 h-0.5 bg-[#0ea5e9] shadow-[0_0_15px_#0ea5e9] animate-scan-line" />
                </div>
              </div>
              
              <div className="mt-12 text-center px-6">
                <p className="text-white font-bold tracking-wider mb-2">SCAN TO ADD FRIEND</p>
                <p className="text-gray-500 text-sm max-w-[250px] mx-auto">
                  Align your friend's QR code within the frame above.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scanned Profile Nested Sheet */}
        <Sheet open={!!scannedProfile} onOpenChange={(val) => !val && setScannedProfile(null)}>
          <SheetContent className="bg-slate-950 border-slate-800 p-0 flex flex-col w-full sm:max-w-md z-[60] pt-16">
            <SheetHeader className="p-4 sm:p-6 border-b border-slate-800 flex-row items-center justify-between space-y-0">
              <SheetTitle className="text-xl font-black tracking-widest text-white uppercase m-0">Player Found</SheetTitle>
              <SheetClose asChild>
                <button className="p-2 bg-slate-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </SheetClose>
            </SheetHeader>
            <div className="flex-1 flex flex-col items-center p-6 space-y-6">
              <Avatar className="w-24 h-24 border-4 border-[#0ea5e9]/20">
                <AvatarImage src={scannedProfile?.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-gray-800 text-white font-bold text-2xl">{scannedProfile?.ign?.[0]}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <div className="text-center">
                  <p className="font-black text-2xl text-white tracking-wider">{scannedProfile?.ign || scannedProfile?.full_name}</p>
                  <p className="text-gray-400 text-sm mt-1 font-mono text-cyan-400">{scannedProfile?.unique_id}</p>
                </div>
                {(() => {
                  if (scannedProfile?.id === user?.id) {
                    return (
                      <button disabled className="w-full bg-slate-800 text-gray-400 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-not-allowed mt-4">
                        <Check className="w-5 h-5" />
                        YOUR ACCOUNT
                      </button>
                    );
                  }
                  const relation = allRelationsCache.find(r => 
                    (r.user_id === user?.id && r.friend_id === scannedProfile?.id) ||
                    (r.friend_id === user?.id && r.user_id === scannedProfile?.id)
                  );
                  if (relation?.status?.toLowerCase() === 'accepted') {
                    return (
                      <button disabled className="w-full bg-[#00e676]/20 border border-[#00e676]/50 text-[#00e676] font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-not-allowed mt-4">
                        <Check className="w-5 h-5" />
                        ALREADY FRIENDS
                      </button>
                    );
                  }
                  if (relation && relation?.status?.toLowerCase() !== 'accepted') {
                    return (
                      <button disabled className="w-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-not-allowed mt-4">
                        <Check className="w-5 h-5" />
                        REQUEST PENDING
                      </button>
                    );
                  }
                  return (
                    <button 
                      onClick={() => {
                        handleAddFriend(scannedProfile?.id);
                        setScannedProfile(null);
                      }}
                      className="w-full bg-[#0ea5e9] hover:bg-[#38bdf8] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2 mt-4"
                    >
                      <UserPlus className="w-5 h-5" />
                      SEND FRIEND REQUEST
                    </button>
                  );
                })()}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </SheetContent>
      <style>{scanStyle}</style>
    </Sheet>
  );
}
