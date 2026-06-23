import React, { useState, useEffect, useRef } from "react";
import { Tournament } from "@/entities/Tournament";
import { Registration } from "@/entities/Registration";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Notification } from "@/entities/Notification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Crown, Save, RefreshCw, Download, Lock, Unlock, Users, ArrowRight, Swords, Edit2, Check, Star } from "lucide-react";
import GrandFinalMatchManager from "./GrandFinalMatchManager";
import { format } from "date-fns";
import { rankTeamsSingleMatch, rankTeamsGrandFinal } from "@/lib/leaderboardRank";

export default function TournamentLeaderboardManager({ onUpdate }) {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [killsInput, setKillsInput] = useState({});
  const [placementInput, setPlacementInput] = useState({});
  const [memberKillsInput, setMemberKillsInput] = useState({}); // { entryId: { memberIdx: kills } }
  const [killPoints, setKillPoints] = useState(1);
  const [isFinalized, setIsFinalized] = useState(false);
  const PLACEMENT_PTS = {1:12, 2:9, 3:8, 4:7, 5:6, 6:5, 7:4, 8:3, 9:2, 10:1};
  const [showGrandFinalManager, setShowGrandFinalManager] = useState(false);
  const [highlightTop, setHighlightTop] = useState(0);
  const [editingRankId, setEditingRankId] = useState(null);
  const [editingRankValue, setEditingRankValue] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [savingMessage, setSavingMessage] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedEntries, setSelectedEntries] = useState(new Set()); // for bulk move


  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const allTournaments = await Tournament.list("-created_date", 50);
      setTournaments(allTournaments || []);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const selectTournament = async (tournamentId) => {
    setLoading(true);
    const tournament = tournaments.find(t => t.id === tournamentId);
    setSelectedTournament(tournament);
    
    try {
      // Load existing leaderboard entries
      let entries = await TournamentLeaderboard.filter({ tournament_id: tournamentId });
      
      // Load all registrations for this tournament
      const registrations = await Registration.filter({ tournament_id: tournamentId });
      
      // Sync all registrations into leaderboard
      const existingUserIds = entries.map(e => e.user_id);
      const newRegistrations = registrations.filter(r => !existingUserIds.includes(r.team_leader_id));

      // Create all missing entries in parallel
      await Promise.all(newRegistrations.map(reg => {
        const leaderMember = reg.team_members?.find(m => m.isLeader) || reg.team_members?.[0];
        const gameIGN = leaderMember?.ign || reg.team_leader_ign;
        const gameUID = leaderMember?.uid || reg.team_leader_uid || "";
        const uniqueId = `BH${reg.team_leader_id.replace(/-/g, "").slice(-8).toUpperCase()}`;
        // Initialize members with kills=0
        const membersWithKills = (reg.team_members || []).map(m => ({ ...m, kills: 0 }));
        return TournamentLeaderboard.create({
          tournament_id: tournamentId,
          tournament_title: tournament.title,
          user_id: reg.team_leader_id,
          unique_id: uniqueId,
          team_name: reg.team_name || gameIGN,
          player_ign: gameIGN,
          player_uid: gameUID,
          team_members: membersWithKills,
          team_logo_url: reg.team_logo_url || "",
          kills: 0, wins: 0, points: 0, rank: 0, placement: 0,
          registration_time: reg.created_date,
          is_finalized: false
        }).catch(() => null);
      }));

      // Update changed IGN/UID/team_name + backfill team_members/logo in parallel
      let needsReload = newRegistrations.length > 0;
      await Promise.all(registrations.map(reg => {
        const existing = entries.find(e => e.user_id === reg.team_leader_id);
        if (!existing) return Promise.resolve();
        const leaderMember = reg.team_members?.find(m => m.isLeader) || reg.team_members?.[0];
        const gameIGN = leaderMember?.ign || reg.team_leader_ign;
        const gameUID = leaderMember?.uid || reg.team_leader_uid || "";
        const teamName = reg.team_name || gameIGN;
        const update = {};
        if (existing.player_ign !== gameIGN) update.player_ign = gameIGN;
        if (existing.player_uid !== gameUID) update.player_uid = gameUID;
        if (existing.team_name !== teamName) update.team_name = teamName;
        if (!existing.team_logo_url && reg.team_logo_url) update.team_logo_url = reg.team_logo_url;
        // Backfill member list (preserving any kills already entered) if missing or count mismatch
        const regMembers = reg.team_members || [];
        const existingMembers = existing.team_members || [];
        if (regMembers.length > 0 && existingMembers.length !== regMembers.length) {
          update.team_members = regMembers.map((m, idx) => ({
            ign: m.ign,
            uid: m.uid,
            isLeader: !!m.isLeader,
            kills: existingMembers[idx]?.kills || 0
          }));
        }
        if (Object.keys(update).length > 0) {
          needsReload = true;
          return TournamentLeaderboard.update(existing.id, update).catch(() => null);
        }
        return Promise.resolve();
      }));

      if (needsReload) {
        entries = await TournamentLeaderboard.filter({ tournament_id: tournamentId });
      }
      
      // Initialize kills & placement input
      const killsMap = {};
      const placeMap = {};
      const memberMap = {};
      entries.forEach(e => {
        killsMap[e.id] = e.kills || 0;
        placeMap[e.id] = e.placement || "";
        memberMap[e.id] = {};
        (e.team_members || []).forEach((m, idx) => {
          memberMap[e.id][idx] = m.kills || 0;
        });
      });
      setKillsInput(killsMap);
      setPlacementInput(placeMap);
      setMemberKillsInput(memberMap);
      setIsFinalized(entries.length > 0 && entries[0].is_finalized);
      // Load admin message from first entry
      setAdminMessage(entries[0]?.admin_message || "");
      
      // Sort with appropriate ranking function
      const isGF = tournament?.tournament_type === "Grand Final" || tournament?.stage === "grand_final";
      const rankedEntries = isGF
        ? rankTeamsGrandFinal(entries, 1, 3)
        : rankTeamsSingleMatch(entries, killPoints);
      setLeaderboardEntries(rankedEntries);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const updateKills = (entryId, kills) => {
    setKillsInput(prev => ({
      ...prev,
      [entryId]: parseInt(kills) || 0
    }));
  };

  const isGrandFinal = !!(selectedTournament?.tournament_type === "Grand Final" || selectedTournament?.stage === "grand_final");

  const generateLeaderboard = async () => {
    if (!selectedTournament || isFinalized) return;
    setSaving(true);

    try {
      if (isGrandFinal) {
        // For Grand Final: re-rank from existing match_results (set by GrandFinalMatchManager)
        // Re-fetch latest entries to get up-to-date match_results
        const latestEntries = await TournamentLeaderboard.filter({ tournament_id: selectedTournament.id }).catch(() => []);
        // Determine match count from the entries' match_results
        const maxMatches = latestEntries.reduce((max, e) => {
          const count = (e.match_results || []).length;
          return count > max ? count : max;
        }, 2);
        const ranked = rankTeamsGrandFinal(
          latestEntries.map(e => ({ ...e, manual_rank: e.manual_rank ?? null })),
          1,
          maxMatches
        );
        const updatedEntries = ranked.map((e, i) => ({ ...e, rank: i + 1 }));
        await Promise.all(updatedEntries.map((e, i) =>
          TournamentLeaderboard.update(e.id, { rank: i + 1 }).catch(() => null)
        ));
        setLeaderboardEntries(updatedEntries);
      } else {
        // Qualifier / Semifinal: single-match ranking
        const computed = leaderboardEntries.map(entry => {
          const memberKills = memberKillsInput[entry.id] || {};
          const hasMembers = entry.team_members && entry.team_members.length > 0;
          let kills;
          if (hasMembers) {
            kills = Object.values(memberKills).reduce((sum, k) => sum + (parseInt(k) || 0), 0);
          } else {
            kills = parseInt(killsInput[entry.id]) || 0;
          }
          const placement = parseInt(placementInput[entry.id]) || 0;
          const placementBonus = PLACEMENT_PTS[placement] || 0;
          const kPts = kills * killPoints;
          const points = kPts + placementBonus;
          const updatedMembers = (entry.team_members || []).map((m, idx) => ({
            ...m,
            kills: parseInt(memberKills[idx]) || 0
          }));
          return { ...entry, kills, wins: placement === 1 ? 1 : 0, points, placement, team_members: updatedMembers };
        });

        await Promise.all(computed.map(entry =>
          TournamentLeaderboard.update(entry.id, {
            kills: entry.kills,
            wins: entry.wins,
            points: entry.points,
            placement: entry.placement,
            team_members: entry.team_members,
            rank: 0
          }).catch(() => null)
        ));

        const ranked = rankTeamsSingleMatch(
          computed.map(e => ({ ...e, manual_rank: e.manual_rank ?? null })),
          killPoints
        );
        const updatedEntries = ranked.map((e, i) => ({ ...e, rank: i + 1 }));
        await Promise.all(updatedEntries.map((e, i) =>
          TournamentLeaderboard.update(e.id, { rank: i + 1 }).catch(() => null)
        ));
        setLeaderboardEntries(updatedEntries);
      }

      setToast("✅ Leaderboard ranked & saved! Check TIE badges, then Finalize.");
      setTimeout(() => setToast(""), 4000);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to generate leaderboard");
    }
    setSaving(false);
  };

  const saveAdminMessage = async () => {
    if (!selectedTournament || leaderboardEntries.length === 0) return;
    setSavingMessage(true);
    await Promise.all(leaderboardEntries.map(e =>
      TournamentLeaderboard.update(e.id, { admin_message: adminMessage }).catch(() => null)
    ));
    setSavingMessage(false);
    setToast("✅ Message saved!");
    setTimeout(() => setToast(""), 3000);
  };

  const finalizeLeaderboard = async () => {
    if (!selectedTournament || !confirm("Finalize this leaderboard? This will lock it from further edits.")) return;
    
    setSaving(true);
    try {
      // Save admin message on all entries during finalize too
      await Promise.all(leaderboardEntries.map(entry =>
        TournamentLeaderboard.update(entry.id, { is_finalized: true, admin_message: adminMessage }).catch(() => null)
      ));
      
      // Send notification to all players
      await Notification.create({
        recipient_id: "all",
        type: "Result Published",
        title: "🏆 Leaderboard Updated!",
        message: `${selectedTournament.title} leaderboard has been finalized. Check your rank now!`,
        link: `/leaderboard?tournament=${selectedTournament.id}`,
        priority: "High",
        dismissable: true,
        created_at: new Date().toISOString()
      });
      
      setIsFinalized(true);
      setToast("✅ Leaderboard finalized & notifications sent!");
      setTimeout(() => setToast(""), 4000);
    } catch (error) {
      console.error("Error:", error);
    }
    setSaving(false);
  };

  const unlockLeaderboard = async () => {
    if (!selectedTournament || !confirm("Unlock this leaderboard for editing?")) return;
    
    setSaving(true);
    try {
      await Promise.all(leaderboardEntries.map(entry =>
        TournamentLeaderboard.update(entry.id, { is_finalized: false }).catch(() => null)
      ));
      setIsFinalized(false);
      setToast("🔓 Leaderboard unlocked for editing!");
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      console.error("Error:", error);
    }
    setSaving(false);
  };

  const saveManualRank = async (entryId, rankValue) => {
    const val = parseInt(rankValue);
    if (isNaN(val) || val < 1) { setEditingRankId(null); return; }
    setSaving(true);
    try {
      await TournamentLeaderboard.update(entryId, { manual_rank: val });
      // Re-rank all entries with new manual rank applied
      const updated = leaderboardEntries.map(e => e.id === entryId ? { ...e, manual_rank: val } : e);
      const ranked = isGrandFinal
        ? rankTeamsGrandFinal(updated, 1, Math.max(updated.reduce((m, e) => Math.max(m, (e.match_results || []).length), 2), 2))
        : rankTeamsSingleMatch(updated, killPoints);
      const withRanks = ranked.map((e, i) => ({ ...e, rank: i + 1 }));
      await Promise.all(withRanks.map((e, i) =>
        TournamentLeaderboard.update(e.id, { rank: i + 1 }).catch(() => null)
      ));
      setLeaderboardEntries(withRanks);
      setToast("✅ Manual rank saved & leaderboard re-sorted!");
      setTimeout(() => setToast(""), 3000);
    } catch {}
    setEditingRankId(null);
    setEditingRankValue("");
    setSaving(false);
  };

  const moveTeamToStage = async (entry, stage) => {
    await moveTeamsToStage([entry], stage);
  };

  const moveTeamsToStage = async (entries, stage) => {
    const allTournaments = await Tournament.list("-created_date", 100).catch(() => []);
    const targetType = stage === "semifinal" ? "Semifinal" : "Grand Final";
    const candidates = allTournaments.filter(t =>
      t.tournament_type === targetType &&
      t.id !== selectedTournament.id &&
      t.status !== "Completed" &&
      t.status !== "Cancelled"
    );

    let targetTournament;
    if (candidates.length === 0) {
      alert(`❌ Koi bhi ${targetType} tournament nahi mila!`);
      return;
    } else if (candidates.length === 1) {
      targetTournament = candidates[0];
      if (!confirm(`${entries.length} team(s) ko "${targetTournament.title}" mein move karo?`)) return;
    } else {
      const options = candidates.map((t, i) => `${i + 1}. ${t.title}`).join("\n");
      const choice = prompt(`Konse tournament mein move karna hai?\n\n${options}`);
      const idx = parseInt(choice) - 1;
      if (isNaN(idx) || idx < 0 || idx >= candidates.length) return;
      targetTournament = candidates[idx];
    }

    setSaving(true);
    const allRegs = await Registration.filter({ tournament_id: selectedTournament.id }).catch(() => []);
    const existingTargetRegs = await Registration.filter({ tournament_id: targetTournament.id }).catch(() => []);

    let moved = 0;
    for (const entry of entries) {
      const sourceReg = allRegs.find(r => r.team_leader_id === entry.user_id);
      const alreadyMoved = existingTargetRegs.find(r => r.team_leader_id === entry.user_id);
      if (alreadyMoved) continue;

      if (sourceReg) {
        await Registration.update(sourceReg.id, { is_qualified: true, qualified_from_tournament_id: selectedTournament.id, status: "Qualified" }).catch(() => null);
      }
      const lbEntries = await TournamentLeaderboard.filter({ tournament_id: selectedTournament.id, user_id: entry.user_id }).catch(() => []);
      if (lbEntries.length > 0) {
        await TournamentLeaderboard.update(lbEntries[0].id, { is_qualified: true, moved_to: `${targetType}: ${targetTournament.title}` }).catch(() => null);
      }
      await Registration.create({
        tournament_id: targetTournament.id,
        tournament_title: targetTournament.title,
        team_name: sourceReg?.team_name || entry.player_ign,
        team_leader_id: entry.user_id,
        team_leader_ign: entry.player_ign,
        team_leader_uid: entry.player_uid || sourceReg?.team_leader_uid || "",
        team_leader_phone: sourceReg?.team_leader_phone || "",
        team_members: sourceReg?.team_members || [{ ign: entry.player_ign, uid: entry.player_uid || "", isLeader: true }],
        team_logo_url: entry.team_logo_url || sourceReg?.team_logo_url || "",
        is_qualified: true,
        qualified_from_tournament_id: selectedTournament.id,
        total_points: 0, total_kills: 0,
        status: "Qualified", payment_status: "Paid"
      });
      moved++;
    }

    await Tournament.update(targetTournament.id, { current_teams: (targetTournament.current_teams || 0) + moved }).catch(() => null);
    setSelectedEntries(new Set());
    setToast(`✅ ${moved} team(s) "${targetTournament.title}" mein move ho gaye!`);
    setTimeout(() => setToast(""), 4000);
    await selectTournament(selectedTournament.id);
    setSaving(false);
  };

  const downloadPDF = () => {
    if (!selectedTournament || leaderboardEntries.length === 0) return;
    
    let content = `═══════════════════════════════════════════════\n`;
    content += `       🏆 BATTLE HUB TOURNAMENT 🏆\n`;
    content += `       LEADERBOARD RESULTS\n`;
    content += `═══════════════════════════════════════════════\n\n`;
    content += `TOURNAMENT: ${selectedTournament.title}\n`;
    content += `Mode: ${selectedTournament.mode} | Date: ${format(new Date(selectedTournament.date_time), "PPP")}\n`;
    content += `Total Players: ${leaderboardEntries.length}\n`;
    content += `Points System: ${killPoints} pts/kill + Placement Bonus (#1=12, #2=9, #3=8...)\n`;
    content += `\n═══════════════════════════════════════════════\n\n`;
    
    content += `Rank | Player Name | UID | Kills | Place | Points\n`;
    content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    leaderboardEntries.forEach((entry) => {
      content += `#${entry.rank} | ${entry.player_ign} | ${entry.unique_id} | ${entry.kills} | ${entry.wins ? '🏆' : '-'} | ${entry.points}\n`;
    });
    
    content += `\n═══════════════════════════════════════════════\n`;
    content += `     Thank you for participating!\n`;
    content += `          BATTLE HUB 🏆\n`;
    content += `═══════════════════════════════════════════════\n`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTournament.title}_Leaderboard.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading && !selectedTournament) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Tournament Leaderboard Manager</h2>
        </div>
      </div>

      {/* Tournament Selection */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-gray-300 mb-2 block">Select Tournament</Label>
              <Select value={selectedTournament?.id || ""} onValueChange={selectTournament}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Choose tournament..." />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title} - {format(new Date(t.date_time), "dd MMM, hh:mm a")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {!( selectedTournament?.tournament_type === "Grand Final" || selectedTournament?.stage === "grand_final") && (
              <div className="w-24">
                <Label className="text-gray-300 mb-2 block">Kill Pts</Label>
                <Input
                  type="number"
                  value={killPoints}
                  onChange={(e) => setKillPoints(parseInt(e.target.value) || 0)}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTournament && (
        <>
          {/* Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={isFinalized ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
              {isFinalized ? "🔒 Finalized" : "🔓 Editable"}
            </Badge>
            <span className="text-gray-400">
              {leaderboardEntries.length} Players
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Star className="w-4 h-4 text-yellow-400" />
              <Label className="text-gray-400 text-xs">Highlight Top:</Label>
              <Input
                type="number"
                min="0"
                max={leaderboardEntries.length}
                value={highlightTop}
                onChange={e => setHighlightTop(parseInt(e.target.value) || 0)}
                className="w-16 bg-gray-900 border-gray-700 text-white text-center h-7 text-xs"
                placeholder="0"
              />
              <span className="text-gray-500 text-xs">teams</span>
            </div>
            {(selectedTournament.stage === "grand_final" || selectedTournament.tournament_type === "Grand Final") && (
              <Button size="sm" onClick={() => setShowGrandFinalManager(!showGrandFinalManager)} className="bg-gradient-to-r from-red-600 to-orange-600 text-xs">
                <Swords className="w-3 h-3 mr-1" />
                {showGrandFinalManager ? "Hide" : "Grand Final M1–M5"}
              </Button>
            )}
          </div>

          {/* Grand Final Match Manager */}
          {showGrandFinalManager && (selectedTournament.stage === "grand_final" || selectedTournament.tournament_type === "Grand Final") && (
            <GrandFinalMatchManager tournament={selectedTournament} />
          )}

          {/* Point System Info */}
          <Card className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap text-sm">
                {isGrandFinal ? (
                  <>
                    <Badge className="bg-red-500/20 text-red-400">⚡ 1 Kill = 1 Point (Grand Final)</Badge>
                    <Badge className="bg-yellow-500/20 text-yellow-400">Multi-match: Total Pts → Booyah → Kills → Last Match</Badge>
                  </>
                ) : (
                  <>
                    <Badge className="bg-cyan-500/20 text-cyan-400">⚡ 1 Kill = {killPoints} Point{killPoints !== 1 ? "s" : ""}</Badge>
                    <Badge className="bg-purple-500/20 text-purple-400">🎯 #1 = +12, #2 = +9, #3 = +8</Badge>
                    <Badge className="bg-gray-500/20 text-gray-400">#4–#10 = +7 to +1</Badge>
                    <span className="text-gray-500 text-xs ml-auto">Rank: Pts → Place → Kills → Admin</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Table */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players ({leaderboardEntries.length})
                {selectedEntries.size > 0 && (
                  <span className="text-yellow-400 text-sm font-normal">({selectedEntries.size} selected)</span>
                )}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                {selectedEntries.size > 0 && selectedTournament?.tournament_type !== "Grand Final" && (
                  <>
                    {selectedTournament?.tournament_type === "Qualifier" && (
                      <Button size="sm" onClick={() => moveTeamsToStage(leaderboardEntries.filter(e => selectedEntries.has(e.id)), "semifinal")} className="bg-purple-600 hover:bg-purple-700 text-xs">
                        → SF ({selectedEntries.size})
                      </Button>
                    )}
                    <Button size="sm" onClick={() => moveTeamsToStage(leaderboardEntries.filter(e => selectedEntries.has(e.id)), "grand_final")} className="bg-red-600 hover:bg-red-700 text-xs">
                      → GF ({selectedEntries.size})
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedEntries(new Set())} className="border-gray-600 text-gray-400 text-xs">
                      Clear
                    </Button>
                  </>
                )}
                <Button onClick={downloadPDF} variant="outline" size="sm" className="border-blue-500/50 text-blue-400">
                  <Download className="w-4 h-4 mr-1" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
                </div>
              ) : leaderboardEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No players registered for this tournament
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="py-3 px-2 text-gray-400 text-sm w-8">
                          <input type="checkbox" className="accent-yellow-500 cursor-pointer"
                            checked={selectedEntries.size === leaderboardEntries.length && leaderboardEntries.length > 0}
                            onChange={e => setSelectedEntries(e.target.checked ? new Set(leaderboardEntries.map(e => e.id)) : new Set())}
                          />
                        </th>
                        <th className="text-left py-3 px-2 text-gray-400 text-sm">Rank</th>
                        <th className="text-left py-3 px-2 text-gray-400 text-sm">Player</th>
                        <th className="text-left py-3 px-2 text-gray-400 text-sm">UID</th>
                        {!isGrandFinal && <th className="text-center py-3 px-2 text-gray-400 text-sm">Kills</th>}
                        {!isGrandFinal && <th className="text-center py-3 px-2 text-gray-400 text-sm">Place</th>}
                        {isGrandFinal && <th className="text-center py-3 px-2 text-gray-400 text-sm">Booyah</th>}
                        {isGrandFinal && <th className="text-center py-3 px-2 text-gray-400 text-sm">Kills</th>}
                        <th className="text-center py-3 px-2 text-gray-400 text-sm">Points</th>
                        <th className="text-center py-3 px-2 text-gray-400 text-sm">Manual#</th>
                        <th className="text-center py-3 px-2 text-gray-400 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardEntries.map((entry, index) => {
                        const rankNum = entry.rank || index + 1;
                        const isHighlighted = highlightTop > 0 && rankNum <= highlightTop;
                        const isTied = entry._isTie;
                        return (
                        <tr key={entry.id} className={`border-b border-gray-700/50 ${selectedEntries.has(entry.id) ? 'bg-blue-500/10 ' : ''}${
                          isHighlighted
                            ? 'bg-yellow-500/20 border-l-4 border-l-yellow-400'
                            : rankNum === 1 ? 'bg-yellow-500/10'
                            : rankNum === 2 ? 'bg-gray-400/10'
                            : rankNum === 3 ? 'bg-orange-500/10'
                            : ''
                        }`}>
                          <td className="py-3 px-2 text-center">
                            <input type="checkbox" className="accent-yellow-500 cursor-pointer"
                              checked={selectedEntries.has(entry.id)}
                              onChange={e => {
                                const next = new Set(selectedEntries);
                                e.target.checked ? next.add(entry.id) : next.delete(entry.id);
                                setSelectedEntries(next);
                              }}
                            />
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-col gap-0.5">
                              <span className={`font-bold ${
                                rankNum === 1 ? 'text-yellow-400' :
                                rankNum === 2 ? 'text-gray-300' :
                                rankNum === 3 ? 'text-orange-400' : 'text-white'
                              }`}>
                                #{rankNum}
                              </span>
                              {isTied && <span className="text-[9px] text-orange-400 font-bold">TIE ⚠️</span>}
                              {isHighlighted && <span className="text-[9px] text-yellow-400">⭐ Advance</span>}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <div className="flex items-center gap-2">
                                {/* Team logo */}
                                {entry.team_logo_url && (
                                  <img src={entry.team_logo_url} alt="" className="w-7 h-7 rounded object-cover border border-gray-600 flex-shrink-0" onError={e => e.target.style.display='none'} />
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-white font-semibold">{entry.team_name || entry.player_ign}</p>
                                    {entry.is_qualified && <span className="text-green-400 text-xs" title="Qualified">✅</span>}
                                  </div>
                                  {entry.moved_to && (
                                    <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">
                                      📤 {entry.moved_to}
                                    </span>
                                  )}
                                  <p className="text-xs text-cyan-400 font-mono">{entry.player_ign}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-gray-400 text-sm font-mono">
                            {entry.player_uid || '-'}
                          </td>
                          {/* Kills / Placement — hidden for Grand Final (managed by GrandFinalMatchManager) */}
                          {isGrandFinal ? (
                            <>
                              <td className="py-3 px-2 text-center">
                                <span className="text-yellow-300 font-bold">{entry._stats?.booyah ?? entry.wins ?? 0}</span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="text-red-400 font-bold">{entry.kills || 0}</span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 px-2">
                                {isFinalized ? (
                                  <div className="text-center">
                                    <span className="text-red-400 font-bold">{entry.kills}</span>
                                    {entry.team_members?.length > 0 && (
                                      <div className="mt-1 space-y-0.5">
                                        {entry.team_members.map((m, mi) => (
                                          <div key={mi} className="text-[10px] text-gray-400 flex justify-between gap-2">
                                            <span className="truncate max-w-[60px]">{m.ign}</span>
                                            <span className="text-red-300">{m.kills || 0}K</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : entry.team_members?.length > 0 ? (
                                  <div className="space-y-1 min-w-[120px]">
                                    {entry.team_members.map((m, mi) => (
                                      <div key={mi} className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-400 truncate max-w-[55px]">{m.ign}</span>
                                        <Input
                                          type="number"
                                          value={(memberKillsInput[entry.id] || {})[mi] || 0}
                                          onChange={(e) => setMemberKillsInput(prev => ({
                                            ...prev,
                                            [entry.id]: { ...(prev[entry.id] || {}), [mi]: parseInt(e.target.value) || 0 }
                                          }))}
                                          className="w-12 bg-gray-900 border-gray-700 text-white text-center text-xs h-6 px-1"
                                          min="0"
                                        />
                                      </div>
                                    ))}
                                    <div className="text-xs text-cyan-400 font-bold">
                                      Total: {Object.values(memberKillsInput[entry.id] || {}).reduce((s, k) => s + (parseInt(k) || 0), 0)}
                                    </div>
                                  </div>
                                ) : (
                                  <Input
                                    type="number"
                                    value={killsInput[entry.id] || 0}
                                    onChange={(e) => updateKills(entry.id, e.target.value)}
                                    className="w-16 bg-gray-900 border-gray-700 text-white text-center mx-auto"
                                    min="0"
                                  />
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {isFinalized ? (
                                  <span className="text-yellow-400 font-bold">#{entry.placement || entry.rank || '-'}</span>
                                ) : (
                                  <select
                                    value={placementInput[entry.id] || ""}
                                    onChange={(e) => setPlacementInput({...placementInput, [entry.id]: e.target.value})}
                                    className="w-16 bg-gray-900 border border-gray-700 rounded text-white text-center mx-auto py-1.5 text-xs"
                                  >
                                    <option value="">-</option>
                                    {[...Array(12)].map((_, i) => (
                                      <option key={i+1} value={i+1}>#{i+1}{PLACEMENT_PTS[i+1] ? ` (+${PLACEMENT_PTS[i+1]})` : ''}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                            </>
                          )}
                          <td className="py-3 px-2 text-center">
                            <span className="text-cyan-400 font-bold">
                              {isGrandFinal
                                ? (entry.points || 0)
                                : (() => {
                                    const hasMembers = (memberKillsInput[entry.id] && Object.keys(memberKillsInput[entry.id]).length > 0);
                                    const kills = hasMembers
                                      ? Object.values(memberKillsInput[entry.id] || {}).reduce((s, k) => s + (parseInt(k) || 0), 0)
                                      : (parseInt(killsInput[entry.id]) || 0);
                                    return kills * killPoints + (PLACEMENT_PTS[parseInt(placementInput[entry.id])] || 0);
                                  })()
                              }
                            </span>
                          </td>
                          {/* Manual Rank override */}
                          <td className="py-3 px-2 text-center">
                            {editingRankId === entry.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  type="number"
                                  value={editingRankValue}
                                  onChange={e => setEditingRankValue(e.target.value)}
                                  className="w-12 bg-gray-900 border border-blue-500/50 rounded text-white text-center text-xs h-6 px-1"
                                  onKeyDown={e => { if (e.key === 'Enter') saveManualRank(entry.id, editingRankValue); if (e.key === 'Escape') setEditingRankId(null); }}
                                />
                                <button onClick={() => saveManualRank(entry.id, editingRankValue)} className="text-green-400 hover:text-green-300">
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 justify-center">
                                <span className="text-gray-400 text-xs">{entry.manual_rank != null ? `#${entry.manual_rank}` : '-'}</span>
                                <button onClick={() => { setEditingRankId(entry.id); setEditingRankValue(entry.manual_rank || ""); }} className="text-blue-400 hover:text-blue-300">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <MoveButtons entry={entry} tournamentType={selectedTournament.tournament_type} onMove={moveTeamToStage} />
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Toast notification */}
          {toast && (
            <div className="bg-green-500/20 border border-green-500/40 rounded-lg px-4 py-3 text-green-400 text-sm font-semibold">
              {toast}
            </div>
          )}

          {/* Admin Message for Leaderboard */}
          <Card className="bg-gray-800 border-blue-500/30">
            <CardContent className="p-4">
              <Label className="text-blue-300 text-sm font-semibold mb-2 block">📢 Leaderboard Message (shown to all players at top of leaderboard)</Label>
              <div className="flex gap-2">
                <input
                  value={adminMessage}
                  onChange={e => setAdminMessage(e.target.value)}
                  placeholder="e.g. Top 6 teams will move to Semifinals! Grand Finals on Sunday 8 PM."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500/50 outline-none"
                  disabled={isFinalized}
                />
                <Button onClick={saveAdminMessage} disabled={savingMessage || isFinalized} size="sm" className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                  {savingMessage ? "Saving..." : "Save Msg"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            {!isFinalized ? (
              <>
                <Button
                  onClick={generateLeaderboard}
                  disabled={saving}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Generate & Save Leaderboard"}
                </Button>
                <Button
                  onClick={finalizeLeaderboard}
                  disabled={saving}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:opacity-90"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Finalize & Notify
                </Button>
              </>
            ) : (
              <Button
                onClick={unlockLeaderboard}
                disabled={saving}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <Unlock className="w-4 h-4 mr-2" />
                Unlock for Editing
              </Button>
            )}
            <Button
              onClick={() => selectTournament(selectedTournament.id)}
              variant="outline"
              className="border-gray-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function MoveButtons({ entry, tournamentType, onMove }) {
  if (tournamentType === "Grand Final") return <span className="text-gray-600 text-xs">—</span>;

  return (
    <div className="flex flex-col gap-1 items-center">
      {tournamentType === "Qualifier" && (
        <Button size="sm" onClick={() => onMove(entry, "semifinal")} className="bg-purple-600 hover:bg-purple-700 text-xs h-7 px-2">
          → SF
        </Button>
      )}
      {(tournamentType === "Qualifier" || tournamentType === "Semifinal") && (
        <Button size="sm" onClick={() => onMove(entry, "grand_final")} className="bg-red-600 hover:bg-red-700 text-xs h-7 px-2">
          → GF
        </Button>
      )}
    </div>
  );
}