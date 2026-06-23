import { useEffect } from "react";
import { GlobalChat as ChatEntity } from "@/entities/GlobalChat";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

// This component runs in Layout to track unread chats
export default function ChatUnreadTracker() {
  useEffect(() => {
    const checkNewChats = async () => {
      // Don't run if on chat page
      if (window.location.pathname === createPageUrl("GlobalChat")) {
        return;
      }

      try {
        const user = await base44.auth.me().catch(() => null);
        if (!user) return;

        const lastSeen = parseInt(localStorage.getItem('lastChatSeen') || '0');
        
        // Get recent messages
        const recentChats = await ChatEntity.list("-created_date", 30).catch(() => []);
        
        // Count new messages from other users
        const newCount = recentChats.filter(m => 
          new Date(m.created_date).getTime() > lastSeen && 
          m.user_id !== user.id && 
          !m.is_deleted
        ).length;
        
        localStorage.setItem('unreadChatCount', newCount.toString());
      } catch (e) {
        // Silent fail
      }
    };

    // Check once on mount and then every 30 seconds
    checkNewChats();
    const interval = setInterval(checkNewChats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return null;
}