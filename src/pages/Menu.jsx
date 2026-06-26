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
  Settings, FileText, Scale, Lock, Info, RefreshCw, Gem, Share2, Flame, ChevronRight
} from "lucide-react";

export default function Menu() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
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
        { name: "Profile", icon: UserIcon, path: "Profile" },
        { name: "Wallet", icon: Wallet, path: "Wallet" }
      ]
    },
    {
      title: "Tournaments",
      items: [
        { name: "Tournaments", icon: Trophy, path: "Tournaments" },
        { name: "My Tournaments", icon: Star, path: "MyTournaments" },
        { name: "Tournament Journey", icon: Flame, path: "JourneyHistory" },
        { name: "Past Tournaments", icon: BookOpen, path: "PastTournaments" }
      ]
    },
    {
      title: "Community",
      items: [
        { name: "Leaderboard", icon: Users, path: "Leaderboard" },
        { name: "Global Chat", icon: MessageCircle, path: "GlobalChat" },
        { name: "Ratings", icon: Star, path: "Ratings" }
      ]
    },
    {
      title: "Rewards & Help",
      items: [
        { name: "Earn Diamonds", icon: Gem, path: "EarnDiamonds" },
        { name: "Referrals", icon: Gift, path: "Referrals" },
        { name: "Notices", icon: Bell, path: "Notices" },
        { name: "Support", icon: HelpCircle, path: "Support" }
      ]
    },
    {
      title: "Legal & Help",
      items: [
        { name: "FAQs", icon: HelpCircle, path: "FAQs" },
        { name: "Privacy Policy", icon: Lock, path: "PrivacyPolicy" },
        { name: "Terms & Conditions", icon: FileText, path: "TermsConditions" },
        { name: "Refund Policy", icon: RefreshCw, path: "RefundPolicy" },
        { name: "Rules", icon: Scale, path: "Rules" }
      ]
    },
    {
      title: "About",
      items: [
        { name: "About Us", icon: Info, path: "AboutUs" },
        { name: "Share App", icon: Share2, path: "ShareApp" }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">


        {/* Menu Sections */}
        {menuSections.map((section, index) => (
          <div key={index} className="mb-5">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2 px-1">{section.title}</h3>
            <Card className="bg-[#111111]/80 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-lg">
              <CardContent className="p-0">
                {section.items.map((item, idx) => (
                  <Link
                    key={idx}
                    to={createPageUrl(item.path)}
                    className="flex items-center gap-3 p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all active:bg-white/10"
                  >
                    <div className="w-8 h-8 rounded-md bg-[#1a1a1a] border border-white/5 flex items-center justify-center shadow-inner">
                      <item.icon className="w-4 h-4 text-orange-400 opacity-90" />
                    </div>
                    <span className="flex-1 text-gray-300 font-medium text-sm">{item.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Admin Dashboard (if admin) */}
        {user?.role === "admin" && (
          <div className="mb-5">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-red-500/70 mb-2 px-1">Admin</h3>
            <Card className="bg-[#1a0f0f]/80 backdrop-blur-md border border-red-500/20 rounded-xl overflow-hidden shadow-lg">
              <CardContent className="p-0">
                <Link
                  to={createPageUrl("AdminDashboard")}
                  className="flex items-center gap-3 p-3 hover:bg-red-500/10 transition-all active:bg-red-500/20"
                >
                  <div className="w-8 h-8 rounded-md bg-red-950/50 border border-red-500/20 flex items-center justify-center shadow-inner">
                    <Shield className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="flex-1 text-red-400 font-semibold text-sm">Admin Dashboard</span>
                  <ChevronRight className="w-4 h-4 text-red-500/50" />
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          className="w-full bg-red-600/90 hover:bg-red-600 text-white py-5 text-base font-bold rounded-xl shadow-lg mt-2"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}