import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Tournament } from "@/entities/Tournament";
import { Registration } from "@/entities/Registration";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Notification } from "@/entities/Notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, Target, Swords, Crown, Save, RefreshCw, Download,
  ArrowRight, ArrowLeft, Layers, X, Search, ChevronDown, ChevronUp,
  Users, Check, Flame, Megaphone, ShieldCheck, Unlock, Lock
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { PLACEMENT_POINTS } from "@/lib/leaderboardRank";

// ─── Constants ───────────────────────────────────────────────
const DEFAULT_STAGES = [
  { id: "qualifiers", name: "Qualifiers", icon: "🛡️" },
  { id: "semifinals", name: "Semifinals", icon: "⚡" },
  { id: "grand_final", name: "Grand Final", icon: "🏆" }
];

const TEAMS_PER_GROUP = 12;

// ─── Helpers ─────────────────────────────────────────────────
const stageIcon = (name) => {
  const n = (name || "").toUpperCase();
  if (n.includes("FINAL")) return "🏆";
  if (n.includes("SEMI")) return "⚡";
  return "🛡️";
};

const buildStages = (tournament) => {
  if (Array.isArray(tournament?.stages) && tournament.stages.length > 0) {
    return tournament.stages.map((st, i) => {
      const name = typeof st === "string" ? st : (st.name || st.id || `Stage ${i + 1}`);
      const id = (typeof st === "object" && st.id) ? String(st.id).toLowerCase().replace(/\s+/g, '_') : name.toLowerCase().replace(/\s+/g, '_');
      const matches_count = typeof st === "object" && st.matches_count ? Number(st.matches_count) : 1;
      let icon = "🛡️";
      const lower = name.toLowerCase();
      if (lower.includes("semi")) icon = "⚡";
      else if (lower.includes("final") || i === tournament.stages.length - 1) icon = "🏆";
      return { 
        id, 
        name, 
        icon, 
        matches_count: Math.max(1, matches_count), 
        idx: i, 
        isLastStage: i === tournament.stages.length - 1 
      };
    });
  }
  return DEFAULT_STAGES.map((s, i) => ({ ...s, matches_count: i === 2 ? 3 : (i === 1 ? 2 : 1), idx: i, isLastStage: i === 2 }));
};

