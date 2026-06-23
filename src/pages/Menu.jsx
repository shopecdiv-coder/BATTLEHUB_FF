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
  Settings, FileText, Scale, Lock, Info, RefreshCw, Gem, Share2, Flame
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
        {/* User Profile Card */}
        <Card className="bg-gradient-to-r from-orange-900/40 to-red-900/40 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-orange-400">
                <AvatarImage src={user?.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${user?.email}`} />
                <AvatarFallback className="bg-orange-600 text-white">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{user?.full_name || 'User'}</h2>
                <p className="text-sm text-gray-400">{user?.email}</p>
                <p className="text-xs text-orange-400 mt-1">{user?.ign ? `IGN: ${user.ign}` : 'Set your IGN in profile'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Sections */}
        {menuSections.map((section, index) => (
          <div key={index}>
            <h3 className="text-sm font-semibold text-gray-400 mb-3 px-2">{section.title}</h3>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-0">
                {section.items.map((item, idx) => (
                  <Link
                    key={idx}
                    to={createPageUrl(item.path)}
                    className="flex items-center gap-4 p-4 border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-orange-400" />
                    </div>
                    <span className="flex-1 text-gray-200 font-medium">{item.name}</span>
                    <span className="text-gray-500">›</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Admin Dashboard (if admin) */}
        {user?.role === "admin" && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3 px-2">Admin</h3>
            <Card className="bg-red-900/30 border-red-500/30">
              <CardContent className="p-0">
                <Link
                  to={createPageUrl("AdminDashboard")}
                  className="flex items-center gap-4 p-4 hover:bg-red-900/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="flex-1 text-red-400 font-bold">Admin Dashboard</span>
                  <span className="text-red-500">›</span>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Logout or Login Button */}
        {user ? (
          <Button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-bold rounded-2xl"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        ) : (
          <Link to="/auth/login" className="block w-full">
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white py-6 text-lg font-bold rounded-2xl"
            >
              <UserIcon className="w-5 h-5 mr-2" />
              Login / Register
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}