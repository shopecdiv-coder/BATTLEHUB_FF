import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Trophy, MessageCircle, Menu, Film, Users, User as UserIcon } from "lucide-react";
import { Registration } from "@/entities/Registration";
import { User } from "@/entities/User";

const SWIPE_PAGES = [
  createPageUrl("Home"),
  createPageUrl("Tournaments"),
  createPageUrl("GlobalChat"),
  createPageUrl("MediaFeed"),
  createPageUrl("Profile"),
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
        const validRegs = regs.filter(r => r.status !== "Withdrawn" && r.status !== "Disqualified");
        let activeCount = 0;
        for (const r of validRegs) {
           const tourneys = await Tournament.filter({ id: r.tournament_id });
           if (tourneys.length > 0 && tourneys[0].status !== "Completed") {
              activeCount++;
           }
        }
        setMyMatchCount(activeCount);
      } catch {}
    };
    loadMyMatches();
  }, []);

  // Swipe navigation removed per user request

  const navItems = [
    { name: "Home", path: createPageUrl("Home"), icon: Home },
    { name: "Tournament", path: createPageUrl("Tournaments"), icon: Trophy },
    { name: "Community", path: createPageUrl("Community"), icon: Users },
    { name: "Media", path: createPageUrl("MediaFeed"), icon: Film },
    { name: "Profile", path: createPageUrl("Profile"), icon: UserIcon }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[200] pointer-events-auto bg-gray-900 border-t border-gray-800">
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
              {item.name === "Tournament" && myMatchCount > 0 && location.pathname === createPageUrl("Tournaments") && (
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