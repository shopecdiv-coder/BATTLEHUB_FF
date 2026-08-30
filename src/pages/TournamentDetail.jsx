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
import RegistrationInvoiceDownload from "../components/tournament/RegistrationInvoiceDownload";
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
  const [movingTeam, setMovingTeam] = useState(null);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamGroupFilter, setTeamGroupFilter] = useState("all");
  const [activeStageFilter, setActiveStageFilter] = useState("qualifiers");
  const [showCredentialsModal, setShowCredentialsModal] = useState(false); // { entry, stage, group }
  
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
      // Parallel loading for massive speedup
      const [currentUser, tournamentData, allRegistrations, tournamentMatches, lbEntries] = await Promise.all([
        User.me().catch(() => null),
        Tournament.filter({ id: tournamentId }).catch(() => []),
        Registration.filter({ tournament_id: tournamentId }).catch(() => []),
        Match.filter({ tournament_id: tournamentId }, "-match_number").catch(() => []),
        TournamentLeaderboard.filter({ tournament_id: tournamentId }, "rank").catch(() => [])
      ]);

      if (currentUser) setUser(currentUser);
      
      let currentTournament = null;
      if (tournamentData && tournamentData.length > 0) {
        currentTournament = tournamentData[0];
        setTournament(currentTournament);
      }

      setMatches(tournamentMatches || []);
      setLeaderboardEntries(lbEntries || []);

      if (allRegistrations) {
        setRegistrations(allRegistrations);
        if (currentUser) {
          const userReg = allRegistrations.find(r => r.team_leader_id === currentUser.id);
          setIsRegistered(!!userReg);
          setUserRegistration(userReg);
          if (userReg) {
            setEditIGN(userReg.team_members?.[0]?.ign || userReg.team_leader_ign || "");
            setEditUID(userReg.team_members?.[0]?.uid || "");
            
            if (userReg.status === "Qualified") setRegistrationStatus("Qualified");
            else if (userReg.status === "Disqualified") setRegistrationStatus("Disqualified");
          }
        }
      }

      // Load existing target tournaments for move system (admin only) — only non-Completed
      if (currentUser && currentUser.role === "admin") {
        const sfAll = await Tournament.filter({ tournament_type: "Semifinal" }).catch(() => []);
        const gfAll = await Tournament.filter({ tournament_type: "Grand Final" }).catch(() => []);
        const openSf = sfAll.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
        const openGf = gfAll.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
        setSfATournament(openSf.find(t => t.semifinal_group === "A") || null);
        setSfBTournament(openSf.find(t => t.semifinal_group === "B") || null);
        setGfTournament(openGf?.[0] || null);
      }
    } catch (error) {
      console.error("Error loading tournament details:", error);
    } finally {
      setLoading(false);
    }
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
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </TabsTrigger>
                );
              })}
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
                                Your Unique ID: <span className="font-bold">{user.unique_id || 'N/A'}</span>
                              </p>
                            )}
                            {userRegistration && (
                              <div className="mt-4 pt-4 border-t border-green-500/20">
                                <RegistrationInvoiceDownload 
                                  registration={userRegistration} 
                                  tournament={tournament} 
                                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                                />
                              </div>
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
      </div>
    </div>
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
    
      {/* Match Credentials Modal */}
      <AnimatePresence>
        {showCredentialsModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" onClick={() => setShowCredentialsModal(false)}>
            <div className="bg-slate-900 border border-cyan-900/50 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-black text-cyan-400 text-sm tracking-wider uppercase mb-4 flex items-center gap-2">
                <Key className="w-4 h-4 animate-pulse" /> MATCH CREDENTIALS
              </h3>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-300">Credentials will be updated by admins closer to match time.</p>
                <div className="pt-4 flex justify-end">
                  <Button onClick={() => setShowCredentialsModal(false)} variant="outline">Close</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
</div>
  );
}


function InfoCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-slate-800/50">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</span>
      <span className="text-sm text-white font-bold">{value}</span>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 group">
      <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition-colors">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-xs font-bold text-white text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function MoveCell({ reg, isQualifierType, isSemifinalType, sfATournament, sfBTournament, gfTournament, movingTeam, moveTeam }) {
  if (isQualifierType) {
    if (!sfATournament && !sfBTournament) return <td className="p-2 text-xs text-center text-slate-500">-</td>;
    return (
      <td className="p-2">
        <div className="flex items-center justify-center gap-1">
          <Button onClick={() => moveTeam(reg, "semifinal", "A")} disabled={movingTeam} className="h-6 text-[10px] bg-purple-600 hover:bg-purple-700 px-2 rounded-md">To SF A</Button>
          <Button onClick={() => moveTeam(reg, "semifinal", "B")} disabled={movingTeam} className="h-6 text-[10px] bg-indigo-600 hover:bg-indigo-700 px-2 rounded-md">To SF B</Button>
        </div>
      </td>
    );
  }
  if (isSemifinalType) {
    if (!gfTournament) return <td className="p-2 text-xs text-center text-slate-500">-</td>;
    return (
      <td className="p-2">
        <Button onClick={() => moveTeam(reg, "grand_final", null)} disabled={movingTeam} className="h-6 text-[10px] w-full bg-amber-600 hover:bg-amber-700 px-2 rounded-md">To Final</Button>
      </td>
    );
  }
  return null;
}

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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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
