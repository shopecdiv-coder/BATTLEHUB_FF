import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { Key, Copy, CheckCircle, ChevronDown, GripHorizontal, Trophy, X } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/api/firebaseClient";
import { motion, useDragControls, AnimatePresence } from "framer-motion";

// Helper to extract only the custom typed message, stripping out auto-generated ID/Pass text
const getExtraMessageOnly = (message) => {
  if (!message) return "";
  const lines = message.split("\n").filter(line => {
    const trimmed = line.trim().toUpperCase();
    if (trimmed.startsWith("🏆 STAGE:") || trimmed.startsWith("STAGE:")) return false;
    if (trimmed.startsWith("ROOM ID:") || trimmed.startsWith("ROOM:")) return false;
    if (trimmed.startsWith("PASSWORD:") || trimmed.startsWith("PASS:")) return false;
    return true;
  });
  return lines.join("\n").trim().replace(/^📢\s*/, '');
};

const getStageAndGroup = (message) => {
  if (!message) return null;
  const match = message.match(/(?:🏆\s*)?STAGE:\s*([^|\n]+)/i);
  if (match && match[1]) return match[1].trim();
  return null;
};

const parseNotificationToCredential = (notif) => {
  const isMatchUpdate = notif.type === "Match Update" || 
                        notif.title?.includes("🔑") || 
                        notif.title?.includes("📢") || 
                        notif.message?.includes("ROOM ID:");
  if (!isMatchUpdate) return null;

  const roomCodeMatch = notif.message?.match(/ROOM ID:\s*([^|\n]+)/i);
  const roomCode = roomCodeMatch ? roomCodeMatch[1].trim() : (notif.room_code || "");

  const roomPassMatch = notif.message?.match(/PASSWORD:\s*([^|\n]+)/i);
  const roomPassword = roomPassMatch ? roomPassMatch[1].trim() : (notif.room_password || "");

  let title = notif.title || "MATCH CREDENTIALS";
  title = title.replace(/^[🔑📢]\s*/, '').split('—')[0].trim();

  return {
    id: notif.id,
    tournament_title: title,
    room_code: roomCode,
    room_password: roomPassword,
    message: notif.message,
    sent_at: notif.created_at || notif.created_date || new Date().toISOString(),
    source: "notification"
  };
};

