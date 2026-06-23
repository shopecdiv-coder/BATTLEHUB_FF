import React, { useState, useEffect } from "react";
import { TeamProfile } from "@/entities/TeamProfile";
import { Registration } from "@/entities/Registration";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Tournament } from "@/entities/Tournament";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Search, RefreshCw, Swords, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function TeamProfilesManagement() {
  const [teams, setTeams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [lbEntries, setLbEntries] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [regs, lb, tourneys] = await Promise.all([
        Registration.list("-created_date", 200).catch(() => []),
        TournamentLeaderboard.list("-created_date", 200).catch(() => []),
        Tournament.list("-created_date", 100).catch(() => [])
      ]);
      setRegistrations(regs);
      setLbEntries(lb);
      setTournaments(tourneys);
      
      // Build team map from registrations
      const teamMap = {};
      regs.forEach(reg => {
        const key = reg.team_leader_id;
        if (!teamMap[key]) {
          teamMap[key] = {
            team_leader_id: key,
            team_name: reg.team_name || reg.team_leader_ign,
            team_logo_url: reg.team_logo_url,
            members: reg.team_members || [],
            registrations: []
          };
        }
        teamMap[key].registrations.push(reg);
        // Update with latest logo if available
        if (reg.team_logo_url && !teamMap[key].team_logo_url) {
          teamMap[key].team_logo_url = reg.team_logo_url;
        }
      });
      setTeams(Object.values(teamMap));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getTeamStats = (leaderId) => {
    const entries = lbEntries.filter(e => e.user_id === leaderId);
    const totalKills = entries.reduce((s, e) => s + (e.kills || 0), 0);
    const totalPoints = entries.reduce((s, e) => s + (e.points || 0), 0);
    const wins = entries.filter(e => e.wins > 0).length;
    const bestPlace = entries.reduce((best, e) => {
      const p = e.placement || 0;
      return (p > 0 && (!best || p < best)) ? p : best;
    }, null);
    return { totalKills, totalPoints, wins, bestPlace, matchCount: entries.length };
  };

  const getMatchHistory = (leaderId) => {
    const entries = lbEntries.filter(e => e.user_id === leaderId);
    return entries.map(lb => {
      const tourney = tournaments.find(t => t.id === lb.tournament_id);
      return {
        title: lb.tournament_title || tourney?.title || "Unknown",
        type: tourney?.tournament_type || "",
        date: tourney?.date_time,
        kills: lb.kills || 0,
        points: lb.points || 0,
        placement: lb.placement || (lb.wins > 0 ? 1 : 0),
        member_kills: lb.team_members || []
      };
    }).sort((a, b) => (b.date ? new Date(b.date) : 0) - (a.date ? new Date(a.date) : 0));
  };

  const filtered = teams.filter(t =>
    !search ||
    t.team_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.members?.some(m => m.ign?.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">Team Profiles</h2>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{teams.length} Teams</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search teams or players..."
              className="bg-gray-800 border-gray-700 text-white pl-8 w-56"
            />
          </div>
          <Button onClick={loadData} variant="outline" size="sm" className="border-gray-600">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-10 text-center text-gray-500">
              No teams found. Teams appear automatically after players register for tournaments.
            </CardContent>
          </Card>
        )}
        {filtered.map(team => {
          const stats = getTeamStats(team.team_leader_id);
          const isExpanded = expandedTeam === team.team_leader_id;
          const history = isExpanded ? getMatchHistory(team.team_leader_id) : [];

          return (
            <Card key={team.team_leader_id} className="bg-gray-800 border-gray-700 overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => setExpandedTeam(isExpanded ? null : team.team_leader_id)}
              >
                {/* Logo */}
                {team.team_logo_url ? (
                  <img src={team.team_logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-600 flex-shrink-0" onError={e => e.target.style.display='none'} />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-xl font-black flex-shrink-0">
                    {team.team_name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name & members */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold">{team.team_name}</p>
                  <p className="text-gray-400 text-xs truncate">
                    {team.members.map(m => m.ign).join(", ") || "No members"}
                  </p>
                </div>

                {/* Quick stats */}
                <div className="hidden sm:flex items-center gap-4 text-center">
                  <div>
                    <p className="text-red-400 font-bold text-sm">{stats.totalKills}</p>
                    <p className="text-gray-500 text-[10px]">Kills</p>
                  </div>
                  <div>
                    <p className="text-cyan-400 font-bold text-sm">{stats.totalPoints}</p>
                    <p className="text-gray-500 text-[10px]">Points</p>
                  </div>
                  <div>
                    <p className="text-purple-400 font-bold text-sm">{team.registrations.length}</p>
                    <p className="text-gray-500 text-[10px]">Tourneys</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/TeamProfile?leader=${team.team_leader_id}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <Button size="sm" variant="outline" className="border-cyan-500/50 text-cyan-400 h-7 px-2 text-xs">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-700 bg-gray-900/50 p-4 space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Tournaments", value: team.registrations.length, color: "text-purple-400" },
                      { label: "Total Kills", value: stats.totalKills, color: "text-red-400" },
                      { label: "Total Points", value: stats.totalPoints, color: "text-cyan-400" },
                      { label: "Best Pos", value: stats.bestPlace ? `#${stats.bestPlace}` : '-', color: "text-yellow-400" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-gray-800 rounded-lg p-2 text-center">
                        <p className={`font-black text-lg ${color}`}>{value}</p>
                        <p className="text-gray-500 text-[10px]">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Members */}
                  {team.members.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">Members</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {team.members.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 bg-gray-800/60 rounded-lg p-2">
                            {m.isLeader && <span className="text-yellow-400 text-xs">👑</span>}
                            <div>
                              <p className="text-white text-xs font-semibold">{m.ign}</p>
                              <p className="text-cyan-400 text-[10px] font-mono">UID: {m.uid}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Match history */}
                  {history.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">Match History</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {history.map((match, mi) => (
                          <div key={mi} className="bg-gray-800/60 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2">
                              <div>
                                <p className="text-white text-xs font-bold">{match.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {match.type && <Badge className="bg-purple-500/20 text-purple-400 text-[9px] border-purple-500/30">{match.type}</Badge>}
                                  {match.date && <p className="text-gray-500 text-[10px]">{format(new Date(match.date), "dd MMM yy")}</p>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-black text-base ${match.placement === 1 ? 'text-yellow-400' : match.placement === 2 ? 'text-gray-300' : match.placement === 3 ? 'text-orange-400' : 'text-white'}`}>
                                  {match.placement > 0 ? (match.placement <= 3 ? ['🥇','🥈','🥉'][match.placement-1] : `#${match.placement}`) : '-'}
                                </p>
                                <p className="text-cyan-400 text-[10px]">{match.points} pts</p>
                              </div>
                            </div>
                            {/* Per-member kills */}
                            {match.member_kills?.some(m => m.ign) && (
                              <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                                {match.member_kills.filter(m => m.ign).map((mk, mki) => (
                                  <span key={mki} className="text-[10px] bg-gray-700/60 rounded px-1.5 py-0.5">
                                    {mk.ign}: <span className="text-red-400 font-bold">{mk.kills || 0}K</span>
                                  </span>
                                ))}
                                <span className="text-[10px] text-gray-500">Total: <span className="text-red-400 font-bold">{match.kills}K</span></span>
                              </div>
                            )}
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