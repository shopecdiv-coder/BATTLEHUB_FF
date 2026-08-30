import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Key, Users, Loader2, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Registration } from "@/entities/Registration";
import { PlayerMessage } from "@/entities/PlayerMessage";
import { Notification } from "@/entities/Notification";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function SendIdPassDrawer({ tournament, onClose, onUpdate }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [activeStageId, setActiveStageId] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  
  // State for form inputs per group. Key is group ID (e.g. "1")
  const [groupForms, setGroupForms] = useState({});

  useEffect(() => {
    User.me().then(setCurrentUser).catch(() => null);
  }, []);
  const [sendingGroup, setSendingGroup] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [sentGroups, setSentGroups] = useState(new Set());

  // Extract Stages dynamically or fallback
  const defaultStages = [
    { id: "qualifiers", name: "QUALIFIERS", icon: "🛡️" },
    { id: "semifinals", name: "SEMIFINALS", icon: "⚡" },
    { id: "grand_final", name: "GRAND FINAL", icon: "🏆" }
  ];

  const stagesList = useMemo(() => {
    if (!tournament) return defaultStages;
    const raw = (tournament.stages && Array.isArray(tournament.stages) && tournament.stages.length > 0)
      ? tournament.stages
      : defaultStages;

    return raw.map((st, i) => {
      if (typeof st === "string") {
        let icon = "🛡️";
        const upper = st.toUpperCase();
        if (upper.includes("SEMI")) icon = "⚡";
        if (upper.includes("FINAL")) icon = "🏆";
        return { id: upper.replace(/\s+/g, '_'), name: upper, idx: i, icon };
      }
      let icon = "🛡️";
      const upper = (st.name || st.id || `STAGE ${i+1}`).toUpperCase();
      if (upper.includes("SEMI")) icon = "⚡";
      if (upper.includes("FINAL")) icon = "🏆";
      return { id: (st.id || `stage_${i}`).toUpperCase(), name: upper, idx: i, icon };
    });
  }, [tournament]);

  useEffect(() => {
    if (stagesList.length > 0 && !activeStageId) {
      setActiveStageId(stagesList[0].id);
    }
  }, [stagesList]);

  useEffect(() => {
    if (tournament) {
      fetchData();
    }
  }, [tournament]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const regs = await Registration.filter({ tournament_id: tournament.id });
      setRegistrations(regs);
    } catch (err) {
      console.error("Failed to load registrations:", err);
      toast.error("FAILED TO LOAD REGISTRATIONS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeStageId) {
      computeGroupsForStage();
    }
  }, [registrations, activeStageId]);

  const computeGroupsForStage = () => {
    const currentStageObj = stagesList.find(s => s.id === activeStageId) || stagesList[0];
    const stNameLower = (currentStageObj.name || "").toLowerCase();
    const stIdLower = (currentStageObj.id || "").toLowerCase();
    const isQualifiers = currentStageObj.idx === 0 || stNameLower.includes("qualifier");
    const isSemifinal = stNameLower.includes("semi");
    const isGrandFinal = stNameLower.includes("final") && !isSemifinal;

    // Filter registrations strictly for this stage
    let stageRegs = registrations.filter(r => {
      if (isQualifiers) return true; // Qualifiers contains all registered teams
      const rStage = String(r.stage || r.stage_id || "").toLowerCase();
      if (rStage === stIdLower || rStage === stNameLower) return true;
      if (stNameLower && rStage.includes(stNameLower)) return true;
      if (isSemifinal && (rStage.includes("semi") || r.is_qualified || r.status === "qualified" || r.semifinal_group)) return true;
      if (isGrandFinal && (rStage.includes("final") || r.is_finalist)) return true;
      if (r.stage_index === currentStageObj.idx) return true;
      return false;
    });

    let parsedGroups = [];

    if (isGrandFinal) {
      if (stageRegs.length > 0) {
        parsedGroups = [{
          id: "grand_final",
          name: "GRAND FINAL GROUP",
          teamsCount: stageRegs.length,
          registrations: stageRegs
        }];
      }
    } else if (isSemifinal) {
      const sfMap = new Map([["sf_a", []], ["sf_b", []]]);
      stageRegs.forEach((r, idx) => {
        const sfGroup = (r.semifinal_group || "").toLowerCase();
        if (sfGroup.includes("b") || (sfGroup === "" && idx % 2 === 1)) {
          sfMap.get("sf_b").push(r);
        } else {
          sfMap.get("sf_a").push(r);
        }
      });
      
      const sfA = sfMap.get("sf_a");
      const sfB = sfMap.get("sf_b");

      if (sfA.length > 0) {
        parsedGroups.push({ id: "sf_a", name: "SEMIFINAL GROUP A", teamsCount: sfA.length, registrations: sfA });
      }
      if (sfB.length > 0) {
        parsedGroups.push({ id: "sf_b", name: "SEMIFINAL GROUP B", teamsCount: sfB.length, registrations: sfB });
      }
    } else {
      // Qualifiers or custom stage: calculate 1..N groups based on assigned teams
      // Enforce strict 12-team groups to fix corrupted group_numbers from dummy generator
      const groupMap = new Map();
      let maxGroupNum = 0;

      stageRegs.forEach((reg, index) => {
        // Force exactly 12 teams per group based on registration order
        let parsedNum = Math.floor(index / 12) + 1;
        
        if (parsedNum > maxGroupNum) {
          maxGroupNum = parsedNum;
        }

        let groupNum = String(parsedNum);
        if (!groupMap.has(groupNum)) groupMap.set(groupNum, []);
        groupMap.get(groupNum).push(reg);
      });

      // Fill in the gaps from 1 to maxGroupNum (up to a safe limit of 100 groups)
      const safeMax = Math.min(maxGroupNum, 100);
      for (let i = 1; i <= safeMax; i++) {
        const gStr = String(i);
        if (!groupMap.has(gStr)) {
          groupMap.set(gStr, []);
        }
      }

      parsedGroups = Array.from(groupMap.entries()).map(([gNum, gRegs]) => ({
        id: gNum,
        name: `GROUP ${gNum}`,
        teamsCount: gRegs.length,
        registrations: gRegs
      })).sort((a, b) => parseInt(a.id) - parseInt(b.id) || a.id.localeCompare(b.id));
    }

    // SHOW ALL GROUPS FROM 1 TO MAX (EVEN IF 0 TEAMS) AS REQUESTED
    setGroups(parsedGroups);

    // Initialize forms
    const initialForms = {};
    parsedGroups.forEach(g => {
      initialForms[g.id] = { roomCode: "", roomPassword: "", messageText: "" };
    });
    setGroupForms(initialForms);
  };

  const updateForm = (groupId, field, value) => {
    setGroupForms(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        [field]: value
      }
    }));
    // If user starts typing again, remove the "SENT" state so they know they can send again
    if (sentGroups.has(groupId)) {
      setSentGroups(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  };

  const handleSend = async (group) => {
    const currentStageObj = stagesList.find(s => s.id === activeStageId) || stagesList[0];
    const form = groupForms[group.id];
    if (!form.roomCode.trim() && !form.messageText.trim()) {
      toast.error("PLEASE ENTER A ROOM ID OR A MESSAGE TO SEND.");
      return;
    }
    
    if (group.registrations.length === 0) {
      toast.error(`NO TEAMS IN ${group.name} TO SEND TO.`);
      return;
    }

    setSendingGroup(group.id);
    const toastId = toast.loading(`SENDING CREDENTIALS FOR ${currentStageObj.name} - ${group.name}...`);
    
    try {
      let inAppMsg = `🏆 STAGE: ${currentStageObj.name} (${group.name})\n`;
      if (form.roomCode.trim()) {
        inAppMsg += `ROOM ID: ${form.roomCode.trim()}`;
        if (form.roomPassword.trim()) inAppMsg += `\nPASSWORD: ${form.roomPassword.trim()}`;
      }
      if (form.messageText.trim()) {
        inAppMsg += (inAppMsg ? "\n\n" : "") + form.messageText.trim().toUpperCase();
      }

      // Execute in parallel without blocking the UI for too long
      const sendPromises = Promise.all(group.registrations.map(async (reg) => {
        const recipientIds = new Set();
        if (reg.team_leader_id) recipientIds.add(String(reg.team_leader_id));
        if (reg.user_id) recipientIds.add(String(reg.user_id));
        if (reg.id) recipientIds.add(String(reg.id));

        if (reg.team_members && Array.isArray(reg.team_members)) {
          reg.team_members.forEach(m => {
            if (m.id) recipientIds.add(String(m.id));
            if (m.uid) recipientIds.add(String(m.uid));
            if (m.user_id) recipientIds.add(String(m.user_id));
          });
        }

        if (currentUser?.id) recipientIds.add(String(currentUser.id));

        const tasks = [];

        recipientIds.forEach(recId => {
          tasks.push(
            PlayerMessage.create({
              tournament_id: String(tournament.id),
              tournament_title: tournament.title,
              recipient_id: recId,
              recipient_ign: reg.team_leader_ign || reg.ign || reg.team_name,
              message: inAppMsg,
              room_code: form.roomCode.trim(),
              room_password: form.roomPassword.trim(),
              sent_at: new Date().toISOString(),
              read: false
            })
          );
          tasks.push(
            Notification.create({
              recipient_id: recId,
              type: "Match Update",
              title: form.roomCode.trim() 
                ? `🔑 ${tournament.title.toUpperCase()} — ${currentStageObj.name} (${group.name})` 
                : `📢 ${tournament.title.toUpperCase()} — ${currentStageObj.name} UPDATE`,
              message: form.roomCode.trim()
                ? `STAGE: ${currentStageObj.name} | ROOM ID: ${form.roomCode.trim()}${form.roomPassword.trim() ? ` | PASSWORD: ${form.roomPassword.trim()}` : ""}${form.messageText.trim() ? `\n\n📢 ${form.messageText.trim().toUpperCase()}` : ""}`
                : form.messageText.trim().toUpperCase(),
              link: createPageUrl(`TournamentDetail?id=${tournament.id}`),
              priority: form.roomCode.trim() ? "Urgent" : "High",
              dismissable: false,
              created_at: new Date().toISOString()
            })
          );
        });

        if (reg.id) {
          tasks.push(
            Registration.update(reg.id, {
              room_code: form.roomCode.trim(),
              room_password: form.roomPassword.trim(),
              room_message: inAppMsg
            }).catch(() => null)
          );
        }

        return Promise.all(tasks);
      }));

      if (form.roomCode.trim()) {
        Tournament.update(tournament.id, {
          room_code: form.roomCode.trim(),
          room_password: form.roomPassword.trim(),
          room_message: inAppMsg
        }).catch(() => null);
      }

      await sendPromises;
      
      toast.success(`✅ ID/PASS SENT TO ${group.registrations.length} TEAMS IN ${currentStageObj.name} - ${group.name}!`, { id: toastId });
      
      // Clear form for this group after success
      updateForm(group.id, "roomCode", "");
      updateForm(group.id, "roomPassword", "");
      updateForm(group.id, "messageText", "");
      
      // Mark as sent
      setSentGroups(prev => new Set(prev).add(group.id));
      
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Send message error:", err);
      toast.error("❌ ERROR SENDING MESSAGE. PLEASE TRY AGAIN.", { id: toastId });
    } finally {
      setSendingGroup(null);
    }
  };

  const currentStageObj = stagesList.find(s => s.id === activeStageId) || stagesList[0];

  return createPortal(
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 bg-[#050505] z-[9999999] overflow-y-auto p-3 sm:p-6 font-sans text-zinc-200 flex flex-col uppercase"
    >
      <div className="max-w-3xl mx-auto w-full space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 tracking-wide">
                SEND ID & PASSWORD
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5 max-w-sm truncate font-semibold">
                {tournament.title.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.08]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stage Selection Dropdown */}
        <div className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-lg">
          <Label className="text-xs font-black text-zinc-300 flex items-center gap-1.5 tracking-wider">
            <Layers className="w-4 h-4 text-green-400" /> SELECT STAGE:
          </Label>
          
          <div className="w-52 sm:w-64">
            <Select value={activeStageId} onValueChange={(val) => { setActiveStageId(val); setExpandedGroup(null); }}>
              <SelectTrigger className="bg-[#181818] border-white/10 text-white text-xs font-extrabold h-10 rounded-lg uppercase">
                <SelectValue placeholder="SELECT STAGE" />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-zinc-800 text-white uppercase font-bold z-[99999999]">
                {stagesList.map((st) => (
                  <SelectItem key={st.id} value={st.id} className="text-xs focus:bg-green-500/20 focus:text-green-400 cursor-pointer">
                    {st.icon} {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 pb-20">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800/50 animate-pulse shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-zinc-800/50 rounded w-1/3 animate-pulse"></div>
                    <div className="h-3 bg-zinc-800/50 rounded w-1/4 animate-pulse"></div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-800/50 animate-pulse shrink-0"></div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-400 bg-[#0f0f0f] rounded-2xl border border-white/[0.08] p-6 text-center">
              <Users className="w-9 h-9 opacity-20" />
              <p className="text-xs font-black tracking-wider text-zinc-400 uppercase">
                NO TEAMS ASSIGNED OR REGISTERED FOR {currentStageObj?.name || "THIS STAGE"} YET.
              </p>
              <p className="text-[10px] text-zinc-500 font-semibold uppercase">
                GROUPS ARE ONLY SHOWN WHEN TEAMS ARE ASSIGNED TO THIS STAGE.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-2.5">
                <span className="text-base leading-none">📱</span>
                <p className="text-green-400 text-xs font-black uppercase tracking-wide">
                  SENDING ROOM ID & PASSWORD FOR {currentStageObj?.name}. EXPAND A GROUP BELOW TO INPUT & SEND CREDENTIALS.
                </p>
              </div>
              
              <div className="grid gap-4">
                {groups.map((group) => {
                  const form = groupForms[group.id] || { roomCode: "", roomPassword: "", messageText: "" };
                  const isSending = sendingGroup === group.id;
                  const isExpanded = expandedGroup === group.id;
                  
                  return (
                    <div key={group.id} className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl transition-all duration-300">
                      {/* Group Header - Clickable */}
                      <button
                        onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                        className="w-full flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border-b border-white/[0.05] transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700/50 shrink-0">
                            <Users className="w-4.5 h-4.5 text-zinc-300" />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-white tracking-wider flex items-center gap-2 uppercase">
                              {group.name}
                              <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold border border-zinc-700/50 uppercase">
                                {currentStageObj?.name}
                              </span>
                            </h3>
                            <p className="text-[10px] text-green-400 font-bold mt-0.5 uppercase tracking-wide">
                              {group.teamsCount} TEAMS ASSIGNED
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {sentGroups.has(group.id) && (
                            <span className="px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 text-[10px] font-black border border-green-500/20 uppercase tracking-widest hidden sm:inline-block">
                              ✅ SENT
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] font-black border border-cyan-500/20 uppercase tracking-widest hidden sm:inline-block">
                            READY ({group.teamsCount} TEAMS)
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-zinc-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>
                      </button>
                      
                      {/* Group Form (Accordion Content) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 sm:p-5 space-y-4 border-t border-white/[0.02]">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-zinc-300 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                                    <Key className="w-3.5 h-3.5 text-amber-400" /> ROOM ID
                                  </Label>
                                  <Input
                                    autoComplete="off"
                                    value={form.roomCode}
                                    onChange={(e) => updateForm(group.id, "roomCode", e.target.value)}
                                    placeholder="E.G. 1234567"
                                    className="bg-[#151515] border-white/10 text-zinc-100 h-10 text-xs font-bold focus-visible:ring-green-500 rounded-lg placeholder:text-zinc-600 uppercase"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-zinc-300 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                                    <Key className="w-3.5 h-3.5 text-orange-400" /> PASSWORD
                                  </Label>
                                  <Input
                                    autoComplete="new-password"
                                    value={form.roomPassword}
                                    onChange={(e) => updateForm(group.id, "roomPassword", e.target.value)}
                                    placeholder="E.G. 12345"
                                    className="bg-[#151515] border-white/10 text-zinc-100 h-10 text-xs font-bold focus-visible:ring-green-500 rounded-lg placeholder:text-zinc-600 uppercase"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-zinc-300 text-xs font-black flex items-center gap-1.5 uppercase tracking-wider">
                                  EXTRA MESSAGE <span className="text-zinc-500 font-normal">(OPTIONAL)</span>
                                </Label>
                                <Textarea
                                  value={form.messageText}
                                  onChange={(e) => updateForm(group.id, "messageText", e.target.value)}
                                  placeholder="ADDITIONAL INSTRUCTIONS FOR PLAYERS..."
                                  rows={2}
                                  className="bg-[#151515] border-white/10 text-zinc-100 text-xs font-bold resize-none focus-visible:ring-green-500 rounded-lg placeholder:text-zinc-600 uppercase"
                                />
                              </div>

                              <div className="pt-2">
                                <Button
                                  onClick={() => handleSend(group)}
                                  disabled={isSending || group.teamsCount === 0 || sentGroups.has(group.id)}
                                  className={`w-full sm:w-auto ml-auto flex font-black h-10 px-6 rounded-lg transition-all uppercase text-xs ${
                                    group.teamsCount === 0
                                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50 shadow-none border border-white/5"
                                      : sentGroups.has(group.id) 
                                        ? "bg-zinc-800 text-green-400 border border-green-500/30 hover:bg-zinc-800 shadow-none cursor-pointer active:scale-95"
                                        : "bg-green-600 hover:bg-green-500 text-white shadow-green-900/20 shadow-lg cursor-pointer active:scale-95"
                                  }`}
                                >
                                  {isSending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      SENDING...
                                    </>
                                  ) : sentGroups.has(group.id) ? (
                                    <>
                                      <span className="text-base mr-2">✅</span>
                                      SENT TO {group.name}
                                    </>
                                  ) : group.teamsCount === 0 ? (
                                    <>
                                      <Send className="w-4 h-4 mr-2 opacity-50" />
                                      0 TEAMS (MIN 1 REQ)
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-4 h-4 mr-2" />
                                      SEND TO {group.name} ({currentStageObj?.name})
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
