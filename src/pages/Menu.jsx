import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy, Users, Shield, Star, BookOpen, Bell, HelpCircle,
  Gift, Wallet, MessageCircle, LogOut, User as UserIcon,
  Settings, FileText, Scale, Lock, Info, RefreshCw, Gem, Share2, Flame, ChevronRight, BarChart2
} from "lucide-react";
import { toast } from "sonner";

export default function Menu({ isOpen = true, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();
  const [renderMenu, setRenderMenu] = useState(isOpen);
  const [animate, setAnimate] = useState(false);
  const [expandedItems, setExpandedItems] = useState({ "Legal Policies": true });

  const handleShareApp = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const appUrl = "https://battlehubff.site";
    const shareMessage = `🎮 Join BattleHub - Esports & Gaming Tournament Platform!\n\n🏆 Play competitive matches and tournaments!\n💰 Daily tournaments with exciting prizes\n⚡ Instant payouts\n\nJoin now: ${appUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "BattleHub",
          text: shareMessage,
          url: appUrl,
        });
      } catch (err) {
        console.log("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(appUrl);
        toast.success("App link copied! Share it with your friends.");
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setRenderMenu(true);
      setIsClosing(false);
      loadUser();
      document.body.style.overflow = "hidden"; // Lock background scroll
      const timer = setTimeout(() => {
        setAnimate(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      setIsClosing(true);
      document.body.style.overflow = ""; // Unlock background scroll
      const timer = setTimeout(() => {
        setRenderMenu(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleCloseEvent = () => {
      if (onClose) onClose();
    };
    window.addEventListener("close-menu", handleCloseEvent);
    return () => {
      window.removeEventListener("close-menu", handleCloseEvent);
      document.body.style.overflow = ""; // Safely restore scroll
    };
  }, [onClose]);

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate(-1);
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await User.logout();
      navigate(createPageUrl("Home"));
    }
  };



  const menuSections = [
    {
      title: "Account",
      items: [
        { name: "Profile", icon: UserIcon, path: "Profile", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
        { name: "Wallet", icon: Wallet, path: "Wallet", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" }
      ]
    },
    {
      title: "Tournaments",
      items: [
        { name: "Tournaments", icon: Trophy, path: "Tournaments", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
        { name: "My Tournaments", icon: Star, path: "Tournaments?tab=my", color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30" },
        { name: "Tournament Journey", icon: Flame, path: "JourneyHistory", color: "text-orange-400 bg-orange-500/15 border-orange-500/30" },
        { name: "Past Tournaments", icon: BookOpen, path: "PastTournaments", color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" },
        { name: "Leaderboard", icon: BarChart2, path: "Leaderboard", color: "text-rose-400 bg-rose-500/15 border-rose-500/30" }
      ]
    },
    {
      title: "Rewards & Help",
      items: [
        { name: "Earn Diamonds", icon: Gem, path: "EarnDiamonds", color: "text-sky-400 bg-sky-500/15 border-sky-500/30" },
        { name: "Referrals", icon: Gift, path: "Referrals", color: "text-purple-400 bg-purple-500/15 border-purple-500/30" },
        { name: "Support", icon: HelpCircle, path: "Support", color: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30" },
        { name: "FAQs", icon: HelpCircle, path: "FAQs", color: "text-teal-400 bg-teal-500/15 border-teal-500/30" }
      ]
    },
    {
      title: "Legal & Policies",
      items: [
        {
          name: "Legal Policies",
          icon: Scale,
          color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
          subItems: [
            { name: "1. Privacy Policy", icon: Lock, path: "PrivacyPolicy", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
            { name: "2. Terms of Service", icon: FileText, path: "TermsConditions", color: "text-orange-400 bg-orange-500/15 border-orange-500/30" },
            { name: "3. Refund Policy", icon: RefreshCw, path: "RefundPolicy", color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" },
            { name: "4. Fair Play Policy", icon: Shield, path: "FairPlayPolicy", color: "text-purple-400 bg-purple-500/15 border-purple-500/30" },
            { name: "5. Tournament Rules", icon: BookOpen, path: "Rules", color: "text-rose-400 bg-rose-500/15 border-rose-500/30" }
          ]
        },
        { name: "Share App", icon: Share2, path: "#", onClick: handleShareApp, color: "text-pink-400 bg-pink-500/15 border-pink-500/30" }
      ]
    }
  ];

  if (!renderMenu) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[999] min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[999] transition-opacity duration-300 ${animate ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop overlay */}
      <div 
        onClick={handleClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${animate ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Sidebar panel */}
      <div className={`absolute top-0 left-0 h-full w-[80%] max-w-[310px] bg-slate-950 border-r border-slate-800 shadow-2xl flex flex-col overflow-y-auto scrollbar-hide transition-transform duration-300 ease-out transform ${animate ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* User Profile Header Card */}
        <div className="p-4 pt-12 pb-4 border-b border-slate-800 bg-slate-900/40 flex flex-col gap-1 relative shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-orange-600/30 shadow-lg">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="bg-slate-900 text-orange-500 text-xs font-black uppercase">
                  {user.full_name?.substring(0, 2) || "PL"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white truncate uppercase tracking-wider">{user.full_name}</p>
                <p className="text-[9px] text-slate-400 truncate font-mono">{user.email}</p>
                {user.ign && (
                  <span className="inline-block bg-orange-600/15 text-orange-500 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-orange-600/20 mt-1">
                    {user.ign}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">Welcome Guest</p>
                <p className="text-[9px] text-slate-500">Sign in to sync your progress</p>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content (Items + Logout) */}
        <div className="p-4 space-y-5">
          {menuSections.map((section, index) => (
            <div key={index} className="space-y-1.5">
              <h3 className="text-[9px] uppercase tracking-widest font-black text-slate-400 px-1">{section.title}</h3>
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                {section.items.map((item, idx) => {
                  if (item.subItems) {
                    const isExpanded = !!expandedItems[item.name];
                    return (
                      <div key={idx} className="border-b border-slate-800/40 last:border-0">
                        <button
                          onClick={() => setExpandedItems(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-900/30 transition-all active:bg-slate-900/50"
                        >
                          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 shadow-xs ${item.color || "text-orange-400 bg-orange-500/10 border-orange-500/20"}`}>
                            <item.icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="flex-1 text-slate-100 font-bold text-xs text-left tracking-wide">{item.name}</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-orange-400' : ''}`} />
                        </button>
                        {isExpanded && (
                          <div className="bg-slate-950/60 border-t border-slate-800/40 pl-9 pr-3 py-1 space-y-0.5">
                            {item.subItems.map((sub, sIdx) => (
                              <Link
                                key={sIdx}
                                to={createPageUrl(sub.path)}
                                onClick={handleClose}
                                className="flex items-center justify-between py-2 text-slate-300 hover:text-orange-400 text-xs transition-colors font-medium border-b border-slate-900/60 last:border-0"
                              >
                                <span className="truncate">{sub.name}</span>
                                <ChevronRight className="w-3 h-3 text-slate-600" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const itemContent = (
                    <>
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 shadow-xs ${item.color || "text-orange-400 bg-orange-500/10 border-orange-500/20"}`}>
                        <item.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="flex-1 text-slate-100 font-bold text-xs text-left tracking-wide">{item.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </>
                  );

                  const btnStyle = "w-full flex items-center gap-3 p-2.5 border-b border-slate-800/40 last:border-0 hover:bg-slate-900/30 transition-all active:bg-slate-900/50";

                  return item.onClick ? (
                    <button
                      key={idx}
                      onClick={(e) => {
                        item.onClick(e);
                        handleClose();
                      }}
                      className={btnStyle}
                    >
                      {itemContent}
                    </button>
                  ) : (
                    <Link
                      key={idx}
                      to={createPageUrl(item.path)}
                      onClick={handleClose}
                      className={btnStyle}
                    >
                      {itemContent}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Admin Section (if admin) */}
          {user?.role === "admin" && (
            <div className="space-y-1.5">
              <h3 className="text-[9px] uppercase tracking-widest font-black text-red-400 px-1">Admin</h3>
              <div className="bg-red-950/10 border border-red-950/30 rounded-2xl overflow-hidden">
                <Link
                  to={createPageUrl("AdminDashboard")}
                  onClick={handleClose}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-red-950/20 transition-all active:bg-red-950/30"
                >
                  <div className="w-7 h-7 rounded-lg bg-red-950/20 border border-red-500/20 flex items-center justify-center shadow-inner">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <span className="flex-1 text-red-400 font-black text-xs text-left tracking-wide">Admin Dashboard</span>
                  <ChevronRight className="w-3.5 h-3.5 text-red-500/55" />
                </Link>
              </div>
            </div>
          )}

          {/* Footer with Logout & App Version inline */}
          <div className="pt-5 pb-2 flex flex-col gap-2.5 border-t border-slate-900">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full bg-red-500/10 hover:bg-red-500/15 text-red-400 hover:text-red-300 py-3.5 text-xs font-black rounded-xl border border-red-500/20 transition-all"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <p className="text-center text-[9px] text-slate-600 font-mono tracking-widest uppercase">
              BATTLEHUB v3.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}