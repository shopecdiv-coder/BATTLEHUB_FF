import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { Diamond } from "@/entities/Diamond";
import { User } from "@/entities/User";
import { BanRecord } from "@/entities/BanRecord";
import { Referral } from "@/entities/Referral";
import { TeamProfile } from "@/entities/TeamProfile";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Squad } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { SendEmail } from "@/api/integrations";
import { sendBrevoEmail } from "@/utils/brevoEmail";
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
import emailjs from '@emailjs/browser';
import { Users, Plus, X, AlertTriangle, Coins, ArrowRight, ArrowLeft, CheckCircle, Crown, Trophy, ShieldCheck, KeyRound, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function MatchLiveCountdown({ matchTimeStr }) {

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isLive: false });

  useEffect(() => {
    let parsedIso = matchTimeStr;
    if (parsedIso && typeof parsedIso === 'object') {
      parsedIso = parsedIso.date_time || parsedIso.match_time || parsedIso.start_time || null;
    }
    const d = parsedIso ? new Date(parsedIso) : null;
    const targetDate = (d && !isNaN(d.getTime())) ? d : new Date(Date.now() + 90 * 60 * 1000);

    const updateTimer = () => {
      const now = new Date();
      const diffMs = targetDate - now;

      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isLive: true });
      } else {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isLive: false });
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [matchTimeStr]);

  if (timeLeft.isLive) {
    return (
      <div className="bg-gradient-to-r from-red-950/80 via-amber-950/60 to-red-950/80 border border-red-500/50 rounded-xl p-3 text-center shadow-lg animate-pulse">
        <div className="flex items-center justify-center gap-2 text-red-400 font-black text-xs uppercase tracking-wider mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          🚨 MATCH IS LIVE NOW!
        </div>
        <p className="text-[11px] text-slate-200 font-semibold">
          Room ID & Password unlocked! Enter game immediately.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/40 rounded-xl p-3 text-center shadow-md space-y-2">
      <div className="flex items-center justify-center gap-1.5 text-amber-400 font-extrabold text-[11px] uppercase tracking-wider">
        <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
        <span>MATCH STARTS IN</span>
      </div>

      {/* Digital Countdown Timer Box */}
      <div className="flex items-center justify-center gap-2 py-1">
        <div className="bg-slate-950/90 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-center min-w-[50px]">
          <span className="text-amber-400 font-black text-lg font-mono leading-none block">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[8px] text-slate-400 font-bold uppercase block mt-0.5">HOURS</span>
        </div>
        <span className="text-amber-400 font-black text-base">:</span>
        <div className="bg-slate-950/90 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-center min-w-[50px]">
          <span className="text-amber-400 font-black text-lg font-mono leading-none block">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[8px] text-slate-400 font-bold uppercase block mt-0.5">MINS</span>
        </div>
        <span className="text-amber-400 font-black text-base">:</span>
        <div className="bg-slate-950/90 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-center min-w-[50px]">
          <span className="text-amber-400 font-black text-lg font-mono leading-none block">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[8px] text-slate-400 font-bold uppercase block mt-0.5">SECS</span>
        </div>
      </div>

      <p className="text-[10px] text-slate-300 font-medium">
        📢 Room ID & Password will be shared <span className="text-amber-400 font-bold">10 minutes</span> before match starts!
      </p>
    </div>
  );
}

const playPaymentSuccessSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Harmonic Note 1: E5 (659.25 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Harmonic Note 2: G#5 (830.61 Hz)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.08);
    gain2.gain.setValueAtTime(0.35, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);

    // Harmonic Note 3: B5 (987.77 Hz - Bright High Chime)
    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(987.77, now + 0.16);
    gain3.gain.setValueAtTime(0.4, now + 0.16);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    osc3.connect(gain3);
    gain3.connect(audioCtx.destination);
    osc3.start(now + 0.16);
    osc3.stop(now + 0.85);
  } catch (err) {
    console.log("Audio play blocked", err);
  }
};

