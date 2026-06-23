import React, { useState, useEffect } from "react";
import { Tournament } from "@/entities/Tournament";
import { Registration } from "@/entities/Registration";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Notification } from "@/entities/Notification";
import { PlayerMessage } from "@/entities/PlayerMessage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Swords, Users, Trophy, Target, Key, Send, Download, Eye,
  Clock, Zap, Shield, Search, Crown, Save, RefreshCw, Filter,
  ChevronDown, ChevronRight, Map, Info
} from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const GAME_TYPE_INFO = {
  "Lone Wolf": {
    icon: "🐺",
    color: "orange",
    description: "Solo survival match — Last man standing wins",
    rules: [
      "Each player plays individually — no teams",
      "Survival time + kills = score",
      "Top 3 survivors get placement bonus",
      "Kill points: 2 pts each, Survival bonus: up to 10 pts",
      "Anti-rush rules may apply (first 3 min = no-kill zone)",
    ],
    scoringNote: "Kills × 2 + Placement Bonus (1st: +10, 2nd: +7, 3rd: +5)",
    maps: ["Bermuda", "Purgatory", "Kalahari", "Alpine", "Nexterra"],
    teamSize: "Solo only",
    maxPlayers: 50,
  },
  "Clash Squad 4v4": {
    icon: "⚔️",
    color: "red",
    description: "Tactical round-based team battle — 4 players per side",
    rules: [
      "2 teams of 4 players each face off in rounds",
      "First team to win 4 rounds wins the match",
      "Economy system: earn coins, buy guns/items each round",
      "Defuse/protect the bomb or eliminate all opponents",
      "No self-revive in standard Clash Squad",
      "Best of 3 or Best of 5 formats supported",
    ],
    scoringNote: "Rounds won × 3 + Total Kills × 1",
    maps: ["Bermuda", "Purgatory", "Kalahari"],
    teamSize: "4 players per team",
    maxPlayers: 8,
  },
  "Clash Squad 6v6": {
    icon: "🔥",
    color: "red",
    description: "Extended Clash Squad — 6 players per side, higher intensity",
    rules: [
      "2 teams of 6 players each",
      "Same round-based format as 4v4 but larger teams",
      "More strategic — requires coordination",
      "Economy and weapon purchase same as standard CS",
      "Best of 5 recommended for tournament format",
    ],
    scoringNote: "Rounds won × 3 + Total Kills × 1",
    maps: ["Bermuda", "Purgatory"],
    teamSize: "6 players per team",
    maxPlayers: 12,
  },
};

