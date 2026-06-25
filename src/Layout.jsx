import React, { useState, useEffect, createContext, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Trophy,
  Users,
  Shield,
  Menu,
  X,
  PlusCircle,
  BarChart2,
  Wallet,
  LogOut,
  User as UserIcon,
  HelpCircle,
  Bell,
  Star,
  BookOpen,
  MessageCircle,
  Gift
} from "lucide-react";
import { PlayerMessage } from "@/entities/PlayerMessage";
import { AppSettings } from "@/entities/AppSettings";
import { ActiveUser } from "@/entities/ActiveUser";

import GlobalRegistrationMessage from "./components/GlobalRegistrationMessage";
import GlobalMatchCredentials from "./components/GlobalMatchCredentials";
import GlobalInviteManager from "./components/GlobalInviteManager";
import NotificationBell from "./components/NotificationBell";
import BottomNavigation from "./components/BottomNavigation";
import WelcomeBonusHandler from "./components/WelcomeBonusHandler";
import ChatUnreadTracker from "./components/ChatUnreadTracker";
import LoadingBar from "./components/LoadingBar";
import PhoneNumberModal from "./components/PhoneNumberModal";
import PolicyAcceptanceModal from "./components/PolicyAcceptanceModal";
import { useAuth } from "@/lib/AuthContext";



import { useSupportUnreadCount } from "./components/admin/UnreadTrackers";

// --- CONTEXT LOGIC MOVED HERE ---
const SidebarContext = createContext();

function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

function SidebarContent({ navItems, user, unreadMessages, unreadSupport, onLogout }) {
  const { setOpen } = useSidebar();
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="p-6 border-b border-gray-800 flex items-center gap-3">
        <Trophy className="w-8 h-8 text-orange-400" />
        <span className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
          BATTLE HUB
        </span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              location.pathname === item.href
                ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
            {item.name === "Support" && unreadSupport > 0 && (
              <Badge className="ml-auto bg-red-500 text-white animate-pulse">{unreadSupport}</Badge>
            )}
          </Link>
        ))}
        {user?.role === "admin" && (
          <Link
            to={createPageUrl("AdminDashboard")}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              location.pathname === createPageUrl("AdminDashboard")
                ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Shield className="w-5 h-5 text-red-400" />
            <span>Admin Dashboard</span>
          </Link>
        )}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <Button onClick={onLogout} className="w-full bg-red-600 hover:bg-red-700">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}

