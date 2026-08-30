import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Tournament } from "@/entities/Tournament";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, X, Calendar, Trophy, Image as ImageIcon, Shield, Layers, LayoutList, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function TournamentEditor({ tournament, onClose, onSave }) {
  const isMultiFormat = Boolean(
    tournament.total_groups > 1 || 
    tournament.format === "multi" || 
    (tournament.group_schedules && tournament.group_schedules.length > 1) ||
    (tournament.max_teams && tournament.max_teams > 12)
  );

  const getInitialRegClose = (t) => {
    const existing = t.registration_closes || t.registration_close_time;
    if (existing) {
      const parsed = String(existing).substring(0, 16);
      if (parsed) return parsed;
    }
    if (t.date_time) {
      const matchDate = new Date(t.date_time);
      if (!isNaN(matchDate.getTime())) {
        const autoReg = new Date(matchDate.getTime() - 30 * 60 * 1000);
        const year = autoReg.getFullYear();
        const month = String(autoReg.getMonth() + 1).padStart(2, "0");
        const day = String(autoReg.getDate()).padStart(2, "0");
        const hours = String(autoReg.getHours()).padStart(2, "0");
        const mins = String(autoReg.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${mins}`;
      }
    }
    return "";
  };

  const [formData, setFormData] = useState({
    title: tournament.title || "",
    mode: tournament.mode || "Squad",
    map: tournament.map || "Bermuda",
    entry_fee: tournament.entry_fee ?? 0,
    prize_pool: tournament.prize_pool ?? 0,
    date_time: tournament.date_time?.substring(0, 16) || "",
    end_time: tournament.end_time?.substring(0, 16) || "",
    registration_closes: getInitialRegClose(tournament),
    max_teams: tournament.max_teams ?? 12,
    rules: tournament.rules || "",
    room_code: tournament.room_code || "",
    room_password: tournament.room_password || "",
    status: tournament.status || "Registration Open",
    prize_distribution: tournament.prize_distribution || { first: 0, second: 0, third: 0 },
    prize_note: tournament.prize_note || "Prize distribution is subject to official tournament rules.",
    prize_image_url: tournament.prize_image_url || tournament.prize_chart_url || "",
    banner_url: tournament.banner_url || "",
    stages: tournament.stages && tournament.stages.length > 0 
      ? tournament.stages 
      : [{ name: "Qualifiers", matches_count: 1 }, { name: "Semifinals", matches_count: 1 }, { name: "Grand Final", matches_count: 3 }]
  });

  const [hostsCount, setHostsCount] = useState(tournament.hosts_count || 1);
  const [hostNames, setHostNames] = useState(tournament.host_names || { 0: "Host 1" });
  const [matchIntervalMins, setMatchIntervalMins] = useState(tournament.match_interval_mins || 30);
  const [dailyMatchesLimit, setDailyMatchesLimit] = useState(tournament.daily_matches_limit || 8);
  const [customGroupSchedules, setCustomGroupSchedules] = useState(
    Array.isArray(tournament.group_schedules) ? 
      tournament.group_schedules.reduce((acc, gs) => ({ ...acc, [gs.group_index]: gs.date_time }), {}) : {}
  );

  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPrizeChart, setUploadingPrizeChart] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupPage, setGroupPage] = useState(1);
  const GROUPS_PER_PAGE = 30;

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Compute exact 6-digit numeric ID matching the banner (#148775)
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
    return "148775";
  };

  const numericDisplayId = get6DigitId(tournament.id, tournament.created_date || tournament.created_at);

  const totalGroups = Math.max(1, Math.ceil((formData.max_teams || 12) / 12));
  const isMulti = isMultiFormat || totalGroups > 1 || (formData.max_teams && formData.max_teams > 12);
  const tournamentFormat = isMulti ? "multi" : "single";

  const getGroupSchedule = (groupIndex) => {
    if (customGroupSchedules[groupIndex]) return customGroupSchedules[groupIndex];
    if (!formData.date_time) return "";
    const baseDate = new Date(formData.date_time);
    if (isNaN(baseDate.getTime())) return "";

    const parallelHosts = Math.max(1, hostsCount || 1);
    const interval = Math.max(5, matchIntervalMins || 30);
    const daySlot = Math.floor(groupIndex / parallelHosts);
    const dayIndex = Math.floor(daySlot / Math.max(1, dailyMatchesLimit || 8));
    const matchInDay = daySlot % Math.max(1, dailyMatchesLimit || 8);

    const calcDate = new Date(baseDate);
    calcDate.setDate(calcDate.getDate() + dayIndex);
    calcDate.setMinutes(calcDate.getMinutes() + (matchInDay * interval));

    const year = calcDate.getFullYear();
    const month = String(calcDate.getMonth() + 1).padStart(2, "0");
    const day = String(calcDate.getDate()).padStart(2, "0");
    const hours = String(calcDate.getHours()).padStart(2, "0");
    const mins = String(calcDate.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

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
        console.warn("Upload failed, falling back to DataURL", err);
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
        console.warn("Upload failed, falling back to DataURL", err);
      }
      if (!finalUrl) {
        finalUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(file);
        });
      }
      setFormData(prev => ({ ...prev, prize_image_url: finalUrl }));
    } catch (error) {
      console.error("Error uploading prize chart:", error);
    } finally {
      setUploadingPrizeChart(false);
    }
  };

  const addStage = () => {
    if (formData.stages?.length >= 10) return;
    setFormData({
      ...formData,
      stages: [...(formData.stages || []), { name: `Stage ${(formData.stages?.length || 0) + 1}`, matches_count: 1 }]
    });
  };

  const updateStage = (index, field, value) => {
    const updated = [...(formData.stages || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, stages: updated });
  };

  const removeStage = (index) => {
    const updated = (formData.stages || []).filter((_, i) => i !== index);
    setFormData({ ...formData, stages: updated });
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      alert("⚠️ Tournament Title is required");
      return;
    }
    if (formData.date_time && formData.registration_closes) {
      if (new Date(formData.registration_closes) >= new Date(formData.date_time)) {
        alert("⚠️ Registration Closes time MUST be BEFORE Match Start Time!");
        return;
      }
    }

    setSaving(true);
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

      await Tournament.update(tournament.id, {
        ...formData,
        format: tournamentFormat,
        registration_closes: formData.registration_closes,
        registration_close_time: formData.registration_closes,
        prize_image_url: formData.prize_image_url || "",
        hosts_count: hostsCount,
        host_names: hostNames,
        match_interval_mins: matchIntervalMins,
        daily_matches_limit: dailyMatchesLimit,
        total_groups: totalGroups,
        group_schedules: groupSchedulesArray
      });

      alert("✅ Tournament updated successfully!");
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to update tournament:", error);
      alert("Failed to update tournament");
    }
    setSaving(false);
  };

  return createPortal(
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 bg-[#050505] z-[999999] overflow-y-auto p-3 sm:p-6 font-sans text-zinc-200"
    >
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* Compact Low-Profile Header */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="text-zinc-400 hover:text-white bg-[#0f0f0f] border border-white/[0.08] shrink-0 h-8 w-8 rounded-lg cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  Edit Tournament
                </h1>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border shrink-0 ${
                  isMulti
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                }`}>
                  {isMulti ? "🏆 Multi-Group" : "⚡ Single Match"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                ID: #{numericDisplayId} • <span className="font-semibold text-zinc-300">{formData.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Button 
              type="button"
              onClick={onClose} 
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold border border-white/20 px-3.5 h-8 text-xs rounded-lg cursor-pointer shadow-sm"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleSave} 
              disabled={saving || uploadingBanner || uploadingPrizeChart}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 h-8 text-xs rounded-lg shadow-md shadow-indigo-600/30 shrink-0 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Dedicated Form Grid */}
        <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT COLUMN: Main Info & Uploads */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic Info Card */}
            <Card className="bg-[#0f0f11] border-white/10 p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs font-semibold uppercase">Tournament Title</Label>
                <Input 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="bg-[#050505] border-white/10 text-white h-10 focus-visible:ring-indigo-500 font-semibold" 
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Mode</Label>
                  <Select value={formData.mode} onValueChange={v => setFormData({ ...formData, mode: v })}>
                    <SelectTrigger className="bg-[#050505] border-white/10 text-white h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white z-[9999999]">
                      <SelectItem value="Solo">Solo</SelectItem>
                      <SelectItem value="Duo">Duo</SelectItem>
                      <SelectItem value="Squad">Squad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Map</Label>
                  <Select value={formData.map} onValueChange={v => setFormData({ ...formData, map: v })}>
                    <SelectTrigger className="bg-[#050505] border-white/10 text-white h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white z-[9999999]">
                      <SelectItem value="Bermuda">Bermuda</SelectItem>
                      <SelectItem value="Purgatory">Purgatory</SelectItem>
                      <SelectItem value="Kalahari">Kalahari</SelectItem>
                      <SelectItem value="Alpine">Alpine</SelectItem>
                      <SelectItem value="Nexterra">Nexterra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Max Teams Limit</Label>
                  <Input 
                    type="number" 
                    min="2" 
                    max={tournamentFormat === "single" ? 12 : 10000}
                    value={formData.max_teams} 
                    onChange={e => {
                      let val = parseInt(e.target.value) || 0;
                      if (tournamentFormat === "single") val = Math.min(val, 12);
                      setFormData({ ...formData, max_teams: val });
                    }}
                    className="bg-[#050505] border-white/10 text-white h-9 font-bold text-xs" 
                  />
                  
                  {/* Validation for Multi Group format */}
                  {tournamentFormat === "multi" && formData.max_teams > 9996 && (
                    <div className="mt-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-200 space-y-2">
                      <p className="font-medium text-red-300">
                        ⚠️ Maximum capacity is capped at 10,000 teams. Highest valid 12-slot capacity is <strong>9,996</strong> teams.
                      </p>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, max_teams: 9996})}
                        className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-100 border border-red-500/40 rounded-md font-semibold transition-all text-[10px]"
                      >
                        Set to 9,996 Teams
                      </button>
                    </div>
                  )}

                  {tournamentFormat === "multi" && formData.max_teams > 0 && formData.max_teams <= 9996 && formData.max_teams % 12 !== 0 && (
                    <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 space-y-2">
                      <p className="font-medium text-amber-300">
                        ⚠️ <span className="font-bold text-amber-400">{formData.max_teams}</span> teams is not a multiple of 12.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {Math.floor(formData.max_teams / 12) * 12 > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, max_teams: Math.floor(formData.max_teams / 12) * 12})}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-100 border border-amber-500/40 rounded-md font-semibold transition-all text-[10px]"
                          >
                            Adjust to {Math.floor(formData.max_teams / 12) * 12}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, max_teams: Math.min(9996, Math.ceil(formData.max_teams / 12) * 12)})}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-100 border border-amber-500/40 rounded-md font-semibold transition-all text-[10px]"
                        >
                          Adjust to {Math.min(9996, Math.ceil(formData.max_teams / 12) * 12)}
                        </button>
                      </div>
                    </div>
                  )}

                  {tournamentFormat === "multi" && formData.max_teams > 0 && formData.max_teams <= 9996 && formData.max_teams % 12 === 0 && (
                    <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1.5">
                      ✓ {formData.max_teams} Teams across {Math.ceil(formData.max_teams / 12)} groups.
                    </p>
                  )}
                </div>
              </div>

              {/* Preset Chips for Single Match */}
              {tournamentFormat === "single" && (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] font-semibold text-zinc-500">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, max_teams: 12 }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${formData.max_teams === 12 ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                  >
                    ⚡ 12 Teams (Full BR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, max_teams: 2 }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${formData.max_teams === 2 ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                  >
                    ⚔️ 2 Teams (CS 4v4)
                  </button>
                </div>
              )}
            </Card>

            {/* Poster Upload */}
            <Card className="bg-[#0f0f11] border-white/10 p-4 space-y-2.5">
              <Label className="text-zinc-400 text-xs font-semibold uppercase flex items-center justify-between">
                <span>Tournament Poster Image</span>
                {formData.banner_url && <span className="text-emerald-400 text-[10px]">✓ Image Ready</span>}
              </Label>
              
              {formData.banner_url ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/10 max-h-40 bg-black/60 flex items-center justify-center">
                  <img src={formData.banner_url} alt="Poster" className="max-h-40 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, banner_url: "" }))}
                    className="absolute top-2 right-2 p-1.5 bg-red-600/90 text-white rounded-lg hover:bg-red-500 transition-colors shadow-lg cursor-pointer text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 bg-[#050505] rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                  <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 mb-1.5">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-zinc-300">
                    {uploadingBanner ? "Uploading Image..." : "Click to Upload Banner Image"}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Recommended 16:9 ratio (JPG, PNG)</p>
                </label>
              )}
            </Card>

            {/* Schedule & Registration Dates */}
            <Card className="bg-[#0f0f11] border-white/10 p-4 space-y-3">
              <CardTitle className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Match Schedule & Dates
              </CardTitle>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Match Start Time</Label>
                  <Input 
                    type="datetime-local" 
                    value={formData.date_time} 
                    onChange={e => {
                      const newDateTime = e.target.value;
                      setCustomGroupSchedules({}); 
                      setFormData(prev => {
                        let updatedRegCloses = prev.registration_closes;
                        if (newDateTime) {
                          const matchDate = new Date(newDateTime);
                          if (!isNaN(matchDate.getTime())) {
                            const autoRegClose = new Date(matchDate.getTime() - 30 * 60 * 1000);
                            const year = autoRegClose.getFullYear();
                            const month = String(autoRegClose.getMonth() + 1).padStart(2, "0");
                            const day = String(autoRegClose.getDate()).padStart(2, "0");
                            const hours = String(autoRegClose.getHours()).padStart(2, "0");
                            const mins = String(autoRegClose.getMinutes()).padStart(2, "0");
                            updatedRegCloses = `${year}-${month}-${day}T${hours}:${mins}`;
                          }
                        }
                        return { ...prev, date_time: newDateTime, registration_closes: updatedRegCloses };
                      });
                    }}
                    className="bg-[#050505] border-white/10 text-white h-10 text-xs [color-scheme:dark]" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Registration Closes</Label>
                  <Input 
                    type="datetime-local" 
                    value={formData.registration_closes} 
                    max={formData.date_time ? formData.date_time : undefined}
                    onChange={e => setFormData(prev => ({ ...prev, registration_closes: e.target.value }))}
                    className="bg-[#050505] border-orange-500/30 text-white h-10 text-xs [color-scheme:dark]" 
                  />
                  {formData.date_time && formData.registration_closes && new Date(formData.registration_closes) >= new Date(formData.date_time) && (
                    <p className="text-[10px] font-bold text-red-400 mt-1">
                      ⚠️ Registration Closes MUST be BEFORE Match Start Time!
                    </p>
                  )}
                </div>
              </div>

              {/* Parallel Hosts & Timetable editor for Multi mode */}
              {isMulti && (
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-indigo-400 uppercase">Parallel Hosts & Intervals</Label>
                    <span className="text-[10px] font-semibold text-zinc-400">{totalGroups} Total Groups</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <Label className="text-[10px] text-zinc-400">Parallel Hosts Count</Label>
                      <Select value={String(hostsCount || 1)} onValueChange={v => {
                        setHostsCount(parseInt(v) || 1);
                        setCustomGroupSchedules({}); // Trigger real-time group timetables recalculation
                      }}>
                        <SelectTrigger className="bg-[#050505] border-white/10 text-white h-8 text-[11px]">
                          <SelectValue placeholder="1 Host" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs z-[9999999]">
                          <SelectItem value="1">1 Host (Sequential)</SelectItem>
                          <SelectItem value="2">2 Parallel Hosts</SelectItem>
                          <SelectItem value="3">3 Parallel Hosts</SelectItem>
                          <SelectItem value="4">4 Parallel Hosts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[10px] text-zinc-400">Match Interval</Label>
                      <Select value={String(matchIntervalMins || 30)} onValueChange={v => {
                        setMatchIntervalMins(parseInt(v) || 30);
                        setCustomGroupSchedules({}); // Trigger real-time group timetables recalculation
                      }}>
                        <SelectTrigger className="bg-[#050505] border-white/10 text-white h-8 text-[11px]">
                          <SelectValue placeholder="30 Mins" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs z-[9999999]">
                          <SelectItem value="15">15 Mins</SelectItem>
                          <SelectItem value="20">20 Mins</SelectItem>
                          <SelectItem value="30">30 Mins</SelectItem>
                          <SelectItem value="45">45 Mins</SelectItem>
                          <SelectItem value="60">60 Mins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Group Schedules Preview & Custom Override */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">
                        Group Match Timetables ({totalGroups} Groups):
                      </p>
                      {totalGroups > GROUPS_PER_PAGE && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <input
                            type="text"
                            placeholder="Find Group #..."
                            value={groupSearchQuery}
                            onChange={e => {
                              setGroupSearchQuery(e.target.value);
                              setGroupPage(1);
                            }}
                            className="bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-zinc-200 text-[10px] w-24 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}
                    </div>

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
                        <div className="space-y-1.5">
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {pageIndices.map(i => (
                              <div key={i} className="flex items-center justify-between bg-black/40 border border-white/[0.08] px-2.5 py-1 rounded-md text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-indigo-300">Group {i + 1}</span>
                                  {hostsCount > 1 && (
                                    <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-zinc-400 font-semibold">
                                      Host {(i % hostsCount) + 1}
                                    </span>
                                  )}
                                </div>
                                <Input 
                                  type="datetime-local" 
                                  value={getGroupSchedule(i)} 
                                  onChange={e => setCustomGroupSchedules(prev => ({ ...prev, [i]: e.target.value }))}
                                  className="bg-[#050505] border-white/10 text-zinc-100 h-7 text-[10px] w-44 [color-scheme:dark]" 
                                />
                              </div>
                            ))}
                            {pageIndices.length === 0 && (
                              <div className="text-center py-4 text-xs text-zinc-500">
                                No groups match your search
                              </div>
                            )}
                          </div>

                          {/* Pagination controls */}
                          {totalFilteredPages > 1 && (
                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] px-2 py-1 rounded text-[10px] text-zinc-400">
                              <span>Showing {startIdx + 1} - {Math.min(startIdx + GROUPS_PER_PAGE, filteredIndices.length)} of {filteredIndices.length} groups</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={safePage <= 1}
                                  onClick={() => setGroupPage(p => Math.max(1, p - 1))}
                                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-zinc-200"
                                >
                                  Prev
                                </button>
                                <span>{safePage} / {totalFilteredPages}</span>
                                <button
                                  type="button"
                                  disabled={safePage >= totalFilteredPages}
                                  onClick={() => setGroupPage(p => Math.min(totalFilteredPages, p + 1))}
                                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-zinc-200"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </Card>

            {/* Stages / Structure (Only shown for Multi-Group Esports League) */}
            {isMulti && (
              <Card className="bg-[#0f0f11] border-white/10 p-4 space-y-3">
                <CardHeader className="p-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                    <LayoutList className="w-3.5 h-3.5 text-indigo-400" /> Stages & Structure
                  </CardTitle>
                  <Button type="button" onClick={addStage} variant="outline" size="sm" className="h-6 px-2 text-[10px] bg-indigo-500/10 border-indigo-500/50 text-indigo-300 hover:text-white hover:bg-indigo-500/30">
                    <Plus className="w-3 h-3 mr-1"/> Add Stage
                  </Button>
                </CardHeader>
                <CardContent className="p-0 space-y-2">
                  {(formData.stages || []).map((stage, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#050505] border border-white/10 p-2 rounded-lg">
                      <span className="text-indigo-400 font-bold text-xs w-5 shrink-0 text-center">
                        {idx + 1}.
                      </span>
                      
                      <div className="flex-1 min-w-[100px]">
                        <Input 
                          value={stage.name} 
                          onChange={e => updateStage(idx, "name", e.target.value)}
                          placeholder="Stage Name (e.g. Qualifiers)" 
                          className="bg-[#0f0f0f] border-slate-700 text-white text-xs h-8 focus-visible:ring-indigo-500 placeholder:text-zinc-500" 
                        />
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0 bg-[#0f0f0f] px-2 py-1 rounded-lg border border-white/10">
                        <span className="text-[10px] font-semibold text-zinc-400">Matches:</span>
                        <input 
                          type="number" min="1" max="99" value={stage.matches_count || 1}
                          onChange={e => updateStage(idx, "matches_count", parseInt(e.target.value) || 1)}
                          className="w-8 bg-[#050505] border border-slate-700 rounded text-amber-400 font-bold text-xs text-center py-0.5 outline-none focus:border-amber-400"
                        />
                      </div>

                      {(formData.stages || []).length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStage(idx)} 
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-md shrink-0 border border-transparent hover:border-red-500/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          </div>

          {/* RIGHT COLUMN: Fees, Prize Chart & Rules */}
          <div className="space-y-5">

            {/* Fees & Prize Pool */}
            <Card className="bg-[#0f0f11] border-white/10 p-4 space-y-3">
              <CardTitle className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Economics & Rewards
              </CardTitle>

              <div className="space-y-2.5">
                <div>
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Entry Fee (₹)</Label>
                  <Input 
                    type="number" 
                    value={formData.entry_fee} 
                    onChange={e => setFormData({ ...formData, entry_fee: parseInt(e.target.value) || 0 })}
                    className="bg-[#050505] border-white/10 text-white font-bold h-9 text-xs" 
                  />
                </div>

                <div>
                  <Label className="text-zinc-400 text-xs font-semibold uppercase">Total Prize Pool (₹)</Label>
                  <Input 
                    type="number" 
                    value={formData.prize_pool} 
                    onChange={e => setFormData({ ...formData, prize_pool: parseInt(e.target.value) || 0 })}
                    className="bg-[#050505] border-white/10 text-amber-400 font-bold h-9 text-xs" 
                  />
                </div>
              </div>

              {/* Top 3 Prize Distribution */}
              <div className="pt-2 space-y-1.5 border-t border-white/10">
                <Label className="text-[11px] font-bold text-amber-400 uppercase">Top 3 Prizes (₹)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] text-amber-400 font-bold">🥇 1st</span>
                    <Input 
                      type="number"
                      value={formData.prize_distribution?.first || 0}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        prize_distribution: { ...prev.prize_distribution, first: parseInt(e.target.value) || 0 }
                      }))}
                      className="bg-[#050505] border-white/10 text-white h-7 text-[11px] font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-300 font-bold">🥈 2nd</span>
                    <Input 
                      type="number"
                      value={formData.prize_distribution?.second || 0}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        prize_distribution: { ...prev.prize_distribution, second: parseInt(e.target.value) || 0 }
                      }))}
                      className="bg-[#050505] border-white/10 text-white h-7 text-[11px] font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-600 font-bold">🥉 3rd</span>
                    <Input 
                      type="number"
                      value={formData.prize_distribution?.third || 0}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        prize_distribution: { ...prev.prize_distribution, third: parseInt(e.target.value) || 0 }
                      }))}
                      className="bg-[#050505] border-white/10 text-white h-7 text-[11px] font-bold"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Prize Chart Image Uploader */}
            <Card className="bg-[#0f0f11] border-white/10 p-4 space-y-2.5">
              <Label className="text-zinc-400 text-xs font-semibold uppercase flex items-center justify-between">
                <span>Prize Chart Image</span>
                {formData.prize_image_url && <span className="text-emerald-400 text-[10px]">✓ Image Set</span>}
              </Label>

              {formData.prize_image_url ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/10 max-h-32 bg-black/60 flex items-center justify-center">
                  <img src={formData.prize_image_url} alt="Prize Chart" className="max-h-32 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, prize_image_url: "" }))}
                    className="absolute top-2 right-2 p-1.5 bg-red-600/90 text-white rounded-lg hover:bg-red-500 transition-colors shadow-lg text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="border border-dashed border-white/15 hover:border-amber-500/50 bg-[#050505] rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                  <input type="file" accept="image/*" onChange={handlePrizeChartUpload} className="hidden" />
                  <ImageIcon className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 mb-1" />
                  <p className="text-xs font-bold text-zinc-300">
                    {uploadingPrizeChart ? "Uploading Chart..." : "Upload Prize Chart Image"}
                  </p>
                </label>
              )}
            </Card>

            {/* Tournament Rules */}
            <Card className="bg-[#0f0f11] border-white/10 p-4 space-y-2">
              <Label className="text-zinc-400 text-xs font-semibold uppercase">Tournament Rules & Guidelines</Label>
              <Textarea 
                value={formData.rules}
                onChange={e => setFormData({ ...formData, rules: e.target.value })}
                placeholder="Enter tournament rules..."
                className="bg-[#050505] border-white/10 text-zinc-200 min-h-[100px] text-xs"
              />
            </Card>

          </div>
        </form>

      </div>
    </motion.div>,
    document.body
  );
}