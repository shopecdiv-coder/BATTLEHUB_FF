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
  getDocs, setDoc, increment, serverTimestamp, addDoc
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

export default function GlobalGiftMailHandler() {
  const [currentUser, setCurrentUser] = useState(null);
  const [mails, setMails] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [viewMode, setViewMode] = useState("card"); // 'card' or 'inbox'
  const [copiedId, setCopiedId] = useState(false);
  const hasAutoOpenedRef = useRef(new Set());

  // 1. Listen to Auth State
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // 2. Listen to Gift Mails in real-time
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

  // 4. Claim Gift function (Atomic balance addition + Confetti)
  const handleClaimGift = async (mail) => {
    if (!mail || mail.status === "claimed" || claiming || !currentUser) return;

    setClaiming(true);
    try {
      const nowIso = new Date().toISOString();
      const numAmount = Number(mail.amount || 0);

      // Confetti celebration
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.55 },
          colors: ["#f59e0b", "#fbbf24", "#10b981", "#06b6d4", "#f43f5e"]
        });
      } catch (cErr) {}

      // Update gift_mails doc
      const mailRef = doc(db, "gift_mails", mail.id);
      await updateDoc(mailRef, {
        status: "claimed",
        claimed_at: nowIso
      });

      // Update diamonds doc
      const dQuery = query(collection(db, "diamonds"), where("user_id", "==", currentUser.uid));
      const dSnap = await getDocs(dQuery);
      const newTx = {
        id: `tx_${Date.now()}`,
        type: "CREDIT",
        bucket: "DEPOSIT",
        source: "GIFT_CLAIM",
        amount: numAmount,
        description: `Gift claimed from ${mail.sender_name || "Player"}`,
        timestamp: nowIso,
        gift_mail_id: mail.id
      };

      if (!dSnap.empty) {
        const docRef = dSnap.docs[0].ref;
        const dData = dSnap.docs[0].data();
        const curDep = Number(dData.deposit_balance || 0);
        const curBon = Number(dData.bonus_balance || 0);
        const curWin = Number(dData.winnings_balance || 0);
        const newDep = curDep + numAmount;
        const newTotal = newDep + curBon + curWin;
        const existingTxs = Array.isArray(dData.transactions) ? dData.transactions : [];

        await updateDoc(docRef, {
          deposit_balance: newDep,
          bh_coin_balance: newTotal,
          transactions: [newTx, ...existingTxs.slice(0, 49)],
          updated_date: nowIso
        });
      } else {
        await addDoc(collection(db, "diamonds"), {
          user_id: currentUser.uid,
          user_ign: currentUser.displayName || "Player",
          deposit_balance: numAmount,
          bonus_balance: 0,
          winnings_balance: 0,
          bh_coin_balance: numAmount,
          diamond_balance: 0,
          transactions: [newTx],
          created_date: nowIso,
          updated_date: nowIso
        });
      }

      // Update users doc
      await setDoc(doc(db, "users", currentUser.uid), {
        walletBalance: increment(numAmount),
        depositBalance: increment(numAmount),
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => {});

      // In-App Notification
      await addDoc(collection(db, "notifications"), {
        user_id: currentUser.uid,
        recipient_id: currentUser.uid,
        title: "Gift Claimed! 🎁",
        message: `₹${numAmount} gift from ${mail.sender_name || "Friend"} has been credited to your deposit wallet!`,
        type: "wallet",
        read: false,
        priority: "High",
        created_date: nowIso,
        created_at: nowIso
      }).catch(() => {});

      // Dispatch global balance update event
      window.dispatchEvent(new CustomEvent("wallet-balance-updated"));

    } catch (err) {
      console.error("Error claiming gift mail:", err);
      alert("Failed to claim gift. Please try again.");
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

        {/* ── TOP VIP HEADER ── */}
        <div className="relative px-5 pt-5 pb-3.5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#0d0f17] rounded-2xl flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm tracking-wide text-white uppercase font-sans">
                  Player Gift Vault
                </h3>
                {unclaimedCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-sm">
                    {unclaimedCount} NEW
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Official In-Game Delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Multi-Gift Stepper */}
            {mails.length > 1 && (
              <div className="flex items-center bg-white/[0.05] border border-white/[0.08] rounded-xl px-1 py-0.5 text-xs text-slate-300">
                <button
                  onClick={handlePrevGift}
                  disabled={selectedIndex === 0}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/[0.1] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 text-[11px] font-mono font-bold text-amber-400">
                  {selectedIndex + 1}/{mails.length}
                </span>
                <button
                  onClick={handleNextGift}
                  disabled={selectedIndex === mails.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/[0.1] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Close (Saved in Mailbox)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── MODAL BODY ── */}
        <div className="p-5 space-y-4 relative">
          
          {selectedMail ? (
            <>
              {/* 1. SENDER VIP PROFILE CARD */}
              <div className="relative overflow-hidden p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.09] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 p-[1.5px] shadow-md">
                      <div className="w-full h-full bg-[#111420] rounded-2xl flex items-center justify-center font-black text-amber-300 text-base">
                        {selectedMail.sender_name?.charAt(0)?.toUpperCase() || "P"}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#090b11] flex items-center justify-center">
                      <ShieldCheck className="w-2.5 h-2.5 text-black stroke-[3]" />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block leading-none mb-1">
                      Gifted By
                    </span>
                    <h4 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                      {selectedMail.sender_name || "BattleHub Player"}
                    </h4>
                    {selectedMail.sender_bhid && (
                      <button
                        type="button"
                        onClick={() => handleCopyBhid(selectedMail.sender_bhid)}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400/90 hover:text-amber-300 mt-0.5 transition-colors cursor-pointer group"
                      >
                        <span>{selectedMail.sender_bhid}</span>
                        {copiedId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-slate-500 group-hover:text-amber-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                    selectedMail.status === "claimed"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse"
                  }`}>
                    {selectedMail.status === "claimed" ? "✓ Claimed" : "• Pending"}
                  </span>
                  {selectedMail.created_at && (
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      {format(new Date(selectedMail.created_at), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>
              </div>

              {/* 2. PRESTIGE REWARD SHOWCASE (The Golden Medallion Hero) */}
              <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/15 via-[#0f121d] to-[#0a0c14] p-6 text-center shadow-[inset_0_0_30px_rgba(245,158,11,0.1)]">
                
                {/* Radial Lighting */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-gradient-to-b from-amber-400/25 to-transparent rounded-full blur-2xl pointer-events-none" />

                {/* 3D Coin Badge with Golden Rings */}
                <div className="relative inline-flex items-center justify-center mb-3">
                  <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl animate-pulse" />
                  <div className="w-18 h-18 rounded-full border-2 border-amber-400/40 p-1 bg-gradient-to-b from-amber-400/30 to-amber-600/10 flex items-center justify-center shadow-xl">
                    <BHCoinIcon className="w-14 h-14 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
                  </div>
                </div>

                {/* Big Bold Coin / Rupee Display */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 font-black text-4xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-500 tracking-tight font-mono drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
                    <span>₹{Number(selectedMail.amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-300">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Instant Deposit Wallet Balance</span>
                  </div>
                </div>
              </div>

              {/* 3. PERSONAL MESSAGE SCROLL / NOTE */}
              <div className="relative p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <Quote className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Personal Message
                  </span>
                </div>
                <p className="text-xs text-slate-200 italic leading-relaxed pl-5 whitespace-pre-wrap font-sans">
                  "{selectedMail.message || "Sent you a gift on BattleHub! Have fun in tournaments! 🎮🔥"}"
                </p>
              </div>

              {/* 4. ACTION CTA BUTTON */}
              {selectedMail.status === "unclaimed" ? (
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleClaimGift(selectedMail)}
                    disabled={claiming}
                    className="relative group w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wide shadow-[0_4px_25px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5 overflow-hidden disabled:opacity-50"
                  >
                    {/* Shimmer Sweep Effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                    {claiming ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>TRANSFERRING ₹{selectedMail.amount} TO WALLET...</span>
                      </>
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
                    className="w-full py-1 text-center text-xs text-slate-400 hover:text-amber-300 transition-colors cursor-pointer font-medium"
                  >
                    Claim Later • Stored safely in Wallet (🎁)
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Successfully Claimed to Deposit Wallet</span>
                  {selectedMail.claimed_at && (
                    <span className="text-slate-400 font-normal text-[11px]">
                      ({format(new Date(selectedMail.claimed_at), "h:mm a")})
                    </span>
                  )}
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
