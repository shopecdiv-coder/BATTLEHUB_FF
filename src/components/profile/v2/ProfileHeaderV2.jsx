import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, UserPlus, UserMinus, MessageSquare, Users, ChevronDown, CheckCircle2, Star, Edit, Heart, Settings, Download, Bookmark, Lock, Search, Instagram, Youtube, Facebook, Twitter, Twitch, Link as LinkIcon, ShieldAlert, MoreVertical, ThumbsUp } from 'lucide-react';
import ProfileSettingsDrawer from './ProfileSettingsDrawer';
import AddFriendDrawer from './AddFriendDrawer';
import FollowersDrawer from './FollowersDrawer';
import FriendsDrawer from './FriendsDrawer';
import MessagesDrawer from './MessagesDrawer';
import ReputationDrawer from './ReputationDrawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Friendship, Follower, ReputationLog, ProfileLike, calculateLevelFromXP, getXPForLevel, Notification } from '@/api/entities';
import { Report } from '@/entities/Report';
import { User } from '@/entities/User';
import { db, auth } from '@/api/firebaseClient';
import { collection, query, where, onSnapshot, getDocs, documentId, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

const copyText = (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (error) {
      console.error('Fallback copy failed', error);
    }
    textArea.remove();
  }
};

const getSocialIcon = (url) => {
  if (!url) return null;
  const lurl = url.toLowerCase();
  if (lurl.includes('instagram.com')) return <Instagram className="w-4 h-4" />;
  if (lurl.includes('youtube.com') || lurl.includes('youtu.be')) return <Youtube className="w-4 h-4" />;
  if (lurl.includes('facebook.com') || lurl.includes('fb.com')) return <Facebook className="w-4 h-4" />;
  if (lurl.includes('twitter.com') || lurl.includes('x.com')) return <Twitter className="w-4 h-4" />;
  if (lurl.includes('discord.gg') || lurl.includes('discord.com')) return <MessageSquare className="w-4 h-4" />;
  if (lurl.includes('twitch.tv')) return <Twitch className="w-4 h-4" />;
  return <LinkIcon className="w-4 h-4" />;
};

const formatUrl = (url) => {
  if (!url) return '#';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
};

