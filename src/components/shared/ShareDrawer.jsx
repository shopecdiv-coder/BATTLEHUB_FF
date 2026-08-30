import React, { useState, useEffect } from "react";
import { X, Send, CheckCircle2, Share2, Link as LinkIcon, Loader2 } from "lucide-react";
import { Friendship, User, GroupChatMessage } from "@/api/entities";
import { doc, setDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import { Share } from '@capacitor/share';

let cachedFriends = null;
let cachedGroups = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function ShareDrawer({ open, shareUrl, shareText, shareType = 'link', user, onClose, hideMoreOptions = false }) {
  const [friends, setFriends] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentList, setSentList] = useState(new Set());
  const [sendingTo, setSendingTo] = useState(null);

  useEffect(() => {
    if (!user || !open) {
      setLoading(false);
      return;
    }

    const loadFriendsAndGroups = async () => {
      if (cachedFriends && cachedGroups && (Date.now() - lastCacheTime < CACHE_DURATION)) {
        setFriends(cachedFriends);
        setUserGroups(cachedGroups);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [sent, received] = await Promise.all([
          Friendship.filter({ user_id: user.id }),
          Friendship.filter({ friend_id: user.id })
        ]);
        const allRelations = [...sent, ...received].filter(rel => rel.status === 'accepted');
        
        const uniqueConvos = [];
        const seen = new Set();
        
        for (const rel of allRelations) {
          const otherId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
          if (!seen.has(otherId)) {
            seen.add(otherId);
            uniqueConvos.push(otherId);
          }
        }
        
        const convos = await Promise.all(
          uniqueConvos.map(async (otherId) => await User.get(otherId).catch(() => null))
        );
        
        setFriends(convos.filter(Boolean));

        // Load Groups
        const q = query(
          collection(db, "user_groups"),
          where("members", "array-contains", user.id)
        );
        const docs = await getDocs(q);
        const gList = docs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const allowedGroups = gList.filter(g => {
          if (g.settings_send_messages === 'admins') {
            return g.admins && g.admins.includes(user.id);
          }
          return true; // 'all'
        });
        
        cachedFriends = convos.filter(Boolean);
        cachedGroups = allowedGroups;
        lastCacheTime = Date.now();
        
        setFriends(cachedFriends);
        setUserGroups(cachedGroups);
      } catch(e) {
        console.error("Failed to load friends and groups", e);
      }
      setLoading(false);
    };

    loadFriendsAndGroups();
  }, [user, open]);

  const handleSend = async (targetId, isGroup = false) => {
    if (!user) return;
    setSendingTo(targetId);
    
    try {
      const filteredMessage = `${shareText}\n\n${shareUrl}`;
      const groupId = isGroup ? targetId : `direct_${[user.id, targetId].sort().join('_')}`;

      // Create message in GroupChatMessage (which is what SharedChatInterface uses)
      await GroupChatMessage.create({
        user_id: user.id,
        username: user.full_name || user.ign || 'User',
        user_ign: user.ign || user.full_name || 'User',
        avatar_url: user.avatar_url || '',
        sender_email: user.email || '',
        sender_role: user.role || 'user',
        message: filteredMessage,
        message_type: shareType,
        reply_to_id: null,
        reply_to_text: null,
        reply_to_user: null,
        reply_to_type: 'text',
        is_deleted: false,
        is_pinned: false,
        is_read: false,
        reactions: { likes: [], hearts: [], laughs: [], fire: [], claps: [] },
        created_at: new Date().toISOString(),
        group_id: groupId
      });

      if (!isGroup) {
        // Update the direct_chats metadata for the drawer list
        const chatRef = doc(db, "direct_chats", groupId);
        await setDoc(chatRef, {
          participants: [user.id, targetId],
          [`unread_count_${targetId}`]: increment(1),
          last_message: 'Shared a link',
          last_message_timestamp: new Date().toISOString(),
          last_sender_name: user.ign || user.full_name || 'User'
        }, { merge: true });
      }
      
      setSentList(prev => {
        const newSet = new Set(prev);
        newSet.add(targetId);
        return newSet;
      });
    } catch (err) {
      console.error("Failed to send message", err);
    }
    setSendingTo(null);
  };

  const handleSystemShare = async () => {
    try {
      await Share.share({
        title: 'Share',
        text: shareText,
        url: shareUrl,
        dialogTitle: 'Share with friends',
      });
    } catch (err) {
      if (navigator.share) {
        navigator.share({
          title: 'Share',
          text: shareText,
          url: shareUrl,
        }).catch(() => handleCopyLink());
      } else {
        handleCopyLink();
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[1050] flex flex-col pointer-events-auto overflow-hidden rounded-t-3xl"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={onClose}
          />
          
          {/* Sliding Content */}
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative mt-auto h-[65dvh] bg-gray-950 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.8)] rounded-t-[2rem] border-t border-gray-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-col items-center pt-4 pb-3 border-b border-gray-800/60 bg-gray-900/50 backdrop-blur-md">
              <div className="w-12 h-1.5 bg-gray-700 rounded-full mb-4" />
              <div className="w-full px-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-bold text-white">Send to</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-2 no-scrollbar pb-32">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Friends */}
              {friends.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">FRIENDS</h4>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-y-6 gap-x-2">
                    {friends.map(friend => {
                      const isSent = sentList.has(friend.id);
                      const isSending = sendingTo === friend.id;
                      
                      return (
                        <div key={friend.id} className="flex flex-col items-center gap-2">
                          <button 
                            disabled={isSent || isSending}
                            onClick={() => handleSend(friend.id, false)}
                            className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-transparent hover:border-orange-600 transition-colors bg-gray-800"
                          >
                            <img 
                              src={friend.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${friend.email}`}
                              alt={friend.ign || friend.full_name || 'Friend'}
                              className="w-full h-full object-cover"
                            />
                            {isSending && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                              </div>
                            )}
                            {isSent && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                              </div>
                            )}
                          </button>
                          <span className="text-[10px] text-gray-400 font-medium text-center truncate w-14">
                            {friend.ign || friend.full_name?.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Groups */}
              {userGroups.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 mt-8">GROUPS</h4>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-y-6 gap-x-2">
                    {userGroups.map(group => {
                      const isSent = sentList.has(group.id);
                      const isSending = sendingTo === group.id;
                      
                      return (
                        <div key={group.id} className="flex flex-col items-center gap-2">
                          <button 
                            disabled={isSent || isSending}
                            onClick={() => handleSend(group.id, true)}
                            className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-transparent hover:border-orange-600 transition-colors bg-gray-800"
                          >
                            <img 
                              src={group.dp || `https://api.dicebear.com/7.x/shapes/svg?seed=${group.name}`}
                              alt={group.name}
                              className="w-full h-full object-cover"
                            />
                            {isSending && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                              </div>
                            )}
                            {isSent && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                              </div>
                            )}
                          </button>
                          <span className="text-[10px] text-gray-400 font-medium text-center truncate w-14">
                            {group.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {friends.length === 0 && userGroups.length === 0 && (
                <div className="text-center py-10 text-gray-500 text-sm">
                  <p>No friends or groups found.</p>
                </div>
              )}
            </div>
          )}
        </div>

            {/* Bottom Actions */}
            <div className="absolute bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 p-4 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
              <div className="flex justify-center items-center gap-10">
                <button
                  onClick={handleCopyLink}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center group-hover:bg-gray-800 transition-colors">
                    <LinkIcon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors">Copy Link</span>
                </button>

                {!hideMoreOptions && (
                  <button
                    onClick={handleSystemShare}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center group-hover:bg-gray-800 transition-colors">
                      <Share2 className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors">More Options</span>
                  </button>
                )}
              </div>
            </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
