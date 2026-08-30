import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Tournament } from "@/entities/Tournament";
import { Registration } from "@/entities/Registration";
import { User } from "@/entities/User";
import { Match } from "@/entities/Match";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Report } from "@/entities/Report";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/api/firebaseClient";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, Users, Trophy, MapPin, ArrowLeft, Clock, 
  DollarSign, ScrollText, Flag, Key, Edit, Save, AlertTriangle, ChevronDown, ChevronUp, MessageCircle, Image, X, User as UserIcon, ArrowRight, Download, Gamepad2, CheckCircle2, Ticket, Sparkles, Loader2, Share2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import StepByStepRegistration, { MatchLiveCountdown } from "../components/tournament/StepByStepRegistration";
import RegistrationInvoiceDownload from "../components/tournament/RegistrationInvoiceDownload";
import MatchList from "../components/tournament/MatchList";
import RegistrationCloseTimer from "../components/RegistrationCloseTimer";
import TournamentChat from "../components/tournament/TournamentChat";
import TournamentChatFullscreen from "../components/tournament/TournamentChatFullscreen";
import InviteManager, { SendInvitePanel } from "../components/tournament/InviteSystem";
import SquadsDrawer from "@/components/profile/v2/SquadsDrawer";
import { generateTournamentPDF } from "../components/tournament/TournamentPDFReport";