export default function ProfileHeaderV2({ player, isMe = false, unreadMessages = 0, requestsUnread = 0, groupUnread = 0, isFriend = false }) {
  const [realFriendsCount, setRealFriendsCount] = useState(null);
  const [realFollowersCount, setRealFollowersCount] = useState(null);
  const [realFollowingCount, setRealFollowingCount] = useState(null);
  const [directRequestStatus, setDirectRequestStatus] = useState(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  
  // Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReasonCategory, setReportReasonCategory] = useState(null);
  const [reportSeverity, setReportSeverity] = useState(0);
  const [reportDescription, setReportDescription] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  // Like System State
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);

  useEffect(() => {
    if (player) {
      setLikesCount(player.likes_count || 0);
    }
  }, [player]);

  useEffect(() => {
    if (!player?.id || !auth.currentUser) return;
    const checkLike = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'profile_likes'), where('target_id', '==', player.id), where('sender_id', '==', auth.currentUser.uid)));
        setHasLiked(!snap.empty);
      } catch (e) {
        console.error("Error checking like status", e);
      }
    };
    checkLike();
  }, [player?.id, auth.currentUser]);

  const handleToggleLike = async () => {
    if (!auth.currentUser || !player?.id || isLiking) return;
    setIsLiking(true);
    
    try {
      if (hasLiked) {
        // Unlike
        const snap = await getDocs(query(collection(db, 'profile_likes'), where('target_id', '==', player.id), where('sender_id', '==', auth.currentUser.uid)));
        const deletePromises = snap.docs.map(d => ProfileLike.delete(d.id));
        await Promise.all(deletePromises);
        setHasLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        await User.update(player.id, { likes_count: Math.max(0, (player.likes_count || 0) - 1) });
      } else {
        // Like
        await ProfileLike.create({
          target_id: player.id,
          sender_id: auth.currentUser.uid,
          timestamp: new Date().toISOString()
        });
        setHasLiked(true);
        setLikesCount(prev => prev + 1);
        await User.update(player.id, { likes_count: (player.likes_count || 0) + 1 });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to update like");
    }
    setIsLiking(false);
  };

  useEffect(() => {
    if (!player?.id || !auth.currentUser) return;
    
    const uid = auth.currentUser.uid;
    const pid = player.id;
    let docs1 = [];
    let docs2 = [];
    
    const updateStatus = () => {
      const allDocs = [...docs1, ...docs2];
      if (allDocs.some(d => d.status?.toLowerCase() === 'accepted')) {
        setDirectRequestStatus('accepted');
      } else if (allDocs.some(d => d.status?.toLowerCase() === 'pending')) {
        setDirectRequestStatus('pending');
      } else {
        setDirectRequestStatus(null);
      }
    };

    const unsub1 = onSnapshot(query(collection(db, 'friendships'), where('user_id', '==', uid), where('friend_id', '==', pid)), (snap) => {
      docs1 = snap.docs.map(d => d.data());
      updateStatus();
    });
    
    const unsub2 = onSnapshot(query(collection(db, 'friendships'), where('friend_id', '==', uid), where('user_id', '==', pid)), (snap) => {
      docs2 = snap.docs.map(d => d.data());
      updateStatus();
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [player?.id, auth.currentUser]);

  const handleAddFriendDirectly = async () => {
    if (!auth.currentUser || !player?.id) return;
    if (directRequestStatus === 'pending') {
      toast.error("Request already pending!");
      return;
    }
    if (directRequestStatus === 'accepted') {
      toast.error("Already friends!");
      return;
    }
    try {
      setIsSendingRequest(true);
      await Friendship.create({
        user_id: auth.currentUser.uid,
        friend_id: player.id,
        status: 'pending'
      });
      
      await Notification.create({
        recipient_id: player.id,
        type: "Friend Request",
        title: "🤝 New Friend Request",
        message: `${auth.currentUser.displayName || 'Someone'} sent you a friend request!`,
        link: `/profile?uid=${auth.currentUser.uid}`,
        priority: "High",
        dismissable: true,
        created_at: new Date().toISOString()
      }).catch(err => console.error("Notification error:", err));

      toast.success("Friend request sent!");
    } catch (e) {
      toast.error("Error sending friend request");
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!auth.currentUser || !player?.id) return;
    try {
      const q1 = query(collection(db, 'friendships'), where('user_id', '==', auth.currentUser.uid), where('friend_id', '==', player.id));
      const q2 = query(collection(db, 'friendships'), where('friend_id', '==', auth.currentUser.uid), where('user_id', '==', player.id));
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      if (!snap1.empty) {
        await Friendship.delete(snap1.docs[0].id);
      } else if (!snap2.empty) {
        await Friendship.delete(snap2.docs[0].id);
      }
      toast.success("Friend removed");
    } catch (e) {
      toast.error("Error removing friend");
    }
  };

  const handleReport = (reason, severity) => {
    if (!auth.currentUser || !player?.id) return;
    setReportReasonCategory(reason);
    setReportSeverity(severity);
    setReportDescription("");
    setReportModalOpen(true);
  };

  const submitReport = async () => {
    if (!auth.currentUser || !player?.id) return;
    if (!reportDescription.trim()) {
      toast.error("Please provide a reason for reporting");
      return;
    }
    setIsReporting(true);
    try {
      const currentUser = await User.get(auth.currentUser.uid);
      await Report.create({
        type: 'reputation',
        reported_user_id: player.id,
        reported_ign: player.ign || 'Unknown',
        reporter_id: auth.currentUser.uid,
        reporter_ign: currentUser?.ign || 'Unknown',
        reason: reportReasonCategory,
        description: reportDescription,
        severity: reportSeverity,
        status: 'Pending',
        created_date: new Date().toISOString()
      });
      toast.success("Report submitted for admin review!");
      setReportModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit report");
    } finally {
      setIsReporting(false);
    }
  };


  useEffect(() => {
    if (!player?.id) return;
    
    let sentFriends = [];
    let receivedFriends = [];
    
    const updateFriends = () => {
       const all = [...sentFriends, ...receivedFriends];
       const unique = new Set(all.map(f => f.user_id === player.id ? f.friend_id : f.user_id));
       setRealFriendsCount(unique.size);
    };

    const unsubSent = onSnapshot(
      query(collection(db, 'friendships'), where('user_id', '==', player.id), where('status', '==', 'accepted')), 
      (snap) => {
        sentFriends = snap.docs.map(d => ({id: d.id, ...d.data()}));
        updateFriends();
      }
    );

    const unsubReceived = onSnapshot(
      query(collection(db, 'friendships'), where('friend_id', '==', player.id), where('status', '==', 'accepted')), 
      (snap) => {
        receivedFriends = snap.docs.map(d => ({id: d.id, ...d.data()}));
        updateFriends();
      }
    );

    const unsubFollowers = onSnapshot(
      query(collection(db, 'followers'), where('following_id', '==', player.id)), 
      async (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Deduplicate by follower_id
        const seen = new Set();
        const uniqueDocs = [];
        for (const d of docs) {
          if (!d.follower_id || seen.has(d.follower_id)) {
            // Delete duplicate or invalid
            deleteDoc(doc(db, 'followers', d.id)).catch(() => {});
            continue;
          }
          seen.add(d.follower_id);
          uniqueDocs.push(d);
        }
        // Validate that each follower_id user actually exists
        const idsToCheck = uniqueDocs.map(d => d.follower_id).filter(Boolean);
        const existingIds = new Set();
        const chunks = [];
        for (let i = 0; i < idsToCheck.length; i += 10) chunks.push(idsToCheck.slice(i, i + 10));
        for (const chunk of chunks) {
          try {
            const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            const uSnap = await getDocs(q);
            uSnap.docs.forEach(d => existingIds.add(d.id));
          } catch(e) { console.error(e); }
        }
        // Delete orphaned follower records
        for (const d of uniqueDocs) {
          if (!existingIds.has(d.follower_id)) {
            deleteDoc(doc(db, 'followers', d.id)).catch(() => {});
          }
        }
        setRealFollowersCount(existingIds.size);
      }
    );

    const unsubFollowing = onSnapshot(
      query(collection(db, 'followers'), where('follower_id', '==', player.id)), 
      async (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Deduplicate by following_id
        const seen = new Set();
        const uniqueDocs = [];
        for (const d of docs) {
          if (!d.following_id || seen.has(d.following_id)) {
            deleteDoc(doc(db, 'followers', d.id)).catch(() => {});
            continue;
          }
          seen.add(d.following_id);
          uniqueDocs.push(d);
        }
        // Validate that each following_id user actually exists
        const idsToCheck = uniqueDocs.map(d => d.following_id).filter(Boolean);
        const existingIds = new Set();
        const chunks = [];
        for (let i = 0; i < idsToCheck.length; i += 10) chunks.push(idsToCheck.slice(i, i + 10));
        for (const chunk of chunks) {
          try {
            const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            const uSnap = await getDocs(q);
            uSnap.docs.forEach(d => existingIds.add(d.id));
          } catch(e) { console.error(e); }
        }
        // Delete orphaned follower records
        for (const d of uniqueDocs) {
          if (!existingIds.has(d.following_id)) {
            deleteDoc(doc(db, 'followers', d.id)).catch(() => {});
          }
        }
        setRealFollowingCount(existingIds.size);
      }
    );

    return () => {
      unsubSent();
      unsubReceived();
      unsubFollowers();
      unsubFollowing();
    };
  }, [player?.id]);
  // Safe fallbacks
  const ign = player?.ign || "Unknown Player";
  const uid = player?.unique_id || player?.id?.substring(0, 8) || "N/A";
  const game = player?.game || 'FF';
  const gameId = player?.game_id || '';
  const avatarUrl = (!isMe && !isFriend && player?.is_private) ? "" : (player?.avatar_url || "");
  const bannerUrl = player?.banner_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop";
  const joinDateStr = player?.created_date || player?.created_at;
  const joinDate = joinDateStr ? new Date(joinDateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "May 2023";
  const getStatus = () => {
    if (!player) return { text: 'Offline', color: 'bg-gray-500', textColor: 'text-gray-500 font-medium' };
    
    const status = player.activity_status || 'Offline';
    
    if (status === 'In Match') {
      return { text: 'In Match', color: 'bg-[#0ea5e9]', textColor: 'text-[#0ea5e9] font-medium' };
    }
    
    if (status === 'Online') {
      const diff = new Date() - new Date(player.last_active || 0);
      if (isMe || diff < 15 * 60 * 1000) {
        return { text: 'Online', color: 'bg-[#00e676]', textColor: 'text-gray-300 font-medium' };
      }
    }
    
    return { text: 'Offline', color: 'bg-gray-500', textColor: 'text-gray-500 tracking-wide' };
  };

  const currentStatus = getStatus();
  const points = player?.season_points || 6234;

  return (
    <div className="rounded-2xl overflow-hidden mb-6 border border-gray-800 bg-slate-950 flex flex-col">
      {/* Top Banner Section (Covers Avatar, Info, and Rank) */}
      <div 
        className="w-full bg-cover bg-center relative p-4 sm:p-6"
        style={{ backgroundImage: `url(${bannerUrl})` }}
      >
        {/* Gradients for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
        <div className="absolute inset-0 bg-black/40" />

        {/* Top Right Action & Social Buttons */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex flex-col gap-2 items-end">
          {isMe ? (
            <ProfileSettingsDrawer user={player}>
              <button 
                className="p-1.5 sm:p-2 bg-black/50 hover:bg-[#0ea5e9]/80 rounded-full text-white backdrop-blur-md transition-all border border-gray-600/50 hover:border-[#0ea5e9]"
              >
                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </ProfileSettingsDrawer>
          ) : (
            <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 sm:p-2 bg-black/50 hover:bg-[#0ea5e9]/80 rounded-full text-white backdrop-blur-md transition-all border border-gray-600/50 hover:border-[#0ea5e9] outline-none">
                    <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 z-[1000]">
                  {directRequestStatus === 'accepted' && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRemoveFriend(); }} className="text-gray-300 focus:text-white focus:bg-slate-800 cursor-pointer">
                      <UserMinus className="mr-2 w-4 h-4" /> Remove Friend
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReport('Fraud', 0.5); }} className="text-red-500 focus:text-red-400 focus:bg-slate-800 cursor-pointer mt-1">
                    <ShieldAlert className="mr-2 w-4 h-4" /> Report Fraud (-0.5)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReport('Toxic Behavior', 0.2); }} className="text-orange-500 focus:text-orange-400 focus:bg-slate-800 cursor-pointer mt-1">
                    <ShieldAlert className="mr-2 w-4 h-4" /> Report Toxicity (-0.2)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReport('Cheating', 0.5); }} className="text-red-500 focus:text-red-400 focus:bg-slate-800 cursor-pointer mt-1">
                    <ShieldAlert className="mr-2 w-4 h-4" /> Report Cheater (-0.5)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReport('AFK', 0.1); }} className="text-orange-500 focus:text-orange-400 focus:bg-slate-800 cursor-pointer mt-1">
                    <ShieldAlert className="mr-2 w-4 h-4" /> Report AFK (-0.1)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Bottom Right Social Links (Above Friends button) */}
        {(player?.social_link_1 || player?.instagram_url || player?.social_link_2 || player?.youtube_url) && (
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30 flex flex-row gap-2 items-center">
            {(player?.social_link_1 || player?.instagram_url) && (
              <a href={formatUrl(player?.social_link_1 || player?.instagram_url)} target="_blank" rel="noopener noreferrer" className="p-1.5 sm:p-2 bg-black/50 hover:bg-[#0ea5e9]/80 rounded-full text-white backdrop-blur-md transition-all border border-gray-600/50 hover:border-[#0ea5e9] shadow-lg relative cursor-pointer pointer-events-auto">
                {getSocialIcon(player?.social_link_1 || player?.instagram_url)}
              </a>
            )}
            
            {(player?.social_link_2 || player?.youtube_url) && (
              <a href={formatUrl(player?.social_link_2 || player?.youtube_url)} target="_blank" rel="noopener noreferrer" className="p-1.5 sm:p-2 bg-black/50 hover:bg-[#0ea5e9]/80 rounded-full text-white backdrop-blur-md transition-all border border-gray-600/50 hover:border-[#0ea5e9] shadow-lg relative cursor-pointer pointer-events-auto">
                {getSocialIcon(player?.social_link_2 || player?.youtube_url)}
              </a>
            )}
          </div>
        )}

        <div className="relative z-10 flex flex-row items-center justify-between w-full mt-4 sm:mt-0">
          
          <div className="flex flex-row gap-4 items-center w-full">
            {/* Avatar Container */}
            <div className="relative shrink-0">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-[#0ea5e9]/80 shadow-[0_0_8px_rgba(255,85,0,0.15)]">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-gray-900 text-white font-bold text-2xl">{ign[0]}</AvatarFallback>
              </Avatar>
              

              {/* Level Badge */}
              <div 
                onClick={() => setIsLevelModalOpen(true)}
                className="absolute bottom-0 -right-2 bg-slate-950 border-2 border-[#0ea5e9] text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 cursor-pointer hover:bg-slate-900 transition-colors flex items-center justify-center min-w-[30px]"
              >
                {calculateLevelFromXP(player?.xp || 0)}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">{ign}</h1>
                {player?.role === 'admin' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                )}
              </div>
              
              {player?.full_name && (
                <div className="text-[13px] font-medium text-gray-400 mb-2 italic">
                  {player.full_name}
                </div>
              )}
              
              <div className="flex flex-col gap-1 text-[12px] sm:text-[13px] text-gray-400 mb-2 font-medium">
                <div className="flex flex-col gap-1">
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
                      onClick={() => {
                        copyText(uid || '');
                        toast.success("BATTLEHUB ID copied to clipboard!");
                      }}
                    >
                    <span>BATTLEHUB ID: {uid}</span>
                    <Copy className="w-3.5 h-3.5" />
                  </div>
                  {gameId && (
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
                        onClick={() => {
                          copyText(gameId || '');
                          toast.success(`${game} ID copied to clipboard!`);
                        }}
                      >
                      <span>{game} ID: {gameId}</span>
                      <Copy className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span>🇮🇳 India</span>
                  <span className="text-gray-500 text-[8px]">●</span>
                  <span>Joined {joinDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[12px] mt-1">
                <div className={`w-2.5 h-2.5 rounded-full ${currentStatus.color}`} />
                <span className={currentStatus.textColor}>{currentStatus.text}</span>
                
                <div className="w-px h-3 bg-gray-700 mx-1"></div>

                {/* Like Button */}
                <button 
                  onClick={handleToggleLike}
                  disabled={isLiking}
                  className={`flex items-center gap-1.5 rounded-full text-sm font-bold transition-all ${
                    hasLiked 
                      ? 'text-[#fb923c]' 
                      : 'text-gray-400 hover:text-white'
                  } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-[#fb923c]' : ''}`} />
                  {likesCount > 0 && <span>{likesCount}</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Rank Card (Right aligned) */}
          <div className="hidden sm:flex flex-col items-center justify-center p-3 rounded-xl min-w-[120px] shrink-0">
             <div className="text-6xl mb-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">🌟</div>
             <p className="text-white font-bold text-sm">Conqueror</p>
             <div className="flex items-center gap-1 text-yellow-500 text-sm font-black mt-1">
               <Star className="w-3.5 h-3.5 fill-yellow-500" /> {points}
             </div>
          </div>
        </div>
      </div>

      {/* Social Stats (Followers / Following) Below the banner area - ONLY FOR SELF */}
      {isMe && (
        <div className="px-3 sm:px-6 py-4 flex flex-row items-center justify-between w-full gap-2 border-t border-gray-800/50 bg-slate-950">
          {(!isMe && !isFriend && player?.is_private) ? (
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg py-2 flex flex-col items-center justify-center opacity-80 cursor-not-allowed">
                <span className="text-[10px] sm:text-xs text-gray-500 font-bold tracking-wider uppercase mb-0.5">Followers</span>
                <span className="text-sm sm:text-lg font-black text-white">{realFollowersCount !== null ? realFollowersCount : (player?.followers_count || 0)}</span>
              </div>
          ) : (
              <FollowersDrawer user={player} type="followers" isMe={isMe}>
                <button className="w-full flex-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors rounded-lg py-2 flex flex-col items-center justify-center">
                  <span className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider uppercase mb-0.5">Followers</span>
                  <span className="text-sm sm:text-lg font-black text-white">{realFollowersCount !== null ? realFollowersCount : (player?.followers_count || 0)}</span>
                </button>
              </FollowersDrawer>
          )}
          
          {(!isMe && !isFriend && player?.is_private) ? (
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg py-2 flex flex-col items-center justify-center opacity-80 cursor-not-allowed">
                <span className="text-[10px] sm:text-xs text-gray-500 font-bold tracking-wider uppercase mb-0.5">Following</span>
                <span className="text-sm sm:text-lg font-black text-white">{realFollowingCount !== null ? realFollowingCount : (player?.following_count || 0)}</span>
              </div>
          ) : (
              <FollowersDrawer user={player} type="following" isMe={isMe}>
                <button className="w-full flex-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors rounded-lg py-2 flex flex-col items-center justify-center">
                  <span className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider uppercase mb-0.5">Following</span>
                  <span className="text-sm sm:text-lg font-black text-white">{realFollowingCount !== null ? realFollowingCount : (player?.following_count || 0)}</span>
                </button>
              </FollowersDrawer>
          )}
        </div>
      )}

      {/* Social Stats Row */}
      <div className="px-2 sm:px-6 py-3 pb-4 bg-slate-950 border-t border-gray-800/50">
        <div className="grid grid-cols-4 gap-1 sm:gap-2 w-full">
          {/* Add Friend */}
          {(!isMe && !isFriend && player?.is_private) ? (
            <button disabled className="w-full bg-[#0c0d12] border border-slate-800 rounded-lg p-1.5 sm:p-2.5 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-2 text-center sm:text-left cursor-not-allowed opacity-80">
              <UserPlus className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500 shrink-0" />
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-[10px] sm:text-[12px] text-gray-500 font-semibold tracking-wide">Add Friend</span>
              </div>
            </button>
          ) : isMe ? (
            <MessagesDrawer user={player}>
              <button className="w-full bg-[#0c0d12] border border-slate-800 hover:bg-[#1a1b26] hover:border-[#383a4d] transition-colors rounded-lg p-1.5 sm:p-2.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center cursor-pointer">
                <div className="relative flex flex-col items-center">
                  <MessageSquare className="w-4 h-4 sm:w-6 sm:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] shrink-0" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-3 min-w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white px-1 shadow-[0_0_8px_rgba(239,68,68,0.5)] z-10">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span className="text-[10px] sm:text-[12px] text-gray-200 mt-1 font-semibold tracking-wide">Message</span>
              </button>
            </MessagesDrawer>
          ) : (
            directRequestStatus === 'accepted' ? (
              <FriendsDrawer user={player} isMe={false}>
                <button className="relative w-full bg-[#0c0d12] border border-slate-800 hover:bg-[#1a1b26] hover:border-[#383a4d] transition-colors rounded-lg p-1.5 sm:p-2.5 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-2 text-center sm:text-left">
                  <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-[#00e676] drop-shadow-[0_0_8px_rgba(0,230,118,0.3)] shrink-0" />
                  <div className="flex flex-col items-center sm:items-start">
                    <span className="text-[10px] sm:text-[12px] text-gray-200 font-semibold tracking-wide">Friends</span>
                  </div>
                </button>
              </FriendsDrawer>
            ) : (
              <button disabled={isSendingRequest || directRequestStatus === 'pending'} onClick={handleAddFriendDirectly} className={`relative w-full bg-[#0c0d12] border border-slate-800 hover:bg-[#1a1b26] hover:border-[#383a4d] transition-colors rounded-lg p-1.5 sm:p-2.5 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-2 text-center sm:text-left ${(isSendingRequest || directRequestStatus) ? 'opacity-80 cursor-not-allowed' : ''}`}>
                <UserPlus className={`w-4 h-4 sm:w-6 sm:h-6 ${directRequestStatus === 'pending' ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]' : 'text-gray-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'} shrink-0`} />
                <div className="flex flex-col items-center sm:items-start">
                  <span className={`text-[10px] sm:text-[12px] font-semibold tracking-wide ${directRequestStatus === 'pending' ? 'text-yellow-500' : 'text-gray-200'}`}>
                    {directRequestStatus === 'pending' ? 'Requested' : 'Add Friend'}
                  </span>
                </div>
              </button>
            )
          )}

          {/* Box 2: Message (if isMe) or Followers (if !isMe) */}
          {isMe ? (
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-groups-panel'))} 
              className="w-full bg-[#0c0d12] border border-slate-800 hover:bg-[#1a1b26] hover:border-[#383a4d] transition-colors rounded-lg p-1.5 sm:p-2.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center cursor-pointer"
            >
              <div className="relative flex flex-col items-center">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] shrink-0" />
                {groupUnread > 0 && (
                  <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)] z-10">
                    {groupUnread > 99 ? '99+' : groupUnread}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[12px] text-gray-200 mt-1 font-semibold tracking-wide">My Groups</span>
            </button>
          ) : (
            (!isMe && !isFriend && player?.is_private) ? (
              <button className="w-full bg-[#0c0d12] border border-slate-800 rounded-lg p-1.5 sm:p-2.5 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-2 text-center sm:text-left cursor-not-allowed opacity-80">
                <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500 shrink-0" />
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-[10px] sm:text-[12px] text-gray-500 font-semibold tracking-wide">Followers</span>
                  <span className="text-[11px] sm:text-sm font-black text-white">
                    {realFollowersCount !== null ? realFollowersCount : (player?.followers_count || 0)}
                  </span>
                </div>
              </button>
            ) : (
              <FollowersDrawer user={player} type="followers" isMe={isMe}>
                <button className="w-full bg-[#0c0d12] border border-slate-800 hover:bg-[#1a1b26] hover:border-[#383a4d] transition-colors rounded-lg p-1.5 sm:p-2.5 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-2 text-center sm:text-left">
                  <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] shrink-0" />
                  <div className="flex flex-col items-center sm:items-start">
                    <span className="text-[10px] sm:text-[12px] text-gray-200 font-semibold tracking-wide">Followers</span>
                    <span className="text-[11px] sm:text-sm font-black text-white">
                      {realFollowersCount !== null ? realFollowersCount : (player?.followers_count || 0)}
                    </span>
                  </div>
                </button>
              </FollowersDrawer>
            )
          )}

          {/* Box 3: Friends (if isMe) or Following (if !isMe) */}
          {isMe ? (
            <FriendsDrawer user={player} isMe={isMe}>
              <button className="w-full bg-[#0c0d12] border border-slate-800 hover:bg-[#1a1b26] hover:border-[#383a4d] transition-colors rounded-lg p-1.5 sm:p-2.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center cursor-pointer">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] shrink-0" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] sm:text-[12px] text-gray-200 mt-1 font-semibold tracking-wide">Friends</span>
                </div>
              </button>
            </FriendsDrawer>
          ) : (
            (!isMe && !isFriend && player?.is_private) ? (
              <button className="w-full bg-[#0c0d12] border border-slate-800 rounded-lg p-1.5 sm:p-2.5 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-2 text-center sm:text-left cursor-not-allowed opacity-80">
                <UserPlus className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500 shrink-0" />
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-[10px] sm:text-[12px] text-gray-500 font-semibold tracking-wide">Following</span>
                  <span className="text-[11px] sm:text-sm font-black text-white">
                    {realFollowingCount !== null ? realFollowingCount : (player?.following_count || 0)}
                  </span>
                </div>
              </button>
            ) : (
              <FollowersDrawer user={player} type="following" isMe={isMe}>
                <button className="w-full bg-[#0c0d12] border border-slate-800 hover:bg-[#1a1b26] hover:border-[#383a4d] transition-colors rounded-lg p-1.5 sm:p-2.5 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-2 text-center sm:text-left">
                  <UserPlus className="w-4 h-4 sm:w-6 sm:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] shrink-0" />
                  <div className="flex flex-col items-center sm:items-start">
                    <span className="text-[10px] sm:text-[12px] text-gray-200 font-semibold tracking-wide">Following</span>
                    <span className="text-[11px] sm:text-sm font-black text-white">
                      {realFollowingCount !== null ? realFollowingCount : (player?.following_count || 0)}
                    </span>
                  </div>
                </button>
              </FollowersDrawer>
            )
          )}
          {/* Reputation */}
          <ReputationDrawer user={player} isMe={isMe}>
            <button className="w-full bg-[#0c0d12] border border-slate-800 hover:bg-[#1a1b26] hover:border-[#383a4d] transition-colors rounded-lg p-1.5 sm:p-2.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center cursor-pointer">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-500 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)] shrink-0" />
                <span className="text-[11px] sm:text-sm font-black text-white">{player?.reputation_score !== undefined ? Number(player.reputation_score).toFixed(1) : "5.0"}</span>
              </div>
              <span className="text-[10px] sm:text-[12px] text-gray-200 font-semibold tracking-wide">Reputation</span>
            </button>
          </ReputationDrawer>
        </div>
      </div>

      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-white z-[1000]">
          <DialogHeader>
            <DialogTitle>Report {player?.ign}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please explain why you are reporting this player for <strong>{reportReasonCategory}</strong>. This will be reviewed by an admin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason" className="text-gray-300">Detailed Reason</Label>
              <Textarea
                id="reason"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="What exactly happened?"
                className="col-span-3 bg-slate-900 border-slate-700 min-h-[100px] text-gray-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportModalOpen(false)} disabled={isReporting} className="bg-slate-900 border-slate-700 text-gray-300 hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={submitReport} disabled={isReporting} className="bg-red-500 hover:bg-red-600 text-white">
              {isReporting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Level Info Modal */}
      <Dialog open={isLevelModalOpen} onOpenChange={setIsLevelModalOpen}>
        <DialogContent className="bg-[#0a0f18] border-none text-white max-w-[320px] rounded-2xl p-6 shadow-2xl overflow-hidden pt-safe z-[1000]">
          <div className="flex flex-col items-center gap-3">
            <p className="text-gray-400 text-[13px] font-bold tracking-wider">
              TOTAL XP: <span className="text-[#00aaff]">{player?.xp || 0}</span>
            </p>
            
            <div className="w-full bg-[#1a2332] rounded-full h-3 overflow-hidden relative mt-1 mb-1">
              <div 
                className="bg-[#00aaff] h-full rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${Math.min(100, Math.max(0, (((player?.xp || 0) - getXPForLevel(calculateLevelFromXP(player?.xp || 0))) / (getXPForLevel(calculateLevelFromXP(player?.xp || 0) + 1) - getXPForLevel(calculateLevelFromXP(player?.xp || 0)))) * 100))}%` }}
              ></div>
            </div>
            
            <p className="text-gray-400 text-xs">
              <span className="font-black text-white">{getXPForLevel(calculateLevelFromXP(player?.xp || 0) + 1) - (player?.xp || 0)} XP</span> needed for Level {calculateLevelFromXP(player?.xp || 0) + 1}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
