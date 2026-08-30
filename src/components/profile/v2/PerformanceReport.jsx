import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Trophy, Crosshair, Medal, Flame, Clock, Calendar, ChevronDown, Star
} from 'lucide-react';
import { PlayerMatchHistory } from '@/api/entities';
import AddMatchModal from './AddMatchModal';

export default function PerformanceReport({ player, stats, userRegistrations = [] }) {
  if (!player || !stats) return null;

  const [showAddModal, setShowAddModal] = useState(false);
  const [matchHistory, setMatchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Graph Filters
  const [weeklyFilter, setWeeklyFilter] = useState('overall');
  const [killsFilter, setKillsFilter] = useState('overall');
  const [placementFilter, setPlacementFilter] = useState('overall');

  const fetchHistory = async () => {
    try {
      let hist = await PlayerMatchHistory.filter({ user_id: player.id });
      
      // Cleanup old fake dummy data
      const fakeDamages = [2540, 1830, 2210, 1120, 2890, 1950, 3200];
      const fakeMatches = hist.filter(m => fakeDamages.includes(m.damage));
      if (fakeMatches.length > 0) {
        for (const m of fakeMatches) await PlayerMatchHistory.delete(m.id);
        hist = await PlayerMatchHistory.filter({ user_id: player.id });
      }

      // Fetch from TournamentLeaderboard — the real source
      let lbMatches = [];
      try {
        const { TournamentLeaderboard, Tournament } = await import('@/api/entities');
        const leaderboards = await TournamentLeaderboard.filter({ user_id: player.id });

        const tournamentCache = {};
        const getTournament = async (id) => {
          if (!id) return null;
          if (tournamentCache[id] !== undefined) return tournamentCache[id];
          try { tournamentCache[id] = await Tournament.get(id); } catch { tournamentCache[id] = null; }
          return tournamentCache[id];
        };

        for (const lb of leaderboards) {
          const t = await getTournament(lb.tournament_id);
          const mode = t?.mode || 'Squad';
          const map = t?.map || 'Bermuda';
          const tName = lb.tournament_title || t?.title || 'Tournament';
          const tDate = t?.date_time || lb.registration_time || new Date().toISOString();

          const matchResults = lb.match_results || [];

          if (matchResults.length > 0) {
            // Grand Final: each match round = separate row
            matchResults.forEach((mr, i) => {
              if (mr.kills > 0 || mr.placement > 0) {
                lbMatches.push({
                  id: `${lb.id}_${mr.match_number || i}`,
                  mode, map,
                  position: mr.placement || 0,
                  kills: mr.kills || 0,
                  play_time_minutes: mode === 'Solo' ? 15 : 20,
                  created_at: new Date(new Date(tDate).getTime() + i * 3600000).toISOString(),
                  tournament_name: `${tName} (${mr.match_number || `M${i+1}`})`,
                  points: mr.points || 0
                });
              }
            });
          } else if (lb.kills > 0 || (lb.rank > 0 && lb.rank <= 100)) {
            // Regular tournament: 1 row
            lbMatches.push({
              id: lb.id,
              mode, map,
              position: lb.rank || lb.placement || 0,
              kills: lb.kills || 0,
              play_time_minutes: mode === 'Solo' ? 15 : 20,
              created_at: tDate,
              tournament_name: tName,
              points: lb.points || 0
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch leaderboard matches:", e);
      }

      const combined = [...hist, ...lbMatches].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setMatchHistory(combined);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [player.id]);

  const hasRealData = matchHistory.length > 0;

  // ── STATS ────────────────────────────────────────────────
  const totalKills = stats?.kills || 0;
  const totalWins = stats?.wins || 0;
  const totalTournaments = stats?.tournaments || 0;
  // Top 3: prefer pre-computed from PlayerProfile, fallback to matchHistory
  const top3FromHistory = stats?.top3 ?? matchHistory.filter(m => m.position > 0 && m.position <= 3).length;
  // Win streak: pre-computed from PlayerProfile
  const winStreak = stats?.win_streak ?? 0;

  // Play time: from leaderboard matches
  const totalPlayMins = matchHistory.reduce((s, m) => s + (m.play_time_minutes || 0), 0);
  const playTimeStr = totalPlayMins > 0 
    ? `${Math.floor(totalPlayMins / 60)}h ${totalPlayMins % 60}m`
    : `${totalTournaments * 20 >= 60 ? Math.floor(totalTournaments * 20 / 60) + 'h ' : ''}${(totalTournaments * 20) % 60}m`;

  const lastMatchAgo = (() => {
    // Use pre-computed last_match_date from stats, or fall back to matchHistory
    const lastDate = stats?.last_match_date || (hasRealData ? matchHistory[matchHistory.length - 1]?.created_at : null);
    if (!lastDate) return 'N/A';
    const diff = Date.now() - new Date(lastDate).getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)} Mins Ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} Hours Ago`;
    return `${Math.floor(diff / 86400000)} Days Ago`;
  })();

  // ── FILTER HELPER ────────────────────────────────────────
  const filterByTime = (data, type) => {
    if (type === 'overall') return data;
    const periods = { '24h': 86400000, '60d': 5184000000, '1y': 31536000000 };
    const cutoff = Date.now() - periods[type];
    return data.filter(m => new Date(m.created_at).getTime() >= cutoff);
  };

  // ── GRAPH DATA ───────────────────────────────────────────
  // Weekly Trend: performance score per day (kills*10 + (12-rank bonus))
  const weeklyTrendData = (() => {
    const filtered = filterByTime(matchHistory, weeklyFilter).filter(m => m.kills > 0 || m.position > 0);
    const grouped = {};
    filtered.forEach(m => {
      const d = new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (!grouped[d]) grouped[d] = { sum: 0, count: 0 };
      const score = (m.kills * 10) + Math.max(0, 100 - (m.position * 5));
      grouped[d].sum += score;
      grouped[d].count += 1;
    });
    return Object.keys(grouped).map(date => ({
      date, score: Math.round(grouped[date].sum / grouped[date].count)
    }));
  })();

  // Kills Per Match
  const killsFiltered = filterByTime(matchHistory, killsFilter).filter(m => m.kills >= 0);
  const killsPerMatchData = killsFiltered.map((m, i) => ({
    name: m.tournament_name ? m.tournament_name.split(' ').slice(0, 2).join(' ') : `T${i + 1}`,
    kills: m.kills
  }));
  const avgKillsValue = killsPerMatchData.length > 0
    ? (killsPerMatchData.reduce((s, d) => s + d.kills, 0) / killsPerMatchData.length).toFixed(1)
    : (totalKills > 0 && totalTournaments > 0 ? (totalKills / totalTournaments).toFixed(1) : '0.0');

  // Placement History
  const placementFiltered = filterByTime(matchHistory, placementFilter).filter(m => m.position > 0);
  const placementData = placementFiltered.map((m, i) => ({
    name: m.tournament_name ? m.tournament_name.split(' ').slice(0, 2).join(' ') : `T${i + 1}`,
    pos: m.position
  }));
  const bestPlacement = placementData.length > 0 ? Math.min(...placementData.map(d => d.pos)) : 'N/A';
  const avgPlacement = placementData.length > 0
    ? (placementData.reduce((s, d) => s + d.pos, 0) / placementData.length).toFixed(1)
    : 'N/A';

  // Pie Chart (Match Result Distribution)
  const matchesWithPos = matchHistory.filter(m => m.position > 0);
  const total = matchesWithPos.length || 1;
  const winsCount = matchesWithPos.filter(m => m.position === 1).length;
  const top3Count = matchesWithPos.filter(m => m.position > 1 && m.position <= 3).length;
  const top10Count = matchesWithPos.filter(m => m.position > 3 && m.position <= 10).length;
  const othersCount = matchesWithPos.filter(m => m.position > 10).length;
  const pieData = [
    { name: 'Wins', value: Math.round((winsCount / total) * 100), count: winsCount, color: '#f59e0b' },
    { name: 'Top 3', value: Math.round((top3Count / total) * 100), count: top3Count, color: '#8b5cf6' },
    { name: 'Top 10', value: Math.round((top10Count / total) * 100), count: top10Count, color: '#3b82f6' },
    { name: 'Others', value: Math.round((othersCount / total) * 100), count: othersCount, color: '#ef4444' }
  ].filter(d => d.count > 0);

  // Last 10 Matches
  const lastMatches = matchHistory.slice().reverse().slice(0, 10).map(m => ({
    tournament: m.tournament_name || 'Tournament',
    mode: m.mode || 'Squad',
    map: m.map || 'Bermuda',
    pos: m.position > 0 ? `#${m.position}` : '-',
    posNum: m.position,
    kills: m.kills,
    pts: m.points > 0 ? `+${m.points}` : (m.kills > 0 ? `+${m.kills * 2}` : '-')
  }));

  // ── COMPONENTS ───────────────────────────────────────────
  const FilterHeader = ({ title, filterValue, onFilterChange }) => (
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">{title}</h3>
      {onFilterChange && (
        <select
          value={filterValue}
          onChange={e => onFilterChange(e.target.value)}
          className="bg-[#1e293b] text-xs text-gray-300 border border-slate-700 rounded px-2 py-1 outline-none focus:border-orange-600 cursor-pointer"
        >
          <option value="24h" className="bg-[#0f172a]">24 Hours</option>
          <option value="60d" className="bg-[#0f172a]">Last 60 Days</option>
          <option value="1y" className="bg-[#0f172a]">1 Year</option>
          <option value="overall" className="bg-[#0f172a]">Overall</option>
        </select>
      )}
    </div>
  );

  const StatBox = ({ icon: Icon, title, value, color, sub }) => (
    <div className="bg-[#111827] border border-gray-800/60 p-1 sm:p-3 flex flex-col items-center sm:items-start justify-center sm:justify-between rounded-lg sm:rounded-xl hover:border-gray-700 transition-colors h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center sm:justify-between w-full mb-1 sm:mb-2 gap-1 sm:gap-0">
        <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${color} shrink-0`} />
        <span className="text-[5px] sm:text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center sm:text-right truncate w-full">{title}</span>
      </div>
      <span className="text-xs sm:text-xl font-black text-white">{value}</span>
      {sub && <span className="text-[8px] text-gray-500 mt-0.5 hidden sm:block">{sub}</span>}
    </div>
  );

  const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs gap-1 py-6">
      <span className="text-2xl">📊</span>
      <span>{message}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full pb-20 font-sans bg-[#0B0F19] text-white p-2 md:p-6 rounded-3xl mt-4">

      {/* ── TOP STAT CARDS ── */}
      <div className="grid grid-cols-5 gap-1 sm:gap-3 w-full">
        <StatBox icon={Trophy}    title="Matches"       value={totalTournaments}   color="text-yellow-500" />
        <StatBox icon={Medal}     title="Wins"          value={totalWins}           color="text-yellow-400" />
        <StatBox icon={Star}      title="Top 3"         value={top3FromHistory}     color="text-purple-400" />
        <StatBox icon={Flame}     title="Win Streak"    value={winStreak || 0}      color="text-orange-500" />
        <StatBox icon={Crosshair} title="Total Kills"   value={totalKills}          color="text-gray-300" />
      </div>

      {/* ── INFO BAR ── */}
      <div className="flex justify-between items-center bg-[#111827] border border-gray-800/60 p-3 rounded-xl flex-wrap gap-4">
        <div className="flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> Total Play Time: <strong className="text-white">{playTimeStr}</strong>
          </span>
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Last Match: <strong className="text-white">{lastMatchAgo}</strong>
          </span>
        </div>
      </div>

      {/* ── WEEKLY TREND ── */}
      <div className="bg-[#111827] border border-gray-800/60 p-6 rounded-2xl flex flex-col">
        <FilterHeader title="Performance Trend" filterValue={weeklyFilter} onFilterChange={setWeeklyFilter} />
        <div className="w-full min-h-[200px]">
          {weeklyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyTrendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                  formatter={(val) => [`Score: ${val}`, '']}
                />
                <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} fill="url(#scoreGrad)"
                  dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#fff', stroke: '#8b5cf6', strokeWidth: 2 }}
                  label={{ position: 'top', fill: '#c4b5fd', fontSize: 11, fontWeight: 'bold' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message={weeklyFilter === '24h' ? 'No matches in last 24 hours' : 'No match data for this period'} />
          )}
        </div>
      </div>

      {/* ── KILLS + PLACEMENT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Kills Per Match */}
        <div className="bg-[#111827] border border-gray-800/60 p-5 rounded-2xl flex flex-col">
          <FilterHeader title="Kills Per Tournament" filterValue={killsFilter} onFilterChange={setKillsFilter} />
          <div className="h-36 w-full mt-2">
            {killsPerMatchData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={killsPerMatchData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#4b5563" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 'dataMax + 3']} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }}
                    formatter={(val, name, props) => [`${val} Kills`, props.payload.name]} />
                  <Line type="monotone" dataKey="kills" stroke="#a855f7" strokeWidth={2}
                    dot={{ r: 4, fill: '#a855f7', stroke: '#fff', strokeWidth: 1 }}
                    label={{ position: 'top', fill: '#d1d5db', fontSize: 11, fontWeight: 'bold' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No kill data" />
            )}
          </div>
          <div className="mt-3 flex justify-between items-center bg-gray-800/40 p-2 rounded-lg">
            <span className="text-xs text-gray-400">Avg Kills / Tournament</span>
            <span className="text-lg font-black">{avgKillsValue}</span>
          </div>
        </div>

        {/* Placement History */}
        <div className="bg-[#111827] border border-gray-800/60 p-5 rounded-2xl flex flex-col">
          <FilterHeader title="Placement History" filterValue={placementFilter} onFilterChange={setPlacementFilter} />
          <div className="h-36 w-full mt-2">
            {placementData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={placementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#4b5563" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis reversed stroke="#4b5563" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `#${v}`} width={28} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }}
                    formatter={(val, name, props) => [`#${val}`, props.payload.name]} />
                  <Line type="monotone" dataKey="pos" stroke="#3b82f6" strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1 }}
                    label={{ position: 'top', fill: '#93c5fd', fontSize: 11, fontWeight: 'bold', formatter: v => `#${v}` }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No placement data" />
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 bg-gray-800/40 p-2 rounded-lg text-center">
              <span className="text-[10px] text-gray-400 block mb-1">Best Rank</span>
              <span className="text-sm font-black text-yellow-400">{bestPlacement !== 'N/A' ? `#${bestPlacement}` : 'N/A'}</span>
            </div>
            <div className="flex-1 bg-gray-800/40 p-2 rounded-lg text-center">
              <span className="text-[10px] text-gray-400 block mb-1">Avg Placement</span>
              <span className="text-sm font-black text-purple-400">{avgPlacement !== 'N/A' ? `#${avgPlacement}` : 'N/A'}</span>
            </div>
            <div className="flex-1 bg-gray-800/40 p-2 rounded-lg text-center">
              <span className="text-[10px] text-gray-400 block mb-1">Matches</span>
              <span className="text-sm font-black text-blue-400">{placementData.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── PIE CHART ── */}
      {pieData.length > 0 && (
        <div className="bg-[#111827] border border-gray-800/60 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4">Match Result Distribution</h3>
          <div className="flex items-center gap-6">
            <div className="w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                    formatter={(val, name) => [`${val}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-400">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{d.count}x</span>
                    <span className="font-bold text-white">{d.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LAST 10 MATCHES TABLE ── */}
      <div className="bg-[#111827] border border-gray-800/60 p-6 rounded-2xl w-full overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4">Last 10 Matches</h3>
        {lastMatches.length > 0 ? (
          <table className="w-full text-left text-xs min-w-[520px]">
            <thead className="text-gray-500 uppercase tracking-widest border-b border-gray-800">
              <tr>
                <th className="pb-3 font-medium">Tournament</th>
                <th className="pb-3 font-medium">Mode</th>
                <th className="pb-3 font-medium">Map</th>
                <th className="pb-3 font-medium">Rank</th>
                <th className="pb-3 font-medium">Kills</th>
                <th className="pb-3 font-medium text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {lastMatches.map((m, i) => (
                <tr key={i} className="border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors">
                  <td className="py-3 font-bold text-white max-w-[140px] truncate">{m.tournament}</td>
                  <td className="py-3 text-gray-400">{m.mode}</td>
                  <td className="py-3 text-gray-400">{m.map}</td>
                  <td className="py-3">
                    <span className={`font-black text-sm ${m.posNum === 1 ? 'text-yellow-400' : m.posNum === 2 ? 'text-gray-200' : m.posNum === 3 ? 'text-orange-400' : m.posNum <= 10 ? 'text-blue-400' : 'text-gray-500'}`}>
                      {m.pos}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-white">{m.kills}</td>
                  <td className="py-3 font-bold text-green-400 text-right">{m.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p className="text-3xl mb-2">🎮</p>
            <p>No tournament matches found</p>
            <p className="text-xs mt-1 text-gray-600">Data appears after admin updates Kill Tracker / Match Leaderboard</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddMatchModal
          user={player}
          userRegistrations={userRegistrations}
          onClose={() => setShowAddModal(false)}
          onMatchAdded={() => fetchHistory()}
        />
      )}
    </div>
  );
}