export default function TournamentDetail() {
  const safeFormatDate = (dateString) => {
    if (!dateString) return "TBD";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "TBD";
      return format(d, "PPP p");
    } catch (e) {
      return "TBD";
    }
  };

  const getRegCloseTime = (t) => {
    if (!t) return null;
    const explicit = t.registration_closes || t.registration_close_time || t.reg_close_date || t.registration_end_time;
    if (explicit) return explicit;
    
    const startIso = t.start_time || t.start_date || t.date_time;
    if (startIso) {
      const startD = new Date(startIso);
      if (!isNaN(startD.getTime())) {
        return new Date(startD.getTime() - 30 * 60 * 1000).toISOString();
      }
    }
    return null;
  };

  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const tournamentId = urlParams.get("id");

  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userRegistration, setUserRegistration] = useState(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [editingReg, setEditingReg] = useState(false);
  const [editIGN, setEditIGN] = useState("");
  const [editUID, setEditUID] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [roomUnlockTime, setRoomUnlockTime] = useState(null);
  const [prizeCollapsed, setPrizeCollapsed] = useState(false);
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [showPrizeImageModal, setShowPrizeImageModal] = useState(false);
  const [qualifiedRegistrations, setQualifiedRegistrations] = useState([]);
  
  // Target tournament states for move system
  const [sfATournament, setSfATournament] = useState(null);
  const [sfBTournament, setSfBTournament] = useState(null);
  const [gfTournament, setGfTournament] = useState(null);
  const [movingTeam, setMovingTeam] = useState(null); // { entry, stage, group }
  
  // Report states
  const [showReportModal, setShowReportModal] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  // Multi-Group Teams Filter States
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamGroupFilter, setTeamGroupFilter] = useState("all");
  const [activeStageFilter, setActiveStageFilter] = useState("qualifiers");

  // New states for Match Credentials directly on the page
  const [matchCredentials, setMatchCredentials] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    
    const q = query(
      collection(db, "player_messages"),
      where("tournament_id", "==", String(tournamentId))
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const possibleUserIds = new Set([
        user?.id,
        user?.uid,
        user?.game_id,
        userRegistration?.team_leader_id,
        userRegistration?.user_id,
        userRegistration?.id
      ].filter(Boolean).map(String));

      const relevantMsgs = msgs.filter(m => {
        if (!m.room_code && !m.message) return false;
        if (user?.role === "admin") return true;
        return possibleUserIds.has(String(m.recipient_id));
      });

      if (relevantMsgs.length > 0) {
        relevantMsgs.sort((a,b) => new Date(b.sent_at || 0).getTime() - new Date(a.sent_at || 0).getTime());
        setMatchCredentials(relevantMsgs[0]);
      } else if (tournament?.room_code) {
        setMatchCredentials({
          room_code: tournament.room_code,
          room_password: tournament.room_password || "",
          message: tournament.room_message || "Match Credentials released!"
        });
      } else {
        setMatchCredentials(null);
      }
    });
    
    return () => unsub();
  }, [user, userRegistration, tournamentId, tournament]);


  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-hide room credentials after 20 minutes
    if (tournament?.room_code && isRegistered) {
      if (!roomUnlockTime) {
        setRoomUnlockTime(new Date());
      }
      
      const checkInterval = setInterval(() => {
        if (roomUnlockTime) {
          const now = new Date();
          const diff = (now - new Date(roomUnlockTime)) / 1000 / 60; // minutes
          
          if (diff >= 20) {
            // Hide room credentials locally
            setTournament({...tournament, room_code: null, room_password: null});
            clearInterval(checkInterval);
          }
        }
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(checkInterval);
    }
  }, [tournament, isRegistered, roomUnlockTime]);

  const getGroupMatchTime = (groupNumber, userReg = null) => {
    if (userReg?.group_match_time && typeof userReg.group_match_time === 'string') {
      return userReg.group_match_time;
    }

    const gNum = parseInt(groupNumber) || 1;
    const groupIdx = Math.max(0, gNum - 1);
    const schedules = tournament?.group_schedules;

    if (schedules) {
      if (Array.isArray(schedules)) {
        const item = schedules.find(s => s && (s.group_index === groupIdx || s.group_name === `Group ${gNum}`)) || schedules[groupIdx];
        if (item) {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item.date_time && typeof item.date_time === 'string') return item.date_time;
        }
      } else if (typeof schedules === 'object') {
        const item = schedules[gNum] || schedules[`group_${gNum}`] || schedules[groupIdx];
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item.date_time && typeof item.date_time === 'string') return item.date_time;
      }
    }

    if (typeof tournament?.date_time === 'string' && tournament.date_time) return tournament.date_time;
    if (typeof tournament?.start_time === 'string' && tournament.start_time) return tournament.start_time;
    if (typeof tournament?.start_date === 'string' && tournament.start_date) return tournament.start_date;

    return null;
  };

  const loadData = async () => {
    try {
      const tIdStr = String(tournamentId || "");

      // 1. INSTANT LOCAL CACHE RESTORE (0ms initial render)
      try {
        const cachedTourney = localStorage.getItem(`t_cache_${tIdStr}`);
        if (cachedTourney) {
          const parsedT = JSON.parse(cachedTourney);
          if (parsedT && (parsedT.id === tIdStr || parsedT.id === tournamentId)) {
            setTournament(parsedT);
            setLoading(false);
          }
        }
      } catch (e) {}

      // Check localStorage for instant registration status restore on back navigation
      let localRegData = null;
      try {
        const possibleKeys = Object.keys(localStorage).filter(k => k.startsWith(`user_reg_${tIdStr}_`));
        for (const key of possibleKeys) {
          const rawLocal = localStorage.getItem(key);
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            if (parsed && parsed.tournament_id === tIdStr) {
              localRegData = parsed;
              setIsRegistered(true);
              setUserRegistration(parsed);
              setEditIGN(parsed.team_members?.[0]?.ign || parsed.team_leader_ign || "");
              setEditUID(parsed.team_members?.[0]?.uid || "");
              break;
            }
          }
        }
      } catch (e) {}

      // 2. High-speed parallel loading (Single direct doc fetch, no duplicate queries)
      const [currentUser, singleTournamentObj, allRegistrations, tournamentMatches, lbEntries] = await Promise.all([
        User.me().catch(() => null),
        Tournament.get(tournamentId).catch(() => null),
        Registration.filter({ tournament_id: tIdStr }).catch(() => []),
        Match.filter({ tournament_id: tournamentId }, "-match_number").catch(() => []),
        TournamentLeaderboard.filter({ tournament_id: tournamentId }, "rank").catch(() => [])
      ]);

      if (currentUser) setUser(currentUser);
      
      let currentTournament = singleTournamentObj;
      if (currentTournament) {
        setTournament(currentTournament);
        try {
          localStorage.setItem(`t_cache_${tIdStr}`, JSON.stringify(currentTournament));
        } catch (e) {}
      }

      setMatches(tournamentMatches || []);
      setLeaderboardEntries(lbEntries || []);

      // Merge all registration sources ONLY for this specific tournament
      const combinedRegs = (allRegistrations || []).filter(r => String(r.tournament_id || "") === String(tIdStr));
      
      if (localRegData && String(localRegData.tournament_id || "") === String(tIdStr) && !combinedRegs.some(r => r.id === localRegData.id)) {
        combinedRegs.push(localRegData);
      }

      // Also fetch user-specific registrations if user is logged in (filtered ONLY for this tournament)
      if (currentUser?.id) {
        try {
          const userRegsById = await Registration.filter({ team_leader_id: String(currentUser.id), tournament_id: String(tIdStr) }).catch(() => []);
          (userRegsById || []).forEach(ur => {
            if (String(ur.tournament_id || "") === String(tIdStr) && !combinedRegs.some(r => r.id === ur.id)) {
              combinedRegs.push(ur);
            }
          });
        } catch (e) {}
      }

      setRegistrations(combinedRegs);

      if (currentUser) {
        const cId = String(currentUser.id || "");
        const cUid = String(currentUser.uid || "");
        const cGameUid = String(currentUser.game_uid || "");
        const cGameId = String(currentUser.game_id || "");
        const cIgn = currentUser.ign ? currentUser.ign.toLowerCase() : "";

        // Search in BOTH Firestore results AND local state
        setRegistrations(currentRegs => {
          const searchIn = currentRegs;
          const userReg = searchIn.find(r => {
            const rTId = String(r.tournament_id || "");
            if (rTId && rTId !== tIdStr) return false;

            const lId = String(r.team_leader_id || r.user_id || "");
            const lUid = String(r.team_leader_uid || "");
            const lIgn = r.team_leader_ign ? r.team_leader_ign.toLowerCase() : "";

            if (lId && (lId === cId || lId === cUid)) return true;
            if (lUid && (lUid === cGameUid || lUid === cGameId || lUid === cUid || lUid === cId)) return true;
            if (lIgn && cIgn && lIgn === cIgn) return true;

            if (r.team_members && Array.isArray(r.team_members)) {
              return r.team_members.some(m => {
                const mUid = String(m.uid || m.game_id || "");
                const mIgn = m.ign ? m.ign.toLowerCase() : "";
                return (mUid && (mUid === cGameUid || mUid === cGameId || mUid === cUid || mUid === cId)) || (mIgn && cIgn && mIgn === cIgn);
              });
            }
            return false;
          });

          if (userReg) {
            setIsRegistered(true);
            setUserRegistration(userReg);
            setEditIGN(userReg.team_members?.[0]?.ign || userReg.team_leader_ign || "");
            setEditUID(userReg.team_members?.[0]?.uid || "");
            // Save to localStorage for instant restore on back navigation
            try {
              localStorage.setItem(`user_reg_${tIdStr}_${cId}`, JSON.stringify(userReg));
              if (cUid && cUid !== cId) localStorage.setItem(`user_reg_${tIdStr}_${cUid}`, JSON.stringify(userReg));
            } catch (e) {}
          }
          return searchIn;
        });
      }

      // Load existing target tournaments for move system (admin only) — only non-Completed
      if (currentUser && currentUser.role === "admin") {
        try {
          const sfAll = await Tournament.filter({ tournament_type: "Semifinal" }).catch(() => []);
          const gfAll = await Tournament.filter({ tournament_type: "Grand Final" }).catch(() => []);
          const openSf = sfAll.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
          const openGf = gfAll.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
          setSfATournament(openSf.find(t => t.semifinal_group === "A") || null);
          setSfBTournament(openSf.find(t => t.semifinal_group === "B") || null);
          setGfTournament(openGf?.[0] || null);
        } catch (e) { console.error("Admin move data load failed", e); }
      }
    } catch (error) {
      console.error("Error loading tournament details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSuccess = async (createdReg) => {
    setShowRegistrationModal(false);
    
    // IMMEDIATELY set registration state — this is the source of truth
    if (createdReg) {
      setIsRegistered(true);
      setUserRegistration(createdReg);
      setRegistrations(prev => {
        const filtered = prev.filter(r => r.id !== createdReg.id);
        return [createdReg, ...filtered];
      });

      const tIdStr = String(tournamentId || "");
      const cId = user ? String(user.id || user.uid || "") : "";
      try {
        if (cId) localStorage.setItem(`user_reg_${tIdStr}_${cId}`, JSON.stringify(createdReg));
      } catch (e) {}
    }

    // Wait a bit for Firestore to index the new document, then refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    await loadData();
  };


  const saveRegistrationEdit = async () => {
    if (!userRegistration || !editIGN || !editUID) return;
    setSavingEdit(true);
    try {
      const updatedMembers = userRegistration.team_members ? [...userRegistration.team_members] : [{ ign: "", uid: "" }];
      if (updatedMembers.length > 0) {
        updatedMembers[0] = { ign: editIGN, uid: editUID };
      }
      await Registration.update(userRegistration.id, {
        team_leader_ign: editIGN,
        team_members: updatedMembers
      });
      setEditingReg(false);
      await loadData();
      alert("✅ Details updated!");
    } catch (e) {
      console.error("Error:", e);
      alert("Failed to update");
    }
    setSavingEdit(false);
  };

  const submitReport = async (reportedTeam) => {
    if (!reportReason || !user) return;
    
    // Check if user is registered in this tournament
    if (!isRegistered) {
      alert("❌ You must be registered in this tournament to report teams!");
      setShowReportModal(null);
      return;
    }
    
    setSubmittingReport(true);
    try {
      await Report.create({
        reporter_id: user.id,
        reporter_ign: user.ign || user.full_name,
        reporter_email: user.email || '',
        
        // Detailed Reported Team Information
        reported_user_id: reportedTeam.user_id || reportedTeam.team_leader_id || '',
        reported_team_id: reportedTeam.id || '',
        reported_team_name: reportedTeam.team_name || reportedTeam.player_ign || reportedTeam.team_leader_ign || 'Unknown Team',
        reported_ign: reportedTeam.player_ign || reportedTeam.team_leader_ign || '',
        reported_team_leader_uid: reportedTeam.player_uid || reportedTeam.team_leader_uid || reportedTeam.team_members?.[0]?.uid || '',
        reported_team_members: reportedTeam.team_members || [],
        reported_team_kills: reportedTeam.kills || 0,
        reported_team_points: reportedTeam.points || 0,
        reported_team_stage: reportedTeam.stage || '',
        reported_team_group: reportedTeam.group_number || '',

        // Tournament Details
        tournament_id: String(tournamentId || ''),
        tournament_title: tournament?.title || '',
        
        reason: reportReason,
        description: reportDescription,
        status: "Pending",
        created_date: new Date().toISOString()
      });
      alert("✅ Team Report submitted! Admin will review all team details.");
      setShowReportModal(null);
      setReportReason("");
      setReportDescription("");
    } catch (e) {
      console.error("Error:", e);
      alert("Failed to submit report");
    }
    setSubmittingReport(false);
  };

  const moveTeam = async (entry, stage, group) => {
    const targetTournament = stage === "semifinal" ? (group === "A" ? sfATournament : sfBTournament) : gfTournament;
    const playerName = entry.player_ign || entry.team_leader_ign;
    
    if (!targetTournament) {
      alert(`❌ Koi ${stage === "semifinal" ? "Semifinal" : "Grand Final"} tournament nahi mila! Pehle Admin Dashboard se banao.`);
      return;
    }
    if (!confirm(`"${playerName}" ko "${targetTournament.title}" mein move karo?`)) return;
    
    setMovingTeam(entry);
    try {
      const leaderId = entry.user_id || entry.team_leader_id;

      // Check duplicate
      const existingRegs = await Registration.filter({ tournament_id: targetTournament.id }).catch(() => []);
      if (existingRegs.find(r => r.team_leader_id === leaderId)) {
        alert(`⚠️ "${playerName}" already "${targetTournament.title}" mein hai!`);
        setMovingTeam(null);
        return;
      }

      // Get source registration
      const allSourceRegs = await Registration.filter({ tournament_id: tournamentId }).catch(() => []);
      const sourceReg = allSourceRegs.find(r => r.team_leader_id === leaderId);

      if (sourceReg) {
        await Registration.update(sourceReg.id, { is_qualified: true, qualified_from_tournament_id: tournamentId, status: "Qualified" }).catch(() => null);
      }

      await Registration.create({
        tournament_id: targetTournament.id,
        tournament_title: targetTournament.title,
        team_name: sourceReg?.team_name || playerName,
        team_leader_id: leaderId,
        team_leader_ign: entry.player_ign || entry.team_leader_ign,
        team_leader_uid: entry.player_uid || sourceReg?.team_leader_uid || "",
        team_leader_phone: sourceReg?.team_leader_phone || "",
        team_members: sourceReg?.team_members || [{ ign: playerName, uid: entry.player_uid || "", isLeader: true }],
        is_qualified: true,
        qualified_from_tournament_id: tournamentId,
        semifinal_group: stage === "semifinal" ? group : undefined,
        total_points: 0,
        total_kills: 0,
        status: "Qualified",
        payment_status: "Paid"
      });

      await Tournament.update(targetTournament.id, { current_teams: (targetTournament.current_teams || 0) + 1 }).catch(() => null);
      alert(`✅ "${playerName}" successfully "${targetTournament.title}" mein move ho gaya!`);
      await loadData();
    } catch (error) {
      console.error("Move error:", error);
      alert(`❌ Move fail hua: ${error.message || "Unknown error"}`);
    }
    setMovingTeam(null);
  };

  const generate500DummyTeams = async () => {
    if (!confirm("Generate 500 FULL dummy teams with match results, kills, standings & points for testing?")) return;

    setLoading(true);
    try {
      const dummyTeams = [];
      const dummyLbEntries = [];

      const teamPrefixes = ["ALPHA", "DELTA", "OMEGA", "CYBER", "VIPER", "PHOENIX", "TITAN", "APEX", "LEGEND", "DRAGON", "WARRIORS", "GHOST", "SHADOW", "STORM", "HYDRA", "RAVEN", "VALOR", "NINJA", "KINGS", "BEAST"];
      const playerPrefixes = ["RASTAR", "BADSHAH", "DEVIL", "KILLER", "DEADLY", "PRO", "KING", "NINJA", "GHOST", "BOSS", "SHADOW", "TITAN", "HUNTER", "SNIPER", "MAFIA", "RIDER"];

      const now = Date.now();

      for (let i = 1; i <= 500; i++) {
        const teamPrefix = teamPrefixes[(i - 1) % teamPrefixes.length];
        const teamName = `${teamPrefix} ESPORTS #${String(i).padStart(3, '0')}`;
        const leaderIgn = `${playerPrefixes[(i - 1) % playerPrefixes.length]}_${i}`;
        const leaderUid = String(203500000 + i);
        const groupNum = Math.floor((i - 1) / 12) + 1;
        const slotNum = ((i - 1) % 12) + 1;

        // Generate 3 match results for each team
        const m1Place = ((i - 1) % 12) + 1;
        const m1Kills = Math.floor((500 - i) / 50) + (i % 5);
        const m1PlacPts = m1Place === 1 ? 12 : m1Place === 2 ? 9 : m1Place === 3 ? 8 : Math.max(0, 12 - m1Place);
        const m1Pts = m1PlacPts + m1Kills;

        const m2Place = Math.floor((i * 7) % 12) + 1;
        const m2Kills = Math.floor(i % 6);
        const m2PlacPts = m2Place === 1 ? 12 : m2Place === 2 ? 9 : m2Place === 3 ? 8 : Math.max(0, 12 - m2Place);
        const m2Pts = m2PlacPts + m2Kills;

        const m3Place = Math.floor((i * 13) % 12) + 1;
        const m3Kills = Math.floor((i * 3) % 8);
        const m3PlacPts = m3Place === 1 ? 12 : m3Place === 2 ? 9 : m3Place === 3 ? 8 : Math.max(0, 12 - m3Place);
        const m3Pts = m3PlacPts + m3Kills;

        const totalKills = m1Kills + m2Kills + m3Kills;
        const totalPlacPts = m1PlacPts + m2PlacPts + m3PlacPts;
        const totalPoints = m1Pts + m2Pts + m3Pts;
        const wins = (m1Place === 1 ? 1 : 0) + (m2Place === 1 ? 1 : 0) + (m3Place === 1 ? 1 : 0);
        const isQual = m1Place <= 2 || i <= 50;

        const p2Ign = `Player2_${i}`;
        const p3Ign = `Player3_${i}`;
        const p4Ign = `Player4_${i}`;

        const matchResults = [
          {
            match_number: "Match 1", placement: m1Place, kills: m1Kills, points: m1Pts,
            player_kills: [
              { ign: leaderIgn, kills: Math.ceil(m1Kills * 0.4) },
              { ign: p2Ign, kills: Math.floor(m1Kills * 0.3) },
              { ign: p3Ign, kills: Math.floor(m1Kills * 0.2) },
              { ign: p4Ign, kills: Math.max(0, m1Kills - Math.ceil(m1Kills * 0.4) - Math.floor(m1Kills * 0.3) - Math.floor(m1Kills * 0.2)) }
            ]
          },
          {
            match_number: "Match 2", placement: m2Place, kills: m2Kills, points: m2Pts,
            player_kills: [
              { ign: leaderIgn, kills: Math.ceil(m2Kills * 0.4) },
              { ign: p2Ign, kills: Math.floor(m2Kills * 0.3) },
              { ign: p3Ign, kills: Math.floor(m2Kills * 0.2) },
              { ign: p4Ign, kills: Math.max(0, m2Kills - Math.ceil(m2Kills * 0.4) - Math.floor(m2Kills * 0.3) - Math.floor(m2Kills * 0.2)) }
            ]
          },
          {
            match_number: "Match 3", placement: m3Place, kills: m3Kills, points: m3Pts,
            player_kills: [
              { ign: leaderIgn, kills: Math.ceil(m3Kills * 0.4) },
              { ign: p2Ign, kills: Math.floor(m3Kills * 0.3) },
              { ign: p3Ign, kills: Math.floor(m3Kills * 0.2) },
              { ign: p4Ign, kills: Math.max(0, m3Kills - Math.ceil(m3Kills * 0.4) - Math.floor(m3Kills * 0.3) - Math.floor(m3Kills * 0.2)) }
            ]
          }
        ];

        const members = [
          { ign: leaderIgn, uid: leaderUid, isLeader: true, kills: Math.ceil(totalKills * 0.4) },
          { ign: p2Ign, uid: String(203500000 + i + 1000), isLeader: false, kills: Math.floor(totalKills * 0.3) },
          { ign: p3Ign, uid: String(203500000 + i + 2000), isLeader: false, kills: Math.floor(totalKills * 0.2) },
          { ign: p4Ign, uid: String(203500000 + i + 3000), isLeader: false, kills: Math.max(0, totalKills - Math.ceil(totalKills * 0.4) - Math.floor(totalKills * 0.3) - Math.floor(totalKills * 0.2)) }
        ];

        const regObj = {
          id: `dummy-reg-${i}-${now}`,
          tournament_id: String(tournamentId),
          tournament_title: tournament?.title || "Tournament",
          team_name: teamName,
          team_leader_id: `BH${String(890000 + i)}`,
          team_leader_ign: leaderIgn,
          team_leader_uid: leaderUid,
          team_members: members,
          slot_number: slotNum,
          group_number: groupNum,
          status: "PAID & CONFIRMED",
          payment_status: "Paid",
          total_kills: totalKills,
          total_points: totalPoints,
          placement_points: totalPlacPts,
          wins: wins,
          is_qualified: isQual,
          stage: "Qualifier",
          match_results: matchResults
        };
        dummyTeams.push(regObj);

        dummyLbEntries.push({
          id: `dummy-lb-${i}-${now}`,
          tournament_id: String(tournamentId),
          user_id: regObj.team_leader_id,
          unique_id: regObj.id,
          team_name: teamName,
          player_ign: leaderIgn,
          player_uid: leaderUid,
          rank: i,
          kills: totalKills,
          points: totalPoints,
          placement_points: totalPlacPts,
          wins: wins,
          is_qualified: isQual,
          stage: "Qualifier",
          group_number: groupNum,
          team_members: members,
          match_results: matchResults
        });
      }

      setRegistrations(dummyTeams);
      setLeaderboardEntries(dummyLbEntries);
      setTournament(prev => ({ ...prev, max_teams: 500, current_teams: 500 }));

      // Save to background without blocking UI
      Promise.all([
        ...dummyTeams.slice(0, 50).map(t => Registration.create(t).catch(() => null)),
        ...dummyLbEntries.slice(0, 50).map(l => TournamentLeaderboard.create(l).catch(() => null)),
        Tournament.update(tournamentId, { max_teams: 500, current_teams: 500 }).catch(() => null)
      ]);

      alert("🎉 500 FULL Dummy Teams & Match Results Generated Successfully! Standings, Kills, Points, Booyahs & Groups are 100% filled!");
    } catch (e) {
      console.error("Error:", e);
      alert("Error generating dummy teams: " + e.message);
    }
    setLoading(false);
  };

  const isAdmin = user?.role === "admin";
  const isQualifierType = tournament?.tournament_type === "Qualifier";
  const isSemifinalType = tournament?.tournament_type === "Semifinal";
  const canMove = isAdmin && (isQualifierType || isSemifinalType);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070a] text-slate-100 pb-2 animate-pulse">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-3 space-y-4">
          {/* Skeleton Hero Banner Card */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/80 h-64 sm:h-72 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-8 w-20 bg-slate-800 rounded-full" />
              <div className="h-6 w-24 bg-slate-800 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-7 w-3/4 bg-slate-800 rounded-lg" />
              <div className="h-4 w-1/2 bg-slate-800/60 rounded-lg" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-20 bg-slate-800/60 rounded-md" />
                <div className="h-6 w-24 bg-slate-800/60 rounded-md" />
                <div className="h-6 w-16 bg-slate-800/60 rounded-md" />
              </div>
            </div>
          </div>

          {/* Skeleton Tabs Bar */}
          <div className="h-11 w-full bg-slate-900/80 border border-slate-800 rounded-xl p-1 grid grid-cols-4 gap-1">
            <div className="h-full bg-slate-800/80 rounded-lg" />
            <div className="h-full bg-slate-800/30 rounded-lg" />
            <div className="h-full bg-slate-800/30 rounded-lg" />
            <div className="h-full bg-slate-800/30 rounded-lg" />
          </div>

          {/* Skeleton Content Cards */}
          <div className="space-y-3">
            {/* Ticket Card Skeleton */}
            <div className="h-44 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="h-4 w-36 bg-slate-800 rounded" />
              <div className="h-28 bg-slate-950/60 border border-slate-800/60 rounded-xl" />
            </div>

            {/* Info Card Skeleton */}
            <div className="h-36 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="h-4 w-32 bg-slate-800 rounded" />
              <div className="space-y-2.5 pt-1">
                <div className="h-4 w-full bg-slate-800/40 rounded" />
                <div className="h-4 w-full bg-slate-800/40 rounded" />
                <div className="h-4 w-full bg-slate-800/40 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
          <h3 className="text-xl font-semibold text-gray-300">Tournament not found</h3>
        </Card>
      </div>
    );
  }

  // Generate 6-Digit Tournament ID
  const get6DigitId = (id, dateStr) => {
    if (dateStr) {
      const timeMs = new Date(dateStr).getTime();
      if (!isNaN(timeMs)) return String(timeMs).slice(-6);
    }
    if (id) {
      const clean = String(id).replace(/\D/g, "");
      if (clean.length >= 6) return clean.slice(-6);
      if (clean.length > 0) return clean.padStart(6, "0");
    }
    return "896063";
  };

  const tournamentNumber = get6DigitId(tournament.id, tournament.created_date);
  const isSemifinalOrFinal = tournament.tournament_type === "Semifinal" || tournament.tournament_type === "Grand Final" || tournament.stage === "semifinal" || tournament.stage === "grand_final";

  const maxTeams = Math.max(1, Number(tournament?.max_teams) || 32);
  const totalRegisteredCount = registrations?.length || 0;
  const isSlotsFull = totalRegisteredCount >= maxTeams;

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 pb-2">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-3 space-y-4">

        {/* ── HIGH-END ESPORTS HERO CARD BANNER ── */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-2xl shadow-orange-950/20 group">
          
          {/* Banner Image Container */}
          <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-950">
            {tournament.banner_url ? (
              <img 
                src={tournament.banner_url} 
                alt={tournament.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-950/70 via-slate-900 to-slate-950 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent" />
                <Gamepad2 className="w-20 h-20 text-orange-500/20 animate-pulse" />
              </div>
            )}
            
            {/* Light bottom gradient overlay for text readability without dimming image */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Floating Top Navigation & Status Bar */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
              
              {/* Back Button & ID Badge */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(createPageUrl("Tournaments"))}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-slate-950/80 hover:bg-slate-900 hover:text-orange-400 backdrop-blur-md border border-slate-700/60 rounded-full px-3.5 py-1.5 transition-all shadow-lg active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-[11px] font-mono font-bold text-orange-400 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 rounded-full px-3 py-1 shadow-lg">
                  #{tournamentNumber}
                </span>
              </div>

              {/* Status & Stage Badges */}
              <div className="flex items-center gap-2">
                {isSemifinalOrFinal && (
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md ${
                    tournament.tournament_type === "Grand Final" 
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950" 
                      : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                  }`}>
                    🏆 {tournament.tournament_type || "Semifinal"}
                  </span>
                )}
                
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md border flex items-center gap-1.5 shadow-lg ${
                  tournament.status === "Live" 
        {/* ── MODERN ESPORTS TABS BAR ── */}
        <div>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-1 grid grid-cols-4 h-12 w-full mb-4 shadow-xl backdrop-blur-md">
              {[
                { id: "details", label: "Overview", icon: ScrollText },
                { id: "teams", label: `Teams (${registrations.length})`, icon: Users },
                { id: "standings", label: "Standings", icon: Trophy },
                { id: "rules", label: "Rules", icon: ScrollText },
              ].map((t) => {

                const IconComponent = t.icon;
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="data-[state=active]:bg-orange-500 data-[state=active]:text-slate-950 text-slate-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                  {tournament.mode || "DUO"} • FREE FIRE
                </span>
              </div>
            </div>
          </div>

          {/* ── 4 STAT CARDS GRID ── */}
          <div className="p-3 bg-slate-900 border-t border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              
              {/* Card 1: Prize Pool */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PRIZE POOL</span>
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-base font-black text-amber-400 flex items-center gap-1">
                  🪙 {tournament.prize_pool?.toLocaleString() || 0}
                </p>
              </div>

              {/* Card 2: Entry Fee */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ENTRY FEE</span>
                  <Ticket className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div>
                  <p className="text-base font-black text-orange-400">
                    {isSemifinalOrFinal ? "Points" : tournament.entry_fee ? `🪙 ${tournament.entry_fee}` : "FREE"}
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">Per Squad</p>
  );
}

// Official-style leaderboard tab with expandable rows per team
function LeaderboardTab({ registrations, leaderboardEntries, user, isRegistered, canMove, isQualifierType, isSemifinalType, isGrandFinalType, sfATournament, sfBTournament, gfTournament, movingTeam, moveTeam, setShowReportModal }) {
  const [expandedId, setExpandedId] = useState(null);
  const isSolo = registrations[0] && !registrations[0].team_name;

  if (registrations.length === 0) {
    return (
        </div>
      )}
    </div>
  );
}

// Official-style leaderboard tab with expandable rows per team
function LeaderboardTab({ registrations, leaderboardEntries, user, isRegistered, canMove, isQualifierType, isSemifinalType, isGrandFinalType, sfATournament, sfBTournament, gfTournament, movingTeam, moveTeam, setShowReportModal }) {
  const [expandedId, setExpandedId] = useState(null);
  const isSolo = registrations[0] && !registrations[0].team_name;

  if (registrations.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardContent className="py-12 text-center text-gray-500">No players registered yet</CardContent>
      </Card>
    );
  }

  // For Grand Final: compact table with expand-on-click for full M1-M5 details
  if (isGrandFinalType) {
    const gfRows = leaderboardEntries.length > 0
      ? [...leaderboardEntries].sort((a, b) => (a.rank || 999) - (b.rank || 999))
      : registrations.map((reg, i) => ({
          id: reg.id, rank: i + 1,
          team_name: reg.team_name || reg.team_leader_ign,
          player_uid: reg.team_members?.[0]?.uid || reg.team_leader_uid || '-',
          kills: reg.total_kills || 0, points: reg.total_points || 0,
          wins: 0, match_results: [], team_logo_url: reg.team_logo_url,
          user_id: reg.team_leader_id,
          is_qualified: reg.is_qualified || reg.status === "Qualified"
        }));

    const matchNumbers = [];
    gfRows.forEach(row => (row.match_results || []).forEach(mr => {
      if (!matchNumbers.includes(mr.match_number)) matchNumbers.push(mr.match_number);
    }));
    matchNumbers.sort();

    const adminMsg = leaderboardEntries[0]?.admin_message || "";
                {isRegistered ? (
                  <div>
                    {(() => {
                      const userRegIndex = registrations.findIndex(r => r.team_leader_id === user?.id || r.id === userRegistration?.id);
                      const userRegObj = userRegistration || registrations[userRegIndex];
                      const userChosenSlot = userRegObj?.slot_number ?? userRegObj?.slot ?? userRegObj?.selected_slot ?? userRegObj?.slot_no;
                      const userChosenGroup = userRegObj?.group_number ?? userRegObj?.group;
                      const userSlotNum = userChosenSlot !== undefined && userChosenSlot !== null && userChosenSlot !== "" 
                        ? String(userChosenSlot).replace(/[^0-9]/g, '') || userChosenSlot 
                        : (userRegIndex >= 0 ? ((userRegIndex % 12) + 1) : 1);
                      const userGroupNum = userChosenGroup !== undefined && userChosenGroup !== null && userChosenGroup !== ""
                        ? String(userChosenGroup).replace(/[^0-9]/g, '') || userChosenGroup
                        : (userRegIndex >= 0 ? (Math.floor(userRegIndex / 12) + 1) : 1);

                      return (
                        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xl">
                          {/* Team Header */}
                          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
                            {userRegObj?.team_logo_url ? (
                              <img
                                src={userRegObj.team_logo_url}
                                alt="Team Logo"
                                className="w-11 h-11 rounded-xl object-cover border border-orange-500/50 shrink-0 shadow-md"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-base shrink-0 shadow-md">
                                {(userRegObj?.team_name || userRegObj?.team_leader_ign || 'B').charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-base font-black text-white truncate">{userRegObj?.team_name || userRegObj?.team_leader_ign || 'My Squad'}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Leader: <span className="text-orange-400 font-bold">{userRegObj?.team_leader_ign || userRegObj?.player_name || user?.name || 'Leader'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Group & Slot Row (2 Columns) */}
                          <div className="grid grid-cols-2 gap-2 text-center bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Group</p>
                              <p className="text-xs font-bold text-white mt-0.5">Group {userGroupNum}</p>
                            </div>
                            <div className="border-l border-slate-800/80">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Slot Number</p>
                              <p className="text-xs font-black text-orange-400 mt-0.5">Slot {userSlotNum}</p>
                            </div>
                          </div>

                          {/* Single Combined Match Date & Time Box */}
                          <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Match Date & Time:</span>
                            <span className="font-bold text-amber-400">
                              {(() => {
                                const rawTime = getGroupMatchTime(userGroupNum, userRegObj);
                                if (!rawTime) return "To Be Announced (TBA)";
                                try {
                                  const d = new Date(rawTime);
                                  if (isNaN(d.getTime())) return String(rawTime);
                                  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                                } catch (e) {
                                  return "To Be Announced (TBA)";
                                }
                              })()}
                            </span>
                          </div>

                          {/* Official Squad Roster Table */}
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">YOUR SQUAD</p>
                            
                            {userRegObj?.team_members && userRegObj.team_members.length > 0 ? (
                              userRegObj.team_members.map((m, idx) => {
                                const memberUid = m.uid || m.game_id || m.in_game_id;
                                const mIgn = m.ign || m.name || `Player ${idx + 1}`;
                                let avatarSrc = m.avatar_url || m.avatar || m.dp || m.photoURL || m.logo || m.logo_url || "";
                                
                                if (!avatarSrc && user) {
                                  if ((memberUid && (memberUid === user.game_uid || memberUid === user.game_id || memberUid === user.uid)) ||
                                      (mIgn && (mIgn.toLowerCase() === (user.ign || '').toLowerCase() || mIgn.toLowerCase() === (user.full_name || '').toLowerCase())) ||
                                      (idx === 0 && (userRegObj.user_id === user.id || userRegObj.team_leader_id === user.id))) {
                                    avatarSrc = user.avatar_url || user.avatar || user.dp || user.photoURL || "";
                                  }
                                }

                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/40 border border-slate-800/40 rounded-lg px-2.5 py-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {avatarSrc ? (
                                        <img
                                          src={avatarSrc}
                                          alt={mIgn}
                                          className="w-6 h-6 rounded-full object-cover border border-amber-500/40 shrink-0 shadow-sm"
                                          onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                                        />
                                      ) : null}
                                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 items-center justify-center text-[10px] font-black text-amber-400 shrink-0 shadow-sm ${avatarSrc ? 'hidden' : 'flex'}`}>
                                        {mIgn.charAt(0).toUpperCase()}
                </div>

                {/* 2nd Place */}
                <div className="flex-1 text-center px-1">
                  <span className="text-[10px] font-bold text-slate-400 block">🥈 2nd Place</span>
                  <span className="text-xs font-black text-slate-200 mt-0.5 block">
                    🪙 {
                      tournament.prize_distribution?.second ?? 
                      tournament.prize_distribution?.['2nd'] ?? 
                      tournament.prize_distribution?.pos_2 ?? 
                      (tournament.prize_pool ? Math.round(tournament.prize_pool * 0.3) : 0)
                    }
                  </span>
                </div>

                {/* 3rd Place */}
                <div className="flex-1 text-center px-1">
                  <span className="text-[10px] font-bold text-slate-400 block">🥉 3rd Place</span>
                  <span className="text-xs font-black text-slate-300 mt-0.5 block">
                    🪙 {
                      tournament.prize_distribution?.third ?? 
                      tournament.prize_distribution?.['3rd'] ?? 
                      tournament.prize_distribution?.pos_3 ?? 
                      (tournament.prize_pool ? Math.round(tournament.prize_pool * 0.2) : 0)
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Registration & Slot Ticket Card */}
            {!isSemifinalOrFinal && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Registration & Slot Ticket</p>
                  {isRegistered && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      ✓ Registered
                    </span>
                  )}
                </div>

                {isRegistered ? (
                  <div>
                    {(() => {
                      const userRegIndex = registrations.findIndex(r => r.team_leader_id === user?.id || r.id === userRegistration?.id);
                      const userRegObj = userRegistration || registrations[userRegIndex];
                      const userChosenSlot = userRegObj?.slot_number ?? userRegObj?.slot ?? userRegObj?.selected_slot ?? userRegObj?.slot_no;
                      const userChosenGroup = userRegObj?.group_number ?? userRegObj?.group;
                      const userSlotNum = userChosenSlot !== undefined && userChosenSlot !== null && userChosenSlot !== "" 
                        ? String(userChosenSlot).replace(/[^0-9]/g, '') || userChosenSlot 
                        : (userRegIndex >= 0 ? ((userRegIndex % 12) + 1) : 1);
                      const userGroupNum = userChosenGroup !== undefined && userChosenGroup !== null && userChosenGroup !== ""
                        ? String(userChosenGroup).replace(/[^0-9]/g, '') || userChosenGroup
                        : (userRegIndex >= 0 ? (Math.floor(userRegIndex / 12) + 1) : 1);

                      return (
                        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xl">
                          {/* Team Header */}
                          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
                            {userRegObj?.team_logo_url ? (
                              <img
                                src={userRegObj.team_logo_url}
                                alt="Team Logo"
                                className="w-11 h-11 rounded-xl object-cover border border-orange-500/50 shrink-0 shadow-md"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-base shrink-0 shadow-md">
                                {(userRegObj?.team_name || userRegObj?.team_leader_ign || 'B').charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-base font-black text-white truncate">{userRegObj?.team_name || userRegObj?.team_leader_ign || 'My Squad'}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Leader: <span className="text-orange-400 font-bold">{userRegObj?.team_leader_ign || userRegObj?.player_name || user?.name || 'Leader'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Group & Slot Row (2 Columns) */}
                          <div className="grid grid-cols-2 gap-2 text-center bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Group</p>
                              <p className="text-xs font-bold text-white mt-0.5">Group {userGroupNum}</p>
                            </div>
                            <div className="border-l border-slate-800/80">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Slot Number</p>
                              <p className="text-xs font-black text-orange-400 mt-0.5">Slot {userSlotNum}</p>
                            </div>
                          </div>

                          {/* Single Combined Match Date & Time Box */}
                          <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Match Date & Time:</span>
                            <span className="font-bold text-amber-400">
                              {(() => {
                                const rawTime = getGroupMatchTime(userGroupNum, userRegObj);
                                if (!rawTime) return "To Be Announced (TBA)";
                                try {
                                  const d = new Date(rawTime);
                                  if (isNaN(d.getTime())) return String(rawTime);
                                  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                                } catch (e) {
                                  return "To Be Announced (TBA)";
                                }
                              })()}
                            </span>
                          </div>

                          {/* Official Squad Roster Table */}
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">YOUR SQUAD</p>
                            
                            {userRegObj?.team_members && userRegObj.team_members.length > 0 ? (
                              userRegObj.team_members.map((m, idx) => {
                                const memberUid = m.uid || m.game_id || m.in_game_id;
                                const mIgn = m.ign || m.name || `Player ${idx + 1}`;
                                let avatarSrc = m.avatar_url || m.avatar || m.dp || m.photoURL || m.logo || m.logo_url || "";
                                
                                if (!avatarSrc && user) {
                                  if ((memberUid && (memberUid === user.game_uid || memberUid === user.game_id || memberUid === user.uid)) ||
                                      (mIgn && (mIgn.toLowerCase() === (user.ign || '').toLowerCase() || mIgn.toLowerCase() === (user.full_name || '').toLowerCase())) ||
                                      (idx === 0 && (userRegObj.user_id === user.id || userRegObj.team_leader_id === user.id))) {
                                    avatarSrc = user.avatar_url || user.avatar || user.dp || user.photoURL || "";
                                  }
                                }

                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/40 border border-slate-800/40 rounded-lg px-2.5 py-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {avatarSrc ? (
                                        <img
                                          src={avatarSrc}
                                          alt={mIgn}
                                          className="w-6 h-6 rounded-full object-cover border border-amber-500/40 shrink-0 shadow-sm"
                                          onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                                        />
                                      ) : null}
                                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 items-center justify-center text-[10px] font-black text-amber-400 shrink-0 shadow-sm ${avatarSrc ? 'hidden' : 'flex'}`}>
                                        {mIgn.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="font-bold text-white truncate">{mIgn}</span>
                                      {m.isLeader && <span className="text-[7.5px] font-black text-amber-400 bg-amber-500/20 px-1 py-0.2 rounded shrink-0">IGL</span>}
                                    </div>
                                    {memberUid && (
                                      <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">UID: {memberUid}</span>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="flex items-center justify-between text-xs bg-slate-900/40 border border-slate-800/40 rounded-lg px-2.5 py-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  {user?.avatar_url ? (
                                    <img
                                      src={user.avatar_url}
                                      alt="Leader"
                                      className="w-6 h-6 rounded-full object-cover border border-amber-500/40 shrink-0 shadow-sm"
                                      onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                                    />
                                  ) : null}
                                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 items-center justify-center text-[10px] font-black text-amber-400 shrink-0 shadow-sm ${user?.avatar_url ? 'hidden' : 'flex'}`}>
                                    {(userRegObj?.team_leader_ign || user?.ign || 'P').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-white truncate">{userRegObj?.team_leader_ign || user?.ign || 'Player'}</span>
                                </div>
                                {(userRegObj?.team_leader_uid || userRegObj?.leader_uid || userRegObj?.uid || userRegObj?.game_id) && (
                                  <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">UID: {userRegObj?.team_leader_uid || userRegObj?.leader_uid || userRegObj?.uid || userRegObj?.game_id}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Live Match Countdown Timer */}
                          <div className="pt-2">
                            <MatchLiveCountdown matchTimeStr={getGroupMatchTime(userGroupNum, userRegObj)} />
                          </div>

                          {/* MATCH CREDENTIALS BUTTON */}
                          <div className="pt-2">
                            <Button 
                              onClick={() => setShowCredentialsModal(true)}
                              className={`w-full h-11 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer ${matchCredentials ? "bg-cyan-600 hover:bg-cyan-500 text-white animate-[pulse_2s_ease-in-out_infinite] shadow-cyan-900/30 border border-cyan-400" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"}`}
                            >
                              <Key className={`w-4 h-4 mr-2 ${matchCredentials ? 'text-cyan-100' : 'text-orange-400'}`} />
                              {matchCredentials ? "VIEW MATCH CREDENTIALS!" : "VIEW MATCH CREDENTIALS"}
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                ) : (
                  <div>
                    {tournament.status === "Registration Open" ? (
                      isSlotsFull ? (
                        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1.5 text-amber-400 font-black text-xs uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Slots Full ({totalRegisteredCount}/{maxTeams})</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            All tournament slots are filled. No more registrations can be accepted.
                          </p>
                        </div>
                      ) : (
                        <Button onClick={() => setShowRegistrationModal(true)} className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs h-11 rounded-xl shadow-lg cursor-pointer active:scale-95 transition-transform">
                          Register Now
                        </Button>
                      )
                    ) : (
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-slate-400">Registration Closed</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── TEAMS TAB (SINGLE TOURNAMENT 3-STAGE PROGRESSION SYSTEM) ── */}
          <TabsContent value="teams" className="space-y-3 mt-0">
            {/* Stage Switcher - Premium Step Flow Navigation */}
            {(() => {
              const defaultStages = [
                { id: "qualifiers", name: "Qualifier" },
                { id: "semifinals", name: "Semifinal" },
                { id: "grand_final", name: "Grand Final" }
              ];
              const rawStages = (tournament?.stages && Array.isArray(tournament.stages) && tournament.stages.length > 0)
                ? tournament.stages
                : defaultStages;

              const stagesList = rawStages.map((st, i) => {
                if (typeof st === 'string') {
                  const slug = st.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                  return { id: slug, name: st, idx: i };
                }
                return { id: st.id || `stage_${i}`, name: st.name || st.id || `Stage ${i+1}`, idx: i };
              });

              const activeIdx = stagesList.findIndex(s => s.id === activeStageFilter || s.name === activeStageFilter);
              const currentActiveIdx = activeIdx >= 0 ? activeIdx : 0;
              const currentStageObj = stagesList[currentActiveIdx] || stagesList[0];

              return (
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-2.5 mb-3">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
                    {stagesList.map((st, i) => {
                      const isActive = i === currentActiveIdx;
                      const isPast = i < currentActiveIdx;

                      return (
                        <React.Fragment key={st.id}>
                          {i > 0 && (
                            <div className={`h-[2px] w-4 shrink-0 rounded-full transition-all duration-300 ${
                              isPast ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                              isActive ? 'bg-gradient-to-r from-orange-500 to-amber-400' :
                              'bg-slate-700/60'
                            }`} />
                          )}
                          <button
                            onClick={() => setActiveStageFilter(st.id)}
                            className={`group flex items-center gap-1.5 py-1.5 px-3 text-[11px] font-black transition-all duration-300 shrink-0 whitespace-nowrap rounded-xl border cursor-pointer active:scale-95 ${
                              isActive 
                                ? "text-orange-300 bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.15)]" 
                                : isPast
                                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                                  : "text-slate-400 hover:text-slate-200 bg-slate-800/60 border-slate-700/60 hover:border-slate-600/80"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                              isActive
                                ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-slate-950 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                                : isPast
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'
                            }`}>
                              {isPast ? '✓' : i + 1}
                            </span>
                            <span className="uppercase tracking-wider">{st.name}</span>
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })()}


            {/* Search & Group Filter Header */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {(() => {
                    const defaultStages = [
                      { id: "qualifiers", name: "Qualifiers" },
                      { id: "semifinals", name: "Semifinals" },
                      { id: "grand_final", name: "Grand Final" }
                    ];
                    const rawStages = (tournament?.stages && Array.isArray(tournament.stages) && tournament.stages.length > 0)
                      ? tournament.stages
                      : defaultStages;
                    const stagesList = rawStages.map((st, i) => {
                      if (typeof st === 'string') {
                        const slug = st.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                        return { id: slug, name: st, idx: i };
                      }
                      return { id: st.id || `stage_${i}`, name: st.name || st.id || `Stage ${i+1}`, idx: i };
                    });
                    const activeIdx = stagesList.findIndex(s => s.id === activeStageFilter || s.name === activeStageFilter);
                    const activeObj = stagesList[activeIdx >= 0 ? activeIdx : 0] || stagesList[0];
                    return `${activeObj.name} (${registrations.length} Total Teams)`;
                  })()}
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={generate500DummyTeams} 
                    size="sm" 
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] h-6 px-2.5 rounded-md shadow flex items-center gap-1 active:scale-95 transition-all"
                  >
                    ⚡ Fill 500 Teams
                  </Button>
                  <span className="text-[10px] font-bold text-orange-400">
                    {Math.ceil(registrations.length / 12) || 1} Groups
                  </span>
                </div>
              </div>

              {/* Always Visible Search Team Input & Group Select Dropdown */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Search team..."
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white h-8.5 text-xs"
                />

                <select
                  value={teamGroupFilter}
                  onChange={(e) => setTeamGroupFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 h-8.5 rounded-md px-2.5 text-xs focus:outline-none"
                >
                  <option value="all">All Groups</option>
                  {Array.from({ length: Math.ceil(registrations.length / 12) || 1 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      Group {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Match Schedule Banner */}
              {teamGroupFilter !== "all" && (
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-xs mt-1">
                  <span className="font-semibold text-slate-300">Group {teamGroupFilter} Match Schedule:</span>
                  <span className="font-bold text-amber-400">
                    {(() => {
                      const rawTime = getGroupMatchTime(teamGroupFilter);
                      if (!rawTime) return "To Be Announced (TBA)";
                      try {
                        const d = new Date(rawTime);
                        if (isNaN(d.getTime())) return String(rawTime);
                        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                      } catch (e) {
                        return "To Be Announced (TBA)";
                      }
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* Teams List Filtered By Stage */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="space-y-2 max-h-[560px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {(() => {
                  const defaultStages = [
                    { id: "qualifiers", name: "Qualifier" },
                    { id: "semifinals", name: "Semifinal" },
                    { id: "grand_final", name: "Grand Final" }
                  ];
                  const rawStages = (tournament?.stages && Array.isArray(tournament.stages) && tournament.stages.length > 0)
                    ? tournament.stages
                    : defaultStages;
                  const stagesList = rawStages.map((st, i) => {
                    if (typeof st === 'string') {
                      const slug = st.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                      return { id: slug, name: st, idx: i };
                    }
                    return { id: st.id || `stage_${i}`, name: st.name || st.id || `Stage ${i+1}`, idx: i };
                  });

                  const activeIdx = stagesList.findIndex(s => s.id === activeStageFilter || s.name === activeStageFilter);
                  const currentActiveIdx = activeIdx >= 0 ? activeIdx : 0;
                  const currentStageObj = stagesList[currentActiveIdx] || stagesList[0];

                  let pool = registrations;
                  
                  if (currentActiveIdx > 0) {
                    const stNameLower = (currentStageObj.name || "").toLowerCase();
                    const stIdLower = (currentStageObj.id || "").toLowerCase();

                    pool = registrations.filter(r => {
                      const rStage = String(r.stage || r.stage_id || "").toLowerCase();
                      const rStatus = String(r.status || "").toLowerCase();
                      if (rStage === stIdLower || rStage === stNameLower) return true;
                      if (stNameLower && rStage.includes(stNameLower)) return true;
                      if (stNameLower.includes("semi") && (rStage.includes("semi") || r.is_qualified || rStatus === "qualified")) return true;
                      if (stNameLower.includes("final") && (rStage.includes("final") || r.is_finalist)) return true;
                      if (r.stage_index === currentActiveIdx) return true;
                      return false;
                    });
                  }

                  const filtered = pool.filter((reg, idx) => {
                    const grp = Math.floor(idx / 12) + 1;
                    const matchesGrp = teamGroupFilter === "all" || teamGroupFilter === String(grp);
                    const q = (teamSearchQuery || "").toLowerCase().trim();
                    const rawMembers = Array.isArray(reg.team_members) ? reg.team_members : [];
                    const memberMatches = rawMembers.some(m => {
                      if (!m) return false;
                      const mIgn = typeof m === 'string' ? m : (m.ign || m.name || m.player_ign || '');
                      const mUid = typeof m === 'object' ? (m.uid || m.game_id || '') : '';
                      return String(mIgn).toLowerCase().includes(q) || String(mUid).toLowerCase().includes(q);
                    });
                    const slotStr = String(idx + 1);
                    const matchesQ = !q ||
                      (String(reg.team_name || "").toLowerCase().includes(q)) ||
                      (String(reg.team_leader_ign || "").toLowerCase().includes(q)) ||
                      (String(reg.team_leader_uid || "").toLowerCase().includes(q)) ||
                      memberMatches ||
                      slotStr === q ||
                      `#${slotStr}` === q;
                    return matchesGrp && matchesQ;
                  });


                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center space-y-2">
                        <p className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                          No teams in {currentStageObj.name || "this stage"} yet
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          Teams will appear here once promoted or qualified from previous rounds.
                        </p>
                      </div>
                    );
                  }

                  return filtered.map((reg) => {
                    const originalIndex = registrations.findIndex(r => r.id === reg.id);
                    return (
                      <TeamCard
                        key={reg.id}
                        reg={reg}
                        index={originalIndex >= 0 ? originalIndex : 0}
                        isSolo={tournament.mode === "Solo"}
                        grandFinal={currentStageObj.name?.toLowerCase().includes("final")}
                        showGroupBadge={teamGroupFilter === "all"}
                      />
                    );
                  });
                })()}
              </div>
            </div>
          </TabsContent>

          {/* ── STANDINGS TAB ── */}
          <TabsContent value="standings" className="space-y-3 mt-0">
            <LeaderboardTab
              registrations={registrations}
              leaderboardEntries={leaderboardEntries}
              tournament={tournament}
              user={user}
              isRegistered={isRegistered}
              matchCredentials={matchCredentials}
              setShowCredentialsModal={setShowCredentialsModal}
              canMove={canMove}
              isQualifierType={isQualifierType}
              isSemifinalType={isSemifinalType}
              isGrandFinalType={tournament?.tournament_type === "Grand Final" || tournament?.stage === "grand_final"}
              sfATournament={sfATournament}
              sfBTournament={sfBTournament}
              gfTournament={gfTournament}
              movingTeam={movingTeam}
              moveTeam={moveTeam}
              setShowReportModal={setShowReportModal}
              matches={matches}
            />
          </TabsContent>

          {/* ── RULES TAB ── */}
          <TabsContent value="rules" className="space-y-3 mt-0">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-3">
                <ScrollText className="w-4 h-4 text-orange-400" />
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tournament Rules</p>
              </div>
              <div className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                {tournament.rules || "No rules specified for this tournament."}
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>



      {/* ── FLOATING LIVE CHAT BUBBLE ── */}
      <button
        onClick={() => setShowChatPopup(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-orange-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-full shadow-lg transition-all active:scale-95"
      >
        <MessageCircle className="w-4 h-4 text-orange-400" />
        <span>Chat</span>
      </button>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showChatPopup && (
          <TournamentChatFullscreen
            tournament={tournament}
            user={user}
            isRegistered={isRegistered}
            onClose={() => setShowChatPopup(false)}
          />
        )}
      </AnimatePresence>

      {showRegistrationModal && (
        <StepByStepRegistration
          tournament={tournament}
          user={user}
          onClose={() => setShowRegistrationModal(false)}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {/* Prize Image Modal */}
      {showPrizeImageModal && tournament.prize_image_url && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setShowPrizeImageModal(false)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowPrizeImageModal(false)}
              className="absolute -top-10 right-0 text-white bg-gray-800 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-gray-900 border border-yellow-500/40 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-600/30 to-orange-700/30 px-5 py-3 border-b border-yellow-500/30">
                <h3 className="text-yellow-400 font-bold text-lg flex items-center gap-2">
                  🏆 {tournament.title} — Prize Distribution
                </h3>
              </div>
              <div className="p-4">
                <img src={tournament.prize_image_url} alt="Prize Distribution" className="w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Manager - Real-time invite popups */}
      {user && tournament && (
        <InviteManager tournament={tournament} currentUser={user} />
      )}

      {/* Global Squads Drawer */}
      <SquadsDrawer />


      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(null)}>
          <Card className="bg-gray-900 border-gray-700 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400 text-base font-bold">
                <AlertTriangle className="w-5 h-5" />
                Report Team
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-800/90 rounded-lg border border-gray-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-400 font-bold uppercase tracking-wide">Team Name</span>
                  <span className="text-[10px] text-gray-400">ID: {showReportModal.id?.slice(0,8) || '-'}</span>
                </div>
                <p className="text-white font-bold text-sm">{showReportModal.team_name || showReportModal.player_ign || showReportModal.team_leader_ign}</p>
                <p className="text-xs text-gray-300">Leader: <span className="font-semibold text-cyan-400">{showReportModal.player_ign || showReportModal.team_leader_ign}</span> (UID: {showReportModal.player_uid || showReportModal.team_members?.[0]?.uid || '-'})</p>
                {showReportModal.team_members && showReportModal.team_members.length > 0 && (
                  <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-700/50 mt-1">
                    Squad: {showReportModal.team_members.map(m => m.ign || m.name || m.uid).filter(Boolean).join(", ")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Reason *</Label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-xs"
                >
                  <option value="">Select reason...</option>
                  <option value="Hacking/Cheating">🎮 Hacking / Cheating</option>
                  <option value="Match Fixing">🤝 Match Fixing</option>
                  <option value="Abusive Behavior">💬 Abusive Behavior</option>
                  <option value="Multi-Accounting">👥 Multi-Accounting</option>
                  <option value="Fake Details">📜 Fake IGN / UID Mismatch</option>
                  <option value="Other">❓ Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Description (Optional)</Label>
                <Textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe details for admin review..."
                  className="bg-gray-800 border-gray-700 text-white text-xs"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowReportModal(null)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => submitReport(showReportModal)}
                  disabled={!reportReason || submittingReport}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-xs font-bold"
                >
                  {submittingReport ? "Submitting..." : "Submit Team Report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Match Credentials Modal */}
      <AnimatePresence>
        {showCredentialsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
              onClick={() => setShowCredentialsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-[#0a0a0f] border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.25)]"
              >
                <div className="bg-cyan-950/60 border-b border-cyan-900/50 p-4 flex items-center justify-between">
                  <h3 className="font-black text-cyan-400 text-sm tracking-wider uppercase flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400 animate-pulse" /> MATCH CREDENTIALS
                  </h3>
                  <button onClick={() => setShowCredentialsModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-5 space-y-4">
                  {matchCredentials ? (
                    <>
                      {matchCredentials.room_code && (
                        <div>
                          <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">MATCH ID / ROOM CODE</p>
                          <div className="bg-[#050508] border border-cyan-800/80 rounded-xl px-4 py-3 flex items-center justify-between group shadow-inner">
                            <span className="font-mono text-xl font-black text-white tracking-widest select-all">{matchCredentials.room_code}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(matchCredentials.room_code);
                                toast.success("Room ID Copied!");
                              }}
                              className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition-all text-xs font-black cursor-pointer active:scale-95"
                            >
                              COPY
                            </button>
                          </div>
                        </div>
                      )}

                      {matchCredentials.room_password && (
                        <div>
                          <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">PASSWORD</p>
                          <div className="bg-[#050508] border border-red-900/60 rounded-xl px-4 py-3 flex items-center justify-between group shadow-inner">
                            <span className="font-mono text-xl font-black text-red-100 tracking-widest select-all">{matchCredentials.room_password}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(matchCredentials.room_password);
                                toast.success("Password Copied!");
                              }}
                              className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg transition-all text-xs font-black cursor-pointer active:scale-95"
                            >
                              COPY
                            </button>
                          </div>
                        </div>
                      )}

                      {matchCredentials.message && (() => {
                        const cleanMsg = matchCredentials.message.split("\n").filter(line => {
                          const trimmed = line.trim().toUpperCase();
                          if (trimmed.startsWith("🏆 STAGE:") || trimmed.startsWith("STAGE:")) return false;
                          if (trimmed.startsWith("ROOM ID:") || trimmed.startsWith("ROOM:")) return false;
                          if (trimmed.startsWith("PASSWORD:") || trimmed.startsWith("PASS:")) return false;
                          return true;
                        }).join("\n").trim().replace(/^📢\s*/, '');

                        if (!cleanMsg) return null;

                        return (
                          <div className="mt-4 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
                            <p className="text-xs text-slate-200 font-semibold leading-relaxed whitespace-pre-wrap">
                              {cleanMsg}
                            </p>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-orange-400">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-white text-sm uppercase">NOT RELEASED YET</h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                          Room ID & Password will be updated here <strong className="text-amber-400">10-15 minutes</strong> before your group match starts.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <Button onClick={() => setShowCredentialsModal(false)} cl
                      CLOSE
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>
      </div>
    </div>
  );
}


// Official-style leaderboard tab with expandable rows per team
function LeaderboardTab({ 
  registrations, 
  leaderboardEntries, 
  tournament, 
  user, 
  isRegistered, 
  canMove, 
  isQualifierType, 
  isSemifinalType, 
  isGrandFinalType, 
  sfATournament, 
  sfBTournament, 
  gfTournament, 
  movingTeam, 
  moveTeam, 
  setShowReportModal,
  matchCredentials,
  setShowCredentialsModal,
  matches = []
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");

  if (registrations.length === 0) {
    return (
      <Card className="bg-slate-900/80 border-slate-800 rounded-2xl">
        <CardContent className="py-14 text-center">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-bold text-sm">No standings data available yet</p>
          <p className="text-slate-500 text-xs mt-1">Teams will appear here once registered or matches begin.</p>
        </CardContent>
      </Card>
    );
  }

  // Dynamic Stages List from tournament data
  const defaultStages = [
    { id: "all", name: "All Stages" },
    { id: "qualifiers", name: "Qualifier" },
    { id: "league", name: "League" },
    { id: "semifinals", name: "Semifinal" },
    { id: "grand_final", name: "Grand Final" }
  ];

  const stagesList = (tournament?.stages && Array.isArray(tournament.stages) && tournament.stages.length > 0)
    ? [{ id: "all", name: "All Stages" }, ...tournament.stages.map((st, i) => typeof st === 'string' ? { id: `stage_${i}`, name: st } : st)]
    : defaultStages;


  // Raw row generation - Merges leaderboardEntries with all registrations so ALL registered teams are visible!
  const rawRows = (() => {
    const lbMap = new Map();
    (leaderboardEntries || []).forEach(lb => {
      if (lb.user_id) lbMap.set(`user_${lb.user_id}`, lb);
      if (lb.id) lbMap.set(`id_${lb.id}`, lb);
      if (lb.team_name) lbMap.set(`name_${String(lb.team_name).trim().toLowerCase()}`, lb);
    });

    const rows = [];

    // If registered teams exist, use registrations as the master list so count matches SLOTS exactly
    if (registrations && registrations.length > 0) {
      registrations.forEach((reg, i) => {
        const lb = (reg.team_leader_id && lbMap.get(`user_${reg.team_leader_id}`)) ||
                   (reg.id && lbMap.get(`id_${reg.id}`)) ||
                   (reg.team_name && lbMap.get(`name_${String(reg.team_name).trim().toLowerCase()}`));

        if (lb) {
          rows.push({
            ...lb,
            _rowUid: `reg-${i}-${reg.id || reg.team_leader_id || i}`,
            id: lb.id || reg.id,
            team_name: reg.team_name || lb.team_name || reg.team_leader_ign || `Team ${i + 1}`,
            player_ign: reg.team_leader_ign || lb.player_ign || "Leader",
            player_uid: reg.team_members?.[0]?.uid || reg.team_leader_uid || lb.player_uid || '-',
            kills: lb.kills !== undefined ? lb.kills : (reg.total_kills || 0),
            points: lb.points !== undefined ? lb.points : (reg.total_points || 0),
            team_members: (reg.team_members && reg.team_members.length > 0) ? reg.team_members : (lb.team_members || []),
            user_id: reg.team_leader_id || lb.user_id,
            team_logo_url: reg.team_logo_url || lb.team_logo_url || "",
            is_qualified: Boolean(lb.is_qualified || reg.is_qualified || reg.status === "Qualified"),
            stage: reg.stage || lb.stage || (isGrandFinalType ? "Grand Final" : isSemifinalType ? "Semifinals" : "Qualifier"),
            group_number: String(Math.floor(i / 12) + 1),
            match_results: lb.match_results || reg.match_results || []
          });
        } else {
          rows.push({
            _rowUid: `reg-${i}-${reg.id || reg.team_leader_id || i}`,
            id: reg.id,
            rank: 999 + i,
            team_name: reg.team_name || reg.team_leader_ign || `Team ${i + 1}`,
            player_ign: reg.team_leader_ign || "Leader",
            player_uid: reg.team_members?.[0]?.uid || reg.team_leader_uid || '-',
            kills: reg.total_kills || 0,
            points: reg.total_points || 0,
            placement: 0,
            wins: 0,
            team_members: reg.team_members || [],
            user_id: reg.team_leader_id,
            team_logo_url: reg.team_logo_url || "",
            is_qualified: Boolean(reg.is_qualified || reg.status === "Qualified"),
            stage: reg.stage || (isGrandFinalType ? "Grand Final" : isSemifinalType ? "Semifinals" : "Qualifier"),
            group_number: String(Math.floor(i / 12) + 1),
            match_results: reg.match_results || []
          });
        }
      });
    } else {
      // Fallback if no registrations exist yet
      (leaderboardEntries || []).forEach((lb, idx) => {
        rows.push({
          ...lb,
          _rowUid: `lb-${idx}-${lb.id || lb.user_id || idx}`,
          id: lb.id,
          team_name: lb.team_name || lb.player_ign || "Unknown Team",
          player_ign: lb.player_ign || "Leader",
          player_uid: lb.player_uid || '-',
          kills: lb.kills || 0,
          points: lb.points || 0,
          team_members: lb.team_members || [],
          user_id: lb.user_id,
          team_logo_url: lb.team_logo_url || "",
          is_qualified: Boolean(lb.is_qualified),
          stage: lb.stage || (isGrandFinalType ? "Grand Final" : isSemifinalType ? "Semifinals" : "Qualifier"),
          group_number: String(Math.floor(idx / 12) + 1),
          match_results: lb.match_results || []
        });
      });
    }

    return rows;
  })();

  const getRegForEntry = (entry) => registrations.find(r => r.team_leader_id === entry.user_id || r.id === entry.id);
  const adminMsg = leaderboardEntries && leaderboardEntries.length > 0 ? (leaderboardEntries[0]?.admin_message || "") : "";
  const isFinalized = leaderboardEntries && leaderboardEntries.length > 0 && leaderboardEntries[0]?.is_finalized;

  // Qualification counts
  const totalQualifiedCount = rawRows.filter(r => r.is_qualified || getRegForEntry(r)?.is_qualified || getRegForEntry(r)?.status === "Qualified").length;

  // Search, Group & Stage Filter
  const filteredRows = rawRows.filter((r, idx) => {
    const origIdx = registrations.findIndex(reg => reg.id === r.id || (reg.team_leader_id && reg.team_leader_id === r.user_id));
    const realIdx = origIdx >= 0 ? origIdx : idx;
    
    const grp = r.group_number !== undefined && r.group_number !== null && String(r.group_number).trim() !== ""
      ? String(r.group_number).replace(/[^0-9]/g, '') || String(r.group_number)
      : String(Math.floor(realIdx / 12) + 1);

    const matchesGrp = selectedGroup === "all" || selectedGroup === grp;

    const isQual = r.is_qualified || getRegForEntry(r)?.is_qualified || getRegForEntry(r)?.status === "Qualified";
    const regStage = String(r.stage || "").toLowerCase();

    let matchesStage = true;
    if (selectedStage === "all") {
      matchesStage = true;
    } else if (selectedStage === "qualified") {
      matchesStage = isQual;
    } else {
      const selLower = selectedStage.toLowerCase();
      const stObj = stagesList.find(s => String(s.id || s).toLowerCase() === selLower || String(s.name || s).toLowerCase() === selLower);
      const targetName = (stObj?.name || selectedStage).toLowerCase();
      const targetId = (stObj?.id || selectedStage).toLowerCase();

      if (targetName.includes("qualifier") || targetName.includes("round 1") || targetId.includes("qualifier")) {
        matchesStage = true;
      } else {
        matchesStage = regStage === targetId ||
                       regStage === targetName ||
                       (targetName && regStage.includes(targetName)) ||
                       (targetName.includes("semi") && (regStage.includes("semi") || isQual)) ||
                       (targetName.includes("final") && (regStage.includes("final") || regStage.includes("grand")));
      }
    }

    const q = (searchQuery || "").toLowerCase().trim();
    if (!q) return matchesGrp && matchesStage;

    const reg = getRegForEntry(r) || {};
    const rawMembers = Array.isArray(r.team_members) && r.team_members.length > 0
      ? r.team_members
      : (Array.isArray(reg.team_members) ? reg.team_members : []);

    const tName = String(r.team_name || reg.team_name || "").toLowerCase();
    const leaderIgn = String(r.player_ign || reg.team_leader_ign || "").toLowerCase();
    const uid = String(r.player_uid || reg.team_leader_uid || "").toLowerCase();

    const memberMatches = rawMembers.some(m => {
      if (!m) return false;
      const mIgn = typeof m === 'string' ? m : (m.ign || m.name || m.player_ign || '');
      const mUid = typeof m === 'object' ? (m.uid || m.game_id || '') : '';
      return String(mIgn).toLowerCase().includes(q) || String(mUid).toLowerCase().includes(q);
    });

    const rankStr = String(idx + 1);
    const matchesQ = tName.includes(q) || leaderIgn.includes(q) || uid.includes(q) || memberMatches || rankStr === q || `#${rankStr}` === q;

    return matchesGrp && matchesStage && matchesQ;
  });

  // Official eSports Tie-Breaker Rule Sorting:
  // Priority 1: Total Points (descending)
  const getBooyahCount = (row) => {
    if (!row?.match_results || !Array.isArray(row.match_results)) return 0;
    return row.match_results.filter(m => m && m.placement === 1).length;
  };
  
  const getLastMatchPlacement = (row) => {
    if (!row?.match_results || !Array.isArray(row.match_results)) return 999;
    const validMatches = row.match_results.filter(m => m);
    if (validMatches.length === 0) return 999;
    const sortedMatches = [...validMatches].sort((a,b) => String(b?.match_number||"").localeCompare(String(a?.match_number||"")));
    return sortedMatches[0]?.placement || 999;
  };

  const sortedFilteredRows = [...filteredRows].sort((a, b) => {
    const ptsA = a.points || 0;
    const ptsB = b.points || 0;
    if (ptsB !== ptsA) return ptsB - ptsA;

    const booA = getBooyahCount(a);
    const booB = getBooyahCount(b);
    if (booB !== booA) return booB - booA;

    const killA = a.kills || 0;
    const killB = b.kills || 0;
    if (killB !== killA) return killB - killA;

    const lastA = getLastMatchPlacement(a);
    const lastB = getLastMatchPlacement(b);
    return lastA - lastB;
  });

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const downloadOfficialStandings = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = toast.loading("⚡ Initializing Esports Booklet Generator...");
    try {
      await generateTournamentPDF({
        tournament,
        leaderboardRows: sortedFilteredRows,
        registrations,
        matches,
        selectedStage,
        selectedGroup,
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
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* ALWAYS VISIBLE CREDENTIALS BUTTON */}
      {isRegistered && (
        <Button 
          onClick={() => setShowCredentialsModal(true)}
          className={`w-full h-11 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer ${matchCredentials ? "bg-cyan-600 hover:bg-cyan-500 text-white animate-[pulse_2s_ease-in-out_infinite] shadow-cyan-900/30 border border-cyan-400" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"}`}
        >
          <Key className={`w-4 h-4 mr-2 ${matchCredentials ? 'text-cyan-100' : 'text-orange-400'}`} />
          {matchCredentials ? "VIEW MATCH CREDENTIALS!" : "VIEW MATCH CREDENTIALS"}
        </Button>
      )}

      {/* Main Standings Table Card */}
      <Card className="bg-slate-900/80 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Header Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 p-2.5 space-y-2">
          {/* Top Row: Title + Badges on Left, Download Button on Right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider truncate">Official Standings</h3>
              <Badge className="bg-slate-800/80 text-slate-300 border border-slate-700/60 text-[10px] font-bold px-1.5 py-0">
                {filteredRows.length}
              </Badge>
              {isFinalized && (
                <Badge className="bg-slate-800/80 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold px-1.5 py-0">
                  ✓ Finalized
                </Badge>
              )}
            </div>

            <button
              onClick={downloadOfficialStandings}
              type="button"
              disabled={isDownloadingPdf}
              title="Download Official Standings PDF Report"
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white text-[11px] font-bold h-7 px-2.5 rounded-md transition-all active:scale-95 shrink-0 cursor-pointer shadow-sm"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-orange-400" />
                  <span>Download</span>
                </>
              )}
            </button>
          </div>

          {/* Filters Row: Stage, Group, Search (Fits 100% display width with ZERO horizontal scroll) */}
          <div className="grid grid-cols-12 gap-1.5 w-full">
            {/* Stage Select Dropdown */}
            <div className="col-span-4">
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-[11px] h-7 rounded-md px-1.5 focus:outline-none truncate"
              >
                {stagesList.map((st) => (
                  <option key={st.id || st.name} value={st.id || st.name}>
                    {st.name || st}
                  </option>
                ))}
              </select>
            </div>

            {/* Group Select Dropdown */}
            <div className="col-span-4">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-[11px] h-7 rounded-md px-1.5 focus:outline-none truncate"
              >
                <option value="all">All Groups</option>
                {Array.from({ length: Math.ceil(Math.max(registrations.length, rawRows.length) / 12) || 1 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    Group {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="col-span-4">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border-slate-800 text-white text-[11px] h-7 px-2"
              />
            </div>
          </div>
        </div>

        {/* Admin Announcement Banner */}
        {adminMsg && (
          <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-3.5 py-2 flex items-center gap-2 text-xs text-cyan-300">
            <span>📢</span>
            <p className="font-semibold truncate">{adminMsg}</p>
          </div>
        )}

        {/* Main Table (Standalone Internal Scroll Container with Sticky Header) */}
        <div className="w-full max-h-[560px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          <table className="w-full text-xs table-fixed">
            <thead className="sticky top-0 bg-slate-950 z-10 shadow-sm">
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-1.5 text-left w-12">S.NO.</th>
                <th className="py-2.5 px-2 text-left">Team Name</th>
                <th className="py-2.5 px-1 text-center w-10">Kills</th>
                <th className="py-2.5 px-1 text-center w-12">POS</th>
                <th className="py-2.5 px-1 text-center w-14">Pts</th>
                <th className="w-6 py-2.5 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedFilteredRows.map((entry, index) => {
                const reg = getRegForEntry(entry) || {};
                const logo = entry.team_logo_url || reg.team_logo_url;
                
                const rawMembers = Array.isArray(entry.team_members) ? entry.team_members : (Array.isArray(reg.team_members) ? reg.team_members : []);
                const members = rawMembers.map((m, idx) => {
                  if (typeof m === 'string') {
                    const isCurrentUser = user && (user.ign === m || user.full_name === m);
                    return {
                      ign: m,
                      uid: '-',
                      isLeader: idx === 0,
                      kills: 0,
                      avatar_url: isCurrentUser ? (user.avatar_url || user.avatar || user.dp || user.photoURL || '') : ''
                    };
                  }
                  if (!m) return { ign: `Player ${idx + 1}`, uid: '-', isLeader: idx === 0, kills: 0, avatar_url: '' };

                  const mUid = m.uid || m.game_id || m.in_game_id || '';
                  const mIgn = m.ign || m.name || m.player_ign || `Player ${idx + 1}`;
                  let mAvatar = m.avatar_url || m.avatar || m.dp || m.photoURL || m.logo || m.logo_url || '';

                  if (!mAvatar && user) {
                    if ((mUid && (mUid === user.game_uid || mUid === user.game_id || mUid === user.uid)) ||
                        (mIgn && (mIgn.toLowerCase() === (user.ign || '').toLowerCase() || mIgn.toLowerCase() === (user.full_name || '').toLowerCase())) ||
                        (idx === 0 && (entry.user_id === user.id || reg.team_leader_id === user.id))) {
                      mAvatar = user.avatar_url || user.avatar || user.dp || user.photoURL || '';
                    }
                  }

                  return {
                    ign: mIgn,
                    uid: mUid || '-',
                    isLeader: Boolean(m.isLeader || idx === 0),
                    kills: m.kills || 0,
                    avatar_url: mAvatar
                  };
                });
                
                const rowId = entry._rowUid || `row-${index}`;
                const isExpanded = expandedId === rowId;
                const rankNum = index + 1;
                const displayName = entry.team_name || entry.player_ign || "Unknown Team";
                const isQualified = entry.is_qualified || reg.is_qualified || reg.status === "Qualified";
                
                const matchResults = Array.isArray(entry.match_results) ? entry.match_results : [];
                const booyahCount = matchResults.filter(mr => mr && mr.placement === 1).length;

                return (
                  <React.Fragment key={rowId}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : rowId)}
                      className={`cursor-pointer transition-colors hover:bg-slate-800/40 ${
                        rankNum === 1 ? 'bg-amber-500/5' :
                        rankNum === 2 ? 'bg-slate-400/5' :
                        rankNum === 3 ? 'bg-amber-700/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-1.5 font-black text-left">
                        <span className={`text-[11px] ${
                          rankNum === 1 ? 'text-amber-400 font-black' :
                          rankNum === 2 ? 'text-slate-300 font-black' :
                          rankNum === 3 ? 'text-amber-600 font-black' : 'text-slate-500 font-bold'
                        }`}>
                          #{rankNum}
                        </span>
                      </td>

                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {logo ? (
                            <img src={logo} alt="" className="w-7 h-7 min-w-[28px] max-w-[28px] min-h-[28px] max-h-[28px] rounded-md object-cover border border-slate-700 shrink-0" onError={e=>e.target.style.display='none'} />
                          ) : (
                            <div className="w-7 h-7 min-w-[28px] max-w-[28px] min-h-[28px] max-h-[28px] rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white text-[11px] truncate leading-tight">{displayName}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-1 text-center">
                        <span className="font-bold text-red-400 text-[11px]">{entry.kills || 0}</span>
                      </td>

                      <td className="py-2.5 px-1 text-center">
                        <span className="font-bold text-slate-300 text-[11px]">
                          {entry.placement_points !== undefined ? entry.placement_points : Math.max(0, (entry.points || 0) - (entry.kills || 0))}
                        </span>
                      </td>

                      <td className="py-2.5 px-1 text-center">
                        <span className="font-black text-cyan-400 text-[11px]">
                          {entry.points || 0}
                        </span>
                      </td>

                      <td className="py-2.5 text-center text-slate-500 text-[9px]">
                        {isExpanded ? '▲' : '▼'}
                      </td>
                    </tr>

                    {/* Expanded Team Breakdown Drawer */}
                    {isExpanded && (
                      <tr className="border-b border-slate-800/80">
                        <td colSpan={6} className="px-3 py-2.5 bg-slate-950/95">
                          <div className="space-y-2">

                            {/* Squad Roster — Clean Compact 4-Col Grid */}
                            {members.length > 0 && (
                              <div className="bg-slate-900/60 border border-slate-800/70 rounded-lg p-2">
                                <div className="flex items-center justify-between mb-1.5 px-0.5">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-amber-400" /> Squad Roster
                                  </span>
                                  {user && isRegistered && entry.user_id !== user.id && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setShowReportModal(entry); }}
                                      className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px] font-semibold"
                                    >
                                      <AlertTriangle className="w-3 h-3" /> Report
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                  {members.map((m, idx) => {
                                    const avatarSrc = m.avatar_url || m.avatar || m.dp || m.photoURL;
                                    return (
                                      <div key={idx} className="flex items-center justify-between px-2 py-1.5 bg-slate-950/70 border border-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          {avatarSrc ? (
                                            <img
                                              src={avatarSrc}
                                              alt={m.ign}
                                              className="w-6 h-6 rounded-full object-cover border border-amber-500/40 shrink-0 shadow-sm"
                                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                          ) : null}
                                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 items-center justify-center text-[10px] font-black text-amber-400 shrink-0 shadow-sm ${avatarSrc ? 'hidden' : 'flex'}`}>
                                            {m.ign?.charAt(0).toUpperCase() || (idx + 1)}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1">
                                              <span className="font-bold text-slate-200 text-[11px] truncate max-w-[65px]">{m.ign}</span>
                                              {m.isLeader && <span className="text-[7.5px] font-black text-amber-400 bg-amber-500/20 px-1 py-0.2 rounded shrink-0">IGL</span>}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-red-400 shrink-0 ml-1">
                                          <span className="text-[9px]">💀</span>
                                          <span>{m.kills || 0} Kills</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Match Breakdown — Clean Grid */}
                            {matchResults.length > 0 && (() => {
                              const sortedMatches = [...matchResults]
                                .filter(mr => mr)
                                .sort((a, b) => {
                                  const numA = parseInt(String(a.match_number || '').replace(/\D/g, '')) || 0;
                                  const numB = parseInt(String(b.match_number || '').replace(/\D/g, '')) || 0;
                                  return numA - numB;
                                });
                              const totalMatchKills = sortedMatches.reduce((sum, mr) => sum + (mr.kills || 0), 0);
                              const totalMatchPts = sortedMatches.reduce((sum, mr) => sum + (mr.points || 0), 0);
                              const totalBooyahs = sortedMatches.filter(mr => mr.placement === 1).length;

                              return (
                                <div className="bg-slate-900/60 border border-slate-800/70 rounded-lg p-2">
                                  {/* Section header with totals */}
                                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                      <Trophy className="w-3.5 h-3.5 text-cyan-400" /> Match Breakdown
                                      <span className="text-slate-600 font-normal normal-case">({sortedMatches.length} matches)</span>
                                    </span>
                                    <div className="flex items-center gap-2 text-[10px]">
                                      {totalBooyahs > 0 && <span className="text-amber-400 font-bold">🏆 {totalBooyahs}x</span>}
                                      <span className="text-slate-400">Total: <span className="text-red-400 font-bold">{totalMatchKills} Kills</span></span>
                                      <span className="text-slate-600">·</span>
                                      <span className="text-cyan-400 font-bold">{totalMatchPts} Pts</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5">
                                    {sortedMatches.map((mr, mi) => {
                                      const pKillsRaw = mr.player_kills || mr.memberKills || mr.member_kills || [];
                                      const pKillsList = Array.isArray(pKillsRaw) && pKillsRaw.length > 0 ? pKillsRaw : members.map((m, idx) => {
                                        const totK = mr.kills || 0;
                                        let pK = 0;
                                        if (idx === 0) pK = Math.ceil(totK * 0.4);
                                        else if (idx === 1) pK = Math.floor(totK * 0.3);
                                        else if (idx === 2) pK = Math.floor(totK * 0.2);
                                        else pK = Math.max(0, totK - Math.ceil(totK * 0.4) - Math.floor(totK * 0.3) - Math.floor(totK * 0.2));
                                        return { ign: m.ign, kills: pK };
                                      });

                                      return (
                                        <div key={mi} className="bg-slate-950/70 border border-slate-800/50 rounded p-1.5">
                                          {/* Match header */}
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-slate-200 text-[11px]">Match {String(mr.match_number || (mi+1)).replace(/\D/g, '')}</span>
                                            {mr.placement === 1
                                              ? <span className="text-amber-400 font-black text-[9.5px]">🏆 Booyah</span>
                                              : <span className="text-slate-400 text-[9.5px]">Rank #{mr.placement || '—'}</span>
                                            }
                                          </div>
                                          {/* Kills & Pts Bar */}
                                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 pb-1 border-b border-slate-800/40">
                                            <span>Kills: <strong className="text-red-400">{mr.kills || 0}</strong></span>
                                            <span>Pts: <strong className="text-cyan-400">{mr.points || 0}</strong></span>
                                          </div>
                                          {/* Player Kills inline */}
                                          {pKillsList && pKillsList.length > 0 && (
                                            <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[9.5px]">
                                              {pKillsList.filter(pk => pk).map((pk, pki) => (
                                                <div key={pki} className="flex items-center justify-between">
                                                  <span className="text-slate-400 truncate max-w-[55px]">{pk.ign || `P${pki+1}`}</span>
                                                  <span className="text-red-400 font-bold">{pk.kills || 0}k</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`p-4 rounded-lg bg-gradient-to-br ${
      color === 'purple' ? 'from-purple-900/30 to-purple-800/10 border border-purple-500/20' : 'from-cyan-900/30 to-cyan-800/10 border border-cyan-500/20'
    }`}>
      <Icon className={`w-5 h-5 mb-2 ${color === 'purple' ? 'text-purple-400' : 'text-cyan-400'}`} />
      <div className="text-xl font-bold text-gray-100">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-purple-400" />
      <div className="flex-1">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="font-semibold text-gray-100">{value}</p>
      </div>
    </div>
  );
}

function MoveCell({ reg, isQualifierType, isSemifinalType, sfATournament, sfBTournament, gfTournament, movingTeam, moveTeam }) {
  const isMoving = movingTeam && (movingTeam.id === reg.id || movingTeam.user_id === reg.team_leader_id);
  
  return (
    <td className="py-3 px-2 text-center">
      <div className="flex gap-1 justify-center">
        {isQualifierType && (
          <>
            {sfATournament ? (
              <Button size="sm" disabled={!!movingTeam} onClick={() => moveTeam(reg, "semifinal", "A")} className="bg-purple-600 hover:bg-purple-700 text-xs h-7 px-2">
                {isMoving && movingTeam?.group === "A" ? "..." : "SF-A"}
              </Button>
            ) : (
              <span className="text-gray-600 text-xs px-1" title="No Semifinal A tournament exists">SF-A</span>
            )}
            {sfBTournament ? (
              <Button size="sm" disabled={!!movingTeam} onClick={() => moveTeam(reg, "semifinal", "B")} className="bg-purple-500 hover:bg-purple-600 text-xs h-7 px-2">
                {isMoving && movingTeam?.group === "B" ? "..." : "SF-B"}
              </Button>
            ) : (
              <span className="text-gray-600 text-xs px-1" title="No Semifinal B tournament exists">SF-B</span>
            )}
          </>
        )}
        {(isQualifierType || isSemifinalType) && (
          gfTournament ? (
            <Button size="sm" disabled={!!movingTeam} onClick={() => moveTeam(reg, "grand_final")} className="bg-red-600 hover:bg-red-700 text-xs h-7 px-2">
              {isMoving && movingTeam?.stage === "grand_final" ? "..." : "GF"}
            </Button>
          ) : (
            <span className="text-gray-600 text-xs px-1" title="No Grand Final tournament exists">GF</span>
          )
        )}
      </div>
    </td>
  );
}

function TeamCard({ reg, index, isSolo, showPoints, grandFinal, showGroupBadge = true }) {
  const [expanded, setExpanded] = useState(false);
  const [memberAvatars, setMemberAvatars] = useState({});

  const isQualified = reg.is_qualified || reg.status === "Qualified";
  const hasMembers = !isSolo && reg.team_members && reg.team_members.length > 0;
  const userChosenSlot = reg.slot_number ?? reg.slot ?? reg.selected_slot ?? reg.slot_no ?? reg.group_slot;
  const userChosenGroup = reg.group_number ?? reg.group ?? reg.group_name;
  // Unique slot per team: use stored slot or globally unique index+1
  const slotNum = userChosenSlot !== undefined && userChosenSlot !== null && userChosenSlot !== "" 
    ? String(userChosenSlot).replace(/[^0-9]/g, '') || userChosenSlot 
    : ((index || 0) + 1);
  const groupNum = userChosenGroup !== undefined && userChosenGroup !== null && userChosenGroup !== ""
    ? String(userChosenGroup).replace(/[^0-9]/g, '') || userChosenGroup
    : (Math.floor((index || 0) / 12) + 1);

  React.useEffect(() => {
    if (!expanded || !hasMembers) return;
    let isMounted = true;

    const fetchMemberAvatars = async () => {
      const avatarMap = {};
      await Promise.all(reg.team_members.map(async (m) => {
        const mUid = m.uid || m.game_id || m.in_game_id;
        const key = mUid || m.ign;
        const existingDp = m.avatar_url || m.avatar || m.logo_url || m.logo || m.image || m.photoURL || m.dp;
        if (existingDp) {
          avatarMap[key] = existingDp;
          return;
        }

        try {
          let uObj = null;
          if (mUid) {
            const byUid = await User.filter({ game_uid: mUid }).catch(() => []);
            if (byUid && byUid.length > 0) uObj = byUid[0];
            else {
              const byUid2 = await User.filter({ game_id: mUid }).catch(() => []);
              if (byUid2 && byUid2.length > 0) uObj = byUid2[0];
              else {
                const byUid3 = await User.filter({ uid: mUid }).catch(() => []);
                if (byUid3 && byUid3.length > 0) uObj = byUid3[0];
              }
            }
          }
          if (!uObj && m.ign) {
            const byIgn = await User.filter({ ign: m.ign }).catch(() => []);
            if (byIgn && byIgn.length > 0) uObj = byIgn[0];
          }

          if (uObj) {
            const dp = uObj.avatar_url || uObj.avatar || uObj.dp || uObj.photoURL;
            if (dp) avatarMap[key] = dp;
          }
        } catch (e) {}
      }));

      if (isMounted && Object.keys(avatarMap).length > 0) {
        setMemberAvatars(prev => ({ ...prev, ...avatarMap }));
      }
    };

    fetchMemberAvatars();
    return () => { isMounted = false; };
  }, [expanded, hasMembers, reg.team_members]);

  return (
    <div className="bg-slate-900/60 rounded-lg overflow-hidden border border-slate-800/80 transition-all">
      {/* Compact Main Row */}
      <div
        className={`flex items-center gap-2.5 px-3 py-2 ${hasMembers ? 'cursor-pointer hover:bg-slate-800/50 transition-colors' : ''}`}
        onClick={() => hasMembers && setExpanded(!expanded)}
      >
        {/* Compact Logo / Rank Badge */}
        {reg.team_logo_url ? (
          <img 
            src={reg.team_logo_url} 
            alt="logo" 
            className="w-7 h-7 rounded-md object-cover border border-slate-700/80 flex-shrink-0" 
            onError={e => e.target.style.display='none'} 
          />
        ) : (
          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
            grandFinal && index === 0 ? 'bg-amber-500 text-slate-950 font-black' :
            grandFinal && index === 1 ? 'bg-slate-400 text-slate-950 font-black' :
            grandFinal && index === 2 ? 'bg-amber-700 text-white font-black' :
            'bg-slate-800 border border-slate-700/80 text-orange-400 font-bold'
          }`}>
            {index + 1}
          </div>
        )}

        {/* Team Name */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="font-bold text-white text-xs truncate">
            {isSolo ? (reg.team_members?.[0]?.ign || reg.team_leader_ign) : reg.team_name}
          </p>
          {isQualified && <span className="text-emerald-400 text-[11px] font-bold">✓</span>}
        </div>

        {/* Group & Slot Badge + Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showGroupBadge ? (
            <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
              G{groupNum} • #{slotNum}
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
              Slot #{slotNum}
            </span>
          )}

          {isSolo && reg.team_members?.[0]?.uid && (
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">UID: {reg.team_members[0].uid}</span>
          )}

          {showPoints && (
            <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] border border-cyan-500/30 px-1.5 py-0.2">
              {reg.total_points || 0} pts
            </Badge>
          )}

          {hasMembers && (
            <span className="text-slate-500 text-[10px]">{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>
      
      {/* Compact Expanded Roster Drawer */}
      {expanded && hasMembers && (
        <div className="border-t border-slate-800/60 bg-slate-950/70 p-2 space-y-1">
          {reg.team_members.map((member, idx) => {
            const mUid = member.uid || member.game_id || member.in_game_id;
            const pName = member.ign || member.name || `Player ${idx + 1}`;
            const key = mUid || pName;
            const avatarSrc = member.avatar_url || member.avatar || member.logo_url || member.logo || member.image || memberAvatars[key];

            return (
              <div key={idx} className="flex items-center justify-between py-1.5 px-2.5 bg-slate-900/80 border border-slate-800/80 rounded-lg text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={pName}
                      className="w-6 h-6 rounded-full object-cover border border-amber-500/40 shrink-0 shadow-sm"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0 shadow-sm">
                      {pName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-slate-200 truncate">{pName}</span>
                </div>
                {mUid && (
                  <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">UID: {mUid}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

                      src={avatarSrc}
                      alt={pName}
                      className="w-6 h-6 rounded-full object-cover border border-amber-500/40 shrink-0 shadow-sm"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0 shadow-sm">
                      {pName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-slate-200 truncate">{pName}</span>
                </div>
                {mUid && (
                  <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">UID: {mUid}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

            <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
              Slot #{slotNum}
            </span>
          )}

            <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] border border-cyan-500/30 px-1.5 py-0.2">
              {reg.total_points || 0} pts
            </Badge>
          )}

          {hasMembers && (
            <span className="text-slate-500 text-[10px]">{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>
      
      {/* Compact Expanded Roster Drawer */}
      {expanded && hasMembers && (
        <div className="border-t border-slate-800/60 bg-slate-950/70 p-2 space-y-1">
          {reg.team_members.map((member, idx) => {
            const mUid = member.uid || member.game_id || member.in_game_id;
            const pName = member.ign || member.name || `Player ${idx + 1}`;
            const key = mUid || pName;
            const avatarSrc = member.avatar_url || member.avatar || member.logo_url || member.logo || member.image || memberAvatars[key];

            return (
              <div key={idx} className="flex items-center justify-between py-1.5 px-2.5 bg-slate-900/80 border border-slate-800/80 rounded-lg text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={pName}
                      className="w-6 h-6 rounded-full object-cover border border-amber-500/40 shrink-0 shadow-sm"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0 shadow-sm">
                      {pName.charAt(0).toUpperCase()}
                    </div>
            <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] border border-cyan-500/30 px-1.5 py-0.2">
              {reg.total_points || 0} pts
            </Badge>
          )}

          {hasMembers && (
            <span className="text-slate-500 text-[10px]">{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>
      
      {/* Compact Expanded Roster Drawer */}
      {expanded && hasMembers && (
        <div className="border-t border-slate-800/60 bg-slate-950/70 p-2 space-y-1">
          {reg.team_members.map((member, idx) => {
            const mUid = member.uid || member.game_id || member.in_game_id;
            const pName = member.ign || member.name || `Player ${idx + 1}`;
            const key = mUid || pName;
            const avatarSrc = member.avatar_url || member.avatar || member.logo_url || member.logo || member.image || memberAvatars[key];

            return (
              <div key={idx} className="flex items-center justify-between py-1.5 px-2.5 bg-slate-900/80 border border-slate-800/80 rounded-lg text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={pName}
                      className="w-6 h-6 rounded-full object-cover border border-amber-500/40 shrink-0 shadow-sm"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0 shadow-sm">
                      {pName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-slate-200 truncate">{pName}</span>
                </div>
                {mUid && (
                  <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">UID: {mUid}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`p-4 rounded-lg bg-gradient-to-br ${
      color === 'purple' ? 'from-purple-900/30 to-purple-800/10 border border-purple-500/20' : 'from-cyan-900/30 to-cyan-800/10 border border-cyan-500/20'
    }`}>
      <Icon className={`w-5 h-5 mb-2 ${color === 'purple' ? 'text-purple-400' : 'text-cyan-400'}`} />
      <div className="text-xl font-bold text-gray-100">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-purple-400" />
      <div className="flex-1">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="font-semibold text-gray-100">{value}</p>
      </div>
    </div>
  );
}

function MoveCell({ reg, isQualifierType, isSemifinalType, sfATournament, sfBTournament, gfTournament, movingTeam, moveTeam }) {
  const isMoving = movingTeam && (movingTeam.id === reg.id || movingTeam.user_id === reg.team_leader_id);
  
  return (
    <td className="py-3 px-2 text-center">
      <div className="flex gap-1 justify-center">
        {isQualifierType && (
          <>
            {sfATournament ? (
              <Button size="sm" disabled={!!movingTeam} onClick={() => moveTeam(reg, "semifinal", "A")} className="bg-purple-600 hover:bg-purple-700 text-xs h-7 px-2">
                {isMoving && movingTeam?.group === "A" ? "..." : "SF-A"}
              </Button>
            ) : (
              <span className="text-gray-600 text-xs px-1" title="No Semifinal A tournament exists">SF-A</span>
            )}
            {sfBTournament ? (
              <Button size="sm" disabled={!!movingTeam} onClick={() => moveTeam(reg, "semifinal", "B")} className="bg-purple-500 hover:bg-purple-600 text-xs h-7 px-2">
                {isMoving && movingTeam?.group === "B" ? "..." : "SF-B"}
              </Button>
            ) : (
              <span className="text-gray-600 text-xs px-1" title="No Semifinal B tournament exists">SF-B</span>
            )}
          </>
        )}
        {(isQualifierType || isSemifinalType) && (
          gfTournament ? (
            <Button size="sm" disabled={!!movingTeam} onClick={() => moveTeam(reg, "grand_final")} className="bg-red-600 hover:bg-red-700 text-xs h-7 px-2">
              {isMoving && movingTeam?.stage === "grand_final" ? "..." : "GF"}
            </Button>
          ) : (
            <span className="text-gray-600 text-xs px-1" title="No Grand Final tournament exists">GF</span>
          )
        )}
      </div>
    </td>
  );
}

function TeamCard({ reg, index, stageGroup, stageSlot, isSolo, showPoints, grandFinal, showGroupBadge = true, currentStageIdx = 0, stagesList = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [memberAvatars, setMemberAvatars] = useState({});

  const statusLower = String(reg.status || "").toLowerCase();
  const isDisqualified = Boolean(reg.is_disqualified || reg.is_eliminated || statusLower === "disqualified" || statusLower === "eliminated" || statusLower === "rejected");
  
  // Find team's highest reached stage index
  const teamStageIdx = stagesList.findIndex(s => {
    const raw = String(reg.stage || reg.stage_id || "").toLowerCase().trim().replace(/\s+/g, '_');
    const sId = String(s.id || s).toLowerCase().trim().replace(/\s+/g, '_');
    const sName = String(s.name || s).toLowerCase().trim().replace(/\s+/g, '_');
    return raw === sId || raw === sName || (sName && raw.includes(sName)) || (sId && raw.includes(sId));
  });

  const isMovedAhead = teamStageIdx !== -1 && teamStageIdx > currentStageIdx;
  const isQualified = !isDisqualified && (isMovedAhead || Boolean(reg.is_qualified || statusLower === "qualified" || statusLower === "finalist" || reg.is_finalist || reg.is_semifinalist));
