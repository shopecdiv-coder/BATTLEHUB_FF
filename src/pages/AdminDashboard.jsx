import React, { useState, useEffect } from "react";
import { Report } from "@/entities/Report";
import { BanRecord } from "@/entities/BanRecord";
import { User } from "@/entities/User";
import { Tournament } from "@/entities/Tournament";
import { Registration } from "@/entities/Registration";
import { PastTournament } from "@/entities/PastTournament";
import { Banner } from "@/entities/Banner";
import { VideoBanner } from "@/entities/VideoBanner";
import { DashboardNotice } from "@/entities/DashboardNotice";
import { AppNotice } from "@/entities/AppNotice";
import { RedeemRequest } from "@/entities/RedeemRequest";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, AlertTriangle, Users, Trophy, Ban, CreditCard, Download,
  Gift, MessageCircle, BarChart2, Bell, Image, Video, Tag, Settings,
  BookOpen, HelpCircle, Code, MessageSquare, Percent, QrCode,
  CheckSquare, FileText, Link, Wallet, Coins, History, Award, Zap,
  ChevronRight, Menu, X, RefreshCw, Star, Megaphone, Map, Layers, Target
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

import ReportsManagement from "../components/admin/ReportsManagement";
import BansManagement from "../components/admin/BansManagement";
import TournamentManagement from "../components/admin/TournamentManagement";
import NoticeManagement from "../components/admin/NoticeManagement";
import RedeemManagement from "../components/admin/RedeemManagement";
import PaymentManagement from "../components/admin/PaymentManagement";
import LeaderboardControl from "../components/admin/LeaderboardControl";
import PastTournamentManagement from "../components/admin/PastTournamentManagement";
import BannerManagement from "../components/admin/BannerManagement";
import AppNoticeManagement from "../components/admin/AppNoticeManagement";
import VideoBannerManagement from "../components/admin/VideoBannerManagement";
import ReferralManagement from "../components/admin/ReferralManagement";
import AnnouncementManagement from "../components/admin/AnnouncementManagement";
import UserManagement from "../components/admin/UserManagement";
import TournamentLeaderboardManager from "../components/admin/TournamentLeaderboardManager";
import PhotoLibraryManagement from "../components/admin/PhotoLibraryManagement";
import RealTimeAnalytics from "../components/admin/RealTimeAnalytics";
import ReferralCodeManager from "../components/admin/ReferralCodeManager";
import ThemeManager from "../components/admin/ThemeManager";
import LegalFAQManagement from "../components/admin/LegalFAQManagement";
import AboutUsManagement from "../components/admin/AboutUsManagement";
import { useAdminUnreadCounts } from "../components/admin/UnreadTrackers";
import RedeemCodeManagement from "../components/admin/RedeemCodeManagement";
import ChatSettingsManager from "../components/admin/ChatSettingsManager";
import DiscountCodeManager from "../components/admin/DiscountCodeManager";
import QRCodeManagement from "../components/admin/QRCodeManagement";
import AdminTaskManagement from "../components/admin/AdminTaskManagement";
import TournamentRegistrations from "../components/admin/TournamentRegistrations";
import MessageTemplateManager from "../components/admin/MessageTemplateManager";
import TutorialLinkManager from "../components/admin/TutorialLinkManager";
import WalletOverview from "../components/admin/WalletOverview";
import TournamentEmailHistory from "../components/admin/TournamentEmailHistory";
import CoinLedger from "../components/admin/CoinLedger";
import UserTournamentHistory from "../components/admin/UserTournamentHistory";
import AllWinnersSection from "../components/admin/AllWinnersSection";
import ClashSquadLoneWolfManager from "../components/admin/ClashSquadLoneWolfManager";
import TeamProfilesManagement from "../components/admin/TeamProfilesManagement";
import PlayerProfilesManagement from "../components/admin/PlayerProfilesManagement";
import MatchKillTracker from "../components/admin/MatchKillTracker";
import SupportContactManager from "../components/admin/SupportContactManager";

