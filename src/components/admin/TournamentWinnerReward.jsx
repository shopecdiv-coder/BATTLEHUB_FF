import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Diamond } from "@/entities/Diamond";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, X, Check, Search, Loader2, RefreshCw } from "lucide-react";

export default function TournamentWinnerReward({ tournament, onClose }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [rewardReason, setRewardReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentInfo, setSentInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    setLoading(true);
    setError("");
    try {
      let regs = [];
      // Retry up to 3 times with short delays for reliability
      for (let attempt = 0; attempt < 3; attempt++) {
        regs = await base44.entities.Registration.filter({ tournament_id: tournament.id }).catch(() => []);
        if (regs && regs.length > 0) break;
        if (attempt < 2) await new Promise(r => setTimeout(r, 800));
      }
      setRegistrations(regs || []);
      if (!regs || regs.length === 0) {
        setError("No registrations found — click Retry to refresh");
      }
    } catch (e) {
      console.error("load reg error:", e);
      setError("Failed to load registrations — click Retry");
    }
    setLoading(false);
  };

  const sendReward = async () => {
    if (!selectedWinner || rewardAmount <= 0 || sending) return;

    const leaderMember = selectedWinner.team_members?.find(m => m.isLeader) || selectedWinner.team_members?.[0];
    const gameIGN = leaderMember?.ign || selectedWinner.team_leader_ign;
    const amount = Number(rewardAmount);
    const recipientId = selectedWinner.team_leader_id;
    const now = new Date().toISOString();
    const txDesc = rewardReason || `🏆 ${tournament.title} - Win Prize`;

    setSending(true);
    setError("");

    try {
      const accounts = await base44.entities.Diamond.filter({ user_id: recipientId });

      if (accounts && accounts.length > 0) {
        const acc = accounts[0];
        await base44.entities.Diamond.update(acc.id, {
          bh_coin_balance: (acc.bh_coin_balance || 0) + amount,
          transactions: [
            ...(acc.transactions || []),
            { type: "Win", coin_type: "BH Coin", amount, description: txDesc, timestamp: now }
          ]
        });
      } else {
        await base44.entities.Diamond.create({
          user_id: recipientId,
          user_ign: selectedWinner.team_leader_ign,
          bh_coin_balance: amount,
          diamond_balance: 0,
          transactions: [{ type: "Win", coin_type: "BH Coin", amount, description: txDesc, timestamp: now }]
        });
      }

      await base44.entities.Notification.create({
        recipient_id: recipientId,
        type: "Prize Distributed",
        title: "🏆 Tournament Win Reward!",
        message: `Congratulations! You received ${amount} BH Coins for: ${txDesc}`,
        priority: "High",
        dismissable: true,
        created_at: now,
        read: false
      });

      // Non-critical: update win stats
      base44.entities.User.get(recipientId).then(u => {
        if (u) base44.entities.User.update(recipientId, { total_wins: (u.total_wins || 0) + 1 }).catch(() => {});
      }).catch(() => {});

      setSentInfo({ amount, gameIGN, teamName: selectedWinner.team_name });
      setSent(true);
      setSelectedWinner(null);
      setRewardAmount(0);
      setRewardReason("");
    } catch (e) {
      console.error("Prize send error:", e);
      setError("❌ Failed to send prize. Please try again.");
    }
    setSending(false);
  };

  const filtered = registrations.filter(reg => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      reg.team_name?.toLowerCase().includes(q) ||
      reg.team_leader_ign?.toLowerCase().includes(q) ||
      reg.team_members?.some(m => m.ign?.toLowerCase().includes(q) || m.uid?.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          <p className="text-gray-300 text-sm font-medium">Loading registrations for</p>
          <p className="text-yellow-400 text-sm font-bold">{tournament.title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <Card className="bg-gray-900 border-gray-700 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <CardHeader className="border-b border-gray-700 pb-3">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-base font-bold">Send Prize — {tournament.title}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">

          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center justify-between gap-3">
              <p className="text-red-400 text-sm">{error}</p>
              <Button size="sm" onClick={loadRegistrations} className="bg-red-600 hover:bg-red-700 h-7 text-xs shrink-0">
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </div>
          )}

          {sent && sentInfo && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/50 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-green-400 text-xl font-bold">Coins Sent! ✅</p>
                <p className="text-gray-200 mt-2">
                  <span className="text-yellow-400 font-bold">{sentInfo.amount} BH Coins</span>
                  <span className="text-gray-400"> → </span>
                  <span className="text-white font-semibold">{sentInfo.gameIGN}</span>
                </p>
                <p className="text-gray-500 text-sm mt-1">Team: {sentInfo.teamName}</p>
                <p className="text-green-500/60 text-xs mt-1">Wallet updated ✓</p>
              </div>
              <Button onClick={() => { setSent(false); setSentInfo(null); }} className="bg-gray-700 hover:bg-gray-600">
                Send Another Prize
              </Button>
            </div>
          )}

          {sending && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
              </div>
              <p className="text-white font-semibold">Crediting {rewardAmount} BH Coins...</p>
              <p className="text-gray-400 text-sm">Please wait — updating wallet</p>
            </div>
          )}

          {!sending && !sent && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-200 font-semibold">
                    Select Winner Team
                    <span className="ml-2 text-cyan-400 font-normal text-sm">({registrations.length} registered)</span>
                  </Label>
                  <button onClick={loadRegistrations} className="text-gray-500 hover:text-white text-xs flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Reload
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by team name or IGN..."
                    className="bg-gray-800 border-gray-700 text-white pl-9"
                  />
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {registrations.length === 0 && !error && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">No registrations found for this tournament</p>
                      <button onClick={loadRegistrations} className="text-cyan-400 text-xs mt-2 hover:underline flex items-center gap-1 mx-auto">
                        <RefreshCw className="w-3 h-3" /> Click to reload
                      </button>
                    </div>
                  )}
                  {filtered.map(reg => {
                    const leaderMember = reg.team_members?.find(m => m.isLeader) || reg.team_members?.[0];
                    const gameIGN = leaderMember?.ign || reg.team_leader_ign;
                    const gameUID = leaderMember?.uid || reg.team_leader_uid;
                    return (
                      <div
                        key={reg.id}
                        onClick={() => setSelectedWinner(reg)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                          selectedWinner?.id === reg.id
                            ? "bg-yellow-500/15 border-yellow-500/50"
                            : "bg-gray-800/70 border-gray-700/40 hover:bg-gray-700/70 hover:border-gray-600"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-white text-sm">{reg.team_name}</p>
                          <p className="text-xs text-cyan-400">IGN: {gameIGN}</p>
                          <p className="text-xs text-gray-500">UID: {gameUID || "N/A"}</p>
                        </div>
                        {selectedWinner?.id === reg.id && <Check className="w-5 h-5 text-yellow-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedWinner && (() => {
                const leaderMember = selectedWinner.team_members?.find(m => m.isLeader) || selectedWinner.team_members?.[0];
                const gameIGN = leaderMember?.ign || selectedWinner.team_leader_ign;
                return (
                  <div className="space-y-3 pt-3 border-t border-gray-700">
                    <div className="p-3 bg-yellow-500/8 border border-yellow-500/20 rounded-xl">
                      <p className="text-yellow-400 font-bold text-sm">✅ {selectedWinner.team_name}</p>
                      <p className="text-xs text-gray-300 mt-0.5">Game IGN: <span className="text-cyan-300">{gameIGN}</span></p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-300 text-sm">BH Coins Amount</Label>
                        <Input
                          type="number"
                          min="1"
                          value={rewardAmount}
                          onChange={e => setRewardAmount(parseInt(e.target.value) || 0)}
                          placeholder="Enter amount"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">Reason (Optional)</Label>
                        <Input
                          value={rewardReason}
                          onChange={e => setRewardReason(e.target.value)}
                          placeholder="e.g., 1st Place"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={sendReward}
                      disabled={rewardAmount <= 0}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold h-11 text-base"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Send {rewardAmount > 0 ? `${rewardAmount} 🪙` : ""} to {gameIGN}
                    </Button>
                  </div>
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}