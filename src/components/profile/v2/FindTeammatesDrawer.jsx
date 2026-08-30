import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, Target, Clock, MessageSquare, Plus, Zap, Shield, X, RefreshCw, ChevronLeft, UserPlus, Eye, MoreVertical, Trash2 } from 'lucide-react';
import { db } from '@/api/firebaseClient';
import { collection, query, where, orderBy, onSnapshot, setDoc, doc, serverTimestamp, deleteDoc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Friendship, Notification, calculateLevelFromXP } from '@/api/entities';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const GAME_MODES = [
  { id: 'Free Fire', icon: Target, color: 'text-orange-500' },
  { id: 'BGMI', icon: Shield, color: 'text-blue-500' },
  { id: 'Valorant', icon: Zap, color: 'text-red-500' }
];

export default function FindTeammatesDrawer({ user, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Request Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMode, setSelectedMode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myRequest, setMyRequest] = useState(null);

  // Reply State
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  
  // Custom Action Menu State
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(
      collection(db, 'lfg_requests'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeRequests = [];
      let foundMyReq = null;

      snapshot.docs.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        activeRequests.push(data);
        if (user && data.creator_id === user.id) {
          foundMyReq = data;
        }
      });

      setRequests(activeRequests);
      setMyRequest(foundMyReq);
      setLoading(false);
    }, (error) => {
      console.error("LFG Fetch Error:", error);
      toast.error("Failed to load requests.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  useEffect(() => {
    if (!requests || !user?.id) return;
    requests.forEach(req => {
      if (req.creator_id !== user.id) {
        const viewedKey = `viewed_lfg_${req.id}`;
        if (!localStorage.getItem(viewedKey)) {
          localStorage.setItem(viewedKey, 'true');
          const requestRef = doc(db, 'lfg_requests', req.id);
          updateDoc(requestRef, {
            views: increment(1)
          }).catch(e => console.error("Error updating views", e));
        }
      }
    });
  }, [requests, user]);

  const handleCreateRequest = async () => {
    if (!user || !user.id) return;
    
    setIsSubmitting(true);
    try {
      const requestRef = doc(db, 'lfg_requests', user.id);
      
      await setDoc(requestRef, {
        creator_id: user.id,
        creator_ign: user.ign || user.username || 'Player',
        creator_level: calculateLevelFromXP(user.xp || 0),
        creator_avatar: user.avatar_url || null,
        mode: selectedMode,
        description: description.trim() || 'Looking for teammates to play!',
        created_at: serverTimestamp(),
        views: 0
      });

      toast.success("Request posted successfully!");
      setShowCreateForm(false);
      setDescription('');
    } catch (error) {
      console.error("Error creating request:", error);
      toast.error("Failed to post request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!user || !user.id) return;
    try {
      await deleteDoc(doc(db, 'lfg_requests', user.id));
      toast.success("Request removed.");
    } catch (e) {
      toast.error("Failed to remove request.");
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((new Date() - date) / 60000); // minutes
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff/60)}h ago`;
  };

  const handleSendReply = async (reqId) => {
    if (!user || !user.id || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const requestRef = doc(db, 'lfg_requests', reqId);
      await updateDoc(requestRef, {
        replies: arrayUnion({
          sender_id: user.id,
          sender_ign: user.ign || user.username || 'Player',
          sender_avatar: user.avatar_url || null,
          message: replyText.trim(),
          created_at: new Date().toISOString()
        })
      });
      toast.success("Message sent!");
      setReplyingTo(null);
      setReplyText("");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send message.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleAddFriend = async (friendId) => {
    if (!user || !user.id || !friendId) return;
    
    if (user.friends && user.friends.includes(friendId)) {
      toast.info("You are already friends with this player!");
      return;
    }
    
    try {
      const existing = await Friendship.filter({ user_id: user.id, friend_id: friendId });
      const existingReverse = await Friendship.filter({ user_id: friendId, friend_id: user.id });
      
      const isAlreadyFriendOrPending = [...(existing || []), ...(existingReverse || [])].some(
        f => f.status === 'accepted' || f.status === 'pending'
      );
      
      if (isAlreadyFriendOrPending) {
         toast.info("Request already pending or you're already friends!");
         return;
      }
      
      await Friendship.create({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending'
      });
      
      await Notification.create({
        recipient_id: friendId,
        type: "Friend Request",
        title: "🤝 New Friend Request",
        message: `${user.ign || user.username || 'Someone'} sent you a friend request!`,
        link: `/profile?uid=${user.id}`,
        priority: "High",
        dismissable: true,
        created_at: new Date().toISOString()
      }).catch(err => console.error("Notification error:", err));

      toast.success("Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request.");
    }
  };

  const renderRequestCard = (req) => (
    <div key={req.id} className={`p-4 rounded-2xl border transition-all ${
      req.creator_id === user?.id 
        ? 'bg-slate-900/80 border-[#0ea5e9]/50 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
        : 'bg-slate-900 border-slate-800'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-slate-800">
            <AvatarImage src={req.creator_avatar} />
            <AvatarFallback className="bg-slate-800 text-gray-300 font-bold">
              {req.creator_ign?.substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              {req.creator_ign}
              {req.creator_id === user?.id && (
                <span className="text-[9px] bg-[#0ea5e9]/20 text-[#0ea5e9] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">You</span>
              )}
            </h4>
            <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400 mt-0.5">
              <span className="flex items-center gap-0.5 text-[#0ea5e9]">
                <Eye className="w-3 h-3" /> {req.views || 0} views
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10px] font-bold text-gray-300 flex items-center gap-1">
              {GAME_MODES.find(m => m.id === req.mode)?.icon && 
                React.createElement(GAME_MODES.find(m => m.id === req.mode).icon, { className: "w-3 h-3 text-[#0ea5e9]" })}
              {req.mode}
            </div>
            {req.creator_id === user?.id && (
              <div className="relative">
                <button 
                  onClick={() => setOpenMenuId(openMenuId === req.id ? null : req.id)}
                  className="p-1 hover:bg-slate-800 rounded transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
                
                {openMenuId === req.id && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-slate-950 border border-slate-800 rounded-lg shadow-xl overflow-hidden z-[200]">
                    <button
                      onClick={() => {
                        handleDeleteRequest();
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center px-3 py-2 text-xs font-medium text-red-500 hover:bg-slate-900 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mr-1">
            <Clock className="w-3 h-3" /> {getTimeAgo(req.created_at)}
          </span>
        </div>
      </div>
      
      <p className="text-sm text-gray-200 mb-4 font-medium italic">
        "{req.description}"
      </p>
      
      {req.creator_id !== user?.id && (
        <div className="flex flex-col gap-2">
          {replyingTo === req.id ? (
            <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <Input 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type message..." 
                className="h-8 bg-transparent border-none text-xs text-white focus-visible:ring-0 px-2"
                autoFocus
              />
              <Button 
                onClick={() => handleSendReply(req.id)}
                disabled={sendingReply || !replyText.trim()}
                className="h-8 px-3 rounded-lg bg-[#0ea5e9] hover:bg-[#38bdf8] text-white text-xs font-bold"
              >
                {sendingReply ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Send'}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-white hover:bg-slate-900"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => setReplyingTo(req.id)}
              variant="outline" 
              className="w-full bg-slate-950 border-slate-800 text-white hover:bg-slate-900 font-bold h-9 rounded-xl text-xs"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-[#0ea5e9]" /> Message
            </Button>
          )}
        </div>
      )}

      {req.creator_id === user?.id && req.replies && req.replies.length > 0 && (
        <div className="mt-3 border-t border-slate-800/60 pt-3">
          <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Received Messages</h5>
          <div className="flex flex-col gap-2">
            {req.replies.map((reply, i) => (
              <div key={i} className="flex gap-2 items-start bg-slate-950/50 p-2 rounded-xl items-center">
                <Avatar className="w-6 h-6 border border-slate-800 shrink-0">
                  <AvatarImage src={reply.sender_avatar} />
                  <AvatarFallback className="text-[8px] bg-slate-800 text-gray-300">
                    {reply.sender_ign?.substring(0,2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-bold text-[#0ea5e9] leading-tight">{reply.sender_ign}</span>
                  <p className="text-xs text-gray-300 leading-tight mt-0.5 break-words">{reply.message}</p>
                </div>
                <Button 
                  onClick={() => handleAddFriend(reply.sender_id)}
                  variant="ghost" 
                  className="h-6 px-2 shrink-0 bg-[#0ea5e9]/10 text-[#0ea5e9] hover:bg-[#0ea5e9] hover:text-white rounded text-[10px] font-bold transition-colors"
                >
                  <UserPlus className="w-3 h-3 sm:mr-1" /> <span className="hidden sm:inline">Add Friend</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" hideClose={true} className="w-full sm:w-[450px] h-full bg-slate-950 border-l border-slate-800 p-0 flex flex-col z-[100] overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 -ml-2 rounded-full hover:bg-slate-900 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-400" />
              </button>
              <div>
                <SheetTitle className="text-xl font-black tracking-wide text-white uppercase flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#0ea5e9]" /> Find Teammates
                </SheetTitle>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 scrollbar-hide">
          <AnimatePresence mode="wait">
            {showCreateForm ? (
              <motion.div 
                key="create-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-inner">
                  <div className="grid grid-cols-3 gap-2">
                    {GAME_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                          selectedMode === mode.id 
                            ? 'bg-slate-800 border-[#0ea5e9] shadow-[0_0_10px_rgba(14,165,233,0.15)]' 
                            : 'bg-slate-950 border-slate-800 text-gray-400 hover:border-slate-700'
                        }`}
                      >
                        <mode.icon className={`w-5 h-5 ${selectedMode === mode.id ? mode.color : ''}`} />
                        <span className={`text-[11px] sm:text-xs font-bold ${selectedMode === mode.id ? 'text-white' : ''}`}>
                          {mode.id}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedMode && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4"
                    >
                      <Input 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="E.g. Need 1 pro rusher, mic on!"
                        className="bg-slate-950 border-slate-800 text-white placeholder:text-gray-600 rounded-xl focus-visible:ring-1 focus-visible:ring-[#0ea5e9]"
                        maxLength={60}
                      />
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  <Button 
                    onClick={() => setShowCreateForm(false)}
                    variant="outline"
                    className="flex-1 bg-slate-900 border-slate-700 text-gray-300 hover:text-white rounded-xl h-11 font-bold"
                  >
                    Cancel
                  </Button>
                  {selectedMode && (
                    <Button 
                      onClick={handleCreateRequest}
                      disabled={isSubmitting}
                      className="flex-1 bg-[#0ea5e9] hover:bg-[#38bdf8] text-white rounded-xl h-11 font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)]"
                    >
                      {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Post Request'}
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col flex-1 h-full overflow-hidden"
              >
                {loading ? (
                  <div className="flex flex-col gap-3 p-4 flex-1 overflow-hidden">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800" />
                            <div className="space-y-2">
                              <div className="h-3.5 w-24 bg-slate-800 rounded" />
                              <div className="h-2.5 w-16 bg-slate-800 rounded" />
                            </div>
                          </div>
                          <div className="h-3 w-12 bg-slate-800 rounded mt-2" />
                        </div>
                        <div className="h-3.5 w-3/4 bg-slate-800 rounded mb-4" />
                        <div className="h-9 w-full bg-slate-800 rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 h-40 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-gray-300 font-bold mb-1">No Active Requests</h3>
                    <p className="text-gray-500 text-sm mb-4">Be the first to create a request and find teammates!</p>
                  </div>
                ) : (
                  <Tabs defaultValue="explore" className="flex flex-col flex-1 h-full overflow-hidden">
                    <div className="px-1 pt-1 pb-3">
                      <TabsList className="w-full bg-slate-900 border border-slate-800 rounded-xl p-1 grid grid-cols-2">
                        <TabsTrigger value="explore" className="rounded-lg text-xs font-bold data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white">Explore</TabsTrigger>
                        <TabsTrigger value="my_request" className="rounded-lg text-xs font-bold data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white">My Request</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="explore" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
                      <ScrollArea className="h-[45vh] sm:h-[300px] pr-2">
                        <div className="flex flex-col gap-3">
                          {requests.filter(req => req.creator_id !== user?.id).length === 0 ? (
                            <div className="text-center p-6 text-gray-500 font-medium text-sm">No other active requests found.</div>
                          ) : (
                            requests.filter(req => req.creator_id !== user?.id).map((req) => renderRequestCard(req))
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="my_request" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
                      <ScrollArea className="h-[45vh] sm:h-[300px] pr-2">
                        <div className="flex flex-col gap-3">
                          {requests.filter(req => req.creator_id === user?.id).length === 0 ? (
                            <div className="text-center p-6 text-gray-500 font-medium text-sm">You haven't posted any request yet.</div>
                          ) : (
                            requests.filter(req => req.creator_id === user?.id).map((req) => renderRequestCard(req))
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {!showCreateForm && !myRequest && (
          <div className="absolute bottom-24 right-6 z-50">
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-[#0ea5e9] hover:bg-[#38bdf8] text-white font-bold h-14 w-14 rounded-full shadow-[0_4px_20px_rgba(14,165,233,0.5)] transition-all flex items-center justify-center p-0"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
