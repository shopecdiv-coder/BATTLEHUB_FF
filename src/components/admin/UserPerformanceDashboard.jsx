import React, { useState, useEffect, useMemo } from "react";
import { Registration } from "@/entities/Registration";
import { Diamond } from "@/entities/Diamond";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Trophy, Target, Coins, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function UserPerformanceDashboard({ user, userRegistrations, userDiamond }) {
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadLeaderboardData();
  }, [user?.id]);

  const loadLeaderboardData = async () => {
    const entries = await TournamentLeaderboard.filter({ user_id: user.id }, "-created_date", 20).catch(() => []);
    setLeaderboardEntries(entries || []);
    setLoading(false);
  };

  // Build monthly tournament participation from registrations
  const monthlyData = useMemo(() => {
    const map = {};
    (userRegistrations || []).forEach(reg => {
      if (!reg.created_date) return;
      try {
        const month = format(new Date(reg.created_date), "MMM yy");
        map[month] = (map[month] || 0) + 1;
      } catch (e) {}
    });
    return Object.entries(map).slice(-6).map(([month, count]) => ({ month, tournaments: count }));
  }, [userRegistrations]);

  // Kills per tournament from leaderboard entries
  const killsData = useMemo(() => {
    return leaderboardEntries.slice(0, 10).reverse().map((e, i) => ({
      name: e.tournament_title?.slice(0, 10) || `T${i + 1}`,
      kills: e.kills || 0,
      points: e.points || 0,
    }));
  }, [leaderboardEntries]);

  // Win/Loss ratio
  const totalTournaments = userRegistrations?.length || 0;
  const totalWins = leaderboardEntries.filter(e => e.wins > 0).length;
  const totalLosses = totalTournaments - totalWins;
  const winRate = totalTournaments > 0 ? Math.round((totalWins / totalTournaments) * 100) : 0;

  // Earnings from transactions
  const earningsData = useMemo(() => {
    const map = {};
    (userDiamond?.transactions || [])
      .filter(t => t.type === "Win" || t.type === "Diamond Earned")
      .forEach(t => {
        if (!t.timestamp) return;
        try {
          const month = format(new Date(t.timestamp), "MMM yy");
          map[month] = (map[month] || 0) + (t.amount || 0);
        } catch(e) {}
      });
    return Object.entries(map).slice(-6).map(([month, earned]) => ({ month, earned }));
  }, [userDiamond]);

  const pieData = [
    { name: "Wins", value: totalWins || 0, color: "#22c55e" },
    { name: "Losses", value: Math.max(totalLosses, 0), color: "#ef4444" },
  ].filter(d => d.value > 0);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border border-cyan-500/30 rounded-lg p-3 text-center">
          <Calendar className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-cyan-400">{totalTournaments}</p>
          <p className="text-xs text-gray-500">Tournaments</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-500/30 rounded-lg p-3 text-center">
          <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-yellow-400">{totalWins}</p>
          <p className="text-xs text-gray-500">Wins</p>
        </div>
        <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-500/30 rounded-lg p-3 text-center">
          <Target className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-400">
            {leaderboardEntries.reduce((s, e) => s + (e.kills || 0), 0)}
          </p>
          <p className="text-xs text-gray-500">Total Kills</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-500/30 rounded-lg p-3 text-center">
          <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-400">{winRate}%</p>
          <p className="text-xs text-gray-500">Win Rate</p>
        </div>
      </div>

      {/* Win/Loss Pie + Monthly Tournaments */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Win / Loss Ratio */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Win / Loss Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">No tournament data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Participation */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Monthly Participation</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", color: "#fff" }} />
                  <Bar dataKey="tournaments" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kills Per Tournament */}
      {killsData.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Kills Per Tournament</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={killsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", color: "#fff" }} />
                <Line type="monotone" dataKey="kills" stroke="#f87171" strokeWidth={2} dot={{ fill: "#f87171", r: 3 }} />
                <Line type="monotone" dataKey="points" stroke="#a78bfa" strokeWidth={2} dot={{ fill: "#a78bfa", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block"></span> Kills</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-400 inline-block"></span> Points</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Trend */}
      {earningsData.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" /> Earnings Trend (Coins)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", color: "#fff" }} />
                <Bar dataKey="earned" fill="#facc15" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}