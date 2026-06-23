import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Zap, Swords, ArrowLeft, RefreshCw, Target, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function PlayerProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerUID = urlParams.get("uid");
  const playerIGN = urlParams.get("ign");

  const [player, setPlayer] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      // Fetch all TournamentLeaderboard entries and find ones where this player appears
      const allLB = await base44.entities.TournamentLeaderboard.list("-created_date", 200).catch(() => []);
      const allTournaments = await base44.entities.Tournament.list("-created_date", 100).catch(() => []);
      const tournamentMap = {};
      (allTournaments || []).forEach(t => { tournamentMap[t.id] = t; });

      let totalKills = 0;
      let totalPoints = 0;
      let tournaments = 0;
      let wins = 0;
      let bestPlacement = null;
      const history = [];

      (allLB || []).forEach(lb => {
        const members = lb.team_members || [];
        // Check if this player is in the team members
        const memberEntry = members.find(m =>
          (playerUID && m.uid === playerUID) ||
          (playerIGN && m.ign?.toLowerCase() === playerIGN.toLowerCase())
        );

        if (memberEntry) {
          totalKills += memberEntry.kills || 0;
          tournaments += 1;
          const tourney = tournamentMap[lb.tournament_id];
          const placement = lb.placement || (lb.wins > 0 ? 1 : 0);
          if (placement > 0 && (bestPlacement === null || placement < bestPlacement)) {
            bestPlacement = placement;
          }
          if (lb.wins > 0) wins += lb.wins;

          history.push({
            tournament_id: lb.tournament_id,
            tournament_title: lb.tournament_title || tourney?.title || "Unknown",
            tournament_type: tourney?.tournament_type || "",
            match_date: tourney?.date_time,
            placement,
            kills: memberEntry.kills || 0,
            team_kills: lb.kills || 0,
            points: lb.points || 0,
            team_name: lb.team_name,
            rank: lb.rank,
          });
        } else if (!playerUID && playerIGN && lb.player_ign?.toLowerCase() === playerIGN.toLowerCase()) {
          // Fallback: match by team leader IGN
          totalKills += lb.kills || 0;
          totalPoints += lb.points || 0;
          tournaments += 1;
          const tourney = tournamentMap[lb.tournament_id];
          const placement = lb.placement || (lb.wins > 0 ? 1 : 0);
          if (placement > 0 && (bestPlacement === null || placement < bestPlacement)) {
            bestPlacement = placement;
          }
          if (lb.wins > 0) wins += lb.wins;

          history.push({
            tournament_id: lb.tournament_id,
            tournament_title: lb.tournament_title || tourney?.title || "Unknown",
            tournament_type: tourney?.tournament_type || "",
            match_date: tourney?.date_time,
            placement,
            kills: lb.kills || 0,
            team_kills: lb.kills || 0,
            points: lb.points || 0,
            team_name: lb.team_name,
            rank: lb.rank,
          });
        }
      });

      // Sort history by date desc
      history.sort((a, b) => (b.match_date ? new Date(b.match_date) : 0) - (a.match_date ? new Date(a.match_date) : 0));

      setPlayer({
        ign: playerIGN || "Unknown Player",
        uid: playerUID || "",
        total_kills: totalKills,
        total_points: totalPoints,
        tournaments,
        wins,
        best_placement: bestPlacement,
      });
      setMatchHistory(history);
    } catch (e) {
      console.error("PlayerProfile error:", e);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => window.history.back()} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={loadData} disabled={refreshing} variant="outline" size="sm" className="border-purple-500/50 text-purple-400">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Updating..." : "Update Leaderboard"}
          </Button>
        </div>

        {/* Player Header Card */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-purple-600/30 to-pink-600/30" />
          <CardContent className="px-5 pb-5 -mt-10">
            <div className="flex items-end gap-4 mb-4">
              <Avatar className="w-20 h-20 rounded-2xl ring-4 ring-gray-800 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-3xl font-black">
                  {player?.ign?.[0]?.toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <h1 className="text-2xl font-black text-white">{player?.ign}</h1>
                {player?.uid && <p className="text-cyan-400 text-sm font-mono">UID: {player.uid}</p>}
                <p className="text-gray-400 text-sm">{player?.tournaments || 0} Tournaments Played</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Tournaments", value: player?.tournaments || 0, color: "text-purple-400" },
                { label: "Total Kills", value: player?.total_kills || 0, color: "text-red-400" },
                { label: "Wins", value: player?.wins || 0, color: "text-yellow-400" },
                { label: "Best Pos", value: player?.best_placement ? `#${player.best_placement}` : '-', color: "text-cyan-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-800/70 rounded-xl p-3 text-center">
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Match History */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-purple-400 text-base">
              <Trophy className="w-4 h-4" /> Match History ({matchHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No match history yet</p>
            ) : matchHistory.map((match, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
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
                      {match.team_name && (
                        <span className="text-[10px] text-gray-400">Team: {match.team_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${match.placement === 1 ? 'text-yellow-400' : match.placement === 2 ? 'text-gray-300' : match.placement === 3 ? 'text-orange-400' : 'text-white'}`}>
                      {match.placement > 0 ? (match.placement === 1 ? '🥇' : match.placement === 2 ? '🥈' : match.placement === 3 ? '🥉' : `#${match.placement}`) : '-'}
                    </p>
                    {match.points > 0 && <p className="text-cyan-400 text-xs font-bold">{match.points} pts</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-white text-sm font-bold">{match.kills}</span>
                    <span className="text-gray-500 text-xs">kills</span>
                  </div>
                  {match.team_kills !== match.kills && (
                    <span className="text-[10px] text-gray-500">Team total: {match.team_kills}K</span>
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