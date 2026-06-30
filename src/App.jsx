import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Login from './pages/Login';
import { CallProvider } from '@/lib/CallContext';
import AudioCallScreen from '@/components/chat/AudioCallScreen';

window.setFCMToken = (token) => {
  if (token) {
    localStorage.setItem('fcm_token', token);
    window.dispatchEvent(new CustomEvent('fcmTokenReceived', { detail: token }));
  }
};

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // If not authenticated, force redirect to /auth/login
  if (!isAuthenticated && location.pathname !== '/auth/login') {
    return <Navigate to="/auth/login" replace />;
  }

  // If authenticated and trying to access login, redirect to root
  if (isAuthenticated && location.pathname === '/auth/login') {
    return <Navigate to="/" replace />;
  }

  // Render the main app
  return (
    <LayoutWrapper currentPageName={location.pathname.replace(/^\//, '') || mainPageKey}>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/auth/login" element={<Login />} />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={<Page />}
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </LayoutWrapper>
  );
};


function App() {

  return (
    <AuthProvider>
      <CallProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <AudioCallScreen />
          <VisualEditAgent />
        </QueryClientProvider>
      </CallProvider>
    </AuthProvider>
  )
}

export default App
