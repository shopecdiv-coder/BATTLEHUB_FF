import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Trophy, MessageCircle, Menu, Film, Users, User as UserIcon, LayoutGrid } from "lucide-react";
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
  const [profileUnread, setProfileUnread] = useState(0);

  if (location.pathname.includes('/MediaFeed') || location.pathname.includes('/SavedMedia')) {
    return null;
  }
  const [myMatchCount, setMyMatchCount] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  useEffect(() => {
    // Read initial values from localStorage
    const syncFromStorage = () => {
      const count = parseInt(localStorage.getItem('unreadChatCount') || '0');
      setUnreadChat(count);
      const pCount = parseInt(localStorage.getItem('totalProfileUnread') || '0');
      setProfileUnread(pCount);
    };

    syncFromStorage();

    // Listen to instant events instead of polling every second
    const onProfileUpdate = (e) => {
      const total = e.detail?.total ?? parseInt(localStorage.getItem('totalProfileUnread') || '0');
      setProfileUnread(total);
    };

    window.addEventListener('profileUnreadUpdated', onProfileUpdate);

    // Fallback poll every 5s (not 1s) in case events are missed
    const interval = setInterval(syncFromStorage, 5000);

    return () => {
      window.removeEventListener('profileUnreadUpdated', onProfileUpdate);
      clearInterval(interval);
    };
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
    { name: "Play", path: createPageUrl("Tournaments"), icon: Trophy },
    { name: "Hub", path: createPageUrl("Profile"), icon: LayoutGrid },
    { name: "Community", path: createPageUrl("Community"), icon: Users },
    { name: "Explore", path: createPageUrl("MediaFeed"), icon: Film }
  ];


  return (
    <nav id="bottom-nav" className="fixed bottom-0 left-0 right-0 z-[500] pointer-events-auto pb-safe">
      {/* SVG Curved Cutout Notch Background */}
      <div className="relative h-16 w-full">
        <svg 
          className="absolute inset-0 w-full h-full text-gray-900 drop-shadow-[0_-5px_15px_rgba(0,0,0,0.6)]" 
          viewBox="0 0 375 64" 
          preserveAspectRatio="none"
        >
          <path 
            d="M 0,10 Q 0,0 10,0 L 140,0 C 158,0 162,32 187.5,32 C 213,32 217,0 235,0 L 365,0 Q 375,0 375,10 L 375,64 L 0,64 Z" 
            className="fill-gray-900 stroke-gray-800/80"
            strokeWidth="1.5"
          />
        </svg>

        {/* Navigation Grid */}
        <div className="relative z-10 grid grid-cols-5 gap-1 items-center h-full px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isCenter = item.name === "Hub" || item.name === "Menu";


            if (isCenter) {
              return (
                <div key={item.name} className="relative flex-1 flex justify-center h-full pointer-events-none group">
                  <Link
                    to={item.path}
                    className={`pointer-events-auto absolute -top-4 w-[52px] h-[52px] rounded-full bg-gray-900 border-2 ${
                      isActive 
                        ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]' 
                        : 'border-orange-500/80 hover:border-orange-500'
                    } flex items-center justify-center shadow-xl shadow-black/80 transition-all duration-300 hover:scale-105 active:scale-95`}
                  >
                    <item.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-orange-500 scale-110' : 'text-gray-300 group-hover:text-orange-400'}`} />
                    {profileUnread > 0 && (
                      <span className="absolute -top-1 -right-1 z-20 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 shadow-md border-2 border-gray-900">
                        {profileUnread > 99 ? '99+' : profileUnread}
                      </span>
                    )}
                  </Link>
                  <span className={`absolute bottom-1 text-[10px] font-medium pointer-events-auto transition-colors ${isActive ? "text-orange-500 font-bold" : "text-gray-400 group-hover:text-gray-200"}`}>
                    <Link to={item.path}>{item.name}</Link>
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative group ${isActive ? 'text-orange-500' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {isActive && (
                  <div className="absolute top-0 w-8 h-[3px] bg-gradient-to-r from-orange-500 to-red-500 rounded-b-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
                )}
                <div className="relative flex flex-col items-center justify-center h-full pt-1">
                  <item.icon className={`w-[22px] h-[22px] transition-transform ${isActive ? "scale-110 mb-0.5 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" : ""}`} />
                  {item.name === "Chat" && unreadChat > 0 && (
                    <span className="absolute top-0 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-gray-900"></span>
                  )}
                  {item.name === "Tournament" && myMatchCount > 0 && location.pathname === createPageUrl("Tournaments") && (
                    <span className="absolute -top-1 -right-3 min-w-[16px] h-4 bg-orange-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1.5 border border-gray-900">{myMatchCount}</span>
                  )}
                  <span className={`text-[10px] mt-1 font-medium transition-all ${isActive ? "font-bold" : ""}`}>
                    {item.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