export default function GlobalMatchCredentials() {
  const getInitialDismissed = () => {
    try {
      const stored = localStorage.getItem("dismissed_match_creds");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  const [credentials, setCredentials] = useState([]);
  const [minimized, setMinimized] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [dismissed, setDismissed] = useState(getInitialDismissed());
  const [confirmDismissId, setConfirmDismissId] = useState(null);
  const [now, setNow] = useState(Date.now());
  
  const widgetRef = useRef(null);
  const knownIds = useRef(new Set());
  const dragControls = useDragControls();

  // Ticker to auto-remove credentials in real-time as soon as 10 minutes pass
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let unsubMsgs = () => {};
    let unsubNotifs = () => {};

    const loadRealtimeData = async () => {
      try {
        const currentUser = await User.me();
        if (!currentUser) return;

        // 1. Gather all possible IDs for this user
        let rawUids = [
          currentUser.id,
          currentUser.uid,
          currentUser.ign,
          currentUser.game_id
        ];

        try {
          const leaderRegs = await Registration.filter({ team_leader_id: currentUser.id });
          const userRegs = await Registration.filter({ user_id: currentUser.id });
          const allRegs = [...leaderRegs, ...userRegs];
          
          allRegs.forEach(reg => {
            if (reg.id) rawUids.push(reg.id);
            if (reg.team_leader_uid) rawUids.push(reg.team_leader_uid);
          });
        } catch (e) {
          console.error("Error fetching registrations for global credentials", e);
        }

        // Clean and deduplicate uids
        const uids = [...new Set(rawUids.filter(Boolean).map(String))].slice(0, 30);

        if (uids.length === 0) return;

        const TEN_MINUTES_MS = 10 * 60 * 1000;

        // Listener for player_messages
        const qMsgs = query(
          collection(db, "player_messages"),
          where("recipient_id", "in", uids)
        );

        unsubMsgs = onSnapshot(qMsgs, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const activeMsgs = msgs.filter(msg => {
            const t = new Date(msg.sent_at || msg.created_date || msg.created_at || Date.now()).getTime();
            return !isNaN(t) && (Date.now() - t) <= TEN_MINUTES_MS;
          });

          setCredentials(prev => {
            const filteredPrev = prev.filter(p => p.source !== "message");
            const newCreds = activeMsgs.map(m => ({
              ...m,
              source: "message"
            }));
            return [...filteredPrev, ...newCreds];
          });
        });

        // Listener for notifications (Backup)
        const qNotifs = query(
          collection(db, "notifications"),
          where("recipient_id", "in", uids)
        );

        unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
          const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const activeNotifs = [];
          
          notifs.forEach(n => {
            const parsed = parseNotificationToCredential(n);
            if (parsed) {
              const t = new Date(parsed.sent_at || n.created_date || n.created_at || Date.now()).getTime();
              if (!isNaN(t) && (Date.now() - t) <= TEN_MINUTES_MS) {
                activeNotifs.push(parsed);
              }
            }
          });

          setCredentials(prev => {
            const filteredPrev = prev.filter(p => p.source !== "notification");
            return [...filteredPrev, ...activeNotifs];
          });
        });

      } catch (error) {
        console.error("GlobalMatchCredentials init error:", error);
      }
    };

    loadRealtimeData();

    const handleClickOutside = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target)) {
        setMinimized(true);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsubMsgs();
      unsubNotifs();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Deduplicate credentials and track new ones for the badge
  useEffect(() => {
    credentials.forEach(c => {
      if (!knownIds.current.has(c.id)) {
        knownIds.current.add(c.id);
      }
    });
  }, [credentials]);

  const handleCopy = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  // Unique active credentials that are NOT dismissed AND NOT expired (> 10 mins)
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const uniqueCredsMap = new Map();
  credentials.forEach(c => {
    const sentTime = new Date(c.sent_at || c.created_at || c.created_date || 0).getTime();
    const isExpired = !isNaN(sentTime) && sentTime > 0 && (now - sentTime > TEN_MINUTES_MS);

    if (!dismissed.has(c.id) && !isExpired) {
      uniqueCredsMap.set(c.id, c);
    }
  });
  
  // Sort by sent_at descending and keep only the latest one
  const allVisible = Array.from(uniqueCredsMap.values())
    .sort((a, b) => {
      const timeA = new Date(a.sent_at || 0).getTime();
      const timeB = new Date(b.sent_at || 0).getTime();
      return timeB - timeA;
    })
    .slice(0, 1);

  if (allVisible.length === 0) return null;

  if (minimized) {
    return (
      <motion.button
        onClick={() => setMinimized(false)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed top-24 right-4 z-[99999999] w-12 h-12 rounded-full shadow-lg flex items-center justify-center border border-slate-700 bg-slate-900 cursor-pointer active:scale-95 transition-all hover:bg-slate-800"
      >
        <Trophy className="w-5 h-5 text-slate-300" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full text-white text-[10px] flex items-center justify-center font-bold shadow-md">
          {allVisible.length}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div 
      ref={widgetRef} 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-24 right-4 z-[99999999] max-w-[280px] space-y-2 font-sans w-full"
    >
      <AnimatePresence>
        {allVisible.map((credential) => {
          const extraMsg = getExtraMessageOnly(credential.message);
          const stageInfo = getStageAndGroup(credential.message);

          return (
            <motion.div
              key={credential.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-xl text-slate-200"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Key className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white text-xs truncate">
                        {credential.tournament_title || "Credentials"}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">
                        {stageInfo || "Update"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMinimized(true)}
                      className="text-slate-500 hover:text-slate-300 p-1 rounded-md hover:bg-slate-800 transition-colors"
                      title="Minimize"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDismissId(credential.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded-md hover:bg-slate-800 transition-colors"
                      title="Clear Credentials"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Confirmation Dialog */}
                <AnimatePresence>
                  {confirmDismissId === credential.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-950/40 border border-red-900/50 rounded-lg p-3 text-center overflow-hidden"
                    >
                      <p className="text-[10px] text-red-200 font-medium mb-2.5">Clear these credentials permanently?</p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setConfirmDismissId(null)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setDismissed(prev => {
                              const newSet = new Set(prev);
                              // Add ALL current credential IDs to dismissed set
                              // This ensures no old duplicates pop up when one is cleared
                              credentials.forEach(c => newSet.add(c.id));
                              localStorage.setItem("dismissed_match_creds", JSON.stringify([...newSet]));
                              return newSet;
                            });
                            setConfirmDismissId(null);
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold rounded transition-colors shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                        >
                          Yes, Clear
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ID/Pass Boxes */}
                <div className="space-y-2.5">
                  {credential.room_code && (
                    <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5">
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide mb-1">Room ID</p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-slate-100">{credential.room_code}</span>
                        <button 
                          onClick={() => handleCopy(credential.room_code, 'id')}
                          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-1 rounded transition-colors text-[10px] font-medium flex items-center gap-1.5"
                        >
                          {copiedId ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedId ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}

                  {credential.room_password && (
                    <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5">
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide mb-1">Password</p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-slate-100">{credential.room_password}</span>
                        <button 
                          onClick={() => handleCopy(credential.room_password, 'pass')}
                          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-1 rounded transition-colors text-[10px] font-medium flex items-center gap-1.5"
                        >
                          {copiedPass ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedPass ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Box */}
                {extraMsg && (
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">
                      {extraMsg}
                    </p>
                  </div>
                )}
                
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}