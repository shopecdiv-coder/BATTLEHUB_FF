import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { useEffect } from 'react'
import { initializeNativeFeatures } from '@/lib/nativeBridge'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ThemeProvider } from '@/components/ThemeProvider';
import ErrorBoundary from '@/components/ErrorBoundary';

import Login from './pages/Login';
import { CallProvider } from '@/lib/CallContext';
import AudioCallScreen from '@/components/chat/AudioCallScreen';
import { App as CapacitorApp } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';

function DeepLinkListener() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const listener = CapacitorApp.addListener('appUrlOpen', data => {
      // Example data.url: 'battlehub://app/profile?openDrawer=party' or 'https://battlehubff-8dbc7.firebaseapp.com/profile'
      try {
        const url = new URL(data.url);
        // Ensure we handle our custom scheme
        if (url.protocol === 'battlehub:' && url.hostname === 'app') {
          navigate(url.pathname + url.search);
        } else if (url.hostname === 'battlehubff-8dbc7.firebaseapp.com') {
          // Normal HTTPS deep link
          navigate(url.pathname + url.search);
        }
      } catch (e) {
        console.error("Deep link parsing failed", e);
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [navigate]);

  return null;
}

window.setFCMToken = (token) => {
  if (token) {
    localStorage.setItem('fcm_token', token);
    window.dispatchEvent(new CustomEvent('fcmTokenReceived', { detail: token }));
  }
};

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => {
  const location = useLocation();
  const showLayout = Layout && location.pathname !== '/auth/login';
  return showLayout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, user } = useAuth();
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

  // If authenticated but email not verified, force redirect to /auth/login (Admins bypass verification)
  if (isAuthenticated && user && !user.emailVerified && user.role !== 'admin' && location.pathname !== '/auth/login') {
    return <Navigate to="/auth/login" replace />;
  }

  // If authenticated and verified (or admin), but trying to access login, redirect to root
  if (isAuthenticated && (user?.emailVerified || user?.role === 'admin') && location.pathname === '/auth/login') {
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

  useEffect(() => {
    // Initialize Capacitor native features (Android/iOS only, silently skipped on web)
    initializeNativeFeatures();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <CallProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <DeepLinkListener />
              <NavigationTracker />
              <ErrorBoundary>
                <AuthenticatedApp />
              </ErrorBoundary>
            </Router>
            <Toaster />
            <SonnerToaster />
            <AudioCallScreen />
            <VisualEditAgent />
          </QueryClientProvider>
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
