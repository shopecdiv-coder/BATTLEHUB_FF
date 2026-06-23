import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { Diamond } from "@/entities/Diamond";
import { User } from "@/entities/User";
import { BanRecord } from "@/entities/BanRecord";
import { Referral } from "@/entities/Referral";
// TeamInvite import removed — invite system disabled
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, X, AlertTriangle, Search, CheckCircle, Clock, Send } from "lucide-react";
import emailjs from '@emailjs/browser';

export default function RegistrationModal({ tournament, user, onClose, onSuccess }) {
  const [teamName, setTeamName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bhCoins, setBhCoins] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("auto");
  const [error, setError] = useState("");

  // Direct member entry for Duo/Squad (no invite system)
  const [extraMembers, setExtraMembers] = useState(
    Array.from({ length: (tournament.mode === "Solo" ? 1 : tournament.mode === "Duo" ? 2 : 4) - 1 }, () => ({ ign: "", uid: "" }))
  );

  const maxMembers = tournament.mode === "Solo" ? 1 : tournament.mode === "Duo" ? 2 : 4;
  const requiredCoins = tournament.entry_fee || 0;
  const isSolo = tournament.mode === "Solo";
  const needsInvite = !isSolo; // Duo/Squad use invite system

  // Leader info from profile
  const leaderMember = { ign: user.ign || user.full_name || "", uid: user.game_uid || user.ff_uid || "", isLeader: true };

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const accounts = await Diamond.filter({ user_id: user.id });
    if (accounts.length > 0) {
      setBhCoins(accounts[0].bh_coin_balance || 0);
      setDiamonds(accounts[0].diamond_balance || 0);
    }
  };

  const totalAvailable = bhCoins + diamonds;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (totalAvailable < requiredCoins) {
      setError(`Insufficient balance! Need ${requiredCoins} BH🪙`);
      return;
    }

    if (!leaderMember.uid || !leaderMember.ign) {
      setError("Please save your IGN and Game UID in your profile first.");
      return;
    }

    if (user.is_banned) {
      const banUntil = user.ban_until ? new Date(user.ban_until) : null;
      if (!banUntil || banUntil > new Date()) {
        setError(`You are banned. Reason: ${user.ban_reason || 'Violation'}`);
        return;
      }
    }

    // Build team members from leader + directly entered members
    const teamMembers = [leaderMember];
    if (!isSolo) {
      for (const m of extraMembers) {
        if (m.ign && m.uid) {
          teamMembers.push({ ign: m.ign, uid: m.uid, isLeader: false });
        }
      }
    }

    const allBanRecords = await BanRecord.list();
    const bannedUIDs = allBanRecords.filter(b => b.severity === "Permanent" || (b.end_date && new Date(b.end_date) > new Date())).map(b => b.user_uid || "").filter(uid => uid);
    
    for (const member of teamMembers) {
      if (member.uid && bannedUIDs.includes(member.uid)) {
        setError(`UID ${member.uid} is banned`);
        return;
      }
    }

    if (!isSolo) {
      const allRegs = await Registration.list();
      const tournamentRegs = allRegs.filter(r => r.tournament_id === tournament.id);
      for (const member of teamMembers) {
        if (tournamentRegs.some(reg => reg.team_members?.some(tm => tm.uid === member.uid))) {
          setError(`UID ${member.uid} already registered`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const allTournRegs = await Registration.filter({ tournament_id: tournament.id }).catch(() => []);
      if (allTournRegs.some(r => r.team_leader_id === user.id)) {
        setError("Already registered!");
        setSubmitting(false);
        return;
      }

      if (tournament.entry_fee > 0 && user.referred_by && !user.first_paid_tournament_done) {
        const pendingReferrals = await Referral.filter({ referred_user_id: user.id, status: "Pending" });
        if (pendingReferrals.length > 0) {
          await Referral.update(pendingReferrals[0].id, { status: "Completed", tournament_played: tournament.title, completed_at: new Date().toISOString() });
          await User.updateMyUserData({ first_paid_tournament_done: true });
        }
      }

      const accounts = await Diamond.filter({ user_id: user.id });
      if (accounts.length > 0) {
        const account = accounts[0];
        const now = new Date().toISOString();
        
        let bhDeduct = 0;
        let diamondDeduct = 0;
        
        if (paymentMethod === "bh") {
          bhDeduct = requiredCoins;
        } else if (paymentMethod === "diamond") {
          diamondDeduct = requiredCoins;
        } else {
          bhDeduct = Math.min(requiredCoins, bhCoins);
          diamondDeduct = Math.max(0, requiredCoins - bhCoins);
        }
        
        const paymentMethodUsed = paymentMethod === "bh" ? "BH Coin" : 
                               paymentMethod === "diamond" ? "Diamond" : 
                               bhDeduct > 0 && diamondDeduct > 0 ? "Mixed" :
                               bhDeduct > 0 ? "BH Coin" : "Diamond";
        
        await Diamond.update(account.id, {
          bh_coin_balance: bhCoins - bhDeduct,
          diamond_balance: diamonds - diamondDeduct,
          transactions: [
            ...(account.transactions || []),
            {
              type: "Tournament Entry",
              coin_type: bhDeduct > 0 && diamondDeduct > 0 ? "Mixed" : bhDeduct > 0 ? "BH Coin" : "Diamond",
              amount: -requiredCoins,
              description: `Entered ${tournament.title} (${bhDeduct > 0 ? bhDeduct + '🪙' : ''}${diamondDeduct > 0 ? (bhDeduct > 0 ? ' + ' : '') + diamondDeduct + '💎' : ''})`,
              timestamp: now
            }
          ]
        });
        
        const leaderMember = teamMembers.find(m => m.isLeader) || teamMembers[0];
        await Registration.create({
          tournament_id: tournament.id,
          tournament_title: tournament.title,
          team_name: isSolo ? (user.ign || user.full_name) : teamName,
          team_leader_id: user.id,
          team_leader_ign: user.ign || user.full_name,
          team_leader_uid: leaderMember.uid,
          team_leader_phone: phoneNumber,
          team_members: teamMembers,
          payment_status: "Paid",
          payment_method: paymentMethodUsed,
          status: "Registered",
          team_logo_url: ""
        });
      }

      await Tournament.update(tournament.id, { current_teams: (tournament.current_teams || 0) + 1 });
      await User.updateMyUserData({ total_matches: (user.total_matches || 0) + 1 });

      // Handle referral reward for the referrer (not re-deducting from current user)
      const pendingReferrals2 = await Referral.filter({ referred_user_id: user.id, status: "Pending" });
      if (pendingReferrals2.length > 0) {
        const referral = pendingReferrals2[0];
        const rewardAmount = referral.reward_amount || 5;
        await Referral.update(referral.id, { status: "Completed", tournament_played: tournament.id, reward_credited: true });
        const referrerAccounts = await Diamond.filter({ user_id: referral.referrer_id });
        const now2 = new Date().toISOString();
        if (referrerAccounts.length > 0) {
          await Diamond.update(referrerAccounts[0].id, {
            bh_coin_balance: (referrerAccounts[0].bh_coin_balance || 0) + rewardAmount,
            transactions: [...(referrerAccounts[0].transactions || []), {
              type: "Win", coin_type: "BH Coin", amount: rewardAmount,
              description: `🎁 Referral - ${user.ign || user.full_name} joined`, timestamp: now2
            }]
          });
        } else {
          await Diamond.create({
            user_id: referral.referrer_id, user_ign: referral.referrer_ign,
            diamond_balance: 0, bh_coin_balance: rewardAmount,
            transactions: [{ type: "Win", coin_type: "BH Coin", amount: rewardAmount, description: `🎁 Referral - ${user.ign || user.full_name} joined`, timestamp: now2 }]
          });
        }
      }

      if (user.email && user.email.trim()) {
        try {
          await emailjs.send('service_sd3ho0n', 'template_wax0atk', {
            to_email: user.email,
            user_name: user.full_name || user.ign || 'Player',
            tournament_name: tournament.title || 'Tournament',
            game_mode: tournament.mode || 'N/A',
            match_date: tournament.date_time ? new Date(tournament.date_time).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA',
            match_time: tournament.date_time ? new Date(tournament.date_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBA'
          }, 'l1xNKW7ZEzj2RARE_');
        } catch (emailError) {
          console.error('Email failed:', emailError);
        }
      }

      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      setError("Registration failed");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            Register for {tournament.title}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Mode: {tournament.mode} | Entry: {requiredCoins} BH🪙
          </DialogDescription>
        </DialogHeader>

        <div className={`p-4 rounded-lg border ${totalAvailable >= requiredCoins ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white font-semibold mb-1">Your Balance:</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-yellow-400 font-bold">{bhCoins} 🪙</span>
                  <span className="text-purple-400 font-bold">{diamonds} 💎</span>
                </div>
              </div>
              {totalAvailable < requiredCoins && (
                <Link to={createPageUrl("Wallet")}>
                  <Button size="sm" className="bg-purple-600">Add Coins</Button>
                </Link>
              )}
            </div>
            
            {totalAvailable >= requiredCoins && (
              <div className="pt-3 border-t border-gray-700">
                <Label className="text-gray-300 text-sm mb-2 block">Payment Method (Entry: {requiredCoins})</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={paymentMethod === "auto" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("auto")}
                    className={paymentMethod === "auto" ? "bg-green-600" : "border-gray-700"}
                  >
                    Auto
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={paymentMethod === "bh" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("bh")}
                    disabled={bhCoins < requiredCoins}
                    className={paymentMethod === "bh" ? "bg-yellow-600" : "border-gray-700"}
                  >
                    🪙 BH Only
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={paymentMethod === "diamond" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("diamond")}
                    disabled={diamonds < requiredCoins}
                    className={paymentMethod === "diamond" ? "bg-purple-600" : "border-gray-700"}
                  >
                    💎 Diamond Only
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {paymentMethod === "auto" && "Auto: Uses BH Coin first, then Diamonds"}
                  {paymentMethod === "bh" && `Will use ${requiredCoins} BH Coins`}
                  {paymentMethod === "diamond" && `Will use ${requiredCoins} Diamonds`}
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-gray-300">WhatsApp Number *</Label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter your WhatsApp number (e.g., 919876543210)"
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Include country code (e.g., 919876543210)</p>
          </div>

          {!isSolo && (
            <div>
              <Label className="text-gray-300">Team Name *</Label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} className="bg-gray-800 border-gray-700 text-white" required />
            </div>
          )}

          <div className="space-y-4">
            <Label className="text-gray-300 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {isSolo ? "Player Details" : `Team Members (${tournament.mode})`}
            </Label>

            {/* Member 1 - Leader (auto from profile) */}
            <div className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white text-sm">Member 1 — You (Team Head 👑)</h4>
              </div>
              {leaderMember.ign && leaderMember.uid ? (
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 ring-2 ring-purple-500">
                    <AvatarFallback className="bg-purple-700 text-white">{leaderMember.ign[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-white">{leaderMember.ign}</p>
                    <p className="text-xs text-cyan-400 font-mono">UID: {leaderMember.uid}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <p className="text-red-400 text-xs">Please save your IGN & Game UID in your <Link to={createPageUrl("Profile")} className="underline text-red-300">Profile</Link> first.</p>
                </div>
              )}
            </div>

            {/* Direct member entry for Duo/Squad — no invite system */}
            {!isSolo && extraMembers.map((m, idx) => (
              <div key={idx} className="p-4 bg-gray-800/50 rounded-lg border border-cyan-500/20">
                <h4 className="font-semibold text-white text-sm mb-3">Member {idx + 2}</h4>
                <div className="space-y-2">
                  <Input
                    value={m.ign}
                    onChange={e => { const arr = [...extraMembers]; arr[idx] = { ...arr[idx], ign: e.target.value }; setExtraMembers(arr); }}
                    placeholder="In-Game Name (IGN)"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                  <Input
                    value={m.uid}
                    onChange={e => { const arr = [...extraMembers]; arr[idx] = { ...arr[idx], uid: e.target.value.replace(/\D/g,'') }; setExtraMembers(arr); }}
                    placeholder="Free Fire UID (numeric)"
                    inputMode="numeric"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-gray-700">Cancel</Button>
            <Button
              type="submit"
              disabled={submitting || totalAvailable < requiredCoins || !phoneNumber.trim() || !leaderMember.uid || !leaderMember.ign}
              className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500"
            >
              {submitting ? "Registering..." :
               paymentMethod === "bh" ? `Pay ${requiredCoins}🪙 & Register` :
               paymentMethod === "diamond" ? `Pay ${requiredCoins}💎 & Register` :
               `Pay ${requiredCoins} & Register`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}