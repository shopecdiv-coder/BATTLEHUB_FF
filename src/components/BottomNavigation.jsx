import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Trophy, MessageCircle, Menu, Film } from "lucide-react";
import { Registration } from "@/entities/Registration";
import { User } from "@/entities/User";

const SWIPE_PAGES = [
  createPageUrl("Home"),
  createPageUrl("Tournaments"),
  createPageUrl("GlobalChat"),
  createPageUrl("MediaFeed"),
  createPageUrl("Menu"),
];

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadChat, setUnreadChat] = useState(0);
  const [myMatchCount, setMyMatchCount] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  useEffect(() => {
    const checkUnread = () => {
      const count = parseInt(localStorage.getItem('unreadChatCount') || '0');
      setUnreadChat(count);
    };
    checkUnread();
    const interval = setInterval(checkUnread, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadMyMatches = async () => {
      try {
        const user = await User.me();
        const regs = await Registration.filter({ team_leader_id: user.id });
        setMyMatchCount(regs.filter(r => r.status !== "Withdrawn" && r.status !== "Disqualified").length);
      } catch {}
    };
    loadMyMatches();
  }, []);

  useEffect(() => {
    if (location.pathname === createPageUrl("GlobalChat")) return;
    const currentIndex = SWIPE_PAGES.indexOf(location.pathname);

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      if (Math.abs(dx) < 60 || dy > Math.abs(dx)) return;
      if (currentIndex === -1) return;
      if (dx < 0 && currentIndex < SWIPE_PAGES.length - 1) {
        navigate(SWIPE_PAGES[currentIndex + 1]);
      } else if (dx > 0 && currentIndex > 0) {
        navigate(SWIPE_PAGES[currentIndex - 1]);
      }
      touchStartX.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [location.pathname, navigate]);

  const navItems = [
    { name: "Home", path: createPageUrl("Home"), icon: Home },
    { name: "Play", path: createPageUrl("Tournaments"), icon: Trophy },
    { name: "Chat", path: createPageUrl("GlobalChat"), icon: MessageCircle },
    { name: "Media", path: createPageUrl("MediaFeed"), icon: Film },
    { name: "Menu", path: createPageUrl("Menu"), icon: Menu }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800">
      <div className="grid grid-cols-5 gap-1 items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
                isActive
                  ? "text-orange-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? "scale-110" : ""}`} />
              {item.name === "Chat" && unreadChat > 0 && (
                <span className="absolute top-1 right-1/4 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
              {item.name === "Play" && myMatchCount > 0 && location.pathname === createPageUrl("Tournaments") && (
                <span className="absolute top-1 right-1/4 min-w-[16px] h-4 bg-orange-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">{myMatchCount}</span>
              )}
              <span className={`text-xs mt-1 font-medium ${isActive ? "font-bold" : ""}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}