import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { Registration } from "@/entities/Registration";
import { Diamond } from "@/entities/Diamond";
import { ActiveUser } from "@/entities/ActiveUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Activity, TrendingUp, DollarSign, Trophy, Clock, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function RealTimeAnalytics() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    todayRegistrations: 0,
    todayRevenue: 0,
    recentUsers: [],
    topPlayers: [],
    activeHistory: []
  });
  const [loading, setLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const allUsersRef = useRef([]);

  useEffect(() => {
    loadAnalytics();
    // No auto-refresh — use manual refresh button to avoid UI flicker
  }, []);

  const loadAnalytics = async () => {
    try {
      // Load all users in a single fetch (up to 5000)
      const allUsers = await User.list("-created_date", 5000).catch(() => []);
      allUsersRef.current = allUsers;

      const [allRegistrations, allActiveUsers] = await Promise.all([
        Registration.list("-created_date", 200),
        ActiveUser.list("-last_active", 2000).catch(() => [])
      ]);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // All users active in last 24 hours
      const activeIn24h = allActiveUsers.filter(u => {
        if (!u.last_active) return false;
        return new Date(u.last_active) >= last24Hours;
      });

      const todayRegs = allRegistrations.filter(r => 
        new Date(r.created_date) >= todayStart
      );
      
      const todayRevenue = todayRegs.length * 10;

      // Recent users
      const recentActiveUsers = allActiveUsers.slice(0, 20);
      const recentUsers = [];
      for (const activeUser of recentActiveUsers) {
        const userData = allUsers.find(u => u.id === activeUser.user_id);
        if (userData) {
          recentUsers.push({ ...userData, lastSeen: new Date(activeUser.last_active) });
        }
        if (recentUsers.length >= 10) break;
      }

      const topPlayers = [...allUsers]
        .filter(u => u.total_wins > 0)
        .sort((a, b) => (b.total_wins || 0) - (a.total_wins || 0))
        .slice(0, 5);

      setStats({
        totalUsers: allUsers.length,
        onlineUsers: activeIn24h.length,
        todayRegistrations: todayRegs.length,
        todayRevenue,
        recentUsers,
        topPlayers,
        activeHistory: activeIn24h
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Analytics Overview
          </h3>
          <p className="text-sm text-gray-400">App statistics & user activity</p>
        </div>
        <button
          onClick={() => { setLoading(true); loadAnalytics(); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-600/20 to-cyan-800/10 border border-cyan-500/30 p-5 group hover:border-cyan-400/50 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="text-[10px] text-cyan-500/60 font-medium uppercase tracking-wider">All Time</span>
            </div>
            <p className="text-3xl font-black text-white tracking-tight">{stats.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-cyan-400/70 mt-1 font-medium">Total Users</p>
            <div className="mt-3 h-1 bg-cyan-500/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" style={{ width: `${Math.min(100, (stats.totalUsers / 1000) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-600/20 to-green-800/10 border border-green-500/30 p-5 group hover:border-green-400/50 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-5 h-5 text-green-400" />
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] text-green-500/60 font-medium uppercase tracking-wider">Live</span>
              </div>
            </div>
            <p className="text-3xl font-black text-white tracking-tight">{stats.onlineUsers.toLocaleString()}</p>
            <p className="text-xs text-green-400/70 mt-1 font-medium">Active (24h)</p>
            <div className="mt-3 h-1 bg-green-500/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" style={{ width: `${Math.min(100, (stats.onlineUsers / 500) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/30 p-5 group hover:border-purple-400/50 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-[10px] text-purple-500/60 font-medium uppercase tracking-wider">Today</span>
            </div>
            <p className="text-3xl font-black text-white tracking-tight">{stats.todayRegistrations}</p>
            <p className="text-xs text-purple-400/70 mt-1 font-medium">Registrations</p>
            <div className="mt-3 h-1 bg-purple-500/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{ width: `${Math.min(100, (stats.todayRegistrations / 50) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-800/10 border border-amber-500/30 p-5 group hover:border-amber-400/50 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] text-amber-500/60 font-medium uppercase tracking-wider">Today</span>
            </div>
            <p className="text-3xl font-black text-white tracking-tight">{stats.todayRevenue}</p>
            <p className="text-xs text-amber-400/70 mt-1 font-medium">BH Coins Revenue</p>
            <div className="mt-3 h-1 bg-amber-500/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: `${Math.min(100, (stats.todayRevenue / 500) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Recent Users (Live)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentUsers.map((user) => {
                const lastSeen = user.lastSeen;
                const now = new Date();
                const diffSeconds = Math.floor((now - lastSeen) / 1000);
                const isOnline = diffSeconds < 60;
                let timeAgo = diffSeconds < 10 ? "Just now" : diffSeconds < 60 ? `${diffSeconds}s ago` : diffSeconds < 3600 ? `${Math.floor(diffSeconds/60)}m ago` : `${Math.floor(diffSeconds/3600)}h ago`;
                return (
                  <div key={user.id} className="flex items-center gap-3 p-2 bg-gray-700/50 rounded-lg">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-cyan-600 text-white">{user.ign?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-700 rounded-full"></span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{user.ign || user.full_name}</p>
                      <p className="text-xs text-gray-500">{timeAgo}</p>
                    </div>
                    <Badge className={`text-xs ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Players */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Top 5 Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center gap-3 p-2 bg-gray-700/50 rounded-lg">
                  <div className="w-6 text-center"><span className="text-yellow-400 font-bold">#{index + 1}</span></div>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={player.avatar_url} />
                    <AvatarFallback className="bg-purple-600 text-white">{player.ign?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{player.ign || player.full_name}</p>
                    <div className="flex gap-3 text-xs">
                      <span className="text-cyan-400">{player.total_wins || 0} Wins</span>
                      <span className="text-red-400">{player.total_kills || 0} Kills</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 24h Active Users History */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Last 24 Hours Login History ({stats.activeHistory?.length || 0} users)
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search by name or ID..." className="bg-gray-700 border-gray-600 text-white pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {(stats.activeHistory || [])
              .filter(u => {
                if (!historySearch) return true;
                const q = historySearch.toLowerCase();
                const userInfo = allUsersRef.current?.find(u2 => u2.id === u.user_id);
                return (
                  u.user_id?.toLowerCase().includes(q) ||
                  userInfo?.ign?.toLowerCase().includes(q) ||
                  userInfo?.full_name?.toLowerCase().includes(q)
                );
              })
              .map((activeUser, idx) => {
                const diff = Math.floor((Date.now() - new Date(activeUser.last_active)) / 1000);
                const timeAgo = diff < 60 ? `${diff}s ago` : diff < 3600 ? `${Math.floor(diff/60)}m ago` : `${Math.floor(diff/3600)}h ago`;
                const userInfo = allUsersRef.current?.find(u => u.id === activeUser.user_id);
                return (
                  <div key={activeUser.id || idx} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg text-sm">
                    <div>
                      <p className="text-white text-sm font-semibold">{userInfo?.ign || userInfo?.full_name || 'Unknown'}</p>
                      <p className="text-gray-500 font-mono text-xs">{activeUser.user_id}</p>
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">{timeAgo}</Badge>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}