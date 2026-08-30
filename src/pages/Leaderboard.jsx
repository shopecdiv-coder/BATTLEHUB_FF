import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, Zap, Flame, RefreshCw, Users, Search, Target, Award, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cacheGet, cacheSet } from "@/lib/cache";
import { User } from "@/entities/User";

export default function Leaderboard() {
  const [teamEntries, setTeamEntries] = useState([]);
  const [playerEntries, setPlayerEntries] = useState([]);
  const [championTournaments, setChampionTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("teams");
  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [showRankCard, setShowRankCard] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setShowRankCard(false);
      } else {
        setShowRankCard(true);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const CACHE_KEY = 'leaderboard_data';
    const cached = cacheGet(CACHE_KEY);
    
    try {
      const me = await User.me();
      setCurrentUser(me);
    } catch {}

    if (cached) {
      setTeamEntries(cached.teams);
      setPlayerEntries(cached.players);
      setChampionTournaments(cached.champions);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const allLB = await base44.entities.TournamentLeaderboard.list("-created_date", 200).catch(() => []);

      const teamMap = {};
      (allLB || []).forEach(lb => {
        const key = lb.user_id || lb.team_name;
        if (!teamMap[key]) {
          teamMap[key] = {
            id: key,
            team_name: lb.team_name || lb.player_ign || "Unknown Team",
            team_logo_url: lb.team_logo_url,
            user_id: lb.user_id,
            total_kills: 0,
            total_points: 0,
            wins: 0,
            tournaments: 0,
          };
        }
        teamMap[key].total_kills += lb.kills || 0;
        teamMap[key].total_points += lb.points || 0;
        teamMap[key].wins += lb.wins || 0;
        teamMap[key].tournaments += 1;
      });

      const teams = Object.values(teamMap).sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        return b.total_kills - a.total_kills;
      });

      const playerMap = {};
      (allLB || []).forEach(lb => {
        const members = lb.team_members || [];
        members.forEach(m => {
          if (!m.ign) return;
          const key = m.uid || m.ign;
          if (!playerMap[key]) {
            playerMap[key] = {
              id: key,
              ign: m.ign,
              uid: m.uid || "",
              kills: 0,
              wins: 0,
              tournaments: 0,
              isLeader: m.isLeader,
            };
          }
          playerMap[key].kills += m.kills || 0;
          playerMap[key].wins += (lb.rank === 1 || lb.placement === 1 || (lb.wins || 0) > 0 || (m.wins || 0) > 0) ? 1 : 0;
          playerMap[key].tournaments += 1;
        });

        if (members.length === 0 && lb.player_ign) {
          const key = lb.player_uid || lb.player_ign;
          if (!playerMap[key]) {
            playerMap[key] = {
              id: key,
              ign: lb.player_ign,
              uid: lb.player_uid || "",
              kills: 0,
              wins: 0,
              tournaments: 0,
              isLeader: true,
            };
          }
          playerMap[key].kills += lb.kills || 0;
          playerMap[key].wins += (lb.rank === 1 || lb.placement === 1 || (lb.wins || 0) > 0) ? 1 : 0;
          playerMap[key].tournaments += 1;
        }
      });

      const players = Object.values(playerMap).sort((a, b) => b.kills - a.kills);

      const completed = await base44.entities.Tournament.filter({ status: "Completed" }, "-created_date", 10).catch(() => []);
      const withTop = await Promise.all((completed || []).map(async t => {
        const top = await base44.entities.TournamentLeaderboard.filter({ tournament_id: t.id }, "rank", 3).catch(() => []);
        return { ...t, topPlayers: top };
      }));

      setTeamEntries(teams);
      setPlayerEntries(players);
      setChampionTournaments(withTop);

      cacheSet(CACHE_KEY, { teams, players, champions: withTop }, 5 * 60 * 1000);
    } catch (err) {
      console.error("Leaderboard error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, [loadData]);

  const isSearching = search.trim().length > 0;

  const filteredTeams = teamEntries.filter(t =>
    !search || t.team_name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPlayers = playerEntries.filter(p =>
    !search || p.ign?.toLowerCase().includes(search.toLowerCase())
  );

  const myTeamRankIndex = teamEntries.findIndex(t => t.user_id === currentUser?.id);
  const myPlayerRankIndex = playerEntries.findIndex(p => p.uid === currentUser?.ff_uid || p.ign === currentUser?.full_name);

  const top3Teams = isSearching ? [] : filteredTeams.slice(0, 3);
  const listTeams = isSearching ? filteredTeams : filteredTeams.slice(3, 50);

  const top3Players = isSearching ? [] : filteredPlayers.slice(0, 3);
  const listPlayers = isSearching ? filteredPlayers : filteredPlayers.slice(3, 50);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-28">
      {/* Header Banner */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-black text-white tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-orange-500" /> LEADERBOARD
            </h1>
          </div>

          <div className="relative w-40 sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-gray-950 border-gray-800 text-white pl-8 h-7 text-xs focus:border-orange-500 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-2 sm:p-4 space-y-2.5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-gray-800/80 grid grid-cols-2 w-full p-0 h-9 rounded-none shadow-none">
            <TabsTrigger value="teams" className="rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-500 data-[state=active]:bg-transparent text-gray-400 text-xs sm:text-sm font-bold transition-all hover:text-gray-200 pb-1.5 shadow-none">
              Team Rankings
            </TabsTrigger>
            <TabsTrigger value="players" className="rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-500 data-[state=active]:bg-transparent text-gray-400 text-xs sm:text-sm font-bold transition-all hover:text-gray-200 pb-1.5 shadow-none">
              Player Rankings
            </TabsTrigger>
          </TabsList>

          {/* TEAMS TAB */}
          <TabsContent value="teams" className="mt-2 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : filteredTeams.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="py-6 text-center text-gray-400 text-xs">
                  No team leaderboard records found yet.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 🏆 COMPACT GRAPH PODIUM STAND FOR TEAMS */}
                {!isSearching && top3Teams.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 items-end pt-1 pb-1 mb-2 max-w-sm mx-auto">
                    {/* Rank 2 (Silver - Left) */}
                    {top3Teams[1] ? (
                      <Link to={createPageUrl(`PlayerProfile?uid=${top3Teams[1].user_id}&panel=team_performance&from=leaderboard`)} className="flex flex-col items-center group cursor-pointer">
                        <Avatar className="w-8 h-8 ring-2 ring-slate-300 shadow-md mb-0.5 group-hover:scale-105 transition-transform">
                          <AvatarImage src={top3Teams[1].team_logo_url} />
                          <AvatarFallback className="bg-gray-800 text-white font-bold text-[10px]">
                            {top3Teams[1].team_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-bold text-[10px] text-gray-200 truncate w-full text-center mb-0.5 group-hover:text-orange-400 transition-colors">
                          {top3Teams[1].team_name}
                        </p>
                        
                        {/* Silver Podium Bar */}
                        <div className="w-full bg-gray-900 border-t-2 border-slate-300 rounded-t-lg h-14 flex flex-col items-center justify-center p-1 shadow-md group-hover:bg-gray-800 transition-colors">
                          <span className="text-gray-300 font-black text-[11px]">#2</span>
                          <span className="text-[9px] text-orange-400 font-extrabold">{top3Teams[1].total_points} PTS</span>
                        </div>
                      </Link>
                    ) : <div />}

                    {/* Rank 1 (Gold Winner - Center Tall Bar) */}
                    {top3Teams[0] && (
                      <Link to={createPageUrl(`PlayerProfile?uid=${top3Teams[0].user_id}&panel=team_performance&from=leaderboard`)} className="flex flex-col items-center group cursor-pointer">
                        <Avatar className="w-9 h-9 ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/20 mb-0.5 group-hover:scale-105 transition-transform">
                          <AvatarImage src={top3Teams[0].team_logo_url} />
                          <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white font-black text-xs">
                            {top3Teams[0].team_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-black text-[11px] text-yellow-400 truncate w-full text-center mb-0.5">
                          {top3Teams[0].team_name}
                        </p>

                        {/* Gold Podium Bar (Tallest) */}
                        <div className="w-full bg-gradient-to-t from-gray-900 to-orange-950/80 border-t-2 border-yellow-400 rounded-t-lg h-20 flex flex-col items-center justify-center p-1 shadow-md group-hover:border-yellow-300 transition-colors">
                          <span className="text-yellow-400 font-black text-xs">#1</span>
                          <span className="text-[11px] text-yellow-400 font-black">{top3Teams[0].total_points} PTS</span>
                        </div>
                      </Link>
                    )}

                    {/* Rank 3 (Bronze - Right) */}
                    {top3Teams[2] ? (
                      <Link to={createPageUrl(`PlayerProfile?uid=${top3Teams[2].user_id}&panel=team_performance&from=leaderboard`)} className="flex flex-col items-center group cursor-pointer">
                        <Avatar className="w-8 h-8 ring-2 ring-amber-600 shadow-md mb-0.5 group-hover:scale-105 transition-transform">
                          <AvatarImage src={top3Teams[2].team_logo_url} />
                          <AvatarFallback className="bg-gray-800 text-white font-bold text-[10px]">
                            {top3Teams[2].team_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-bold text-[10px] text-gray-200 truncate w-full text-center mb-0.5 group-hover:text-orange-400 transition-colors">
                          {top3Teams[2].team_name}
                        </p>

                        {/* Bronze Podium Bar */}
                        <div className="w-full bg-gray-900 border-t-2 border-amber-600 rounded-t-lg h-11 flex flex-col items-center justify-center p-1 shadow-md group-hover:bg-gray-800 transition-colors">
                          <span className="text-amber-500 font-black text-[11px]">#3</span>
                          <span className="text-[9px] text-orange-400 font-extrabold">{top3Teams[2].total_points} PTS</span>
                        </div>
                      </Link>
                    ) : <div />}
                  </div>
                )}

                {/* RANKED LIST TABLE */}
                <Card className="bg-gray-900/90 border-gray-800 shadow-xl overflow-hidden rounded-xl">
                  <CardContent className="p-0">
                    <div className="w-full">
                      <table className="w-full text-left text-[11px] sm:text-xs table-fixed">
                        <thead>
                          <tr className="border-b border-gray-800/80 text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider bg-gray-950/50">
                            <th className="py-2 pl-2 sm:pl-3 w-[12%]">Rank</th>
                            <th className="py-2 pl-1 sm:pl-2 w-[34%]">Team Name</th>
                            <th className="py-2 px-0.5 text-center w-[14%]">Points</th>
                            <th className="py-2 px-0.5 text-center w-[13%]">Kills</th>
                            <th className="py-2 px-0.5 text-center w-[12%]">Wins</th>
                            <th className="py-2 pr-2 sm:pr-3 text-center w-[15%]">Matches</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/40">
                          {listTeams.map((team, idx) => {
                            const rank = isSearching ? teamEntries.findIndex(t => t.id === team.id) + 1 : idx + 4;
                            const isMe = team.user_id === currentUser?.id;
                            return (
                              <tr key={team.id} className={`hover:bg-gray-800/40 transition-colors ${isMe ? 'bg-orange-500/10 border-l-2 border-orange-500' : ''}`}>
                                <td className="py-1.5 pl-2 sm:pl-3 font-mono font-bold text-gray-400 text-[10px] sm:text-xs">
                                  #{rank}
                                </td>
                                <td className="py-1.5 pl-1 sm:pl-2 min-w-0">
                                  <Link to={createPageUrl(`PlayerProfile?uid=${team.user_id}&panel=team_performance&from=leaderboard`)} className="flex items-center gap-1.5 min-w-0 group">
                                    <Avatar className="w-6 h-6 sm:w-7 sm:h-7 rounded-md ring-1 ring-gray-700 shrink-0">
                                      <AvatarImage src={team.team_logo_url} />
                                      <AvatarFallback className="bg-gray-800 text-orange-400 text-[9px] font-bold">
                                        {team.team_name?.[0]?.toUpperCase() || 'T'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-bold text-gray-200 text-[11px] sm:text-xs group-hover:text-orange-400 transition-colors truncate">
                                      {team.team_name}
                                    </span>
                                  </Link>
                                </td>
                                <td className="py-1.5 px-0.5 text-center font-extrabold text-orange-400 text-[11px] sm:text-xs">{team.total_points}</td>
                                <td className="py-1.5 px-0.5 text-center font-semibold text-gray-300 text-[11px] sm:text-xs">{team.total_kills}</td>
                                <td className="py-1.5 px-0.5 text-center font-semibold text-emerald-400 text-[11px] sm:text-xs">{team.wins}</td>
                                <td className="py-1.5 pr-2 sm:pr-3 text-center text-gray-400 font-mono text-[11px] sm:text-xs">{team.tournaments}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* PLAYERS TAB */}
          <TabsContent value="players" className="mt-2 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : filteredPlayers.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="py-6 text-center text-gray-400 text-xs">
                  No players found
                </CardContent>
              </Card>
            ) : (
              <>
                {/* TOP 3 PODIUM (PLAYERS) */}
                {!isSearching && top3Players.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 items-end pt-1 pb-1 mb-2 max-w-sm mx-auto">
                    {/* Rank 2 (Silver - Left) */}
                    {top3Players[1] ? (
                      <Link to={createPageUrl(`PlayerProfile?uid=${top3Players[1].uid}&ign=${encodeURIComponent(top3Players[1].ign)}&panel=your_performance&from=leaderboard`)} className="flex flex-col items-center group cursor-pointer">
                        <Avatar className="w-8 h-8 ring-2 ring-slate-300 shadow-md mb-0.5 group-hover:scale-105 transition-transform">
                          <AvatarFallback className="bg-gray-800 text-white font-bold text-[10px]">
                            {top3Players[1].ign?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-bold text-[10px] text-gray-200 truncate w-full text-center mb-0.5 group-hover:text-orange-400 transition-colors">
                          {top3Players[1].ign}
                        </p>
                        
                        {/* Silver Podium Bar */}
                        <div className="w-full bg-gray-900 border-t-2 border-slate-300 rounded-t-lg h-14 flex flex-col items-center justify-center p-1 shadow-md group-hover:bg-gray-800 transition-colors">
                          <span className="text-gray-300 font-black text-[11px]">#2</span>
                          <span className="text-[9px] text-red-400 font-extrabold">{top3Players[1].kills} KILLS</span>
                        </div>
                      </Link>
                    ) : <div />}

                    {/* Rank 1 (Gold Winner - Center Tall Bar) */}
                    {top3Players[0] && (
                      <Link to={createPageUrl(`PlayerProfile?uid=${top3Players[0].uid}&ign=${encodeURIComponent(top3Players[0].ign)}&panel=your_performance&from=leaderboard`)} className="flex flex-col items-center group cursor-pointer">
                        <Avatar className="w-9 h-9 ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/20 mb-0.5 group-hover:scale-105 transition-transform">
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-xs">
                            {top3Players[0].ign?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-black text-[11px] text-yellow-400 truncate w-full text-center mb-0.5">
                          {top3Players[0].ign}
                        </p>

                        {/* Gold Podium Bar (Tallest) */}
                        <div className="w-full bg-gradient-to-t from-gray-900 to-orange-950/80 border-t-2 border-yellow-400 rounded-t-lg h-20 flex flex-col items-center justify-center p-1 shadow-md group-hover:border-yellow-300 transition-colors">
                          <span className="text-yellow-400 font-black text-xs">#1</span>
                          <span className="text-[11px] text-red-400 font-black">{top3Players[0].kills} KILLS</span>
                        </div>
                      </Link>
                    )}

                    {/* Rank 3 (Bronze - Right) */}
                    {top3Players[2] ? (
                      <Link to={createPageUrl(`PlayerProfile?uid=${top3Players[2].uid}&ign=${encodeURIComponent(top3Players[2].ign)}&panel=your_performance&from=leaderboard`)} className="flex flex-col items-center group cursor-pointer">
                        <Avatar className="w-8 h-8 ring-2 ring-amber-600 shadow-md mb-0.5 group-hover:scale-105 transition-transform">
                          <AvatarFallback className="bg-gray-800 text-white font-bold text-[10px]">
                            {top3Players[2].ign?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-bold text-[10px] text-gray-200 truncate w-full text-center mb-0.5 group-hover:text-orange-400 transition-colors">
                          {top3Players[2].ign}
                        </p>

                        {/* Bronze Podium Bar */}
                        <div className="w-full bg-gray-900 border-t-2 border-amber-600 rounded-t-lg h-11 flex flex-col items-center justify-center p-1 shadow-md group-hover:bg-gray-800 transition-colors">
                          <span className="text-amber-500 font-black text-[11px]">#3</span>
                          <span className="text-[9px] text-red-400 font-extrabold">{top3Players[2].kills} KILLS</span>
                        </div>
                      </Link>
                    ) : <div />}
                  </div>
                )}

                {/* PLAYER RANKED LIST */}
                <Card className="bg-gray-900/90 border-gray-800 shadow-xl overflow-hidden rounded-xl">
                  <CardContent className="p-0">
                    <div className="w-full">
                      <table className="w-full text-left text-[11px] sm:text-xs table-fixed">
                        <thead>
                          <tr className="border-b border-gray-800/80 text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider bg-gray-950/50">
                            <th className="py-2 pl-2 sm:pl-3 w-[12%]">Rank</th>
                            <th className="py-2 pl-1 sm:pl-2 w-[38%]">Player IGN</th>
                            <th className="py-2 px-0.5 text-center w-[18%]">Kills</th>
                            <th className="py-2 px-0.5 text-center w-[16%]">Wins</th>
                            <th className="py-2 pr-2 sm:pr-3 text-center w-[16%]">Matches</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/40">
                          {listPlayers.map((player, idx) => {
                            const rank = isSearching ? playerEntries.findIndex(p => p.id === player.id) + 1 : idx + 4;
                            const isMe = player.uid === currentUser?.ff_uid || player.ign === currentUser?.full_name;
                            return (
                              <tr key={player.id} className={`hover:bg-gray-800/40 transition-colors ${isMe ? 'bg-orange-500/10 border-l-2 border-orange-500' : ''}`}>
                                <td className="py-1.5 pl-2 sm:pl-3 font-mono font-bold text-gray-400 text-[10px] sm:text-xs">#{rank}</td>
                                <td className="py-1.5 pl-1 sm:pl-2 min-w-0">
                                  <Link to={createPageUrl(`PlayerProfile?uid=${player.uid}&ign=${encodeURIComponent(player.ign)}&panel=your_performance&from=leaderboard`)} className="flex items-center gap-1.5 min-w-0 group">
                                    <Avatar className="w-6 h-6 sm:w-7 sm:h-7 rounded-md ring-1 ring-gray-700 shrink-0">
                                      <AvatarFallback className="bg-gray-800 text-orange-400 text-[9px] font-bold">
                                        {player.ign?.[0]?.toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex items-center gap-1">
                                      <span className="font-bold text-gray-200 text-[11px] sm:text-xs group-hover:text-orange-400 transition-colors truncate">
                                        {player.ign}
                                      </span>
                                    </div>
                                  </Link>
                                </td>
                                <td className="py-1.5 px-0.5 text-center font-extrabold text-red-400 text-[11px] sm:text-xs">{player.kills}</td>
                                <td className="py-1.5 px-0.5 text-center font-semibold text-emerald-400 text-[11px] sm:text-xs">{player.wins || 0}</td>
                                <td className="py-1.5 pr-2 sm:pr-3 text-center text-gray-400 font-mono text-[11px] sm:text-xs">{player.tournaments}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* 📍 SLEEK FLOATING "MY RANK" CAPSULE CARD (Auto Hides on Scroll Down, Shows on Scroll Up) */}
      {currentUser && (
        <div className={`fixed bottom-[68px] left-4 right-4 z-40 max-w-lg mx-auto transition-all duration-300 transform ${showRankCard ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-16 opacity-0 pointer-events-none'}`}>
          <Link 
            to={
              activeTab === 'teams'
                ? createPageUrl("Profile?panel=team_performance")
                : createPageUrl("Profile?panel=your_performance")
            }
            className="bg-gray-900/95 border border-orange-500/40 backdrop-blur-md rounded-full px-3.5 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3 hover:border-orange-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Avatar className="w-8 h-8 ring-2 ring-orange-500/80">
                <AvatarImage src={currentUser.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-xs">
                  {currentUser.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                  {currentUser.full_name}
                  <span className="text-[9px] bg-orange-500/20 text-orange-400 font-semibold px-1.5 py-0 rounded">You</span>
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {activeTab === 'teams' ? (
                    myTeamRankIndex >= 0 ? `Team Rank: #${myTeamRankIndex + 1}` : 'Unranked Team'
                  ) : (
                    myPlayerRankIndex >= 0 ? `Player Rank: #${myPlayerRankIndex + 1}` : 'Unranked Player'
                  )}
                </span>
              </div>
            </div>

            <span 
              className="text-[11px] font-bold text-orange-400 group-hover:text-orange-300 flex items-center gap-0.5 bg-orange-500/10 group-hover:bg-orange-500/20 px-2.5 py-1 rounded-full border border-orange-500/30 transition-all"
            >
              Stats <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}