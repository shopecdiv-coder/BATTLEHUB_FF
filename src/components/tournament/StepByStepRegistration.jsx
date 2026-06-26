import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { Diamond } from "@/entities/Diamond";
import { User } from "@/entities/User";
import { BanRecord } from "@/entities/BanRecord";
import { Referral } from "@/entities/Referral";
import { TeamProfile } from "@/entities/TeamProfile";
import { base44 } from "@/api/base44Client";
import { UploadFile } from "@/integrations/Core";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RegistrationSuccessModal from "./RegistrationSuccessModal";
import RegistrationInvoiceDownload from "./RegistrationInvoiceDownload";
import SlotPicker from "./SlotPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X, AlertTriangle, Coins, ArrowRight, ArrowLeft, CheckCircle, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StepByStepRegistration({ tournament, user, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState("");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentMember, setCurrentMember] = useState({ ign: "", uid: "" });
  const [teamHeadIndex] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const maxSlots = tournament.max_slots || 12;
  const [submitting, setSubmitting] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [diamondBalance, setDiamondBalance] = useState(0);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [savedSquads, setSavedSquads] = useState([]);
  const [showSavedSquads, setShowSavedSquads] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [logoUploading, setLogoUploading] = useState(false);

  const maxMembers = tournament.mode === "Solo" ? 1 : tournament.mode === "Duo" ? 2 : 4;
  const requiredCoins = tournament.entry_fee || 0;
  const isSolo = tournament.mode === "Solo";

  React.useEffect(() => {
    loadCoinBalance();
    loadUserPhone();
    // Auto-add registering user as first member (team head) for non-solo
    if (!isSolo && user.ign && user.game_uid) {
      setTeamMembers([{ ign: user.ign, uid: user.game_uid, isLeader: true }]);
    }
    // Load saved squads (with logo)
    if (!isSolo && user.saved_squads?.length > 0) {
      setSavedSquads(user.saved_squads);
    }
    // Load booked slots
    Registration.filter({ tournament_id: tournament.id }).then(regs => {
      const taken = (regs || []).map(r => r.time_slot).filter(Boolean);
      setBookedSlots(taken);
    }).catch(() => {});
  }, []);

  const loadSavedSquad = (squad) => {
    const members = squad.members.slice(0, maxMembers);
    setTeamMembers(members);
    setTeamName(squad.squad_name);
    setTeamLogoUrl(squad.logo_url || "");
    setShowSavedSquads(false);
    if (members.length >= maxMembers) setStep(3);
  };

  const saveSquad = async () => {
    const newSquad = { squad_name: teamName, members: teamMembers, logo_url: teamLogoUrl || "" };
    const existing = (user.saved_squads || []).filter(s => s.squad_name !== teamName);
    await base44.auth.updateMe({ saved_squads: [...existing, newSquad] });
    alert("✅ Squad saved!");
  };

  const loadUserPhone = async () => {
    if (user.phone || user.mobile_number) {
      setPhoneNumber(user.phone || user.mobile_number);
    }
  };

  const loadCoinBalance = async () => {
    const accounts = await Diamond.filter({ user_id: user.id });
    if (accounts.length > 0) {
      setCoinBalance(accounts[0].bh_coin_balance || 0);
      setDiamondBalance(accounts[0].diamond_balance || 0);
    }
  };

  const validateUID = (uid) => {
    return uid && /^\d+$/.test(uid);
  };

  const nextStep = async () => {
    setError("");

    // Step 1 validation (IGN for Solo, Team Name for Duo/Squad)
    if (step === 1 && isSolo) {
      if (!currentMember.ign || currentMember.ign.length < 3) {
        setError("In-Game Name must be at least 3 characters");
        return;
      }
      setStep(2);
    } else if (step === 1 && !isSolo) {
      if (!teamName || teamName.length < 3) {
        setError("Team Name must be at least 3 characters");
        return;
      }
      if (!teamLogoUrl) {
        setError("Team Logo is required. Please upload a logo image.");
        return;
      }
      setStep(2);
    }

    // Step 2 validation (UID for Solo)
    else if (step === 2 && isSolo) {
      if (!validateUID(currentMember.uid)) {
        setError("Please enter a valid numeric UID");
        return;
      }
      
      // Check if UID already registered
      const allRegs = await Registration.list();
      const tournamentRegs = allRegs.filter(r => r.tournament_id === tournament.id);
      const uidUsed = tournamentRegs.some(reg => 
        reg.team_members?.some(tm => tm.uid === currentMember.uid)
      );
      
      if (uidUsed) {
        setError("This UID is already registered in this tournament");
        return;
      }
      
      setTeamMembers([{ ...currentMember, isLeader: true }]);
      setStep(3); // Phone step
    }
  };

  const addTeamMember = async () => {
    setError("");
    
    if (!currentMember.ign || currentMember.ign.length < 3) {
      setError("In-Game Name must be at least 3 characters");
      return;
    }
    
    if (!validateUID(currentMember.uid)) {
      setError("Please enter a valid numeric UID");
      return;
    }
    
    // Check duplicate UID in current team
    if (teamMembers.some(m => m.uid === currentMember.uid)) {
      setError("This UID is already added to your team");
      return;
    }
    
    // Check if UID already registered in tournament
    const allRegs = await Registration.list();
    const tournamentRegs = allRegs.filter(r => r.tournament_id === tournament.id);
    const uidUsed = tournamentRegs.some(reg => 
      reg.team_members?.some(tm => tm.uid === currentMember.uid)
    );
    
    if (uidUsed) {
      setError("This UID is already registered in this tournament");
      return;
    }
    
    setTeamMembers([...teamMembers, currentMember]);
    setCurrentMember({ ign: "", uid: "" });
    
    // Move to next step if all members added
    if (teamMembers.length + 1 >= maxMembers) {
      setStep(3);
    }
  };

  const handleFinalSubmit = async () => {
    const isFree = requiredCoins === 0;
    const canPayWithBH = isFree || coinBalance >= requiredCoins;
    const canPayWithDiamond = isFree || diamondBalance >= requiredCoins;
    
    if (!isFree && !canPayWithBH && !canPayWithDiamond) {
      setError(`Insufficient balance! Need ${requiredCoins} BH Coins or ${requiredCoins} Diamonds`);
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    if (!isFree && !paymentMethod) {
      setError("Please select payment method");
      return;
    }
    const effectivePaymentMethod = isFree ? "Free" : paymentMethod;

    if (!confirmed) {
      setError("Please confirm that the details are correct");
      return;
    }

    setSubmitting(true);

      if (!selectedSlot) {
        setError("Please select a time slot");
        setSubmitting(false);
        return;
      }

    // Check if user already registered
    const allTournRegs = await Registration.filter({ tournament_id: tournament.id }).catch(() => []);
    if (allTournRegs.some(r => r.team_leader_id === user.id)) {
      setError("You have already registered for this tournament!");
      setSubmitting(false);
      return;
    }

    const finalMembers = isSolo ? teamMembers : teamMembers.map((m, i) => ({
      ...m,
      isLeader: i === teamHeadIndex
    }));

    const leaderMember = finalMembers.find(m => m.isLeader) || finalMembers[0] || { ign: user.ign || user.full_name, uid: user.game_uid || "" };

    // CRITICAL STEP: create the registration. Only this failing means registration failed.
    try {
      await Registration.create({
        tournament_id: tournament.id,
        tournament_title: tournament.title,
        team_name: isSolo ? (user.ign || user.full_name) : teamName,
        team_leader_id: user.id,
        team_leader_ign: user.ign || user.full_name,
        team_leader_uid: leaderMember.uid || "",
        team_leader_phone: phoneNumber,
        team_members: finalMembers,
        time_slot: selectedSlot,
        payment_status: "Paid",
        payment_method: effectivePaymentMethod,
        status: "Registered",
        team_logo_url: teamLogoUrl || ""
      });
    } catch (error) {
      console.error("Registration error:", error);
      setError(`Registration failed: ${error.message || error}`);
      setSubmitting(false);
      return;
    }

    // Registration succeeded — everything below is best-effort and must NOT block success.
    try {
      // Fetch fresh count to avoid stale data
      const freshRegs = await Registration.filter({ tournament_id: tournament.id }).catch(() => []);
      await Tournament.update(tournament.id, {
        current_teams: freshRegs.length
      });
    } catch (e) { console.error("Tournament count update failed", e); }

    try {
      await User.updateMyUserData({
        total_matches: (user.total_matches || 0) + 1
      });
    } catch (e) { console.error("User update failed", e); }

    try {
      // Handle referral rewards
      const pendingReferrals = await Referral.filter({
        referred_user_id: user.id,
        status: "Pending"
      });

      if (pendingReferrals.length > 0) {
        const referral = pendingReferrals[0];
        const rewardAmount = referral.reward_amount || 5;

        await Referral.update(referral.id, {
          status: "Completed",
          tournament_played: tournament.id,
          reward_credited: true
        });

        const referrerAccounts = await Diamond.filter({ user_id: referral.referrer_id });
        const now = new Date().toISOString();

        if (referrerAccounts.length > 0) {
          const refAcc = referrerAccounts[0];
          await Diamond.update(refAcc.id, {
            bh_coin_balance: (refAcc.bh_coin_balance || 0) + rewardAmount,
            transactions: [...(refAcc.transactions || []), {
              type: "Win",
              coin_type: "BH Coin",
              amount: rewardAmount,
              description: `🎁 Referral Reward — ${user.ign || user.full_name} joined tournament`,
              timestamp: now
            }]
          });
        }
      }
    } catch (e) { console.error("Referral reward failed", e); }

    try {
      // Deduct coins based on payment method (skip for free tournaments)
      if (!isFree && requiredCoins > 0) {
        const accounts = await Diamond.filter({ user_id: user.id });
        if (accounts.length > 0) {
          const account = accounts[0];
          const now = new Date().toISOString();
          const updateData = {
            transactions: [
              ...(account.transactions || []),
              {
                type: "Tournament Entry",
                coin_type: effectivePaymentMethod,
                amount: -requiredCoins,
                description: `Entered ${tournament.title}`,
                timestamp: now
              }
            ]
          };
          if (effectivePaymentMethod === "BH Coin") {
            updateData.bh_coin_balance = (account.bh_coin_balance || 0) - requiredCoins;
          } else if (effectivePaymentMethod === "Diamond") {
            updateData.diamond_balance = (account.diamond_balance || 0) - requiredCoins;
          }
          await Diamond.update(account.id, updateData);
        }
      }
    } catch (e) { console.error("Coin deduction failed", e); }

    try {
      // Upsert TeamProfile so team history is tracked
      const membersWithKills = finalMembers.map(m => ({ ign: m.ign, uid: m.uid, isLeader: !!m.isLeader, kills: 0 }));
      const existing = await TeamProfile.filter({ team_leader_id: user.id });
      if (existing.length > 0) {
        await TeamProfile.update(existing[0].id, {
          team_name: isSolo ? (user.ign || user.full_name) : teamName,
          team_logo_url: teamLogoUrl || existing[0].team_logo_url,
          members: membersWithKills,
          tournaments_played: (existing[0].tournaments_played || 0) + 1
        });
      } else {
        await TeamProfile.create({
          team_name: isSolo ? (user.ign || user.full_name) : teamName,
          team_leader_id: user.id,
          team_leader_ign: user.ign || user.full_name,
          team_logo_url: teamLogoUrl || "",
          members: membersWithKills,
          tournaments_played: 1,
          total_kills: 0, total_points: 0, wins: 0
        });
      }
    } catch (e) { console.error("TeamProfile upsert failed", e); }

    // Auto-generate initials logo if no logo provided (for squad/duo)
    let finalLogoUrl = teamLogoUrl;
    if (!isSolo && !teamLogoUrl) {
      try {
        const initials = teamName.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
        const canvas = document.createElement("canvas");
        canvas.width = 100; canvas.height = 100;
        const ctx = canvas.getContext("2d");
        const grad = ctx.createLinearGradient(0, 0, 100, 100);
        grad.addColorStop(0, "#7c3aed");
        grad.addColorStop(1, "#0891b2");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(50, 50, 50, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 36px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials, 50, 50);
        finalLogoUrl = canvas.toDataURL("image/png");
      } catch (e) { console.error("Logo gen failed", e); }
    }

    // Show success modal
    const invoiceId = `BHFF-${Date.now().toString().slice(-8)}`;
    const displayTeamName = isSolo ? (user.ign || user.full_name) : teamName;
    setShowSuccessModal(true);
    setSuccessData({ teamName: displayTeamName, invoiceId, finalMembers, logoUrl: finalLogoUrl, payMethod: effectivePaymentMethod });
    setSubmitting(false);
  };

  const totalSteps = isSolo ? 6 : 7;

  return (
    <>
    <Dialog open={!showSuccessModal} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-gray-950 via-blue-950 to-black border-2 border-blue-500/30 text-gray-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {tournament.title}
          </DialogTitle>
          <div className="flex items-center justify-between mt-2">
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/50">
              Step {step} of {totalSteps}
            </Badge>
            <div className="flex flex-col gap-1 text-right">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">{coinBalance} BH🪙</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-300">{diamondBalance} 💎</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          {/* SOLO - Step 1: Enter IGN */}
          {isSolo && step === 1 && (
            <motion.div
              key="solo-step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-blue-500/30">
                <CardContent className="p-6 space-y-4">
                  <Label className="text-lg text-cyan-400">Enter Your In-Game Name</Label>
                  <Input
                    value={currentMember.ign}
                    onChange={(e) => setCurrentMember({ ...currentMember, ign: e.target.value })}
                    placeholder="Your Free Fire IGN"
                    className="bg-gray-800 border-gray-700 text-white text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500">Minimum 3 characters required</p>
                  <Button onClick={nextStep} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white font-bold py-6">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* SOLO - Step 2: Enter UID */}
          {isSolo && step === 2 && (
            <motion.div
              key="solo-step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-blue-500/30">
                <CardContent className="p-6 space-y-4">
                  <Label className="text-lg text-cyan-400">Enter Your Free Fire UID</Label>
                  <Input
                    value={currentMember.uid}
                    onChange={(e) => setCurrentMember({ ...currentMember, uid: e.target.value })}
                    placeholder="Enter numeric UID"
                    type="number"
                    className="bg-gray-800 border-gray-700 text-white text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500">Numeric UID only</p>
                  <div className="flex gap-3">
                    <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-gray-700">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button onClick={nextStep} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white font-bold">
                      Continue <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* SOLO - Step 3: Phone Number */}
          {isSolo && step === 3 && (
            <motion.div
              key="solo-step3-phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-blue-500/30">
                <CardContent className="p-6 space-y-4">
                  <Label className="text-lg text-cyan-400">Enter Your Mobile Number</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g., 919876543210"
                    type="tel"
                    maxLength={12}
                    className="bg-gray-800 border-gray-700 text-white text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500">With country code (e.g., 91 for India)</p>
                  <div className="flex gap-3">
                    <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-gray-700">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!phoneNumber || phoneNumber.length < 10) {
                          setError("Enter valid phone number");
                          return;
                        }
                        setError("");
                        setStep(4);
                      }} 
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white font-bold"
                    >
                      Continue <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* SOLO - Step 4: Choose Time Slot */}
          {isSolo && step === 4 && (
            <SlotPicker key="solo-slot" selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} maxSlots={maxSlots} bookedSlots={bookedSlots} setError={setError} onBack={() => setStep(3)} onNext={() => { if (!selectedSlot) { setError("Please select a time slot"); return; } setError(""); setStep(5); }} />
          )}

          {/* SOLO - Step 5: Payment Method (auto-skip if free) */}
          {isSolo && step === 5 && requiredCoins === 0 && (() => { setTimeout(() => { setPaymentMethod("Free"); setStep(6); }, 50); return null; })()}
          {isSolo && step === 5 && requiredCoins > 0 && (
            <motion.div
              key="solo-step5-payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-blue-500/30">
                <CardContent className="p-6 space-y-4">
                  <Label className="text-lg text-cyan-400">Select Payment Method</Label>
                  <p className="text-sm text-gray-400">Entry Fee: {requiredCoins}</p>
                  
                  <div className="space-y-3">
                    <div
                      onClick={() => coinBalance >= requiredCoins && setPaymentMethod("BH Coin")}
                      className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                        paymentMethod === "BH Coin"
                          ? 'bg-yellow-900/50 border-yellow-500'
                          : coinBalance >= requiredCoins
                            ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                            : 'bg-gray-800/30 border-gray-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold">BH Coin</p>
                          <p className="text-sm text-gray-400">Balance: {coinBalance}</p>
                        </div>
                        {coinBalance < requiredCoins && (
                          <Badge className="bg-red-500/20 text-red-400">Insufficient</Badge>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={() => diamondBalance >= requiredCoins && setPaymentMethod("Diamond")}
                      className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                        paymentMethod === "Diamond"
                          ? 'bg-cyan-900/50 border-cyan-500'
                          : diamondBalance >= requiredCoins
                            ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                            : 'bg-gray-800/30 border-gray-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold">Diamond 💎</p>
                          <p className="text-sm text-gray-400">Balance: {diamondBalance}</p>
                        </div>
                        {diamondBalance < requiredCoins && (
                          <Badge className="bg-red-500/20 text-red-400">Insufficient</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setStep(4)} variant="outline" className="flex-1 border-gray-700">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!paymentMethod) {
                          setError("Select payment method");
                          return;
                        }
                        setError("");
                        setStep(6);
                      }}
                      disabled={!paymentMethod}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white font-bold"
                    >
                      Continue <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* SOLO - Step 6: Confirmation */}
          {isSolo && step === 6 && (
            <motion.div
              key="solo-step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-green-500/30">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Confirm Your Details
                  </h3>
                  <div className="space-y-3 bg-gray-800/50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">In-Game Name</p>
                      <p className="text-white font-semibold">{teamMembers[0]?.ign}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Game UID</p>
                      <p className="text-cyan-400 font-mono">{teamMembers[0]?.uid}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone Number</p>
                      <p className="text-white font-mono">{phoneNumber}</p>
                    </div>
                    <div className="pt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-500">Entry Fee</p>
                      <p className="text-yellow-400 font-bold text-xl">{requiredCoins} {paymentMethod === "Diamond" ? "💎" : "BH🪙"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1"
                    />
                    <Label className="text-gray-300 text-sm cursor-pointer">
                      I confirm that the UID and In-Game Name belong to me
                    </Label>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setStep(5)} variant="outline" className="flex-1 border-gray-700">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button 
                      onClick={handleFinalSubmit} 
                      disabled={!confirmed || submitting}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white font-bold"
                    >
                      {submitting ? "Registering..." : "Confirm & Register"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* DUO/SQUAD - Step 1: Team Name */}
          {!isSolo && step === 1 && (
            <motion.div
              key="team-step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-blue-500/30">
                <CardContent className="p-6 space-y-4">
                  <Label className="text-lg text-cyan-400">Enter Team Name</Label>
                  <Input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Your team name"
                    className="bg-gray-800 border-gray-700 text-white text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500">Must be unique in this tournament</p>
                  <Label className="text-sm text-cyan-300 mt-2">
                    Team Logo <span className="text-red-400">*</span> <span className="text-gray-500 text-xs">(required)</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed transition-all ${
                        teamLogoUrl ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-gray-600 bg-gray-800/60 hover:border-cyan-500/50'
                      }`}>
                        {logoUploading ? (
                          <><div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /><span className="text-cyan-400 text-sm">Uploading...</span></>
                        ) : teamLogoUrl ? (
                          <><span className="text-green-400 text-sm">✅ Logo uploaded — click to change</span></>
                        ) : (
                          <><span className="text-gray-400 text-sm">📁 Click to upload team logo</span></>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          setLogoUploading(true);
                          try {
                            const { file_url } = await UploadFile({ file });
                            setTeamLogoUrl(file_url);
                          } catch (err) {
                            setError("Logo upload failed. Please try again.");
                          } finally {
                            setLogoUploading(false);
                          }
                        }}
                      />
                    </label>
                    {teamLogoUrl && (
                      <img src={teamLogoUrl} alt="Team Logo" className="w-16 h-16 object-cover rounded-lg border-2 border-cyan-500/50 flex-shrink-0" onError={(e) => e.target.style.display='none'} />
                    )}
                  </div>

                  {savedSquads.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowSavedSquads(!showSavedSquads)}
                        className="text-cyan-400 text-sm underline"
                      >
                        👥 {showSavedSquads ? "Hide" : "Use Saved Squad"}
                      </button>
                      {showSavedSquads && (
                        <div className="mt-2 space-y-2">
                          {savedSquads.map((squad, i) => (
                            <div key={i} className="p-3 bg-gray-800/70 rounded-lg border border-cyan-500/30 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {squad.logo_url ? (
                                  <img src={squad.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-600 flex-shrink-0" onError={e => e.target.style.display='none'} />
                                ) : null}
                                <div className="min-w-0">
                                  <p className="text-white font-bold text-sm truncate">{squad.squad_name}</p>
                                  <p className="text-xs text-gray-400 truncate">{squad.members.map(m => m.ign).join(", ")}</p>
                                </div>
                              </div>
                              <Button size="sm" onClick={() => loadSavedSquad(squad)} className="bg-cyan-600 text-xs flex-shrink-0">
                                Use
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Button onClick={nextStep} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white font-bold py-6">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* DUO/SQUAD - Step 2: Add Members - registering user is auto team head (member 1) */}
          {!isSolo && step === 2 && (
            <motion.div
              key="team-step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-blue-500/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg text-cyan-400">Add Team Members</Label>
                    <Badge className="bg-purple-500/20 text-purple-400">
                      {teamMembers.length}/{maxMembers} Added
                    </Badge>
                  </div>

                  {/* Already added members */}
                  {teamMembers.length > 0 && (
                    <div className="space-y-2">
                      {teamMembers.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-800/70 rounded-lg border border-green-500/30">
                          <div>
                            <p className="text-white font-semibold">{m.ign}</p>
                            <p className="text-xs text-cyan-400">UID: {m.uid}</p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new member */}
                  {teamMembers.length < maxMembers && (
                    <>
                      <div className="space-y-3 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <Label className="text-white">Member {teamMembers.length + 1}</Label>
                        <Input
                          value={currentMember.ign}
                          onChange={(e) => setCurrentMember({ ...currentMember, ign: e.target.value })}
                          placeholder="In-Game Name"
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        <Input
                          value={currentMember.uid}
                          onChange={(e) => setCurrentMember({ ...currentMember, uid: e.target.value })}
                          placeholder="Free Fire UID (numeric)"
                          type="number"
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        <Button onClick={addTeamMember} className="w-full bg-blue-600 hover:bg-blue-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Member
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3">
                    <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-gray-700">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    {teamMembers.length >= maxMembers && (
                      <Button onClick={() => setStep(3)} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90">
                        Continue <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* DUO/SQUAD - Step 3: Phone Number */}
          {!isSolo && step === 3 && (
            <motion.div
              key="team-step3-phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-blue-500/30">
                <CardContent className="p-6 space-y-4">
                  <Label className="text-lg text-cyan-400">Enter Team Leader's Mobile Number</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g., 919876543210"
                    type="tel"
                    maxLength={12}
                    className="bg-gray-800 border-gray-700 text-white text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500">With country code for WhatsApp notifications</p>
                  <div className="flex gap-3">
                    <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-gray-700">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!phoneNumber || phoneNumber.length < 10) {
                          setError("Enter valid phone number");
                          return;
                        }
                        setError("");
                        setStep(4);
                      }}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white font-bold"
                    >
                      Continue <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* DUO/SQUAD - Step 4: Choose Time Slot */}
          {!isSolo && step === 4 && (
            <SlotPicker key="team-slot" selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} maxSlots={maxSlots} bookedSlots={bookedSlots} setError={setError} onBack={() => setStep(3)} onNext={() => { if (!selectedSlot) { setError("Please select a time slot"); return; } setError(""); setStep(5); }} />
          )}

          {/* DUO/SQUAD - Step 5: Team Head */}
          {!isSolo && step === 5 && (
            <motion.div
              key="team-step5-autoskip"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
              onAnimationComplete={() => setStep(6)}
            >
              <Card className="bg-gray-900/50 border-yellow-500/30">
                <CardContent className="p-6 text-center">
                  <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                  <p className="text-yellow-400 font-bold">You are the Team Head!</p>
                  <p className="text-gray-400 text-sm">The player registering is automatically the Team Head. Proceeding...</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* DUO/SQUAD - Step 6: Payment Method (auto-skip if free) */}
          {!isSolo && step === 6 && requiredCoins === 0 && (() => { setTimeout(() => { setPaymentMethod("Free"); setStep(7); }, 50); return null; })()}
          {!isSolo && step === 6 && requiredCoins > 0 && (
            <motion.div
              key="team-step6-payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-blue-500/30">
                <CardContent className="p-6 space-y-4">
                  <Label className="text-lg text-cyan-400">Select Payment Method</Label>
                  <p className="text-sm text-gray-400">Entry Fee: {requiredCoins}</p>
                  
                  <div className="space-y-3">
                    <div
                      onClick={() => coinBalance >= requiredCoins && setPaymentMethod("BH Coin")}
                      className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                        paymentMethod === "BH Coin"
                          ? 'bg-yellow-900/50 border-yellow-500'
                          : coinBalance >= requiredCoins
                            ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                            : 'bg-gray-800/30 border-gray-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold">BH Coin</p>
                          <p className="text-sm text-gray-400">Balance: {coinBalance}</p>
                        </div>
                        {coinBalance < requiredCoins && (
                          <Badge className="bg-red-500/20 text-red-400">Insufficient</Badge>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={() => diamondBalance >= requiredCoins && setPaymentMethod("Diamond")}
                      className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                        paymentMethod === "Diamond"
                          ? 'bg-cyan-900/50 border-cyan-500'
                          : diamondBalance >= requiredCoins
                            ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                            : 'bg-gray-800/30 border-gray-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold">Diamond 💎</p>
                          <p className="text-sm text-gray-400">Balance: {diamondBalance}</p>
                        </div>
                        {diamondBalance < requiredCoins && (
                          <Badge className="bg-red-500/20 text-red-400">Insufficient</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setStep(5)} variant="outline" className="flex-1 border-gray-700">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!paymentMethod) {
                          setError("Select payment method");
                          return;
                        }
                        setError("");
                        setStep(7);
                      }}
                      disabled={!paymentMethod}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white font-bold"
                    >
                      Continue <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* DUO/SQUAD - Step 7: Final Review */}
          {!isSolo && step === 7 && (
            <motion.div
              key="team-step7"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-green-500/30">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Confirm Team Registration
                  </h3>
                  
                  <div className="space-y-3 bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      {teamLogoUrl && (
                        <img src={teamLogoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-cover border-2 border-cyan-500/50 flex-shrink-0" onError={e => e.target.style.display='none'} />
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Team Name</p>
                        <p className="text-white font-semibold text-lg">{teamName}</p>
                      </div>
                    </div>
                    <div className="border-t border-gray-700 pt-3">
                      <p className="text-xs text-gray-500 mb-2">Team Members</p>
                      {teamMembers.map((m, i) => (
                        <div key={i} className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-white font-semibold">{m.ign}</p>
                            <p className="text-xs text-cyan-400">UID: {m.uid}</p>
                          </div>
                          {i === teamHeadIndex && (
                            <Badge className="bg-yellow-500/20 text-yellow-400">
                              <Crown className="w-3 h-3 mr-1" />
                              Team Head
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-700 pt-3">
                      <p className="text-xs text-gray-500">Team Leader Phone</p>
                      <p className="text-white font-mono">{phoneNumber}</p>
                    </div>
                    <div className="border-t border-gray-700 pt-3">
                      <p className="text-xs text-gray-500">Entry Fee</p>
                      <p className="text-yellow-400 font-bold text-2xl">{requiredCoins} {paymentMethod === "Diamond" ? "💎" : "BH🪙"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1"
                    />
                    <Label className="text-gray-300 text-sm cursor-pointer">
                      I confirm that all details are correct and belong to our team
                    </Label>
                  </div>

                  <button
                    type="button"
                    onClick={saveSquad}
                    className="w-full py-2.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    💾 Save this Squad (for future use)
                  </button>

                  <div className="flex gap-3">
                    <Button onClick={() => setStep(6)} variant="outline" className="flex-1 border-gray-700">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button 
                      onClick={handleFinalSubmit} 
                      disabled={!confirmed || submitting}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white font-bold"
                    >
                      {submitting ? "Registering..." : "Confirm & Register"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {coinBalance < requiredCoins && diamondBalance < requiredCoins && (
          <Alert className="bg-orange-500/10 border-orange-500/20">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <AlertDescription className="text-orange-400">
              Insufficient balance! Need {requiredCoins} BH Coins or Diamonds
              <Link to={createPageUrl("Wallet")} className="underline ml-1">Add coins</Link>
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>

    {showSuccessModal && successData && (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 overflow-y-auto">
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border-2 border-green-500/60 rounded-2xl max-w-sm w-full text-center shadow-2xl overflow-hidden my-4">
          {/* Green header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white/30">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white">Registration Confirmed!</h2>
            <p className="text-green-100 text-sm mt-1">{tournament.title}</p>
          </div>

          <div className="p-5 space-y-4">
            {/* Invoice details */}
            <div className="bg-gray-800/80 rounded-xl p-4 text-left space-y-2.5 border border-gray-700">
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-gray-400 text-xs">Invoice ID</span>
                <span className="text-cyan-400 font-mono text-xs font-bold">#{successData.invoiceId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Player / Team</span>
                <div className="flex items-center gap-2">
                  {successData.logoUrl && (
                    <img src={successData.logoUrl} alt="logo" className="w-7 h-7 rounded object-cover border border-gray-600" onError={e => e.target.style.display='none'} />
                  )}
                  <span className="text-white text-xs font-bold">{successData.teamName}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Tournament</span>
                <span className="text-white text-xs">{tournament.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Mode</span>
                <span className="text-white text-xs">{tournament.mode}</span>
              </div>
              <div className="border-t border-gray-700 pt-2">
                <p className="text-gray-400 text-xs mb-1">Team Members</p>
                {(successData.finalMembers || teamMembers).map((m, i) => (
                  <p key={i} className="text-white text-xs">{i+1}. {m.ign} | UID: {m.uid}{m.isLeader ? " 👑" : ""}</p>
                ))}
              </div>
              <div className="flex justify-between items-center border-t border-gray-700 pt-2">
                <span className="text-gray-400 text-xs">Entry Fee Paid</span>
                <span className="text-yellow-400 font-black">{requiredCoins === 0 ? "FREE" : `${requiredCoins} ${(successData?.payMethod || paymentMethod) === "Diamond" ? "💎" : "🪙"}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Status</span>
                <span className="text-green-400 text-xs font-bold">PAID & CONFIRMED ✅</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Phone</span>
                <span className="text-white text-xs">{phoneNumber}</span>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
              <p className="text-xs text-yellow-300">📢 Room ID & Password will be shared 10 minutes before match starts!</p>
            </div>

            {/* Download Invoice Button */}
            <RegistrationInvoiceDownload 
              registration={{
                id: successData.invoiceId.replace("#BHFF-", ""),
                team_name: successData.teamName,
                team_logo: successData.logoUrl,
                team_members: successData.finalMembers || teamMembers,
                team_leader_id: user?.id,
                status: "PAID & CONFIRMED ✅",
                created_date: new Date().toISOString()
              }} 
              tournament={{
                ...tournament,
                entry_fee: requiredCoins === 0 ? "Free" : `${requiredCoins} ${(successData?.payMethod || paymentMethod) === "Diamond" ? "💎" : "🪙"}`
              }}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              variant="outline"
              size="lg"
            />

            <button
              onClick={() => { setShowSuccessModal(false); onSuccess(); }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl text-base"
            >
              🎮 Done — Let's Go!
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}