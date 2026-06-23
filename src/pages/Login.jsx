import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Mail, Lock, User as UserIcon, Loader2, AlertCircle, Shield, Gamepad2, Users, Zap } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(createPageUrl("Home"));
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Account not found. If you are an existing player, please use "Sign Up" tab with your same email to activate your account.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err.message || 'Failed to log in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(email, password, fullName);
      navigate(createPageUrl("Home"));
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use "Log In" tab instead.');
      } else {
        setError(err.message || 'Failed to register. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-gray-950 to-red-500/5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-orange-500/8 to-transparent rounded-full blur-3xl" />
      
      {/* Main Card */}
      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-red-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/25 mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-center bg-gradient-to-r from-orange-400 via-red-500 to-purple-500 bg-clip-text text-transparent">
            BATTLEHUB FF
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">India's #1 Free Fire Tournament Platform</p>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold">2500+ Players</span>
          </div>
          <div className="w-1 h-1 bg-gray-700 rounded-full" />
          <div className="flex items-center gap-1.5 text-gray-500">
            <Gamepad2 className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-semibold">Daily Tournaments</span>
          </div>
          <div className="w-1 h-1 bg-gray-700 rounded-full" />
          <div className="flex items-center gap-1.5 text-gray-500">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold">Win Cash</span>
          </div>
        </div>

        {/* Card */}
        <Card className="bg-gray-900/80 border border-gray-800 text-white rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-sm">
          <CardContent className="p-5">
            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={(tab) => { setError(null); setActiveTab(tab); }} className="w-full">
              <TabsList className="grid grid-cols-2 bg-gray-800 border border-gray-700/50 rounded-xl p-1 mb-5">
                <TabsTrigger value="login" className="rounded-lg font-bold text-xs py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md">
                  Log In
                </TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg font-bold text-xs py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-gray-400 text-xs font-semibold">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-800/80 border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 text-white pl-11 rounded-xl h-12 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-gray-400 text-xs font-semibold">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-gray-800/80 border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 text-white pl-11 rounded-xl h-12 text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Log In
                      </>
                    )}
                  </Button>

                  {/* Migration Notice */}
                  <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-3 mt-3">
                    <p className="text-blue-400 text-[11px] font-medium text-center leading-relaxed">
                      ℹ️ Existing BattleHub player? If you can't log in, use the <button type="button" onClick={() => setActiveTab('register')} className="underline font-bold text-blue-300">Sign Up</button> tab with your same email to activate your account. Your data will be restored automatically.
                    </p>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-gray-400 text-xs font-semibold">Full Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="bg-gray-800/80 border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 text-white pl-11 rounded-xl h-12 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-gray-400 text-xs font-semibold">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-800/80 border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 text-white pl-11 rounded-xl h-12 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-gray-400 text-xs font-semibold">Password (min 6 characters)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-gray-800/80 border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 text-white pl-11 rounded-xl h-12 text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Create Account
                      </>
                    )}
                  </Button>

                  {/* Migration Notice */}
                  <div className="bg-green-500/8 border border-green-500/15 rounded-xl p-3 mt-3">
                    <p className="text-green-400 text-[11px] font-medium text-center leading-relaxed">
                      ✅ If you're an existing BattleHub player, sign up with your <strong>same email</strong>. Your stats, coins, and tournament history will be automatically linked to your new account.
                    </p>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-600 text-[10px] mt-4 font-medium">
          By continuing, you agree to BattleHub's Terms of Service & Privacy Policy
        </p>
      </div>
    </div>
  );
}
