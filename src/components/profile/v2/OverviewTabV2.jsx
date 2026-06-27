import React, { useState, useEffect, useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Target, Trophy, Crosshair, Flame, Calendar, Activity, BarChart2 } from 'lucide-react';
import { format } from "date-fns";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Registration } from "@/entities/Registration";

const radarData = [
  { subject: 'Combat', A: 85.7, fullMark: 100 },
  { subject: 'Survival', A: 72.3, fullMark: 100 },
  { subject: 'Support', A: 68.1, fullMark: 100 },
  { subject: 'Win Rate', A: 78.4, fullMark: 100 },
  { subject: 'Strategy', A: 81.6, fullMark: 100 },
];

const CustomTick = ({ payload, x, y, textAnchor, stroke, radius }) => {
  const item = radarData.find(d => d.subject === payload.value);
  return (
    <g>
      <text x={x} y={y - 8} textAnchor={textAnchor} fill="#9ca3af" fontSize={11} fontWeight={500}>
        {payload.value}
      </text>
      <text x={x} y={y + 10} textAnchor={textAnchor} fill="#ffffff" fontSize={14} fontWeight={700}>
        {item?.A}
      </text>
    </g>
  );
};

export default function OverviewTabV2({ player, tabType = "your" }) {
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (player?.id) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [entries, regs] = await Promise.all([
            TournamentLeaderboard.filter({ user_id: player.id }, "-created_date", 20).catch(() => []),
            Registration.filter({ user_id: player.id }, "-created_date", 50).catch(() => [])
          ]);
          setLeaderboardEntries(entries || []);
          setRegistrations(regs || []);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
        setLoading(false);
    }
  }, [player?.id]);

  // Derived stats
  const safeMatches = typeof player?.matches === 'string' ? Number(player.matches.replace(/,/g, '')) : (player?.matches || 0);
  const safeWins = typeof player?.wins === 'string' ? Number(player.wins.replace(/,/g, '')) : (player?.wins || 0);
  const safeWinRate = typeof player?.winRate === 'string' ? Number(player.winRate.replace(/,/g, '')) : (player?.winRate || 0);
  const safeKills = typeof player?.kills === 'string' ? Number(player.kills.replace(/,/g, '')) : (player?.kills || 0);

  const totalTournaments = registrations?.length || safeMatches;
  const totalWins = leaderboardEntries.filter(e => e.wins > 0).length || safeWins;
  const totalLosses = Math.max(0, totalTournaments - totalWins);
  const winRate = totalTournaments > 0 ? Math.round((totalWins / totalTournaments) * 100) : safeWinRate;
  const totalKills = leaderboardEntries.reduce((s, e) => s + (e.kills || 0), 0) || safeKills;

  // Monthly Participation
  const monthlyData = useMemo(() => {
    const map = {};
    (registrations || []).forEach(reg => {
      if (!reg.created_date) return;
      try {
        const month = format(new Date(reg.created_date), "MMM yy");
        map[month] = (map[month] || 0) + 1;
      } catch (e) {
        console.warn("Invalid date for registration:", reg);
      }
    });
    return Object.entries(map).slice(-5).map(([month, count]) => ({ month, tournaments: count }));
  }, [registrations]);

  // Kills per tournament
  const killsData = useMemo(() => {
    return leaderboardEntries.slice(0, 8).reverse().map((e, i) => ({
      name: e.tournament_title?.slice(0, 6) || `T${i + 1}`,
      kills: e.kills || 0,
      points: e.points || 0,
    }));
  }, [leaderboardEntries]);

  const pieData = [
    { name: "Wins", value: totalWins, color: "#4ade80" },
    { name: "Losses", value: totalLosses, color: "#f87171" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <Card className="bg-[#0b0c10] border border-[#1f2029] rounded-2xl overflow-hidden shadow-lg">
        <CardContent className="p-4 sm:p-6">
          
          {/* Header Row */}
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="font-bold text-white text-sm sm:text-base uppercase tracking-widest">
              {tabType === 'team' ? 'Team Performance' : 'Your Performance'}
            </h3>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 lg:items-center">
            
            {/* Radar Chart Section (Left) */}
            <div className="flex-1 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                  <PolarGrid stroke="#2a2a35" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={<CustomTick />}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar 
                    name="Player" 
                    dataKey="A" 
                    stroke="#ff5500" 
                    strokeWidth={2}
                    fill="#ff5500" 
                    fillOpacity={0.3} 
                  />
                  {/* Inner points on radar vertices */}
                  <Radar 
                    name="PlayerDots" 
                    dataKey="A" 
                    stroke="none" 
                    fill="#ff5500" 
                    dot={{ r: 4, fill: '#ff5500' }}
                    activeDot={false}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Stats Section (Right) */}
            <div className="flex-1">
              <div className="bg-[#0c0d12] border border-[#1f2029] rounded-xl p-5 flex flex-col gap-6">
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.1)]">
                      <Target className="w-5 h-5" />
                    </div>
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Matches</span>
                  </div>
                  <span className="text-white font-black text-2xl">{totalTournaments}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.1)]">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Wins</span>
                  </div>
                  <span className="text-white font-black text-2xl">{totalWins}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.1)]">
                      <Crosshair className="w-5 h-5" />
                    </div>
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Win Rate</span>
                  </div>
                  <span className="text-white font-black text-2xl">{winRate}%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.1)]">
                      <Flame className="w-5 h-5" />
                    </div>
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Kills</span>
                  </div>
                  <span className="text-white font-black text-2xl">{totalKills}</span>
                </div>

              </div>
            </div>

          </div>
          
          {/* NEW COMPACT CHARTS GRID */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#1f2029] pt-6 animate-in slide-in-from-right-12 fade-in duration-700">
            
            {/* Win / Loss Pie Chart */}
            <div className="bg-[#111115] border border-[#2a2a35] rounded-xl p-4 flex flex-col hover:border-[#3a3a45] transition-colors">
              <h4 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5 text-[#ff5500]"/> Win / Loss Ratio</h4>
              <div className="flex-1 min-h-[120px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0c0d12", border: "1px solid #2a2a35", color: "#fff", borderRadius: "8px", fontSize: "12px" }} itemStyle={{ color: "#fff" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-xs font-medium">No Data</div>
                )}
              </div>
            </div>

            {/* Monthly Participation Bar Chart */}
            <div className="bg-[#111115] border border-[#2a2a35] rounded-xl p-4 flex flex-col hover:border-[#3a3a45] transition-colors">
              <h4 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-400"/> Participation</h4>
              <div className="flex-1 min-h-[120px]">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2029" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: '#1a1a20' }} contentStyle={{ backgroundColor: "#0c0d12", border: "1px solid #2a2a35", color: "#fff", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="tournaments" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-xs font-medium">No Data</div>
                )}
              </div>
            </div>

            {/* Kills Trend Line Chart */}
            <div className="bg-[#111115] border border-[#2a2a35] rounded-xl p-4 flex flex-col hover:border-[#3a3a45] transition-colors">
              <h4 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-red-400"/> Kills Trend</h4>
              <div className="flex-1 min-h-[120px]">
                {killsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={killsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2029" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0c0d12", border: "1px solid #2a2a35", color: "#fff", borderRadius: "8px", fontSize: "12px" }} />
                      <Line type="monotone" dataKey="kills" stroke="#f87171" strokeWidth={2} dot={{ fill: "#f87171", r: 2, strokeWidth: 0 }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-xs font-medium">No Data</div>
                )}
              </div>
            </div>

          </div>

        </CardContent>
      </Card>
    </div>
  );
}
