import React, { useState, useEffect } from "react";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Trash2 } from "lucide-react";

import { format } from "date-fns";

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

      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div
            className="fixed top-20 right-4 w-96 max-h-[600px] z-50 glass-card border-2 border-[#00FFFF]/30 rounded-2xl shadow-2xl overflow-hidden"
              style={{
                background: "rgba(10, 10, 26, 0.98)",
                backdropFilter: "blur(20px)"
              }}
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#00FFFF]" />
                  <h3 className="font-bold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={markAllAsRead}
                      className="text-[#00FFFF] hover:bg-[#00FFFF]/10 text-xs"
                    >
                      Mark all read
                    </Button>
                  )}
                  {notifications.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearAll}
                      className="text-red-400 hover:bg-red-500/10 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear All
                    </Button>
                  )}
                  <button
                    onClick={() => setShowPanel(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[500px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer relative ${
                        !notif.read ? "bg-[#00FFFF]/5" : ""
                      }`}
                      onClick={() => markAsRead(notif)}
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
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
    </>
  );
}