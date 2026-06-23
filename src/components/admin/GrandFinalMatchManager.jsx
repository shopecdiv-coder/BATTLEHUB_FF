import React, { useState, useEffect } from "react";
import { TournamentMatch } from "@/entities/TournamentMatch";
import { Registration } from "@/entities/Registration";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Medal, Swords, Trophy, Plus, Save, RefreshCw, Trash2 } from "lucide-react";
import { rankTeamsGrandFinal, PLACEMENT_POINTS } from "@/lib/leaderboardRank";

const KILL_PTS = 1; // Grand Final: 1 kill = 1 point

export default function GrandFinalMatchManager({ tournament }) {
  const [matches, setMatches] = useState([]);
  const [qualifiedTeams, setQualifiedTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupCount, setSetupCount] = useState(3);

  useEffect(() => {
    if (tournament) loadData();
  }, [tournament]);

  const loadData = async () => {
    setLoading(true);
    const existingMatches = await TournamentMatch.filter({ tournament_id: tournament.id }, "match_number").catch(() => []);
    setMatches(existingMatches || []);
    const regs = await Registration.filter({ tournament_id: tournament.id }).catch(() => []);
    setQualifiedTeams(regs);
    setLoading(false);
  };

  const createMatches = async (count) => {
    setSaving(true);
    const created = [];
    for (let i = 1; i <= count; i++) {
      const m = await TournamentMatch.create({
        tournament_id: tournament.id,
        tournament_title: tournament.title,
        match_number: `M${i}`,
        round: "grand_final",
        status: "Scheduled",
        kill_points_per_kill: KILL_PTS,
        results: []
      }).catch(() => null);
      if (m) created.push(m);
    }
    setMatches(created);
    setSaving(false);
  };

  const addMatch = async () => {
    const next = matches.length + 1;
    if (next > 5) return;
    setSaving(true);
    const m = await TournamentMatch.create({
      tournament_id: tournament.id,
      tournament_title: tournament.title,
      match_number: `M${next}`,
      round: "grand_final",
      status: "Scheduled",
      kill_points_per_kill: KILL_PTS,
      results: []
    }).catch(() => null);
    if (m) setMatches(prev => [...prev, m]);
    setSaving(false);
  };

  const deleteMatch = async (matchId) => {
    if (!confirm("Delete this match?")) return;
    setSaving(true);
    await TournamentMatch.delete(matchId).catch(() => null);
    const remaining = matches.filter(m => m.id !== matchId);
    setMatches(remaining);
    // Re-compute and push overall standings with remaining matches
    await pushOverallToLeaderboard(remaining);
    setSaving(false);
  };

  const updateMatchResult = (matchId, teamName, field, value) => {
    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m;
      const results = [...(m.results || [])];
      let teamResult = results.find(r => r.team_name === teamName);
      if (!teamResult) {
        teamResult = { team_name: teamName, placement: 0, kills: 0, points: 0 };
        results.push(teamResult);
      }
      if (field === "kills") teamResult.kills = parseInt(value) || 0;
      if (field === "placement") teamResult.placement = parseInt(value) || 0;
      teamResult.points = (teamResult.kills * KILL_PTS) + (PLACEMENT_POINTS[teamResult.placement] || 0);
      return { ...m, results };
    }));
  };

  // Push overall standings (from all matches) into TournamentLeaderboard entries
  const pushOverallToLeaderboard = async (matchList) => {
    const matchCount = matchList.filter(m => m.status === "Completed" || true).length;
    const ranked = rankTeamsGrandFinal(
      qualifiedTeams.map(team => ({
        ...team,
        match_results: matchList.map(m => {
          const r = (m.results || []).find(r => r.team_name === team.team_name);
          return {
            match_number: m.match_number,
            placement: r?.placement || 0,
            kills: r?.kills || 0,
            points: r?.points || 0
          };
        })
      })),
      KILL_PTS,
      Math.max(matchList.length, 1)
    );

    for (let i = 0; i < ranked.length; i++) {
      const team = ranked[i];
      const s = team._stats;
      // Update Registration totals
      await Registration.update(team.id, {
        total_points: s.totalPoints,
        total_kills: s.totalKills
      }).catch(() => null);

      // Update TournamentLeaderboard entry with full match_results + rank
      const lbEntries = await TournamentLeaderboard.filter({
        tournament_id: tournament.id,
        user_id: team.team_leader_id
      }).catch(() => []);
      if (lbEntries.length > 0) {
        await TournamentLeaderboard.update(lbEntries[0].id, {
          points: s.totalPoints,
          kills: s.totalKills,
          wins: s.booyah,
          rank: i + 1,
          placement: 0,
          match_results: matchList.map(m => {
            const r = (m.results || []).find(r => r.team_name === team.team_name);
            return {
              match_number: m.match_number,
              placement: r?.placement || 0,
              kills: r?.kills || 0,
              points: r?.points || 0
            };
          })
        }).catch(() => null);
      }
    }
  };

  const saveMatch = async (matchId) => {
    setSaving(true);
    const match = matches.find(m => m.id === matchId);
    if (!match) { setSaving(false); return; }

    await TournamentMatch.update(matchId, { results: match.results, status: "Completed" }).catch(() => null);
    const allMatchesAfter = matches.map(m => m.id === matchId ? { ...m, status: "Completed" } : m);
    setMatches(allMatchesAfter);
    await pushOverallToLeaderboard(allMatchesAfter);
    await loadData();
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto" /></div>;
  }

  // No matches yet → setup
  if (matches.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/30">
        <CardContent className="p-6 text-center space-y-4">
          <Trophy className="w-10 h-10 text-yellow-400 mx-auto" />
          <h3 className="text-white font-bold text-lg">Setup Grand Final Matches</h3>
          <p className="text-gray-400 text-sm">Kitne matches honge? (M1 to M5)</p>
          <div className="flex items-center justify-center gap-3">
            <Select value={String(setupCount)} onValueChange={(v) => setSetupCount(parseInt(v))}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} Match{n > 1 ? "es" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => createMatches(setupCount)} disabled={saving} className="bg-gradient-to-r from-yellow-600 to-orange-600">
              <Plus className="w-4 h-4 mr-1" /> Create Matches
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rankedStandings = rankTeamsGrandFinal(
    qualifiedTeams.map(team => ({
      ...team,
      match_results: matches.map(m => {
        const r = (m.results || []).find(r => r.team_name === team.team_name);
        return { match_number: m.match_number, placement: r?.placement || 0, kills: r?.kills || 0, points: r?.points || 0 };
      })
    })),
    KILL_PTS,
    matches.length
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <h2 className="text-xl font-bold text-white">Grand Final — Match Management</h2>
        <Badge className="bg-purple-500/20 text-purple-400">1 Kill = 1 Point</Badge>
        <Badge className="bg-blue-500/20 text-blue-400">{matches.length} Match{matches.length > 1 ? "es" : ""}</Badge>
        {matches.length < 5 && (
          <Button onClick={addMatch} disabled={saving} size="sm" className="ml-auto bg-gray-700 hover:bg-gray-600 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add Match (M{matches.length + 1})
          </Button>
        )}
      </div>

      {/* Overall Standings */}
      {qualifiedTeams.length > 0 && (
        <Card className="bg-gray-800 border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Medal className="w-5 h-5 text-yellow-400" /> Overall Standings
              <span className="text-xs text-gray-500 font-normal ml-2">(Total Pts → Booyah → Kills → Last Match)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="text-left py-2 px-2">Rank</th>
                    <th className="text-left py-2 px-2">Team</th>
                    {matches.map(m => <th key={m.id} className="text-center py-2 px-1">{m.match_number}</th>)}
                    <th className="text-center py-2 px-1" title="Booyah count">👑</th>
                    <th className="text-center py-2 px-1 text-red-400">Kills</th>
                    <th className="text-center py-2 px-2 text-yellow-400">Total</th>
                    {rankedStandings.some(t => t._isTie) && <th className="text-center py-2 px-1 text-orange-400 text-xs">Tie?</th>}
                  </tr>
                </thead>
                <tbody>
                  {rankedStandings.map((team, i) => {
                    const s = team._stats;
                    return (
                      <tr key={team.id} className={`border-b border-gray-700/50 ${
                        i === 0 ? 'bg-yellow-500/10' : i === 1 ? 'bg-gray-400/10' : i === 2 ? 'bg-orange-500/10' : ''
                      }`}>
                        <td className="py-2 px-2 font-bold text-white">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </td>
                        <td className="py-2 px-2 text-white font-semibold">{team.team_name}</td>
                        {matches.map(m => {
                          const r = (m.results || []).find(r => r.team_name === team.team_name);
                          return <td key={m.id} className="text-center py-2 px-1 text-cyan-400">{r?.points || 0}</td>;
                        })}
                        <td className="text-center py-2 px-1 text-yellow-300">{s.booyah}</td>
                        <td className="text-center py-2 px-1 text-red-300">{s.totalKills}</td>
                        <td className="text-center py-2 px-2 text-yellow-400 font-bold">{s.totalPoints}</td>
                        {rankedStandings.some(t => t._isTie) && (
                          <td className="text-center py-2 px-1">
                            {team._isTie && <span className="text-orange-400 text-xs font-bold">⚠️TIE</span>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map(match => (
          <Card key={match.id} className={`bg-gray-800 ${match.status === "Completed" ? "border-green-500/30" : "border-yellow-500/30"}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Swords className="w-4 h-4 text-red-400" />
                  {match.match_number}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={match.status === "Completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                    {match.status}
                  </Badge>
                  <button
                    onClick={() => deleteMatch(match.id)}
                    disabled={saving}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10"
                    title="Delete this match"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {qualifiedTeams.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">No qualified teams</p>
              ) : (
                <>
                  {qualifiedTeams.map(team => {
                    const result = (match.results || []).find(r => r.team_name === team.team_name) || { kills: 0, placement: 0, points: 0 };
                    return (
                      <div key={team.id} className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                        <p className="text-white font-semibold text-xs truncate">{team.team_name}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-gray-500 text-[10px]">Position</Label>
                            <Select
                              value={String(result.placement || "")}
                              onValueChange={(v) => updateMatchResult(match.id, team.team_name, "placement", v)}
                              disabled={match.status === "Completed"}
                            >
                              <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8 text-xs">
                                <SelectValue placeholder="Pos" />
                              </SelectTrigger>
                              <SelectContent>
                                {qualifiedTeams.map((_, i) => (
                                  <SelectItem key={i} value={String(i + 1)}>#{i + 1}{PLACEMENT_POINTS[i + 1] ? ` (+${PLACEMENT_POINTS[i + 1]})` : ''}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-gray-500 text-[10px]">Kills (+1 pt each)</Label>
                            <Input
                              type="number"
                              value={result.kills}
                              onChange={(e) => updateMatchResult(match.id, team.team_name, "kills", e.target.value)}
                              disabled={match.status === "Completed"}
                              className="bg-gray-800 border-gray-700 text-white h-8 text-xs"
                              min="0"
                            />
                          </div>
                        </div>
                        <p className="text-cyan-400 text-xs font-bold text-right">{result.points} pts</p>
                      </div>
                    );
                  })}
                  {match.status !== "Completed" ? (
                    <Button onClick={() => saveMatch(match.id)} disabled={saving} size="sm" className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90">
                      <Save className="w-3 h-3 mr-1" /> Save {match.match_number}
                    </Button>
                  ) : (
                    <Button onClick={() => { setMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: "Scheduled" } : m)); }} variant="outline" size="sm" className="w-full border-yellow-500/40 text-yellow-400 text-xs">
                      Edit {match.match_number}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={loadData} variant="outline" size="sm" className="border-gray-600 text-gray-400">
        <RefreshCw className="w-3 h-3 mr-1" /> Refresh
      </Button>
    </div>
  );
}