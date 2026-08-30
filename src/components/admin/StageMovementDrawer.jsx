import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Registration } from "@/entities/Registration";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Notification } from "@/entities/Notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, ArrowRight, Layers, X, Search, ShieldCheck, Check, Sparkles, MoveRight, Users, Undo2, ArrowLeft, MoreVertical
} from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// ─── Main Component ──────────────────────────────────────────
export default function StageMovementDrawer({ tournament, onClose, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [activeStage, setActiveStage] = useState("");
  const [activeGroup, setActiveGroup] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTeams, setSelectedTeams] = useState(new Set());
  const [targetStage, setTargetStage] = useState("");

  // ─── Data Loading (EXACT SAME as ManageKillsStagesDrawer) ────
  const loadData = useCallback(async () => {
    if (!tournament?.id) return;
    setLoading(true);
    try {
      const tIdStr = String(tournament.id);
      console.log("[MoveStage] Loading data for tournament:", tIdStr, "title:", tournament.title);

      let allFound = [];

      // Source 1: Direct filter by tournament_id as string
      try {
        const r1 = await Registration.filter({ tournament_id: tIdStr });
        console.log("[MoveStage] Source 1:", r1?.length || 0);
        if (r1 && r1.length > 0) allFound.push(...r1);
      } catch (e) {}

      // Source 2: Direct filter by tournament_id as original type
      try {
        const r2 = await Registration.filter({ tournament_id: tournament.id });
        console.log("[MoveStage] Source 2:", r2?.length || 0);
        if (r2 && r2.length > 0) allFound.push(...r2);
      } catch (e) {}

      // Source 3: List ALL registrations and client-side filter
      try {
        const allRegs = await Registration.list();
        const tournTitle = (tournament.title || "").toLowerCase().trim();
        const matched = (allRegs || []).filter(r => {
          if (!r) return false;
          const rId = String(r.tournament_id || "");
          if (rId === tIdStr || rId === String(tournament.id)) return true;
          const rTitle = (r.tournament_title || r.tournament_name || "").toLowerCase().trim();
          if (tournTitle && rTitle && rTitle === tournTitle) return true;
          return false;
        });
        console.log("[MoveStage] Source 3 matched:", matched.length);
        if (matched.length > 0) allFound.push(...matched);
      } catch (e) {}

      // Deduplicate
      const regMap = new Map();
      allFound.forEach(r => {
        if (!r) return;
        const key = r.id || r.team_leader_id || `${r.team_name}_${r.team_leader_ign}`;
        if (!regMap.has(key)) regMap.set(key, { ...r });
      });
      const fetchedRegs = Array.from(regMap.values());
      console.log("[MoveStage] FINAL teams:", fetchedRegs.length, fetchedRegs.map(r => r.team_name));

      // Load leaderboard entries
      let entries = [];
      try {
        entries = await TournamentLeaderboard.filter({ tournament_id: tIdStr });
        if (!entries || entries.length === 0) {
          entries = await TournamentLeaderboard.filter({ tournament_id: tournament.id });
        }
      } catch (e) {
        entries = [];
      }

      setRegistrations(fetchedRegs);
      setLeaderboardEntries(entries || []);
    } catch (e) {
      console.error("[MoveStage] Failed:", e);
      toast.error("Failed to load tournament data");
    } finally {
      setLoading(false);
    }
  }, [tournament?.id, tournament?.title]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Dynamic Stages & Groups (EXACT SAME as ManageKillsStagesDrawer) ───
  const { dynamicStages, groups, stageTeams } = useMemo(() => {
    let stList = [];

    // Strictly use tournament.stages configured when tournament was created
    if (Array.isArray(tournament?.stages) && tournament.stages.length > 0) {
      stList = tournament.stages.map((st, i) => {
        const rawName = typeof st === "string" ? st : (st.name || st.id || `Stage ${i + 1}`);
        const id = (typeof st === "object" && st.id) ? String(st.id).toLowerCase().replace(/\s+/g, '_') : rawName.toLowerCase().replace(/\s+/g, '_');
        let icon = "🛡️";
        if (id.includes("semi")) icon = "⚡";
        else if (id.includes("final")) icon = "🏆";
        return { id, name: rawName, icon, matches_count: st.matches_count || 1 };
      });
    } else {
      stList = [
        { id: "qualifiers", name: "Qualifiers", icon: "🛡️" },
        { id: "semifinals", name: "Semifinals", icon: "⚡" },
        { id: "grand_final", name: "Grand Final", icon: "🏆" }
      ];
    }

    const currentStageId = (activeStage || stList[0]?.id || "").toLowerCase().trim().replace(/\s+/g, '_');
    const activeStageIdx = stList.findIndex(s => s.id === currentStageId);
    const safeActiveStageIdx = activeStageIdx >= 0 ? activeStageIdx : 0;

    // Build fast lookup Map for leaderboard entries
    const lbUserMap = new Map();
    (leaderboardEntries || []).forEach(e => {
      if (e.user_id) lbUserMap.set(String(e.user_id), e);
    });

    // Build fast lookup Map for registration original indices
    const regIdxMap = new Map();
    (registrations || []).forEach((reg, idx) => {
      if (reg.id) regIdxMap.set(String(reg.id), idx);
    });

    const filtered = (registrations || []).map(r => {
      const lb = r.team_leader_id ? lbUserMap.get(String(r.team_leader_id)) : null;
      return { ...r, _lbStage: lb?.stage, _lbGroup: lb?.group_number, _lb: lb };
    }).filter(r => {
      const rawStage = String(r.stage || "").toLowerCase().trim().replace(/\s+/g, '_');
      const teamStageIdx = stList.findIndex(s => {
        const sId = s.id.toLowerCase().trim().replace(/\s+/g, '_');
        const sName = s.name.toLowerCase().trim().replace(/\s+/g, '_');
        return rawStage === sId || rawStage === sName || (sName && rawStage.includes(sName)) || (sId && rawStage.includes(sId));
      });
      
      const effectiveTeamStageIdx = teamStageIdx >= 0 ? teamStageIdx : 0;
      const prevStages = Array.isArray(r.previous_stages) ? r.previous_stages.map(p => String(p).toLowerCase().trim().replace(/\s+/g, '_')) : [];
      const isInPrevStages = prevStages.includes(currentStageId);

      // Team belongs in this stage if:
      // 1. Their current stage is this stage
      // 2. OR they progressed past this stage (effectiveTeamStageIdx >= safeActiveStageIdx)
      // 3. OR this stage is in their previous_stages history
      return effectiveTeamStageIdx >= safeActiveStageIdx || isInPrevStages || rawStage === currentStageId;
    });

    // GROUPS
    const grps = [];
    const groupTeamsMap = new Map();
    const groupSchedules = Array.isArray(tournament?.group_schedules) ? tournament.group_schedules : [];
    const isSemi = currentStageId.includes("semi");
    const isFinal = currentStageId.includes("final") && !isSemi;

    if (isFinal) {
      grps.push({ id: "gf", name: "Grand Final", teams: filtered });
    } else if (isSemi) {
      const a = [], b = [];
      filtered.forEach((r, i) => {
        const g = String(r._lbGroup || r.group || r.semifinal_group || "").toLowerCase();
        (g.includes("b") || (!g && i % 2 === 1)) ? b.push(r) : a.push(r);
      });
      grps.push({ id: "sf_a", name: "Group A", teams: a });
      grps.push({ id: "sf_b", name: "Group B", teams: b });
    } else {
      let groupNames = new Set();

      // Helper to normalize group names (e.g. "Group 1", "g_1", "1" -> "g_1")
      const normalizeGroup = (gStr) => {
        if (!gStr) return "";
        const num = String(gStr).replace(/[^0-9]/g, '');
        if (num) return `g_${num}`;
        return String(gStr).toLowerCase().trim();
      };

      // 1. Distribute teams
      filtered.forEach(r => {
        const raw = r._lbGroup || r.group || "";
        let g = normalizeGroup(raw);
        
        // If NO explicit group, fallback to original registration index to EXACTLY match Standings!
        if (!g) {
          const originalIndex = r.id ? regIdxMap.get(String(r.id)) : -1;
          const safeIndex = (originalIndex !== undefined && originalIndex >= 0) ? originalIndex : 0;
          g = `g_${Math.floor(safeIndex / 12) + 1}`;
        }
        
        r._normalizedGroup = g;
        groupNames.add(g);
        
        if (!groupTeamsMap.has(g)) groupTeamsMap.set(g, []);
        groupTeamsMap.get(g).push(r);
      });

      // 2. Sort the collected groups logically (1, 2, 3...)
      const sortedGroupNames = Array.from(groupNames).sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
        if (numA && numB) return numA - numB;
        return a.localeCompare(b);
      });

      // 3. Build final groups array
      sortedGroupNames.forEach((gName) => {
        const tms = groupTeamsMap.get(gName) || [];
        
        const numIdx = parseInt(gName.replace(/[^0-9]/g, '')) || 1;
        const arrayIdx = numIdx - 1;
        
        let displayName = gName;
        const sched = groupSchedules[arrayIdx];
        if (sched && sched.group_name) {
          displayName = sched.group_name;
        } else {
          const lower = String(gName).toLowerCase();
          if (lower.startsWith("g_")) displayName = "Group " + gName.substring(2);
          else if (/^\d+$/.test(lower)) displayName = "Group " + gName;
          else if (lower === "sf_a") displayName = "Group A";
          else if (lower === "sf_b") displayName = "Group B";
          else if (lower === "gf") displayName = "Final";
          else if (lower.startsWith("group")) displayName = gName.charAt(0).toUpperCase() + gName.slice(1);
        }

        grps.push({
          id: gName,
          name: displayName,
          teams: tms,
          rawId: gName
        });
      });
    }

    return { dynamicStages: stList, groups: grps, stageTeams: filtered };
  }, [registrations, leaderboardEntries, activeStage, tournament]);

  // Auto-select first group when groups change if current activeGroup is invalid
  useEffect(() => {
    if (groups.length > 0) {
      const exists = groups.some(g => g.id === activeGroup);
      if (!exists) {
        setActiveGroup(groups[0].id);
      }
    }
  }, [groups, activeGroup]);

  // Visible teams (group + search filtered)
  const visibleTeams = useMemo(() => {
    const currentGroupObj = groups.find(g => g.id === activeGroup) || groups[0];
    let list = currentGroupObj ? currentGroupObj.teams : stageTeams;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(r =>
      (r.team_name || "").toLowerCase().includes(q) ||
      (r.team_leader_ign || "").toLowerCase().includes(q)
    );
  }, [stageTeams, groups, activeGroup, search]);

  const orderedStages = useMemo(() => dynamicStages, [dynamicStages]);

  // Ranked teams with kills/points strictly for the active stage
  const rankedTeams = useMemo(() => {
    const activeStageNorm = String(activeStage || dynamicStages[0]?.id || "").toLowerCase().trim().replace(/\s+/g, '_');

    return visibleTeams.map(r => {
      const uid = r.team_leader_id || r.user_id;
      
      // Look for leaderboard entry strictly matching activeStage
      const stageSpecificLb = leaderboardEntries.find(e => 
        (e.user_id === uid || e.id === r.id || String(e.unique_id || "").includes(r.id)) &&
        String(e.stage || "").toLowerCase().trim().replace(/\s+/g, '_') === activeStageNorm
      );

      const stScore = r.stage_scores?.[activeStageNorm] || r.stage_scores?.[activeStage];

      // Pure stage-isolated kills & points (0 for new stage unless scores entered specifically in this stage)
      const kills = stageSpecificLb ? (stageSpecificLb.kills || 0) : (stScore ? (stScore.kills || 0) : 0);
      const pts = stageSpecificLb ? (stageSpecificLb.points || 0) : (stScore ? (stScore.points || 0) : 0);
      
      const stage = String(r.stage || "qualifiers").toLowerCase().trim().replace(/\s+/g, '_');

      return { ...r, _uid: uid, _kills: kills, _points: pts, _stage: stage, _status: r.status || "Registered" };
    }).sort((a, b) => {
      if (b._points !== a._points) return b._points - a._points;
      return b._kills - a._kills;
    });
  }, [visibleTeams, activeStage, dynamicStages, leaderboardEntries]);

  // Next stage helper (needed for cutoff calculation)
  const getNextStageForTeam = useCallback((teamStage) => {
    if (!teamStage || orderedStages.length === 0) return null;
    const stNorm = teamStage.toLowerCase().trim();
    const currIdx = orderedStages.findIndex(st => {
      const idNorm = st.id.toLowerCase().trim();
      return idNorm === stNorm ||
        (stNorm.includes("qual") && idNorm.includes("qual")) ||
        (stNorm.includes("semi") && idNorm.includes("semi")) ||
        (stNorm.includes("final") && idNorm.includes("final") && !stNorm.includes("semi") && !idNorm.includes("semi"));
    });
    if (currIdx !== -1 && currIdx < orderedStages.length - 1) return orderedStages[currIdx + 1];
    return null;
  }, [orderedStages]);

  // Calculate ranks strictly within each group based on active stage points
  const groupRanks = useMemo(() => {
    const ranks = {};
    const activeStageNorm = String(activeStage || dynamicStages[0]?.id || "").toLowerCase().trim().replace(/\s+/g, '_');

    groups.forEach(g => {
      const sorted = [...g.teams].sort((a, b) => {
        const uidA = a.team_leader_id || a.user_id;
        const uidB = b.team_leader_id || b.user_id;

        const lbA = leaderboardEntries.find(e => (e.user_id === uidA || e.id === a.id) && String(e.stage || "").toLowerCase().trim().replace(/\s+/g, '_') === activeStageNorm);
        const lbB = leaderboardEntries.find(e => (e.user_id === uidB || e.id === b.id) && String(e.stage || "").toLowerCase().trim().replace(/\s+/g, '_') === activeStageNorm);

        const ptsA = lbA?.points || 0;
        const killsA = lbA?.kills || 0;
        const ptsB = lbB?.points || 0;
        const killsB = lbB?.kills || 0;

        if (ptsB !== ptsA) return ptsB - ptsA;
        return killsB - killsA;
      });
      sorted.forEach((team, i) => {
        const uid = team.team_leader_id || team.user_id;
        ranks[uid] = i + 1;
      });
    });
    return ranks;
  }, [groups, activeStage, dynamicStages, leaderboardEntries]);

  // Smart formula to find how many teams should advance per group
  const recommendedCutoff = useMemo(() => {
    const next = getNextStageForTeam(activeStage);
    if (!next) return 0; // Final stage, no next stage
    const nextName = next.id.toLowerCase();
    
    let targetCapacity = 12; // default for final
    if (nextName.includes("final") && !nextName.includes("semi") && !nextName.includes("quarter")) {
      targetCapacity = 12;
    } else if (nextName.includes("semi")) {
      targetCapacity = 24;
    } else if (nextName.includes("quarter") || nextName.includes("qf")) {
      targetCapacity = 48;
    } else {
      // Default rule for generic intermediate stages: cut by half
      targetCapacity = Math.max(12, Math.floor(stageTeams.length / 2));
    }
    
    const totalGroups = Math.max(1, groups.length);
    let cutoff = Math.floor(targetCapacity / totalGroups);
    if (cutoff < 1) cutoff = 1;
    if (cutoff > 12) cutoff = 12; // Max possible in a lobby
    
    return cutoff;
  }, [activeStage, getNextStageForTeam, groups.length, stageTeams.length]);

  // Golden qualified teams (recommended teams in current view that aren't already moved)
  const eligibleTeams = useMemo(() => {
    const activeStageIdx = orderedStages.findIndex(s => s.id === activeStage);
    return rankedTeams.filter(team => {
      const teamStageIdx = orderedStages.findIndex(s => {
        const stNorm = (team._stage || "").toLowerCase().trim();
        const idNorm = s.id.toLowerCase().trim();
        return idNorm === stNorm ||
          (stNorm.includes("qual") && idNorm.includes("qual")) ||
          (stNorm.includes("semi") && idNorm.includes("semi")) ||
          (stNorm.includes("final") && idNorm.includes("final") && !stNorm.includes("semi") && !idNorm.includes("semi"));
      });
      const isAlreadyMoved = activeStageIdx !== -1 && teamStageIdx > activeStageIdx;
      const isCutoffEligible = recommendedCutoff > 0 ? groupRanks[team._uid] <= recommendedCutoff : true;
      return !isAlreadyMoved && isCutoffEligible;
    });
  }, [rankedTeams, recommendedCutoff, groupRanks, orderedStages, activeStage]);

  // Smart default activeStage
  useEffect(() => {
    if (orderedStages.length > 0 && !activeStage) {
      setActiveStage(orderedStages[0].id);
    }
  }, [orderedStages, activeStage]);

  // Prev stage helpers
  const getPrevStageForTeam = (teamStage) => {
    if (!teamStage || orderedStages.length === 0) return null;
    const stNorm = String(teamStage).toLowerCase().trim().replace(/\s+/g, '_');
    const currIdx = orderedStages.findIndex(st => {
      const idNorm = st.id.toLowerCase().trim().replace(/\s+/g, '_');
      const nameNorm = (st.name || "").toLowerCase().trim().replace(/\s+/g, '_');
      return idNorm === stNorm || nameNorm === stNorm ||
        (stNorm.includes("qual") && idNorm.includes("qual")) ||
        (stNorm.includes("semi") && idNorm.includes("semi")) ||
        (stNorm.includes("round_1") && idNorm.includes("round_1")) ||
        (stNorm.includes("round_2") && idNorm.includes("round_2")) ||
        (stNorm.includes("round_3") && idNorm.includes("round_3")) ||
        (stNorm.includes("final") && idNorm.includes("final") && !stNorm.includes("semi") && !idNorm.includes("semi"));
    });
    if (currIdx > 0) return orderedStages[currIdx - 1];
    return null;
  };

  const getAllPrevStagesForTeam = (teamStage) => {
    if (!teamStage || orderedStages.length === 0) return [];
    const stNorm = String(teamStage).toLowerCase().trim().replace(/\s+/g, '_');
    const currIdx = orderedStages.findIndex(st => {
      const idNorm = st.id.toLowerCase().trim().replace(/\s+/g, '_');
      const nameNorm = (st.name || "").toLowerCase().trim().replace(/\s+/g, '_');
      return idNorm === stNorm || nameNorm === stNorm ||
        (stNorm.includes("qual") && idNorm.includes("qual")) ||
        (stNorm.includes("semi") && idNorm.includes("semi")) ||
        (stNorm.includes("round_1") && idNorm.includes("round_1")) ||
        (stNorm.includes("round_2") && idNorm.includes("round_2")) ||
        (stNorm.includes("round_3") && idNorm.includes("round_3")) ||
        (stNorm.includes("final") && idNorm.includes("final") && !stNorm.includes("semi") && !idNorm.includes("semi"));
    });
    if (currIdx > 0) {
      return orderedStages.slice(0, currIdx).reverse();
    }
    return [];
  };

  const promoteTeams = async (teamsToPromote, targetStg) => {
    if (!targetStg) { toast.error("Please select a target stage"); return; }
    if (!teamsToPromote || teamsToPromote.length === 0) { toast.error("No teams selected"); return; }
    setPromoting(true);
    const targetStageObj = orderedStages.find(s => s.id === targetStg) || { name: targetStg };
    const tid = toast.loading(`Moving ${teamsToPromote.length} team(s) to ${targetStageObj.name}...`);
    try {
      const targetStgNorm = String(targetStg || "").toLowerCase().trim().replace(/\s+/g, '_');
      
      // Calculate how many teams are already in the target stage to pack sequentially
      let existingCount = registrations.filter(r => {
        const s = String(r.stage || "").toLowerCase().trim().replace(/\s+/g, '_');
        return s === targetStgNorm;
      }).length;

      let count = 0;
      for (const team of teamsToPromote) {
        const uid = team._uid || team.team_leader_id;
        const reg = registrations.find(r => r.team_leader_id === uid || r.id === team.id || r.id === team._uid);
        if (!reg) continue;

        const prevStages = Array.isArray(reg.previous_stages) ? reg.previous_stages : [];
        const currentStg = reg.stage || activeStage || "qualifiers";
        const newPrevStages = Array.from(new Set([...prevStages, currentStg]));

        const currentScores = reg.stage_scores || {};
        currentScores[targetStgNorm] = { kills: 0, points: 0, match_results: [], rank: 0 };
        currentScores[targetStg] = { kills: 0, points: 0, match_results: [], rank: 0 };

        // Sequentially assign group and slot
        const newGroupNumber = `g_${Math.floor(existingCount / 12) + 1}`;
        const newSlotNumber = (existingCount % 12) + 1;
        existingCount++;

        const updateData = { 
          stage: targetStg, 
          group: newGroupNumber,
          slot: newSlotNumber,
          is_qualified: true, 
          status: targetStg.includes("final") ? "Finalist" : "Qualified",
          previous_stages: newPrevStages,
          stage_scores: currentScores
        };
        if (targetStg.includes("final")) updateData.is_finalist = true;
        if (targetStg.includes("semi")) updateData.is_semifinalist = true;

        await Registration.update(reg.id, updateData).catch(e => console.warn("[Move] Registration update warning:", e));

        // Preserve all old stage leaderboard entries! Check if an entry for targetStg already exists
        const existingTargetLb = leaderboardEntries.find(e => 
          (e.user_id === uid || e.id === reg.id || String(e.unique_id || "").includes(reg.id)) &&
          String(e.stage || "").toLowerCase().trim().replace(/\s+/g, '_') === targetStgNorm
        );

        if (existingTargetLb) {
          await TournamentLeaderboard.update(existingTargetLb.id, {
            kills: 0,
            points: 0,
            placement: 0,
            rank: 0,
            wins: 0,
            match_results: [],
            is_qualified: true,
            is_published: true,
            stage: targetStg,
            group_number: newGroupNumber,
            slot_number: newSlotNumber
          }).catch(() => null);
        } else {
          await TournamentLeaderboard.create({
            tournament_id: String(tournament.id),
            tournament_title: tournament.title || "",
            user_id: uid,
            unique_id: `${tournament.id}_${uid}_${targetStg}`,
            team_name: reg.team_name,
            player_ign: reg.team_leader_ign,
            player_uid: reg.team_leader_uid,
            kills: 0,
            points: 0,
            placement: 0,
            rank: 0,
            wins: 0,
            match_results: [],
            is_qualified: true,
            is_published: true,
            stage: targetStg,
            group_number: newGroupNumber,
            slot_number: newSlotNumber
          }).catch(e => console.warn("[Move] LB create warning:", e));
        }

        await Notification.create({
          user_id: uid,
          title: `🌟 STAGE ADVANCED — ${(tournament?.title || "TOURNAMENT").toUpperCase()}`,
          message: `Your team "${reg.team_name}" has advanced to ${targetStageObj.name}!`,
          type: "tournament_qualified",
          link: `/tournament/${tournament.id}`
        }).catch(() => null);

        count++;
      }
      toast.success(`Successfully moved ${count} team(s) to ${targetStageObj.name}!`, { id: tid });
      setSelectedTeams(new Set());
      if (typeof onUpdate === 'function') onUpdate();
      await loadData();
    } catch (e) {
      console.error("[Move] Failure:", e);
      toast.error("Failed to move teams", { id: tid });
    } finally {
      setPromoting(false);
    }
  };

  // Demote team
  const demoteTeam = async (team, targetStg) => {
    if (!targetStg) return;
    setPromoting(true);
    const targetStageObj = orderedStages.find(s => s.id === targetStg || s.name === targetStg) || { id: targetStg, name: targetStg };
    const tid = toast.loading(`Moving back to ${targetStageObj.name}...`);
    try {
      const uid = team._uid || team.team_leader_id || team.user_id;
      const reg = registrations.find(r => r.team_leader_id === uid || r.id === team.id || r.id === team._uid);
      
      const targetIdx = orderedStages.findIndex(s => s.id === targetStageObj.id || s.name === targetStageObj.name);
      const isInitialStg = targetIdx <= 0;
      const isFinalStg = String(targetStageObj.id || "").toLowerCase().includes("final");
      const isSemiStg = String(targetStageObj.id || "").toLowerCase().includes("semi");

      if (reg) {
        // Filter out targetStg and subsequent stages from previous_stages
        const prevStages = (Array.isArray(reg.previous_stages) ? reg.previous_stages : [])
          .filter(st => {
            const stNorm = String(st || "").toLowerCase().trim().replace(/\s+/g, '_');
            const idx = orderedStages.findIndex(s => {
              const sId = s.id.toLowerCase().trim().replace(/\s+/g, '_');
              const sName = (s.name || "").toLowerCase().trim().replace(/\s+/g, '_');
              return sId === stNorm || sName === stNorm;
            });
            return idx !== -1 && idx < targetIdx;
          });

        const updateData = { 
          stage: targetStageObj.id, 
          is_qualified: !isInitialStg, 
          status: isFinalStg ? "Finalist" : (isSemiStg ? "Qualified" : (isInitialStg ? "Registered" : "Qualified")), 
          is_finalist: isFinalStg, 
          is_semifinalist: isSemiStg || isFinalStg,
          previous_stages: prevStages
        };
        await Registration.update(reg.id, updateData);
      }
      
      // When moving back, all individual stage records remain safely preserved
      toast.success(`Moved back to ${targetStageObj.name}`, { id: tid });
      if (typeof onUpdate === 'function') onUpdate();
      await loadData();
    } catch (e) {
      console.error("[Demote] Error:", e);
      toast.error("Failed to move team back", { id: tid });
    } finally {
      setPromoting(false);
    }
  };

  const toggleSelect = (uid) => {
    setSelectedTeams(prev => { const next = new Set(prev); if (next.has(uid)) next.delete(uid); else next.add(uid); return next; });
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-[99999999] flex justify-end overflow-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} className="fixed inset-0 bg-black/80 cursor-pointer" />

      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="relative w-full sm:max-w-4xl bg-[#090910] border-l border-white/10 shadow-2xl z-[100000000] flex flex-col h-full overflow-hidden font-sans">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#090912] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-300 hover:text-white hover:bg-white/10 h-9 px-3 rounded-xl flex items-center gap-1.5 font-bold cursor-pointer border border-white/10 shrink-0">
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Back</span>
            </Button>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white truncate flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{tournament?.title} <span className="text-zinc-500 font-medium">| Move Stage</span></span>
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Controls */}
          <div className="bg-white/[0.03] border border-white/[0.08] p-3.5 rounded-2xl">
            <div className="grid grid-cols-12 gap-2">
              {/* Stage Filter */}
              <div className="col-span-6 sm:col-span-4">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Filter Stage</label>
                <select value={activeStage} onChange={e => { setActiveStage(e.target.value); setActiveGroup(""); }} className="w-full bg-[#121220] border border-white/10 text-white text-xs font-medium rounded-lg h-8 px-2.5 outline-none cursor-pointer hover:border-purple-500/50 transition-colors">
                  {dynamicStages.map(st => (
                    <option key={st.id} value={st.id}>{st.icon} {st.name}</option>
                  ))}
                </select>
              </div>

              {/* Group Filter */}
              <div className="col-span-6 sm:col-span-4">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Filter Group</label>
                <select value={activeGroup} onChange={e => setActiveGroup(e.target.value)} className="w-full bg-[#121220] border border-white/10 text-white text-xs font-medium rounded-lg h-8 px-2.5 outline-none cursor-pointer hover:border-purple-500/50 transition-colors">
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.teams.length})</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="col-span-12 sm:col-span-4">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Search Team</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or IGN..." className="bg-[#121220] border-white/10 text-white text-xs h-8 pl-8 rounded-lg focus:border-purple-500/50" />
                </div>
              </div>
            </div>
          </div>

          {/* Batch Promotion Bar */}
          {selectedTeams.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-500/50 p-3 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500 text-black font-black text-xs px-2.5 py-1">{selectedTeams.size} Teams Selected</Badge>
                <span className="text-xs text-emerald-200 hidden sm:inline font-medium">Ready to advance</span>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const bulkNextStage = getNextStageForTeam(activeStage) || orderedStages[1] || orderedStages[0];
                  if (bulkNextStage) {
                    return (
                      <Button size="sm" onClick={() => promoteTeams(rankedTeams.filter(t => selectedTeams.has(t._uid)), bulkNextStage.id)} disabled={promoting} className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 cursor-pointer">
                        Promote to {bulkNextStage.name} <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    );
                  }
                  return (
                    <Button size="sm" onClick={() => promoteTeams(rankedTeams.filter(t => selectedTeams.has(t._uid)), targetStage || orderedStages[1]?.id)} disabled={promoting} className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 cursor-pointer">
                      <MoveRight className="w-4 h-4" /> Move Selected
                    </Button>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* Table */}
          {loading ? (
            <div className="space-y-3 px-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-5 h-5 rounded bg-white/10" />
                    <Skeleton className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="space-y-1.5">
                      <Skeleton className="w-32 h-4 bg-white/10 rounded" />
                      <Skeleton className="w-20 h-3 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-6 bg-white/10 rounded" />
                    <Skeleton className="w-14 h-6 bg-white/10 rounded" />
                    <Skeleton className="w-24 h-7 bg-white/10 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col mt-4 overflow-hidden rounded-t-xl border border-white/10 w-full">
              {/* Table Header */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 bg-white/5 border-b border-white/10 text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <div className="w-5 sm:w-6 flex justify-center shrink-0">
                  <input 
                    type="checkbox" 
                    disabled={activeGroup === "all" || eligibleTeams.length === 0} 
                    checked={eligibleTeams.length > 0 && eligibleTeams.every(t => selectedTeams.has(t._uid))} 
                    onChange={e => { 
                      if (e.target.checked) {
                        setSelectedTeams(new Set(eligibleTeams.map(t => t._uid))); 
                      } else {
                        setSelectedTeams(new Set()); 
                      }
                    }} 
                    className="rounded accent-amber-500 cursor-pointer w-3.5 h-3.5 sm:w-4 sm:h-4 disabled:opacity-20 disabled:cursor-not-allowed" 
                    title="Select Golden Qualified Teams"
                  />
                </div>
                <div className="w-7 sm:w-10 text-center shrink-0">Rank</div>
                <div className="flex-1 min-w-0 text-left pl-1 sm:pl-2">Team Details</div>
                <div className="w-9 sm:w-10 text-center text-orange-400 shrink-0">Kills</div>
                <div className="w-9 sm:w-10 text-center text-emerald-400 shrink-0 mr-1">Points</div>
                {activeGroup !== "all" && <div className="w-9 sm:w-14 text-right shrink-0 pr-1 sm:pr-2">Action</div>}
              </div>

              {/* Table Body */}
              <div className="divide-y divide-white/5 pb-20">
                {rankedTeams.length === 0 ? (
                  <div className="py-20 text-center text-zinc-500 text-sm font-medium">No teams found for the selected filters</div>
                ) : (
                  rankedTeams.map((team, idx) => {
                    const isSelected = selectedTeams.has(team._uid);
                    
                    // Check if team is already moved ahead of the active stage
                    const activeStageIdx = orderedStages.findIndex(s => s.id === activeStage);
                    const teamStageIdx = orderedStages.findIndex(s => {
                      const stNorm = (team._stage || "").toLowerCase().trim();
                      const idNorm = s.id.toLowerCase().trim();
                      return idNorm === stNorm ||
                        (stNorm.includes("qual") && idNorm.includes("qual")) ||
                        (stNorm.includes("semi") && idNorm.includes("semi")) ||
                        (stNorm.includes("final") && idNorm.includes("final") && !stNorm.includes("semi") && !idNorm.includes("semi"));
                    });
                    const isAlreadyMoved = activeStageIdx !== -1 && teamStageIdx > activeStageIdx;
                    
                    const isEligible = !isAlreadyMoved && recommendedCutoff > 0 && groupRanks[team._uid] <= recommendedCutoff;
                    const rank = idx + 1;
                    
                    const statusLower = String(team.status || "").toLowerCase();
                    const isDisqualified = Boolean(team.is_disqualified || team.is_eliminated || statusLower === "disqualified" || statusLower === "eliminated" || statusLower === "rejected");
                    
                    let rowClass = "hover:bg-white/[0.03] border-l-4 border-transparent";
                    if (isAlreadyMoved) {
                      rowClass = "bg-emerald-950/25 border-l-4 border-l-emerald-500 hover:bg-emerald-900/30 text-emerald-200";
                    } else if (isDisqualified) {
                      rowClass = "bg-red-950/25 border-l-4 border-l-red-500 hover:bg-red-900/30 text-red-300 opacity-80";
                    } else if (isSelected) {
                      rowClass = "bg-amber-500/20 border-l-4 border-amber-500";
                    } else if (isEligible) {
                      rowClass = "bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-amber-500/50";
                    } else if (recommendedCutoff > 0) {
                      rowClass = "bg-black/20 opacity-60 border-l-4 border-transparent hover:opacity-80 transition-opacity";
                    }

                    return (
                      <div key={team._uid || team.id} className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 transition-colors ${rowClass}`}>
                        <div className="w-5 sm:w-6 flex justify-center shrink-0">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            disabled={isAlreadyMoved || activeGroup === "all"}
                            onChange={() => toggleSelect(team._uid)} 
                            className="rounded accent-emerald-500 cursor-pointer w-3.5 h-3.5 sm:w-4 sm:h-4 disabled:opacity-20 disabled:cursor-not-allowed" 
                          />
                        </div>
                        <div className="w-7 sm:w-10 flex justify-center items-center shrink-0 text-[10px] sm:text-xs">
                          {rank === 1 ? <span className="text-amber-400 font-black text-xs sm:text-sm">🥇 1</span> : rank === 2 ? <span className="text-gray-300 font-black text-xs sm:text-sm">🥈 2</span> : rank === 3 ? <span className="text-amber-600 font-black text-xs sm:text-sm">🥉 3</span> : <span className="text-zinc-400 font-bold text-[10px] sm:text-xs">#{rank}</span>}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-3 pl-0.5 sm:pl-2">
                          {team.team_logo_url ? (
                            <img src={team.team_logo_url} alt={team.team_name} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center text-[9px] sm:text-xs font-bold shrink-0 ${
                              isAlreadyMoved ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' :
                              isDisqualified ? 'bg-red-950/40 border-red-500/50 text-red-300' :
                              'bg-emerald-600/30 border-emerald-500/40 text-emerald-300'
                            }`}>
                              {(team.team_name || "T").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                              <p className={`font-bold text-[10px] sm:text-[11px] uppercase tracking-wide truncate leading-tight ${
                                isAlreadyMoved ? 'text-emerald-300' :
                                isDisqualified ? 'text-red-400 line-through' :
                                'text-white'
                              }`}>
                                {team.team_name}
                              </p>
                              {isAlreadyMoved && (
                                <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40 uppercase tracking-wider shrink-0 flex items-center gap-0.5 shadow-sm">
                                  <span>✓</span> MOVED TO {(() => {
                                    const currStageIdx = orderedStages.findIndex(st => st.id === activeStage);
                                    if (currStageIdx !== -1 && currStageIdx < orderedStages.length - 1) {
                                      return (orderedStages[currStageIdx + 1]?.name || orderedStages[currStageIdx + 1]?.id || "").toUpperCase();
                                    }
                                    const raw = String(team._stage || team.stage || "").trim();
                                    if (!raw) return "NEXT STAGE";
                                    const matched = orderedStages.find(s => s.id === raw || s.name?.toLowerCase() === raw.toLowerCase());
                                    return (matched?.name || raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).toUpperCase();
                                  })()}
                                </span>
                              )}
                              {isDisqualified && (
                                <span className="text-[8px] font-black text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/40 uppercase tracking-wider shrink-0 flex items-center gap-0.5 shadow-sm">
                                  <span>✕</span> ELIMINATED
                                </span>
                              )}
                              {isEligible && !isAlreadyMoved && (
                                <span className="hidden sm:inline-block text-[8px] font-bold text-amber-400 bg-amber-500/15 px-1 py-0.5 rounded border border-amber-500/30 whitespace-nowrap uppercase tracking-wider shrink-0">
                                  QUALIFIED
                                </span>
                              )}
                            </div>
                            <p className="text-[8px] sm:text-[9px] text-zinc-400 truncate">Leader: {team.team_leader_ign || "N/A"}</p>
                          </div>
                        </div>
                        <div className="w-9 sm:w-10 text-center font-black text-orange-400 text-[10px] sm:text-xs shrink-0">{team._kills}</div>
                        <div className="w-9 sm:w-10 text-center shrink-0 mr-1"><span className="font-black text-emerald-400 text-[10px] sm:text-xs">{team._points}</span></div>
                        {activeGroup !== "all" && (
                          <div className="w-12 sm:w-16 flex items-center justify-end gap-1 sm:gap-1.5 shrink-0 pr-0.5 sm:pr-2">
                            {(() => {
                              const nextStage = getNextStageForTeam(activeStage);
                              const allPrevStages = getAllPrevStagesForTeam(activeStage);
                              
                              if (isAlreadyMoved) {
                                return (
                                  <div className="flex items-center gap-1">
                                    <div 
                                      className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-emerald-500/20" 
                                      title="Moved / Advanced ✓"
                                    >
                                      <Check className="w-4 h-4 text-emerald-400 font-bold" />
                                    </div>
                                    <details className="relative group inline-block">
                                      <summary className="w-7 h-7 sm:w-8 sm:h-8 bg-[#1a1a2e] border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 list-none marker:hidden [&::-webkit-details-marker]:hidden">
                                        <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      </summary>
                                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#121220] border border-white/10 text-white rounded-xl shadow-2xl p-1 z-[99999]">
                                        <button 
                                          disabled={promoting}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.target.closest('details')?.removeAttribute('open');
                                            demoteTeam(team, activeStage);
                                          }}
                                          className="w-full text-left text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-amber-300 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                                        >
                                          <Undo2 className="w-3.5 h-3.5 shrink-0" />
                                          Reset back to this stage
                                        </button>
                                        {allPrevStages.map(st => (
                                          <button 
                                            key={st.id}
                                            disabled={promoting}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.target.closest('details')?.removeAttribute('open');
                                              demoteTeam(team, st.id);
                                            }}
                                            className="w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                                          >
                                            <Undo2 className="w-3.5 h-3.5 shrink-0" />
                                            Move back to {st.name}
                                          </button>
                                        ))}
                                      </div>
                                    </details>
                                  </div>
                                );
                              }

                              return (
                                <>
                                  {nextStage ? (
                                    <button disabled={promoting} onClick={() => promoteTeams([team], nextStage.id)} className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-600 hover:bg-emerald-500 text-black rounded-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-600/20 shrink-0" title={`Move to ${nextStage.name}`}>
                                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  ) : (
                                    <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 whitespace-nowrap shadow-sm shadow-amber-500/10">
                                      {rank === 1 ? "👑 Champ" : rank === 2 ? "🥈 2nd" : rank === 3 ? "🥉 3rd" : "🏆 Finalist"}
                                    </Badge>
                                  )}

                                  {allPrevStages.length > 0 && (
                                    <details className="relative group inline-block">
                                      <summary className="w-7 h-7 sm:w-8 sm:h-8 bg-[#1a1a2e] border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 list-none marker:hidden [&::-webkit-details-marker]:hidden">
                                        <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      </summary>
                                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#121220] border border-white/10 text-white rounded-xl shadow-2xl p-1 z-[99999]">
                                        {allPrevStages.map(st => (
                                          <button 
                                            key={st.id}
                                            disabled={promoting}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.target.closest('details')?.removeAttribute('open');
                                              demoteTeam(team, st.id);
                                            }}
                                            className="w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                                          >
                                            <Undo2 className="w-3.5 h-3.5 shrink-0" />
                                            Move back to {st.name}
                                          </button>
                                        ))}
                                      </div>
                                    </details>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

      </motion.div>
    </div>,
    document.body
  );
}
