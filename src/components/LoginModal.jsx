import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Mail, Lock, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
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
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to log in. Please check your credentials.');
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
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { clearForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-[450px] bg-slate-950 border border-slate-800 text-white rounded-2xl p-6 shadow-2xl shadow-purple-500/10">
        <DialogHeader className="flex flex-col items-center justify-center space-y-2 pb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight text-center bg-gradient-to-r from-orange-400 via-red-500 to-purple-500 bg-clip-text text-transparent">
            BATTLEHUB FF
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm text-center">
            India's #1 Free Fire Tournament Platform
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(tab) => { setError(null); setActiveTab(tab); }} className="w-full">
          <TabsList className="grid grid-cols-2 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-4">
            <TabsTrigger value="login" className="rounded-lg font-bold text-xs py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              Log In
            </TabsTrigger>
            <TabsTrigger value="register" className="rounded-lg font-bold text-xs py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-slate-300 text-xs font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-900/50 border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-white pl-10 rounded-xl"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-slate-300 text-xs font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-900/50 border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-white pl-10 rounded-xl"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 font-bold text-sm py-5 rounded-xl shadow-lg shadow-orange-500/20 active:scale-98 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name" className="text-slate-300 text-xs font-semibold">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-slate-900/50 border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-white pl-10 rounded-xl"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-slate-300 text-xs font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-900/50 border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-white pl-10 rounded-xl"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-slate-300 text-xs font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="•••••••• (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-900/50 border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-white pl-10 rounded-xl"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 font-bold text-sm py-5 rounded-xl shadow-lg shadow-orange-500/20 active:scale-98 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
