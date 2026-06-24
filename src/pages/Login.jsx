import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChatSettings } from '@/entities/ChatSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User as UserIcon, Lock, Mail, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { login, register, resetPassword } = useAuth();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [bgImage, setBgImage] = useState('');

  useEffect(() => {
    // Load background image from ChatSettings to match GlobalChat
    const fetchBg = async () => {
      try {
        const settings = await ChatSettings.list();
        if (settings && settings.length > 0 && settings[0].background_url) {
          setBgImage(settings[0].background_url);
        }
      } catch (err) {
        console.error("Failed to load background", err);
      }
    };
    fetchBg();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !fullName)) {
      setError('Please fill in all fields');
      return;
    }
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      navigate(createPageUrl("Home"));
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('❌ Wrong Email or Password. Please check again.');
      } else if (err.code === 'auth/wrong-password') {
        setError('❌ Wrong Password. Please try again.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Please login instead.');
      } else {
        setError(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your registered email address');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError(err.message || 'Failed to send reset link.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderForgotPassword = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <button 
          onClick={() => { setIsForgotPassword(false); setError(null); setResetSent(false); }}
          className="text-white/70 hover:text-white flex items-center gap-1 text-sm mb-4 transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
        <h1 className="text-[32px] font-bold text-white tracking-wide">
          Forgot Password
        </h1>
        <p className="text-white/90 text-sm mt-1">
          Enter your email to receive a secure password reset link.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl text-xs mb-6 font-medium">
          {error}
        </div>
      )}

      {resetSent ? (
        <div className="bg-[#3bb652]/20 border border-[#3bb652]/50 text-[#3bb652] px-4 py-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 mb-6">
          <CheckCircle2 className="w-12 h-12" />
          <div>
            <h3 className="font-bold text-lg text-white">Link Sent Successfully!</h3>
            <p className="text-white/80 text-sm mt-2">
              We've sent a password reset link to <b>{email}</b>. 
            </p>
            <div className="mt-3 bg-red-500/20 border border-red-500/50 p-2 rounded text-red-100 text-xs font-semibold">
              ⚠️ IMPORTANT: Please check your SPAM or JUNK folder if you don't see it in your inbox!
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="relative">
            <Input
              type="email"
              placeholder="Registered Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 pl-5 pr-12 rounded-[14px] bg-transparent border-white/40 text-white placeholder:text-white/70 focus:border-white focus:bg-white/10 transition-colors text-[15px]"
            />
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
          </div>
          <div className="pt-5">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] rounded-2xl font-bold text-[17px] tracking-wide text-white border-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(90deg, #9bc83a 0%, #2f9a4b 100%)',
                boxShadow: '0 4px 15px rgba(47, 154, 75, 0.4)'
              }}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-gray-900 bg-cover bg-center bg-no-repeat relative transition-all duration-700"
      style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none' }}
    >
      {/* Dark overlay for text readability against bright backgrounds */}
      <div className="absolute inset-0 bg-black/30" />
      
      <div 
        className="w-full max-w-[380px] relative z-10 rounded-[28px] p-8 overflow-hidden transition-all duration-500"
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
        }}
      >
        {isForgotPassword ? renderForgotPassword() : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h1 className="text-[32px] font-bold text-white tracking-wide">
                {isLogin ? 'Login' : 'Signup'}
              </h1>
              <p className="text-white/90 text-sm mt-1">
                {isLogin ? 'Welcome back please login to your account' : 'Create an account to join the tournament'}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl text-xs mb-6 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-14 pl-5 pr-12 rounded-[14px] bg-transparent border-white/40 text-white placeholder:text-white/70 focus:border-white focus:bg-white/10 transition-colors text-[15px]"
                  />
                  <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                </div>
              )}

              <div className="relative">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 pl-5 pr-12 rounded-[14px] bg-transparent border-white/40 text-white placeholder:text-white/70 focus:border-white focus:bg-white/10 transition-colors text-[15px]"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 pl-5 pr-12 rounded-[14px] bg-transparent border-white/40 text-white placeholder:text-white/70 focus:border-white focus:bg-white/10 transition-colors text-[15px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {isLogin && (
                <div className="flex items-center justify-between px-1 pt-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="remember" className="w-[18px] h-[18px] accent-[#3bb652] cursor-pointer" />
                    <label htmlFor="remember" className="text-white/90 text-sm cursor-pointer select-none">
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(null); }}
                    className="text-white/70 hover:text-white text-sm font-medium transition-colors focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <div className="pt-5">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[52px] rounded-2xl font-bold text-[17px] tracking-wide text-white border-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(90deg, #9bc83a 0%, #2f9a4b 100%)',
                    boxShadow: '0 4px 15px rgba(47, 154, 75, 0.4)'
                  }}
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isLogin ? 'Login' : 'Signup')}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-white/90 text-[14px]">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(null); }}
                  className="font-bold text-white hover:underline decoration-white/70 underline-offset-4 focus:outline-none"
                >
                  {isLogin ? 'Signup' : 'Login'}
                </button>
              </p>
            </div>
            
            {/* Footer note */}
            {isLogin && (
              <div className="mt-8 text-center">
                <p className="text-white/60 text-[11px] tracking-wider">
                  Powered by <span className="font-bold italic">BattleHub FF</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