function Header({ user, onLogout, unreadMessages, onLoginClick }) {
  const { open, setOpen } = useSidebar();
  const navigate = useNavigate();

  // Reset glass-mode just in case it was applied
  useEffect(() => {
    document.documentElement.classList.remove("glass-mode");
    localStorage.removeItem("glassMode");
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800 transition-colors">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Home")} className="flex items-center gap-2">
              <span className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                BATTLEHUB FF
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user && <NotificationBell />}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-orange-400 object-cover">
                      <AvatarImage src={user.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${user.email}`} className="object-cover" />
                      <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-gray-900 border-gray-700 text-white" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.full_name}</p>
                      <p className="text-xs leading-none text-gray-400">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem onClick={() => navigate(createPageUrl("Profile"))} className="hover:bg-gray-800 focus:bg-gray-800">
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(createPageUrl("Wallet"))} className="hover:bg-gray-800 focus:bg-gray-800">
                    <Wallet className="mr-2 h-4 w-4" /> Wallet
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem onClick={onLogout} className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate(createPageUrl("Login"))} size="sm" className="bg-gradient-to-r from-orange-500 to-red-500">
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function LayoutContent({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const { user: authUser, logout: authLogout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [referralPageVisible, setReferralPageVisible] = useState(true);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const { open, setOpen } = useSidebar();
  const navigate = useNavigate();
  
  const unreadSupport = useSupportUnreadCount(user?.id);

  const baseNavItems = [
    { name: "Home", href: createPageUrl("Home"), icon: Home },
    { name: "Tournaments", href: createPageUrl("Tournaments"), icon: Trophy },
    { name: "My Tournaments", href: createPageUrl("MyTournaments"), icon: Star },
    { name: "Past Tournaments", href: createPageUrl("PastTournaments"), icon: BookOpen },
    { name: "Leaderboard", href: createPageUrl("Leaderboard"), icon: BarChart2 },
    { name: "Ratings", href: createPageUrl("Ratings"), icon: Star },
    { name: "Notices", href: createPageUrl("Notices"), icon: Bell },
    { name: "Support", href: createPageUrl("Support"), icon: HelpCircle },
    { name: "Referrals", href: createPageUrl("Referrals"), icon: Gift, requireVisible: true },
    { name: "About Us", href: createPageUrl("AboutUs"), icon: BookOpen }
  ];

  // Filter nav items based on visibility settings
  const navItems = baseNavItems.filter(item => {
    if (item.name === "Referrals" && !referralPageVisible) return false;
    return true;
  });

  useEffect(() => {
    const handleOpenLogin = () => navigate('/auth/login');
    window.addEventListener('open-login-modal', handleOpenLogin);
    return () => window.removeEventListener('open-login-modal', handleOpenLogin);
  }, [navigate]);

  useEffect(() => {
    setLoading(false);

    AppSettings.filter({ setting_key: "referral_page_visible" })
      .then(s => s.length > 0 && setReferralPageVisible(s[0].is_enabled))
      .catch(() => {});

    if (authUser) {
      const syncUser = async () => {
        if (authUser.is_banned) {
          const banUntil = authUser.ban_until ? new Date(authUser.ban_until) : null;
          if (!banUntil || banUntil > new Date()) {
            await authLogout();
            alert(`🚫 Banned: ${authUser.ban_reason || 'Violation'}`);
            window.location.reload();
            return;
          }
        }
        
        let currentUser = { ...authUser };
        
        if (!currentUser.unique_id) {
          const raw = currentUser.id.replace(/-/g, "");
          const uniqueId = `BH${raw.slice(-8).toUpperCase()}`;
          await User.updateMyUserData({ unique_id: uniqueId }).catch(() => {});
          currentUser.unique_id = uniqueId;
        }
        
        setUser(currentUser);
        
        if (!currentUser.phone && !currentUser.mobile_number) {
          setShowPhoneModal(true);
        }
        
        const activeUsers = await ActiveUser.filter({ user_id: currentUser.id }).catch(() => []);
        if (activeUsers.length > 0) {
          await ActiveUser.update(activeUsers[0].id, { last_active: new Date().toISOString() });
        } else {
          await ActiveUser.create({ user_id: currentUser.id, last_active: new Date().toISOString() });
        }
      };
      syncUser();
    } else {
      setUser(null);
    }
  }, [authUser]);

  useEffect(() => {
    if (!user) return;
    const activityInterval = setInterval(() => {
      ActiveUser.filter({ user_id: user.id }).then(async activeUsers => {
        if (activeUsers.length > 0) {
          await ActiveUser.update(activeUsers[0].id, { last_active: new Date().toISOString() });
        }
      }).catch(() => {});
    }, 600000);

    return () => clearInterval(activityInterval);
  }, [user]);

  const handleLogout = async () => {
    await User.logout();
    navigate(createPageUrl("Home"));
    setUser(null);
  };



  return (
    <div className="min-h-screen bg-black text-white pb-20 lg:pb-0" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
      {/* Top Loading Bar */}
      <LoadingBar />

      <div className="absolute inset-0 bg-black z-0"></div>

      <div className="relative z-10 min-h-screen bg-black">
        <Header user={user} onLogout={handleLogout} unreadMessages={unreadMessages} onLoginClick={() => navigate('/auth/login')} />
        <main className="pt-16">
          <div className="max-w-screen-2xl mx-auto px-0 py-2 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Bottom Navigation - shows on all screen sizes */}
      {user && <BottomNavigation />}
      
      {/* Global Modals */}
      {user && showPhoneModal && (
        <PhoneNumberModal 
          user={user} 
          onComplete={async () => {
            setShowPhoneModal(false);
            const updatedUser = await User.me();
            setUser(updatedUser);
          }} 
        />
      )}
      {user && !showPhoneModal && <PolicyAcceptanceModal />}
      <GlobalMatchCredentials />
      <GlobalInviteManager />
      <WelcomeBonusHandler />
      <ChatUnreadTracker />
      
    </div>
  );
}


export default function Layout({ children, currentPageName }) {
  return (
    <SidebarProvider>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </SidebarProvider>
  );
}