// ─── Nav Groups ───────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart2 },
      { id: "users", label: "Users", icon: Users },
      { id: "walletoverview", label: "Wallet Overview", icon: Wallet },
      { id: "coinledger", label: "Coin Ledger", icon: Coins },
      { id: "user-history", label: "User History", icon: History },
    ]
  },
  {
    label: "Tournaments",
    items: [
      { id: "tournaments", label: "Active Tournaments", icon: Trophy },
      { id: "completed", label: "Completed", icon: CheckSquare },
      { id: "create-tournament", label: "➕ Create Tournament", icon: Trophy },
      { id: "csLoneWolf", label: "⚔️ CS & Lone Wolf", icon: Layers },
      { id: "registrations", label: "Registrations", icon: FileText },
      { id: "teamprofiles", label: "Team Profiles", icon: Users },
      { id: "playerprofiles", label: "Player Profiles", icon: Zap },
      { id: "matchlb", label: "Match Leaderboard", icon: Star },
      { id: "killtracker", label: "🎯 Kill Tracker", icon: Target },
      { id: "leaderboard", label: "Global Leaderboard", icon: Award },
      { id: "past", label: "Past Tournaments", icon: History },
      { id: "all-winners", label: "All Winners", icon: Award },
    ]
  },
  {
    label: "Finance",
    items: [
      { id: "payments", label: "Coin Purchases", icon: CreditCard, badgeKey: "payments" },
      { id: "redeems", label: "Redeem Requests", icon: Gift, badgeKey: "redeems" },
      { id: "redeemcodes", label: "Redeem Codes", icon: Code, badgeKey: "codes" },
      { id: "discounts", label: "Discount Codes", icon: Percent },
      { id: "qr", label: "QR Codes", icon: QrCode },
    ]
  },
  {
    label: "Moderation",
    items: [
      { id: "reports", label: "Reports", icon: AlertTriangle, badgeKey: "reports" },
      { id: "bans", label: "Bans", icon: Ban },
    ]
  },
  {
    label: "Content",
    items: [
      { id: "notices", label: "Dashboard Notices", icon: Bell },
      { id: "appnotices", label: "App Notices", icon: Megaphone },
      { id: "announcements", label: "Announcements", icon: Megaphone },
      { id: "banners", label: "Banners", icon: Image },
      { id: "video", label: "Video Banner", icon: Video },
      { id: "photos", label: "Photo Library", icon: Image },
    ]
  },
  {
    label: "Settings",
    items: [
      { id: "referrals", label: "Referrals", icon: Gift },
      { id: "tasks", label: "Admin Tasks", icon: CheckSquare },
      { id: "templates", label: "Message Templates", icon: MessageSquare },
      { id: "chatsettings", label: "Chat Settings", icon: MessageCircle },
      { id: "supportcontacts", label: "Support Contacts", icon: MessageCircle },
      { id: "tutorial", label: "Tutorial Link", icon: Link },
      { id: "theme", label: "Theme", icon: Settings },
      { id: "legal", label: "Legal & FAQ", icon: HelpCircle },
      { id: "aboutus", label: "About Us", icon: BookOpen },
    ]
  }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [bans, setBans] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [redeemRequests, setRedeemRequests] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [pastTournaments, setPastTournaments] = useState([]);
  const [banners, setBanners] = useState([]);
  const [appNotices, setAppNotices] = useState([]);
  const [videoBanners, setVideoBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allPaymentRequests, setAllPaymentRequests] = useState([]);
  const [allRedeemRequests, setAllRedeemRequests] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [activeTab, setActiveTab] = useState("analytics");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  const [redeemDateFrom, setRedeemDateFrom] = useState("");
  const [redeemDateTo, setRedeemDateTo] = useState("");

  const { unreadPayments, unreadRedeems, unreadTickets, unreadCodes } = useAdminUnreadCounts();

  useEffect(() => {
    loadData();
    // No auto-refresh — only manual refresh button to prevent glitches
  }, []);

  const loadData = async () => {
    // Verify admin first — fail fast
    let currentUser;
    try {
      currentUser = await User.me();
      const ADMIN_WHITELIST = ['self.help1545@gmail.com'];
      if (currentUser.role !== 'admin' && !ADMIN_WHITELIST.includes(currentUser.email)) {
        navigate(createPageUrl("Home")); return;
      }
      setUser(currentUser);
      setLoading(false); // Show dashboard immediately after auth check
    } catch (e) {
      setLoading(false);
      return;
    }

    // Load critical data first (small, fast calls) — each setState triggers progressive render
    try {
      const [allTournaments, allReports, allBans] = await Promise.all([
        Tournament.list("-created_date", 100).catch(() => []),
        Report.list("-created_date", 100).catch(() => []),
        BanRecord.list("-created_date", 100).catch(() => []),
      ]);
      setTournaments(allTournaments || []);
      setReports(allReports || []);
      setBans(allBans || []);
    } catch {}

    // Load finance data
    try {
      const [allPayments, allRedeems, allRegs] = await Promise.all([
        PaymentRequest.list("-created_date", 500).catch(() => []),
        RedeemRequest.list("-created_date", 500).catch(() => []),
        Registration.list("-created_date", 500).catch(() => []),
      ]);
      setPaymentRequests((allPayments || []).filter(p => p.status === "Pending"));
      setAllPaymentRequests(allPayments || []);
      setRedeemRequests((allRedeems || []).filter(r => r.status === "Pending"));
      setAllRedeemRequests(allRedeems || []);
      setAllRegistrations(allRegs || []);
    } catch {}

    // Load content data
    try {
      const [allNotices, allPastTournaments, allBanners, allAppNotices, allVideoBanners] = await Promise.all([
        DashboardNotice.list("-created_date", 20).catch(() => []),
        PastTournament.list("-date", 50).catch(() => []),
        Banner.list("order", 20).catch(() => []),
        AppNotice.list("-created_date", 20).catch(() => []),
        VideoBanner.list("-created_date", 10).catch(() => [])
      ]);
      setNotices(allNotices || []);
      setPastTournaments(allPastTournaments || []);
      setBanners(allBanners || []);
      setAppNotices(allAppNotices || []);
      setVideoBanners(allVideoBanners || []);
    } catch {}

    // Load all users without limit
    try {
      let allUsers = [];
      let skip = 0;
      while (true) {
        const batch = await User.list("-created_date", 500, skip).catch(() => []);
        if (!batch || batch.length === 0) break;
        allUsers = [...allUsers, ...batch];
        setUsers([...allUsers]);
        if (batch.length < 500) break;
        skip += 500;
      }
    } catch {}
  };

  const downloadRegistrations = () => {
    const doc = `BATTLE HUB - ALL REGISTRATIONS\nGenerated: ${new Date().toLocaleString()}\nTotal: ${allRegistrations.length}\n\n` +
      allRegistrations.map((reg, i) => `#${i+1} ${reg.team_name} | ${reg.tournament_title} | Leader: ${reg.team_leader_ign} | ${reg.payment_status}`).join('\n');
    const blob = new Blob([doc], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Registrations-${format(new Date(),'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const downloadPayments = () => {
    let list = allPaymentRequests;
    if (paymentDateFrom) list = list.filter(r => new Date(r.created_date) >= new Date(paymentDateFrom));
    if (paymentDateTo) list = list.filter(r => new Date(r.created_date) <= new Date(paymentDateTo));
    const doc = `BATTLE HUB - PAYMENTS\nGenerated: ${new Date().toLocaleString()}\nTotal: ${list.length}\n\n` +
      list.map((r,i) => `#${i+1} ${r.user_ign} | ₹${r.inr_amount} | ${r.status} | ${new Date(r.created_date).toLocaleDateString()}`).join('\n');
    const blob = new Blob([doc], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Payments-${format(new Date(),'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const downloadRedeems = () => {
    let list = allRedeemRequests;
    if (redeemDateFrom) list = list.filter(r => new Date(r.created_date) >= new Date(redeemDateFrom));
    if (redeemDateTo) list = list.filter(r => new Date(r.created_date) <= new Date(redeemDateTo));
    const doc = `BATTLE HUB - REDEEMS\nGenerated: ${new Date().toLocaleString()}\nTotal: ${list.length}\n\n` +
      list.map((r,i) => `#${i+1} ${r.user_ign} | ₹${r.inr_amount} | ${r.status} | ${new Date(r.created_date).toLocaleDateString()}`).join('\n');
    const blob = new Blob([doc], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Redeems-${format(new Date(),'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const pendingReports = reports.filter(r => r.status === "Pending" || r.status === "Under Investigation");
  const activeBans = bans.filter(b => b.severity === "Permanent" || (b.end_date && new Date(b.end_date) > new Date()));

  const getBadge = (itemId) => {
    if (itemId === "payments") return unreadPayments;
    if (itemId === "redeems") return unreadRedeems;
    if (itemId === "codes") return unreadCodes;
    if (itemId === "reports") return pendingReports.length;
    return 0;
  };

  const renderContent = () => {
    switch (activeTab) {
      case "reports": return <ReportsManagement reports={reports} onUpdate={loadData} />;
      case "bans": return <BansManagement bans={bans} onRefresh={loadData} />;
      case "tournaments": return <TournamentManagement tournaments={tournaments.filter(t => t.status !== "Completed" && t.status !== "Cancelled")} onUpdate={loadData} />;
      case "completed": return <TournamentManagement tournaments={tournaments.filter(t => t.status === "Completed" || t.status === "Cancelled")} onUpdate={loadData} />;
      case "registrations": return <div className="space-y-6"><TournamentRegistrations /><TournamentEmailHistory tournaments={tournaments} /></div>;
      case "notices": return <NoticeManagement notices={notices} onUpdate={loadData} />;
      case "payments": return <PaymentManagement requests={paymentRequests} onUpdate={loadData} />;
      case "redeems": return <RedeemManagement requests={redeemRequests} onUpdate={loadData} />;
      case "leaderboard": return <LeaderboardControl users={users} onUpdate={loadData} />;
      case "past": return <PastTournamentManagement pastTournaments={pastTournaments} onUpdate={loadData} />;
      case "banners": return <BannerManagement banners={banners} onUpdate={loadData} />;
      case "appnotices": return <AppNoticeManagement notices={appNotices} onUpdate={loadData} />;
      case "video": return <VideoBannerManagement banners={videoBanners} onUpdate={loadData} />;
      case "referrals": return <ReferralManagement onUpdate={loadData} />;
      case "announcements": return <AnnouncementManagement />;
      case "users": return <UserManagement />;
      case "matchlb": return <TournamentLeaderboardManager onUpdate={loadData} />;
      case "photos": return <PhotoLibraryManagement />;
      case "analytics": return <RealTimeAnalytics />;
      case "theme": return <ThemeManager />;
      case "legal": return <LegalFAQManagement />;
      case "aboutus": return <AboutUsManagement />;
      case "redeemcodes": return <RedeemCodeManagement />;
      case "chatsettings": return <ChatSettingsManager />;
      case "discounts": return <DiscountCodeManager />;
      case "qr": return <QRCodeManagement onUpdate={loadData} />;
      case "tasks": return <AdminTaskManagement />;
      case "templates": return <MessageTemplateManager />;
      case "tutorial": return <TutorialLinkManager />;
      case "walletoverview": return <WalletOverview />;
      case "coinledger": return <CoinLedger />;
      case "user-history": return <UserTournamentHistory />;
      case "all-winners": return <AllWinnersSection />;
      case "create-tournament": navigate(createPageUrl("CreateTournament")); return null;
      case "csLoneWolf": return <ClashSquadLoneWolfManager onUpdate={loadData} />;
      case "teamprofiles": return <TeamProfilesManagement />;
      case "playerprofiles": return <PlayerProfilesManagement />;
      case "killtracker": return <MatchKillTracker onUpdate={loadData} />;
      case "supportcontacts": return <SupportContactManager />;
      default: return <RealTimeAnalytics />;
    }
  };

  const activeLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab)?.label || "Dashboard";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-t-orange-500 border-orange-500/20 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* ── Sidebar Overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-50 flex flex-col
        transform transition-transform lg:translate-x-0 lg:static lg:flex
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">BattleHub</p>
              <p className="text-orange-400 text-[10px] font-semibold tracking-wider uppercase">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Row — Advanced */}
        <div className="px-3 py-4 border-b border-gray-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-lg p-2.5">
              <p className="text-cyan-400 text-lg font-black">{users.length}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Users</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-2.5">
              <p className="text-orange-400 text-lg font-black">{tournaments.filter(t=>t.status!=="Completed"&&t.status!=="Cancelled").length}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Active</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-lg p-2.5">
              <p className="text-red-400 text-lg font-black">{pendingReports.length}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Reports</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-2.5">
              <p className="text-green-400 text-lg font-black">{tournaments.filter(t => t.status === "Completed").length}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Done</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const badge = item.badgeKey ? getBadge(item.badgeKey) : 0;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-orange-500/20 to-red-500/10 text-orange-400 border border-orange-500/20"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-orange-400' : ''}`} />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {badge > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                          {badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3 h-3 opacity-60 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-3 border-t border-gray-800 space-y-2">
          <div className="flex items-center gap-2 px-2 mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">System Online</span>
          </div>
          <a href={base44.agents.getWhatsAppConnectURL('battlehub_whatsapp')} target="_blank" rel="noopener noreferrer">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-green-400 bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-all">
              <MessageCircle className="w-4 h-4" /> WhatsApp Agent
            </button>
          </a>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top Bar — Premium */}
        <header className="sticky top-16 z-30 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/60 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-gray-300 transition-all"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 flex-1">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-500/60 bg-orange-500/5 px-2 py-0.5 rounded">
              Admin Panel
            </div>
            <ChevronRight className="w-3 h-3 text-gray-700 hidden sm:block" />
            <span className="text-white font-semibold text-sm">{activeLabel}</span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              v3.0
            </span>
          </div>

          {/* Quick Actions Group */}
          <div className="flex items-center gap-1.5">
            <div className="hidden lg:flex items-center bg-gray-800/50 border border-gray-700/50 rounded-xl p-0.5 gap-1">
              <button onClick={downloadRegistrations} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-purple-400 hover:bg-purple-500/10 transition-all">
                <Download className="w-3 h-3" /> Reg
              </button>
              <button onClick={downloadPayments} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-green-400 hover:bg-green-500/10 transition-all">
                <Download className="w-3 h-3" /> Pay
              </button>
              <button onClick={downloadRedeems} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-orange-400 hover:bg-orange-500/10 transition-all">
                <Download className="w-3 h-3" /> Redeem
              </button>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold hover:from-orange-500/20 hover:to-red-500/20 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:block">Refresh All</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}