import React, { useState, useEffect } from "react";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trophy, X, Image as ImageIcon, Plus, Trash2, Calendar, Target, DollarSign, Clock, LayoutList, Info, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

function InfoTooltip({ text }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center text-zinc-500 hover:text-indigo-400 focus:outline-none transition-colors ml-1 cursor-help">
            <Info className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-[#0f0f0f] border border-slate-700 text-zinc-200 p-2.5 text-xs max-w-xs shadow-2xl shadow-black/50 rounded-lg z-50">
          <p className="leading-relaxed">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const calculateTournamentStructure = (totalTeams, stagesCount, stages) => {
  if (!totalTeams || totalTeams % 12 !== 0 || stagesCount < 1) return null;
  if (stagesCount === 1) {
      return [{ stageIndex: 1, name: stages[0]?.name || "Final Match", incomingTeams: totalTeams, groups: totalTeams/12, isFinal: true, topN: 0, wildcards: 0, outgoingTeams: totalTeams }];
  }
  const idealTargets = [12];
  let currentTarget = 12;
  for (let i = 1; i < stagesCount; i++) {
      let factor = Math.pow(totalTeams / 12, 1 / (stagesCount - 1));
      let rawTarget = currentTarget * factor;
      let snapped = Math.round(rawTarget / 12) * 12;
      idealTargets.push(snapped);
      currentTarget = snapped;
  }
  idealTargets.reverse();
  idealTargets[0] = totalTeams;
  
  const stagesRules = [];
  for (let i = 0; i < stagesCount; i++) {
      if (i === stagesCount - 1) {
           stagesRules.push({
               stageIndex: i + 1,
               name: stages[i]?.name || `Stage ${i+1}`,
               incomingTeams: idealTargets[i],
               groups: idealTargets[i] / 12,
               isFinal: true
           });
           continue;
      }
      let groups = idealTargets[i] / 12;
      let targetOut = idealTargets[i + 1];
      
      let topN = Math.floor(targetOut / groups);
      if (topN > 12) topN = 12;
      if (topN < 1) topN = 1;
      let wildcards = targetOut - (topN * groups);
      
      stagesRules.push({
           stageIndex: i + 1,
           name: stages[i]?.name || `Stage ${i+1}`,
           incomingTeams: idealTargets[i],
           groups: groups,
           isFinal: false,
           topN: topN,
           wildcards: wildcards,
           outgoingTeams: targetOut
      });
  }
  return stagesRules;
};

export default function CreateTournament() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPrizeChart, setUploadingPrizeChart] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    tournament_type: "Qualifier",
    mode: "Squad",
    map: "Bermuda",
    entry_fee: 0,
    prize_pool: 0,
    date_time: "",
    end_time: "",
    registration_closes: "",
    max_teams: 0,
    banner_url: "",
    prize_chart_url: "",
    stages: [
      { name: "Qualifiers", matches_count: 1 },
      { name: "Semifinals", matches_count: 1 },
      { name: "Grand Final", matches_count: 3 }
    ],
    rules: `⚔️ BattleHub Esports Tournament Rules

1. Anti-Cheat & Integrity
- Minimum Account Level: 50+
- No Emulators allowed (Mobile Only)
- Headshot rate > 80% requires telemetry verification.

2. Penalties & Enforcement
- First Offense: 7-day suspension
- Second Offense: 30-day suspension
- Third Offense: Permanent Ban

3. General Guidelines
- Match fixing or teaming up will result in immediate disqualification.
- All admin decisions are final.`
  });

  const [hostsCount, setHostsCount] = useState(1);
  const [hostNames, setHostNames] = useState({ 0: "Host 1", 1: "Host 2", 2: "Host 3" });
  const [matchIntervalMins, setMatchIntervalMins] = useState(35);
  const [dailyMatchesLimit, setDailyMatchesLimit] = useState(0);
  const [isCustomDailyLimit, setIsCustomDailyLimit] = useState(false);
  const [pendingGroupTimeChange, setPendingGroupTimeChange] = useState(null);
  const [draftGroupSchedules, setDraftGroupSchedules] = useState({});
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupPage, setGroupPage] = useState(1);
  const GROUPS_PER_PAGE = 30;
  const presetDailyLimits = [0, 2, 4, 5, 6, 8, 10, 12, 16, 20];

  const handleDailyLimitSelect = (val) => {
    if (val === "custom") {
      setIsCustomDailyLimit(true);
    } else {
      setIsCustomDailyLimit(false);
      setDailyMatchesLimit(parseInt(val) || 0);
    }
  };

  const handleGroupTimeBlur = (groupIndex) => {
    const draftVal = draftGroupSchedules[groupIndex];
    if (!draftVal) return;

    const oldIsoString = getGroupSchedule(groupIndex);
    if (draftVal === oldIsoString) return;

    const oldMs = new Date(oldIsoString).getTime();
    const newMs = new Date(draftVal).getTime();
    const diffMs = newMs - oldMs;
    const diffMins = Math.round(diffMs / (60 * 1000));

    if (diffMs === 0 || isNaN(diffMs)) return;

    setPendingGroupTimeChange({
      groupIndex,
      newIsoString: draftVal,
      oldIsoString,
      diffMins
    });
  };

  const cancelGroupTimeChange = () => {
    if (pendingGroupTimeChange) {
      const gIdx = pendingGroupTimeChange.groupIndex;
      setDraftGroupSchedules(prev => {
        const next = { ...prev };
        delete next[gIdx];
        return next;
      });
    }
    setPendingGroupTimeChange(null);
  };

  const applySingleGroupTime = () => {
    if (!pendingGroupTimeChange) return;
    const gIdx = pendingGroupTimeChange.groupIndex;
    setCustomGroupSchedules(prev => ({
      ...prev,
      [gIdx]: pendingGroupTimeChange.newIsoString
    }));
    setDraftGroupSchedules(prev => {
      const next = { ...prev };
      delete next[gIdx];
      return next;
    });
    setPendingGroupTimeChange(null);
  };

  const applyShiftFollowingGroupTimes = () => {
    if (!pendingGroupTimeChange) return;
    const { groupIndex, diffMins } = pendingGroupTimeChange;
    const diffMs = diffMins * 60 * 1000;
    const newCustoms = { ...customGroupSchedules };

    for (let idx = groupIndex; idx < totalGroups; idx++) {
      const currentGroupIso = getGroupSchedule(idx);
      const currentMs = new Date(currentGroupIso).getTime();
      const shiftedDate = new Date(currentMs + diffMs);
      
      const year = shiftedDate.getFullYear();
      const month = String(shiftedDate.getMonth() + 1).padStart(2, '0');
      const day = String(shiftedDate.getDate()).padStart(2, '0');
      const hours = String(shiftedDate.getHours()).padStart(2, '0');
      const mins = String(shiftedDate.getMinutes()).padStart(2, '0');
      const formattedIso = `${year}-${month}-${day}T${hours}:${mins}`;
      
      newCustoms[idx] = formattedIso;
    }

    setCustomGroupSchedules(newCustoms);
    setDraftGroupSchedules({});
    setPendingGroupTimeChange(null);
  };
  const [customGroupSchedules, setCustomGroupSchedules] = useState({});
  const [tournamentFormat, setTournamentFormat] = useState("single");
  const [stageFormatPreset, setStageFormatPreset] = useState("multi");
  const [prizeDistribution, setPrizeDistribution] = useState({
    first: 0,
    second: 0,
    third: 0,
    top_kill: 0
  });

  const handleFormatSwitch = (mode) => {
    setTournamentFormat(mode);
    if (mode === "single") {
      setFormData(prev => ({
        ...prev,
        max_teams: 12,
        stages: [{ name: "Final Match", matches_count: 1 }]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        max_teams: prev.max_teams && prev.max_teams > 0 && prev.max_teams % 12 === 0 ? prev.max_teams : 24,
        stages: [
          { name: "Qualifiers", matches_count: 1 },
          { name: "Semifinals", matches_count: 1 },
          { name: "Grand Final", matches_count: 3 }
        ]
      }));
    }
  };

  const setPresetFormat = (presetType) => {
    setStageFormatPreset(presetType);
    if (presetType === "single") {
      setFormData(prev => ({
        ...prev,
        stages: [{ name: "Final Match", matches_count: 1 }]
      }));
    } else if (presetType === "multi") {
      setFormData(prev => ({
        ...prev,
        stages: [
          { name: "Qualifiers", matches_count: 1 },
          { name: "Semifinals", matches_count: 1 },
          { name: "Grand Final", matches_count: 3 }
        ]
      }));
    }
  };

  const handlePrizePoolChange = (poolVal) => {
    setFormData(prev => ({ ...prev, prize_pool: poolVal }));
    setPrizeDistribution({
      first: Math.round(poolVal * 0.5),
      second: Math.round(poolVal * 0.3),
      third: Math.round(poolVal * 0.2),
      top_kill: 0
    });
  };

  const totalGroups = formData.max_teams > 0 ? Math.ceil(formData.max_teams / 12) : 0;

  const getGroupSchedule = (groupIndex) => {
    if (customGroupSchedules[groupIndex]) {
      return customGroupSchedules[groupIndex];
    }
    if (!formData.date_time) return "";
    const startTime = new Date(formData.date_time);
    if (isNaN(startTime.getTime())) return "";

    const effectiveLimit = dailyMatchesLimit > 0 ? dailyMatchesLimit : totalGroups;
    const dayIndex = Math.floor(groupIndex / Math.max(1, effectiveLimit));
    const indexInDay = groupIndex % Math.max(1, effectiveLimit);
    const waveIndexInDay = Math.floor(indexInDay / Math.max(1, hostsCount));

    const matchDate = new Date(startTime);
    matchDate.setDate(matchDate.getDate() + dayIndex);

    const offsetMins = waveIndexInDay * matchIntervalMins;
    const groupTime = new Date(matchDate.getTime() + offsetMins * 60 * 1000);
    return groupTime.toISOString().slice(0, 16);
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (totalGroups > 0 && formData.date_time) {
      const lastGroupTimeStr = getGroupSchedule(totalGroups - 1);
      if (lastGroupTimeStr) {
        const lastTime = new Date(lastGroupTimeStr);
        if (!isNaN(lastTime.getTime())) {
          const autoEndTime = new Date(lastTime.getTime() + matchIntervalMins * 60 * 1000);
          setFormData(prev => ({ ...prev, end_time: autoEndTime.toISOString().slice(0, 16) }));
        }
      }
    }
  }, [totalGroups, formData.date_time, hostsCount, matchIntervalMins, dailyMatchesLimit, customGroupSchedules]);

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      if (currentUser.role !== "admin") {
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      let finalUrl = "";
      try {
        const res = await UploadFile({ file });
        finalUrl = typeof res === "string" ? res : (res?.file_url || "");
      } catch (err) {
        console.warn("AWS Upload failed, falling back to FileReader DataURL", err);
      }

      if (!finalUrl) {
        finalUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(file);
        });
      }

      setFormData(prev => ({ ...prev, banner_url: finalUrl }));
    } catch (error) {
      console.error("Error uploading banner:", error);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handlePrizeChartUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPrizeChart(true);
    try {
      let finalUrl = "";
      try {
        const res = await UploadFile({ file });
        finalUrl = typeof res === "string" ? res : (res?.file_url || "");
      } catch (err) {
        console.warn("AWS Upload failed, falling back to FileReader DataURL", err);
      }

      if (!finalUrl) {
        finalUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(file);
        });
      }

      setFormData(prev => ({ ...prev, prize_chart_url: finalUrl }));
    } catch (error) {
      console.error("Error uploading prize chart:", error);
    } finally {
      setUploadingPrizeChart(false);
    }
  };

  const validateForm = () => {
    const missing = [];
    if (!formData.title || !formData.title.trim()) missing.push("Tournament Title");
    if (!formData.banner_url) missing.push("Tournament Poster / Banner Image");
    if (!formData.max_teams || formData.max_teams <= 0) missing.push("Max Teams Limit");
    if (tournamentFormat === "multi" && formData.max_teams % 12 !== 0) missing.push("Max Teams (Must be a multiple of 12 for multi-group league)");
    if (!formData.date_time) missing.push("Match Start Date & Time");
    if (!formData.registration_closes) missing.push("Registration Closes Date & Time");

    if (formData.date_time && formData.registration_closes) {
      const matchTime = new Date(formData.date_time).getTime();
      const regCloseTime = new Date(formData.registration_closes).getTime();
      if (!isNaN(matchTime) && !isNaN(regCloseTime) && regCloseTime >= matchTime) {
        missing.push("Registration Closes time MUST be BEFORE Match Start Time!");
      }
    }

    return missing;
  };

  const handleReview = (e) => {
    e.preventDefault();
    const missingFields = validateForm();
    if (missingFields.length > 0) {
      alert(`⚠️ Cannot Publish Tournament!\n\nPlease fill in all required details before publishing:\n\n• ${missingFields.join("\n• ")}`);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const groupSchedulesArray = Array.from({ length: totalGroups }, (_, i) => {
        const hIdx = i % Math.max(1, hostsCount);
        const hName = hostNames[hIdx] || `Host ${hIdx + 1}`;
        return {
          group_index: i,
          group_name: `Group ${i + 1}`,
          assigned_host: hIdx + 1,
          assigned_host_name: hName,
          date_time: getGroupSchedule(i)
        };
      });

      await Tournament.create({
        ...formData,
        registration_closes: formData.registration_closes,
        registration_close_time: formData.registration_closes,
        prize_image_url: formData.prize_chart_url || "",
        hosts_count: hostsCount,
        host_names: hostNames,
        match_interval_mins: matchIntervalMins,
        daily_matches_limit: dailyMatchesLimit,
        total_groups: totalGroups,
        group_schedules: groupSchedulesArray,
        prize_distribution: prizeDistribution,
        organizer_id: user.id,
        organizer_name: user.ign || user.full_name,
        current_teams: 0,
        status: "Registration Open"
      });
      navigate(createPageUrl("Tournaments"));
    } catch (error) {
      console.error("Error creating tournament:", error);
    }
    setSubmitting(false);
  };

  const addStage = () => {
    if (formData.stages.length >= 10) return;
    setFormData({
      ...formData,
      stages: [...formData.stages, { name: `Stage ${formData.stages.length + 1}`, matches_count: 1 }]
    });
  };

  const updateStage = (index, field, value) => {
    const updated = [...formData.stages];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, stages: updated });
  };

  const removeStage = (index) => {
    const updated = formData.stages.filter((_, i) => i !== index);
    setFormData({ ...formData, stages: updated });
  };

  const [selectedFormat, setSelectedFormat] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = selectedFormat === "multi" ? 4 : 3;

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));


  const selectFormatAndProceed = (mode) => {
    setSelectedFormat(mode);
    handleFormatSwitch(mode);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // STEP 1: Format Selection Screen
  if (selectedFormat === null) {
    return (
      <div className="min-h-screen bg-[#050505] p-4 md:p-8 font-sans text-zinc-200">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Top Header */}
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(createPageUrl("Tournaments"))} 
              className="text-zinc-400 hover:text-white bg-[#0f0f0f] border border-white/[0.08] h-10 w-10 rounded-lg shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Create Tournament</h1>
              <p className="text-xs text-zinc-400">Select format to start setup</p>
            </div>
          </div>

          {/* Cards Grid - Small & Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => selectFormatAndProceed("single")}
              className="p-4 rounded-xl bg-[#0f0f0f] border border-white/[0.08] hover:border-indigo-500/60 hover:bg-indigo-500/10 text-left transition-all group shadow-lg flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl font-bold shrink-0">
                ⚡
              </div>
              <div>
                <h3 className="font-bold text-base text-white group-hover:text-indigo-300">Single Match</h3>
                <p className="text-xs text-zinc-400 mt-0.5">1 Direct Custom Room match (12 Teams or 2 CS).</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectFormatAndProceed("multi")}
              className="p-4 rounded-xl bg-[#0f0f0f] border border-white/[0.08] hover:border-amber-500/60 hover:bg-amber-500/10 text-left transition-all group shadow-lg flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold shrink-0">
                🏆
              </div>
              <div>
                <h3 className="font-bold text-base text-white group-hover:text-amber-300">Multi-Group League</h3>
                <p className="text-xs text-zinc-400 mt-0.5">48 to 10,000 Teams with parallel hosts & timetables.</p>
              </div>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // STEP 2: Concise Form Fill Screen
  return (
    <div className="min-h-screen bg-[#050505] p-4 md:p-8 pb-28 md:pb-12 font-sans text-zinc-200">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        
        {/* WIZARD HEADER */}
        <div className="mb-6 bg-[#0f0f0f] border border-white/[0.08] p-4 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => { if (currentStep > 1) prevStep(); else setSelectedFormat(null); }} className="text-zinc-400 hover:text-white bg-black/50 border border-white/[0.08] shrink-0 h-10 w-10 rounded-xl hover:bg-white/10 transition-all">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {selectedFormat === "single" ? "Create Single Match" : "Create League"}
                </h1>
                <p className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wider mt-0.5">Step {currentStep} of {totalSteps}</p>
              </div>
            </div>
            <div className="hidden sm:flex gap-2">
              {['Basic Info', 'Structure', 'Schedule', 'Rules'].slice(0, totalSteps).map((lbl, i) => (
                <div key={i} className={"text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider transition-all " + (currentStep === i + 1 ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-zinc-600")}>
                  {lbl}
                </div>
              ))}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={"h-1.5 flex-1 rounded-full transition-all duration-500 " + (currentStep >= i + 1 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/5')} />
            ))}
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") e.preventDefault(); }} className="space-y-6">
          
          {currentStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-6">
                 {/* Basic Info */}
            <Card className="bg-[#0f0f0f] border-white/[0.08] shadow-2xl shadow-black/50">
              <CardHeader className="border-b border-white/[0.08] pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-zinc-100">
                  <Target className="w-5 h-5 text-indigo-400" /> General Info
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                <div className="space-y-2">
                  <Label className="text-zinc-300 font-semibold">Title</Label>
                  <Input 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="bg-black/50 border-white/[0.1] text-zinc-100 h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 hover:bg-black/80 transition-colors text-lg focus-visible:ring-indigo-500" 
                    placeholder="e.g. BattleHub Pro League Season 1" required 
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs font-semibold uppercase">Mode</Label>
                    <Select value={formData.mode} onValueChange={v => setFormData({...formData, mode: v})}>
                      <SelectTrigger className="bg-black/50 border-white/[0.1] text-zinc-200 h-12 rounded-xl hover:bg-black/80 transition-colors"><SelectValue/></SelectTrigger>
                      <SelectContent className="bg-[#0f0f0f] border-white/[0.08] text-zinc-200">
                        <SelectItem value="Solo">Solo</SelectItem>
                        <SelectItem value="Duo">Duo</SelectItem>
                        <SelectItem value="Squad">Squad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs font-semibold uppercase">Map</Label>
                    <Select value={formData.map} onValueChange={v => setFormData({...formData, map: v})}>
                      <SelectTrigger className="bg-black/50 border-white/[0.1] text-zinc-200 h-12 rounded-xl hover:bg-black/80 transition-colors"><SelectValue/></SelectTrigger>
                      <SelectContent className="bg-[#0f0f0f] border-white/[0.08] text-zinc-200">
                        <SelectItem value="Bermuda">Bermuda</SelectItem>
                        <SelectItem value="Purgatory">Purgatory</SelectItem>
                        <SelectItem value="Kalahari">Kalahari</SelectItem>
                        <SelectItem value="Nexterra">Nexterra</SelectItem>
                        <SelectItem value="Alpine">Alpine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
              </div>
              </CardContent>
            </Card>
              </div>
              <div className="space-y-6">
                 {/* Banner Section */}
            <Card className="bg-[#0f0f0f] border-white/[0.08] shadow-2xl shadow-black/50 overflow-hidden">
              <CardContent className="p-6">
                {formData.banner_url ? (
                  <div className="relative group rounded-xl overflow-hidden bg-[#050505] aspect-video flex items-center justify-center border border-white/[0.08]">
                    <img src={formData.banner_url} alt="Banner" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, banner_url: "" }))} className="absolute top-3 right-3 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-lg backdrop-blur-sm transition-all shadow-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer group flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-700 hover:border-indigo-500/50 bg-[#0f0f0f]/50 hover:bg-indigo-500/5 rounded-xl transition-all">
                    <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" disabled={uploadingBanner} />
                    {uploadingBanner ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    ) : (
                      <>
                        <div className="w-14 h-14 bg-slate-800 group-hover:bg-indigo-500/20 rounded-full flex items-center justify-center mb-3 transition-colors">
                          <ImageIcon className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400" />
                        </div>
                        <p className="font-semibold text-zinc-300">Upload Poster</p>
                        <p className="text-xs text-zinc-500 mt-1">16:9 Ratio (JPG, PNG)</p>
                      </>
                    )}
                  </label>
                )}
              </CardContent>
            </Card>
              </div>
            </div>
          )}

          {currentStep === 2 && selectedFormat === "multi" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="lg:col-span-2 space-y-6">
                 
            <Card className="bg-[#0f0f0f] border-white/[0.08] shadow-2xl shadow-black/50">
              <CardHeader className="border-b border-white/[0.08] pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-zinc-100">
                  <Target className="w-5 h-5 text-indigo-400" /> Tournament Capacity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs font-semibold uppercase flex items-center">
                      <span>Max Teams</span>
                      <InfoTooltip text={tournamentFormat === "single" ? "Maximum capacity for 1 Single Direct Room (Capped at Max 12 Teams)." : "Total capacity of participating teams. For Esports leagues, select multiples of 12 (e.g. 48, 96, 240) to form balanced 12-team lobbies."} />
                    </Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max={tournamentFormat === "single" ? 12 : 10000}
                      value={formData.max_teams || ''} 
                      onChange={e => {
                        const rawVal = parseInt(e.target.value) || 0;
                        const upperCap = tournamentFormat === "single" ? 12 : 10000;
                        const val = Math.min(rawVal, upperCap);
                        setFormData({...formData, max_teams: val});
                      }} 
                      className="bg-black/50 border-white/[0.1] text-zinc-100 h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 hover:bg-black/80 transition-colors focus-visible:ring-indigo-500 font-semibold" 
                      placeholder={tournamentFormat === "single" ? "Max 12 Teams" : "e.g. 12, 24, 48... (Max 10,000)"}
                    />

                    {/* Single Match Preset Chips */}
                    {tournamentFormat === "single" && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, max_teams: 12 })}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                            formData.max_teams === 12
                              ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/50"
                              : "bg-black/40 text-zinc-400 border-white/10 hover:text-white"
                          }`}
                        >
                          ⚡ 12 Teams (Full BR Room)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, max_teams: 2 })}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                            formData.max_teams === 2
                              ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/50"
                              : "bg-black/40 text-zinc-400 border-white/10 hover:text-white"
                          }`}
                        >
                          ⚔️ 2 Teams (Clash Squad 4v4)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, max_teams: 8 })}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                            formData.max_teams === 8
                              ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/50"
                              : "bg-black/40 text-zinc-400 border-white/10 hover:text-white"
                          }`}
                        >
                          👥 8 Teams (Mini Room)
                        </button>
                      </div>
                    )}

                    {/* Exceeds Max Limit Warning for Multi Mode */}
                    {tournamentFormat === "multi" && formData.max_teams > 9996 && (
                      <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-200 space-y-2">
                        <p className="font-medium text-red-300">
                          ⚠️ Maximum capacity is capped at 10,000 teams. Highest valid 12-slot capacity is <strong>9,996</strong> teams.
                        </p>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, max_teams: 9996})}
                          className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-100 border border-red-500/40 rounded-md font-semibold transition-all text-xs"
                        >
                          Set to Maximum 9,996 Teams (833 Groups)
                        </button>
                      </div>
                    )}

                    {/* Invalid Multiple Warning & Auto-Fix Buttons for Multi Mode */}
                    {tournamentFormat === "multi" && formData.max_teams > 0 && formData.max_teams <= 9996 && formData.max_teams % 12 !== 0 && (
                      <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 space-y-2">
                        <p className="font-medium text-amber-300">
                          ⚠️ <span className="font-bold text-amber-400">{formData.max_teams}</span> teams is not a multiple of 12. Select a recommended capacity for optimal lobby slotting:
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {Math.floor(formData.max_teams / 12) * 12 > 0 && (
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, max_teams: Math.floor(formData.max_teams / 12) * 12})}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-100 border border-amber-500/40 rounded-md font-semibold transition-all text-xs"
                            >
                              Adjust to {Math.floor(formData.max_teams / 12) * 12} ({Math.floor(formData.max_teams / 12)} {Math.floor(formData.max_teams / 12) === 1 ? 'Group' : 'Groups'})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, max_teams: Math.min(9996, Math.ceil(formData.max_teams / 12) * 12)})}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-100 border border-amber-500/40 rounded-md font-semibold transition-all text-xs"
                          >
                            Adjust to {Math.min(9996, Math.ceil(formData.max_teams / 12) * 12)} ({Math.floor(Math.min(9996, Math.ceil(formData.max_teams / 12) * 12) / 12)} Groups)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Valid Multiple Badge & Total Groups Counter */}
                    {tournamentFormat === "multi" && formData.max_teams > 0 && formData.max_teams <= 9996 && formData.max_teams % 12 === 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                          ✓ {formData.max_teams} Teams allocated across {totalGroups} {totalGroups === 1 ? 'full group' : 'full groups'}.
                        </p>
                        <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold bg-indigo-500/10 px-3 py-1.5 rounded-md border border-indigo-500/20 mt-1">
                          <span>Total Groups Generated:</span>
                          <span className="font-bold text-indigo-400">{totalGroups} {totalGroups === 1 ? 'Group' : 'Groups'} (12 Teams / Group)</span>
                        </div>
                      </div>
                    )}
                  </div>
              
              </CardContent>
            </Card>
    
                 {/* Stages / Structure (Only shown for Multi-Group Esports League) */}
            
              <Card className="bg-[#0f0f0f] border-white/[0.08] shadow-2xl shadow-black/50">
                <CardHeader className="border-b border-white/[0.08] pb-4 flex flex-row items-center justify-between bg-slate-800/20">
                  <CardTitle className="text-lg flex items-center gap-2 text-zinc-100">
                    <LayoutList className="w-5 h-5 text-indigo-400" /> Stages & Structure
                  </CardTitle>
                  <Button type="button" onClick={addStage} variant="outline" size="sm" className="h-8 bg-indigo-500/10 border-indigo-500/50 text-indigo-300 hover:text-white hover:bg-indigo-500/30">
                    <Plus className="w-3.5 h-3.5 mr-1"/> Add Stage
                  </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">

                  <div className="space-y-3">
                    {formData.stages.map((stage, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-[#050505] border border-white/[0.08] p-3 rounded-lg">
                        <span className="text-indigo-400 font-bold text-sm w-7 shrink-0 text-center">
                          {idx + 1}.
                        </span>
                        
                        <div className="flex-1 min-w-[120px]">
                          <Input 
                            value={stage.name} 
                            onChange={e => updateStage(idx, "name", e.target.value)}
                            placeholder="Stage Name (e.g. Qualifiers)" 
                            className="bg-[#0f0f0f] border-slate-700 text-white text-sm h-10 focus-visible:ring-indigo-500 placeholder:text-zinc-500" 
                          />
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0 bg-[#0f0f0f] px-3 py-1.5 rounded-lg border border-white/[0.08]">
                          <span className="text-xs font-semibold text-zinc-300">No. of Matches:</span>
                          <input 
                            type="number" min="1" max="99" value={stage.matches_count}
                            onChange={e => updateStage(idx, "matches_count", parseInt(e.target.value)||1)}
                            className="w-10 bg-[#050505] border border-slate-700 rounded text-amber-400 font-bold text-sm text-center py-1 outline-none focus:border-amber-400"
                          />
                        </div>

                        {formData.stages.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStage(idx)} 
                            className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/20 shrink-0"
                            title="Remove Stage"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
               </div>
               <div className="lg:col-span-3 space-y-6">
                 
               {/* AUTO CALCULATOR PREVIEW */}
               {formData.max_teams > 0 && formData.stages.length > 0 && (
                  <Card className="bg-[#0f0f0f] border-indigo-500/30 shadow-2xl">
                    <CardHeader className="border-b border-indigo-500/20 pb-2.5 pt-3 bg-indigo-500/5">
                      <CardTitle className="text-sm flex items-center gap-2 text-indigo-300 font-bold">
                        <Trophy className="w-4 h-4 text-indigo-400" /> Math Flow Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2">
                      {calculateTournamentStructure(formData.max_teams, formData.stages.length, formData.stages)?.map((rule, i) => (
                        <div key={i} className="flex items-center gap-3 bg-[#050505] border border-white/5 p-2 rounded-lg">
                           <div className="flex flex-col min-w-[90px]">
                              <span className="text-[10px] text-indigo-400 font-bold uppercase truncate">{rule.name}</span>
                              <span className="text-sm font-black text-white">{rule.incomingTeams} <span className="text-[9px] text-zinc-500 font-medium">Teams</span></span>
                              <span className="text-[10px] text-zinc-400 font-semibold mt-0.5">{rule.groups} {rule.groups===1?'Lobby':'Lobbies'}</span>
                           </div>
                           
                           {!rule.isFinal && (
                             <div className="flex-1 flex items-center">
                                <div className="h-px bg-white/10 flex-1"></div>
                                <div className="bg-[#121212] border border-indigo-500/30 px-2.5 py-1 rounded-md flex flex-col items-center mx-2 shrink-0">
                                   <span className="text-[11px] font-bold text-emerald-400">Top {rule.topN}</span>
                                   {rule.wildcards > 0 && <span className="text-[9px] text-amber-400 font-bold">+{rule.wildcards} WC</span>}
                                   {rule.wildcards === 0 && <span className="text-[9px] text-zinc-500 font-medium">Top {rule.topN} Only</span>}
                                </div>
                                <div className="h-px bg-indigo-500/50 flex-1"></div>
                             </div>
                           )}
                           
                           {rule.isFinal && (
                             <div className="flex-1 flex items-center">
                               <div className="h-px bg-white/10 flex-1"></div>
                               <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-md text-[11px] font-bold mx-2">
                                 <Trophy className="w-3.5 h-3.5"/> Final
                               </div>
                               <div className="h-px bg-amber-500/50 flex-1"></div>
                             </div>
                           )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
               )}
    
               </div>
            </div>
          )}
          
          {currentStep === (selectedFormat === "multi" ? 3 : 2) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="space-y-6">
                 {/* Schedule & Grouping Operations */}
            <Card className="bg-[#0f0f0f] border-white/[0.08] shadow-2xl shadow-black/50">
              <CardHeader className="border-b border-white/[0.08] pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-zinc-100">
                  <Calendar className="w-5 h-5 text-indigo-400" /> {tournamentFormat === "single" ? "Match Schedule" : "Schedule & Grouping Operations"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase flex items-center">
                    <span>{tournamentFormat === "single" ? "Match Start Time" : "Daily Match Start Time"}</span>
                    <InfoTooltip text="The official kick-off time for the first group match of each operational day." />
                  </Label>
                  <Input 
                    type="datetime-local" value={formData.date_time} 
                    onChange={e => {
                      const newDateTime = e.target.value;
                      setFormData(prev => {
                        let updatedRegCloses = prev.registration_closes;
                        if (newDateTime) {
                          const matchDate = new Date(newDateTime);
                          if (!isNaN(matchDate.getTime())) {
                            const regDate = new Date(prev.registration_closes);
                            if (!prev.registration_closes || isNaN(regDate.getTime()) || regDate >= matchDate) {
                              const autoRegClose = new Date(matchDate.getTime() - 30 * 60 * 1000);
                              updatedRegCloses = autoRegClose.toISOString().slice(0, 16);
                            }
                          }
                        }
                        return { ...prev, date_time: newDateTime, registration_closes: updatedRegCloses };
                      });
                    }}
                    onClick={e => e.target.showPicker && e.target.showPicker()}
                    className="bg-black/50 border-white/[0.1] text-zinc-100 h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 hover:bg-black/80 transition-colors focus-visible:ring-indigo-500 cursor-pointer [color-scheme:dark]" required 
                  />
                </div>

                {/* Multi-Group Advanced Scheduling Controls */}
                
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-400 text-xs font-semibold uppercase flex items-center">
                          <span>Daily Matches Limit</span>
                          <InfoTooltip text="Maximum number of group matches scheduled per day. Choose a preset or switch to Custom to type any number." />
                        </Label>
                        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/[0.08]">
                          <button
                            type="button"
                            onClick={() => setIsCustomDailyLimit(false)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                              !isCustomDailyLimit
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            Presets
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCustomDailyLimit(true)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                              isCustomDailyLimit
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            ✏️ Custom
                          </button>
                        </div>
                      </div>

                      {isCustomDailyLimit ? (
                        <div className="relative">
                          <Input 
                            type="number" min="1" max="999"
                            value={dailyMatchesLimit || ''}
                            onChange={e => setDailyMatchesLimit(parseInt(e.target.value) || 0)}
                            placeholder="Type custom limit (e.g. 3, 5, 7, 15 groups/day)"
                            className="bg-black/50 border-indigo-500/50 text-zinc-100 h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500/50 hover:bg-black/80 transition-colors font-semibold pr-28"
                            autoFocus
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-400 font-semibold pointer-events-none">
                            {dailyMatchesLimit > 0 ? `${dailyMatchesLimit} / day` : 'Custom'}
                          </span>
                        </div>
                      ) : (
                        <Select 
                          value={presetDailyLimits.includes(dailyMatchesLimit) ? String(dailyMatchesLimit) : "custom"} 
                          onValueChange={val => {
                            if (val === "custom") {
                              setIsCustomDailyLimit(true);
                            } else {
                              setIsCustomDailyLimit(false);
                              setDailyMatchesLimit(parseInt(val) || 0);
                            }
                          }}
                        >
                          <SelectTrigger className="bg-black/50 border-white/[0.1] text-zinc-200 h-12 rounded-xl font-medium w-full">
                            <SelectValue placeholder="Select daily matches limit"/>
                          </SelectTrigger>
                          <SelectContent className="bg-[#121212] border-white/[0.1] text-zinc-200">
                            <SelectItem value="2">2 Groups per Day</SelectItem>
                            <SelectItem value="4">4 Groups per Day</SelectItem>
                            <SelectItem value="5">5 Groups per Day</SelectItem>
                            <SelectItem value="6">6 Groups per Day</SelectItem>
                            <SelectItem value="8">8 Groups per Day</SelectItem>
                            <SelectItem value="10">10 Groups per Day</SelectItem>
                            <SelectItem value="12">12 Groups per Day</SelectItem>
                            <SelectItem value="16">16 Groups per Day</SelectItem>
                            <SelectItem value="20">20 Groups per Day</SelectItem>
                            <SelectItem value="0">All Groups in 1 Day (No Limit)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs font-semibold uppercase flex items-center">
                          <span>Parallel Hosts</span>
                          <InfoTooltip text="Number of room hosts running matches simultaneously in parallel (1 to 10 hosts)." />
                        </Label>
                        <Select value={String(hostsCount)} onValueChange={v => setHostsCount(parseInt(v) || 1)}>
                          <SelectTrigger className="bg-black/50 border-white/[0.1] text-zinc-200 h-12 rounded-xl hover:bg-black/80 transition-colors"><SelectValue/></SelectTrigger>
                          <SelectContent className="bg-[#0f0f0f] border-white/[0.08] text-zinc-200">
                            <SelectItem value="1">1 Host (Default)</SelectItem>
                            <SelectItem value="2">2 Parallel Hosts</SelectItem>
                            <SelectItem value="3">3 Parallel Hosts</SelectItem>
                            <SelectItem value="4">4 Parallel Hosts</SelectItem>
                            <SelectItem value="5">5 Parallel Hosts</SelectItem>
                            <SelectItem value="6">6 Parallel Hosts</SelectItem>
                            <SelectItem value="7">7 Parallel Hosts</SelectItem>
                            <SelectItem value="8">8 Parallel Hosts</SelectItem>
                            <SelectItem value="9">9 Parallel Hosts</SelectItem>
                            <SelectItem value="10">10 Parallel Hosts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs font-semibold uppercase flex items-center">
                          <span>Match Gap (Mins)</span>
                          <InfoTooltip text="Allocated duration per match wave including room creation, player lobby joining, and gameplay." />
                        </Label>
                        <Input 
                          type="number" min="5" max="180"
                          value={matchIntervalMins || ''} 
                          onChange={e => setMatchIntervalMins(parseInt(e.target.value) || 0)}
                          placeholder="e.g. 35 Mins"
                          className="bg-black/50 border-white/[0.1] text-zinc-100 h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 hover:bg-black/80 transition-colors font-semibold focus-visible:ring-indigo-500" required 
                        />
                      </div>
                    </div>

                    {/* Host Names Inputs */}
                    <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                      <Label className="text-zinc-400 text-xs font-semibold uppercase flex items-center">
                        <span>Host / Admin Names</span>
                        <InfoTooltip text="Custom display names for assigned room hosts (e.g. Rahul Admin, Aman Caster) rendered on group timetables." />
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Array.from({ length: hostsCount }).map((_, hIdx) => (
                          <div key={hIdx} className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-indigo-400 w-12 shrink-0">Host #{hIdx + 1}:</span>
                            <Input 
                              value={hostNames[hIdx] ?? `Host ${hIdx + 1}`}
                              onChange={e => setHostNames({ ...hostNames, [hIdx]: e.target.value })}
                              placeholder={`e.g. Host Name`}
                              className="bg-[#050505] border-white/[0.08] text-xs h-9 text-zinc-100 focus-visible:ring-indigo-500 font-medium"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>


                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase flex items-center justify-between">
                    <span>Overall End Time</span>
                    {tournamentFormat === "multi" && <span className="text-[10px] text-indigo-400 font-normal lowercase">(Auto-calculated)</span>}
                  </Label>
                  <Input 
                    type="datetime-local" value={formData.end_time} 
                    onChange={e => setFormData({...formData, end_time: e.target.value})}
                    onClick={e => e.target.showPicker && e.target.showPicker()}
                    className="bg-black/50 border-white/[0.1] text-zinc-100 h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 hover:bg-black/80 transition-colors focus-visible:ring-indigo-500 cursor-pointer [color-scheme:dark]" required 
                  />
                </div>
                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <Label className="text-orange-400/80 text-xs font-semibold uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Registration Closes</span>
                    <span className="text-[10px] text-zinc-500 font-normal lowercase">(Must be before match start)</span>
                  </Label>
                  <Input 
                    type="datetime-local" value={formData.registration_closes} 
                    max={formData.date_time ? formData.date_time : undefined}
                    onChange={e => setFormData(prev => ({ ...prev, registration_closes: e.target.value }))}
                    onClick={e => e.target.showPicker && e.target.showPicker()}
                    className="bg-[#050505] border-orange-500/30 focus-visible:ring-orange-500/50 text-zinc-100 h-11 cursor-pointer [color-scheme:dark]" required 
                  />
                  {formData.date_time && formData.registration_closes && new Date(formData.registration_closes) >= new Date(formData.date_time) && (
                    <p className="text-[11px] font-bold text-red-400 flex items-center gap-1 mt-1">
                      ⚠️ Registration Closes time MUST be BEFORE Match Start Time!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
               </div>
               <div className="space-y-6">
                 {/* Live Group Timetable Preview & Editor (Only for Multi mode) */}
            
              <Card className="bg-[#0f0f0f] border-white/[0.08] shadow-2xl shadow-black/50 overflow-hidden">
                <CardHeader className="border-b border-white/[0.08] pb-3 flex flex-row items-center justify-between bg-slate-800/20">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-100">
                    <Clock className="w-4 h-4 text-indigo-400" /> Timetable ({totalGroups} Groups)
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {totalGroups > GROUPS_PER_PAGE && (
                      <input
                        type="text"
                        placeholder="Find Group #..."
                        value={groupSearchQuery}
                        onChange={e => {
                          setGroupSearchQuery(e.target.value);
                          setGroupPage(1);
                        }}
                        className="bg-black/50 border border-white/10 rounded px-2 py-0.5 text-zinc-200 text-[10px] w-24 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                    <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {hostsCount} {hostsCount === 1 ? 'Host' : 'Parallel Hosts'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {(() => {
                    const allIndices = Array.from({ length: totalGroups }, (_, i) => i);
                    const q = groupSearchQuery.trim().replace(/^group\s*/i, '');
                    const filteredIndices = q 
                      ? allIndices.filter(i => String(i + 1).includes(q))
                      : allIndices;
                    
                    const totalFilteredPages = Math.max(1, Math.ceil(filteredIndices.length / GROUPS_PER_PAGE));
                    const safePage = Math.min(groupPage, totalFilteredPages);
                    const startIdx = (safePage - 1) * GROUPS_PER_PAGE;
                    const pageIndices = filteredIndices.slice(startIdx, startIdx + GROUPS_PER_PAGE);

                    return (
                      <>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {pageIndices.map(idx => {
                            const timeVal = draftGroupSchedules[idx] ?? getGroupSchedule(idx);
                            const hostIdx = idx % Math.max(1, hostsCount);
                            const hostDisplayName = hostNames[hostIdx] || `Host ${hostIdx + 1}`;
                            const groupName = `Group ${idx + 1}`;
                            const effectiveLimit = dailyMatchesLimit > 0 ? dailyMatchesLimit : totalGroups;
                            const dayNum = Math.floor(idx / Math.max(1, effectiveLimit)) + 1;

                            return (
                              <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-[#050505] p-2.5 rounded-lg border border-white/[0.08] text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                                    {groupName}
                                  </span>
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
                                    Day {dayNum}
                                  </span>
                                  <span className="text-[10px] text-zinc-300 bg-[#0f0f0f] px-2 py-0.5 rounded border border-white/[0.08] font-medium">
                                    🎙️ {hostDisplayName}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                  <input 
                                    type="datetime-local" 
                                    value={timeVal}
                                    onChange={e => setDraftGroupSchedules({ ...draftGroupSchedules, [idx]: e.target.value })}
                                    onBlur={() => handleGroupTimeBlur(idx)}
                                    onClick={e => e.target.showPicker && e.target.showPicker()}
                                    className="bg-[#0f0f0f] border border-slate-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
                                  />
                                </div>
                              </div>
                            );
                          })}
                          {pageIndices.length === 0 && (
                            <div className="text-center py-6 text-xs text-zinc-500">
                              No groups match your search
                            </div>
                          )}
                        </div>

                        {totalFilteredPages > 1 && (
                          <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] px-2.5 py-1.5 rounded text-[11px] text-zinc-400 mt-2">
                            <span>Showing {startIdx + 1} - {Math.min(startIdx + GROUPS_PER_PAGE, filteredIndices.length)} of {filteredIndices.length} groups</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={safePage <= 1}
                                onClick={() => setGroupPage(p => Math.max(1, p - 1))}
                                className="px-2.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-zinc-200 text-xs"
                              >
                                Prev
                              </button>
                              <span className="text-xs font-semibold text-zinc-300">{safePage} / {totalFilteredPages}</span>
                              <button
                                type="button"
                                disabled={safePage >= totalFilteredPages}
                                onClick={() => setGroupPage(p => Math.min(totalFilteredPages, p + 1))}
                                className="px-2.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-zinc-200 text-xs"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
               </div>
            </div>
          )}

          {currentStep === (selectedFormat === "multi" ? 4 : 3) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="space-y-6">
                 {/* Financials */}
            <Card className="bg-[#0f0f0f] border-white/[0.08] shadow-2xl shadow-black/50">
              <CardHeader className="border-b border-white/[0.08] pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-zinc-100">
                  <DollarSign className="w-5 h-5 text-emerald-400" /> Financials & Prize
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Total Prize Pool (₹)</Label>
                  <Input 
                    type="number" min="0" value={formData.prize_pool} 
                    onChange={e => handlePrizePoolChange(parseFloat(e.target.value)||0)}
                    className="bg-[#050505] border-white/[0.08] text-white h-11 font-semibold focus-visible:ring-emerald-500" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Entry Fee (Coins)</Label>
                  <Input 
                    type="number" min="0" value={formData.entry_fee} 
                    onChange={e => setFormData({...formData, entry_fee: parseFloat(e.target.value)||0})}
                    className="bg-[#050505] border-white/[0.08] text-white h-11 font-semibold focus-visible:ring-amber-500" 
                  />
                </div>

                {/* Prize Distribution Breakdown */}
                <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Prize Distribution (₹)</Label>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-amber-400 font-bold text-[11px]">🥇 1st Place</span>
                      <Input 
                        type="number" min="0" 
                        value={prizeDistribution.first} 
                        onChange={e => setPrizeDistribution({...prizeDistribution, first: parseFloat(e.target.value)||0})}
                        className="bg-[#050505] border-white/[0.08] text-white h-9 font-semibold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-300 font-bold text-[11px]">🥈 2nd Place</span>
                      <Input 
                        type="number" min="0" 
                        value={prizeDistribution.second} 
                        onChange={e => setPrizeDistribution({...prizeDistribution, second: parseFloat(e.target.value)||0})}
                        className="bg-[#050505] border-white/[0.08] text-white h-9 font-semibold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-amber-600 font-bold text-[11px]">🥉 3rd Place</span>
                      <Input 
                        type="number" min="0" 
                        value={prizeDistribution.third} 
                        onChange={e => setPrizeDistribution({...prizeDistribution, third: parseFloat(e.target.value)||0})}
                        className="bg-[#050505] border-white/[0.08] text-white h-9 font-semibold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-indigo-400 font-bold text-[11px]">🎯 Top Kill / MVP</span>
                      <Input 
                        type="number" min="0" 
                        value={prizeDistribution.top_kill} 
                        onChange={e => setPrizeDistribution({...prizeDistribution, top_kill: parseFloat(e.target.value)||0})}
                        className="bg-[#050505] border-white/[0.08] text-white h-9 font-semibold text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Prize Breakdown Image / Chart Upload (Simple & Clean) */}
                <div className="space-y-2 pt-3 border-t border-white/[0.08]">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Prize Chart Image (Optional)</Label>
                  {formData.prize_chart_url ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black group">
                      <img src={formData.prize_chart_url} alt="Prize Chart" className="w-full h-36 object-contain bg-black/60 p-1" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, prize_chart_url: "" }))}
                        className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-500 text-white rounded-lg transition-all shadow"
                        title="Remove Image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-3 bg-[#0a0a0a] border border-dashed border-white/10 hover:border-zinc-500 rounded-xl cursor-pointer transition-all text-xs text-zinc-400 hover:text-zinc-200">
                      {uploadingPrizeChart ? (
                        <span className="text-zinc-400 font-medium animate-pulse">Uploading Chart...</span>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 text-zinc-400" />
                          <span className="font-medium">Upload Prize Chart Image</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handlePrizeChartUpload} className="hidden" disabled={uploadingPrizeChart} />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
               </div>
               <div className="space-y-6">
                 {/* Rules */}
            <Card className="bg-[#0f0f0f] border-white/[0.08] shadow-2xl shadow-black/50">
              <CardHeader className="border-b border-white/[0.08] pb-4">
                <CardTitle className="text-lg text-zinc-100">Rules</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Textarea 
                  value={formData.rules} 
                  onChange={e => setFormData({...formData, rules: e.target.value})}
                  className="bg-[#050505] border-white/[0.08] text-zinc-300 min-h-[250px] font-mono text-sm leading-relaxed focus-visible:ring-indigo-500"
                />
              </CardContent>
            </Card>
               </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-white/[0.08] mt-8">
             {currentStep > 1 ? (
               <Button type="button" onClick={prevStep} variant="ghost" className="text-zinc-300 hover:text-white bg-[#0f0f0f] border border-white/10 h-12 px-6 rounded-xl font-bold cursor-pointer">
                 Back
               </Button>
             ) : <div></div>}
             
             {currentStep < totalSteps ? (
               <Button type="button" onClick={nextStep} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-10 rounded-xl shadow-lg shadow-indigo-600/30 text-base cursor-pointer">
                 Next Step
               </Button>
             ) : (
               <Button type="button" onClick={handleReview} disabled={submitting || uploadingBanner} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-10 rounded-xl shadow-lg shadow-emerald-600/30 text-base cursor-pointer">
                 {submitting ? "Publishing..." : "Launch Tournament 🚀"}
               </Button>
             )}
          </div>
        </form>
    

        {/* Interactive Time Change Shift Modal Popup */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}></div>
          <div className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-indigo-900/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ready to Launch?</h3>
              <p className="text-sm text-zinc-400">
                You are about to publish <strong>{formData.title || "this tournament"}</strong>. 
                Once published, it will be visible to all players and registrations will open.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => { setShowConfirmModal(false); handleFinalSubmit(); }}
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 text-base rounded-xl"
              >
                {submitting ? "Publishing..." : "Confirm & Launch 🚀"}
              </Button>
              <Button
                onClick={() => setShowConfirmModal(false)}
                variant="ghost"
                disabled={submitting}
                className="w-full text-zinc-400 hover:text-white h-12 text-base rounded-xl"
              >
                Review Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Time Change Shift Modal Popup */}
        {pendingGroupTimeChange && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" /> Apply Schedule Change
                </h3>
                <button 
                  type="button" 
                  onClick={cancelGroupTimeChange}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <p>
                  You modified the schedule for <strong className="text-indigo-400 font-bold">Group {pendingGroupTimeChange.groupIndex + 1}</strong>:
                </p>
                <div className="p-3 bg-black/50 rounded-xl border border-white/5 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>Original Time:</span>
                    <span>{new Date(pendingGroupTimeChange.oldIsoString).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex justify-between text-indigo-300 font-bold">
                    <span>New Time:</span>
                    <span>{new Date(pendingGroupTimeChange.newIsoString).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-semibold pt-1 border-t border-white/5">
                    <span>Offset Shift:</span>
                    <span>{pendingGroupTimeChange.diffMins >= 0 ? `+${pendingGroupTimeChange.diffMins}` : pendingGroupTimeChange.diffMins} Mins</span>
                  </div>
                </div>
                <p className="text-zinc-400 pt-1 font-medium">How would you like to apply this time adjustment?</p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={applySingleGroupTime}
                  className="w-full p-3 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 rounded-xl text-left transition-all group"
                >
                  <div className="font-bold text-xs text-white group-hover:text-indigo-200">
                    🎯 Edit Only Group {pendingGroupTimeChange.groupIndex + 1}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Only update Group {pendingGroupTimeChange.groupIndex + 1}. All other group schedules stay unchanged.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={applyShiftFollowingGroupTimes}
                  className="w-full p-3 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/40 rounded-xl text-left transition-all group"
                >
                  <div className="font-bold text-xs text-white group-hover:text-amber-200">
                    ⏩ Shift Group {pendingGroupTimeChange.groupIndex + 1} and All Following ({pendingGroupTimeChange.diffMins >= 0 ? `+${pendingGroupTimeChange.diffMins}` : pendingGroupTimeChange.diffMins}m)
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Automatically adjust Group {pendingGroupTimeChange.groupIndex + 1} to Group {totalGroups} by the same time offset.
                  </div>
                </button>
              </div>

              <div className="pt-2 border-t border-white/5 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelGroupTimeChange}
                  className="text-xs text-zinc-400 hover:text-white h-8"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