export default function StepByStepRegistration({ tournament, user, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState("");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentMember, setCurrentMember] = useState({ ign: "", uid: "" });
  const [teamHeadIndex] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [policyDrawer, setPolicyDrawer] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const maxSlots = tournament.max_slots || 12;
  const [submitting, setSubmitting] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [diamondBalance, setDiamondBalance] = useState(0);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [animatingSuccess, setAnimatingSuccess] = useState(true);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (showSuccessModal) {
      setAnimatingSuccess(true);
      playPaymentSuccessSound();
      const timer = setTimeout(() => {
        setAnimatingSuccess(false);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [savedSquads, setSavedSquads] = useState([]);
  const [showSavedSquads, setShowSavedSquads] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [logoUploading, setLogoUploading] = useState(false);
  const [createdRegistration, setCreatedRegistration] = useState(null);
  const maxTournamentTeams = Math.max(1, Number(tournament?.max_teams) || 32);
  const [isSlotsFull, setIsSlotsFull] = useState(false);


  const modeLower = (tournament.mode || "").toLowerCase();
  const maxMembers = modeLower.includes("solo") ? 1 : modeLower.includes("duo") ? 2 : 4;
  const requiredCoins = tournament.entry_fee || 0;
  const isSolo = modeLower.includes("solo");


  const hasSquadFromUser = !isSolo && Boolean(user?.squad_id || user?.squad_name || user?.team_name);
  const [squadLoading, setSquadLoading] = useState(!isSolo && Boolean(user?.squad_id || user?.squad_name));

  React.useEffect(() => {
    loadCoinBalance();
    loadUserPhone();

    const loadSquadFromDB = async () => {
      if (isSolo) {
        if (user.ign && (user.game_uid || user.game_id || user.uid)) {
          setTeamMembers([{ ign: user.ign, uid: user.game_uid || user.game_id || user.uid, isLeader: true, avatar_url: user.avatar_url || user.avatar || user.dp || user.photoURL }]);
        }
        setSquadLoading(false);
        return;
      }

      let allSquads = [];

      if (user?.squad_id) {
        try {
          // Parallel single-trip fetch for Squad & Members
          const [sq, sqUsers] = await Promise.all([
            Squad.get(user.squad_id).catch(() => null),
            User.filter({ squad_id: user.squad_id }).catch(() => [])
          ]);

          if (sq) {
            const mappedMembers = [];
            const leaderUid = sq.leader_uid || sq.leader_id;
            const leader = sqUsers.find(u => u.id === leaderUid || u.uid === leaderUid) || 
              (user.id === leaderUid || user.uid === leaderUid ? user : sqUsers[0]);
            
            if (leader) {
              mappedMembers.push({
                ign: leader.ign || leader.full_name || user.ign,
                uid: leader.game_id || leader.game_uid || leader.uid || "",
                isLeader: true,
                avatar_url: leader.avatar_url || leader.avatar || leader.dp || leader.photoURL
              });
            }

            sqUsers.forEach(u => {
              const uUid = u.game_id || u.game_uid || u.uid || "";
              const leaderUidVal = leader ? (leader.game_id || leader.game_uid || leader.uid || "") : "";
              if (u.id !== leader?.id && uUid !== leaderUidVal && mappedMembers.length < maxMembers) {
                mappedMembers.push({
                  ign: u.ign || u.full_name || "Member",
                  uid: uUid,
                  isLeader: false,
                  avatar_url: u.avatar_url || u.avatar || u.dp || u.photoURL
                });
              }
            });

            if (mappedMembers.length === 0 && user.ign) {
              mappedMembers.push({
                ign: user.ign,
                uid: user.game_uid || user.game_id || user.uid || "",
                isLeader: true,
                avatar_url: user.avatar_url || user.avatar || user.dp || user.photoURL
              });
            }

            const officialSquad = {
              squad_name: sq.name,
              logo_url: sq.logo_url,
              members: mappedMembers
            };
            allSquads.push(officialSquad);

            setTeamName(sq.name || "");
            if (sq.logo_url) setTeamLogoUrl(sq.logo_url);
            setTeamMembers(mappedMembers);
          }
        } catch (err) {
          console.error("Failed to load official squad from DB", err);
        }
      } else {
        if (user.ign && (user.game_uid || user.game_id || user.uid)) {
          setTeamMembers([{ ign: user.ign, uid: user.game_uid || user.game_id || user.uid, isLeader: true, avatar_url: user.avatar_url || user.avatar || user.dp || user.photoURL }]);
        }
      }

      setSavedSquads(allSquads);
      setSquadLoading(false);
    };

    loadSquadFromDB();

    Registration.filter({ tournament_id: tournament.id }).then(regs => {
      const allRegs = regs || [];
      const taken = allRegs.map(r => r.time_slot).filter(Boolean);
      setBookedSlots(taken);
      if (allRegs.length >= maxTournamentTeams) {
        setIsSlotsFull(true);
        setError(`🚫 Registration is Full: All ${maxTournamentTeams} team slots have already been filled.`);
      }
    }).catch(() => {});
  }, [tournament.id, maxTournamentTeams]);

  // Fetch avatar URLs for squad members missing profile pics
  React.useEffect(() => {
    if (!teamMembers || teamMembers.length === 0) return;
    const missing = teamMembers.filter(m => !m.avatar_url && !m.avatar && !m.dp && !m.photoURL && !m.image);
    if (missing.length === 0) return;

    let isMounted = true;
    const fetchAvatars = async () => {
      try {
        const updated = await Promise.all(teamMembers.map(async (m) => {
          if (m.avatar_url || m.avatar || m.dp || m.photoURL || m.image) return m;

          if (user && (m.uid === (user.game_uid || user.game_id || user.uid) || m.ign === user.ign || m.isLeader)) {
            const userDp = user.avatar_url || user.avatar || user.dp || user.photoURL;
            if (userDp) return { ...m, avatar_url: userDp };
          }

          let foundUser = null;
          if (m.uid) {
            const byUid = await User.filter({ game_uid: m.uid }).catch(() => []);
            if (byUid && byUid.length > 0) foundUser = byUid[0];
            else {
              const byUid2 = await User.filter({ game_id: m.uid }).catch(() => []);
              if (byUid2 && byUid2.length > 0) foundUser = byUid2[0];
            }
          }
          if (!foundUser && m.ign) {
            const byIgn = await User.filter({ ign: m.ign }).catch(() => []);
            if (byIgn && byIgn.length > 0) foundUser = byIgn[0];
          }

          if (foundUser) {
            const dp = foundUser.avatar_url || foundUser.avatar || foundUser.dp || foundUser.photoURL;
            if (dp) return { ...m, avatar_url: dp };
          }
          return m;
        }));

        if (isMounted) {
          const changed = updated.some((m, idx) => m.avatar_url !== teamMembers[idx]?.avatar_url);
          if (changed) {
            setTeamMembers(updated);
          }
        }
      } catch (e) {}
    };

    fetchAvatars();
    return () => { isMounted = false; };
  }, [teamMembers.map(m => m.uid || m.ign).join(",")]);


  const loadSavedSquad = (squad) => {
    const members = squad.members.slice(0, maxMembers);
    setTeamMembers(members);
    setTeamName(squad.squad_name);
    setTeamLogoUrl(squad.logo_url || "");
    setShowSavedSquads(false);
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
    if (isSlotsFull) {
      setError(`🚫 Tournament is full! All ${maxTournamentTeams} team slots have been booked. Registration cannot proceed.`);
      return;
    }
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

    const effectivePhone = phoneNumber || user.phone || user.mobile_number || "N/A";
    const effectiveSlot = selectedSlot || "Auto-Assigned";
    const effectivePaymentMethod = isFree ? "Free" : (paymentMethod || "BH Coin");

    if (!isFree && !paymentMethod) {
      setError("Please select payment method");
      return;
    }
    if (!isSolo && teamMembers.length < maxMembers) {
      setError(`Registration error: Exactly ${maxMembers} members are required for ${tournament.mode || "Squad"} mode (${teamMembers.length}/${maxMembers} added).`);
      return;
    }


    setSubmitting(true);

    // 1. Strict real-time capacity check against tournament max_teams
    const allTournRegs = await Registration.filter({ tournament_id: tournament.id }).catch(() => []);
    const maxAllowedTeams = Math.max(1, Number(tournament?.max_teams) || 32);

    if (allTournRegs.length >= maxAllowedTeams) {
      setError(`🚫 Registration is full! All ${maxAllowedTeams} team slots have already been filled. No more registrations can be accepted.`);
      setIsSlotsFull(true);
      setSubmitting(false);
      return;
    }

    // 2. Check if user already registered
    if (allTournRegs.some(r => r.team_leader_id === user.id)) {
      setError("You have already registered for this tournament!");
      setSubmitting(false);
      return;
    }

    const rawMembers = isSolo ? teamMembers : teamMembers.map((m, i) => ({
      ...m,
      isLeader: i === teamHeadIndex
    }));

    const finalMembers = await Promise.all(rawMembers.map(async (m) => {
      if (m.avatar_url || m.avatar || m.dp || m.photoURL) return m;
      if (user && (m.uid === (user.game_uid || user.game_id || user.uid) || m.ign === user.ign || m.isLeader)) {
        const uDp = user.avatar_url || user.avatar || user.dp || user.photoURL;
        if (uDp) return { ...m, avatar_url: uDp };
      }
      try {
        const mUid = m.uid || m.game_id;
        let foundU = null;
        if (mUid) {
          const byUid = await User.filter({ game_uid: mUid }).catch(() => []);
          if (byUid && byUid.length > 0) foundU = byUid[0];
          else {
            const byUid2 = await User.filter({ game_id: mUid }).catch(() => []);
            if (byUid2 && byUid2.length > 0) foundU = byUid2[0];
          }
        }
        if (!foundU && m.ign) {
          const byIgn = await User.filter({ ign: m.ign }).catch(() => []);
          if (byIgn && byIgn.length > 0) foundU = byIgn[0];
        }
        if (foundU) {
          const dp = foundU.avatar_url || foundU.avatar || foundU.dp || foundU.photoURL;
          if (dp) return { ...m, avatar_url: dp };
        }
      } catch (e) {}
      return m;
    }));

    const leaderMember = finalMembers.find(m => m.isLeader) || finalMembers[0] || { ign: user.ign || user.full_name, uid: user.game_uid || "" };

    let createdRegObj = null;
    try {
      createdRegObj = await Registration.create({
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
      setCreatedRegistration(createdRegObj);

      // Trigger automatic SES Email for Registration Success
      if (user?.email) {
        try {
          const emailSubject = `Registration Confirmed - ${tournament.title}`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; background: #0f0f11; color: #ffffff; border-radius: 12px; border: 1px solid #333;">
              <h2 style="color: #f59e0b; text-align: center; margin-bottom: 20px;">🏆 BATTLEHUB REGISTRATION SUCCESS</h2>
              <p style="font-size: 16px;">Hello <b>${user.ign || user.full_name}</b>,</p>
              <p style="font-size: 15px; color: #cbd5e1;">Your registration for <b>${tournament.title}</b> is confirmed!</p>
              
              <div style="background: #1e1e24; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 5px 0;"><b>Mode:</b> ${tournament.mode || "Squad"}</p>
                <p style="margin: 5px 0;"><b>Map:</b> ${tournament.map || "Bermuda"}</p>
                <p style="margin: 5px 0;"><b>Match Date:</b> ${tournament.date_time ? new Date(tournament.date_time).toLocaleString() : "TBA"}</p>
              </div>
              
              <p style="font-size: 14px; color: #94a3b8;">Room ID and Password will be shared inside the app before the match starts.</p>
              <p style="font-size: 14px; color: #94a3b8; margin-top: 20px;">Best of Luck,<br/><b>BattleHub Esports Team</b></p>
            </div>
          `;
          await SendEmail({ 
            to: user.email, 
            subject: emailSubject, 
            html: emailHtml 
          });
        } catch (emailErr) {
          console.warn("Failed to queue email:", emailErr);
        }
      }

      // Instantly persist to localStorage so any page refresh keeps registration intact
      try {
        const tIdStr = String(tournament.id || "");
        const cId = user ? String(user.id || "") : "";
        const cUid = user ? String(user.uid || "") : "";
        if (cId) localStorage.setItem(`user_reg_${tIdStr}_${cId}`, JSON.stringify(createdRegObj));
        if (cUid && cUid !== cId) localStorage.setItem(`user_reg_${tIdStr}_${cUid}`, JSON.stringify(createdRegObj));
        localStorage.setItem(`user_reg_${tIdStr}_last`, JSON.stringify(createdRegObj));
      } catch (e) {}

      // Immediately create TournamentLeaderboard entry so team is in standings on refresh
      try {
        const uniqueId = `BH${String(user.id || "").replace(/-/g, "").slice(-8).toUpperCase()}`;
        const membersWithKills = (finalMembers || []).map(m => ({ ...m, kills: 0 }));
        await TournamentLeaderboard.create({
          tournament_id: tournament.id,
          tournament_title: tournament.title,
          user_id: user.id,
          unique_id: uniqueId,
          team_name: isSolo ? (user.ign || user.full_name) : teamName,
          player_ign: leaderMember.ign || user.ign || user.full_name,
          player_uid: leaderMember.uid || "",
          team_members: membersWithKills,
          team_logo_url: teamLogoUrl || "",
          kills: 0, wins: 0, points: 0, rank: 0, placement: 0,
          registration_time: new Date().toISOString(),
          is_finalized: false
        }).catch(() => {});
      } catch (e) {
        console.error("Leaderboard entry creation sync failed:", e);
      }

      // Notify parent component immediately of new registration
      if (onSuccess) {
        try {
          onSuccess(createdRegObj);
        } catch (e) {}
      }
      
      try {
        await User.addXP(user.id, 50);
      } catch (e) {
        console.error("Failed to add registration XP:", e);
      }
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
      if (user.email && user.email.trim()) {
        const invoiceId = `BHFF-${tournament.id?.slice(-4)?.toUpperCase()}-${user.id?.slice(-4)?.toUpperCase()}`;
        const matchDate = tournament.date_time ? new Date(tournament.date_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "TBD";
        const membersList = finalMembers.map((m, i) => `  ${i+1}. ${m.ign} (UID: ${m.uid})${m.isLeader ? " [IGL]" : ""}`).join("\n");
        
        const isQualified = /semi|final|grand/i.test(tournament.title);
        const headerTitle = isQualified ? "🌟 QUALIFICATION CONFIRMED" : "🏆 REGISTRATION CONFIRMED";
        const greetingText = isQualified 
          ? `Congratulations! Your team has officially qualified for <strong>${tournament.title}</strong>!`
          : `You have successfully registered for <strong>${tournament.title}</strong>!`;

        const htmlBody = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);">
  <div style="background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); padding: 40px 20px; text-align: center;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee96b6cabd2c2d7af587d0/08567b05d_bf31fa0a1_logo.png" alt="BATTLEHUB FF" style="width: 90px; height: 90px; object-fit: cover; margin-bottom: 15px; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.4); border: 3px solid rgba(255,255,255,0.2);" />
    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.4); text-transform: uppercase;">BATTLEHUB FF</h1>
    <p style="margin: 12px 0 0 0; color: #e0f2fe; font-size: 17px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${headerTitle}</p>
  </div>
  <div style="padding: 35px 25px;">
    <p style="font-size: 17px; line-height: 1.6; margin-top: 0; color: #e2e8f0;">Hi <strong style="color: #38bdf8;">${user.ign || user.full_name}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">${greetingText}</p>
    <div style="background-color: #1e293b; border-radius: 10px; padding: 25px; margin: 30px 0; border-left: 5px solid #38bdf8; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <h3 style="margin: 0 0 15px 0; color: #38bdf8; font-size: 19px; border-bottom: 1px solid #334155; padding-bottom: 12px; display: flex; align-items: center;">📋 Official Entry Invoice</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
        <tr><td style="padding: 10px 0; color: #94a3b8; width: 40%;">Invoice No:</td><td style="padding: 10px 0; font-weight: 600; color: #f8fafc;">${invoiceId}</td></tr>
        <tr><td style="padding: 10px 0; color: #94a3b8;">Match Date:</td><td style="padding: 10px 0; font-weight: 600; color: #f8fafc;">${matchDate}</td></tr>
        <tr><td style="padding: 10px 0; color: #94a3b8;">Game Mode:</td><td style="padding: 10px 0; font-weight: 600; color: #f8fafc;">${tournament.mode || 'N/A'}</td></tr>
        <tr><td style="padding: 10px 0; color: #94a3b8;">Team Name:</td><td style="padding: 10px 0; font-weight: 600; color: #f8fafc;">${isSolo ? (user.ign || user.full_name) : teamName}</td></tr>
      </table>
    </div>
    <div style="background-color: #1e293b; border-radius: 10px; padding: 25px; margin: 30px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <h3 style="margin: 0 0 15px 0; color: #a78bfa; font-size: 19px; border-bottom: 1px solid #334155; padding-bottom: 12px;">👥 Registered Squad</h3>
      <pre style="font-family: inherit; margin: 0; color: #cbd5e1; white-space: pre-wrap; font-size: 15px; line-height: 1.7;">${membersList}</pre>
    </div>
    <div style="background-color: #451a03; border-radius: 10px; padding: 20px; border: 1px solid #78350f; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
      <p style="margin: 0; color: #fde047; font-size: 15px; font-weight: 700; display: flex; align-items: center;">⚠️ IMPORTANT GUIDELINES:</p>
      <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #fef08a; font-size: 14px; line-height: 1.6;">
        <li><strong>Room ID & Password</strong> will be shared via app pop-up <strong>10 minutes</strong> before the match.</li>
        <li>Ensure your in-game IGN exactly matches the registered IGN. Any mismatch will result in kicking from the room.</li>
      </ul>
    </div>
  </div>
  <div style="background-color: #020617; padding: 25px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #1e293b;">
    <p style="margin: 0;">© ${new Date().getFullYear()} <strong style="color: #94a3b8;">BattleHub FF</strong>. All rights reserved.</p>
    <p style="margin: 6px 0 0 0;">India's Premium Esports Tournament Platform</p>
  </div>
</div>`;

        await sendBrevoEmail({
          to_email: user.email,
          to_name: user.ign || user.full_name || 'Player',
          subject: `${headerTitle} — ${tournament.title} | BattleHub FF`,
          htmlContent: htmlBody
        });
      }
    } catch (e) { console.error("Automatic email failed", e); }

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

        await Referral.update(referral.id, {
          status: "Completed",
          tournament_played: tournament.id
        });
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

      // Permanently save to User profile saved_squads
      if (!isSolo) {
        const newSquad = { squad_name: teamName, members: finalMembers, logo_url: teamLogoUrl || "" };
        const existingSquads = user.saved_squads || [];
        if (!existingSquads.some(s => s.squad_name === teamName)) {
          await User.updateMyUserData({
            saved_squads: [...existingSquads, newSquad]
          }).catch(() => {});
        }
      }
    } catch (e) { console.error("TeamProfile & Squad save failed", e); }

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

  const displayTotalSteps = 2;
  const displayStep = step === 7 ? 2 : 1;

  return (
    <>
    <Dialog open={!showSuccessModal} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border border-slate-800 text-slate-100 max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-2xl">
        <DialogHeader className="pb-2 border-b border-slate-800/80 pt-3">
          <DialogTitle className="text-xl font-bold text-white tracking-wide text-center pt-2 px-8">
            {tournament.title}
          </DialogTitle>
          <div className="flex items-center justify-between mt-3">
            <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-bold px-2.5 py-1 rounded-md">
              Step {displayStep} of {displayTotalSteps}
            </Badge>
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                <Coins className="w-3.5 h-3.5" />
                <span>{coinBalance} BH🪙</span>
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

        <AnimatePresence mode="popLayout">
          {/* SOLO - Step 1: Enter IGN */}
          {isSolo && step === 1 && (
            <motion.div
              key="solo-step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="space-y-4"
            >
              <Card className="bg-gray-900/50 border-orange-500/30">
                <CardContent className="p-6 space-y-4">
                  <Label className="text-lg text-cyan-400">Enter Your In-Game Name</Label>
                  <Input
                    value={currentMember.ign}
                    onChange={(e) => setCurrentMember({ ...currentMember, ign: e.target.value })}
                    placeholder="Your Game IGN"
                    className="bg-gray-800 border-gray-700 text-white text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500">Minimum 3 characters required</p>
                  <Button onClick={nextStep} className="w-full bg-gradient-to-r from-cyan-500 to-orange-500 hover:opacity-90 text-white font-bold py-6">
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
              <Card className="bg-gray-900/50 border-orange-500/30">
                <CardContent className="p-6 space-y-4">
                  <Label className="text-lg text-cyan-400">Enter Your Game UID</Label>
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
                    <Button onClick={nextStep} className="flex-1 bg-gradient-to-r from-cyan-500 to-orange-500 hover:opacity-90 text-white font-bold">
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
              <Card className="bg-gray-900/50 border-orange-500/30">
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
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-orange-500 hover:opacity-90 text-white font-bold"
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
              <Card className="bg-gray-900/50 border-orange-500/30">
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
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-orange-500 hover:opacity-90 text-white font-bold"
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
                  
                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-gray-700">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button 
                      onClick={handleFinalSubmit} 
                      disabled={submitting}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white font-bold"
                    >
                      {submitting ? "Registering..." : "Confirm & Register"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* DUO/SQUAD - Step 1: Official Squad Holographic Entry Pass */}
          {!isSolo && step === 1 && (savedSquads.length > 0 || hasSquadFromUser || squadLoading) && (
            <motion.div
              key="team-step1-readonly"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="space-y-4"
            >
              {/* Holographic Entry Pass Card */}
              <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 p-4 shadow-2xl overflow-hidden">
                {/* Background Accent Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

                {squadLoading && teamMembers.length === 0 ? (
                  /* Sleek Pulsing Skeleton Loader for Team Data */
                  <div className="space-y-4 animate-pulse">
                    {/* Team Info Banner Skeleton */}
                    <div className="flex items-center gap-3.5 bg-slate-950/90 p-3.5 rounded-xl border border-slate-800">
                      <div className="w-14 h-14 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0" />
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="h-5 w-40 bg-slate-800 rounded-md" />
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-20 bg-slate-800/60 rounded-md" />
                          <div className="h-4 w-24 bg-slate-800/60 rounded-md" />
                        </div>
                      </div>
                    </div>

                    {/* Squad Roster Grid Skeleton */}
                    <div className="space-y-2 pt-1">
                      <div className="h-3 w-32 bg-slate-800/60 rounded" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-10 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-slate-800/80" />
                              <div className="h-3.5 w-24 bg-slate-800/80 rounded" />
                            </div>
                            <div className="h-3 w-16 bg-slate-800/60 rounded" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Primary Button Skeleton */}
                    <div className="h-12 w-full bg-amber-500/20 border border-amber-500/40 rounded-xl" />
                  </div>
                ) : (
                  <>
                    {/* Team Info Banner */}
                    <div className="flex items-center gap-3.5 bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 shadow-inner">
                      {teamLogoUrl ? (
                        <img src={teamLogoUrl} alt="Team Logo" className="w-14 h-14 rounded-xl object-cover border-2 border-amber-500/50 flex-shrink-0 shadow-md" onError={(e) => e.target.style.display='none'} />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 border-2 border-amber-400 flex items-center justify-center font-black text-slate-950 text-xl flex-shrink-0 shadow-md">
                          {(teamName || user?.squad_name || user?.team_name || "T").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-black text-base truncate tracking-wide">{teamName || user?.squad_name || user?.team_name || "Official Squad"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                            {tournament.mode || "Squad"} Mode
                          </span>
                          <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                            {teamMembers.length} Members
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Squad Roster Grid */}
                    <div className="mt-3.5 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">ACTIVE TEAM MEMBERS</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {teamMembers.map((m, idx) => {
                          const avatarSrc = m.avatar_url || m.avatar || m.dp || m.photoURL || m.photo || m.image || m.logo_url || 
                            ((m.isLeader || idx === 0 || m.uid === (user?.game_uid || user?.game_id || user?.uid) || m.ign === user?.ign) ? (user?.avatar_url || user?.avatar || user?.dp || user?.photoURL) : null);

                          return (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                {avatarSrc ? (
                                  <img 
                                    src={avatarSrc} 
                                    alt={m.ign} 
                                    className="w-6 h-6 rounded-lg object-cover border border-amber-500/40 shrink-0 shadow-sm" 
                                    onError={(e) => { e.target.style.display = 'none'; }} 
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                                    {m.ign?.charAt(0).toUpperCase() || (idx + 1)}
                                  </div>
                                )}
                                <span className="font-bold text-slate-200 truncate">{m.ign}</span>
                                {(m.isLeader || idx === 0) && (
                                  <span className="text-[9px] font-extrabold text-amber-400 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 rounded-md shrink-0 flex items-center gap-0.5">
                                    👑 IGL
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-400 font-mono text-[10px] shrink-0 ml-1">UID: {m.uid}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>


                    {/* Incomplete Roster Warning Banner */}
                    {!isSolo && teamMembers.length < maxMembers && (
                      <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-400">
                        <span className="font-bold flex items-center gap-1.5">
                          ⚠️ Team Incomplete ({teamMembers.length}/{maxMembers} Players)
                        </span>
                        <span className="text-[10px] text-slate-300 font-medium bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          Need {maxMembers - teamMembers.length} More
                        </span>
                      </div>
                    )}

                    {/* Primary Action Button */}
                    <div className="mt-4">
                      <Button 
                        onClick={() => {
                          if (!isSolo && teamMembers.length < maxMembers) {
                            onClose();
                            window.dispatchEvent(new CustomEvent('openSquadsDrawer'));
                            return;
                          }
                          setError("");
                          setPaymentMethod(requiredCoins === 0 ? "Free" : "BH Coin");
                          setStep(7);
                        }} 
                        className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:opacity-95 text-slate-950 font-black py-5 text-sm rounded-xl shadow-xl shadow-orange-500/20 tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        {!isSolo && teamMembers.length < maxMembers 
                          ? `Add ${maxMembers - teamMembers.length} More Player(s) in My Teams ➔` 
                          : "Proceed to Registration ➔"
                        }
                      </Button>
                    </div>
                  </>
                )}

              </div>
            </motion.div>
          )}

          {/* DUO/SQUAD - Step 1: Redirect to Profile if NO Saved Squad Exists */}
          {!isSolo && step === 1 && !squadLoading && savedSquads.length === 0 && !hasSquadFromUser && (
            <motion.div
              key="team-step1-nosquad"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <Card className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/40 rounded-2xl overflow-hidden shadow-2xl shadow-amber-950/20 relative">
                {/* Background Ambient Glows */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Header Banner */}
                <div className="bg-slate-950/80 px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-amber-400 font-black text-xs uppercase tracking-widest">SQUAD REQUIRED</span>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                    Action Needed
                  </Badge>
                </div>

                <CardContent className="p-6 space-y-5 text-center relative z-10">
                  {/* Esports Squad Badge */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-2xl rotate-6 animate-pulse" />
                    <div className="relative w-full h-full rounded-2xl bg-slate-900 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xl">
                      <Users className="w-10 h-10 text-amber-400 drop-shadow-md" />
                    </div>
                  </div>

                  {/* Professional English Content */}
                  <div className="space-y-2">
                    <h3 className="text-white font-black text-lg tracking-tight">Create Your Official Squad</h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto font-medium">
                      To participate in squad tournaments, you must first set up an official team roster. Head over to <strong className="text-amber-400">Hub ➔ Your Team</strong> to register your team, then return here for instant 1-click entry.
                    </p>

                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2.5">
                    <Button
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('openSquadsDrawer'));
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-black py-5 text-sm rounded-xl shadow-lg shadow-orange-500/25 tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      Create Official Squad <ArrowRight className="w-4 h-4" />
                    </Button>


                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="w-full border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs h-10 rounded-xl"
                    >
                      Cancel & Return
                    </Button>
                  </div>
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
              <Card className="bg-gray-900/50 border-orange-500/30">
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
                      <div className="space-y-3 p-4 bg-blue-900/20 border border-orange-500/30 rounded-lg">
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
                          placeholder="Game UID (numeric)"
                          type="number"
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        <Button onClick={addTeamMember} className="w-full bg-orange-600 hover:bg-blue-700">
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
                      <Button onClick={() => setStep(3)} className="flex-1 bg-gradient-to-r from-cyan-500 to-orange-500 hover:opacity-90">
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
              <Card className="bg-gray-900/50 border-orange-500/30">
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
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-orange-500 hover:opacity-90 text-white font-bold"
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

          {/* Step 6: Payment Method (BH Coin Only) */}
          {step === 6 && requiredCoins > 0 && (
            <motion.div
              key="step6-payment"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <Card className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-white font-bold text-base">Select Payment Method</h4>
                    <p className="text-xs text-slate-400">Entry Fee: <span className="text-amber-400 font-bold">{requiredCoins} BH Coins</span></p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold px-2.5 py-1">
                    {requiredCoins} BH Coins
                  </Badge>
                </div>

                {/* BH Coin Payment Card */}
                <div
                  onClick={() => coinBalance >= requiredCoins && setPaymentMethod("BH Coin")}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border-2 flex items-center justify-between ${
                    paymentMethod === "BH Coin"
                      ? 'bg-amber-500/10 border-amber-500/80 shadow-md shadow-amber-500/5'
                      : coinBalance >= requiredCoins
                        ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm flex items-center gap-2">
                        BH Coin Wallet
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-semibold">Active</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Available Balance: <strong className="text-amber-400">{coinBalance} BH Coins</strong></p>
                    </div>
                  </div>
                  
                  {coinBalance < requiredCoins ? (
                    <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px]">
                      Insufficient
                    </Badge>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-amber-500 border border-amber-400 flex items-center justify-center text-slate-950 font-black text-xs shrink-0">
                      ✓
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-1">
                  <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-slate-700 text-slate-300 text-xs h-10">
                    <ArrowLeft className="mr-1.5 w-3.5 h-3.5" /> Back
                  </Button>
                  <Button 
                    onClick={() => {
                      if (coinBalance < requiredCoins) {
                        setError("Insufficient BH Coin balance");
                        return;
                      }
                      setPaymentMethod("BH Coin");
                      setError("");
                      setStep(7);
                    }}
                    disabled={coinBalance < requiredCoins}
                    className="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:opacity-90 text-slate-950 font-black text-xs h-10 uppercase tracking-wider shadow-lg shadow-orange-500/20"
                  >
                    Continue ➔
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* DUO/SQUAD - Step 7: Final Review */}
          {/* DUO/SQUAD - Step 7: Final Review & Coin Payment */}
          {!isSolo && step === 7 && (
            <motion.div
              key="team-step7"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="space-y-3"
            >
              <Card className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <CardContent className="p-4 space-y-3.5">
                  <h3 className="text-base font-bold text-emerald-400 flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      {requiredCoins > 0 ? "Payment & Registration Summary" : "Confirm Team Registration"}
                    </span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold">
                      Step 2 of 2
                    </Badge>
                  </h3>
                  
                  {/* Team & Roster Summary */}
                  <div className="space-y-2.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800/90 text-xs">
                    <div className="flex items-center gap-3">
                      {teamLogoUrl ? (
                        <img src={teamLogoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-amber-500/40 flex-shrink-0" onError={e => e.target.style.display='none'} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-sm flex-shrink-0">
                          {teamName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-slate-400 font-medium">Squad Name</p>
                        <p className="text-white font-bold text-sm truncate">{teamName}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 pt-2 space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verified Squad Roster</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {teamMembers.map((m, i) => (
                          <div key={i} className="flex items-center justify-between py-1 px-2 bg-slate-900/60 rounded-md border border-slate-800/60 text-[11px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-white truncate">{m.ign}</span>
                              {i === teamHeadIndex && (
                                <span className="text-[9px] text-amber-400 font-bold bg-amber-500/20 px-1 py-0.2 rounded shrink-0">
                                  👑 IGL
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">UID: {m.uid}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Agreement Confirmation Checkbox */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 cursor-pointer" onClick={() => setConfirmed(!confirmed)}>
                    <input
                      type="checkbox"
                      id="agree-rules-check"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer shrink-0 accent-amber-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label htmlFor="agree-rules-check" className="text-slate-300 text-[11px] leading-snug cursor-pointer select-none">
                      I agree to the{' '}
                      <span className="text-amber-400 font-semibold underline underline-offset-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPolicyDrawer('rules'); }}>Tournament Rules</span>
                      {' '}&{' '}
                      <span className="text-amber-400 font-semibold underline underline-offset-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPolicyDrawer('refund'); }}>Refund Policy</span>
                    </label>
                  </div>

                  {/* Full-Screen Policy Drawer */}
                  <AnimatePresence>
                    {policyDrawer && (
                      <motion.div
                        key="policy-drawer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="fixed inset-0 bg-slate-950 z-[300] flex flex-col h-full w-full overflow-hidden"
                      >
                        {/* Full-Screen Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
                          <h4 className="text-white font-extrabold text-base flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-amber-400" />
                            {policyDrawer === 'rules' ? 'Official Tournament Rules & Guidelines' : 'Official Refund Policy'}
                          </h4>
                          <button 
                            onClick={() => setPolicyDrawer(null)} 
                            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Full-Screen Content */}
                        <div className="flex-1 overflow-y-auto px-5 py-6 text-sm text-slate-300 space-y-5 leading-relaxed max-w-2xl mx-auto w-full">
                          {policyDrawer === 'rules' ? (
                            <>
                              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2.5 shadow-lg">
                                <p className="text-xs text-amber-400 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                                  📌 1. General Rules & Requirements
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs">
                                  <li>In-Game Name (IGN) & UID must <strong className="text-white font-bold">strictly match</strong> your registered Free Fire profile.</li>
                                  <li>All team members must be ready and join the match room on time. Late entries will not be accommodated.</li>
                                  <li>Match Room ID & Password will be published <strong className="text-white font-bold">15 minutes</strong> prior to scheduled match time.</li>
                                </ul>
                              </div>

                              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2.5 shadow-lg">
                                <p className="text-xs text-red-400 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                                  🚫 2. Fair Play & Anti-Cheat Policy
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs">
                                  <li>Use of any hacks, emulators (unless explicitly permitted), scripts, or third-party tools will result in <strong className="text-red-400 font-bold">immediate disqualification & permanent account ban</strong>.</li>
                                  <li>Teaming up with opposing players or match-fixing is strictly prohibited.</li>
                                  <li>Abusive language or misconduct towards admins or competitors will lead to an instant match forfeiture.</li>
                                </ul>
                              </div>

                              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2.5 shadow-lg">
                                <p className="text-xs text-emerald-400 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                                  🏆 3. Match Results & Prize Distribution
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs">
                                  <li>Tournament Admin decisions regarding match scores, disputes, and penalties are <strong className="text-white font-bold">final and binding</strong>.</li>
                                  <li>Prize money / coins will be credited directly to winning players' wallets within 24-48 hours post match verification.</li>
                                </ul>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2.5 shadow-lg">
                                <p className="text-xs text-amber-400 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                                  💳 1. Entry Fee Non-Refundability
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs">
                                  <li>Entry coins deducted upon successful tournament registration are <strong className="text-red-400 font-bold">strictly non-refundable</strong>.</li>
                                  <li>Player absence, late entry, or team withdrawal after registration confirmation will <strong className="text-white font-bold">not</strong> be eligible for a refund.</li>
                                </ul>
                              </div>

                              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2.5 shadow-lg">
                                <p className="text-xs text-emerald-400 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                                  ✅ 2. System Refunds & Exceptions
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs">
                                  <li>If a tournament is <strong className="text-emerald-400 font-bold">cancelled by BattleHub Management</strong>, 100% of your entry fee will be instantly refunded back to your wallet.</li>
                                  <li>If a match is cancelled due to technical server crashes, admins will reschedule or initiate an automated refund.</li>
                                </ul>
                              </div>

                              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2.5 shadow-lg">
                                <p className="text-xs text-blue-400 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                                  📞 3. Support & Dispute Queries
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs">
                                  <li>For any transaction issues or tournament support, reach out via the Help & Support section within <strong className="text-white font-bold">24 hours</strong>.</li>
                                </ul>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Full-Screen Footer */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900/90 shrink-0 max-w-2xl mx-auto w-full">
                          <Button 
                            onClick={() => setPolicyDrawer(null)} 
                            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 font-black text-xs h-11 rounded-xl uppercase tracking-wider shadow-lg shadow-orange-500/20"
                          >
                            Close & Return to Registration
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2 mt-1">
                    <Button 
                      onClick={() => setStep(1)} 
                      variant="outline" 
                      className="flex-1 bg-slate-800 hover:bg-slate-700 border-slate-700 text-white font-bold text-xs h-11 rounded-xl transition-all shadow-md"
                    >
                      <ArrowLeft className="mr-1.5 w-4 h-4 text-slate-300" /> Back
                    </Button>
                    <Button 
                      onClick={handleFinalSubmit} 
                      disabled={!confirmed || submitting || (requiredCoins > 0 && coinBalance < requiredCoins)}
                      className={`flex-1 font-black text-xs h-11 rounded-xl uppercase tracking-wider transition-all shadow-lg ${
                        confirmed && (!requiredCoins || coinBalance >= requiredCoins)
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:opacity-95 text-slate-950 shadow-orange-500/25'
                          : 'bg-amber-500/30 text-amber-200/60 border border-amber-500/30 cursor-not-allowed'
                      }`}
                    >
                      {submitting ? "Processing..." : requiredCoins > 0 ? `Pay ${requiredCoins} BH🪙 & Confirm` : "Confirm & Register"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {coinBalance < requiredCoins && diamondBalance < requiredCoins && (
          <Alert className="bg-orange-600/10 border-orange-600/20">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <AlertDescription className="text-orange-500">
              Insufficient balance! Need {requiredCoins} BH Coins or Diamonds
              <Link to={createPageUrl("Wallet")} className="underline ml-1">Add coins</Link>
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>

    {showSuccessModal && successData && (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {animatingSuccess ? (
            /* Phase 1: Original Paytm / PhonePe Style Animated Green Tick */
            <motion.div
              key="paytm-animation"
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="flex flex-col items-center justify-center text-center p-8 space-y-4"
            >
              {/* Outer Glowing Green Circle with Ripple */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 bg-emerald-500/25 rounded-full animate-ping" />
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.05 }}
                  className="w-24 h-24 bg-gradient-to-tr from-emerald-600 to-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/50 z-10 border-4 border-emerald-300/40"
                >
                  <svg className="w-14 h-14 text-white stroke-current" fill="none" viewBox="0 0 24 24">
                    <motion.path 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.45, ease: "easeOut", delay: 0.15 }}
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={3.5} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                </motion.div>
              </div>
              
              <div className="space-y-1 pt-2">
                <h2 className="text-2xl font-black text-white tracking-wide">Payment Successful!</h2>
                <p className="text-emerald-400 font-semibold text-sm">Registration Confirmed 🎉</p>
              </div>
            </motion.div>
          ) : (
            /* Phase 2: Final Clean Receipt Card */
            <motion.div 
              key="receipt-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl max-w-sm w-full text-center shadow-2xl overflow-hidden my-4"
            >
              {/* Compact Green Header */}
              <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 px-5 py-4 text-center">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1 border-2 border-white/40">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-black text-white tracking-wide">Registration Confirmed!</h2>
                <p className="text-emerald-100 text-xs font-medium truncate">{tournament.title}</p>
              </div>

              <div className="p-4 space-y-3">
                {/* Clean Receipt details with Squad Name & Registered Players */}
                <div className="bg-slate-900/90 rounded-xl p-3 text-left space-y-2.5 border border-slate-800 text-xs">
                  {/* Squad Name */}
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400 font-medium">Squad / Team</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {successData.logoUrl && (
                        <img src={successData.logoUrl} alt="logo" className="w-5 h-5 rounded object-cover border border-slate-700 shrink-0" onError={e => e.target.style.display='none'} />
                      )}
                      <span className="text-amber-400 font-extrabold text-xs truncate max-w-[160px]">{successData.teamName}</span>
                    </div>
                  </div>

                  {/* Registered Players List */}
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registered Players</p>
                    <div className="space-y-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800/60">
                      {(successData.finalMembers || teamMembers).map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] text-slate-200">
                          <span className="font-semibold text-white truncate max-w-[130px]">
                            {i + 1}. {m.ign} {m.isLeader ? "👑" : ""}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">UID: {m.uid}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Entry Fee Paid */}
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 font-medium">Entry Fee Paid</span>
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      {requiredCoins === 0 ? "FREE" : `${requiredCoins} BH Coins`}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
                    <span className="text-slate-400 font-medium">Status</span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      PAID & CONFIRMED ✅
                    </Badge>
                  </div>
                </div>

                {/* Real-time Match Start Countdown Timer */}
                <MatchLiveCountdown matchTimeStr={tournament?.date_time || tournament?.match_time} />

                {/* Action Buttons */}
                <div className="space-y-2">
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
                      entry_fee: requiredCoins === 0 ? "Free" : `${requiredCoins} BH Coins`
                    }}
                    className="w-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                    variant="outline"
                    size="md"
                  />

                  <button
                    onClick={() => { setShowSuccessModal(false); if (onSuccess) onSuccess(createdRegistration); }}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
                  >
                    Done — Let's Go!
                  </button>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )}
    </>
  );
}