import React, { useState, useEffect } from "react";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Trash2, ChevronLeft } from "lucide-react";

import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Single API call - fetch user notifications only to reduce rate limiting
      const userNotifs = await Notification.filter({ recipient_id: currentUser.id }, "-created_at", 15).catch(() => []);
      
      setNotifications(userNotifs);
      setUnreadCount(userNotifs.filter(n => !n.read).length);
    } catch (error) {
      // User not logged in
    }
  };

  const markAsRead = async (notification) => {
    if (!notification.read) {
      await Notification.update(notification.id, { read: true });
      await loadNotifications();
    }
  };

  const markAllAsRead = async () => {
    const updates = notifications.filter(n => !n.read).map(notif => 
      Notification.update(notif.id, { read: true })
    );
    await Promise.all(updates);
    await loadNotifications();
  };

  const clearAll = async () => {
    if (confirm("Delete all notifications?")) {
      for (const notif of notifications) {
        await Notification.delete(notif.id);
      }
      setNotifications([]);
      setUnreadCount(0);
      alert("Cleared!");
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    await Notification.delete(id);
    await loadNotifications();
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {showPanel && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed top-0 left-0 right-0 bottom-16 z-[9998] bg-black/80 backdrop-blur-sm"
                onClick={() => setShowPanel(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 right-0 bottom-16 z-[9999] flex flex-col shadow-2xl overflow-hidden"
                style={{
                  background: "rgba(10, 10, 26, 0.98)",
                  backdropFilter: "blur(20px)"
                }}
              >
                <div className="p-4 pt-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowPanel(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-lg">Notifications</h3>
                      {unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearAll}
                        className="text-red-400 hover:bg-red-500/10 text-xs"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full min-h-[300px]">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {notifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50, height: 0, padding: 0, border: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.2 }}
                        className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer relative ${
                          !notif.read ? "bg-[#00FFFF]/5" : ""
                        }`}
                        onClick={() => {
                          markAsRead(notif);
                          if (notif.action_url) {
                            setShowPanel(false);
                            navigate(notif.action_url);
                          }
                        }}
                      >
                        {!notif.read && (
                          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-[#00FFFF] rounded-full"></div>
                        )}
                        <div className="flex items-start justify-between gap-2 ml-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={
                                notif.priority === "Urgent" ? "bg-red-500/20 text-red-400" :
                                notif.priority === "High" ? "bg-orange-500/20 text-orange-400" :
                                "bg-[#00FFFF]/20 text-[#00FFFF]"
                              }>
                                {notif.type}
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-white text-sm mb-1">{notif.title}</h4>
                            <p className="text-gray-300 text-xs whitespace-pre-wrap">{notif.message}</p>
                            <p className="text-gray-600 text-xs mt-1">
                              {format(new Date(notif.created_at || notif.created_date), "MMM d, h:mm a")}
                            </p>
                          </div>
                          <button
                            onClick={(e) => deleteNotification(notif.id, e)}
                            className="text-gray-500 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}