// ─── Main Component ──────────────────────────────────────────
export default function ManageKillsStagesDrawer({ tournament, initialTab = "standings", onClose, onUpdate, registrations: parentRegistrations }) {
  // Core state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Data
  const [registrations, setRegistrations] = useState([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]);

  // Filters
  const [activeStage, setActiveStage] = useState("");
  const [activeGroup, setActiveGroup] = useState("");
  const [activeMatch, setActiveMatch] = useState("");
  const [search, setSearch] = useState("");
  
  console.log("[ManageKills Render] Tournament ID:", tournament?.id, "Title:", tournament?.title, "Registrations in state:", registrations.length);

  // Editing state
  const [matchData, setMatchData] = useState({});
  const [manualRanks, setManualRanks] = useState({});
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [selectedTeams, setSelectedTeams] = useState(new Set());
  const [targetTournId, setTargetTournId] = useState("");
  const [targetStage, setTargetStage] = useState("");
  const [isLocked, setIsLocked] = useState(true);

  // Publish controls
  const [adminMessage, setAdminMessage] = useState("");
  const [isFinalized, setIsFinalized] = useState(false);
  const [showPublishedSuccess, setShowPublishedSuccess] = useState(false);

  // View tab
  const [viewTab, setViewTab] = useState(initialTab);

  // ─── Derived Data ────────────────────────────────────────
  const stages = useMemo(() => buildStages(tournament), [tournament]);
  const killMultiplier = tournament?.point_system?.kill_points || 1;
  const placementPts = tournament?.point_system?.placement_points || PLACEMENT_POINTS;

  // Derive current active stage object strictly from tournament configuration
  const currentStageObj = useMemo(() => {
    if (!stages || stages.length === 0) return null;
    if (!activeStage) return stages[0];
    const norm = String(activeStage).toLowerCase().trim().replace(/\s+/g, '_');
    return stages.find(s => 
      s.id === norm || 
      s.name.toLowerCase().trim().replace(/\s+/g, '_') === norm ||
      s.id.includes(norm) || 
      norm.includes(s.id)
    ) || stages[0];
  }, [stages, activeStage]);

  const matchCount = currentStageObj?.matches_count || 1;
  const MATCHES = useMemo(() => Array.from({ length: Math.max(1, matchCount) }, (_, i) => `M${i + 1}`), [matchCount]);

  // Keep activeMatch in range
  useEffect(() => {
    if (MATCHES.length === 1) {
      if (activeMatch !== "M1") setActiveMatch("M1");
    } else if (activeMatch && !MATCHES.includes(activeMatch)) {
      setActiveMatch("");
    }
  }, [MATCHES, activeMatch]);

  // ─── Data Loading ────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!tournament?.id) return;
    setLoading(true);
    try {
      const tIdStr = String(tournament.id);
      console.log("[ManageKills] Loading data for tournament:", tIdStr, "title:", tournament.title);

      // Collect registrations from ALL possible sources
      let allFound = [];

      // Source 1: Direct filter by tournament_id as string
      try {
        const r1 = await Registration.filter({ tournament_id: tIdStr });
        console.log("[ManageKills] Source 1 (filter string):", r1?.length || 0, "teams");
        if (r1 && r1.length > 0) allFound.push(...r1);
      } catch (e) {
        console.warn("[ManageKills] Source 1 failed:", e);
      }

      // Source 2: Direct filter by tournament_id as original type
      try {
        const r2 = await Registration.filter({ tournament_id: tournament.id });
        console.log("[ManageKills] Source 2 (filter original):", r2?.length || 0, "teams");
        if (r2 && r2.length > 0) allFound.push(...r2);
      } catch (e) {
        console.warn("[ManageKills] Source 2 failed:", e);
      }

      // Source 3: List ALL registrations and client-side filter (GUARANTEED to work)
      try {
        const allRegs = await Registration.list();
        console.log("[ManageKills] Source 3 (list all):", allRegs?.length || 0, "total registrations in system");
        const tournTitle = (tournament.title || "").toLowerCase().trim();
        const matched = (allRegs || []).filter(r => {
          if (!r) return false;
          const rId = String(r.tournament_id || "");
          if (rId === tIdStr) return true;
          if (rId === String(tournament.id)) return true;
          // Also match by title as last resort
          const rTitle = (r.tournament_title || r.tournament_name || "").toLowerCase().trim();
          if (tournTitle && rTitle && rTitle === tournTitle) return true;
          return false;
        });
        console.log("[ManageKills] Source 3 matched:", matched.length, "teams for this tournament");
        if (matched.length > 0) allFound.push(...matched);
      } catch (e) {
        console.warn("[ManageKills] Source 3 failed:", e);
      }

      // Source 4: Parent registrations (from TournamentDetail if available)
      if (parentRegistrations && parentRegistrations.length > 0) {
        const parentForThis = parentRegistrations.filter(r => {
          const rId = String(r.tournament_id || "");
          return rId === tIdStr || rId === String(tournament.id);
        });
        console.log("[ManageKills] Source 4 (parent):", parentForThis.length, "teams from parent");
        if (parentForThis.length > 0) allFound.push(...parentForThis);
      }

      // Deduplicate by id
      const regMap = new Map();
      allFound.forEach(r => {
        if (!r) return;
        const key = r.id || r.team_leader_id || `${r.team_name}_${r.team_leader_ign}`;
        if (!regMap.has(key)) regMap.set(key, { ...r });
      });
      const fetchedRegs = Array.from(regMap.values());
      console.log("[ManageKills] FINAL deduplicated teams:", fetchedRegs.length, fetchedRegs.map(r => r.team_name));

      // Load leaderboard entries and other tournaments
      let entries = [];
      try {
        entries = await TournamentLeaderboard.filter({ tournament_id: tIdStr });
        if (!entries || entries.length === 0) {
          entries = await TournamentLeaderboard.filter({ tournament_id: tournament.id });
        }
      } catch (e) {
        entries = [];
      }
      const tourns = await Tournament.list("-created_date", 50).catch(() => []);

      setRegistrations(fetchedRegs);
      setAllTournaments((tourns || []).filter(t => t.id !== tournament.id && t.status !== "Cancelled"));

      // Check existing publish state
      if (entries?.length > 0) {
        if (entries[0].admin_message) setAdminMessage(entries[0].admin_message);
        if (entries[0].is_finalized != null) setIsFinalized(Boolean(entries[0].is_finalized));
      }

      setLeaderboardEntries(entries || []);
      buildMatchState(fetchedRegs, entries || []);
    } catch (err) {
      console.error("[ManageKills] Load error:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [tournament, parentRegistrations]);

  useEffect(() => { loadData(); }, [loadData]);

  // Smart Lock: Auto-unlock if the match is empty, auto-lock if data already exists
  useEffect(() => {
    let hasData = false;
    stageTeams.forEach(t => {
      const uid = t.team_leader_id;
      const md = matchData[uid]?.[activeMatch] || {};
      if (md.kills > 0 || md.placement > 0) hasData = true;
    });
    setIsLocked(hasData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage, activeGroup, activeMatch]);

  // Build matchData state from existing entries specifically for activeStage
  const buildMatchState = useCallback((regs, entries, targetStage = activeStage) => {
    const data = {};
    const ranks = {};
    const targetStageNorm = String(targetStage || "").toLowerCase().trim().replace(/\s+/g, '_');

    entries.forEach(entry => {
      const uid = entry.user_id;
      if (!uid) return;
      const entryStageNorm = String(entry.stage || "").toLowerCase().trim().replace(/\s+/g, '_');

      // Only load match results if they strictly belong to this active stage!
      if (entryStageNorm !== targetStageNorm) {
        return; // Fresh 0-start for new stage!
      }

      if (entry.manual_rank) ranks[uid] = entry.manual_rank;
      data[uid] = {};
      if (entry.match_results?.length > 0) {
        entry.match_results.forEach(mr => {
          data[uid][mr.match_number] = {
            kills: mr.kills || 0, placement: mr.placement || 0,
            points: mr.points || 0, memberKills: mr.memberKills || []
          };
        });
      } else if (entry.kills || entry.points || entry.placement) {
        data[uid]["M1"] = {
          kills: entry.kills || 0, placement: entry.placement || 0,
          points: entry.points || 0,
          memberKills: (entry.team_members || []).map(m => ({ ign: m.ign, uid: m.uid, kills: m.kills || 0 }))
        };
      }
    });

    // Ensure stage_scores fallback and empty match container for all registered teams
    (regs || []).forEach(r => {
      const uid = r.team_leader_id;
      if (!uid) return;
      if (!data[uid]) data[uid] = {};

      // If data is empty for this team in this stage, check if it was saved in r.stage_scores strictly for targetStageNorm
      const stScore = r.stage_scores?.[targetStageNorm] || r.stage_scores?.[targetStage];
      if (stScore && Object.keys(data[uid]).length === 0) {
        if (stScore.rank) ranks[uid] = stScore.rank;
        if (stScore.match_results?.length > 0) {
          stScore.match_results.forEach(mr => {
            data[uid][mr.match_number] = {
              kills: mr.kills || 0, placement: mr.placement || 0,
              points: mr.points || 0, memberKills: mr.memberKills || []
            };
          });
        } else if (stScore.kills || stScore.points) {
          data[uid]["M1"] = {
            kills: stScore.kills || 0, placement: stScore.placement || 0,
            points: stScore.points || 0,
            memberKills: (r.team_members || []).map(m => ({ ign: m.ign, uid: m.uid, kills: 0 }))
          };
        }
      }
    });

    setMatchData(data);
    setManualRanks(ranks);
  }, [activeStage]);

  // Re-sync matchData when activeStage changes
  useEffect(() => {
    if (registrations.length > 0 || leaderboardEntries.length > 0) {
      buildMatchState(registrations, leaderboardEntries, activeStage);
    }
  }, [activeStage, registrations, leaderboardEntries, buildMatchState]);

  // Auto-save active edits to localStorage scoped by stage
  useEffect(() => {
    if (Object.keys(matchData).length > 0 && activeStage) {
      localStorage.setItem(`draft_kills_${tournament?.id}_${activeStage}`, JSON.stringify({ matchData, manualRanks }));
    }
  }, [matchData, manualRanks, tournament?.id, activeStage]);

  // ─── Professional Dynamic Stages & Groups Logic ───────────
  const { dynamicStages, groups, stageTeams } = useMemo(() => {
    const stList = stages;

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

    // 2. STAGE TEAMS FILTERING (Generic — works for custom AND default stages)
    const currentStageId = (activeStage || stList[0]?.id || "").toLowerCase().trim().replace(/\s+/g, '_');
    const activeStageIdx = stList.findIndex(s => s.id === currentStageId || s.name.toLowerCase().trim().replace(/\s+/g, '_') === currentStageId);
    const safeActiveStageIdx = activeStageIdx >= 0 ? activeStageIdx : 0;
    const isLastStage = safeActiveStageIdx === stList.length - 1;

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

    // 3. GROUPS: Derive all configured groups for the tournament
    const grps = [];
    const groupTeamsMap = new Map();
    const groupSchedules = Array.isArray(tournament?.group_schedules) ? tournament.group_schedules : [];
    const isSemi = currentStageId.includes("semi");
    const isFinal = isLastStage || currentStageId.includes("final");

    if (isFinal) {
      grps.push({ id: "gf", name: stList[safeActiveStageIdx]?.name || "Final", teams: filtered });
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
          else if (lower === "gf") displayName = stList[safeActiveStageIdx]?.name || "Final";
          else if (lower.startsWith("group")) displayName = gName.charAt(0).toUpperCase() + gName.slice(1);
        }

        grps.push({
          id: gName,
          name: displayName,
          teams: tms,
          rawId: gName // keep the original DB id just in case
        });
      });
    }

    return { dynamicStages: stList, groups: grps, stageTeams: filtered };
  }, [stages, registrations, leaderboardEntries, activeStage, tournament]);

  // Auto-select first stage, first group, first match
  useEffect(() => {
    if (dynamicStages.length > 0 && !activeStage) {
      setActiveStage(dynamicStages[0].id);
    }
  }, [dynamicStages, activeStage]);

  useEffect(() => {
    if (groups.length > 0 && !activeGroup) {
      setActiveGroup(groups[0].id);
    }
  }, [groups, activeGroup]);

  useEffect(() => {
    if (MATCHES.length > 0 && !activeMatch) {
      setActiveMatch(MATCHES[0]);
    }
  }, [MATCHES, activeMatch]);

  // Current visible teams
  const visibleTeams = useMemo(() => {
    let list = activeGroup === "all" ? stageTeams : (groups.find(g => g.id === activeGroup)?.teams || stageTeams);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(r =>
      (r.team_name || "").toLowerCase().includes(q) ||
      (r.team_leader_ign || "").toLowerCase().includes(q) ||
      String(r.team_leader_uid || "").includes(q)
    );
  }, [stageTeams, groups, activeGroup, search]);

  // ─── Stats Calculation ───────────────────────────────────
  const calcStats = useCallback((userId) => {
    const ud = matchData[userId] || {};
    const results = MATCHES.map(m => {
      const md = ud[m] || {};
      const kills = parseInt(md.kills) || 0;
      const place = parseInt(md.placement) || 0;
      const pPts = placementPts[place] || 0;
      return { 
        match_number: m, 
        kills, 
        placement: place, 
        points: pPts + kills * killMultiplier,
        memberKills: md.memberKills || []
      };
    });
    let totalPts = 0, totalKills = 0, booyahs = 0, bestPlace = 999;
    results.forEach(r => {
      totalPts += r.points;
      totalKills += r.kills;
      if (r.placement === 1) booyahs++;
      if (r.placement > 0 && r.placement < bestPlace) bestPlace = r.placement;
    });
    const am = ud[activeMatch] || {};
    const aKills = parseInt(am.kills) || 0;
    const aPlace = parseInt(am.placement) || 0;
    const aPts = (placementPts[aPlace] || 0) + aKills * killMultiplier;
    return { results, totalPts, totalKills, booyahs, bestPlace: bestPlace === 999 ? 0 : bestPlace, aKills, aPlace, aPts };
  }, [matchData, MATCHES, activeMatch, killMultiplier, placementPts]);

  // Ranked teams list
  const rankedTeams = useMemo(() => {
    const list = visibleTeams.map(reg => {
      const stats = calcStats(reg.team_leader_id);
      const mr = manualRanks[reg.team_leader_id];
      return { ...reg, _s: stats, _mr: mr ? parseInt(mr) : null };
    });
    list.sort((a, b) => {
      if (a._mr != null && b._mr != null) return a._mr - b._mr;
      if (a._mr != null) return -1;
      if (b._mr != null) return 1;
      if (b._s.totalPts !== a._s.totalPts) return b._s.totalPts - a._s.totalPts;
      if (b._s.booyahs !== a._s.booyahs) return b._s.booyahs - a._s.booyahs;
      if (b._s.totalKills !== a._s.totalKills) return b._s.totalKills - a._s.totalKills;
      return (a._s.bestPlace || 99) - (b._s.bestPlace || 99);
    });
    return list;
  }, [visibleTeams, calcStats, manualRanks]);

  // Compute assigned placements for the current match
  const assignedPlacements = useMemo(() => {
    const assigned = new Set();
    Object.values(matchData).forEach(teamData => {
      const p = teamData[activeMatch]?.placement;
      if (p && parseInt(p) > 0) assigned.add(parseInt(p));
    });
    return assigned;
  }, [matchData, activeMatch]);

  // ─── Handlers ────────────────────────────────────────────
  const updateKills = (uid, val) => {
    setMatchData(p => ({ ...p, [uid]: { ...p[uid], [activeMatch]: { ...(p[uid]?.[activeMatch] || {}), kills: Math.max(0, parseInt(val) || 0) } } }));
  };

  const updatePlacement = (uid, val) => {
    setMatchData(p => ({ ...p, [uid]: { ...p[uid], [activeMatch]: { ...(p[uid]?.[activeMatch] || {}), placement: Math.max(0, parseInt(val) || 0) } } }));
  };

  const setPodium = (place, uid) => {
    setMatchData(p => {
      const next = { ...p };
      // Clear existing holder of this place
      Object.keys(next).forEach(u => {
        if (next[u]?.[activeMatch]?.placement === place) {
          next[u] = { ...next[u], [activeMatch]: { ...(next[u][activeMatch] || {}), placement: 0 } };
        }
      });
      if (uid && uid !== "none") {
        next[uid] = { ...next[uid], [activeMatch]: { ...(next[uid]?.[activeMatch] || {}), placement: place } };
      }
      return next;
    });
  };

  const updateMemberKill = (uid, reg, idx, val) => {
    const k = Math.max(0, parseInt(val) || 0);
    setMatchData(p => {
      const ud = p[uid] || {};
      const md = ud[activeMatch] || {};
      const members = md.memberKills?.length > 0
        ? [...md.memberKills]
        : (reg.team_members || []).map(m => ({ ign: m.ign, uid: m.uid, kills: 0 }));
      if (!members[idx]) members[idx] = { ign: `Player ${idx + 1}`, kills: 0 };
      members[idx] = { ...members[idx], kills: k };
      const total = members.reduce((s, m) => s + (m.kills || 0), 0);
      return { ...p, [uid]: { ...ud, [activeMatch]: { ...md, memberKills: members, kills: total } } };
    });
  };

  // ─── Save & Publish ──────────────────────────────────────
  const handlePublish = async (isPublishAction = false) => {
    setSaving(true);
    const msg = isPublishAction ? "Publishing standings to public..." : "Saving draft...";
    const tid = toast.loading(msg);
    try {
      let count = 0;
      for (let i = 0; i < rankedTeams.length; i++) {
        const team = rankedTeams[i];
        const uid = team.team_leader_id;
        const s = team._s;
        const rank = team._mr || (i + 1);
        const activeStageNorm = String(activeStage || "").toLowerCase().trim().replace(/\s+/g, '_');
        const existing = leaderboardEntries.find(e => 
          (e.user_id === uid || e.id === team.id || String(e.unique_id || "").includes(team.id)) &&
          String(e.stage || "").toLowerCase().trim().replace(/\s+/g, '_') === activeStageNorm
        );

        const data = {
          tournament_id: String(tournament.id), 
          tournament_title: tournament.title,
          user_id: uid, 
          unique_id: `${tournament.id}_${uid}_${activeStage}`,
          team_name: team.team_name || team.team_leader_ign,
          player_ign: team.team_leader_ign, 
          player_uid: team.team_leader_uid,
          kills: s.totalKills, 
          points: s.totalPts,
          placement: s.bestPlace || (s.results[0]?.placement || 0),
          rank, 
          wins: s.booyahs, 
          match_results: s.results,
          manual_rank: team._mr, 
          stage: activeStage, 
          group_number: activeGroup,
          admin_message: adminMessage.trim(), 
          is_finalized: isPublishAction ? isFinalized : Boolean(existing?.is_finalized),
          is_published: true
        };

        if (existing) {
          await TournamentLeaderboard.update(existing.id, data).catch(() => null);
        } else {
          await TournamentLeaderboard.create(data).catch(() => null);
        }
        
        // Save stage_scores on Registration as resilient single source of truth
        const reg = registrations.find(r => r.team_leader_id === uid || r.id === team.id || r.id === team._uid);
        if (reg) {
          const currentScores = reg.stage_scores || {};
          currentScores[activeStage] = {
            kills: s.totalKills,
            points: s.totalPts,
            match_results: s.results,
            rank
          };
          currentScores[activeStageNorm] = {
            kills: s.totalKills,
            points: s.totalPts,
            match_results: s.results,
            rank
          };
          await Registration.update(reg.id, { 
            stage_scores: currentScores,
            total_kills: s.totalKills, 
            total_points: s.totalPts, 
            last_published_stage: activeStage,
            rank 
          }).catch(() => null);
        }
        count++;
      }
      
      // Notify top 10 ONLY when officially publishing
      if (isPublishAction) {
        await Promise.all(rankedTeams.slice(0, 10).map(t =>
          Notification.create({
            user_id: t.team_leader_id,
            title: `🏆 ${tournament.title.toUpperCase()} — Standings Updated`,
            message: adminMessage.trim() || "Official standings have been published. Check your rank!",
            type: "standings_update", link: `/tournament/${tournament.id}`
          }).catch(() => null)
        ));
      }
      
      toast.success(isPublishAction ? `Published standings for ${count} teams` : `Draft saved for ${count} teams`, { id: tid });
      localStorage.removeItem(`draft_kills_${tournament?.id}`);
      
      if (isPublishAction) {
        setShowPublishedSuccess(true);
        setTimeout(() => setShowPublishedSuccess(false), 2000);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#f59e0b', '#3b82f6', '#f43f5e'] // Emerald, amber, blue, rose
        });
      } else {
        setIsLocked(true);
      }
      onUpdate?.();
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(isPublishAction ? "Failed to publish" : "Failed to save draft", { id: tid });
    } finally {
      setSaving(false);
    }
  };

  // ─── Promote Teams ───────────────────────────────────────
  const handlePromote = async (targetStage, group = "") => {
    if (!targetStage) return toast.error("Select a stage to promote to");
    if (selectedTeams.size === 0) return toast.error("Select teams first");
    setPromoting(true);
    const tid = toast.loading(`Promoting ${selectedTeams.size} teams...`);
    try {
      let count = 0;
      const tl = targetStage.toLowerCase();
      for (const uid of selectedTeams) {
        const reg = registrations.find(r => r.team_leader_id === uid);
        if (!reg) continue;
        const update = { stage: tl, is_qualified: true, status: tl.includes("final") ? "Finalist" : "Qualified" };
        if (tl.includes("semi") && group) update.semifinal_group = group;
        if (tl.includes("final")) update.is_finalist = true;
        await Registration.update(reg.id, update).catch(() => null);
        const lb = leaderboardEntries.find(e => e.user_id === uid);
        if (lb) await TournamentLeaderboard.update(lb.id, { is_qualified: true, stage: tl }).catch(() => null);
        await Notification.create({
          user_id: uid,
          title: `🌟 QUALIFIED — ${tournament.title.toUpperCase()}`,
          message: `Your squad qualified for ${targetStage}${group ? ` (Group ${group})` : ""}!`,
          type: "tournament_qualified", link: `/tournament/${tournament.id}`
        }).catch(() => null);
        count++;
      }
      toast.success(`${count} teams promoted to ${targetStage}`, { id: tid });
      setSelectedTeams(new Set());
      onUpdate?.();
      await loadData();
    } catch (err) {
      toast.error("Promotion failed", { id: tid });
    } finally {
      setPromoting(false);
    }
  };

  const handleCrossTransfer = async () => {
    if (!targetTournId || selectedTeams.size === 0) return toast.error("Select target & teams");
    const target = allTournaments.find(t => t.id === targetTournId);
    if (!target) return;
    setPromoting(true);
    const tid = toast.loading(`Transferring to ${target.title}...`);
    try {
      const existingRegs = await Registration.filter({ tournament_id: targetTournId }).catch(() => []);
      let count = 0;
      for (const uid of selectedTeams) {
        const src = registrations.find(r => r.team_leader_id === uid);
        if (!src || existingRegs.some(r => r.team_leader_id === uid)) continue;
        await Registration.update(src.id, { is_qualified: true, status: "Qualified" }).catch(() => null);
        await Registration.create({
          tournament_id: target.id, tournament_title: target.title,
          team_name: src.team_name, team_leader_id: src.team_leader_id,
          team_leader_ign: src.team_leader_ign, team_leader_uid: src.team_leader_uid || "",
          team_leader_phone: src.team_leader_phone || "",
          team_members: src.team_members || [], team_logo_url: src.team_logo_url || "",
          is_qualified: true, total_points: 0, total_kills: 0, status: "Qualified", payment_status: "Paid"
        }).catch(() => null);
        count++;
      }
      await Tournament.update(target.id, { current_teams: (target.current_teams || 0) + count }).catch(() => null);
      toast.success(`${count} teams transferred`, { id: tid });
      setSelectedTeams(new Set());
      setTargetTournId("");
      onUpdate?.();
      await loadData();
    } catch (err) {
      toast.error("Transfer failed", { id: tid });
    } finally {
      setPromoting(false);
    }
  };

  // Download txt summary
  const downloadSummary = () => {
    let txt = `BATTLEHUB FF — ${tournament.title.toUpperCase()} STANDINGS\n`;
    txt += `${"━".repeat(50)}\nStage: ${activeStage.toUpperCase()} | ${new Date().toLocaleString("en-IN")}\n`;
    if (adminMessage) txt += `Notice: ${adminMessage}\n`;
    txt += `${"━".repeat(50)}\n\nRANK | TEAM                       | KILLS | BOOYAH | PTS\n${"─".repeat(55)}\n`;
    rankedTeams.forEach((t, i) => {
      txt += `#${String(i + 1).padEnd(4)} | ${(t.team_name || "").slice(0, 26).padEnd(26)} | ${String(t._s.totalKills).padStart(5)} | ${String(t._s.booyahs).padStart(6)} | ${String(t._s.totalPts).padStart(3)}\n`;
    });
    txt += `\n${"━".repeat(50)}\nbattlehubff.site\n`;
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tournament.title.replace(/\s+/g, "_")}_standings.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Downloaded");
  };

  // Selection helpers
  const toggleSelect = (uid) => setSelectedTeams(p => { const n = new Set(p); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });
  const selectTop = (n) => { setSelectedTeams(new Set(rankedTeams.slice(0, n).map(t => t.team_leader_id))); toast.info(`Selected top ${n}`); };

  // Podium lookups
  const podiumUid = (place) => Object.keys(matchData).find(u => matchData[u]?.[activeMatch]?.placement === place) || "";

  // ─── Rank Badge ──────────────────────────────────────────
  const RankBadge = ({ rank }) => {
    if (rank === 1) return <span className="text-amber-400 font-black">🥇 1</span>;
    if (rank === 2) return <span className="text-gray-300 font-black">🥈 2</span>;
    if (rank === 3) return <span className="text-amber-600 font-black">🥉 3</span>;
    return <span className="text-zinc-400 font-bold">#{rank}</span>;
  };

  // ─── Render using Portal to Cover Main App Header ────────
  return createPortal(
    <div className="fixed inset-0 z-[99999999] flex justify-end overflow-hidden">
      {/* Full Backdrop covering entire screen */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose} className="fixed inset-0 bg-black/80 cursor-pointer"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full sm:max-w-4xl bg-[#090910] border-l border-white/10 shadow-2xl z-[100000000] flex flex-col h-full overflow-hidden font-sans"
      >
        {/* ── TOP HEADER BAR WITH BACK BUTTON ── */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#090912] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-zinc-300 hover:text-white hover:bg-white/10 h-9 px-3 rounded-xl flex items-center gap-1.5 font-bold cursor-pointer border border-white/10 shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Back</span>
            </Button>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white truncate flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{tournament?.title}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setIsFinalized(!isFinalized)}
              title={isFinalized ? "Marked as Final" : "Mark as Final"}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all cursor-pointer shadow-sm ${
                isFinalized ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={() => handlePublish(true)}
              disabled={!isLocked || saving}
              title={!isLocked ? "Save Draft to Lock points before publishing" : "Publish to Public Standings"}
              className={`h-8 px-4 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer shadow-lg active:scale-95 ${
                !isLocked || saving 
                  ? "bg-emerald-500/30 border-emerald-500/20 text-slate-900/50 cursor-not-allowed" 
                  : "bg-emerald-500 hover:bg-emerald-400 border-emerald-500/40 text-slate-900"
              }`}
            >
              Publish
            </button>
          </div>
        </div>

        {/* ── SIMPLE SINGLE-LINE STAGE, GROUP & MATCH SELECTOR BAR ── */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#0c0c14] border-b border-white/[0.08] flex flex-wrap items-center gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            {/* Stage Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400">Stage:</span>
              <select
                value={activeStage}
                onChange={e => { setActiveStage(e.target.value); setActiveGroup(""); setSelectedTeams(new Set()); }}
                className="bg-white/5 border border-white/10 text-white text-xs font-semibold rounded-lg h-8 px-2.5 outline-none cursor-pointer hover:bg-white/10 transition-colors"
              >
                <option value="" disabled className="bg-[#141420] text-zinc-500">Select Stage</option>
                {dynamicStages.map(st => (
                  <option key={st.id} value={st.id} className="bg-[#141420] text-white">{st.name}</option>
                ))}
              </select>
            </div>

            {/* Group Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400">Group:</span>
              <select
                value={activeGroup}
                onChange={e => setActiveGroup(e.target.value)}
                className="bg-white/5 border border-white/10 text-white text-xs font-semibold rounded-lg h-8 px-2.5 outline-none cursor-pointer hover:bg-white/10 transition-colors"
              >
                <option value="" disabled className="bg-[#141420] text-zinc-500">Select Group</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id} className="bg-[#141420] text-white">{g.name} ({g.teams.length})</option>
                ))}
              </select>
            </div>

            {/* Match Selector */}
            {MATCHES.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-400">Match:</span>
                <select
                  value={activeMatch}
                  onChange={e => setActiveMatch(e.target.value)}
                  className="bg-white/5 border border-white/10 text-white text-xs font-semibold rounded-lg h-8 px-2.5 outline-none cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <option value="" disabled className="bg-[#141420] text-zinc-500">Select Match</option>
                  {MATCHES.map(m => (
                    <option key={m} value={m} className="bg-[#141420] text-white">Match {m.replace('M', '')}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Body Content ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                  <Skeleton className="w-8 h-8 rounded-lg bg-zinc-800" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="w-40 h-3.5 bg-zinc-800" />
                    <Skeleton className="w-24 h-2.5 bg-zinc-800/60" />
                  </div>
                  <Skeleton className="w-16 h-7 rounded bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3.5">
              {(!activeStage || !activeGroup || !activeMatch) ? (
                <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <Layers className="w-12 h-12 text-zinc-600 mb-4 opacity-50" />
                  <p className="text-base font-bold text-zinc-300">Select Stage, Group and Match</p>
                  <p className="text-xs text-zinc-500 mt-2 max-w-sm">Please select a stage, group, and match from the top dropdowns to start entering kills and placements.</p>
                </div>
              ) : (
                <>
                  {/* ── SEARCH BAR ── */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.03] border border-white/[0.08] p-2.5 rounded-2xl">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                      <Input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search team, IGN, UID..." className="bg-white/5 border-white/10 text-white pl-9 h-8 rounded-xl text-xs w-full"
                      />
                    </div>
                  </div>

                  {selectedTeams.size > 0 && (
                <div className="flex items-center justify-between gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 rounded-xl">
                  <span className="text-xs font-bold text-emerald-300">{selectedTeams.size} selected</span>
                  <div className="flex items-center gap-2">
                    <select value={targetStage} onChange={e => setTargetStage(e.target.value)}
                      className="bg-[#111] border border-emerald-500/30 text-white text-xs rounded-lg h-7 px-2 max-w-[150px] truncate"
                    >
                      <option value="" disabled>Select Next Stage</option>
                      {dynamicStages.filter(st => st.id !== activeStage && st.id !== "all").map(st => (
                        <option key={st.id} value={st.id}>To {st.name}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={() => handlePromote(targetStage)} disabled={promoting}
                      className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs h-7 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" /> Promote
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Master Unified List (No Horizontal Scroll) ── */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[9px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-wider">
                  <div className="w-6 sm:w-8 flex justify-center shrink-0">
                    <input type="checkbox" checked={selectedTeams.size > 0 && selectedTeams.size === visibleTeams.length}
                      onChange={e => e.target.checked ? setSelectedTeams(new Set(visibleTeams.map(t => t.team_leader_id))) : setSelectedTeams(new Set())}
                      className="rounded accent-amber-500 cursor-pointer w-3 h-3 sm:w-3.5 sm:h-3.5"
                    />
                  </div>
                  <div className="w-6 sm:w-8 text-center shrink-0">Rank</div>
                  <div className="flex-1 min-w-0 text-left">Team Details</div>
                  <div className="w-10 sm:w-12 text-center text-amber-400 shrink-0">Place</div>
                  <div className="w-8 sm:w-12 text-center text-orange-400 shrink-0">Total K</div>
                  <div className="w-10 sm:w-14 text-center text-emerald-400 shrink-0">Total Pts</div>
                  <div className="w-8 sm:w-12 text-center shrink-0 hidden sm:block">Rank #</div>
                  <div className="w-6 sm:w-8 shrink-0"></div>
                </div>

                {/* Body */}
                <div className="divide-y divide-white/[0.04]">
                  {rankedTeams.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs">No teams found in this stage/group</div>
                  ) : rankedTeams.map((t, i) => {
                    const uid = t.team_leader_id;
                    const s = t._s;
                    const rank = t._mr || (i + 1);
                    const am = matchData[uid]?.[activeMatch] || {};
                    const kills = am.kills || 0;
                    const place = am.placement || 0;
                    const isSel = selectedTeams.has(uid);

                    const activeStageIdx = dynamicStages.findIndex(st => st.id === activeStage);
                    const teamStageIdx = dynamicStages.findIndex(st => {
                      const raw = String(t.stage || "").toLowerCase().trim().replace(/\s+/g, '_');
                      const sId = st.id.toLowerCase().trim().replace(/\s+/g, '_');
                      const sName = st.name.toLowerCase().trim().replace(/\s+/g, '_');
                      return raw === sId || raw === sName || (sName && raw.includes(sName)) || (sId && raw.includes(sId));
                    });
                    const isMovedAhead = activeStageIdx !== -1 && teamStageIdx !== -1 && teamStageIdx > activeStageIdx;
                    const statusLower = String(t.status || "").toLowerCase();
                    const isDisqualified = Boolean(t.is_disqualified || t.is_eliminated || statusLower === "disqualified" || statusLower === "eliminated" || statusLower === "rejected");
                    const isQualified = !isDisqualified && isMovedAhead;

                    let rowClass = "hover:bg-white/[0.02] border-l-4 border-transparent";
                    if (isSel) {
                      rowClass = "bg-amber-500/15 border-l-4 border-amber-500";
                    } else if (isQualified) {
                      rowClass = "bg-emerald-950/25 border-l-4 border-l-emerald-500 text-emerald-200 hover:bg-emerald-900/30";
                    } else if (isDisqualified) {
                      rowClass = "bg-red-950/25 border-l-4 border-l-red-500 text-red-200 hover:bg-red-900/30 opacity-80";
                    }

                    const rawMembers = Array.isArray(t.team_members) && t.team_members.length > 0
                      ? t.team_members
                      : [{ ign: t.team_leader_ign || t.team_name || "Leader", uid: t.team_leader_uid || t.team_leader_id || "" }];
                    const playersList = rawMembers;

                    return (
                      <div key={uid} className="flex flex-col">
                        {/* Main Team Row */}
                        <div className={`flex items-center gap-1.5 sm:gap-2 px-2 py-2 transition-colors ${rowClass}`}>
                          <div className="w-6 sm:w-8 flex justify-center shrink-0">
                            <input type="checkbox" checked={isSel} onChange={() => toggleSelect(uid)} className="rounded accent-amber-500 cursor-pointer w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </div>
                          <div className="w-6 sm:w-8 flex justify-center shrink-0 scale-90 sm:scale-100">
                            <RankBadge rank={rank} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className={`font-bold text-[11px] sm:text-xs truncate ${isQualified ? 'text-emerald-300' : isDisqualified ? 'text-red-400 line-through' : 'text-white'}`}>
                                {t.team_name || t.team_leader_ign}
                              </p>
                              {isQualified && (
                                <span className="text-[8px] text-emerald-400 font-black bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 shadow-sm">
                                  <span>✓</span> {(() => {
                                    if (activeStageIdx !== -1 && activeStageIdx < dynamicStages.length - 1) {
                                      const nextStageName = (dynamicStages[activeStageIdx + 1]?.name || dynamicStages[activeStageIdx + 1]?.id || "").toUpperCase();
                                      return isMovedAhead ? `MOVED TO ${nextStageName}` : `QUALIFIED: ${nextStageName}`;
                                    }
                                    const raw = String(t._lbStage || t.stage || "").trim();
                                    if (!raw) return "QUALIFIED";
                                    const match = dynamicStages.find(st => st.id.toLowerCase().trim() === raw.toLowerCase() || st.name?.toLowerCase().trim() === raw.toLowerCase());
                                    const stageName = match?.name || raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                    return isMovedAhead ? `MOVED TO ${stageName.toUpperCase()}` : `QUALIFIED: ${stageName.toUpperCase()}`;
                                  })()}
                                </span>
                              )}
                              {isDisqualified && (
                                <span className="text-[8px] text-red-400 font-black bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 shadow-sm">
                                  <span>✕</span> ELIMINATED
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-zinc-500 truncate">{t.team_leader_ign}</p>
                          </div>

                          <div className="w-10 sm:w-12 flex justify-center shrink-0">
                            <select
                              value={place || ""}
                              disabled={isLocked}
                              onChange={e => updatePlacement(uid, e.target.value)}
                              className={`w-10 sm:w-12 h-6 sm:h-7 text-center text-[11px] sm:text-xs font-bold rounded mx-auto p-0 appearance-none outline-none ${
                                isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                              } ${
                                place === 1 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                                place === 2 ? "bg-zinc-400/20 text-zinc-200 border border-zinc-400/40" :
                                place === 3 ? "bg-orange-500/20 text-orange-300 border border-orange-500/40" :
                                "bg-white/5 border border-white/10 text-white"
                              }`}
                            >
                              <option value="" className="bg-[#141420] text-zinc-500">—</option>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(num => {
                                const isAssigned = assignedPlacements.has(num) && place !== num;
                                return (
                                  <option key={num} value={num} disabled={isAssigned} className={isAssigned ? "bg-[#1a1a24] text-zinc-600 line-through" : "bg-[#141420] text-white"}>
                                    {num}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="w-8 sm:w-12 flex justify-center items-center shrink-0">
                            <span className="font-bold text-orange-400 text-[11px] sm:text-xs">{s.totalKills}</span>
                          </div>

                          <div className="w-10 sm:w-14 flex justify-center items-center shrink-0">
                            <span className="font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs">{s.totalPts}</span>
                          </div>

                          <div className="w-8 sm:w-12 justify-center shrink-0 hidden sm:flex">
                            <Input type="number" min="1" value={manualRanks[uid] || ""} placeholder={`${i + 1}`}
                              disabled={isLocked}
                              onChange={e => setManualRanks(p => ({ ...p, [uid]: e.target.value }))}
                              className={`w-8 sm:w-10 h-6 text-center bg-white/5 border-white/10 text-white text-[10px] sm:text-[11px] rounded mx-auto p-0 ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                            />
                          </div>

                          <div className="w-6 sm:w-8 flex justify-center shrink-0">
                            <button
                              type="button"
                              onClick={() => setExpandedTeam(expandedTeam === uid ? null : uid)}
                              className={`p-1 rounded-lg transition-all cursor-pointer ${
                                expandedTeam === uid
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
                              }`}
                            >
                              {expandedTeam === uid ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Sub-Row: Individual Player Kills Input */}
                        {expandedTeam === uid && (
                          <div className="bg-[#080812]/90 border-t border-white/[0.04] p-3 sm:p-4 pl-10 sm:pl-16 flex flex-col gap-2">
                            <span className="text-[9px] sm:text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                              <Users className="w-3 h-3 text-amber-400" /> Player Kills:
                            </span>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-md">
                              {playersList.map((m, mi) => (
                                <div key={mi} className="flex items-center justify-between gap-2 bg-white/[0.04] border border-white/[0.08] px-2 sm:px-3 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
                                  <span className="text-[10px] sm:text-[11px] font-bold text-zinc-300 truncate">
                                    {mi === 0 ? "👑 " : ""}{m.ign || `Player ${mi + 1}`}
                                  </span>
                                  <Input
                                    type="number" min="0"
                                    disabled={isLocked}
                                    value={am.memberKills?.[mi]?.kills != null ? am.memberKills[mi].kills : 0}
                                    onChange={e => updateMemberKill(uid, t, mi, e.target.value)}
                                    className={`w-10 sm:w-12 h-6 sm:h-7 text-center bg-white/10 border-white/10 text-white font-bold text-xs rounded p-0 focus:border-amber-400 shrink-0 ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 sm:px-5 py-3 border-t border-white/[0.08] bg-[#0c0c16] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-zinc-500 flex items-center gap-3">
            <span>Stage: <strong className="text-white">{activeStage}</strong></span>
            <span>Teams: <strong className="text-white">{rankedTeams.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="border-white/10 text-zinc-300 text-xs h-9 px-4 rounded-lg cursor-pointer">
              Close
            </Button>
            {isLocked ? (
              <Button onClick={() => setIsLocked(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs h-9 px-5 rounded-lg flex items-center gap-1.5 cursor-pointer border border-zinc-700"
              >
                <Unlock className="w-3.5 h-3.5 text-zinc-400" />
                Unlock to Edit
              </Button>
            ) : (
              <Button onClick={() => handlePublish(false)} disabled={saving || loading}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-9 px-5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save Draft"}
              </Button>
            )}
          </div>
        </div>
        {/* ── Publish Success Overlay ── */}
        {showPublishedSuccess && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-widest drop-shadow-lg">PUBLISHED</h2>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
