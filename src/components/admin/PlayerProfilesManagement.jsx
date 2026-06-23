import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Zap, Search, RefreshCw, Swords, Trophy, Target, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PlayerProfilesManagement() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [allLB, allTournaments] = await Promise.all([
        base44.entities.TournamentLeaderboard.list("-created_date", 200).catch(() => []),
        base44.entities.Tournament.list("-created_date", 100).catch(() => [])
      ]);

      const tournamentMap = {};
      (allTournaments || []).forEach(t => { tournamentMap[t.id] = t; });

      // Aggregate player stats from team_members across all leaderboard entries
      const playerMap = {};
      (allLB || []).forEach(lb => {
        const members = lb.team_members || [];
        const tourney = tournamentMap[lb.tournament_id];
        const placement = lb.placement || (lb.wins > 0 ? 1 : 0);

        if (members.length === 0 && lb.player_ign) {
          // Fallback: use team leader data
          const key = lb.player_uid || lb.player_ign;
          if (!playerMap[key]) {
            playerMap[key] = {
              ign: lb.player_ign,
              uid: lb.player_uid || "",
              kills: 0,
              tournaments: 0,
              wins: 0,
              best_placement: null,
              history: []
            };
          }
          playerMap[key].kills += lb.kills || 0;
          playerMap[key].tournaments += 1;
          playerMap[key].wins += lb.wins || 0;
          if (placement > 0 && (playerMap[key].best_placement === null || placement < playerMap[key].best_placement)) {
            playerMap[key].best_placement = placement;
          }
          playerMap[key].history.push({
            tournament_title: lb.tournament_title || tourney?.title || "Unknown",
            tournament_type: tourney?.tournament_type || "",
            date: tourney?.date_time,
            kills: lb.kills || 0,
            points: lb.points || 0,
            placement,
            team_name: lb.team_name,
          });
        } else {
          members.forEach(m => {
            if (!m.ign) return;
            const key = m.uid || m.ign;
            if (!playerMap[key]) {
              playerMap[key] = {
                ign: m.ign,
                uid: m.uid || "",
                kills: 0,
                tournaments: 0,
                wins: 0,
                best_placement: null,
                history: []
              };
            }
            playerMap[key].kills += m.kills || 0;
            playerMap[key].tournaments += 1;
            playerMap[key].wins += lb.wins || 0;
            if (placement > 0 && (playerMap[key].best_placement === null || placement < playerMap[key].best_placement)) {
              playerMap[key].best_placement = placement;
            }
            playerMap[key].history.push({
              tournament_title: lb.tournament_title || tourney?.title || "Unknown",
              tournament_type: tourney?.tournament_type || "",
              date: tourney?.date_time,
              kills: m.kills || 0,
              points: lb.points || 0,
              placement,
              team_name: lb.team_name,
            });
          });
        }
      });

      // Sort by kills desc
      const sorted = Object.values(playerMap).sort((a, b) => b.kills - a.kills);
      setPlayers(sorted);
    } catch (e) {
      console.error("PlayerProfiles error:", e);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = players.filter(p =>
    !search || p.ign?.toLowerCase().includes(search.toLowerCase()) || p.uid?.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Player Profiles</h2>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">{players.length} Players</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search IGN or UID..."
              className="bg-gray-800 border-gray-700 text-white pl-8 w-56"
            />
          </div>
          <Button onClick={loadData} disabled={refreshing} variant="outline" size="sm" className="border-gray-600">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-10 text-center text-gray-500">
              No player data yet. Data appears after tournaments are completed and leaderboards are finalized.
            </CardContent>
          </Card>
        )}
        {filtered.map((player, index) => {
          const isExpanded = expandedPlayer === player.id;
          return (
            <Card key={player.uid || player.ign} className="bg-gray-800 border-gray-700 overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => setExpandedPlayer(isExpanded ? null : player.uid || player.ign)}
              >
                <div className="w-8 text-center">
                  {index < 3 ? (
                    <span className="text-lg">{['🥇', '🥈', '🥉'][index]}</span>
                  ) : (
                    <span className="text-gray-500 font-bold text-sm">#{index + 1}</span>
                  )}
                </div>
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-sm font-bold">
                    {player.ign?.[0]?.toUpperCase() || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{player.ign}</p>
                  {player.uid && <p className="text-cyan-400 text-xs font-mono">{player.uid}</p>}
                </div>
                <div className="hidden sm:flex items-center gap-4 text-center">
                  <div>
                    <p className="text-red-400 font-bold text-sm">{player.kills}</p>
                    <p className="text-gray-500 text-[10px]">Kills</p>
                  </div>
                  <div>
                    <p className="text-purple-400 font-bold text-sm">{player.tournaments}</p>
                    <p className="text-gray-500 text-[10px]">Tourneys</p>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-bold text-sm">{player.wins}</p>
                    <p className="text-gray-500 text-[10px]">Wins</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/PlayerProfile?uid=${player.uid}&ign=${encodeURIComponent(player.ign)}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <Button size="sm" variant="outline" className="border-purple-500/50 text-purple-400 h-7 px-2 text-xs">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-700 bg-gray-900/50 p-4 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Tournaments", value: player.tournaments, color: "text-purple-400" },
                      { label: "Total Kills", value: player.kills, color: "text-red-400" },
                      { label: "Wins", value: player.wins, color: "text-yellow-400" },
                      { label: "Best Pos", value: player.best_placement ? `#${player.best_placement}` : '-', color: "text-cyan-400" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-gray-800 rounded-lg p-2 text-center">
                        <p className={`font-black text-lg ${color}`}>{value}</p>
                        <p className="text-gray-500 text-[10px]">{label}</p>
                      </div>
                    ))}
                  </div>

                  {player.history.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">Match History</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {player.history.map((match, mi) => (
                          <div key={mi} className="bg-gray-800/60 rounded-lg px-3 py-2 flex items-center justify-between">
                            <div>
                              <p className="text-white text-xs font-bold">{match.tournament_title}</p>
                              <p className="text-gray-500 text-[10px]">Team: {match.team_name}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-sm ${match.placement === 1 ? 'text-yellow-400' : match.placement === 2 ? 'text-gray-300' : match.placement === 3 ? 'text-orange-400' : 'text-white'}`}>
                                {match.placement > 0 ? (match.placement <= 3 ? ['🥇','🥈','🥉'][match.placement-1] : `#${match.placement}`) : '-'}
                              </p>
                              <p className="text-red-400 text-[10px]">{match.kills} kills</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}