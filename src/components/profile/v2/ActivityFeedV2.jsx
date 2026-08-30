import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Play, MoreVertical, Ban, Image as ImageIcon, MessageSquare, UserMinus, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { User, MediaPost, CommunityPost, Follower } from '@/api/entities';
import { toast } from 'sonner';
import { collection, query, orderBy, limit, getDocs, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';
import MediaPostCard from '@/components/media/MediaPostCard';
import { formatDistanceToNow } from 'date-fns';

// We keep activities as a fallback/skeleton if nothing loads
const fallbackActivities = [
  { id: 'fallback', type: 'reel', user: 'BattleHub', action: 'Welcome to BattleHub', context: 'Follow more friends to see their updates!', time: 'Now', avatar: 'https://cdn-icons-png.flaticon.com/512/8254/8254413.png', thumbnail: 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?q=80&w=1986&auto=format&fit=crop' }
];

export default function ActivityFeedV2({ player, limit: maxItems, onViewAll, hideHeader }) {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  
  // Local state to track blocks and unfollows made from this component without full reload
  const [localBlocked, setLocalBlocked] = useState([]);
  const [localUnfollowed, setLocalUnfollowed] = useState([]);
  const [localCleared, setLocalCleared] = useState([]);
  const [clearedAll, setClearedAll] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!player?.id) return;
    
    setLoading(true);

    let currentMediaData = [];
    let currentCommData = [];
    let currentFollowingIds = [];
    let initialLoadCounts = { media: false, comm: false, following: false };

    const combineAndRender = async () => {
      if (!initialLoadCounts.media || !initialLoadCounts.comm || !initialLoadCounts.following) return;
      
      try {
        let allPosts = [...currentMediaData, ...currentCommData].sort((a, b) => {
          return new Date(b.created_date || b.created_at).getTime() - new Date(a.created_date || a.created_at).getTime();
        });

        const followedIds = [...(player.friends || []), ...(player.following || []), ...currentFollowingIds];
        if (followedIds.length > 0) {
          allPosts = allPosts.filter(p => followedIds.includes(p.user_id || p.author_id));
        } else {
          allPosts = []; // Show nothing if not following anyone
        }

        // Fetch user info for each post
        const userCache = {};
        for (let post of allPosts) {
          const uid = post.user_id || post.author_id;
          if (!uid) continue;
          if (!userCache[uid]) {
            const u = await User.get(uid).catch(()=>null);
            if (u) userCache[uid] = u;
          }
          post.author = userCache[uid] || { ign: post.author_name || 'Unknown User', avatar_url: post.author_avatar || null };
        }

        // Format for UI
        const formatted = allPosts.map(post => {
          let actionText = '';
          let contextText = '';
          let icon = '';
          let thumb = '';
          let avatarStyle = 'p-1';
          
          if (post.feedType === 'media') {
             if (post.type === 'video' || post.type === 'short') {
               actionText = 'added a new reel';
               contextText = post.title || 'Watch now';
               icon = post.author_avatar || post.author.avatar_url || 'https://cdn-icons-png.flaticon.com/512/8254/8254413.png';
               thumb = post.thumbnail_url || post.video_url || 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?q=80&w=1986&auto=format&fit=crop';
               avatarStyle = 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950';
             } else {
               actionText = 'uploaded a photo';
               contextText = post.title || 'View photo';
               icon = post.author_avatar || post.author.avatar_url || 'https://cdn-icons-png.flaticon.com/512/3342/3342137.png';
               thumb = post.media_urls?.[0] || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop';
               avatarStyle = 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950';
             }
          } else {
             actionText = 'posted an update';
             contextText = post.text || post.content || '';
             icon = post.author_avatar || post.author.avatar_url || 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png';
             thumb = post.image_url || post.options?.[0]?.image_url || null;
             avatarStyle = 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950';
          }

          let timeStr = 'Just now';
          try {
            timeStr = formatDistanceToNow(new Date(post.created_date || post.created_at), { addSuffix: true });
          } catch(e) {}

          return {
            ...post,
            _feedItem: {
               id: post.id,
               type: post.feedType === 'media' && (post.type === 'video' || post.type === 'short') ? 'reel' : post.feedType,
               user: post.author_name || post.author.ign || post.author.name || 'Unknown User',
               action: actionText,
               context: contextText,
               time: timeStr,
               avatar: icon,
               avatarStyle: avatarStyle,
               thumbnail: thumb,
               rawPost: post
            }
          };
        });

        if (isMounted) {
          setFeedItems(formatted);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error combining feed items", err);
      }
    };

    const unsubMedia = onSnapshot(query(collection(db, 'media_posts'), orderBy('created_date', 'desc'), limit(20)), (snap) => {
      currentMediaData = snap.docs.map(d => ({ id: d.id, ...d.data(), feedType: 'media' }));
      initialLoadCounts.media = true;
      combineAndRender();
    }, (err) => console.error("Media snapshot error:", err));

    const unsubComm = onSnapshot(query(collection(db, 'community_posts'), orderBy('created_date', 'desc'), limit(20)), (snap) => {
      currentCommData = snap.docs.map(d => ({ id: d.id, ...d.data(), feedType: 'community' }));
      initialLoadCounts.comm = true;
      combineAndRender();
    }, (err) => console.error("Community snapshot error:", err));

    const unsubFollowing = onSnapshot(query(collection(db, 'followers'), where('follower_id', '==', player.id)), (snap) => {
      currentFollowingIds = snap.docs.map(d => d.data().following_id);
      initialLoadCounts.following = true;
      combineAndRender();
    }, (err) => console.error("Followers snapshot error:", err));

    const fallbackTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 4000);

    return () => {
      isMounted = false;
      unsubMedia();
      unsubComm();
      unsubFollowing();
      clearTimeout(fallbackTimeout);
    };
  }, [player?.id]);

  // Combine player's actual blocked list with locally blocked during this session
  const blockedUsers = [...(player?.blocked_users || []), ...localBlocked];
  const unfollowedUsers = [...localUnfollowed];

  // Filter out activities from blocked users and unfollowed users.
  const rawActivities = feedItems.length > 0 ? feedItems : fallbackActivities.map(f => ({ _feedItem: f, author: { ign: 'BattleHub' } }));
  const safeActivities = clearedAll ? [] : rawActivities.filter(post => {
    const uid = post.user_id || post.author_id;
    return !blockedUsers.includes(uid) && 
           !blockedUsers.includes(post._feedItem.user) &&
           !unfollowedUsers.includes(uid) &&
           !localCleared.includes(post.id || post._feedItem.id);
  });

  const displayActivities = maxItems ? safeActivities.slice(0, maxItems) : safeActivities;

  const handleClearAll = () => {
    setClearedAll(true);
    toast.success("All updates cleared from your view.");
  };

  useEffect(() => {
    const handleEvent = () => handleClearAll();
    window.addEventListener('clearActivityFeed', handleEvent);
    return () => window.removeEventListener('clearActivityFeed', handleEvent);
  }, []);

  const handleClearItem = (e, id) => {
    e.stopPropagation();
    setLocalCleared(prev => [...prev, id]);
  };

  const handleBlock = async (e, targetUserId, targetUserName) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to block ${targetUserName} and hide their updates?`)) {
      if (player?.id && targetUserId) {
        const currentList = player.blocked_users || [];
        await User.update(player.id, { blocked_users: [...currentList, targetUserId] });
        if (player) player.blocked_users = [...currentList, targetUserId];
      }
      setLocalBlocked(prev => [...prev, targetUserId, targetUserName]);
      toast.success(`${targetUserName} blocked. Their updates are hidden.`);
    }
  };

  const handleUnfollow = async (e, targetUserId, targetUserName) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to unfollow ${targetUserName}?`)) {
      if (player?.id && targetUserId) {
        // Also remove from Follower collection
        try {
          const rels = await Follower.filter({ follower_id: player.id, following_id: targetUserId });
          for (let rel of rels) {
            await Follower.delete(rel.id).catch(() => {});
          }
        } catch(err) {
          console.error(err);
        }

        const currentFriends = player.friends || [];
        const currentFollowing = player.following || [];
        const newFriends = currentFriends.filter(id => id !== targetUserId);
        const newFollowing = currentFollowing.filter(id => id !== targetUserId);
        
        await User.update(player.id, { friends: newFriends, following: newFollowing });
        if (player) {
           player.friends = newFriends;
           player.following = newFollowing;
        }
      }
      setLocalUnfollowed(prev => [...prev, targetUserId]);
      toast.success(`You unfollowed ${targetUserName}.`);
    }
  };

  const handleFeedItemClick = (e, post) => {
    e.stopPropagation();
    console.log("Clicked post:", post);
    if (post._feedItem.type === 'reel' || post._feedItem.type === 'media') {
      const raw = post._feedItem.rawPost || post;
      console.log("Raw media post:", raw);
      if (raw && (raw.id || raw.post_id)) {
        window.location.href = createPageUrl("MediaFeed") + `?postId=${raw.id || raw.post_id}`;
      } else {
        toast.error("Could not find post ID");
      }
    } else if (post._feedItem.type === 'community') {
      const raw = post._feedItem.rawPost || post;
      console.log("Raw comm post:", raw);
      if (raw && (raw.id || raw.post_id)) {
        window.location.href = createPageUrl("Community") + `?postId=${raw.id || raw.post_id}`;
      } else {
        toast.error("Could not find post ID");
      }
    }
  };

  if (loading) {
    return (
      <div className={`w-full ${hideHeader ? 'mt-4' : 'mt-8 mb-8'} bg-[#0c0d12] border border-slate-800 rounded-2xl flex flex-col overflow-hidden`}>
        {!hideHeader && (
          <div className="flex justify-between items-center px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
            <div className="h-4 w-32 bg-slate-800 rounded-md animate-pulse"></div>
            <div className="h-3 w-16 bg-slate-800 rounded-md animate-pulse"></div>
          </div>
        )}
        <div className="flex flex-col">
          {[1, 2, 3].map((_, index) => (
            <div 
              key={index}
              className={`p-4 sm:p-5 flex items-center justify-between gap-4 ${index !== 2 ? 'border-b border-slate-800' : ''}`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 animate-pulse shrink-0"></div>
                <div className="flex flex-col gap-2 w-full">
                  <div className="h-3 sm:h-4 w-3/4 bg-slate-800 rounded-md animate-pulse"></div>
                  <div className="h-2.5 sm:h-3 w-1/2 bg-slate-800 rounded-md animate-pulse"></div>
                </div>
              </div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-800 animate-pulse shrink-0"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayActivities.length === 0) {
    return (
      <div className={`w-full ${hideHeader ? 'mt-4' : 'mt-8 mb-8'} bg-[#0c0d12] border border-slate-800 rounded-2xl flex flex-col overflow-hidden p-8 items-center justify-center`}>
        <p className="text-gray-500 text-sm">No new updates right now.</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${hideHeader ? 'mt-4' : 'mt-8 mb-8'} bg-[#0c0d12] border border-slate-800 rounded-2xl flex flex-col overflow-hidden`}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex justify-between items-center px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
          <h3 className="font-bold text-white text-[13px] sm:text-sm uppercase tracking-widest">Following Updates</h3>
          <button 
            onClick={onViewAll}
            className="text-[#0ea5e9] hover:text-[#0ea5e9]/80 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            View All
          </button>
        </div>
      )}

      {/* Feed Container */}
      <div className="flex flex-col">
        {displayActivities.map((post, index) => {
          const activity = post._feedItem;
          const uid = post.user_id || post.author_id;
          return (
          <div 
            key={activity.id}
            onClick={(e) => handleFeedItemClick(e, post)}
            className={`p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-900 transition-colors cursor-pointer ${
              index !== displayActivities.length - 1 ? 'border-b border-slate-800' : ''
            }`}
          >
            {/* Left side: Avatar and Text */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 bg-slate-800 flex items-center justify-center ${activity.avatarStyle}`}>
                <img 
                  src={activity.avatar} 
                  alt="icon" 
                  className={activity.avatar.includes('flaticon.com') ? "w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-md" : "w-full h-full object-cover"}
                />
              </div>
              
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-[13px] sm:text-[15px] text-gray-300 leading-tight truncate">
                  <span className="font-bold text-white mr-1">{activity.user}</span> 
                  {activity.action}
                </p>
                {activity.type === 'reel' || activity.type === 'community' ? (
                  <p className="text-[12px] sm:text-[13px] text-blue-500 font-medium mt-1 truncate">
                    {activity.context}
                  </p>
                ) : (
                  <p className="text-[12px] sm:text-[13px] text-gray-400 mt-1 truncate">
                    {activity.context}
                  </p>
                )}
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-1">
                  {activity.time}
                </p>
              </div>
            </div>

            {/* Right side: Thumbnail and Action */}
            <div className="flex items-center gap-3">
              {activity.thumbnail && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-gray-800 bg-slate-900">
                  <img 
                    src={activity.thumbnail} 
                    alt="thumbnail" 
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
              )}

              {activity.type !== 'system' && (
                <div onClick={e => e.stopPropagation()}>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 bg-transparent text-gray-500 hover:text-white hover:bg-slate-800 rounded-full transition-all outline-none">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-white min-w-[150px] p-2 space-y-1">
                      <DropdownMenuItem 
                        className="text-gray-300 focus:bg-slate-800 focus:text-white cursor-pointer py-2.5 rounded-lg"
                        onClick={(e) => handleClearItem(e, post.id || activity.id)}
                      >
                        <X className="w-4 h-4 mr-2 opacity-50" />
                        Clear Update
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-gray-300 focus:bg-slate-800 focus:text-white cursor-pointer py-2.5 rounded-lg"
                        onClick={(e) => handleUnfollow(e, uid, activity.user)}
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfollow
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-orange-400 focus:bg-orange-500/10 focus:text-orange-400 cursor-pointer py-2.5 rounded-lg"
                        onClick={(e) => handleBlock(e, uid, activity.user)}
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Block User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        )})}
      </div>

    </div>
  );
}
