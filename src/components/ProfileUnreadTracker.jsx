import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Friendship, Notification } from "@/api/entities";
import { db } from "@/api/firebaseClient";
import { collection, query, where, onSnapshot, doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { playNotificationSound } from "@/lib/audio";
import { MessageSquare } from "lucide-react";

export default function ProfileUnreadTracker() {
  const previousRequestsRef = useRef(-1);
  const chatLoadedRef = useRef(new Map());
  const chatLastMsgTimeRef = useRef(new Map());
  const chatLastUnreadCountRef = useRef(new Map());
  const mutedChatsRef = useRef({});
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;

    let unsubFriendships = null;
    let unsubParties = null;
    let unsubGroups = null;
    let unsubUser = null;
    const chatUnsubs = new Map();
    let pendingRequests = 0;
    const unreadMap = new Map();

    let currentFriends = new Set();
    let currentParties = new Map(); // map partyId -> partyName
    let currentGroups = new Map(); // map groupId -> groupName

    const getTime = (val) => {
      if (!val) return 0;
      if (typeof val.toDate === 'function') return val.toDate().getTime();
      return new Date(val).getTime();
    };

    const updateTotal = () => {
      let totalMsgs = 0;
      let directMsgs = 0;
      let partyMsgs = 0;
      let groupMsgs = 0;

      const activeChatId = window.ACTIVE_CHAT_ID || localStorage.getItem('active_chat_id');

      for (const [chatId, count] of unreadMap.entries()) {
        if (chatId === activeChatId) continue;
        
        totalMsgs += count;
        if (chatId.startsWith('direct_')) {
          directMsgs += count;
        } else if (currentParties.has(chatId)) {
          partyMsgs += count;
        } else if (currentGroups.has(chatId)) {
          groupMsgs += count;
        }
      }

      const currentTotal = totalMsgs;
      const currentDirect = directMsgs;
      
      localStorage.setItem('totalProfileUnread', currentTotal.toString());
      localStorage.setItem('directProfileUnread', currentDirect.toString());
      localStorage.setItem('partyProfileUnread', partyMsgs.toString());
      localStorage.setItem('groupProfileUnread', groupMsgs.toString());
      localStorage.setItem('requestsProfileUnread', pendingRequests.toString());

      window.dispatchEvent(new CustomEvent('profileUnreadUpdated', { 
        detail: { 
          total: currentTotal, 
          direct: currentDirect, 
          party: partyMsgs, 
          group: groupMsgs,
          requests: pendingRequests,
          unreadMap: Object.fromEntries(unreadMap)
        } 
      }));

      if (previousRequestsRef.current !== -1) {
        if (pendingRequests > previousRequestsRef.current) {
          playNotificationSound();
          toast("You have a new friend request!", { icon: "👤" });
        }
      }

      previousRequestsRef.current = pendingRequests;
    };

    const recalcChat = (chatId) => {
      unreadMap.set(chatId, 0);
      updateTotal();
    };

    const onChatRead = (e) => {
      const { chatId } = e.detail || {};
      if (chatId) {
        recalcChat(chatId);
        // Sync to cloud so it persists across logouts/devices
        try {
          setDoc(doc(db, "users", user.id), {
            chat_reads: {
              [chatId]: Date.now()
            }
          }, { merge: true });
        } catch (err) {
          console.error("Failed to sync chat read state", err);
        }
      }
    };
    window.addEventListener('chatRead', onChatRead);

    const onRequestsRead = () => {
      // Re-evaluate pendingRequests based on newly viewed requests in localStorage
      let pReqs = 0;
      let viewedReqs = [];
      try {
        viewedReqs = JSON.parse(localStorage.getItem('viewed_requests') || '[]');
      } catch(e) {}
      
      // Since we don't have the docs here, we just set pendingRequests to 0 
      // because all current pending requests were just viewed.
      // Next snapshot will naturally pick up any truly new ones.
      pendingRequests = 0;
      updateTotal();
    };
    window.addEventListener('requestsRead', onRequestsRead);

    const pushNotificationToDB = async (mData, docId, title, preview, actionUrl) => {
      try {
        const notifId = `chat_${docId}_${user.id}`;
        // Create a notification so it appears in the Bell icon
        // setDoc will naturally deduplicate if multiple tabs try to write it
        await setDoc(doc(db, "notifications", notifId), {
          recipient_id: user.id,
          type: 'chat_message',
          title: title,
          text: preview,
          action_url: actionUrl,
          read: false,
          created_at: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to push chat notification to DB", err);
      }
    };

    const syncChats = () => {
      const newChatIds = new Set();
      for (const friendId of currentFriends) {
        newChatIds.add(`direct_${[user.id, friendId].sort().join('_')}`);
      }
      for (const partyId of currentParties.keys()) {
        newChatIds.add(partyId);
      }
      for (const groupId of currentGroups.keys()) {
        newChatIds.add(groupId);
      }

      for (const chatId of newChatIds) {
        if (!chatUnsubs.has(chatId)) {
          let unsub;
          if (chatId.startsWith('direct_')) {
            const chatRef = doc(db, "direct_chats", chatId);
            unsub = onSnapshot(chatRef, async (docSnap) => {
              const lastRead = parseInt(localStorage.getItem(`chat_read_${chatId}`) || '0');
              const isInitial = !chatLoadedRef.current.get(chatId);
              chatLoadedRef.current.set(chatId, true);

              if (docSnap.exists()) {
                const data = docSnap.data();
                const unreadCount = data[`unread_count_${user.id}`] || 0;
                unreadMap.set(chatId, unreadCount);
                
                const msgTime = new Date(data.last_message_timestamp || 0).getTime();
                const prevUnreadCount = chatLastUnreadCountRef.current.get(chatId) || 0;
                
                chatLastUnreadCountRef.current.set(chatId, unreadCount);
                
                if (!isInitial && unreadCount > prevUnreadCount) {
                  // Only update lastMsgTime for tracking purposes if needed
                  chatLastMsgTimeRef.current.set(chatId, msgTime);
                  
                  const activeChatId = window.ACTIVE_CHAT_ID || localStorage.getItem('active_chat_id');
                  if (activeChatId === chatId || window.IS_MESSAGES_DRAWER_OPEN) {
                    updateTotal();
                    return;
                  }

                  const otherUserId = chatId.replace('direct_', '').replace(user.id, '').replace('_', '');
                  let senderName = data.last_sender_name;
                  let senderAvatar = null;
                  
                  try {
                    const { getDoc } = await import('firebase/firestore');
                    const userDoc = await getDoc(doc(db, "users", otherUserId));
                    if (userDoc.exists()) {
                      const uData = userDoc.data();
                      if (!senderName) senderName = uData.ign || uData.full_name;
                      senderAvatar = uData.avatar_url || null;
                    }
                  } catch (e) {}
                  
                  if (!senderName) senderName = "A Friend";
                  
                  const title = `Message from ${senderName}`;
                  
                  const formatMessagePreview = (msg) => {
                    if (!msg) return "New message";
                    if (msg.startsWith('https://res.cloudinary.com/')) {
                       if (msg.includes('/image/')) return '🖼️ Photo';
                       if (msg.includes('/video/')) return '🎥 Video';
                       if (msg.includes('/raw/')) return '📄 Document';
                       return '📎 Media';
                    }
                    if (msg.includes('::')) return '📄 Document';
                    if (msg.startsWith('http://') || msg.startsWith('https://')) return '🔗 Link';
                    return msg.length > 40 ? msg.substring(0, 40) + '...' : msg;
                  };

                  const textPreview = formatMessagePreview(data.last_message);
                  
                  const actionUrl = `/profile?openDrawer=message&chatId=${chatId}`;
                  
                  const muteExp = mutedChatsRef.current[chatId];
                  if (!muteExp || muteExp < Date.now()) {
                    playNotificationSound();
                    toast(
                      <div className="flex items-center gap-3 w-full">
                        {senderAvatar ? (
                          <img src={senderAvatar} alt="DP" className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                          </div>
                        )}
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <span className="font-bold text-sm text-white truncate">{title}</span>
                          <span className="text-xs text-gray-400 truncate">{textPreview}</span>
                        </div>
                      </div>,
                      { 
                        action: {
                          label: "View Chat",
                          onClick: () => navigate(actionUrl)
                        },
                        style: { cursor: 'pointer' },
                        onClick: () => navigate(actionUrl)
                      }
                    );
                  }
                }
              } else {
                unreadMap.set(chatId, 0);
              }
              updateTotal();
            });
          } else {
            const qChat = query(
              collection(db, "group_chat_messages"),
              where("group_id", "==", chatId)
            );

            unsub = onSnapshot(qChat, (msgSnap) => {
              const lastRead = parseInt(localStorage.getItem(`chat_read_${chatId}`) || '0');
              const isInitial = !chatLoadedRef.current.get(chatId);
              chatLoadedRef.current.set(chatId, true);

              let unreadCount = 0;
              msgSnap.docs.forEach(d => {
                const mData = d.data();
                const msgTime = getTime(mData.created_at || mData.created_date);
                if (msgTime > lastRead && mData.user_id !== user.id) {
                  unreadCount++;
                }
              });

              unreadMap.set(chatId, unreadCount);

              const prevUnreadCount = chatLastUnreadCountRef.current.get(chatId) || 0;
              chatLastUnreadCountRef.current.set(chatId, unreadCount);

              msgSnap.docChanges().forEach(change => {
                if (change.type === 'added') {
                  const mData = change.doc.data();
                  const msgTime = getTime(mData.created_at || mData.created_date);
                  
                  if (!isInitial && mData.user_id !== user.id && unreadCount > prevUnreadCount) {
                    chatLastMsgTimeRef.current.set(chatId, msgTime);

                    const activeChatId = window.ACTIVE_CHAT_ID || localStorage.getItem('active_chat_id');
                    if (activeChatId === chatId || window.IS_PARTY_DRAWER_OPEN) {
                      updateTotal();
                      return;
                    }

                    const senderName = mData.user_ign || mData.username || "Someone";
                    const senderAvatar = mData.user_avatar || mData.avatar_url || null;
                    const partyName = currentParties.get(chatId);
                    const groupName = currentGroups.get(chatId);
                    const chatName = partyName || groupName;
                    const title = chatName ? `Message from ${senderName} in ${chatName}` : `Message from ${senderName}`;
                    
                    const formatMessagePreview = (msg) => {
                      if (!msg) return "Sent an attachment";
                      if (msg.startsWith('https://res.cloudinary.com/')) {
                         if (msg.includes('/image/')) return '🖼️ Photo';
                         if (msg.includes('/video/')) return '🎥 Video';
                         if (msg.includes('/raw/')) return '📄 Document';
                         return '📎 Media';
                      }
                      if (msg.includes('::')) return '📄 Document';
                      if (msg.startsWith('http://') || msg.startsWith('https://')) return '🔗 Link';
                      return msg.length > 40 ? msg.substring(0, 40) + '...' : msg;
                    };

                    const textPreview = formatMessagePreview(mData.message);
                    
                    const actionUrl = groupName 
                      ? `/profile?openDrawer=groups&groupId=${chatId}`
                      : `/profile?openDrawer=party&chatId=${chatId}`;
                    
                    const muteExp = mutedChatsRef.current[chatId];
                    if (!muteExp || muteExp < Date.now()) {
                      playNotificationSound();
                      toast(
                        <div className="flex items-center gap-3 w-full">
                          {senderAvatar ? (
                            <img src={senderAvatar} alt="DP" className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                              <MessageSquare className="w-5 h-5 text-blue-500" />
                            </div>
                          )}
                          <div className="flex flex-col flex-1 overflow-hidden">
                            <span className="font-bold text-sm text-white truncate">{title}</span>
                            <span className="text-xs text-gray-400 truncate">{textPreview}</span>
                          </div>
                        </div>,
                        { 
                          action: {
                            label: "View Chat",
                            onClick: () => navigate(actionUrl)
                          },
                          style: { cursor: 'pointer' },
                          onClick: () => navigate(actionUrl)
                        }
                      );
                    }
                  }
                }
              });
              updateTotal();
            });
          }
          
          chatUnsubs.set(chatId, unsub);
        }
      }

      for (const [chatId, unsub] of chatUnsubs.entries()) {
        if (!newChatIds.has(chatId)) {
          unsub();
          chatUnsubs.delete(chatId);
          unreadMap.delete(chatId);
          chatLoadedRef.current.delete(chatId);
        }
      }
      
      updateTotal();
    };

    const setupListeners = async () => {
      // 1) Sync chat reads from cloud to localStorage
      unsubUser = onSnapshot(doc(db, "users", user.id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          mutedChatsRef.current = data.muted_chats || {};
          if (data.chat_reads) {
            let updated = false;
            Object.keys(data.chat_reads).forEach(chatId => {
              const cloudVal = data.chat_reads[chatId];
              const localVal = parseInt(localStorage.getItem(`chat_read_${chatId}`) || '0');
              if (cloudVal > localVal) {
                localStorage.setItem(`chat_read_${chatId}`, cloudVal.toString());
                updated = true;
              }
            });
            // Trigger a re-calculation if anything was updated from the cloud
            if (updated) {
               for (const unsub of chatUnsubs.values()) {
                 unsub();
               }
               chatUnsubs.clear();
               chatLoadedRef.current.clear();
               syncChats();
            }
          }
        }
      });

      const qFriends = query(collection(db, "friendships"), where("friend_id", "==", user.id));
      unsubFriendships = onSnapshot(qFriends, async (snap) => {
        let pReqs = 0;
        const friendsTemp = new Set();
        
        let viewedReqs = [];
        try {
          viewedReqs = JSON.parse(localStorage.getItem('viewed_requests') || '[]');
        } catch(e) {}

        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'pending' && !viewedReqs.includes(doc.id)) {
            pReqs++;
          } else if (data.status === 'accepted') {
            friendsTemp.add(data.user_id);
          }
        });

        const sent = await Friendship.filter({ user_id: user.id }).catch(() => []);
        sent.forEach(rel => {
          if (rel.status === 'accepted') {
            friendsTemp.add(rel.friend_id);
          }
        });

        pendingRequests = pReqs;
        if (previousRequestsRef.current === -1) {
          previousRequestsRef.current = pendingRequests;
        }
        
        currentFriends = friendsTemp;
        syncChats();
      });

      const qParties = query(collection(db, "parties"), where("members", "array-contains", user.id));
      unsubParties = onSnapshot(qParties, (snap) => {
        const partiesTemp = new Map();
        snap.docs.forEach(doc => {
          const data = doc.data();
          partiesTemp.set(doc.id, data.party_name || data.name || "Party");
        });
        currentParties = partiesTemp;
        syncChats();
      });

      const qGroups = query(collection(db, "user_groups"), where("members", "array-contains", user.id));
      unsubGroups = onSnapshot(qGroups, (snap) => {
        const groupsTemp = new Map();
        snap.docs.forEach(doc => {
          const data = doc.data();
          groupsTemp.set(doc.id, data.name || "Group");
        });
        currentGroups = groupsTemp;
        syncChats();
      });
    };

    setupListeners();

    return () => {
      window.removeEventListener('chatRead', onChatRead);
      window.removeEventListener('requestsRead', onRequestsRead);
      if (unsubUser) unsubUser();
      if (unsubFriendships) unsubFriendships();
      if (unsubParties) unsubParties();
      if (unsubGroups) unsubGroups();
      for (const unsub of chatUnsubs.values()) {
        unsub();
      }
    };
  }, [user]);

  return null;
}