export default function ClashSquadLoneWolfManager({ onUpdate }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGameType, setActiveGameType] = useState("Lone Wolf");
  const [expandedId, setExpandedId] = useState(null);
  const [roomInputs, setRoomInputs] = useState({});
  const [sending, setSending] = useState(null);
  const [showInfo, setShowInfo] = useState(null);
  const [leaderboardModal, setLeaderboardModal] = useState(null);
  const [lbData, setLbData] = useState([]);
  const [killsMap, setKillsMap] = useState({});
  const [lbSearch, setLbSearch] = useState("");
  const [winners, setWinners] = useState({ first: "", second: "", third: "" });
  const [savingLB, setSavingLB] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const all = await Tournament.list("-created_date", 100);
      const filtered = (all || []).filter(t =>
        t.game_type === "Lone Wolf" ||
        t.game_type === "Clash Squad 4v4" ||
        t.game_type === "Clash Squad 6v6"
      );
      setTournaments(filtered);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const updateStatus = async (tournament, status) => {
    await Tournament.update(tournament.id, { status });
    await loadTournaments();
    onUpdate?.();
  };

  const sendRoomCredentials = async (tournament) => {
    const input = roomInputs[tournament.id] || {};
    if (!input.room_code) return alert("Room ID is required!");
    setSending(tournament.id);
    try {
      const regs = await Registration.filter({ tournament_id: tournament.id });
      await Promise.all(regs.map(reg => Promise.all([
        PlayerMessage.create({
          tournament_id: tournament.id,
          recipient_id: reg.team_leader_id,
          recipient_ign: reg.team_leader_ign,
          message: `🔑 Room ID: ${input.room_code}${input.room_password ? `\n🔒 Password: ${input.room_password}` : ""}`,
          room_code: input.room_code,
          room_password: input.room_password || "",
          sent_at: new Date().toISOString(),
          read: false
        }),
        Notification.create({
          recipient_id: reg.team_leader_id,
          type: "Room Credentials",
          title: `🔑 ${tournament.title} — Room Ready!`,
          message: `Room ID: ${input.room_code}${input.room_password ? ` | Password: ${input.room_password}` : ""}`,
          link: createPageUrl(`TournamentDetail?id=${tournament.id}`),
          priority: "Urgent",
          dismissable: false,
          created_at: new Date().toISOString()
        })
      ])));
      await Tournament.update(tournament.id, {
        room_code: input.room_code,
        room_password: input.room_password || ""
      });
      alert(`✅ Room credentials sent to ${regs.length} players!`);
      await loadTournaments();
    } catch (e) {
      alert("Error sending credentials");
    }
    setSending(null);
  };

  const openLeaderboard = async (tournament) => {
    const regs = await Registration.filter({ tournament_id: tournament.id });
    let entries = await TournamentLeaderboard.filter({ tournament_id: tournament.id });

    for (const reg of regs) {
      if (!entries.find(e => e.user_id === reg.team_leader_id)) {
        const leader = reg.team_members?.find(m => m.isLeader) || reg.team_members?.[0];
        await TournamentLeaderboard.create({
          tournament_id: tournament.id,
          tournament_title: tournament.title,
          user_id: reg.team_leader_id,
          unique_id: `BH${reg.team_leader_id.replace(/-/g, "").slice(-8).toUpperCase()}`,
          player_ign: leader?.ign || reg.team_leader_ign,
          player_uid: leader?.uid || reg.team_leader_uid || "",
          kills: 0, wins: 0, points: 0, rank: 0,
          registration_time: reg.created_date,
          is_finalized: false
        });
      }
    }

    entries = await TournamentLeaderboard.filter({ tournament_id: tournament.id });
    const kMap = {};
    entries.forEach(e => kMap[e.id] = e.kills || 0);
    setKillsMap(kMap);
    setLbData(entries);
    setWinners({ first: "", second: "", third: "" });
    setLeaderboardModal(tournament);
  };

  const saveLeaderboard = async () => {
    if (!leaderboardModal) return;
    setSavingLB(true);
    try {
      const gt = leaderboardModal.game_type;
      const isCS = gt?.includes("Clash Squad");

      const updated = lbData.map(e => {
        const kills = killsMap[e.id] || 0;
        let placementBonus = 0;
        if (e.user_id === winners.first) placementBonus = isCS ? 15 : 10;
        else if (e.user_id === winners.second) placementBonus = isCS ? 10 : 7;
        else if (e.user_id === winners.third) placementBonus = isCS ? 5 : 5;
        const points = (kills * (isCS ? 1 : 2)) + placementBonus;
        return { ...e, kills, points, wins: (e.user_id === winners.first || e.user_id === winners.second || e.user_id === winners.third) ? 1 : 0 };
      });

      updated.sort((a, b) => b.points - a.points || b.kills - a.kills);

      for (let i = 0; i < updated.length; i++) {
        await TournamentLeaderboard.update(updated[i].id, {
          kills: updated[i].kills,
          wins: updated[i].wins,
          points: updated[i].points,
          rank: i + 1,
          is_finalized: true
        });
      }

      const regs = await Registration.filter({ tournament_id: leaderboardModal.id });
      for (const reg of regs) {
        await Notification.create({
          recipient_id: reg.team_leader_id,
          type: "Result Published",
          title: `🏆 ${leaderboardModal.title} Results Out!`,
          message: "Match results are finalized. Check your rank!",
          link: createPageUrl(`TournamentDetail?id=${leaderboardModal.id}`),
          priority: "High",
          dismissable: true,
          created_at: new Date().toISOString()
        });
      }

      alert("✅ Leaderboard saved & notifications sent!");
      setLeaderboardModal(null);
      await loadTournaments();
      onUpdate?.();
    } catch (e) {
      alert("Error saving leaderboard");
    }
    setSavingLB(false);
  };

  const activeTournaments = tournaments.filter(t => t.game_type === activeGameType);
  const filtered = activeTournaments.filter(t => statusFilter === "all" || t.status === statusFilter);

  const gameInfo = GAME_TYPE_INFO[activeGameType];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-t-orange-500 border-orange-500/20 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Swords className="w-5 h-5 text-orange-400" />
            Clash Squad & Lone Wolf Manager
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">Dedicated management for special game modes</p>
        </div>
        <Button onClick={loadTournaments} size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Game Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["Lone Wolf", "Clash Squad 4v4", "Clash Squad 6v6"].map(gt => {
          const info = GAME_TYPE_INFO[gt];
          const count = tournaments.filter(t => t.game_type === gt).length;
          return (
            <button
              key={gt}
              onClick={() => { setActiveGameType(gt); setExpandedId(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                activeGameType === gt
                  ? "bg-gradient-to-r from-orange-500/20 to-red-500/10 border-orange-500/40 text-orange-300"
                  : "border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base">{info.icon}</span>
              <span className="hidden sm:block">{gt}</span>
              <span className={`ml-0.5 text-xs rounded-full px-1.5 py-0.5 ${activeGameType === gt ? 'bg-orange-500/30 text-orange-300' : 'bg-gray-700 text-gray-400'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Game Info Card */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{gameInfo.icon}</span>
            <div>
              <h3 className="text-white font-bold">{activeGameType}</h3>
              <p className="text-gray-400 text-sm">{gameInfo.description}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" />{gameInfo.teamSize}</span>
                <span className="text-xs text-gray-500 flex items-center gap-1"><Map className="w-3 h-3" />Maps: {gameInfo.maps.join(", ")}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(showInfo === activeGameType ? null : activeGameType)}
            className="text-gray-500 hover:text-orange-400 p-1.5 rounded-lg hover:bg-gray-800"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {showInfo === activeGameType && (
          <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-3">
            <div>
              <p className="text-orange-400 text-xs font-bold uppercase tracking-wide mb-2">Rules & Format</p>
              <ul className="space-y-1">
                {gameInfo.rules.map((rule, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5">•</span> {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
              <p className="text-orange-300 text-xs font-semibold">⚡ Scoring: {gameInfo.scoringNote}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        {["all", "Registration Open", "Registration Closed", "Live", "Completed"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
              statusFilter === s
                ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                : "border-gray-700 text-gray-500 hover:bg-gray-800"
            }`}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
        <span className="text-gray-600 text-xs ml-auto">{filtered.length} tournament{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tournament List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
          <span className="text-5xl">{gameInfo.icon}</span>
          <p className="text-gray-400 mt-3 font-medium">No {activeGameType} tournaments found</p>
          <p className="text-gray-600 text-sm mt-1">Create one from the Create Tournament page</p>
          <Link to={createPageUrl("CreateTournament")}>
            <Button className="mt-4 bg-orange-500 hover:bg-orange-600" size="sm">
              + Create {activeGameType} Tournament
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(tournament => {
            const isExpanded = expandedId === tournament.id;
            const ri = roomInputs[tournament.id] || {};

            return (
              <div key={tournament.id} className="bg-gray-900/70 border border-gray-700/60 rounded-2xl overflow-hidden">
                {/* Header Row */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/30"
                  onClick={() => setExpandedId(isExpanded ? null : tournament.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">{gameInfo.icon}</span>
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{tournament.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-gray-400 text-xs">{tournament.mode}</span>
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-gray-400 text-xs">{tournament.map}</span>
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-gray-400 text-xs">{format(new Date(tournament.date_time), "dd MMM, hh:mm a")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={
                      tournament.status === "Live" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      tournament.status === "Registration Open" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                      tournament.status === "Completed" ? "bg-gray-500/20 text-gray-400 border border-gray-500/30" :
                      "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    }>
                      {tournament.status}
                    </Badge>
                    <span className="text-gray-500 text-xs">{tournament.current_teams || 0}/{tournament.max_teams}</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-700/40 pt-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-800/60 rounded-xl p-3 text-center">
                        <p className="text-orange-400 font-bold text-lg">{tournament.current_teams || 0}</p>
                        <p className="text-gray-500 text-xs">Registered</p>
                      </div>
                      <div className="bg-gray-800/60 rounded-xl p-3 text-center">
                        <p className="text-cyan-400 font-bold text-lg">₹{tournament.prize_pool?.toLocaleString() || 0}</p>
                        <p className="text-gray-500 text-xs">Prize Pool</p>
                      </div>
                      <div className="bg-gray-800/60 rounded-xl p-3 text-center">
                        <p className="text-purple-400 font-bold text-lg">{tournament.entry_fee || 0}🪙</p>
                        <p className="text-gray-500 text-xs">Entry Fee</p>
                      </div>
                    </div>

                    {/* Status Control */}
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Status Control</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {["Registration Open", "Registration Closed", "Live", "Completed"].map(s => (
                          <button
                            key={s}
                            onClick={() => updateStatus(tournament, s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              tournament.status === s
                                ? s === "Live" ? "bg-red-500/20 border-red-500/40 text-red-400"
                                  : s === "Registration Open" ? "bg-green-500/20 border-green-500/40 text-green-400"
                                  : s === "Completed" ? "bg-gray-500/20 border-gray-500/40 text-gray-400"
                                  : "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Room Credentials */}
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Room Credentials</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-gray-400 text-xs">Room ID</Label>
                          <Input
                            value={ri.room_code || ""}
                            onChange={e => setRoomInputs({...roomInputs, [tournament.id]: {...ri, room_code: e.target.value}})}
                            placeholder="Enter Room ID"
                            className="bg-gray-800 border-gray-700 text-white h-9 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-xs">Password</Label>
                          <Input
                            value={ri.room_password || ""}
                            onChange={e => setRoomInputs({...roomInputs, [tournament.id]: {...ri, room_password: e.target.value}})}
                            placeholder="Enter Password"
                            className="bg-gray-800 border-gray-700 text-white h-9 text-sm mt-1"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => sendRoomCredentials(tournament)}
                        disabled={!ri.room_code || sending === tournament.id}
                        className="mt-2 w-full bg-green-600 hover:bg-green-700 h-9 text-sm"
                      >
                        {sending === tournament.id
                          ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Sending...</>
                          : <><Send className="w-3.5 h-3.5 mr-1.5" /> Send to All Registered</>
                        }
                      </Button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap pt-1">
                      <Link to={createPageUrl(`TournamentDetail?id=${tournament.id}`)}>
                        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => openLeaderboard(tournament)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Target className="w-3.5 h-3.5 mr-1.5" /> Manage Results
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard Modal */}
      {leaderboardModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setLeaderboardModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-white font-bold">{leaderboardModal.title}</h3>
                <p className="text-gray-400 text-sm">{leaderboardModal.game_type} — Manage Results</p>
              </div>
              <button onClick={() => setLeaderboardModal(null)} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-gray-800">✕</button>
            </div>

            <div className="p-5 space-y-5">
              {/* Scoring info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <p className="text-blue-300 text-xs font-semibold">⚡ {GAME_TYPE_INFO[leaderboardModal.game_type]?.scoringNote}</p>
              </div>

              {/* Winner selection */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "first", label: "🥇 1st Place", color: "yellow" },
                  { key: "second", label: "🥈 2nd Place", color: "gray" },
                  { key: "third", label: "🥉 3rd Place", color: "orange" },
                ].map(({ key, label, color }) => (
                  <div key={key} className={`p-3 bg-${color}-500/10 border border-${color}-500/30 rounded-xl`}>
                    <Label className={`text-${color}-400 text-xs block mb-1.5`}>{label}</Label>
                    <select
                      value={winners[key]}
                      onChange={e => setWinners({...winners, [key]: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-1.5 text-white text-xs"
                    >
                      <option value="">Select...</option>
                      {lbData.map(e => (
                        <option key={e.user_id} value={e.user_id}>{e.player_ign}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={lbSearch}
                  onChange={e => setLbSearch(e.target.value)}
                  placeholder="Search player..."
                  className="bg-gray-800 border-gray-700 text-white pl-9"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-700/50">
                <table className="w-full">
                  <thead className="bg-gray-800/60">
                    <tr>
                      <th className="text-left py-2.5 px-3 text-gray-400 text-xs font-semibold">#</th>
                      <th className="text-left py-2.5 px-3 text-gray-400 text-xs font-semibold">Player</th>
                      <th className="text-center py-2.5 px-3 text-gray-400 text-xs font-semibold">Kills/Rounds</th>
                      <th className="text-center py-2.5 px-3 text-gray-400 text-xs font-semibold">Place</th>
                      <th className="text-center py-2.5 px-3 text-gray-400 text-xs font-semibold">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lbData
                      .filter(e => !lbSearch || e.player_ign?.toLowerCase().includes(lbSearch.toLowerCase()) || e.player_uid?.includes(lbSearch))
                      .map((entry, i) => {
                        const kills = killsMap[entry.id] || 0;
                        const isCS = leaderboardModal.game_type?.includes("Clash Squad");
                        const pts = (kills * (isCS ? 1 : 2)) + (entry.user_id === winners.first ? (isCS ? 15 : 10) : entry.user_id === winners.second ? (isCS ? 10 : 7) : entry.user_id === winners.third ? 5 : 0);
                        return (
                          <tr key={entry.id} className="border-t border-gray-700/40 hover:bg-gray-800/30">
                            <td className="py-2.5 px-3 text-gray-400 text-sm">{i + 1}</td>
                            <td className="py-2.5 px-3">
                              <p className="text-white text-sm font-medium">{entry.player_ign}</p>
                              <p className="text-gray-500 text-xs">{entry.player_uid || "—"}</p>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Input
                                type="number"
                                value={kills}
                                onChange={e => setKillsMap({...killsMap, [entry.id]: parseInt(e.target.value) || 0})}
                                className="w-16 bg-gray-800 border-gray-700 text-white text-center mx-auto h-8 text-sm"
                                min="0"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center text-sm">
                              {entry.user_id === winners.first ? "🥇" : entry.user_id === winners.second ? "🥈" : entry.user_id === winners.third ? "🥉" : <span className="text-gray-600">—</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center text-cyan-400 font-bold text-sm">{pts}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveLeaderboard} disabled={savingLB} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600">
                  <Save className="w-4 h-4 mr-2" />
                  {savingLB ? "Saving..." : "Save Results & Notify Players"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}