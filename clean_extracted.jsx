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






        {/* Team Name */}




        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">




          <p className={`font-bold text-xs truncate ${isDisqualified ? 'text-red-400 line-through' : 'text-white'}`}>




            {isSolo ? (reg.team_members?.[0]?.ign || reg.team_leader_ign) : reg.team_name}




          </p>




          {isDisqualified && (




            <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 shadow-sm">




              <span>✕</span> ELIMINATED




            </span>




          )}




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

  // Multi-Group Teams Filter States

  const [teamSearchQuery, setTeamSearchQuery] = useState("");

  const [teamGroupFilter, setTeamGroupFilter] = useState("all");

  const [activeStageFilter, setActiveStageFilter] = useState("qualifiers");



  // Dynamic Stages List from tournament data

  const tournamentStagesList = useMemo(() => {

    if (Array.isArray(tournament?.stages) && tournament.stages.length > 0) {

      return tournament.stages.map((st, i) => {

        const rawName = typeof st === 'string' ? st : (st.name || st.id || `Stage ${i + 1}`);

        const id = (typeof st === 'object' && st.id) ? String(st.id).toLowerCase().replace(/\s+/g, '_') : rawName.toLowerCase().replace(/\s+/g, '_');

        return { id, name: rawName, idx: i, matches_count: st.matches_count || 1 };

      });

    }

    return [

      { id: "qualifiers", name: "Qualifier", idx: 0 },

      { id: "semifinals", name: "Semifinal", idx: 1 },

      { id: "grand_final", name: "Grand Final", idx: 2 }

    ];

  }, [tournament?.stages]);



  // Find highest stage reached by active teams in the tournament

  const currentOngoingStageIdx = useMemo(() => {

    if (!tournamentStagesList || tournamentStagesList.length === 0) return 0;

    let maxIdx = 0;

    (registrations || []).forEach(r => {

      const rStage = String(r.stage || r.stage_id || "").toLowerCase().trim().replace(/\s+/g, '_');

      const sIdx = tournamentStagesList.findIndex(s => {

        const sId = String(s.id || s).toLowerCase().trim().replace(/\s+/g, '_');

        const sName = String(s.name || s).toLowerCase().trim().replace(/\s+/g, '_');

        return rStage === sId || rStage === sName || (sName && rStage.includes(sName)) || (sId && rStage.includes(sId));

      });

      if (sIdx > maxIdx) maxIdx = sIdx;

    });

    return maxIdx;

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

                        reg={reg}


                        index={displayIndex >= 0 ? displayIndex : 0}


                        isSolo={tournament.mode === "Solo"}


                        grandFinal={currentStageObj.name?.toLowerCase().includes("final")}


                        showGroupBadge={teamGroupFilter === "all"}


                        currentStageIdx={currentActiveIdx}


                        stagesList={stagesList}


                      />


                    );


                  });


                })()}


              </div>


            </div>


          </TabsContent>




        }

      } else if (typeof schedules === 'object') {

        const item = schedules[gNum] || schedules[`group_${gNum}`] || schedules[groupIdx];



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

    if (typeof tournament?.start_time === 'string' && tournament.start_time) return tournament.start_time;

    if (typeof tournament?.start_date === 'string' && tournament.start_date) return tournament.start_date;



    return null;

  };





      let lbEntries = lbEntriesRaw;

      if (!lbEntries || lbEntries.length === 0) {

        lbEntries = await TournamentLeaderboard.filter({ tournament_id: String(tournamentId) }, "rank").catch(() => []);

      }



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



      // Merge all registration sources ONLY for this specific tournament (excluding cancelled/rejected)

      const combinedRegs = (allRegistrations || []).filter(r => {

        if (!r || String(r.tournament_id || "") !== String(tIdStr)) return false;

        const status = String(r.status || "").toLowerCase();

        if (status === "cancelled" || status === "rejected" || status === "unregistered" || r.is_cancelled) return false;

        return true;

      });

        return true;

      });



      // Verify localRegData directly to handle Firestore indexing delays without keeping stale cache

      if (localRegData && String(localRegData.tournament_id || "") === String(tIdStr) && !combinedRegs.some(r => r.id === localRegData.id)) {

        try {

          const liveDoc = await Registration.get(localRegData.id);

          if (liveDoc) {

            const status = String(liveDoc.status || "").toLowerCase();

          }

        } catch (e) {

          // Document deleted by admin -> do nothing, it will be cleared from cache below

        }

      }



      // Also fetch user-specific registrations if user is logged in (filtered ONLY for this tournament)

      if (currentUser?.id) {

        try {

          const userRegsById = await Registration.filter({ team_leader_id: String(currentUser.id), tournament_id: String(tIdStr) }).catch(() => []);

          (userRegsById || []).forEach(ur => {

            const status = String(ur.status || "").toLowerCase();

            const isCancelled = status === "cancelled" || status === "rejected" || status === "unregistered" || ur.is_cancelled;

            if (!isCancelled && String(ur.tournament_id || "") === String(tIdStr) && !combinedRegs.some(r => r.id === ur.id)) {

        } catch (e) { console.error("Admin move data load failed", e); }

      }

    } catch (error) {

      console.error("Error loading tournament details:", error);

    } finally {

      setLoading(false);

    }

  };



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

    } finally {

      setLoading(false);

    }

  };



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



      // 3. Decrement current_teams count

      if (tournament) {

        const newCount = Math.max(0, (tournament.current_teams || 1) - 1);

        await Tournament.update(tournament.id, { current_teams: newCount }).catch(() => {});

      }



      // 4. Reset local React state

      setIsRegistered(false);

      setUserRegistration(null);

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

                      : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"

                  }`}>

                    🏆 {tournament.tournament_type || "Semifinal"}

                  </span>

                )}

                

                <span className={`text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md border flex items-center gap-1.5 shadow-lg ${

                  tournament.status === "Live" 

                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-950/50" 

                    : (tournament.status === "Registration Open" && isSlotsFull)

                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-amber-950/40"

                    : tournament.status === "Registration Open" 

                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-950/40" 

                    : "bg-slate-800/80 text-slate-300 border-slate-700/60"

                }`}>

                  {tournament.status === "Registration Open" && !isSlotsFull && (

                    <span className="relative flex h-2 w-2">

                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>

                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>

                    </span>

                  )}

                  {tournament.status === "Registration Open" && isSlotsFull && (

                    <span className="relative flex h-2 w-2">

                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>

                    </span>

                  )}

                  {tournament.status === "Live" && (

                    <span className="relative flex h-2 w-2">

                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>

                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>

                    </span>

                  )}

                  {tournament.status === "Registration Open" && isSlotsFull ? "Slots Full" : tournament.status}

                </span>

              </div>

            </div>



            {/* Bottom Title & Organizer Overlay */}

            <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between gap-2">

              <div className="space-y-0.5">

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight">

                  {tournament.title}

                </h1>



                <div className="flex items-center gap-1.5 pt-0.5">

                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1">

                    by <span className="text-white font-bold">{tournament.organizer_name || "BattleHub Admin"}</span>

                    <svg className="w-4 h-4 text-[#0ea5e9] shrink-0 inline-block drop-shadow-sm ml-0.5" viewBox="0 0 24 24" fill="currentColor">

                      <path d="M10.9 2.1a2.4 2.4 0 0 1 2.2 0l1.3.7c.4.2.8.3 1.3.3l1.5.1a2.4 2.4 0 0 1 2.2 1.6l.5 1.4c.2.4.4.8.7 1.1l1.1 1 a2.4 2.4 0 0 1 .7 2.6l-.4 1.4c-.1.5-.1 1 0 1.5l.4 1.4a2.4 2.4 0 0 1-.7 2.6l-1.1 1c-.3.3-.5.7-.7 1.1l-.5 1.4a2.4 2.4 0 0 1-2.2 1.6l-1.5.1c-.5 0-.9.1-1.3.3l-1.3.7a2.4 2.4 0 0 1-2.2 0l-1.3-.7c-.4-.2-.8-.3-1.3-.3l-1.5-.1a2.4 2.4 0 0 1-2.2-1.6l-.5-1.4c-.2-.4-.4-.8-.7-1.1l-1.1-1a2.4 2.4 0 0 1-.7-2.6l.4-1.4c.1-.5.1-1 0-1.5l-.4-1.4a2.4 2.4 0 0 1 .7-2.6l1.1-1c.3-.3.5-.7.7-1.1l.5-1.4a2.4 2.4 0 0 1 2.2-1.6l1.5-.1c.5 0 .9-.1 1.3-.3l1.3-.7zM9.7 14.3l-2.3-2.3a.9.9 0 0 0-1.3 1.3l3 3c.4.4 1 .4 1.4 0l6-6a.9.9 0 0 0-1.3-1.3l-5.5 5.3z" />

                    </svg>

                  </p>

                </div>

              </div>



              {/* Right Side Bottom: Game Mode Badge */}

              <div className="shrink-0 mb-0.5">

                <span className="bg-slate-900/90 border border-slate-700/80 text-slate-200 text-[10px] sm:text-xs font-bold uppercase px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-1.5 shadow-lg">

                  <Gamepad2 className="w-3.5 h-3.5 text-orange-400" />

                  {tournament.mode || "DUO"} • FREE FIRE

                </span>

              </div>

            </div>

          </div>

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

                  )}

                  {tournament.status === "Live" && (

                    <span className="relative flex h-2 w-2">

                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>

                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>

                    </span>

                  )}

                  {tournament.status === "Registration Open" && isSlotsFull ? "Slots Full" : tournament.status}

                </span>

              </div>

            </div>



            {/* Bottom Title & Organizer Overlay */}

            <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between gap-2">

              <div className="space-y-0.5">

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight">

                  {tournament.title}

                </h1>



                <div className="flex items-center gap-1.5 pt-0.5">

                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1">

                    by <span className="text-white font-bold">{tournament.organizer_name || "BattleHub Admin"}</span>

                    <svg className="w-4 h-4 text-[#0ea5e9] shrink-0 inline-block drop-shadow-sm ml-0.5" viewBox="0 0 24 24" fill="currentColor">

                      <path d="M10.9 2.1a2.4 2.4 0 0 1 2.2 0l1.3.7c.4.2.8.3 1.3.3l1.5.1a2.4 2.4 0 0 1 2.2 1.6l.5 1.4c.2.4.4.8.7 1.1l1.1 1 a2.4 2.4 0 0 1 .7 2.6l-.4 1.4c-.1.5-.1 1 0 1.5l.4 1.4a2.4 2.4 0 0 1-.7 2.6l-1.1 1c-.3.3-.5.7-.7 1.1l-.5 1.4a2.4 2.4 0 0 1-2.2 1.6l-1.5.1c-.5 0-.9.1-1.3.3l-1.3.7a2.4 2.4 0 0 1-2.2 0l-1.3-.7c-.4-.2-.8-.3-1.3-.3l-1.5-.1a2.4 2.4 0 0 1-2.2-1.6l-.5-1.4c-.2-.4-.4-.8-.7-1.1l-1.1-1a2.4 2.4 0 0 1-.7-2.6l.4-1.4c.1-.5.1-1 0-1.5l-.4-1.4a2.4 2.4 0 0 1 .7-2.6l1.1-1c.3-.3.5-.7.7-1.1l.5-1.4a2.4 2.4 0 0 1 2.2-1.6l1.5-.1c.5 0 .9-.1 1.3-.3l1.3-.7zM9.7 14.3l-2.3-2.3a.9.9 0 0 0-1.3 1.3l3 3c.4.4 1 .4 1.4 0l6-6a.9.9 0 0 0-1.3-1.3l-5.5 5.3z" />

                    </svg>

                  </p>

                </div>

              </div>



              {/* Right Side Bottom: Game Mode Badge */}

              <div className="shrink-0 mb-0.5">

                <span className="bg-slate-900/90 border border-slate-700/80 text-slate-200 text-[10px] sm:text-xs font-bold uppercase px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-1.5 shadow-lg">

                  <Gamepad2 className="w-3.5 h-3.5 text-orange-400" />

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

                </div>

              </div>



              {/* Card 3: Teams & Slots Progress */}

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">

                <div className="flex items-center justify-between mb-1">

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLOTS</span>

                  <Users className="w-3.5 h-3.5 text-slate-400" />

                </div>

                <div>

                  <p className="text-base font-black text-white">

                    {totalRegisteredCount} <span className="text-xs text-slate-500 font-normal">/ {maxTeams}</span>

                  </p>

                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">

                    <div 

                      className={`h-full rounded-full transition-all duration-500 ${isSlotsFull ? "bg-amber-400" : "bg-orange-500"}`}

                      style={{ width: `${Math.min(100, (totalRegisteredCount / maxTeams) * 100)}%` }}

                    />

                  </div>

                </div>

              </div>



              {/* Card 4: Map & Mode */}

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">

                <div className="flex items-center justify-between mb-1">

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MAP & MODE</span>

                  <MapPin className="w-3.5 h-3.5 text-slate-400" />

                </div>

                <div>

                  <p className="text-base font-bold text-white truncate">

                    {tournament.map || "Bermuda"}

                  </p>

                  <p className="text-[9px] text-slate-500 font-medium uppercase">{tournament.mode || "Squad"}</p>

                </div>

              </div>



            </div>

          </div>

        </div>



            <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between gap-2">

              <div className="space-y-0.5">

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight">

                  {tournament.title}

                </h1>



                <div className="flex items-center gap-1.5 pt-0.5">

                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1">

                    by <span className="text-white font-bold">{tournament.organizer_name || "BattleHub Admin"}</span>

                    <svg className="w-4 h-4 text-[#0ea5e9] shrink-0 inline-block drop-shadow-sm ml-0.5" viewBox="0 0 24 24" fill="currentColor">

                      <path d="M10.9 2.1a2.4 2.4 0 0 1 2.2 0l1.3.7c.4.2.8.3 1.3.3l1.5.1a2.4 2.4 0 0 1 2.2 1.6l.5 1.4c.2.4.4.8.7 1.1l1.1 1 a2.4 2.4 0 0 1 .7 2.6l-.4 1.4c-.1.5-.1 1 0 1.5l.4 1.4a2.4 2.4 0 0 1-.7 2.6l-1.1 1c-.3.3-.5.7-.7 1.1l-.5 1.4a2.4 2.4 0 0 1-2.2 1.6l-1.5.1c-.5 0-.9.1-1.3.3l-1.3.7a2.4 2.4 0 0 1-2.2 0l-1.3-.7c-.4-.2-.8-.3-1.3-.3l-1.5-.1a2.4 2.4 0 0 1-2.2-1.6l-.5-1.4c-.2-.4-.4-.8-.7-1.1l-1.1-1a2.4 2.4 0 0 1-.7-2.6l.4-1.4c.1-.5.1-1 0-1.5l-.4-1.4a2.4 2.4 0 0 1 .7-2.6l1.1-1c.3-.3.5-.7.7-1.1l.5-1.4a2.4 2.4 0 0 1 2.2-1.6l1.5-.1c.5 0 .9-.1 1.3-.3l1.3-.7zM9.7 14.3l-2.3-2.3a.9.9 0 0 0-1.3 1.3l3 3c.4.4 1 .4 1.4 0l6-6a.9.9 0 0 0-1.3-1.3l-5.5 5.3z" />

                    </svg>

                  </p>

                </div>

              </div>



              {/* Right Side Bottom: Game Mode Badge */}

              <div className="shrink-0 mb-0.5">

                <span className="bg-slate-900/90 border border-slate-700/80 text-slate-200 text-[10px] sm:text-xs font-bold uppercase px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-1.5 shadow-lg">

                  <Gamepad2 className="w-3.5 h-3.5 text-orange-400" />

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

                </div>

              </div>



              {/* Card 3: Teams & Slots Progress */}

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">

                <div className="flex items-center justify-between mb-1">

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLOTS</span>

                  <Users className="w-3.5 h-3.5 text-slate-400" />

                </div>

                <div>

                  <p className="text-base font-black text-white">

                    {totalRegisteredCount} <span className="text-xs text-slate-500 font-normal">/ {maxTeams}</span>

                  </p>

                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">

                    <div 

                      className={`h-full rounded-full transition-all duration-500 ${isSlotsFull ? "bg-amber-400" : "bg-orange-500"}`}

                      style={{ width: `${Math.min(100, (totalRegisteredCount / maxTeams) * 100)}%` }}

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

                { id: "rules", label: "Rules", icon: ScrollText },

              ].map((t) => {



                const IconComponent = t.icon;

                return (

                  <TabsTrigger

                    key={t.id}

                    value={t.id}

                    className="data-[state=active]:bg-orange-500 data-[state=active]:text-slate-950 text-slate-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"

                  >

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

                    {isSemifinalOrFinal ? "Points" : tournament.entry_fee ? `🪙 ${tournament.entry_fee}` : "FREE"}

                  </p>

                  <p className="text-[9px] text-slate-500 font-medium">Per Squad</p>

                </div>

              </div>



              {/* Card 3: Teams & Slots Progress */}

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">

                <div className="flex items-center justify-between mb-1">

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLOTS</span>

                  <Users className="w-3.5 h-3.5 text-slate-400" />

                </div>

                <div>

                  <p className="text-base font-black text-white">

                    {totalRegisteredCount} <span className="text-xs text-slate-500 font-normal">/ {maxTeams}</span>

                  </p>

                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">

                    <div 

                      className={`h-full rounded-full transition-all duration-500 ${isSlotsFull ? "bg-amber-400" : "bg-orange-500"}`}

                      style={{ width: `${Math.min(100, (totalRegisteredCount / maxTeams) * 100)}%` }}

                    />

                  </div>

                </div>

              </div>



              {/* Card 4: Map & Mode */}

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">

                <div className="flex items-center justify-between mb-1">

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MAP & MODE</span>

                  <MapPin className="w-3.5 h-3.5 text-slate-400" />

                </div>

                <div>

                  <p className="text-base font-bold text-white truncate">

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

                        isSolo={tournament.mode === "Solo"}

                        grandFinal={currentStageObj.name?.toLowerCase().includes("final")}

                        showGroupBadge={teamGroupFilter === "all"}

                        currentStageIdx={currentActiveIdx}

                        stagesList={stagesList}

                      />

                    );

                  });

                })()}

              </div>

            </div>

          </TabsContent>

              });



              const currentActiveIdx = activeIdx >= 0 ? activeIdx : 0;

              const currentStageObj = stagesList[currentActiveIdx] || stagesList[0] || { id: "round_1", name: "Round 1" };

              const currentStageNorm = String(currentStageObj.id || currentStageObj.name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

              const isFirstStage = currentActiveIdx === 0;



              // Only show teams that are strictly in this stage!

              const stagePool = (registrations || []).filter(r => {

                const rStageNorm = String(r.stage || r.stage_id || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

                if (!rStageNorm) {

                  return isFirstStage; // Unassigned registrations belong to initial stage (Round 1)

                }

                return rStageNorm === currentStageNorm;

              });



              const stageGroupsCount = Math.max(1, Math.ceil(stagePool.length / 12));



              const filtered = stagePool.filter((reg, idx) => {

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



              return (

                <>

                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">

                    <div className="flex items-center justify-between">

                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">

                        {currentStageObj.name} ({stagePool.length} Total Teams)

                      </p>

                      <div className="flex items-center gap-2">

                        {isAdmin && (

                          <button

                            onClick={() => setShowDummyModal(true)}

                            className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 hover:border-amber-500/60 text-amber-300 rounded-lg text-[11px] font-black shadow-sm transition-all active:scale-95"

                            title="Auto-fill tournament slots with dummy teams for testing"

                          >

                            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />

                            <span>Fill Slots</span>

                          </button>

                        )}

                      <select

                        value={teamGroupFilter}

                        onChange={(e) => setTeamGroupFilter(e.target.value)}

                        className="bg-slate-950 border border-slate-800 text-slate-200 h-8.5 rounded-md px-2.5 text-xs focus:outline-none"

                      >

                        <option value="all">All Groups</option>

                        {Array.from({ length: stageGroupsCount }, (_, i) => (

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

                      {filtered.length === 0 ? (

                        <div className="py-12 text-center space-y-2">

                          <p className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">

                            No teams in {currentStageObj.name || "this stage"} yet

                          </p>

                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">

                            Teams will appear here once promoted or qualified from previous rounds.

                          </p>

                        </div>

                      ) : (

                        filtered.map((reg, loopIdx) => {

                          const poolIndex = stagePool.findIndex(r => r.id === reg.id);

                          const stageGroup = Math.floor((poolIndex >= 0 ? poolIndex : loopIdx) / 12) + 1;

                          const stageSlot = ((poolIndex >= 0 ? poolIndex : loopIdx) % 12) + 1;

                          

                          return (

                            <TeamCard

                              key={reg.id}

                              reg={reg}

                              index={poolIndex >= 0 ? poolIndex : loopIdx}

                              stageGroup={stageGroup}

                              stageSlot={stageSlot}

                              isSolo={tournament.mode === "Solo"}

                              grandFinal={currentStageObj.name?.toLowerCase().includes("final")}

                              showGroupBadge={teamGroupFilter === "all"}

                              currentStageIdx={currentActiveIdx}

                              stagesList={stagesList}

                            />

                          );

                        })

                      )}

                    </div>

                  </div>

                </>

              );

            })()}

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

                    )}

                  </div>



                  {/* Teams List Filtered By Stage */}

                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">

                    <div className="space-y-2 max-h-[560px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">

                      {filtered.length === 0 ? (

                        <div className="py-12 text-center space-y-2">

                          <p className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">

                            No teams in {currentStageObj.name || "this stage"} yet

                          </p>

                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">

                            Teams will appear here once promoted or qualified from previous rounds.

                          </p>

                        </div>

                      ) : (

                        filtered.map((reg, loopIdx) => {

                          const poolIndex = stagePool.findIndex(r => r.id === reg.id);

                          const stageGroup = Math.floor((poolIndex >= 0 ? poolIndex : loopIdx) / 12) + 1;

                          const stageSlot = ((poolIndex >= 0 ? poolIndex : loopIdx) % 12) + 1;

                          

                          return (

                            <TeamCard

                              key={reg.id}

                              reg={reg}

                              index={poolIndex >= 0 ? poolIndex : loopIdx}

                              stageGroup={stageGroup}

                              stageSlot={stageSlot}

                              isSolo={tournament.mode === "Solo"}

                              grandFinal={currentStageObj.name?.toLowerCase().includes("final")}

                              showGroupBadge={teamGroupFilter === "all"}

                              currentStageIdx={currentActiveIdx}

                              stagesList={stagesList}

                            />

                          );

                        })

                      )}

                    </div>

                  </div>

                </>

              );

            })()}

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

                    <Button onClick={() => setShowCredentialsModal(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white uppercase text-xs font-bold tracking-wider rounded-xl h-11 cursor-pointer">

                      CLOSE

                    </Button>

                  </div>

                </div>

              </motion.div>

          )}

        </AnimatePresence>

      </div>

    </div>

  );

}



function LeaderboardTab({ 

  registrations, 

  user, 

  isRegistered, 

  canMove, 

  isQualifierType, 

  isSemifinalType, 

                </div>

              </motion.div>

            </motion.div>

        </AnimatePresence>

      </div>

    </div>

  );

}



function LeaderboardTab({ 

  registrations, 

  leaderboardEntries, 

  tournament, 

  user, 

  isRegistered, 

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

                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">

                      <Users className="w-4 h-4 text-emerald-400" />

                    </div>

                    <div>

                      <p className="text-xs font-bold text-white">Add 12 Teams (1 Full Group)</p>

                      <p className="text-[10px] text-slate-400">Generates 1 single group of 12 teams</p>

                    </div>

                  </div>

                  <span className="text-xs font-bold text-emerald-400">+12</span>

                </button>

              </div>



              {/* Clear Dummy Teams Action */}

              {(registrations || []).some(r => r.is_dummy || String(r.user_id || '').startsWith('dummy_')) && (

                <div className="pt-2 border-t border-slate-800">

                  <button

                    disabled={isGeneratingDummy}

                    onClick={handleClearDummyTeams}

                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50"

                  >

                    <Trash2 className="w-3.5 h-3.5" />

                    <span>Clear All Dummy Teams ({(registrations || []).filter(r => r.is_dummy || String(r.user_id || '').startsWith('dummy_')).length} Teams)</span>

                  </button>

                </div>

              )}

            </div>

          </div>

        </div>

      )}



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

                          {entry.placement_points !== undefined ? entry.placement_points : Math.max(0, (entry.points || 0) - (entry.kills || 0))}

                        </span>

                      </td>



                      <td className="py-2.5 px-1 text-center">

                        <span className="font-black text-cyan-400 text-[11px]">

                          {entry.points || 0}

                        </span>

                      </td>



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



      {/* Match Credentials Modal */}



                      <td className="py-2.5 text-center text-slate-500 text-[9px]">

                        {isExpanded ? '▲' : '▼'}

                      </td>

                    </tr>



                    {/* Expanded Team Breakdown Drawer */}

                    {isExpanded && (

                      <tr className="border-b border-slate-800/80">

                        <td colSpan={6} className="px-3 py-2.5 bg-slate-950/95">

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

    ? [

        { id: "all", name: "All Stages" },

        ...tournament.stages.map((st, i) => {

          const rawName = typeof st === 'string' ? st : (st.name || st.id || `Stage ${i + 1}`);

          const id = (typeof st === 'object' && st.id) 

            ? String(st.id).toLowerCase().replace(/[^a-z0-9]+/g, '_') 

            : rawName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

          return { id, name: rawName, idx: i };

        })

      ]

    : defaultStages;



  const allRealStages = stagesList.filter(s => s.id !== "all");



  // Find the highest ongoing stage of the tournament

  const ongoingStageIdx = (() => {

    if (!allRealStages || allRealStages.length === 0) return 0;

    let maxIdx = 0;

    (registrations || []).forEach(r => {

      const rStage = String(r.stage || r.stage_id || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

      const sIdx = allRealStages.findIndex(s => {

        const sId = String(s.id || s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

        const sName = String(s.name || s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

        return rStage === sId || rStage === sName || (sName && rStage.includes(sName)) || (sId && rStage.includes(sId));

      });

      if (sIdx > maxIdx) maxIdx = sIdx;

    });

    return maxIdx;

  })();



  const ongoingStageObj = allRealStages[ongoingStageIdx] || allRealStages[0];

  const ongoingStageNorm = String(ongoingStageObj?.id || ongoingStageObj?.name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');





  // Raw row generation - Merges leaderboardEntries with all registrations so ALL registered teams are visible!

  const rawRows = (() => {

    const lbList = leaderboardEntries || [];

    const rows = [];



    // When "all" is selected, Option 1 displays the current ongoing stage's scoreboard across all groups

    const selNorm = (selectedStage || "all").toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

    const isAllStagesView = selNorm === "all" || selNorm === "qualified";

    const targetStageNorm = isAllStagesView ? ongoingStageNorm : selNorm;



    if (registrations && registrations.length > 0) {

      registrations.forEach((reg, i) => {

        // 1. Find stage-specific leaderboard entry strictly for targetStageNorm

        const stageSpecificLb = lbList.find(lb => {

          const isMatchUser = (

            (lb.user_id && String(lb.user_id) === String(reg.team_leader_id)) ||

            (lb.user_id && String(lb.user_id) === String(reg.user_id)) ||

            (lb.id && String(lb.id) === String(reg.id)) ||

            (lb.team_name && reg.team_name && String(lb.team_name).trim().toLowerCase() === String(reg.team_name).trim().toLowerCase()) ||

            String(lb.unique_id || "").includes(String(reg.id || '___')) ||

            String(lb.unique_id || "").includes(String(reg.team_leader_id || '___'))

          );

          if (!isMatchUser) return false;



          const lbStageNorm = String(lb.stage || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

          return lbStageNorm === targetStageNorm;

        });



        // 2. Find stage score from reg.stage_scores strictly for targetStageNorm

        const regScore = reg.stage_scores?.[targetStageNorm] || reg.stage_scores?.[selectedStage];



        // Isolated Stage Scores:

        // If a stage-specific score exists for this stage, use it. Otherwise, new/unplayed stages start at 0!

        const effectiveKills = stageSpecificLb ? (stageSpecificLb.kills ?? 0) : (regScore ? (regScore.kills ?? 0) : 0);

        const effectivePoints = stageSpecificLb ? (stageSpecificLb.points ?? 0) : (regScore ? (regScore.points ?? 0) : 0);

        const effectiveResults = stageSpecificLb ? (stageSpecificLb.match_results || []) : (regScore ? (regScore.match_results || []) : []);



        rows.push({

          ...(stageSpecificLb || {}),

          _rowUid: `reg-${i}-${reg.id || reg.team_leader_id || i}`,

          id: stageSpecificLb?.id || reg.id,

          team_name: reg.team_name || stageSpecificLb?.team_name || reg.team_leader_ign || `Team ${i + 1}`,

          _rowUid: `reg-${i}-${reg.id || reg.team_leader_id || i}`,

          id: stageSpecificLb?.id || reg.id,

          team_name: reg.team_name || stageSpecificLb?.team_name || reg.team_leader_ign || `Team ${i + 1}`,

          player_ign: reg.team_leader_ign || stageSpecificLb?.player_ign || "Leader",

          player_uid: reg.team_members?.[0]?.uid || reg.team_leader_uid || stageSpecificLb?.player_uid || '-',

          kills: effectiveKills,

          points: effectivePoints,

          team_members: (reg.team_members && reg.team_members.length > 0) ? reg.team_members : (stageSpecificLb?.team_members || []),

          user_id: reg.team_leader_id || stageSpecificLb?.user_id,

          team_logo_url: reg.team_logo_url || stageSpecificLb?.team_logo_url || "",

          is_qualified: Boolean(stageSpecificLb?.is_qualified || reg.is_qualified || reg.status === "Qualified"),

          stage: reg.stage || stageSpecificLb?.stage || (isGrandFinalType ? "Grand Final" : isSemifinalType ? "Semifinals" : "Qualifier"),

          group_number: String(stageSpecificLb?.group_number || reg.group_number || reg.group || Math.floor(i / 12) + 1),

          match_results: effectiveResults

        });

      });

    } else {

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

          group_number: String(lb.group_number || Math.floor(idx / 12) + 1),

          match_results: lb.match_results || []

        });

      });

    }



    return rows;

  })();





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

    const regStage = String(r.stage || "").toLowerCase().trim().replace(/\s+/g, '_');

    const teamStageIdx = allRealStages.findIndex(s => {

      const sId = String(s.id || s).toLowerCase().trim().replace(/\s+/g, '_');

      const sName = String(s.name || s).toLowerCase().trim().replace(/\s+/g, '_');

      return regStage === sId || regStage === sName || (sName && regStage.includes(sName)) || (sId && regStage.includes(sId));

    });



    let matchesStage = true;

    if (selectedStage === "all") {

      // Option 1: When "All Stages" is selected, show teams that belong to the current ongoing stage across all groups!

      matchesStage = teamStageIdx === -1 || teamStageIdx >= ongoingStageIdx;

    } else if (selectedStage === "qualified") {

      matchesStage = isQual;

    } else {

      const selLower = selectedStage.toLowerCase().trim().replace(/\s+/g, '_');

      const targetIdx = allRealStages.findIndex(s => {

        const sId = String(s.id || s).toLowerCase().trim().replace(/\s+/g, '_');

        const sName = String(s.name || s).toLowerCase().trim().replace(/\s+/g, '_');

        return sId === selLower || sName === selLower || (sName && selLower.includes(sName)) || (sId && selLower.includes(sId));

      });



      if (targetIdx !== -1 && teamStageIdx !== -1) {

        matchesStage = teamStageIdx >= targetIdx;

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

                            {members.length > 0 && (() => {

                              // Aggregate kills from all matches for each player

                                  if (Array.isArray(pKills)) {

                                    pKills.forEach((pk, idx) => {

                                      const key = pk.ign || `P${idx+1}`;

                                      totalPlayerKills[key] = (totalPlayerKills[key] || 0) + (parseInt(pk.kills) || 0);

                                    });

                                  }

                                });

                              }



                              return (

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

                    {/* Expanded Team Breakdown Drawer */}

                    {isExpanded && (

                      <tr className="border-b border-slate-800/80">

                        <td colSpan={6} className="px-3 py-2.5 bg-slate-950/95">

                          <div className="space-y-2">



                            {/* Squad Roster — Clean Compact 4-Col Grid */}

                            {members.length > 0 && (() => {

                              // Aggregate kills from all matches for each player

                              const totalPlayerKills = {};

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

            alt="logo" 

            className="w-7 h-7 rounded-md object-cover border border-slate-700/80 flex-shrink-0" 

            onError={e => e.target.style.display='none'} 

          />

        ) : (

          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${

            grandFinal && index === 0 ? 'bg-amber-500 text-slate-950 font-black' :

            grandFinal && index === 1 ? 'bg-slate-400 text-slate-950 font-black' :

            grandFinal && index === 2 ? 'bg-amber-700 text-white font-black' :

            isDisqualified ? 'bg-red-700 text-white font-bold' :

            'bg-slate-800 border border-slate-700/80 text-orange-400 font-bold'

          }`}>

            {index + 1}

          </div>

        )}

            {isSolo ? (reg.team_members?.[0]?.ign || reg.team_leader_ign) : reg.team_name}

          </p>

          {isDisqualified && (

            <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 shadow-sm">

              <span>✕</span> ELIMINATED

            </span>

          )}

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



          </p>

          {isDisqualified && (

            <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 shadow-sm">

              <span>✕</span> ELIMINATED

            </span>

          )}

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



          ) : (

            <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">

              Slot #{slotNum}

            </span>

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

            <Button size="sm" disabled={!!movingTeam} onClick={() => moveTeam(reg, "grand_final")} className="bg-red-600 hover:bg-red-700 text-xs h-7 px-2">

              {isMoving && movingTeam?.stage === "grand_final" ? "..." : "GF"}

            </Button>

          ) : (

            <span className="text-gray-600 text-xs px-1" title="No Grand Final tournament exists">GF</span>

          )

        )}

                );

              })}

            </tbody>

          </table>

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

  })();



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



  // Clean Card Styling for Teams Roster Tab

  const cardStyle = isDisqualified

    ? "bg-red-950/25 border-red-500/30 opacity-80"

    : "bg-slate-900/60 border-slate-800/80";



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

  const cardStyle = isQualified

    ? "bg-emerald-950/25 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)]"

    : isDisqualified

      ? "bg-red-950/25 border-red-500/30 opacity-80"

      : "bg-slate-900/60 border-slate-800/80";



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

            alt="logo" 

            className="w-7 h-7 rounded-md object-cover border border-slate-700/80 flex-shrink-0" 

            onError={e => e.target.style.display='none'} 

          />

        ) : (

          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${

            grandFinal && index === 0 ? 'bg-amber-500 text-slate-950 font-black' :

            grandFinal && index === 1 ? 'bg-slate-400 text-slate-950 font-black' :

            grandFinal && index === 2 ? 'bg-amber-700 text-white font-black' :

            isDisqualified ? 'bg-red-700 text-white font-bold' :

            'bg-slate-800 border border-slate-700/80 text-orange-400 font-bold'

          }`}>

            {index + 1}

          </div>

        )}

            {isSolo ? (reg.team_members?.[0]?.ign || reg.team_leader_ign) : reg.team_name}

          </p>

          {isDisqualified && (

            <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 shadow-sm">

              <span>✕</span> ELIMINATED

            </span>

          )}

        </div>



        {/* Group & Slot Badge + Controls */}

        <div className="flex items-center gap-2 flex-shrink-0">

          {showGroupBadge ? (

            <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">

              G{groupNum} • #{slotNum}

            </span>

        ) : (

          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${

            grandFinal && index === 0 ? 'bg-amber-500 text-slate-950 font-black' :

            grandFinal && index === 1 ? 'bg-slate-400 text-slate-950 font-black' :

            grandFinal && index === 2 ? 'bg-amber-700 text-white font-black' :

            isDisqualified ? 'bg-red-700 text-white font-bold' :

            'bg-slate-800 border border-slate-700/80 text-orange-400 font-bold'

          }`}>

            {index + 1}

          </div>

        )}



        {/* Team Name */}

        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">

          <p className={`font-bold text-xs truncate ${isDisqualified ? 'text-red-400 line-through' : 'text-white'}`}>

            {isSolo ? (reg.team_members?.[0]?.ign || reg.team_leader_ign) : reg.team_name}

          </p>

          {isDisqualified && (

            <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 shadow-sm">

              <span>�o</span> ELIMINATED

            </span>

          )}

        </div>



        {/* Group & Slot Badge + Controls */}

        <div className="flex items-center gap-2 flex-shrink-0">

          {showGroupBadge ? (

            <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">

              G{groupNum} �?� #{slotNum}

            </span>

          ) : (

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


