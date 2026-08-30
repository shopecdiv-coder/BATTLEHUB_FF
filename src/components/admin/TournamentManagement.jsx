import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tournament } from "@/entities/Tournament";
import TournamentEditor from "./TournamentEditor";
import { Registration } from "@/entities/Registration";
import { PlayerMessage } from "@/entities/PlayerMessage";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { LeaderboardEntry } from "@/entities/LeaderboardEntry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Eye, Send, Key, Download, Trash2, Gift, Target, Crown, Save, Edit, Search, CheckCircle, FileText, Users, Loader2 } from "lucide-react";
import TournamentWinnerReward from "./TournamentWinnerReward";
import { Notification } from "@/entities/Notification";
import { format } from "date-fns";
import { toast } from "sonner";
import { generateTournamentPDF } from "../tournament/TournamentPDFReport";
import SendIdPassDrawer from "./SendIdPassDrawer";
import ManageKillsStagesDrawer from "./ManageKillsStagesDrawer";
import StageMovementDrawer from "./StageMovementDrawer";


// Safe date formatter — returns fallback string if date is invalid/null
const safeFmt = (dateVal, fmt, fallback = "—") => {
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, fmt);
  } catch (e) {
    return fallback;
  }
};

export default function TournamentManagement({ tournaments, onUpdate }) {
  const [sendingIdPassDrawer, setSendingIdPassDrawer] = useState(null);
  const [manageKillsDrawerTournament, setManageKillsDrawerTournament] = useState(null);
  const [stageMovementTournament, setStageMovementTournament] = useState(null);
  const [manageKillsDrawerTab, setManageKillsDrawerTab] = useState("standings");
  const [showRewardModal, setShowRewardModal] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState("leaderboard");
  const [targetTournamentId, setTargetTournamentId] = useState("");
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [killsInput, setKillsInput] = useState({});
  const [firstPlaceId, setFirstPlaceId] = useState("");
  const [secondPlaceId, setSecondPlaceId] = useState("");
  const [thirdPlaceId, setThirdPlaceId] = useState("");
  const [savingLB, setSavingLB] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteCode, setDeleteCode] = useState("");
  const [lbSearch, setLbSearch] = useState("");
  const [tournamentSearch, setTournamentSearch] = useState("");
  const [finalizedTournaments, setFinalizedTournaments] = useState(new Set());
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Load which completed tournaments have a finalized leaderboard
    const checkFinalized = async () => {
      const completedIds = tournaments.filter(t => t.status === "Completed").map(t => t.id);
      if (!completedIds.length) return;
      const finalized = new Set();
      for (const id of completedIds) {
        const entries = await TournamentLeaderboard.filter({ tournament_id: id, is_finalized: true }).catch(() => []);
        if (entries.length > 0) finalized.add(id);
      }
      setFinalizedTournaments(finalized);
    };
    checkFinalized();
  }, [tournaments]);
  const DELETE_CODE = "845436";


  const openLeaderboard = async (tournament) => {
    setShowLeaderboard(tournament);
    setActiveModalTab("leaderboard");
    setTargetTournamentId("");
    setLeaderboardData([]);
    setKillsInput({});

    // Load registrations and existing leaderboard in parallel
    const [registrations, existingEntries] = await Promise.all([
      Registration.filter({ tournament_id: tournament.id }).catch(() => []),
      TournamentLeaderboard.filter({ tournament_id: tournament.id }).catch(() => [])
    ]);

    if (registrations.length === 0) {
      alert("No registrations found for this tournament.");
      setShowLeaderboard(null);
      return;
    }

    const existingUserIds = existingEntries.map(e => e.user_id);

    // Create missing entries in parallel
    const createPromises = registrations
      .filter(reg => !existingUserIds.includes(reg.team_leader_id))
      .map(reg => {
        const leaderMember = reg.team_members?.find(m => m.isLeader) || reg.team_members?.[0];
        const gameIGN = leaderMember?.ign || reg.team_leader_ign || "Unknown";
        const gameUID = leaderMember?.uid || reg.team_leader_uid || "";
        const uniqueId = `BH${reg.team_leader_id.replace(/-/g, "").slice(-8).toUpperCase()}`;
        return TournamentLeaderboard.create({
          tournament_id: tournament.id,
          tournament_title: tournament.title,
          user_id: reg.team_leader_id,
          unique_id: uniqueId,
          player_ign: gameIGN,
          player_uid: gameUID,
          kills: 0, wins: 0, points: 0, rank: 0,
          registration_time: reg.created_date,
          is_finalized: false
        }).catch(() => null);
      });

    // Update existing entries with correct IGN in parallel
    const updatePromises = existingEntries.map(existing => {
      const reg = registrations.find(r => r.team_leader_id === existing.user_id);
      if (!reg) return Promise.resolve();
      const leaderMember = reg.team_members?.find(m => m.isLeader) || reg.team_members?.[0];
      const gameIGN = leaderMember?.ign || reg.team_leader_ign || existing.player_ign;
      const gameUID = leaderMember?.uid || reg.team_leader_uid || existing.player_uid || "";
      if (existing.player_ign !== gameIGN || existing.player_uid !== gameUID) {
        return TournamentLeaderboard.update(existing.id, { player_ign: gameIGN, player_uid: gameUID }).catch(() => null);
      }
      return Promise.resolve();
    });

    await Promise.all([...createPromises, ...updatePromises]);

    // Reload fresh entries
    const finalEntries = await TournamentLeaderboard.filter({ tournament_id: tournament.id }).catch(() => []);

    const killsMap = {};
    finalEntries.forEach(e => { killsMap[e.id] = e.kills || 0; });
    setKillsInput(killsMap);
    setLeaderboardData(finalEntries);
  };

  const saveLeaderboard = async () => {
    if (!showLeaderboard) return;
    setSavingLB(true);
    
    try {
      // Step 1: Compute all entries locally
      const computed = leaderboardData.map(entry => {
        const kills = killsInput[entry.id] || 0;
        const isFirst = entry.user_id === firstPlaceId;
        const isSecond = entry.user_id === secondPlaceId;
        const isThird = entry.user_id === thirdPlaceId;
        const wins = (isFirst || isSecond || isThird) ? 1 : 0;
        const placementBonus = isFirst ? 15 : isSecond ? 10 : isThird ? 5 : 0;
        const points = (kills * 2) + placementBonus;
        return { ...entry, kills, wins, points };
      });

      // Step 2: Sort and assign ranks
      computed.sort((a, b) => b.points !== a.points ? b.points - a.points : b.kills - a.kills);
      const updatedEntries = computed.map((e, i) => ({ ...e, rank: i + 1 }));

      // Step 3: Save all in parallel
      await Promise.all(updatedEntries.map(entry =>
        TournamentLeaderboard.update(entry.id, {
          kills: entry.kills, wins: entry.wins, points: entry.points,
          rank: entry.rank, is_finalized: true
        }).catch(() => null)
      ));

      // Step 4: Send notifications in parallel
      const registrations = await Registration.filter({ tournament_id: showLeaderboard.id });
      await Promise.all(registrations.map(reg =>
        Notification.create({
          recipient_id: reg.team_leader_id,
          type: "Match Completed",
          title: `🏆 ${showLeaderboard.title} - Results Out!`,
          message: `Match leaderboard finalized! Check your rank and performance in Tournament Details.`,
          link: createPageUrl(`TournamentDetail?id=${showLeaderboard.id}`),
          priority: "High",
          dismissable: true,
          created_at: new Date().toISOString()
        }).catch(() => null)
      ));
      
      alert("✅ Leaderboard saved! Notifications sent to all registered players!");
      setFinalizedTournaments(s => new Set([...s, showLeaderboard.id]));
      // Auto-download kills report with the updated entry data
      const updatedKillsMap = {};
      updatedEntries.forEach(e => { updatedKillsMap[e.id] = e.kills; });
      await downloadKillsReport(showLeaderboard, updatedEntries, updatedKillsMap, firstPlaceId, secondPlaceId, thirdPlaceId);
      setShowLeaderboard(null);
      onUpdate();
    } catch (e) {
      console.error("Error:", e);
      alert("Failed to save");
    }
      setSavingLB(false);
  };

  const promoteTeam = async (leaderId, targetTournId, teamIgn, currentTournamentId) => {
    if (!targetTournId) {
      toast.error("Please select a target tournament first.");
      return;
    }
    const targetTournament = tournaments.find(t => t.id === targetTournId);
    if (!targetTournament) return;

    if (!confirm(`Promote "${teamIgn}" to "${targetTournament.title}"?`)) return;

    try {
      // Check duplicate
      const existingRegs = await Registration.filter({ tournament_id: targetTournament.id }).catch(() => []);
      if (existingRegs.find(r => r.team_leader_id === leaderId)) {
        toast.error(`"${teamIgn}" is already in "${targetTournament.title}"!`);
        return;
      }

      // Get source registration
      const allSourceRegs = await Registration.filter({ tournament_id: currentTournamentId }).catch(() => []);
      const sourceReg = allSourceRegs.find(r => r.team_leader_id === leaderId);

      if (sourceReg) {
        await Registration.update(sourceReg.id, { is_qualified: true, qualified_from_tournament_id: currentTournamentId, status: "Qualified" }).catch(() => null);
      }

      await Registration.create({
        tournament_id: targetTournament.id,
        tournament_title: targetTournament.title,
        team_name: sourceReg?.team_name || teamIgn,
        team_leader_id: leaderId,
        team_leader_ign: sourceReg?.team_leader_ign || teamIgn,
        team_leader_uid: sourceReg?.team_leader_uid || "",
        team_leader_phone: sourceReg?.team_leader_phone || "",
        team_members: sourceReg?.team_members || [{ ign: teamIgn, uid: "", isLeader: true }],
        is_qualified: true,
        qualified_from_tournament_id: currentTournamentId,
        total_points: 0,
        total_kills: 0,
        status: "Qualified",
        payment_status: "Paid"
      });

      await Tournament.update(targetTournament.id, { current_teams: (targetTournament.current_teams || 0) + 1 }).catch(() => null);
      toast.success(`✅ "${teamIgn}" promoted successfully to ${targetTournament.title}!`);
    } catch (error) {
      console.error("Promote error:", error);
      toast.error(`❌ Promotion failed: ${error.message || "Unknown error"}`);
    }
  };

  const downloadKillsReport = async (tournament, entries, killsMap, fp, sp, tp) => {
    const IST = (d) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    const regs = await Registration.filter({ tournament_id: tournament.id });

    // Sort entries by points desc
    const sorted = [...entries].map(e => {
      const kills = killsMap[e.id] || 0;
      const pts = (kills * 2) + (fp === e.user_id ? 15 : sp === e.user_id ? 10 : tp === e.user_id ? 5 : 0);
      const reg = regs.find(r => r.team_leader_id === e.user_id);
      return { ...e, kills, pts, reg };
    }).sort((a, b) => b.pts - a.pts || b.kills - a.kills);

    let txt = `╔══════════════════════════════════════════════════╗\n`;
    txt += `║         🏆 BATTLEHUB FF — TOURNAMENT REPORT 🏆        ║\n`;
    txt += `╚══════════════════════════════════════════════════╝\n\n`;
    txt += `Tournament : ${tournament.title}\n`;
    txt += `Mode       : ${tournament.mode}   Map: ${tournament.map || "Bermuda"}\n`;
    txt += `Date/Time  : ${IST(tournament.date_time)}\n`;
    txt += `Prize Pool : ₹${tournament.prize_pool?.toLocaleString() || 0}\n`;
    txt += `Total Teams: ${regs.length} / ${tournament.max_teams}\n`;
    txt += `Generated  : ${IST(new Date())}\n\n`;
    txt += `══════════════════════════════════════════════════════\n`;
    txt += `                  📊 KILLS & WINS RESULTS\n`;
    txt += `══════════════════════════════════════════════════════\n\n`;
    txt += `${"Rank".padEnd(5)} ${"Player IGN".padEnd(20)} ${"BH Unique ID".padEnd(14)} ${"Game UID".padEnd(14)} ${"Kills".padEnd(7)} ${"Win".padEnd(6)} ${"Points"}\n`;
    txt += `─────────────────────────────────────────────────────────────────────\n`;
    sorted.forEach((e, i) => {
      const winBadge = fp === e.user_id ? "🥇" : sp === e.user_id ? "🥈" : tp === e.user_id ? "🥉" : " - ";
      txt += `${String(i+1).padEnd(5)} ${(e.player_ign || "-").padEnd(20)} ${(e.unique_id || "-").padEnd(14)} ${(e.player_uid || "-").padEnd(14)} ${String(e.kills).padEnd(7)} ${winBadge.padEnd(6)} ${e.pts}\n`;
    });

    txt += `\n══════════════════════════════════════════════════════\n`;
    txt += `                  👥 REGISTERED TEAMS FULL DETAILS\n`;
    txt += `══════════════════════════════════════════════════════\n\n`;
    regs.forEach((reg, i) => {
      const lbEntry = sorted.find(e => e.user_id === reg.team_leader_id);
      txt += `[${i+1}] Team: ${reg.team_name || reg.team_leader_ign}\n`;
      txt += `    Team Leader : ${reg.team_leader_ign}  (Phone: ${reg.team_leader_phone || "N/A"})\n`;
      txt += `    Payment     : ${reg.payment_status} via ${reg.payment_method || "BH Coin"}\n`;
      txt += `    Status      : ${reg.status}\n`;
      txt += `    Registered  : ${IST(reg.created_date)}\n`;
      if (reg.team_members?.length > 0) {
        txt += `    Members:\n`;
        reg.team_members.forEach((m, mi) => {
          txt += `      ${mi+1}. IGN: ${m.ign}  UID: ${m.uid}${m.isLeader ? " 👑 Leader" : ""}\n`;
        });
      }
      if (lbEntry) {
        txt += `    Performance : Kills=${lbEntry.kills}  Points=${lbEntry.pts}  `;
        txt += fp === lbEntry.user_id ? "Rank=🥇 1st\n" : sp === lbEntry.user_id ? "Rank=🥈 2nd\n" : tp === lbEntry.user_id ? "Rank=🥉 3rd\n" : `Rank=#${sorted.indexOf(lbEntry)+1}\n`;
      }
      txt += `\n`;
    });

    txt += `══════════════════════════════════════════════════════\n`;
    txt += `    🎮 BattleHub FF | battlehubff.site\n`;
    txt += `══════════════════════════════════════════════════════\n`;

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tournament.title}_KillsWins_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  const downloadRegistrationsPDF = async (tournament) => {
    if (downloadingPdfId) return;
    setDownloadingPdfId(tournament.id);
    const toastId = toast.loading("Fetching Tournament Data...");
    try {
      const leaderboardRows = await TournamentLeaderboard.filter({ tournament_id: tournament.id });
      const registrations = await Registration.filter({ tournament_id: tournament.id });
      
      if (leaderboardRows.length === 0 && registrations.length === 0) {
        toast.error("No data found for this tournament!", { id: toastId });
        setIsDownloadingPdf(false);
        return;
      }
      
      toast.loading("⚡ Initializing Esports Booklet Generator...", { id: toastId });

      await generateTournamentPDF({
        tournament,
        leaderboardRows: leaderboardRows.sort((a,b) => (a.rank||999)-(b.rank||999)),
        registrations,
        matches: [],
        selectedStage: "Overall",
        selectedGroup: "All",
        onProgress: ({ page, totalPages, percentage, estimatedMb, remainingSec, title }) => {
          toast.loading(
            `📄 PDF Booklet Progress: ${percentage}%\n` +
            `Page ${page}/${totalPages}: ${title}\n` +
            `💾 Size: ~${estimatedMb} MB • ⏱️ ~${remainingSec}s left`,
            { id: toastId }
          );
        }
      });
      toast.success("Official Standings PDF Downloaded! 📄", { id: toastId });
    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error(`Failed to generate PDF: ${err.message || err}`, { id: toastId, duration: 6000 });
    } finally {
      setDownloadingPdfId(null);
    }
  };

  if (tournaments.length === 0) {
    return (
      <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
        <Trophy className="w-16 h-16 mx-auto text-gray-700 mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Tournaments</h3>
        <p className="text-gray-500">Create your first tournament to get started</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showRewardModal && (
        <TournamentWinnerReward
          tournament={showRewardModal}
          onClose={() => setShowRewardModal(null)}
        />
      )}

      {/* Tournament Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <Input
          type="search"
          autoComplete="off"
          value={tournamentSearch}
          onChange={(e) => setTournamentSearch(e.target.value)}
          placeholder="Search tournaments by name or ID..."
          className="bg-gray-900 border-gray-700 text-white pl-10 h-12 text-md w-full"
        />
      </div>

    {tournaments.filter(t => !tournamentSearch || t.title?.toLowerCase().includes(tournamentSearch.toLowerCase()) || t.id?.toLowerCase().includes(tournamentSearch.toLowerCase())).map((tournament, index) => (
        <div key={tournament.id}>
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-gray-100 mb-2 flex items-center gap-2">
                    {tournament.title}
                    {finalizedTournaments.has(tournament.id) && (
                      <span title="Kills & Wins Finalized" className="inline-flex items-center gap-1 bg-green-500/20 border border-green-500/50 text-green-400 rounded-full px-2 py-0.5 text-xs font-bold">
                        <CheckCircle className="w-3 h-3" /> Done
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-400">
                    {tournament.mode} • {tournament.map}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs text-white font-bold border-gray-500">
                      {safeFmt(tournament.date_time, "dd MMM yyyy")}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-white font-bold border-gray-500">
                      {safeFmt(tournament.date_time, "hh:mm a")}
                    </Badge>
                  </div>
                </div>
                <Badge className={
                  tournament.status === "Live" ? "bg-red-500/20 text-red-400" :
                  tournament.status === "Registration Open" ? "bg-green-500/20 text-green-400" :
                  tournament.status === "Completed" ? "bg-gray-500/20 text-gray-400" :
                  "bg-yellow-500/20 text-yellow-400"
                }>
                  {tournament.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Teams</p>
                  <p className="text-gray-100 font-semibold">
                    {tournament.current_teams || 0}/{tournament.max_teams}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Prize Pool</p>
                  <p className="text-purple-400 font-semibold">
                    ₹{tournament.prize_pool?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Date</p>
                  <p className="text-gray-100 font-semibold">
                    {safeFmt(tournament.date_time, "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Entry Fee</p>
                  <p className="text-cyan-400 font-semibold">
                    {tournament.entry_fee || 0} 🪙
                  </p>
                </div>
              </div>

              {/* Status Control */}
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={async () => {
                    await Tournament.update(tournament.id, { status: "Registration Open" });
                    onUpdate();
                  }}
                  size="sm"
                  className={`${tournament.status === "Registration Open" ? "bg-green-600" : "bg-gray-700"}`}
                >
                  Registration Open
                </Button>
                <Button
                  onClick={async () => {
                    if (tournament.status === "Live") {
                      const newLink = window.prompt("Update Live/YouTube Link (Optional):", tournament.live_link || "");
                      if (newLink !== null) {
                        await Tournament.update(tournament.id, { live_link: newLink.trim() });
                        onUpdate();
                      }
                    } else {
                      const link = window.prompt("Enter Live/YouTube Link (Optional):");
                      if (link !== null) {
                        await Tournament.update(tournament.id, { status: "Live", live_link: link.trim() });
                        onUpdate();
                      }
                    }
                  }}
                  size="sm"
                  className={`${tournament.status === "Live" ? "bg-red-600" : "bg-gray-700"}`}
                >
                  Live
                </Button>
                <Button
                  onClick={async () => {
                    await Tournament.update(tournament.id, { status: "Completed" });
                    onUpdate();
                  }}
                  size="sm"
                  className={`${tournament.status === "Completed" ? "bg-gray-600" : "bg-gray-700"}`}
                >
                  Complete
                </Button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Link to={createPageUrl(`TournamentDetail?id=${tournament.id}`)} className="flex-1">
                  <Button variant="outline" className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                    <Eye className="w-4 h-4 mr-2" />
                    View Tournament
                  </Button>
                </Link>

                <Button
                  onClick={() => setEditingTournament(tournament)}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>

                <Button
                  onClick={() => downloadRegistrationsPDF(tournament)}
                  disabled={downloadingPdfId === tournament.id}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                >
                  {downloadingPdfId === tournament.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Standings
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setSendingIdPassDrawer(tournament)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Send ID/Pass
                </Button>

                <Button
                  onClick={() => setShowRewardModal(tournament)}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Send Prize
                </Button>

                <Button
                  onClick={() => {
                    setManageKillsDrawerTab("kills");
                    setManageKillsDrawerTournament(tournament);
                  }}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-purple-600/25 cursor-pointer"
                >
                  <Target className="w-4 h-4 mr-2 text-white" />
                  Manage Kills & Leaderboard
                </Button>

                <Button
                  onClick={() => setStageMovementTournament(tournament)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/25 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 mr-2 text-emerald-200" />
                  ⚡ Move Stage
                </Button>

                {tournament.status === "Completed" && (
                  <Button
                    onClick={() => { setDeleteConfirmId(tournament.id); setDeleteCode(""); }}
                    className="bg-red-700 hover:bg-red-800"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Tournament
                  </Button>
                )}
              </div>

              {deleteConfirmId === tournament.id && (
                <div className="mt-3 p-4 bg-red-900/30 border border-red-500/40 rounded-lg space-y-3">
                  <p className="text-red-400 font-semibold text-sm">⚠️ Enter secret code to delete this completed tournament permanently:</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={deleteCode}
                      onChange={(e) => setDeleteCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                    />
                    <Button
                      onClick={async () => {
                        if (deleteCode !== DELETE_CODE) { alert("Wrong code!"); return; }
                        await Tournament.delete(tournament.id);
                        setDeleteConfirmId(null); setDeleteCode("");
                        onUpdate();
                      }}
                      className="bg-red-600 hover:bg-red-700 text-sm"
                    >
                      Confirm Delete
                    </Button>
                    <Button onClick={() => { setDeleteConfirmId(null); setDeleteCode(""); }} variant="outline" className="border-gray-700 text-sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
      
      <AnimatePresence>
        {editingTournament && (
          <TournamentEditor
            key={editingTournament.id}
            tournament={editingTournament}
            onClose={() => setEditingTournament(null)}
            onSave={onUpdate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sendingIdPassDrawer && (
          <SendIdPassDrawer 
            key="send-id-pass-drawer"
            tournament={sendingIdPassDrawer} 
            onClose={() => setSendingIdPassDrawer(null)}
            onUpdate={onUpdate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {manageKillsDrawerTournament && (
          <ManageKillsStagesDrawer
            key="manage-kills-stages-drawer"
            tournament={manageKillsDrawerTournament}
            initialTab={manageKillsDrawerTab}
            onClose={() => setManageKillsDrawerTournament(null)}
            onUpdate={onUpdate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stageMovementTournament && (
          <StageMovementDrawer
            key="stage-movement-drawer"
            tournament={stageMovementTournament}
            onClose={() => setStageMovementTournament(null)}
            onUpdate={onUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}