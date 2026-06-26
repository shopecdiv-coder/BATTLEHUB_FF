import React, { useState, useEffect } from "react";
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
import { Trophy, Eye, Send, Key, Download, Trash2, Gift, Target, Crown, Save, Edit, Search, CheckCircle, FileText, Users } from "lucide-react";
import TournamentWinnerReward from "./TournamentWinnerReward";
import { Notification } from "@/entities/Notification";
import { format } from "date-fns";


export default function TournamentManagement({ tournaments, onUpdate }) {
  const [sendingMessage, setSendingMessage] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [showRewardModal, setShowRewardModal] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(null);
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

  const buildWhatsAppMessage = (tournament, reg, customMessage, rCode, rPassword) => {
    const matchDate = new Date(tournament.date_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const members = reg.team_members?.map((m, i) => `  ${i+1}. ${m.ign} | UID: ${m.uid}${m.isLeader ? " 👑" : ""}`).join("\n") || "";
    const invoiceId = `BHFF-${new Date(reg.created_date).getTime().toString().slice(-8)}`;
    const registeredAt = new Date(reg.created_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    
    return `🏆 *BATTLEHUB FF — MATCH CONFIRMATION* 🏆
━━━━━━━━━━━━━━━━━━━━━

✅ *REGISTRATION CONFIRMED*

Hello *${reg.team_leader_ign}*! Your registration is confirmed.

━━━━━━━━━━━━━━━━━━━━━
🏆 *TOURNAMENT INFO*

🏆 ${tournament.title}
🎮 Mode: ${tournament.mode} | 🗺️ Map: ${tournament.map || "Bermuda"}
📅 Match Date: ${matchDate}
👥 Max Teams: ${tournament.max_teams}

━━━━━━━━━━━━━━━━━━━━━
${rCode ? `🔑 *ROOM CREDENTIALS*
🏠 Room ID: \`${rCode}\`
🔒 Password: \`${rPassword || "No Password"}\`
━━━━━━━━━━━━━━━━━━━━━
` : ""}${tournament.prize_pool ? `🏆 *PRIZE POOL*
  🥇 1st: ₹${tournament.prize_distribution?.first || "TBA"}
  🥈 2nd: ₹${tournament.prize_distribution?.second || "TBA"}
  🥉 3rd: ₹${tournament.prize_distribution?.third || "TBA"}
━━━━━━━━━━━━━━━━━━━━━
` : ""}
🧾 *ENTRY INVOICE*

📄 Invoice ID: *#${invoiceId}*
👤 Team: *${reg.team_name}*
📱 Phone: ${reg.team_leader_phone || "N/A"}

*Team Members:*
${members}

💰 Entry Fee: ${tournament.entry_fee || 0} ${reg.payment_method === "Diamond" ? "💎 Diamond" : "🪙 BH Coin"}
💳 Payment Method: ${reg.payment_method || "BH Coin"}
✅ Status: PAID & CONFIRMED
📅 Registered: ${registeredAt}

━━━━━━━━━━━━━━━━━━━━━
${customMessage ? `📢 *Message from Admin:*\n${customMessage}\n━━━━━━━━━━━━━━━━━━━━━\n` : ""}
⚠️ *IMPORTANT RULES*

• Room ID & Password will be shared 10 minutes before match
• Join the room on time — late entries rejected
• Fair play mandatory — cheating = permanent ban
• Keep this message as your entry proof

━━━━━━━━━━━━━━━━━━━━━
🌐 battlehubff.site | 📧 helpbattlehub@gmail.com

🎮 Good luck! — *BattleHub FF Team* 🎮`;
  };

  const sendMessageToRegistered = async (tournament) => {
    if (!messageText.trim() && !roomCode.trim()) return;
    setIsSending(true);
    try {
      const registrations = await Registration.filter({ tournament_id: tournament.id });
      if (!registrations.length) {
        alert("⚠️ No registrations found for this tournament!");
        setIsSending(false);
        return;
      }

      // Send all messages in parallel for speed
      await Promise.all(registrations.map(async (reg) => {
        // Build the in-app message: room credentials + optional extra message
        let inAppMsg = "";
        if (roomCode.trim()) {
          inAppMsg += `ROOM ID: ${roomCode.trim()}`;
          if (roomPassword.trim()) inAppMsg += `\nPASSWORD: ${roomPassword.trim()}`;
        }
        if (messageText.trim()) {
          inAppMsg += (inAppMsg ? "\n\n" : "") + messageText.trim();
        }

        const tasks = [
          PlayerMessage.create({
            tournament_id: tournament.id,
            recipient_id: reg.team_leader_id,
            recipient_ign: reg.team_leader_ign,
            message: inAppMsg,
            room_code: roomCode.trim(),
            room_password: roomPassword.trim(),
            sent_at: new Date().toISOString(),
            read: false
          })
        ];
        // Always create notification when sending
        tasks.push(Notification.create({
          recipient_id: reg.team_leader_id,
          type: "Match Update",
          title: roomCode.trim() 
            ? `🔑 ${tournament.title} — Room Credentials` 
            : `📢 ${tournament.title} — Match Update`,
          message: roomCode.trim()
            ? `Room ID: ${roomCode.trim()}${roomPassword.trim() ? ` | Password: ${roomPassword.trim()}` : ""}${messageText.trim() ? `\n\n📢 ${messageText.trim()}` : ""}`
            : messageText.trim(),
          link: createPageUrl(`TournamentDetail?id=${tournament.id}`),
          priority: roomCode.trim() ? "Urgent" : "High",
          dismissable: false,
          created_at: new Date().toISOString()
        }));
        return Promise.all(tasks);
      }));

      // Update tournament with latest room credentials
      await Tournament.update(tournament.id, {
        room_code: roomCode.trim() || "",
        room_password: roomPassword.trim() || "",
        room_message: messageText.trim() || ""
      });

      alert(`✅ Message sent to ${registrations.length} registered player(s)!\n${roomCode.trim() ? `🔑 Room ID: ${roomCode.trim()}` : ""}${roomPassword.trim() ? `\n🔒 Password: ${roomPassword.trim()}` : ""}${messageText.trim() ? `\n📢 Extra: ${messageText.trim()}` : ""}`);

      setSendingMessage(null);
      setMessageText("");
      setRoomCode("");
      setRoomPassword("");
      onUpdate();
    } catch (err) {
      console.error("Send message error:", err);
      alert("❌ Error sending message. Please try again.");
    }
    setIsSending(false);
  };

  const deleteAllMessages = async (tournament) => {
    if (!confirm("Delete all player messages for this tournament? This will remove room credentials from all registered players.")) return;

    const messages = await PlayerMessage.filter({ tournament_id: tournament.id });
    // Delete all in parallel for speed
    await Promise.all(messages.map(msg => PlayerMessage.delete(msg.id)));

    alert("✅ All messages cleared from all registered players!");
    onUpdate();
  };

  const openLeaderboard = async (tournament) => {
    setShowLeaderboard(tournament);
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

  const downloadRegistrationsPDF = async (tournament) => {
    const registrations = await Registration.filter({ tournament_id: tournament.id });
    
    if (registrations.length === 0) {
      alert("No registrations found for this tournament!");
      return;
    }

    // Group registrations by date
    const regsByDate = {};
    registrations.forEach(reg => {
      const dateKey = format(new Date(reg.created_date), "yyyy-MM-dd");
      if (!regsByDate[dateKey]) {
        regsByDate[dateKey] = [];
      }
      regsByDate[dateKey].push(reg);
    });

    // Create PDF content as text
    let pdfContent = `═══════════════════════════════════════════════\n`;
    pdfContent += `       🏆 BATTLE HUB TOURNAMENT 🏆\n`;
    pdfContent += `       REGISTRATION DETAILS\n`;
    pdfContent += `═══════════════════════════════════════════════\n\n`;
    pdfContent += `TOURNAMENT: ${tournament.title}\n`;
    pdfContent += `Mode: ${tournament.mode} | Map: ${tournament.map}\n`;
    pdfContent += `Date: ${format(new Date(tournament.date_time), "PPP p")}\n`;
    pdfContent += `Total Teams: ${registrations.length}\n`;
    pdfContent += `\n═══════════════════════════════════════════════\n`;

    // Show registrations grouped by date
    Object.keys(regsByDate).sort().reverse().forEach(dateKey => {
      const dateRegs = regsByDate[dateKey];
      pdfContent += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      pdfContent += `📅 ${format(new Date(dateKey), "dd MMM yyyy")} - ${dateRegs.length} Registrations\n`;
      pdfContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      dateRegs.forEach((reg, index) => {
        pdfContent += `\n--- TEAM ${index + 1}: ${reg.team_name} ---\n`;
        pdfContent += `📌 Registration Time: ${format(new Date(reg.created_date), "hh:mm a")}\n`;
        pdfContent += `👤 Team Leader: ${reg.team_leader_ign} (ID: ${reg.team_leader_id})\n`;
        pdfContent += `💰 Payment Status: ${reg.payment_status}\n`;
        pdfContent += `📋 Status: ${reg.status}\n`;
        pdfContent += `\n👥 Team Members:\n`;
        reg.team_members?.forEach((member, i) => {
          pdfContent += `  ${i + 1}. IGN: ${member.ign} | UID: ${member.uid}\n`;
        });
      });
    });

    pdfContent += `\n═══════════════════════════════════════════════\n`;
    pdfContent += `     Thank you for being a part of our\n`;
    pdfContent += `          BATTLE HUB TOURNAMENT! 🏆\n`;
    pdfContent += `═══════════════════════════════════════════════\n`;

    // Download as text file
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament.title}_Registrations_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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

      {/* Leaderboard Management Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowLeaderboard(null)}>
          <Card className="bg-gray-900 border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Manage Kills & Wins - {showLeaderboard.title}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowLeaderboard(null)}>✕</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Top 3 Selection */}
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <Label className="text-yellow-400 text-sm">🥇 1st Place (+15)</Label>
                  </div>
                  <select
                    value={firstPlaceId}
                    onChange={(e) => setFirstPlaceId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                  >
                    <option value="">Select 1st</option>
                    {leaderboardData.map(e => (
                      <option key={e.user_id} value={e.user_id}>
                        {e.player_ign}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-gray-500/10 border border-gray-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-gray-400" />
                    <Label className="text-gray-400 text-sm">🥈 2nd Place (+10)</Label>
                  </div>
                  <select
                    value={secondPlaceId}
                    onChange={(e) => setSecondPlaceId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                  >
                    <option value="">Select 2nd</option>
                    {leaderboardData.map(e => (
                      <option key={e.user_id} value={e.user_id}>
                        {e.player_ign}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-orange-400" />
                    <Label className="text-orange-400 text-sm">🥉 3rd Place (+5)</Label>
                  </div>
                  <select
                    value={thirdPlaceId}
                    onChange={(e) => setThirdPlaceId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                  >
                    <option value="">Select 3rd</option>
                    {leaderboardData.map(e => (
                      <option key={e.user_id} value={e.user_id}>
                        {e.player_ign}
                      </option>
                    ))}
                  </select>
                </div>
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

              {/* Players Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-2 text-gray-400 text-sm">#</th>
                      <th className="text-left py-2 px-2 text-gray-400 text-sm">Player</th>
                      <th className="text-left py-2 px-2 text-gray-400 text-sm">UID</th>
                      <th className="text-center py-2 px-2 text-gray-400 text-sm">Kills</th>
                      <th className="text-center py-2 px-2 text-gray-400 text-sm">Win</th>
                      <th className="text-center py-2 px-2 text-gray-400 text-sm">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.filter(e => !lbSearch || e.player_ign?.toLowerCase().includes(lbSearch.toLowerCase()) || e.player_uid?.includes(lbSearch) || e.unique_id?.toLowerCase().includes(lbSearch.toLowerCase())).map((entry, index) => (
                      <tr key={entry.id} className="border-b border-gray-700/50">
                        <td className="py-2 px-2 text-white">{index + 1}</td>
                        <td className="py-2 px-2">
                          <p className="text-white font-semibold">{entry.player_ign}</p>
                          <p className="text-xs text-gray-500">{entry.unique_id}</p>
                        </td>
                        <td className="py-2 px-2 text-cyan-400 text-sm">{entry.player_uid || '-'}</td>
                        <td className="py-2 px-2 text-center">
                          <Input
                            type="number"
                            value={killsInput[entry.id] || 0}
                            onChange={(e) => setKillsInput({...killsInput, [entry.id]: parseInt(e.target.value) || 0})}
                            className="w-16 bg-gray-800 border-gray-700 text-white text-center mx-auto"
                            min="0"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          {firstPlaceId === entry.user_id ? (
                            <Badge className="bg-yellow-500/20 text-yellow-400">🥇</Badge>
                          ) : secondPlaceId === entry.user_id ? (
                            <Badge className="bg-gray-500/20 text-gray-400">🥈</Badge>
                          ) : thirdPlaceId === entry.user_id ? (
                            <Badge className="bg-orange-500/20 text-orange-400">🥉</Badge>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center text-cyan-400 font-bold">
                          {((killsInput[entry.id] || 0) * 2) + (
                            firstPlaceId === entry.user_id ? 15 :
                            secondPlaceId === entry.user_id ? 10 :
                            thirdPlaceId === entry.user_id ? 5 : 0
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={saveLeaderboard}
                  disabled={savingLB}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingLB ? "Saving..." : "Save & Update All Stats"}
                </Button>
                <Button
                  type="button"
                  onClick={() => downloadKillsReport(showLeaderboard, leaderboardData, killsInput, firstPlaceId, secondPlaceId, thirdPlaceId)}
                  className="bg-blue-600 hover:bg-blue-700 shrink-0"
                  title="Download TXT Report"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tournament Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <Input
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
                      {format(new Date(tournament.date_time), "dd MMM yyyy")}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-white font-bold border-gray-500">
                      {format(new Date(tournament.date_time), "hh:mm a")}
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
                    {format(new Date(tournament.date_time), "MMM d, yyyy")}
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
              <div className="grid grid-cols-4 gap-2 mb-3">
                <Button
                  onClick={async () => {
                    const updatePayload = { status: "Registration Open" };
                    if (tournament.registration_closes && new Date(tournament.registration_closes) < new Date()) {
                      updatePayload.registration_closes = null;
                    }
                    await Tournament.update(tournament.id, updatePayload);
                    onUpdate();
                  }}
                  size="sm"
                  className={`${tournament.status === "Registration Open" ? "bg-green-600" : "bg-gray-700"}`}
                >
                  Open
                </Button>
                {tournament.tournament_type !== "Semifinal" && tournament.tournament_type !== "Grand Final" && (
                  <Button
                    onClick={async () => {
                      await Tournament.update(tournament.id, { status: "Registration Closed" });
                      onUpdate();
                    }}
                    size="sm"
                    className={`${tournament.status === "Registration Closed" ? "bg-yellow-600" : "bg-gray-700"}`}
                  >
                    Closed
                  </Button>
                )}
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
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>

                <Button
                  onClick={() => setSendingMessage(tournament.id)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>

                <Button
                  onClick={() => deleteAllMessages(tournament)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Messages
                </Button>

                <Button
                  onClick={() => setShowRewardModal(tournament)}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Send Prize
                </Button>

                <Button
                  onClick={() => openLeaderboard(tournament)}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Manage Kills/Wins
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

              {sendingMessage === tournament.id && (
                <div className="space-y-3 pt-3 border-t border-gray-700">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-blue-400 text-xs font-semibold">📱 Message Preview — Full WhatsApp message with team invoice will be sent to each player</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-gray-300 flex items-center gap-1 text-sm">
                        <Key className="w-3 h-3" /> Room ID
                      </Label>
                      <Input
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        placeholder="Enter Room ID"
                        className="bg-gray-900 border-gray-700 text-gray-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-gray-300 flex items-center gap-1 text-sm">
                        <Key className="w-3 h-3" /> Password
                      </Label>
                      <Input
                        value={roomPassword}
                        onChange={(e) => setRoomPassword(e.target.value)}
                        placeholder="Enter Password"
                        className="bg-gray-900 border-gray-700 text-gray-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-gray-300 text-sm">Extra Message (Optional)</Label>
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Additional message for players..."
                      rows={2}
                      className="bg-gray-900 border-gray-700 text-gray-100 text-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => { setSendingMessage(null); setMessageText(""); setRoomCode(""); setRoomPassword(""); }}
                      className="border-gray-700"
                      disabled={isSending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => sendMessageToRegistered(tournament)}
                      disabled={isSending || (!messageText.trim() && !roomCode.trim())}
                      className="bg-green-500 hover:bg-green-600 active:scale-95"
                    >
                      {isSending ? (
                        <><span className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Sending...
                      </>) : (
                        <><Send className="w-4 h-4 mr-2" /> Send to All Registered</>)}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
      
      {editingTournament && (
        <TournamentEditor
          tournament={editingTournament}
          onClose={() => setEditingTournament(null)}
          onSave={onUpdate}
        />
      )}
    </div>
  );
}