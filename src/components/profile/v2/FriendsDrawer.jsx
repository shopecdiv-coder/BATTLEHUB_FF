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
import { Input } from "@/components/ui/input";
import { Friendship, User } from '@/api/entities';
import { Search, Users, MessageSquare, Gamepad2, UserPlus, Check, X, Swords, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import PlayerProfile from "@/pages/PlayerProfile";

export default function FriendsDrawer({ children, user, isMe = true }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  // Data states
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ONLINE, IN_MATCH, OFFLINE

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sent, received] = await Promise.all([
        Friendship.filter({ user_id: user.id }),
        Friendship.filter({ friend_id: user.id })
      ]);
      
      const allRelations = [...sent, ...received];
      const fetchPromises = allRelations.map(async (rel) => {
        const otherId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
        const otherUser = await User.get(otherId).catch(() => null);
        if (!otherUser) return null;
        
        const statuses = ['ONLINE', 'IN_MATCH', 'OFFLINE'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        const data = { ...rel, otherUser, richStatus: randomStatus };
        return rel.status === 'accepted' ? data : null;
      });
      
      const results = await Promise.all(fetchPromises);
      const accepted = results.filter(Boolean);
      
      setFriends(accepted);

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

  const handleProfileClick = (profileData) => {
    setSelectedProfile(profileData);
  };
  
  const handleViewFullProfile = (id) => {
    setOpen(false);
    setSelectedProfile(null);
    navigate(`/PlayerProfile?uid=${id}`);
  };

  // Stats calculation
  const stats = {
    total: friends.length,
    online: friends.filter(f => f.richStatus === 'ONLINE').length,
    inMatch: friends.filter(f => f.richStatus === 'IN_MATCH').length,
    offline: friends.filter(f => f.richStatus === 'OFFLINE').length,
  };

  // Filtered friends
  const filteredFriends = friends.filter(f => {
    const matchesSearch = f.otherUser.ign?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.otherUser.unique_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || f.richStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    if (status === 'ONLINE') return 'bg-[#00e676]';
    if (status === 'IN_MATCH') return 'bg-[#ff5500]';
    return 'bg-gray-500';
  };
  
  const getStatusText = (status) => {
    if (status === 'ONLINE') return 'Online';
    if (status === 'IN_MATCH') return 'In Match';
    return 'Offline';
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-full sm:w-[450px] sm:max-w-md h-full bg-[#0a0a0c] border-l border-[#1f2029] p-0 flex flex-col overflow-hidden [&>button]:hidden pt-16"
      >
        <SheetHeader className="p-4 sm:p-6 border-b border-[#1f2029] bg-[#0c0d12] flex flex-row items-center gap-4 space-y-0">
          <SheetClose asChild>
            <button className="p-2 bg-[#111115] hover:bg-[#ff5500] text-gray-400 hover:text-white border border-[#2a2a35] hover:border-[#ff5500] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </SheetClose>
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase flex items-center gap-2 m-0">
            <Users className="w-6 h-6 text-white" />
            {isMe ? 'My Friends' : `${user?.ign?.split(' ')[0] || 'Player'}'s Friends`}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
          {/* Top Stats - Only show for self */}
          {isMe && (
            <div className="px-4 sm:px-6 py-4 grid grid-cols-4 gap-2">
            <div className="bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total</span>
              <span className="text-xl font-black text-white">{stats.total}</span>
            </div>
            <div className="bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[#00e676]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] text-[#00e676] font-bold uppercase tracking-wider mb-1">Online</span>
              <span className="text-xl font-black text-white">{stats.online}</span>
            </div>
            <div className="bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[#ff5500]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] text-[#ff5500] font-bold uppercase tracking-wider mb-1">In Match</span>
              <span className="text-xl font-black text-white">{stats.inMatch}</span>
            </div>
            <div className="bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gray-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Offline</span>
              <span className="text-xl font-black text-white">{stats.offline}</span>
            </div>
          </div>
          )}
          {isMe && (
            <div className="px-4 sm:px-6 pb-4 space-y-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {['ALL', 'ONLINE', 'IN_MATCH', 'OFFLINE'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 transition-colors ${
                      statusFilter === status 
                        ? 'bg-[#ff5500] text-white' 
                        : 'bg-[#111115] border border-[#1f2029] text-gray-400 hover:text-white'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className={`px-4 sm:px-6 ${isMe ? 'pb-4' : 'py-4'}`}>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input 
                placeholder="Search by Username or UID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#111115] border-[#1f2029] text-white placeholder:text-gray-600 h-11 rounded-xl focus-visible:ring-[#ff5500]"
              />
            </div>
          </div>

          {/* Friend List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 space-y-2">
            {loading ? (
              <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-[#ff5500] border-t-transparent rounded-full" /></div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No friends found matching your filters.</div>
            ) : (
              filteredFriends.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => isMe && handleProfileClick(f.otherUser)}
                  className={`bg-[#111115] border border-[#1f2029] rounded-xl p-3 flex items-center gap-3 transition-all ${isMe ? 'cursor-pointer hover:border-[#ff5500]/50 hover:bg-[#1a1a20]' : ''}`}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-transparent">
                      <AvatarImage src={f.otherUser.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-gray-800 text-white font-bold">{f.otherUser.ign?.[0]}</AvatarFallback>
                    </Avatar>
                    {isMe && (
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#111115] ${getStatusColor(f.richStatus)}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{f.otherUser.ign}</p>
                    <p className="text-[10px] text-gray-400">UID: {f.otherUser.unique_id}</p>
                    {isMe && (
                      <p className={`text-[10px] font-bold ${
                        f.richStatus === 'ONLINE' ? 'text-[#00e676]' : 
                        f.richStatus === 'IN_MATCH' ? 'text-[#ff5500]' : 'text-gray-500'
                      }`}>
                        {getStatusText(f.richStatus)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Full Profile Slider */}
        <Sheet open={!!selectedProfile} onOpenChange={(val) => !val && setSelectedProfile(null)}>
          <SheetContent className="bg-[#050505] border-[#1f2029] p-0 flex flex-col w-full sm:max-w-none sm:w-[500px] md:w-[600px] overflow-y-auto pt-16">
            {selectedProfile && (
              <PlayerProfile 
                inlineUid={selectedProfile.id} 
                isDrawer={true} 
                onClose={() => setSelectedProfile(null)} 
              />
            )}
          </SheetContent>
        </Sheet>
      </SheetContent>
    </Sheet>
  );
}
