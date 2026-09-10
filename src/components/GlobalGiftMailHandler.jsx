import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Gift, CheckCircle2, Clock, User, ArrowRight, 
  X, Quote, Coins, ChevronLeft, ChevronRight, Inbox, Mail, Sparkles, ShieldCheck, Copy, Check
} from "lucide-react";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { db, auth } from "@/api/firebaseClient";
import { 
  collection, query, where, onSnapshot, doc, updateDoc, 
  getDocs, setDoc, increment, serverTimestamp, addDoc, runTransaction
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const BHCoinIcon = ({ className = "w-12 h-12" }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="50" cy="50" r="48" fill="url(#ghCoinEdge)" />
    <circle cx="50" cy="50" r="42" fill="url(#ghCoinFace)" stroke="#FDE047" strokeWidth="1" />
    <circle cx="50" cy="50" r="36" fill="transparent" stroke="#B45309" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" />
    <text x="50" y="63" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="900" fill="#78350F" textAnchor="middle" style={{ letterSpacing: "-1px" }}>BH</text>
    <path d="M 22 30 A 35 35 0 0 1 70 20" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" strokeLinecap="round" fill="none" />
    <defs>
      <linearGradient id="ghCoinEdge" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="0.5" stopColor="#B45309" />
        <stop offset="1" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="ghCoinFace" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FEF08A" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  </svg>
);

// 🔒 Server API URL — all wallet mutations go through this secure endpoint
const WALLET_API_URL = import.meta.env.VITE_WALLET_API_URL || 'https://battlehub-ten.vercel.app/api/wallet';

export default function GlobalGiftMailHandler() {
  const [currentUser, setCurrentUser] = useState(null);
  const [mails, setMails] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [viewMode, setViewMode] = useState("card");
  const [copiedId, setCopiedId] = useState(false);
  const hasAutoOpenedRef = useRef(new Set());

  // 1. Listen to Auth State
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // 2. Listen to Gift Mails in real-time (READ-ONLY — no client writes)
  useEffect(() => {
    if (!currentUser?.uid) {
      setMails([]);
      return;
    }

    const q = query(
      collection(db, "gift_mails"),
      where("recipient_id", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort: Unclaimed first, then newest first
      list.sort((a, b) => {
        if (a.status === "unclaimed" && b.status !== "unclaimed") return -1;
        if (a.status !== "unclaimed" && b.status === "unclaimed") return 1;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      setMails(list);

      // Auto-popup on App open if there is an unclaimed gift
      const unclaimed = list.filter((m) => m.status === "unclaimed");
      if (unclaimed.length > 0) {
        const topUnclaimed = unclaimed[0];
        if (!hasAutoOpenedRef.current.has(topUnclaimed.id)) {
          hasAutoOpenedRef.current.add(topUnclaimed.id);
          setSelectedIndex(0);
          setViewMode("card");
          setIsOpen(true);
        }
      }
    }, (err) => {
      console.warn("Gift mail subscription error:", err);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 3. Listen to Custom Event to manually open Mailbox
  useEffect(() => {
    const handleOpenEvent = (event) => {
      const targetMailId = event?.detail?.mailId;
      if (targetMailId) {
        const idx = mails.findIndex((m) => m.id === targetMailId);
        if (idx !== -1) {
          setSelectedIndex(idx);
          setViewMode("card");
          setIsOpen(true);
          return;
        }
      }

      setSelectedIndex(0);
      setViewMode("card");
      setIsOpen(true);
    };

    window.addEventListener("open-gift-mailbox", handleOpenEvent);
    return () => window.removeEventListener("open-gift-mailbox", handleOpenEvent);
  }, [mails]);

  const selectedMail = mails[selectedIndex] || mails[0] || null;
  const unclaimedCount = mails.filter((m) => m.status === "unclaimed").length;

  // Next / Prev gift navigation
  const handleNextGift = () => {
    if (selectedIndex < mails.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handlePrevGift = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  // Copy BattleHub ID
  const handleCopyBhid = (bhid) => {
    if (!bhid) return;
    navigator.clipboard?.writeText(bhid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ═══════════════════════════════════════════════════════
  // 🔒 SECURE GIFT CLAIM — Server-Side API Call
  // No client-side Firestore writes! All mutations via secure API.
  // ═══════════════════════════════════════════════════════
  const handleClaimGift = async (mail) => {
    if (!mail || mail.status === "claimed" || claiming || !currentUser) return;

    setClaiming(true);
    try {
      // Get fresh ID token for authentication
      const idToken = await currentUser.getIdToken(true);
      
      const response = await fetch(WALLET_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          action: 'claim-gift',
          giftMailId: mail.id
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to claim gift');
      }

      // Grand Confetti fireworks shooting UPWARDS into the screen ON TOP OF MODAL
      try {
        // Center explosive fountain blasting upwards
        confetti({
          particleCount: 120,
          angle: 90,
          spread: 85,
          startVelocity: 55,
          gravity: 0.8,
          ticks: 200,
          zIndex: 9999999,
          origin: { x: 0.5, y: 0.9 },
          colors: ["#f59e0b", "#fbbf24", "#10b981", "#06b6d4", "#ff5722", "#ffffff"]
        });

        // Left cannon shooting up-right
        confetti({
          particleCount: 70,
          angle: 60,
          spread: 60,
          startVelocity: 50,
          gravity: 0.8,
          ticks: 200,
          zIndex: 9999999,
          origin: { x: 0.1, y: 0.85 },
          colors: ["#f59e0b", "#fbbf24", "#10b981", "#06b6d4", "#ff5722"]
        });

        // Right cannon shooting up-left
        confetti({
          particleCount: 70,
          angle: 120,
          spread: 60,
          startVelocity: 50,
          gravity: 0.8,
          ticks: 200,
          zIndex: 9999999,
          origin: { x: 0.9, y: 0.85 },
          colors: ["#f59e0b", "#fbbf24", "#10b981", "#06b6d4", "#ff5722"]
        });
      } catch (cErr) {}

      // Dispatch global balance update event
      window.dispatchEvent(new CustomEvent("wallet-balance-updated"));
      window.dispatchEvent(new CustomEvent("wallet_balance_updated"));

    } catch (err) {
      console.error("Error claiming gift mail:", err);
      alert(err.message || "Failed to claim gift. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  if (!currentUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[430px] w-[94vw] p-0 bg-[#090b11] border border-amber-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.22)] text-white select-none">
        
        {/* Ambient Top Glow Beam */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* ── TOP HEADER ── */}
        <div className="relative px-5 py-4 pr-10 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Gift className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="font-bold text-base text-white">
              Gift Mail
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Multi-Gift Stepper */}
            {mails.length > 1 && (
              <div className="flex items-center bg-white/[0.05] border border-white/[0.08] rounded-xl px-1 py-0.5 text-xs text-slate-300">
                <button
                  onClick={handlePrevGift}
                  disabled={selectedIndex === 0}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/[0.1] disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 text-[11px] font-mono font-bold text-amber-400">
                  {selectedIndex + 1}/{mails.length}
                </span>
                <button
                  onClick={handleNextGift}
                  disabled={selectedIndex === mails.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/[0.1] disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── MODAL BODY ── */}
        <div className="p-5 space-y-4 relative">
          
          {selectedMail ? (
            <>
              {/* 1. SENDER CARD */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px]">
                    <div className="w-full h-full bg-[#111420] rounded-xl flex items-center justify-center font-bold text-amber-300 text-sm">
                      {selectedMail.sender_name?.charAt(0)?.toUpperCase() || "P"}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-white">
                      {selectedMail.sender_name || "BattleHub Player"}
                    </h4>
                    {selectedMail.sender_bhid && (
                      <button
                        type="button"
                        onClick={() => handleCopyBhid(selectedMail.sender_bhid)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400/90 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        <span>{selectedMail.sender_bhid}</span>
                        {copiedId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-slate-500" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {selectedMail.status === "claimed" && (
                  <span className="text-[11px] font-bold text-emerald-400">
                    Claimed
                  </span>
                )}
              </div>

              {/* 2. REWARD SHOWCASE */}
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-[#0d0f17] to-[#0a0c14] p-5 text-center">
                <div className="inline-flex items-center justify-center mb-2">
                  <BHCoinIcon className="w-14 h-14 drop-shadow-md" />
                </div>

                <div className="font-black text-4xl text-amber-400 font-mono tracking-tight">
                  ₹{Number(selectedMail.amount || 0).toLocaleString("en-IN")}
                </div>
              </div>

              {/* 3. MESSAGE NOTE */}
              {selectedMail.message && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <p className="text-xs text-slate-300 italic leading-relaxed whitespace-pre-wrap">
                    "{selectedMail.message}"
                  </p>
                </div>
              )}

              {/* 4. ACTION BUTTON */}
              {selectedMail.status === "unclaimed" ? (
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleClaimGift(selectedMail)}
                    disabled={claiming}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-sm shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {claiming ? (
                      <span>Crediting Wallet...</span>
                    ) : (
                      <>
                        <Gift className="w-4 h-4 stroke-[2.5]" />
                        <span>CLAIM ₹{selectedMail.amount} TO WALLET</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full py-1 text-center text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Claim Later
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Successfully Claimed</span>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No gifts available.
            </div>
          )}

        </div>

      </DialogContent>
    </Dialog>
  );
}
