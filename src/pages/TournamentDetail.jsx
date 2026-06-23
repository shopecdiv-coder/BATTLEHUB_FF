import React, { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, Users, Trophy, MapPin, ArrowLeft, Clock, 
  DollarSign, ScrollText, Flag, Key, Edit, Save, AlertTriangle, ChevronDown, ChevronUp, MessageCircle, Image, X, User as UserIcon, ArrowRight, Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";


import StepByStepRegistration from "../components/tournament/StepByStepRegistration";
import MatchList from "../components/tournament/MatchList";
import RegistrationCloseTimer from "../components/RegistrationCloseTimer";
import TournamentChat from "../components/tournament/TournamentChat";
import TournamentChatFullscreen from "../components/tournament/TournamentChatFullscreen";
import InviteManager, { SendInvitePanel } from "../components/tournament/InviteSystem";

export default function TournamentDetail() {
  const safeFormatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "N/A";
      return format(d, "PPP p");
    } catch (e) {
      return "N/A";
    }
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

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const tournamentData = await Tournament.filter({ id: tournamentId });
      if (tournamentData.length > 0) {
        setTournament(tournamentData[0]);
      }

      const allRegistrations = await Registration.filter({ tournament_id: tournamentId });
      setRegistrations(allRegistrations);

      const userReg = allRegistrations.find(r => r.team_leader_id === currentUser.id);
      setIsRegistered(!!userReg);
      setUserRegistration(userReg);
      if (userReg) {
        setEditIGN(userReg.team_members?.[0]?.ign || userReg.team_leader_ign || "");
        setEditUID(userReg.team_members?.[0]?.uid || "");
      }

      const tournamentMatches = await Match.filter({ tournament_id: tournamentId }, "-match_number");
      setMatches(tournamentMatches);

      // Load tournament leaderboard
      const lbEntries = await TournamentLeaderboard.filter({ tournament_id: tournamentId }, "rank").catch(() => []);
      setLeaderboardEntries(lbEntries || []);

      // Load existing target tournaments for move system (admin only) — only non-Completed
      if (currentUser.role === "admin") {
        const sfAll = await Tournament.filter({ tournament_type: "Semifinal" }).catch(() => []);
        const gfAll = await Tournament.filter({ tournament_type: "Grand Final" }).catch(() => []);
        const openSf = sfAll.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
        const openGf = gfAll.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
        setSfATournament(openSf.find(t => t.semifinal_group === "A") || null);
        setSfBTournament(openSf.find(t => t.semifinal_group === "B") || null);
        setGfTournament(openGf?.[0] || null);
      }
    } catch (error) {
      console.error("Error loading tournament:", error);
    }
    setLoading(false);
  };

  const handleRegistrationSuccess = async () => {
    setShowRegistrationModal(false);
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

  const submitReport = async (reportedPlayer) => {
    if (!reportReason || !user) return;
    
    // Check if user is registered in this tournament
    if (!isRegistered) {
      alert("❌ You must be registered in this tournament to report players!");
      setShowReportModal(null);
      return;
    }
    
    setSubmittingReport(true);
    try {
      await Report.create({
        reporter_id: user.id,
        reporter_ign: user.ign || user.full_name,
        reported_user_id: reportedPlayer.user_id || reportedPlayer.team_leader_id,
        reported_ign: reportedPlayer.player_ign || reportedPlayer.team_leader_ign,
        tournament_id: tournamentId,
        reason: reportReason,
        description: reportDescription,
        status: "Pending"
      });
      alert("✅ Report submitted! Admin will review it.");
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

  const isAdmin = user?.role === "admin";
  const isQualifierType = tournament?.tournament_type === "Qualifier";
  const isSemifinalType = tournament?.tournament_type === "Semifinal";
  const canMove = isAdmin && (isQualifierType || isSemifinalType);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
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

  const isSemifinalOrFinal = tournament.tournament_type === "Semifinal" || tournament.tournament_type === "Grand Final" || tournament.stage === "semifinal" || tournament.stage === "grand_final";

  // Generate Tournament ID (sequential number)
  const tournamentNumber = tournament.created_date 
    ? String(new Date(tournament.created_date).getTime()).slice(-4)
    : "0000";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Tournaments"))}
            className="text-gray-400 hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Button>
        </div>

        <div className="space-y-6">
          <div className="space-y-6">
            <div>
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-orange-600/30 to-red-600/30 relative">
                  {tournament.banner_url && (
                    <img 
                      src={tournament.banner_url} 
                      alt={tournament.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40" />
                  
                  {/* Tournament ID Badge */}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-lg px-4 py-1 font-mono">
                      ID: #{tournamentNumber}
                    </Badge>
                  </div>

                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {isSemifinalOrFinal && (
                      <Badge className={tournament.tournament_type === "Grand Final" ? "bg-yellow-500 text-black text-lg px-4 py-1 font-bold" : "bg-purple-500 text-white text-lg px-4 py-1 font-bold"}>
                        {tournament.tournament_type || (tournament.stage === "grand_final" ? "Grand Final" : "Semifinal")}
                      </Badge>
                    )}
                    {!isSemifinalOrFinal ? (
                      <Badge className={
                        tournament.status === "Live" ? "bg-red-500 text-white text-lg px-4 py-1" :
                        tournament.status === "Registration Open" ? "bg-green-500 text-white text-lg px-4 py-1" :
                        "bg-gray-500 text-white text-lg px-4 py-1"
                      }>
                        {tournament.status}
                      </Badge>
                    ) : tournament.status === "Live" ? (
                      <Badge className="bg-red-500 text-white text-lg px-4 py-1">Live</Badge>
                    ) : null}
                  </div>
                  <div className="absolute bottom-6 left-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                      {tournament.title}
                    </h1>
                    <p className="text-gray-300">by {tournament.organizer_name}</p>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoCard
                      icon={Trophy}
                      label="Prize Pool"
                      value={`₹${tournament.prize_pool?.toLocaleString() || 0}`}
                      color="purple"
                    />
                    <InfoCard
                      icon={DollarSign}
                      label={isSemifinalOrFinal ? "Entry" : "Entry Fee"}
                      value={isSemifinalOrFinal ? "Points Based" : `₹${tournament.entry_fee || 0}`}
                      color="cyan"
                    />
                    <InfoCard
                      icon={Users}
                      label="Teams"
                      value={`${registrations.length || 0}/${tournament.max_teams}`}
                      color="purple"
                    />
                    <InfoCard
                      icon={MapPin}
                      label="Map"
                      value={tournament.map}
                      color="cyan"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Room ID and Password Section - Only for Registered Users */}
            {isRegistered && tournament.room_code && (
              <div>
                <Card className={isSemifinalOrFinal
                  ? "bg-gradient-to-br from-yellow-900/30 via-gray-900 to-orange-900/20 border-2 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)]"
                  : "bg-gradient-to-br from-green-900/30 to-green-800/10 border-2 border-green-500/50"}>
                  {isSemifinalOrFinal && (
                    <div className="bg-gradient-to-r from-yellow-600/30 to-orange-600/20 px-4 py-2 border-b border-yellow-500/30 flex items-center justify-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-300 font-bold text-sm tracking-widest uppercase">
                        {tournament.tournament_type === "Grand Final" || tournament.stage === "grand_final" ? "🏆 Grand Final Arena" : "⚔️ Semifinal Arena"}
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isSemifinalOrFinal ? "text-yellow-400" : "text-green-400"}`}>
                      <Key className="w-5 h-5" />
                      Room Credentials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-[#00FFFF] text-sm font-bold mb-2">ROOM ID</p>
                      <div className="glass-card border-2 border-[#00FFFF] rounded-lg px-4 py-4 bg-gray-800/50">
                        <p className="font-display text-3xl font-black text-[#00FFFF] text-center tracking-wider">
                          {tournament.room_code}
                        </p>
                      </div>
                    </div>
                    
                    {tournament.room_message && (
                      <div className="mt-4 p-4 rounded-xl bg-gray-950/80 border border-green-500/30 text-xs text-green-300 whitespace-pre-wrap break-words">
                        <p className="font-bold text-[10px] text-green-400 uppercase tracking-wider mb-1">📢 Admin Message</p>
                        {tournament.room_message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="bg-gray-800 w-full grid grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-100">Tournament Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DetailRow icon={Calendar} label="Date & Time" value={safeFormatDate(tournament.date_time)} />
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-purple-400" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-400">Registration Closes</p>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-gray-100">{safeFormatDate(tournament.registration_closes)}</p>
                            <RegistrationCloseTimer closingDate={tournament.registration_closes} />
                          </div>
                        </div>
                      </div>
                      <DetailRow icon={Flag} label="Mode" value={tournament.mode} />
                      <DetailRow icon={MapPin} label="Map" value={tournament.map} />
                      
                      {/* Prize Distribution - Collapsible */}
                      {tournament.prize_distribution && (
                        <div className="pt-4 border-t border-gray-700">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setPrizeCollapsed(!prizeCollapsed)}
                              className="flex items-center gap-2 text-left"
                            >
                              <h4 className="font-semibold text-yellow-400 flex items-center gap-2">
                                🏆 Prize Distribution
                              </h4>
                              {prizeCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                            </button>
                            {tournament.prize_image_url && (
                              <button
                                onClick={() => setShowPrizeImageModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-400 text-xs font-semibold"
                              >
                                <Image className="w-3.5 h-3.5" />
                                Prize Chart
                              </button>
                            )}
                          </div>
                          {!prizeCollapsed && (
                            <div className="mt-3 space-y-1.5">
                              {Array.from({ length: tournament.max_teams || 3 }, (_, i) => {
                                const pos = i + 1;
                                const key = pos === 1 ? "first" : pos === 2 ? "second" : pos === 3 ? "third" : `pos_${pos}`;
                                const prize = tournament.prize_distribution[key];
                                if (!prize || prize <= 0) return null;
                                const medals = ["🥇", "🥈", "🥉"];
                                const label = pos <= 3 ? `${medals[i]} ${pos}${pos===1?"st":pos===2?"nd":"rd"} Place` : `🏅 #${pos} Place`;
                                return (
                                  <div key={pos} className="flex justify-between text-sm">
                                    <span className="text-gray-400">{label}</span>
                                    <span className="text-yellow-400 font-semibold">₹{prize}</span>
                                  </div>
                                );
                              })}
                              <p className="text-xs text-orange-400/80 mt-3 italic border border-orange-500/20 bg-orange-500/5 rounded p-2">⚠️ {tournament.prize_note || "Prize amount may vary based on performance of the match"}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Registration Section - hidden for Semifinal/Grand Final */}
                  {!isSemifinalOrFinal && (
                  <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-100">Registration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isRegistered ? (
                        <div className="space-y-3">
                          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-green-400 font-semibold text-center">✓ You are registered for this tournament</p>
                            {user && (
                              <p className="text-center text-xs text-cyan-400 mt-1 font-mono">
                                Your Unique ID: <span className="font-bold">{user.unique_id || `BH${user.id.substring(0,6).toUpperCase()}`}</span>
                              </p>
                            )}
                          </div>
                          <div className="p-4 bg-gray-800/50 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-gray-300 font-semibold">Your Details</p>
                              {!editingReg && tournament.status !== "Completed" && (
                                <Button size="sm" variant="ghost" onClick={() => setEditingReg(true)} className="text-cyan-400">
                                  <Edit className="w-4 h-4 mr-1" /> Edit
                                </Button>
                              )}
                            </div>
                            {editingReg ? (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-gray-400 text-xs">In-Game Name (IGN)</Label>
                                  <Input value={editIGN} onChange={(e) => setEditIGN(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
                                </div>
                                <div>
                                  <Label className="text-gray-400 text-xs">Game UID</Label>
                                  <Input value={editUID} onChange={(e) => setEditUID(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={saveRegistrationEdit} disabled={savingEdit || !editIGN || !editUID} className="flex-1 bg-green-600 hover:bg-green-700" size="sm">
                                    <Save className="w-4 h-4 mr-1" />{savingEdit ? "Saving..." : "Save"}
                                  </Button>
                                  <Button onClick={() => setEditingReg(false)} variant="outline" size="sm" className="border-gray-600">Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-white">IGN: <span className="text-cyan-400">{userRegistration?.team_members?.[0]?.ign || userRegistration?.team_leader_ign}</span></p>
                                <p className="text-white">UID: <span className="text-cyan-400 font-mono">{userRegistration?.team_members?.[0]?.uid || '-'}</span></p>
                              </div>
                            )}
                          </div>
                          <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-lg">
                            <p className="text-yellow-400 text-sm text-center font-medium">📢 Room ID & Password will appear in a pop-up 10 minutes before match starts. Please stay ready!</p>
                          </div>
                        </div>
                      ) : tournament.status === "Registration Open" ? (
                        <>
                          <p className="text-sm text-gray-400">Spots remaining: {tournament.max_teams - (registrations.length || 0)}</p>
                          <Button
                            className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold"
                            onClick={() => setShowRegistrationModal(true)}
                            disabled={!user || registrations.length >= tournament.max_teams}
                          >
                            {registrations.length >= tournament.max_teams ? "Slots Full" : "Register Now"}
                          </Button>

                        </>
                      ) : (
                        <div className="p-4 bg-gray-800 rounded-lg">
                          <p className="text-gray-400 text-center">Registration is closed</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  )}

                  {/* Teams Section */}
                  {tournament.tournament_type === "Semifinal" && (
                    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-purple-500/30">
                      <CardHeader>
                        <CardTitle className="text-purple-400 flex items-center gap-2">
                          <Users className="w-5 h-5" /> Qualified Teams ({registrations.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {registrations.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-6">No teams qualified yet. Admin will move teams here from Qualifier.</p>
                          ) : (
                            registrations.map((reg, index) => (
                              <TeamCard key={reg.id} reg={reg} index={index} isSolo={tournament.mode === "Solo"} showPoints />
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {tournament.tournament_type === "Grand Final" && (
                    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/30">
                      <CardHeader>
                        <CardTitle className="text-yellow-400 flex items-center gap-2">
                          <Trophy className="w-5 h-5" /> Grand Final — Qualified Teams ({registrations.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {registrations.length === 0 ? (
                            <div className="text-center py-8">
                              <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-3 opacity-50" />
                              <p className="text-gray-500 text-sm">No teams qualified yet.</p>
                              <p className="text-gray-600 text-xs mt-1">Admin will move teams here from Semifinals.</p>
                            </div>
                          ) : (
                            registrations.map((reg, index) => (
                              <TeamCard key={reg.id} reg={reg} index={index} isSolo={tournament.mode === "Solo"} showPoints grandFinal />
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!isSemifinalOrFinal && (
                    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-gray-100">
                          Registered Teams ({registrations.length}/{tournament.max_teams})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {registrations.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">No teams registered yet</p>
                          ) : (
                            registrations.map((reg, index) => (
                              <TeamCard key={reg.id} reg={reg} index={index} isSolo={tournament.mode === "Solo"} />
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Slots section for Qualifier */}
                  {!isSemifinalOrFinal && registrations.length > 0 && (
                    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-gray-100 text-sm">Time Slots</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {Array.from({ length: tournament.max_slots || 12 }, (_, i) => {
                            const slotNum = i + 1;
                            const slotReg = registrations.find(r => r.time_slot === slotNum);
                            return (
                              <div key={slotNum} className={`p-2 rounded-lg text-center text-xs border ${
                                slotReg 
                                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                  : 'bg-gray-800 border-gray-700 text-gray-500'
                              }`}>
                                <p className="font-bold">Slot {slotNum}</p>
                                <p className="truncate">{slotReg ? (slotReg.team_name || slotReg.team_leader_ign) : 'Empty'}</p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="rules">
                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-100">
                      <ScrollText className="w-5 h-5" />
                      Tournament Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                      {tournament.rules || "No rules specified for this tournament."}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chat">
                <div className="h-[600px] flex flex-col">
                  <TournamentChat
                    tournament={tournament}
                    user={user}
                    isRegistered={isRegistered}
                  />
                </div>
              </TabsContent>

              <TabsContent value="leaderboard">
                <LeaderboardTab
                  registrations={registrations}
                  leaderboardEntries={leaderboardEntries}
                  user={user}
                  isRegistered={isRegistered}
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
                />
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </div>

      {/* Chat Fullscreen Popup */}
      {showChatPopup && (
        <TournamentChatFullscreen
          tournament={tournament}
          user={user}
          isRegistered={isRegistered}
          onClose={() => setShowChatPopup(false)}
        />
      )}

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
              <div className="bg-gradient-to-r from-yellow-600/30 to-orange-600/30 px-5 py-3 border-b border-yellow-500/30">
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

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(null)}>
          <Card className="bg-gray-900 border-gray-700 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Report Player
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-white font-semibold">{showReportModal.player_ign || showReportModal.team_leader_ign}</p>
                <p className="text-xs text-gray-400">UID: {showReportModal.player_uid || showReportModal.team_members?.[0]?.uid || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Reason *</Label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                >
                  <option value="">Select reason...</option>
                  <option value="Hacking/Cheating">🎮 Hacking / Cheating</option>
                  <option value="Match Fixing">🤝 Match Fixing</option>
                  <option value="Abusive Behavior">💬 Abusive Behavior</option>
                  <option value="Multi-Accounting">👥 Multi-Accounting</option>
                  <option value="Other">❓ Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Description (Optional)</Label>
                <Textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe what happened..."
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowReportModal(null)}
                  variant="outline"
                  className="flex-1 border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => submitReport(showReportModal)}
                  disabled={!reportReason || submittingReport}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {submittingReport ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </CardContent>
          </Card>
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
    const isFinalized = leaderboardEntries.length > 0 && leaderboardEntries[0]?.is_finalized;

    const downloadJourney = () => {
      let txt = `═══════════════════════════════════════\n`;
      txt += `   🏆 GRAND FINAL — FULL JOURNEY REPORT\n`;
      txt += `═══════════════════════════════════════\n\n`;
      gfRows.forEach((entry) => {
        const rankNum = entry.rank || 0;
        const name = entry.team_name || entry.player_ign || "Unknown";
        txt += `#${rankNum} ${name}  |  Total: ${entry.points || 0} pts  |  Kills: ${entry.kills || 0}\n`;
        (entry.match_results || []).sort((a,b) => a.match_number.localeCompare(b.match_number)).forEach(mr => {
          txt += `  ${mr.match_number}: Place #${mr.placement || '-'}  Kills ${mr.kills || 0}  Pts ${mr.points || 0}`;
          if (mr.placement === 1) txt += `  🏆 BOOYAH`;
          txt += `\n`;
        });
        txt += `\n`;
      });
      txt += `═══════════════════════════════════════\n`;
      const blob = new Blob([txt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `GrandFinal_Journey.txt`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    return (
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/30 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-b border-yellow-500/20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-lg">Grand Final — Overall Standing</span>
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">{gfRows.length} Teams</Badge>
          </div>
          <div className="flex items-center gap-2">
            {isFinalized && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">🔒 Official</Badge>}
            <button onClick={downloadJourney} className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded hover:bg-blue-500/20">
              <Download className="w-3 h-3" /> Full Journey
            </button>
          </div>
        </div>
        {adminMsg && (
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-b border-blue-500/30 px-4 py-3 flex items-start gap-2">
            <span className="text-blue-400 text-lg flex-shrink-0">📢</span>
            <p className="text-blue-200 text-sm font-medium">{adminMsg}</p>
          </div>
        )}
        <p className="text-gray-500 text-xs px-4 py-2">Tap a team name to see full match-by-match breakdown</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/80 bg-gray-900/50">
                <th className="text-left py-2.5 px-3 text-gray-400 text-xs uppercase">Rank</th>
                <th className="text-left py-2.5 px-3 text-gray-400 text-xs uppercase">Team</th>
                <th className="text-center py-2.5 px-2 text-gray-400 text-xs uppercase">Kills</th>
                <th className="text-center py-2.5 px-2 text-yellow-400 text-xs uppercase">🏆 Booyah</th>
                <th className="text-center py-2.5 px-2 text-cyan-400 text-xs uppercase">Total Pts</th>
              </tr>
            </thead>
            <tbody>
              {gfRows.map((entry, i) => {
                const rankNum = entry.rank || i + 1;
                const rowBg = rankNum === 1 ? 'bg-yellow-500/10' : rankNum === 2 ? 'bg-gray-400/5' : rankNum === 3 ? 'bg-orange-500/8' : '';
                const rankIcon = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : `#${rankNum}`;
                const logo = entry.team_logo_url || registrations.find(r => r.team_leader_id === entry.user_id)?.team_logo_url;
                const displayName = entry.team_name || entry.player_ign;
                const isExpanded = expandedId === entry.id;
                const booyah = (entry.match_results || []).filter(mr => mr.placement === 1).length;
                const bestPlace = (entry.match_results || []).reduce((b, mr) => (!b || (mr.placement > 0 && mr.placement < b)) ? mr.placement : b, 0);
                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      className={`border-b border-gray-700/40 ${rowBg} cursor-pointer hover:bg-white/5 transition-colors`}
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      <td className="py-3 px-3 font-bold text-white">{rankIcon}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {logo ? (
                            <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-600 flex-shrink-0" onError={e => e.target.style.display='none'} />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(displayName || "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-bold text-sm">{displayName}</p>
                            {booyah > 0 && <span className="text-yellow-400 text-[10px]">🏆×{booyah}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-red-400 font-bold">{entry.kills || 0}</td>
                      <td className="text-center py-3 px-2 text-yellow-400 font-bold">{booyah > 0 ? `×${booyah}` : '-'}</td>
                      <td className="text-center py-3 px-2 text-cyan-400 font-bold">{entry.points || 0}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-700/40">
                        <td colSpan={5} className="bg-gray-900/70 px-4 py-3">
                          <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">Match-by-Match Breakdown</p>
                          {(entry.match_results || []).length === 0 ? (
                            <p className="text-gray-600 text-xs">No match data yet</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[...entry.match_results].sort((a,b) => a.match_number.localeCompare(b.match_number)).map((mr, mi) => (
                                <div key={mi} className="bg-gray-800/60 rounded-lg p-2.5 text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-white font-bold">{mr.match_number}</span>
                                    {mr.placement === 1 && <span className="text-yellow-400">🏆 Booyah!</span>}
                                  </div>
                                  <div className="space-y-0.5 text-gray-400">
                                    <p>Place: <span className="text-white">#{mr.placement || '-'}</span></p>
                                    <p>Kills: <span className="text-red-400">{mr.kills || 0}</span></p>
                                    <p>Points: <span className="text-cyan-400 font-bold">{mr.points || 0}</span></p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 pt-2 border-t border-gray-700/50 flex gap-4 text-xs text-gray-400">
                            <span>🏆 Booyah: <span className="text-yellow-400 font-bold">{booyah}</span></span>
                            <span>💀 Kills: <span className="text-red-400 font-bold">{entry.kills || 0}</span></span>
                            <span>⚡ Total: <span className="text-cyan-400 font-bold">{entry.points || 0}</span></span>
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
    );
  }

  // Use leaderboard entries if finalized/available, otherwise show registrations
  const useEntries = leaderboardEntries.length > 0;
  const rows = useEntries ? leaderboardEntries : registrations.map((reg, i) => ({
    id: reg.id,
    rank: i + 1,
    team_name: reg.team_name || reg.team_leader_ign,
    player_ign: reg.team_leader_ign,
    player_uid: reg.team_members?.[0]?.uid || reg.team_leader_uid || '-',
    kills: reg.total_kills || 0,
    points: reg.total_points || 0,
    placement: 0,
    wins: 0,
    team_members: reg.team_members,
    user_id: reg.team_leader_id,
    team_logo_url: reg.team_logo_url,
    is_qualified: reg.is_qualified || reg.status === "Qualified"
  }));

  // For non-finalized entries, also get logo from registrations
  const getRegForEntry = (entry) => registrations.find(r => r.team_leader_id === entry.user_id);

  // Get admin message from first leaderboard entry
  const adminMsg = useEntries ? (leaderboardEntries[0]?.admin_message || "") : "";

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 overflow-hidden">
      {/* Official-style header */}
      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-b border-yellow-500/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-bold text-lg">Tournament Leaderboard</span>
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">{rows.length} Teams</Badge>
        </div>
        {useEntries && leaderboardEntries[0]?.is_finalized && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">🔒 Official</Badge>
        )}
      </div>

      {/* Admin message banner */}
      {adminMsg && (
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-b border-blue-500/30 px-4 py-3 flex items-start gap-2">
          <span className="text-blue-400 text-lg flex-shrink-0">📢</span>
          <p className="text-blue-200 text-sm font-medium">{adminMsg}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700/80 bg-gray-900/50">
              <th className="text-left py-2.5 px-3 text-gray-400 text-xs font-semibold uppercase tracking-wide w-12">Rank</th>
              <th className="text-left py-2.5 px-3 text-gray-400 text-xs font-semibold uppercase tracking-wide">Team</th>
              <th className="text-center py-2.5 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wide">UID</th>
              <th className="text-center py-2.5 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wide">Kills</th>
              <th className="text-center py-2.5 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wide">Pos</th>
              <th className="text-center py-2.5 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wide">Pts</th>
              {canMove && <th className="text-center py-2.5 px-2 text-gray-400 text-xs w-20">Move</th>}
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, index) => {
              const reg = getRegForEntry(entry);
              const logo = entry.team_logo_url || reg?.team_logo_url;
              const members = entry.team_members || reg?.team_members || [];
              const isExpanded = expandedId === entry.id;
              const rankNum = entry.rank || index + 1;
              const rankColor = rankNum === 1 ? 'text-yellow-400' : rankNum === 2 ? 'text-gray-300' : rankNum === 3 ? 'text-orange-400' : 'text-white';
              const rowBg = rankNum === 1 ? 'bg-yellow-500/8' : rankNum === 2 ? 'bg-gray-400/5' : rankNum === 3 ? 'bg-orange-500/8' : '';
              const displayName = entry.team_name || entry.player_ign;
              const displayUID = entry.player_uid && entry.player_uid !== '-' ? entry.player_uid : (reg?.team_members?.[0]?.uid || '-');

              return (
                <React.Fragment key={entry.id}>
                  <tr
                    className={`border-b border-gray-700/40 ${rowBg} cursor-pointer hover:bg-white/5 transition-colors`}
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <span className={`font-black text-base ${rankColor}`}>
                          {rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : `#${rankNum}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {logo ? (
                          <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-600 flex-shrink-0" onError={e => e.target.style.display='none'} />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(displayName || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-white font-bold text-sm leading-tight">{displayName}</p>
                            {(entry.is_qualified) && <span className="text-green-400 text-xs">✅</span>}
                          </div>
                          {members.length > 0 && (
                            <p className="text-gray-500 text-[10px]">{members.length} members</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-cyan-400 text-xs font-mono">{displayUID}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`font-bold text-sm ${entry.kills > 0 ? 'text-red-400' : 'text-gray-600'}`}>{entry.kills || 0}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {entry.wins > 0 ? <span className="text-yellow-400">🏆</span> : entry.placement > 0 ? <span className="text-gray-400 text-sm">#{entry.placement}</span> : <span className="text-gray-600 text-sm">-</span>}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`font-bold text-sm ${entry.points > 0 ? 'text-cyan-400' : 'text-gray-600'}`}>{entry.points || 0}</span>
                    </td>
                    {canMove && <MoveCell reg={entry} isQualifierType={isQualifierType} isSemifinalType={isSemifinalType} sfATournament={sfATournament} sfBTournament={sfBTournament} gfTournament={gfTournament} movingTeam={movingTeam} moveTeam={moveTeam} />}
                    <td className="py-2 px-2 text-center">
                      {user && isRegistered && entry.user_id !== user.id && (
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setShowReportModal(entry); }} className="text-red-400 hover:text-red-300 h-6 w-6 p-0">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded: show logo big + all member kills */}
                  {isExpanded && (
                    <tr className="border-b border-gray-700/40">
                      <td colSpan={canMove ? 8 : 7} className="bg-gray-900/70 px-4 py-3">
                        <div className="flex flex-col gap-2">
                          {/* Team header with logo */}
                          {logo && (
                            <div className="flex items-center gap-3 mb-1">
                              <img src={logo} alt="logo" className="w-14 h-14 rounded-xl object-cover border-2 border-cyan-500/40" onError={e => e.target.style.display='none'} />
                              <div>
                                <p className="text-white font-bold text-base">{displayName}</p>
                                <p className="text-xs text-gray-400">Total Kills: <span className="text-red-400 font-bold">{entry.kills || 0}</span> | Total Points: <span className="text-cyan-400 font-bold">{entry.points || 0}</span></p>
                              </div>
                            </div>
                          )}
                          {/* Per-member kills */}
                          {members.length > 0 ? (
                            <div className="grid grid-cols-2 gap-1.5">
                              {members.map((m, mi) => (
                                <div key={mi} className="flex items-center justify-between bg-gray-800/60 rounded px-2.5 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {m.isLeader && <span className="text-yellow-400 text-xs">👑</span>}
                                    <div>
                                      <p className="text-white text-xs font-semibold">{m.ign}</p>
                                      <p className="text-cyan-400 text-[10px] font-mono">UID: {m.uid}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-red-400 text-xs font-bold">{m.kills !== undefined ? `${m.kills} kills` : '-'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-xs">No member details available</p>
                          )}
                          {/* Summary */}
                          <div className="flex items-center gap-4 mt-1 pt-1.5 border-t border-gray-700/50 text-xs text-gray-400">
                            <span>📍 Position: <span className="text-white font-semibold">{entry.placement || entry.wins > 0 ? `#${entry.wins > 0 ? 1 : entry.placement}` : '-'}</span></span>
                            <span>⚡ Points: <span className="text-cyan-400 font-semibold">{entry.points || 0}</span></span>
                          </div>
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

function TeamCard({ reg, index, isSolo, showPoints, grandFinal }) {
  const [expanded, setExpanded] = useState(false);
  const isQualified = reg.is_qualified || reg.status === "Qualified";
  const hasMembers = !isSolo && reg.team_members && reg.team_members.length > 0;
  
  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50">
      <div
        className={`flex items-center gap-3 p-3 ${hasMembers ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''}`}
        onClick={() => hasMembers && setExpanded(!expanded)}
      >
        {/* Logo or rank number */}
        {reg.team_logo_url ? (
          <img src={reg.team_logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover border border-gray-600 flex-shrink-0" onError={e => e.target.style.display='none'} />
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
            grandFinal && index === 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
            grandFinal && index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
            grandFinal && index === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700' :
            'bg-gradient-to-br from-purple-500 to-cyan-500'
          }`}>
            {index + 1}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-gray-100 text-sm">
              {isSolo ? (reg.team_members?.[0]?.ign || reg.team_leader_ign) : reg.team_name}
            </p>
            {isQualified && <span className="text-green-400 text-xs">✅</span>}
          </div>
          {isSolo ? (
            <p className="text-xs text-cyan-400 font-mono">UID: {reg.team_members?.[0]?.uid || '-'}</p>
          ) : (
            <p className="text-xs text-gray-500">{reg.team_members?.length || 0} members</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {showPoints && (
            <Badge className="bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/30">
              {reg.total_points || 0} pts
            </Badge>
          )}
          {hasMembers && (
            <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>
      
      {/* Expanded: show logo large + full team members */}
      {expanded && hasMembers && (
        <div className="border-t border-gray-700/50 bg-gray-900/40">
          {/* Logo + Team Name header */}
          {reg.team_logo_url && (
            <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-700/30">
              <img src={reg.team_logo_url} alt="logo" className="w-14 h-14 rounded-xl object-cover border-2 border-cyan-500/40" onError={e => e.target.style.display='none'} />
              <div>
                <p className="text-white font-bold">{reg.team_name}</p>
                <p className="text-xs text-cyan-400">{reg.team_members.length} Members</p>
              </div>
            </div>
          )}
          <div className="px-3 py-2 space-y-1.5">
            {reg.team_members.map((member, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 px-2 bg-gray-800/60 rounded">
                <div className="flex items-center gap-2">
                  {member.isLeader && <span className="text-yellow-400 text-xs">👑</span>}
                  <div>
                    <p className="text-xs font-semibold text-white">{member.ign}</p>
                    <p className="text-[10px] text-cyan-400 font-mono">UID: {member.uid}</p>
                  </div>
                </div>
                {member.isLeader && (
                  <span className="text-yellow-400 text-[10px] font-semibold">Leader</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}