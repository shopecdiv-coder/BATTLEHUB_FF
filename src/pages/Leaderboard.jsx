import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, Zap, Flame, RefreshCw, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Leaderboard() {
  const [teamEntries, setTeamEntries] = useState([]);
  const [playerEntries, setPlayerEntries] = useState([]);
  const [championTournaments, setChampionTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("teams");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Fetch all TournamentLeaderboard entries (finalized ones are publicly readable)
      const allLB = await base44.entities.TournamentLeaderboard.list("-created_date", 200).catch(() => []);

      // ── Build Team Leaderboard ──
      const teamMap = {};
      (allLB || []).forEach(lb => {
        const key = lb.user_id || lb.team_name;
        if (!teamMap[key]) {
          teamMap[key] = {
            id: key,
            team_name: lb.team_name || lb.player_ign || "Unknown",
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
      setTeamEntries(teams);

      // ── Build Player Leaderboard ──
      // Aggregate from team_members arrays across all leaderboard entries
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
              tournaments: 0,
              isLeader: m.isLeader,
            };
          }
          playerMap[key].kills += m.kills || 0;
          playerMap[key].tournaments += 1;
          if (m.isLeader) playerMap[key].isLeader = true;
        });
        // Also count the team-level kills if no member breakdown
        if (members.length === 0 && lb.player_ign) {
          const key = lb.player_uid || lb.player_ign;
          if (!playerMap[key]) {
            playerMap[key] = {
              id: key,
              ign: lb.player_ign,
              uid: lb.player_uid || "",
              kills: 0,
              tournaments: 0,
              isLeader: true,
            };
          }
          playerMap[key].kills += lb.kills || 0;
          playerMap[key].tournaments += 1;
        }
      });
      const players = Object.values(playerMap).sort((a, b) => b.kills - a.kills);
      setPlayerEntries(players);

      // ── Champion Tournaments (completed) ──
      const completed = await base44.entities.Tournament.filter({ status: "Completed" }, "-created_date", 10).catch(() => []);
      const withTop = await Promise.all((completed || []).map(async t => {
        const top = await base44.entities.TournamentLeaderboard.filter({ tournament_id: t.id }, "rank", 3).catch(() => []);
        return { ...t, topPlayers: top };
      }));
      setChampionTournaments(withTop);
    } catch (err) {
      console.error("Leaderboard error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 2 minutes for live leaderboard updates
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-400" />;
    return <span className="text-gray-400 font-bold text-sm w-6 text-center">#{rank}</span>;
  };

  const filteredTeams = teamEntries.filter(t =>
    !search || t.team_name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPlayers = playerEntries.filter(p =>
    !search || p.ign?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-yellow-400">Leaderboard</h1>
              <p className="text-gray-500 text-sm">Top teams & players — BattleHub FF</p>
            </div>
          </div>
          <Button onClick={loadData} disabled={refreshing} variant="outline" size="sm" className="border-gray-600 text-white">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Updating..." : "Update Leaderboard"}
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team or player..."
            className="bg-gray-900 border-gray-700 text-white pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-900 border border-gray-800 grid grid-cols-3 w-full rounded-full p-1">
            <TabsTrigger value="teams" className="rounded-full data-[state=active]:bg-orange-600 data-[state=active]:text-white text-sm">
              <Trophy className="w-3 h-3 mr-1" /> Teams
            </TabsTrigger>
            <TabsTrigger value="players" className="rounded-full data-[state=active]:bg-purple-600 data-[state=active]:text-white text-sm">
              <Zap className="w-3 h-3 mr-1" /> Players
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="rounded-full data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-sm">
              <Flame className="w-3 h-3 mr-1" /> Champions
            </TabsTrigger>
          </TabsList>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
              </div>
            ) : filteredTeams.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="py-12 text-center text-gray-500">
                  No team data yet. Data appears after tournaments are completed.
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-900/80 border-gray-800 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white flex items-center gap-2 text-base">
                    <Trophy className="w-4 h-4 text-yellow-400" /> Team Rankings
                    <Badge className="bg-gray-800 text-gray-400 ml-2">{filteredTeams.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="text-left py-3 pl-4">Rank</th>
                          <th className="text-left py-3">Team</th>
                          <th className="text-center py-3">Points</th>
                          <th className="text-center py-3">Kills</th>
                          <th className="text-center py-3">Wins</th>
                          <th className="text-center py-3 pr-4">Tourneys</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeams.slice(0, 50).map((team, index) => (
                          <tr key={team.id} className={`border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${index === 0 ? 'bg-yellow-500/5' : index === 1 ? 'bg-gray-300/5' : index === 2 ? 'bg-orange-500/5' : ''}`}>
                            <td className="py-3 pl-4">{getRankIcon(index + 1)}</td>
                            <td className="py-3">
                              <Link to={createPageUrl(`TeamProfile?leader=${team.user_id}`)} className="flex items-center gap-3 hover:opacity-80">
                                {team.team_logo_url ? (
                                  <img src={team.team_logo_url} className="w-9 h-9 rounded-lg object-cover ring-2 ring-gray-700 flex-shrink-0" onError={e => e.target.style.display='none'} />
                                ) : (
                                  <Avatar className="w-9 h-9 ring-2 ring-gray-700 flex-shrink-0">
                                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white text-xs font-bold">
                                      {team.team_name?.[0]?.toUpperCase() || 'T'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <span className={`font-bold text-sm ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-white'}`}>
                                  {team.team_name}
                                </span>
                              </Link>
                            </td>
                            <td className="py-3 text-center"><span className="text-cyan-400 font-bold">{team.total_points}</span></td>
                            <td className="py-3 text-center"><span className="text-red-400 font-semibold">{team.total_kills}</span></td>
                            <td className="py-3 text-center"><span className="text-yellow-400 font-semibold">{team.wins}</span></td>
                            <td className="py-3 text-center pr-4"><span className="text-purple-400 font-semibold">{team.tournaments}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
              </div>
            ) : filteredPlayers.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="py-12 text-center text-gray-500">
                  No player data yet. Data appears after tournaments are completed.
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-900/80 border-gray-800 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white flex items-center gap-2 text-base">
                    <Zap className="w-4 h-4 text-purple-400" /> Player Rankings
                    <Badge className="bg-gray-800 text-gray-400 ml-2">{filteredPlayers.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="text-left py-3 pl-4">Rank</th>
                          <th className="text-left py-3">Player</th>
                          <th className="text-center py-3">Kills</th>
                          <th className="text-center py-3 pr-4">Tourneys</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlayers.slice(0, 50).map((player, index) => (
                          <tr key={player.id} className={`border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${index === 0 ? 'bg-yellow-500/5' : index === 1 ? 'bg-gray-300/5' : index === 2 ? 'bg-orange-500/5' : ''}`}>
                            <td className="py-3 pl-4">{getRankIcon(index + 1)}</td>
                            <td className="py-3">
                              <Link to={createPageUrl(`PlayerProfile?uid=${player.uid}&ign=${encodeURIComponent(player.ign)}`)} className="flex items-center gap-3 hover:opacity-80">
                                <Avatar className="w-9 h-9 ring-2 ring-gray-700 flex-shrink-0">
                                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold">
                                    {player.ign?.[0]?.toUpperCase() || 'P'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className={`font-bold text-sm ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-white'}`}>
                                    {player.ign}
                                  </span>
                                  {player.isLeader && <span className="ml-1 text-yellow-400 text-xs">👑</span>}
                                  {player.uid && <p className="text-[10px] text-gray-600">{player.uid}</p>}
                                </div>
                              </Link>
                            </td>
                            <td className="py-3 text-center"><span className="text-red-400 font-bold">{player.kills}</span></td>
                            <td className="py-3 text-center pr-4"><span className="text-purple-400 font-semibold">{player.tournaments}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Champions Tab */}
          <TabsContent value="tournaments" className="mt-4">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2 text-base">
                  <Flame className="w-4 h-4 text-cyan-400" /> Tournament Champions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {championTournaments.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                    <p className="text-gray-500">No completed tournaments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {championTournaments.map(tournament => (
                      <div key={tournament.id} className="p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-100">{tournament.title}</h4>
                            <p className="text-sm text-gray-400">{tournament.mode} • {tournament.map}</p>
                          </div>
                          <Badge className="bg-purple-500/20 text-purple-400">
                            <Trophy className="w-3 h-3 mr-1" />₹{tournament.prize_pool?.toLocaleString() || 0}
                          </Badge>
                        </div>
                        {tournament.topPlayers?.length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-gray-700">
                            {tournament.topPlayers.map((player, idx) => (
                              <div key={player.id} className="flex items-center gap-3 text-sm">
                                <span className={`font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : 'text-orange-400'}`}>
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                </span>
                                <span className="text-white flex-1">{player.team_name || player.player_ign}</span>
                                <span className="text-red-400">{player.kills} kills</span>
                                <span className="text-cyan-400">{player.points} pts</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}