/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AboutUs from './pages/AboutUs';
import AdminDashboard from './pages/AdminDashboard';
import CreateTournament from './pages/CreateTournament';
import EarnDiamonds from './pages/EarnDiamonds';
import FAQs from './pages/FAQs';
import Community from './pages/Community';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import MatchDetail from './pages/MatchDetail';
import Menu from './pages/Menu';
import MyTournaments from './pages/MyTournaments';
import NoticeDetail from './pages/NoticeDetail';
import Notices from './pages/Notices';
import PastTournamentDetail from './pages/PastTournamentDetail';
import PastTournaments from './pages/PastTournaments';
import PlayerProfile from './pages/PlayerProfile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import Ratings from './pages/Ratings';
import Referrals from './pages/Referrals';
import RefundPolicy from './pages/RefundPolicy';
import Rules from './pages/Rules';
import ShareApp from './pages/ShareApp';
import Support from './pages/Support';
import TermsConditions from './pages/TermsConditions';
import TeamProfile from './pages/TeamProfile';
import TournamentDetail from './pages/TournamentDetail';
import Tournaments from './pages/Tournaments';
import Wallet from './pages/Wallet';
import JourneyHistory from './pages/JourneyHistory';
import MediaFeed from './pages/MediaFeed';
import ResetPassword from './pages/ResetPassword';
import __Layout from './Layout.jsx';

export const PAGES = {
    "AboutUs": AboutUs,
    "AdminDashboard": AdminDashboard,
    "CreateTournament": CreateTournament,
    "EarnDiamonds": EarnDiamonds,
    "FAQs": FAQs,
    "Community": Community,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "MatchDetail": MatchDetail,
    "Menu": Menu,
    "MyTournaments": MyTournaments,
    "NoticeDetail": NoticeDetail,
    "Notices": Notices,
    "PastTournamentDetail": PastTournamentDetail,
    "PastTournaments": PastTournaments,
    "PlayerProfile": PlayerProfile,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "Ratings": Ratings,
    "Referrals": Referrals,
    "RefundPolicy": RefundPolicy,
    "Rules": Rules,
    "ShareApp": ShareApp,
    "Support": Support,
    "TermsConditions": TermsConditions,
    "TeamProfile": TeamProfile,
    "TournamentDetail": TournamentDetail,
    "Tournaments": Tournaments,
    "Wallet": Wallet,
    "JourneyHistory": JourneyHistory,
    "MediaFeed": MediaFeed,
    "ResetPassword": ResetPassword,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};