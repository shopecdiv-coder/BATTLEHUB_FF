import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, CheckCircle2, Clock, User, ArrowRight, 
  X, Quote, Coins, ChevronRight, Inbox, Mail, Sparkles
} from "lucide-react";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { db, auth } from "@/api/firebaseClient";
import { 
  collection, query, where, onSnapshot, doc, updateDoc, 
  getDocs, setDoc, increment, serverTimestamp, addDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function GlobalGiftMailHandler() {
  const [currentUser, setCurrentUser] = useState(null);
  const [mails, setMails] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [viewMode, setViewMode] = useState("card"); // 'card' or 'inbox'
  const hasAutoOpenedRef = useRef(new Set()); // Track mail IDs auto-opened to prevent repeat intrusive popups

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

      // Auto-popup logic when opening App: If there is an unclaimed gift mail
      const unclaimed = list.filter((m) => m.status === "unclaimed");
      if (unclaimed.length > 0) {
        const topUnclaimed = unclaimed[0];
        // Only auto-open if not dismissed in this session
        if (!hasAutoOpenedRef.current.has(topUnclaimed.id)) {
          hasAutoOpenedRef.current.add(topUnclaimed.id);
          setSelectedMail(topUnclaimed);
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
        const found = mails.find((m) => m.id === targetMailId);
        if (found) {
          setSelectedMail(found);
          setViewMode("card");
          setIsOpen(true);
          return;
        }
      }

      const unclaimed = mails.filter((m) => m.status === "unclaimed");
      if (unclaimed.length > 0) {
        setSelectedMail(unclaimed[0]);
        setViewMode("card");
      } else if (mails.length > 0) {
        setSelectedMail(mails[0]);
        setViewMode("inbox");
      } else {
        setViewMode("inbox");
      }
      setIsOpen(true);
    };

    window.addEventListener("open-gift-mailbox", handleOpenEvent);
    return () => window.removeEventListener("open-gift-mailbox", handleOpenEvent);
  }, [mails]);

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
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f59e0b", "#10b981", "#06b6d4", "#ec4899", "#8b5cf6"]
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
        description: `Claimed gift from ${mail.sender_name || "Friend"}`,
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
        message: `₹${numAmount} gift from ${mail.sender_name || "Friend"} has been credited to your wallet.`,
        type: "wallet",
        read: false,
        priority: "High",
        created_date: nowIso,
        created_at: nowIso
      }).catch(() => {});

      // Update local view
      setSelectedMail((prev) => prev ? { ...prev, status: "claimed", claimed_at: nowIso } : null);

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
      <DialogContent className="max-w-md w-[92vw] p-0 bg-[#0c0e14] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl text-white">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-800/80 flex items-center justify-between bg-gray-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Player Gift Mail
                {selectedMail?.status === "unclaimed" && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500 text-black uppercase">
                    New
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-400">BattleHub In-Game Delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mails.length > 1 && (
              <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
                <button
                  onClick={() => setViewMode("card")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    viewMode === "card" ? "bg-amber-500 text-black font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Mail
                </button>
                <button
                  onClick={() => setViewMode("inbox")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    viewMode === "inbox" ? "bg-amber-500 text-black font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  All ({mails.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5">
          {viewMode === "card" && selectedMail ? (
            <div className="space-y-4">
              
              {/* Sender Card */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/60 border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-sm">
                    {selectedMail.sender_name?.charAt(0)?.toUpperCase() || "P"}
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">Gifted by:</p>
                    <h4 className="font-bold text-sm text-white leading-tight">
                      {selectedMail.sender_name || "BattleHub Player"}
                    </h4>
                    {selectedMail.sender_bhid && (
                      <p className="text-[11px] font-mono text-cyan-400">
                        {selectedMail.sender_bhid}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <Badge className={selectedMail.status === "claimed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]" : "bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]"}>
                    {selectedMail.status === "claimed" ? "Claimed" : "Unclaimed"}
                  </Badge>
                  {selectedMail.created_at && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      {format(new Date(selectedMail.created_at), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>
              </div>

              {/* Glowing Coin / Rupee Display */}
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-black/40 to-black p-5 text-center">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-2 shadow-lg shadow-amber-500/10">
                  <Coins className="w-6 h-6" />
                </div>

                <div className="text-3xl font-extrabold text-amber-400 tracking-tight font-mono">
                  ₹{Number(selectedMail.amount || 0).toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-amber-200/70 mt-1">
                  BattleHub Deposit Wallet Balance
                </p>
              </div>

              {/* Personal Note */}
              {selectedMail.message ? (
                <div className="relative p-3.5 rounded-xl bg-gray-900/70 border border-gray-800/80">
                  <Quote className="w-4 h-4 text-amber-500/50 absolute top-2.5 left-2.5 opacity-60" />
                  <p className="text-xs text-gray-200 italic pl-5 leading-relaxed whitespace-pre-wrap">
                    "{selectedMail.message}"
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-gray-900/30 border border-gray-800/40 text-center">
                  <p className="text-xs text-gray-400 italic">
                    "Sent you a gift on BattleHub!"
                  </p>
                </div>
              )}

              {/* Action Claim Button */}
              {selectedMail.status === "unclaimed" ? (
                <Button
                  onClick={() => handleClaimGift(selectedMail)}
                  disabled={claiming}
                  className="w-full py-3 h-12 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  {claiming ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                      Crediting Wallet...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      CLAIM ₹{selectedMail.amount} TO WALLET
                    </span>
                  )}
                </Button>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Successfully Claimed to Wallet
                  {selectedMail.claimed_at && (
                    <span className="text-gray-400 text-[10px]">
                      ({format(new Date(selectedMail.claimed_at), "MMM d, h:mm a")})
                    </span>
                  )}
                </div>
              )}

            </div>
          ) : (
            /* Inbox View */
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {mails.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No gift mails received yet.
                </div>
              ) : (
                mails.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMail(m);
                      setViewMode("card");
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      m.status === "unclaimed"
                        ? "bg-amber-950/20 border-amber-500/40 hover:border-amber-400"
                        : "bg-gray-900/30 border-gray-800 hover:bg-gray-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        m.status === "unclaimed" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-gray-800 text-gray-400"
                      }`}>
                        {m.status === "unclaimed" ? <Gift className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{m.sender_name || "Friend"}</span>
                          {m.status === "unclaimed" && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500 text-black">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 line-clamp-1">
                          {m.message || `Sent you ₹${m.amount}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        ₹{m.amount}
                      </span>
                      <p className="text-[10px] text-gray-500">
                        {m.created_at ? format(new Date(m.created_at), "MMM d") : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
