import React, { useState, useEffect } from 'react';
import { Friendship, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserMinus, UserCheck, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function FriendList({ user }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadFriends = async () => {
    setLoading(true);
    try {
      // Get all friendships where user is either user_id or friend_id
      const [sent, received] = await Promise.all([
        Friendship.filter({ user_id: user.id }),
        Friendship.filter({ friend_id: user.id })
      ]);
      
      const allRelations = [...sent, ...received];
      
      const pendingRecv = [];
      const acceptedList = [];
      
      for (const rel of allRelations) {
        // Resolve the other user's profile
        const otherId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
        const otherUser = await User.get(otherId).catch(() => null);
        if (!otherUser) continue;
        
        const data = { ...rel, otherUser };
        
        if (rel.status === 'accepted') {
          acceptedList.push(data);
        } else if (rel.status === 'pending' && rel.friend_id === user.id) {
          // It's a request received by me
          pendingRecv.push(data);
        }
      }
      
      setFriends(acceptedList);
      setRequests(pendingRecv);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFriends();
  }, [user]);

  const handleAccept = async (relId) => {
    try {
      await Friendship.update(relId, { status: 'accepted' });
      toast.success("Friend request accepted!");
      loadFriends();
    } catch (e) { toast.error("Error accepting request"); }
  };

  const handleReject = async (relId) => {
    try {
      await Friendship.delete(relId);
      toast.success("Request rejected");
      loadFriends();
    } catch (e) { toast.error("Error rejecting request"); }
  };

  const handleRemove = async (relId) => {
    if (!window.confirm("Remove this friend?")) return;
    try {
      await Friendship.delete(relId);
      toast.success("Friend removed");
      loadFriends();
    } catch (e) { toast.error("Error removing friend"); }
  };

  return (
    <div className="space-y-6">
      {/* Friend Requests */}
      {requests.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5">
            <h3 className="font-bold text-white mb-4">Pending Requests ({requests.length})</h3>
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={req.otherUser.avatar_url} />
                      <AvatarFallback>{req.otherUser.ign?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-white">{req.otherUser.ign}</p>
                      <p className="text-xs text-gray-400">UID: {req.otherUser.unique_id}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAccept(req.id)} className="bg-green-600 hover:bg-green-700 text-white"><UserCheck className="w-4 h-4 mr-1"/> Accept</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}><X className="w-4 h-4 mr-1"/> Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friend List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="font-bold text-white">All Friends ({friends.length})</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input 
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends..." className="pl-9 bg-gray-950 border-gray-800" 
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" /></div>
          ) : friends.length === 0 ? (
            <div className="text-center p-8 text-gray-500">You haven't added any friends yet. Search for players to add them!</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.filter(f => f.otherUser.ign?.toLowerCase().includes(search.toLowerCase())).map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-4 bg-gray-800/30 border border-gray-800 rounded-xl hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = `/PlayerProfile?uid=${friend.otherUser.id}`}>
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={friend.otherUser.avatar_url} />
                        <AvatarFallback>{friend.otherUser.ign?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${friend.otherUser.activity_status === 'Online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{friend.otherUser.ign}</p>
                      <p className="text-xs text-gray-400">{friend.otherUser.activity_status || 'Offline'}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleRemove(friend.id)} className="text-gray-500 hover:text-red-400 hover:bg-red-900/20">
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
