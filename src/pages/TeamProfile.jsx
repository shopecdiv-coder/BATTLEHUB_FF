import React, { useState, useEffect } from "react";
import { TeamProfile as TeamProfileEntity } from "@/entities/TeamProfile";
import { Registration } from "@/entities/Registration";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Swords, TrendingUp, ArrowLeft, Star, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function TeamProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get("id");
  const leaderId = urlParams.get("leader");

  const [team, setTeam] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [lbEntries, setLbEntries] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const updateLeaderboard = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadData = async () => {
    try {
      const me = await User.me();
      setUser(me);

      if (teamId) {
        const profiles = await TeamProfileEntity.filter({ id: teamId }).catch(() => []);
        if (profiles.length > 0) setTeam(profiles[0]);
      } else if (leaderId) {
        const profiles = await TeamProfileEntity.filter({ team_leader_id: leaderId }).catch(() => []);
        if (profiles.length > 0) setTeam(profiles[0]);
      }

      const lookupId = leaderId || (teamId ? null : me.id);
      if (lookupId) {
        const regs = await Registration.filter({ team_leader_id: lookupId }).catch(() => []);
        setRegistrations(regs);

        const lb = await TournamentLeaderboard.filter({ user_id: lookupId }).catch(() => []);
        setLbEntries(lb);

        const tIds = [...new Set(regs.map(r => r.tournament_id))];
        const tourneyData = await Promise.all(tIds.map(id => Tournament.filter({ id }).catch(() => []))).catch(() => []);
        setTournaments(tourneyData.flat());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const teamName = team?.team_name || registrations[0]?.team_name || "Unknown Team";
  const teamLogo = team?.team_logo_url || registrations[0]?.team_logo_url;
  const members = team?.members || registrations[0]?.team_members || [];
  const totalKills = lbEntries.reduce((s, e) => s + (e.kills || 0), 0);
  const totalPoints = lbEntries.reduce((s, e) => s + (e.points || 0), 0);
  const wins = lbEntries.filter(e => e.wins > 0).length;
  const bestPlacement = lbEntries.reduce((best, e) => {
    const p = e.placement || (e.rank === 1 ? 1 : 0);
    if (!best && p > 0) return p;
    return (p > 0 && p < best) ? p : best;
  }, null);

  // Build match history from leaderboard entries
  const matchHistory = lbEntries.map(lb => {
    const tourney = tournaments.find(t => t.id === lb.tournament_id);
    return {
      tournament_id: lb.tournament_id,
      tournament_title: lb.tournament_title || tourney?.title || "Unknown",
      tournament_type: tourney?.tournament_type || "",
      match_date: tourney?.date_time,
      placement: lb.placement || (lb.wins > 0 ? 1 : 0),
      kills: lb.kills || 0,
      points: lb.points || 0,
      member_kills: lb.team_members || [],
      rank: lb.rank
    };
  }).sort((a, b) => (b.match_date ? new Date(b.match_date) : 0) - (a.match_date ? new Date(a.match_date) : 0));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => window.history.back()} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={updateLeaderboard} disabled={refreshing} variant="outline" size="sm" className="border-cyan-500/50 text-cyan-400">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Updating..." : "Update Leaderboard"}
          </Button>
        </div>

        {/* Team Header Card */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-purple-600/30 to-cyan-600/30" />
          <CardContent className="px-5 pb-5 -mt-10">
            <div className="flex items-end gap-4 mb-4">
              {teamLogo ? (
                <img src={teamLogo} alt="logo" className="w-20 h-20 rounded-2xl object-cover border-4 border-gray-800 flex-shrink-0" onError={e => e.target.style.display='none'} />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-3xl font-black border-4 border-gray-800 flex-shrink-0">
                  {(teamName || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="pb-1">
                <h1 className="text-2xl font-black text-white">{teamName}</h1>
                <p className="text-gray-400 text-sm">{members.length} Members • {registrations.length} Tournaments</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Tournaments", value: registrations.length, color: "text-purple-400" },
                { label: "Total Kills", value: totalKills, color: "text-red-400" },
                { label: "Total Points", value: totalPoints, color: "text-cyan-400" },
                { label: "Best Pos", value: bestPlacement ? `#${bestPlacement}` : '-', color: "text-yellow-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-800/70 rounded-xl p-3 text-center">
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        {members.length > 0 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-purple-400 text-base">
                <Users className="w-4 h-4" /> Team Members
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <div className="flex items-center gap-2">
                    {m.isLeader && <span className="text-yellow-400">👑</span>}
                    <div>
                      <p className="text-white font-semibold text-sm">{m.ign}</p>
                      <p className="text-cyan-400 text-xs font-mono">UID: {m.uid}</p>
                    </div>
                  </div>
                  {m.isLeader && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Leader</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Match History */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-cyan-400 text-base">
              <Trophy className="w-4 h-4" /> Match History ({matchHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No match history yet</p>
            ) : matchHistory.map((match, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                {/* Match header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700/40">
                  <div>
                    <p className="text-white font-semibold text-sm">{match.tournament_title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {match.tournament_type && (
                        <Badge className="bg-purple-500/20 text-purple-400 text-[10px] border-purple-500/30">{match.tournament_type}</Badge>
                      )}
                      {match.match_date && (
                        <p className="text-gray-500 text-[10px]">{format(new Date(match.match_date), "dd MMM yyyy")}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${match.placement === 1 ? 'text-yellow-400' : match.placement === 2 ? 'text-gray-300' : match.placement === 3 ? 'text-orange-400' : 'text-white'}`}>
                      {match.placement > 0 ? (match.placement === 1 ? '🥇' : match.placement === 2 ? '🥈' : match.placement === 3 ? '🥉' : `#${match.placement}`) : '-'}
                    </p>
                    <p className="text-cyan-400 text-xs font-bold">{match.points} pts</p>
                  </div>
                </div>
                {/* Stats */}
                <div className="flex items-center gap-4 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-white text-sm font-bold">{match.kills}</span>
                    <span className="text-gray-500 text-xs">total kills</span>
                  </div>
                  {match.member_kills?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {match.member_kills.map((mk, mi) => (
                        mk.ign && (
                          <span key={mi} className="text-xs bg-gray-700/60 rounded px-1.5 py-0.5 text-gray-300">
                            {mk.ign}: <span className="text-red-400 font-bold">{mk.kills || 0}K</span>
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}