import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Target, Swords, Save, RefreshCw, ChevronDown, ChevronUp, Search } from "lucide-react";

export default function MatchKillTracker({ onUpdate }) {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [matchData, setMatchData] = useState({}); // { teamId: { M1: { kills, placement }, M2: ... } }
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [currentMatch, setCurrentMatch] = useState("M1");

  const MATCHES = ["M1", "M2", "M3", "M4", "M5"];

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournamentId) loadRegistrations();
  }, [selectedTournamentId]);

  const loadTournaments = async () => {
    const all = await Tournament.list("-created_date", 100).catch(() => []);
    setTournaments((all || []).filter(t => !t.is_template && t.status !== "Cancelled"));
  };

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const regs = await Registration.filter({ tournament_id: selectedTournamentId }, "-created_date", 100);
      setRegistrations(regs || []);

      // Load existing leaderboard entries for this tournament
      const entries = await TournamentLeaderboard.filter({ tournament_id: selectedTournamentId }).catch(() => []);
      const dataMap = {};
      (entries || []).forEach(entry => {
        const teamKey = entry.user_id;
        dataMap[teamKey] = { _entryId: entry.id, _regId: entry.unique_id };
        (entry.match_results || []).forEach(mr => {
          dataMap[teamKey][mr.match_number] = { kills: mr.kills || 0, placement: mr.placement || 0 };
        });
      });
      setMatchData(dataMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const updateMatchData = (teamId, match, field, value) => {
    setMatchData(prev => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] || {}),
        [match]: {
          ...(prev[teamId]?.[match] || {}),
          [field]: parseInt(value) || 0
        }
      }
    }));
  };

  const updateMemberKills = (teamId, match, memberIdx, kills) => {
    setMatchData(prev => {
      const teamMatch = prev[teamId]?.[match] || {};
      const members = [...(teamMatch.memberKills || [])];
      members[memberIdx] = { ...(members[memberIdx] || {}), kills: parseInt(kills) || 0 };
      // Auto-sum kills
      const totalKills = members.reduce((sum, m) => sum + (m.kills || 0), 0);
      return {
        ...prev,
        [teamId]: {
          ...(prev[teamId] || {}),
          [match]: { ...teamMatch, memberKills: members, kills: totalKills }
        }
      };
    });
  };

  const saveAll = async () => {
    if (!selectedTournamentId) return;
    setSaving(true);
    try {
      const tournament = tournaments.find(t => t.id === selectedTournamentId);
      const killPoints = tournament?.point_system?.kill_points || 1;
      const placementPoints = tournament?.point_system?.placement_points || {};

      for (const reg of registrations) {
        const teamData = matchData[reg.team_leader_id] || {};
        const matchResults = MATCHES.map(mn => {
          const md = teamData[mn] || {};
          const kills = md.kills || 0;
          const placement = md.placement || 0;
          const pp = placementPoints[String(placement)] || placementPoints[placement] || 0;
          const points = kills * killPoints + pp;
          return { match_number: mn, kills, placement, points };
        }).filter(mr => mr.kills > 0 || mr.placement > 0);

        const totalKills = matchResults.reduce((s, mr) => s + mr.kills, 0);
        const totalPoints = matchResults.reduce((s, mr) => s + mr.points, 0);
        const wins = matchResults.filter(mr => mr.placement === 1).length;

        // Build member kills data for all matches
        const memberKillsAll = {};
        MATCHES.forEach(mn => {
          const md = teamData[mn] || {};
          if (md.memberKills) {
            md.memberKills.forEach((mk, i) => {
              if (!memberKillsAll[i]) memberKillsAll[i] = { ign: reg.team_members?.[i]?.ign || `Player ${i+1}`, kills: 0 };
              memberKillsAll[i].kills += mk.kills || 0;
            });
          }
        });

        const teamMembersWithKills = (reg.team_members || []).map((m, i) => ({
          ...m,
          kills: memberKillsAll[i]?.kills || 0
        }));

        // Check if leaderboard entry exists
        const existing = await TournamentLeaderboard.filter({ tournament_id: selectedTournamentId, user_id: reg.team_leader_id }).catch(() => []);

        const payload = {
          kills: totalKills,
          points: totalPoints,
          wins,
          match_results: matchResults,
          team_members: teamMembersWithKills
        };

        if (existing.length > 0) {
          await TournamentLeaderboard.update(existing[0].id, payload);
        } else {
          await TournamentLeaderboard.create({
            tournament_id: selectedTournamentId,
            tournament_title: tournament?.title || "",
            user_id: reg.team_leader_id,
            unique_id: reg.id,
            team_name: reg.team_name,
            team_logo_url: reg.team_logo_url || "",
            player_ign: reg.team_leader_ign,
            player_uid: reg.team_leader_uid || "",
            team_members: teamMembersWithKills,
            ...payload
          });
        }
      }
      alert("✅ Match data saved to leaderboard!");
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error(e);
      alert("Error saving: " + e.message);
    }
    setSaving(false);
  };

  const filtered = registrations.filter(r =>
    !search || r.team_name?.toLowerCase().includes(search.toLowerCase()) || r.team_leader_ign?.toLowerCase().includes(search.toLowerCase())
  );

  const tournament = tournaments.find(t => t.id === selectedTournamentId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-red-400" />
          <h2 className="text-xl font-bold text-white">Match Kill & Position Tracker</h2>
        </div>
        {selectedTournamentId && (
          <div className="flex gap-2">
            <Button onClick={loadRegistrations} variant="outline" size="sm" className="border-gray-700 text-gray-300">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={saveAll} disabled={saving} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save All to Leaderboard"}
            </Button>
          </div>
        )}
      </div>

      {/* Tournament Select */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Select Tournament..." />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700 max-h-64">
            {tournaments.map(t => (
              <SelectItem key={t.id} value={t.id} className="text-white">
                {t.title} — {t.tournament_type || "Qualifier"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTournamentId && (
          <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1">
            {MATCHES.map(m => (
              <button
                key={m}
                onClick={() => setCurrentMatch(m)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${currentMatch === m ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedTournamentId && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team or player..."
            className="bg-gray-800 border-gray-700 text-white pl-10"
          />
        </div>
      )}

      {/* Info */}
      {tournament && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-gray-400 flex flex-wrap gap-4">
          <span>🎯 Kill Points: <b className="text-white">{tournament.point_system?.kill_points || 1}pt</b></span>
          <span>📋 Teams Registered: <b className="text-white">{registrations.length}</b></span>
          <span>📌 Match: <b className="text-orange-400">{currentMatch}</b></span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : filtered.length === 0 && selectedTournamentId ? (
        <div className="text-center py-12 text-gray-500">No teams found for this tournament</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((reg, idx) => {
            const teamData = matchData[reg.team_leader_id] || {};
            const currentMatchData = teamData[currentMatch] || {};
            const isExpanded = expandedTeam === reg.team_leader_id;
            const totalKills = MATCHES.reduce((s, m) => s + (teamData[m]?.kills || 0), 0);
            const totalPoints = MATCHES.reduce((s, m) => {
              const md = teamData[m] || {};
              const kills = md.kills || 0;
              const placement = md.placement || 0;
              const kp = tournament?.point_system?.kill_points || 1;
              const pp = tournament?.point_system?.placement_points?.[String(placement)] || 0;
              return s + kills * kp + pp;
            }, 0);

            return (
              <div key={reg.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {/* Row header */}
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold text-gray-400">
                    {idx + 1}
                  </div>
                  {reg.team_logo_url && (
                    <img src={reg.team_logo_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{reg.team_name}</p>
                    <p className="text-gray-500 text-xs">{reg.team_leader_ign}</p>
                  </div>

                  {/* Current match quick inputs */}
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <p className="text-[9px] text-gray-600 mb-0.5">Place</p>
                      <Input
                        type="number"
                        min="0"
                        max="52"
                        value={currentMatchData.placement || ""}
                        onChange={e => updateMatchData(reg.team_leader_id, currentMatch, "placement", e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white w-14 h-8 text-center text-sm px-1"
                        placeholder="0"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-gray-600 mb-0.5">Kills</p>
                      <Input
                        type="number"
                        min="0"
                        value={currentMatchData.kills || ""}
                        onChange={e => updateMatchData(reg.team_leader_id, currentMatch, "kills", e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white w-14 h-8 text-center text-sm px-1"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="text-right ml-2 hidden sm:block">
                    <p className="text-[10px] text-gray-600">Total</p>
                    <p className="text-sm font-bold text-orange-400">{totalPoints}pts</p>
                    <p className="text-[10px] text-gray-500">{totalKills}K</p>
                  </div>

                  <button
                    onClick={() => setExpandedTeam(isExpanded ? null : reg.team_leader_id)}
                    className="text-gray-500 hover:text-white ml-1"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded: all matches + member kills */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-800 pt-3">
                    {/* All matches summary */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {MATCHES.map(m => {
                        const md = teamData[m] || {};
                        return (
                          <div key={m} className={`rounded-lg p-2 text-center border ${currentMatch === m ? 'border-orange-500/40 bg-orange-500/5' : 'border-gray-800 bg-gray-800/50'}`}>
                            <p className="text-[10px] font-bold text-gray-500">{m}</p>
                            <p className="text-sm font-bold text-white">#{md.placement || 0}</p>
                            <p className="text-[10px] text-red-400">{md.kills || 0}K</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Per-member kills for current match */}
                    {reg.team_members && reg.team_members.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">👤 Member Kills — {currentMatch}</p>
                        <div className="space-y-1.5">
                          {reg.team_members.map((member, mi) => {
                            const mk = teamData[currentMatch]?.memberKills?.[mi];
                            return (
                              <div key={mi} className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
                                {member.isLeader && <span className="text-yellow-400 text-xs">👑</span>}
                                <span className="text-white text-xs flex-1">{member.ign}</span>
                                <span className="text-gray-500 text-xs font-mono">{member.uid}</span>
                                <Input
                                  type="number"
                                  min="0"
                                  value={mk?.kills || ""}
                                  onChange={e => updateMemberKills(reg.team_leader_id, currentMatch, mi, e.target.value)}
                                  className="bg-gray-900 border-gray-700 text-white w-16 h-7 text-center text-xs px-1"
                                  placeholder="0"
                                />
                                <span className="text-gray-600 text-xs">kills</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}