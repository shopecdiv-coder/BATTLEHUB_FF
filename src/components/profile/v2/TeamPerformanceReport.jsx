import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area, Legend
} from 'recharts';
import { Trophy, Crosshair, Medal, Star, Users, Crown, CheckCircle2, TrendingUp, Zap, Target } from 'lucide-react';
import { db } from "@/api/firebaseClient";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Squad, TournamentLeaderboard, Registration } from '@/api/entities';

const PALETTE = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24'];
const PALETTE_DARK = ['#7c3aed', '#0284c7', '#059669', '#d97706'];

// ── Custom Tooltip ───────────────────────────────────────
const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f172a]/95 backdrop-blur border border-white/10 rounded-xl shadow-2xl p-3 text-xs min-w-[120px]">
      {label && <p className="text-gray-400 font-semibold mb-2 border-b border-white/10 pb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <span className="text-gray-300">{p.name}</span>
          </div>
          <span className="font-black text-white">{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
};

// ── Section Header ───────────────────────────────────────
const Section = ({ title, subtitle, children }) => (
  <div className="bg-[#0d1117] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
    <div className="px-5 pt-5 pb-0">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-4 rounded-full bg-violet-500" />
        <h3 className="text-xs font-black text-white uppercase tracking-widest">{title}</h3>
      </div>
      {subtitle && <p className="text-[10px] text-gray-500 mb-3 ml-3">{subtitle}</p>}
    </div>
    <div className="p-5 pt-4">{children}</div>
  </div>
);

// ── Stat Card ────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className={`relative overflow-hidden rounded-xl p-3 border border-white/5 ${bg}`}>
    <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 80% 20%, ${color}, transparent 60%)` }} />
    <Icon className="w-4 h-4 mb-2 relative z-10" style={{ color }} />
    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
    <p className="text-xl font-black text-white">{value}</p>
  </div>
);

// ── Main Component ───────────────────────────────────────
export default function TeamPerformanceReport({ player }) {
  const [squad, setSquad]           = useState(null);
  const [members, setMembers]       = useState([]);
  const [memberStats, setMemberStats] = useState({});
  const [allLBEntries, setAllLBEntries] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!player?.id && !player?.squad_id) { setLoading(false); return; }
    (async () => {
      try {
        let sq = null;
        if (player.squad_id) {
          sq = await Squad.get(player.squad_id).catch(() => null);
        }
        if (!sq && player.id) {
          const squads = await Squad.filter({ leader_id: player.id }).catch(() => []);
          if (squads.length > 0) sq = squads[0];
        }
        if (!sq && player.id) {
          try {
            const snap = await getDocs(query(collection(db, 'squads'), where('members', 'array-contains', player.id)));
            if (!snap.empty) sq = { id: snap.docs[0].id, ...snap.docs[0].data() };
          } catch (e) {}
        }
        if (!sq && player) {
          sq = {
            id: player.id,
            squad_name: player.ign || player.full_name || 'BH Esports',
            squad_logo: player.avatar_url || '',
            leader_name: player.ign || player.full_name || 'Captain',
            members: [player.id]
          };
        }

        setSquad(sq);

        let allMembers = [player];
        if (sq && sq.id && sq.id !== player.id) {
          try {
            const snap = await getDocs(query(collection(db, 'users'), where('squad_id', '==', sq.id)));
            if (!snap.empty) allMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          } catch (e) {}
        }
        setMembers(allMembers);

        const statsMap = {};
        let allEntries = [];

        await Promise.all(allMembers.map(async (m) => {
          try {
            const lbs  = await TournamentLeaderboard.filter({ user_id: m.id });
            const regs = await Registration.filter({ team_leader_id: m.id });
            allEntries = [...allEntries, ...lbs.map(e => ({ ...e, _memberName: m.ign || m.display_name || 'Player', _memberId: m.id }))];
            const tk = lbs.reduce((s, e) => s + (e.kills  || 0), 0);
            const tw = lbs.reduce((s, e) => s + (e.wins   || 0), 0);
            const tp = lbs.reduce((s, e) => s + (e.points || 0), 0);
            const t3 = lbs.filter(e => e.rank > 0 && e.rank <= 3).length;
            const rl = lbs.filter(e => e.rank > 0);
            statsMap[m.id] = {
              kills: tk, wins: tw, top3: t3, points: tp,
              tournaments: regs.length,
              avgKills:  regs.length > 0 ? (tk / regs.length).toFixed(1) : '0.0',
              winRate:   regs.length > 0 ? ((tw / regs.length) * 100).toFixed(1) : '0.0',
              avgRank:   rl.length > 0   ? (rl.reduce((s,e)=>s+e.rank,0)/rl.length).toFixed(1) : 'N/A',
              lbs: lbs.sort((a,b) => new Date(a.registration_time||0) - new Date(b.registration_time||0))
            };
          } catch { statsMap[m.id] = { kills:0,wins:0,top3:0,points:0,tournaments:0,avgKills:'0.0',winRate:'0.0',avgRank:'N/A',lbs:[] }; }
        }));

        setMemberStats(statsMap);
        setAllLBEntries(allEntries);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [player]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
      </div>
    </div>
  );

  if (!squad) return (
    <div className="text-center p-16 text-gray-600 flex flex-col items-center gap-3">
      <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center">
        <Users className="w-8 h-8 opacity-40" />
      </div>
      <p className="font-bold text-sm text-gray-400">No Squad Found</p>
    </div>
  );

  // Aggregates
  const allStats    = Object.values(memberStats);
  const teamKills   = allStats.reduce((s, m) => s + m.kills, 0);
  const teamWins    = allStats.reduce((s, m) => s + m.wins, 0);
  const teamTop3    = allStats.reduce((s, m) => s + m.top3, 0);
  const teamPoints  = allStats.reduce((s, m) => s + m.points, 0);
  const teamT       = Math.max(...allStats.map(m => m.tournaments), 0);
  const teamWinRate = teamT > 0 ? ((teamWins / teamT) * 100).toFixed(1) : '0.0';
  const captain     = members.find(m => m.id === squad.captain_id) || members[0];

  // Chart datasets
  const memberName  = (m) => (m.ign || m.display_name || 'Player').split(' ')[0];

  const barData = members.map((m, i) => ({
    name: memberName(m),
    kills: memberStats[m.id]?.kills || 0,
    wins:  memberStats[m.id]?.wins  || 0,
    rate:  parseFloat(memberStats[m.id]?.winRate || 0),
    color: PALETTE[i % PALETTE.length]
  }));

  const pieData = members.map((m, i) => ({
    name: memberName(m), value: memberStats[m.id]?.kills || 0, color: PALETTE[i % PALETTE.length]
  })).filter(d => d.value > 0);

  // Multi-line kills trend
  const maxT = Math.max(...members.map(m => (memberStats[m.id]?.lbs||[]).length), 0);
  const killsTrend = Array.from({ length: maxT }, (_, i) => {
    const pt = { t: `T${i+1}` };
    members.forEach(m => { pt[memberName(m)] = memberStats[m.id]?.lbs?.[i]?.kills || 0; });
    return pt;
  });

  // Points area trend
  const pointsTrend = (() => {
    const map = {};
    allLBEntries.forEach(e => {
      const d = e.registration_time ? new Date(e.registration_time).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : null;
      if (!d) return;
      map[d] = (map[d] || 0) + (e.points || 0);
    });
    return Object.keys(map).map(date => ({ date, points: map[date] }));
  })();

  // Placement trend
  const placeTrend = (() => {
    const map = {};
    allLBEntries.filter(e=>e.rank>0).forEach(e => {
      const d = e.registration_time ? new Date(e.registration_time).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : null;
      if (!d) return;
      if (!map[d]) map[d] = { s:0, c:0 };
      map[d].s += e.rank; map[d].c++;
    });
    return Object.keys(map).map(date => ({ date, rank: Math.round(map[date].s/map[date].c) }));
  })();

  // Radar
  const radarData = [
    { axis: 'Kills',       v: Math.min(100, (teamKills / Math.max(teamT,1)) * 4) },
    { axis: 'Wins',        v: Math.min(100, parseFloat(teamWinRate) * 2) },
    { axis: 'Top 3',       v: Math.min(100, (teamTop3 / Math.max(teamT,1)) * 15) },
    { axis: 'Points',      v: Math.min(100, (teamPoints / Math.max(teamT,1)) * 1.5) },
    { axis: 'Consistency', v: Math.min(100, parseFloat(teamWinRate) * 1.8) },
  ];

  const hasData = teamKills > 0 || teamWins > 0;

  return (
    <div className="flex flex-col gap-4 w-full pb-24 font-sans text-white mt-2 bg-[#090d14] p-2 md:p-4 rounded-3xl">

      {/* ── HERO BANNER ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#1a0533] via-[#0d0f1a] to-[#0a0c14] shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-700/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="relative p-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-xl bg-violet-500 blur-xl opacity-30" />
              <img
                src={squad.logo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${squad.name}&backgroundColor=6d28d9`}
                className="w-20 h-20 rounded-xl border border-violet-500/40 object-cover relative z-10 shadow-lg"
                alt={squad.name}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black uppercase tracking-tight">{squad.name}</h1>
                {squad.is_verified && <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0" />}
              </div>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                {captain ? `Captain: ${captain.ign || captain.display_name}` : ''}
                {squad.team_tag ? ` · ${squad.team_tag}` : ''}
              </p>
              <div className="flex gap-2 mt-2.5 flex-wrap">
                {squad.squad_type && (
                  <span className="text-[9px] bg-violet-500/15 border border-violet-500/30 text-violet-300 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">{squad.squad_type}</span>
                )}
                {squad.is_verified && (
                  <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">✓ Verified</span>
                )}
                <span className="text-[9px] bg-white/5 border border-white/10 text-gray-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">{members.length} Members</span>
              </div>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-5 gap-2 mt-5 pt-4 border-t border-white/5">
            {[
              { label: 'Matches',     value: teamT,           icon: Trophy,     color: '#fbbf24' },
              { label: 'Team Wins',   value: teamWins,        icon: Medal,      color: '#fcd34d' },
              { label: 'Top 3',       value: teamTop3,        icon: Star,       color: '#a78bfa' },
              { label: 'Total Kills', value: teamKills,       icon: Crosshair,  color: '#e2e8f0' },
              { label: 'Win Rate',    value: `${teamWinRate}%`, icon: TrendingUp, color: '#34d399' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <s.icon className="w-3.5 h-3.5 mx-auto mb-1.5" style={{ color: s.color }} />
                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-base font-black mt-0.5" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MEMBER CARDS ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-4 rounded-full bg-violet-500" />
          <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Team Members ({members.length})</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {members.map((m, i) => {
            const ms = memberStats[m.id] || {};
            const c  = PALETTE[i % PALETTE.length];
            const cd = PALETTE_DARK[i % PALETTE_DARK.length];
            return (
              <div key={m.id} className="relative overflow-hidden bg-[#0d1117] border border-white/5 rounded-2xl p-4 flex flex-col items-center shadow-lg">
                <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at 50% 0%, ${c}, transparent 70%)` }} />
                {/* Rank + Captain */}
                <div className="absolute top-3 left-3 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: c+'22', border: `1px solid ${c}55`, color: c }}>{i+1}</div>
                {m.id === squad.captain_id && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[8px] text-yellow-300 font-bold bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full">
                    <Crown className="w-2.5 h-2.5" /> Captain
                  </div>
                )}
                {/* Avatar */}
                <div className="mt-6 relative">
                  <div className="absolute inset-0 rounded-full blur-lg opacity-50" style={{ backgroundColor: c }} />
                  <img src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.ign||m.id}`}
                    className="w-16 h-16 rounded-full object-cover relative z-10 shadow-lg"
                    style={{ border: `2.5px solid ${c}` }} alt="" />
                </div>
                <h4 className="text-sm font-black text-white uppercase mt-2.5 flex items-center gap-1 relative z-10">
                  {(m.ign || m.display_name || 'Player')}
                  {m.is_verified && <CheckCircle2 className="w-3 h-3 text-violet-400" />}
                </h4>
                {m.uid && <span className="text-[9px] text-gray-600 font-medium">UID: {m.uid}</span>}

                {/* Stats */}
                <div className="grid grid-cols-3 w-full gap-1 mt-3 pt-3 border-t border-white/5 text-center relative z-10">
                  {[
                    { label: 'Kills', val: ms.kills || 0, color: 'text-white' },
                    { label: 'Wins', val: ms.wins || 0, color: 'text-yellow-400' },
                    { label: 'Top 3', val: ms.top3 || 0, color: 'text-violet-400' }
                  ].map((s, j) => (
                    <div key={j}>
                      <p className="text-[8px] font-bold text-gray-500 uppercase">{s.label}</p>
                      <p className={`text-base font-black ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 w-full gap-1.5 mt-2 relative z-10">
                  {[
                    { label: 'Avg Kills', val: ms.avgKills || '0.0', color: 'text-white' },
                    { label: 'Win Rate',  val: `${ms.winRate||'0.0'}%`, color: 'text-emerald-400' }
                  ].map((s, j) => (
                    <div key={j} className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
                      <p className="text-[8px] font-bold text-gray-500 uppercase">{s.label}</p>
                      <p className={`text-sm font-black ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
                <div className="w-full mt-2 flex justify-between text-[9px] font-bold relative z-10">
                  <span className="text-gray-600">Matches: <span className="text-gray-300">{ms.tournaments||0}</span></span>
                  <span className="text-gray-600">Points: <span style={{ color: c }}>{ms.points||0}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ROW 1: KILLS + WINS BARS ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Total Kills" subtitle="Per player across all tournaments">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={36} margin={{ top: 18, right: 4, left: -10, bottom: 0 }}>
              <defs>
                {barData.map((d, i) => (
                  <linearGradient key={i} id={`kgr${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE[i%4]} stopOpacity={1} />
                    <stop offset="100%" stopColor={PALETTE_DARK[i%4]} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="name" stroke="#4b5563" tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 'dataMax + 5']} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff06' }} />
              <Bar dataKey="kills" radius={[8, 8, 0, 0]}
                label={{ position: 'top', fill: '#e2e8f0', fontSize: 11, fontWeight: 900 }}>
                {barData.map((_, i) => <Cell key={i} fill={`url(#kgr${i})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Wins" subtitle="Booyah count per player">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={36} margin={{ top: 18, right: 4, left: -10, bottom: 0 }}>
              <defs>
                {barData.map((d, i) => (
                  <linearGradient key={i} id={`wgr${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                    <stop offset="100%" stopColor="#b45309" stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="name" stroke="#4b5563" tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 'dataMax + 1']} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff06' }} />
              <Bar dataKey="wins" radius={[8, 8, 0, 0]}
                label={{ position: 'top', fill: '#fcd34d', fontSize: 11, fontWeight: 900 }}>
                {barData.map((_, i) => <Cell key={i} fill="url(#wgr0)" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* ── ROW 2: WIN RATE + KILLS PIE ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Win Rate %" subtitle="Wins ÷ tournaments played">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={36} margin={{ top: 18, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="wrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                  <stop offset="100%" stopColor="#065f46" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="name" stroke="#4b5563" tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <RechartsTooltip content={<CustomTooltip unit="%" />} cursor={{ fill: '#ffffff06' }} />
              <Bar dataKey="rate" radius={[8, 8, 0, 0]} fill="url(#wrGrad)"
                label={{ position: 'top', fill: '#6ee7b7', fontSize: 11, fontWeight: 900, formatter: v => `${v}%` }} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Kills Share" subtitle="Each player's kill contribution">
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="relative w-40 h-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {pieData.map((d, i) => (
                        <radialGradient key={i} id={`pg${i}`} cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor={PALETTE[i%4]} stopOpacity={1} />
                          <stop offset="100%" stopColor={PALETTE_DARK[i%4]} stopOpacity={0.8} />
                        </radialGradient>
                      ))}
                    </defs>
                    <Pie data={pieData} innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                      {pieData.map((_, i) => <Cell key={i} fill={`url(#pg${i})`} />)}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl font-black text-white">{teamKills}</p>
                  <p className="text-[8px] text-gray-500 font-bold uppercase">Total</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 flex-1">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-gray-300 truncate">{d.name}</span>
                        <span className="text-[10px] font-black text-white ml-1">{teamKills > 0 ? Math.round((d.value/teamKills)*100) : 0}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${teamKills > 0 ? (d.value/teamKills)*100 : 0}%`, backgroundColor: d.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-700 text-xs">
              <Crosshair className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No kill data yet
            </div>
          )}
        </Section>
      </div>

      {/* ── KILLS TREND (Multi-line) ─────────────────────── */}
      {killsTrend.length > 0 && (
        <Section title="Kills Per Tournament" subtitle="Individual performance across all events">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={killsTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {members.map((m, i) => (
                  <linearGradient key={i} id={`lg${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE[i%4]} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={PALETTE[i%4]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
              <XAxis dataKey="t" stroke="#374151" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 'dataMax + 3']} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff15', strokeWidth: 1 }} />
              {members.map((m, i) => (
                <Line key={m.id} type="monotone" dataKey={memberName(m)}
                  stroke={PALETTE[i%4]} strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0d1117', stroke: PALETTE[i%4], strokeWidth: 2.5 }}
                  activeDot={{ r: 6, fill: PALETTE[i%4], stroke: '#fff', strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-5 mt-2 justify-center flex-wrap">
            {members.map((m, i) => (
              <div key={m.id} className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
                <div className="w-4 h-1.5 rounded-full" style={{ backgroundColor: PALETTE[i%4] }} />
                {memberName(m)}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── POINTS + PLACEMENT TRENDS ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Team Points Trend" subtitle="Combined points per event">
          {pointsTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={pointsTrend} margin={{ top: 10, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="ptArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                <XAxis dataKey="date" stroke="#374151" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff15' }} />
                <Area type="monotone" dataKey="points" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#ptArea)"
                  dot={{ r: 4, fill: '#0d1117', stroke: '#8b5cf6', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                  label={{ position: 'top', fill: '#c4b5fd', fontSize: 10, fontWeight: 700 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="text-center py-10 text-gray-700 text-xs"><Zap className="w-8 h-8 mx-auto mb-2 opacity-20" />No points data</div>}
        </Section>

        <Section title="Avg Placement Trend" subtitle="Lower is better — team rank history">
          {placeTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={placeTrend} margin={{ top: 10, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                <XAxis dataKey="date" stroke="#374151" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis reversed stroke="#374151" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `#${v}`} width={26} domain={['dataMin-1','dataMax+1']} />
                <RechartsTooltip content={<CustomTooltip />} formatter={v=>`#${v}`} cursor={{ stroke: '#ffffff15' }} />
                <Line type="monotone" dataKey="rank" stroke="#fbbf24" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0d1117', stroke: '#fbbf24', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
                  label={{ position: 'top', fill: '#fcd34d', fontSize: 10, fontWeight: 700, formatter: v=>`#${v}` }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="text-center py-10 text-gray-700 text-xs"><Target className="w-8 h-8 mx-auto mb-2 opacity-20" />No placement data</div>}
        </Section>
      </div>

      {/* ── RADAR + TABLE ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Performance Radar" subtitle="Composite team strength metrics">
          {hasData ? (
            <ResponsiveContainer width="100%" height={210}>
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                <defs>
                  <radialGradient id="rFill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </radialGradient>
                </defs>
                <PolarGrid stroke="#ffffff08" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 700 }} />
                <PolarRadiusAxis angle={30} domain={[0,100]} tick={false} axisLine={false} />
                <Radar dataKey="v" stroke="#8b5cf6" strokeWidth={2} fill="url(#rFill)"
                  dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-700 text-xs">
              <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center mb-3">
                <Target className="w-7 h-7 opacity-30" />
              </div>
              Play tournaments to unlock radar
            </div>
          )}
        </Section>

        <Section title="Player Comparison" subtitle="Head-to-head stats table">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[340px]">
              <thead>
                <tr className="border-b border-white/5">
                  {['Player','Kills','Wins','Avg K','WR%'].map((h, i) => (
                    <th key={i} className={`pb-2.5 text-[9px] font-black uppercase tracking-wider text-gray-500 ${i > 0 ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const ms = memberStats[m.id] || {};
                  const c  = PALETTE[i % PALETTE.length];
                  return (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/3 transition-colors group">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                          <span className="font-bold text-white truncate max-w-[85px] group-hover:text-violet-300 transition-colors">{memberName(m)}</span>
                          {m.id === squad.captain_id && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
                        </div>
                      </td>
                      <td className="py-3 text-center font-black text-white">{ms.kills||0}</td>
                      <td className="py-3 text-center font-black text-yellow-400">{ms.wins||0}</td>
                      <td className="py-3 text-center font-bold text-gray-300">{ms.avgKills||'0.0'}</td>
                      <td className="py-3 text-center font-black text-emerald-400">{ms.winRate||'0.0'}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      {!hasData && (
        <div className="text-center py-10 text-gray-600 bg-[#0d1117] rounded-2xl border border-white/5 text-xs">
          <div className="text-3xl mb-2">🎮</div>
          <p className="font-bold text-gray-400">No tournament data yet</p>
          <p className="text-gray-700 mt-1">Graphs populate after admin updates Kill Tracker / Leaderboard</p>
        </div>
      )}
    </div>
  );
}
