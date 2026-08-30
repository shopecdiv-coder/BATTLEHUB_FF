import React, { useState, useEffect } from "react";
import { WalletEngine } from "@/lib/walletEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import CoinInvoiceDownload from "@/components/wallet/CoinInvoiceDownload";
import { 
  ArrowUpCircle, ArrowDownCircle, Banknote, 
  History, RefreshCw, Smartphone, Building2,
  CheckCircle2, Wallet as WalletIcon, ShieldCheck,
  Gift
} from "lucide-react";
import { format } from "date-fns";
import { auth, db } from "@/api/firebaseClient";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const BHCoinIcon = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="50" cy="50" r="48" fill="url(#coinEdge)" />
    <circle cx="50" cy="50" r="42" fill="url(#coinFace)" stroke="#FDE047" strokeWidth="1" />
    <circle cx="50" cy="50" r="36" fill="transparent" stroke="#B45309" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
    <text x="50" y="63" fontFamily="Arial, sans-serif" fontSize="40" fontWeight="900" fill="#78350F" textAnchor="middle" style={{ letterSpacing: "-1px" }}>BH</text>
    <path d="M 22 30 A 35 35 0 0 1 70 20" stroke="#FFFFFF" strokeWidth="3" opacity="0.5" strokeLinecap="round" fill="none" />
    <defs>
      <linearGradient id="coinEdge" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="0.5" stopColor="#B45309" />
        <stop offset="1" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="coinFace" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FEF08A" />
        <stop offset="0.5" stopColor="#F59E0B" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
    </defs>
  </svg>
);

export default function WalletWeb() {
  const [data, setData] = useState({ coins: 0, deposit: 0, bonus: 0, winnings: 0, totalCoins: 0, transactions: [], paymentRequests: [] });
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("add_cash"); // 'add_cash' | 'withdraw' | 'history'
  
  // Add Cash State
  const [addCashAmount, setAddCashAmount] = useState("");
  const [submittingAddCash, setSubmittingAddCash] = useState(false);
  const [addCashSuccess, setAddCashSuccess] = useState(false);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("UPI");
  const [upiId, setUpiId] = useState("");
  const [bankDetails, setBankDetails] = useState({ account_number: "", ifsc_code: "", holder_name: "" });
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [unclaimedGiftCount, setUnclaimedGiftCount] = useState(0);

  useEffect(() => {
    fetchWallet();
    const unsubscribe = WalletEngine.subscribeToUpdates(() => {
      fetchWallet(true);
    });

    const userUid = auth.currentUser?.uid;
    let unsubGifts = () => {};
    if (userUid) {
      const q = query(
        collection(db, "gift_mails"),
        where("recipient_id", "==", userUid),
        where("status", "==", "unclaimed")
      );
      unsubGifts = onSnapshot(q, (snap) => {
        setUnclaimedGiftCount(snap.docs.length);
      });
    }

    const handleBalanceUpdated = () => {
      fetchWallet(false);
    };
    window.addEventListener("wallet-balance-updated", handleBalanceUpdated);

    return () => {
      unsubscribe();
      unsubGifts();
      window.removeEventListener("wallet-balance-updated", handleBalanceUpdated);
    };
  }, []);

  const fetchWallet = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setIsRefreshing(true);
    }
    const res = await WalletEngine.getWalletData();
    if (res.success) {
      setData({
        user: res.user,
        coins: res.totalCoins || res.coins || 0,
        deposit: res.deposit || 0,
        bonus: res.bonus || 0,
        winnings: res.winnings || 0,
        totalCoins: res.totalCoins || 0,
        transactions: res.transactions || [],
        paymentRequests: res.paymentRequests || []
      });
    }
    if (!isSilent) {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleConfirmAddCash = async () => {
    const amt = parseFloat(addCashAmount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid amount (e.g. ₹50)");
      return;
    }

    setSubmittingAddCash(true);
    const res = await WalletEngine.creditCoins(amt, "DEPOSIT", "UPI", `Added ₹${amt} via UPI`);
    setSubmittingAddCash(false);

    if (res.success) {
      setAddCashSuccess(true);
      setAddCashAmount("");
      fetchWallet();
    } else {
      alert(res.error || "Failed to add cash");
    }
  };

  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  const handleWithdrawClick = () => {
    const amt = parseFloat(withdrawAmount);
    const withdrawable = (data.deposit || 0) + (data.winnings || 0);
    if (!amt || amt <= 0) {
      alert("Please enter a valid payout amount");
      return;
    }
    if (amt > withdrawable) {
      alert(`Security Check: You can withdraw up to ₹${withdrawable}.`);
      return;
    }
    if (payoutMethod === "UPI" && !upiId.trim()) {
      alert("Please enter your UPI ID!");
      return;
    }
    if (payoutMethod === "BANK" && (!bankDetails.account_number.trim() || !bankDetails.ifsc_code.trim())) {
      alert("Please fill in complete Bank details!");
      return;
    }

    setShowWithdrawConfirm(true);
  };

  const handleConfirmWithdraw = async () => {
    setShowWithdrawConfirm(false);
    setSubmittingWithdraw(true);

    const amt = parseFloat(withdrawAmount);
    const payoutInfo = payoutMethod === "UPI" 
      ? { method: "UPI", upi_id: upiId } 
      : { method: "BANK", ...bankDetails };

    const res = await WalletEngine.requestWithdrawal(amt, payoutInfo);
    setSubmittingWithdraw(false);

    if (res.success) {
      alert("Payout request submitted! Cash will be transferred shortly.");
      setWithdrawAmount("");
      fetchWallet();
    } else {
      alert(res.error || "Failed to submit request");
    }
  };

  const quickChips = [50, 100, 200, 500, 1000];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
        {/* Skeleton Header Banner */}
        <div className="bg-slate-950 p-4 pt-6 border-b border-slate-800/60">
          <div className="max-w-xl mx-auto space-y-4">
            {/* Header Bar Skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 animate-pulse" />
                <div className="w-32 h-3.5 bg-slate-900 rounded-md animate-pulse" />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-900 animate-pulse" />
            </div>

            {/* Total Balance Card Skeleton */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between h-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="w-24 h-7 bg-slate-800 rounded-lg animate-pulse" />
                  <div className="w-20 h-2.5 bg-slate-800 rounded-md animate-pulse" />
                </div>
              </div>
              <div className="w-20 h-8 bg-slate-800 rounded-lg animate-pulse" />
            </div>

            {/* 3-Bucket Pills Skeleton */}
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 bg-slate-900/80 rounded-xl border border-slate-800/80 animate-pulse" />
              <div className="h-12 bg-slate-900/80 rounded-xl border border-slate-800/80 animate-pulse" />
              <div className="h-12 bg-slate-900/80 rounded-xl border border-slate-800/80 animate-pulse" />
            </div>

            {/* Tab Bar Skeleton */}
            <div className="flex justify-around border-b border-slate-800/80 pt-3 pb-2 px-2">
              <div className="w-20 h-4 bg-slate-900 rounded-md animate-pulse" />
              <div className="w-20 h-4 bg-slate-900 rounded-md animate-pulse" />
              <div className="w-20 h-4 bg-slate-900 rounded-md animate-pulse" />
            </div>
          </div>
        </div>

        {/* Skeleton Form Card */}
        <div className="max-w-xl mx-auto p-4 space-y-4">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-4">
            <div className="w-32 h-4 bg-slate-800 rounded-md animate-pulse" />
            <div className="w-full h-12 bg-slate-950 rounded-xl border border-slate-800 animate-pulse" />
            <div className="grid grid-cols-5 gap-2">
              <div className="h-8 bg-slate-950 rounded-xl border border-slate-800 animate-pulse" />
              <div className="h-8 bg-slate-950 rounded-xl border border-slate-800 animate-pulse" />
              <div className="h-8 bg-slate-950 rounded-xl border border-slate-800 animate-pulse" />
              <div className="h-8 bg-slate-950 rounded-xl border border-slate-800 animate-pulse" />
              <div className="h-8 bg-slate-950 rounded-xl border border-slate-800 animate-pulse" />
            </div>
            <div className="w-full h-11 bg-slate-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* ── TOP VIP FINTECH HEADER BANNER (CLEAN MINIMAL DARK) ── */}
      <div className="bg-slate-950 p-4 pt-6 border-b border-slate-800/60 relative">
        <div className="max-w-xl mx-auto space-y-4">
          
          {/* Header Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                <WalletIcon className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">
                Total Wallet Balance
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Gift Mailbox Button next to Refresh */}
              <Button
                onClick={() => window.dispatchEvent(new CustomEvent("open-gift-mailbox"))}
                size="icon"
                variant="ghost"
                className="relative w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/20 transition-all active:scale-90"
                title="Gift Mailbox"
              >
                <Gift className="w-4 h-4" />
                {unclaimedGiftCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {unclaimedGiftCount}
                  </span>
                )}
              </Button>

              <Button
                onClick={() => fetchWallet(false)}
                size="icon"
                variant="ghost"
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all active:scale-90"
                title="Refresh Wallet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? "animate-spin text-blue-400" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Clean Dark Total Balance Card */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BHCoinIcon className="w-10 h-10 shrink-0" />
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  {(Number(data?.coins || data?.totalCoins || 0)).toFixed(0)}
                </h1>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total BH Coins
                </span>
              </div>
            </div>

            <div className="text-right border-l border-slate-800 pl-4">
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Withdrawable</span>
              <span className="text-sm font-black text-white font-mono block">
                ₹{(data.deposit || 0) + (data.winnings || 0)}
              </span>
            </div>
          </div>

          {/* 3-Bucket Mini Balance Pills (Clean Dark) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Deposit</span>
              <span className="text-xs font-extrabold text-white">₹{data.deposit}</span>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Bonus</span>
              <span className="text-xs font-extrabold text-white">{data.bonus} Coins</span>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Winnings</span>
              <span className="text-xs font-extrabold text-white">₹{data.winnings}</span>
            </div>
          </div>

          {/* ⚡ CLEAN TAB BAR WITH BOTTOM INDICATOR LINE (NO BOXES) */}
          <div className="flex items-center justify-around border-b border-slate-800/80 pt-3 pb-0 px-2">
            <button
              onClick={() => setActiveSection("add_cash")}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-all relative ${
                activeSection === "add_cash"
                  ? "text-orange-400 font-extrabold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ArrowUpCircle className={`w-4 h-4 ${activeSection === "add_cash" ? "text-orange-400" : "text-slate-500"}`} />
              <span>Add Cash</span>
              {activeSection === "add_cash" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-sm shadow-orange-500/50" />
              )}
            </button>

            <button
              onClick={() => setActiveSection("withdraw")}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-all relative ${
                activeSection === "withdraw"
                  ? "text-orange-400 font-extrabold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ArrowDownCircle className={`w-4 h-4 ${activeSection === "withdraw" ? "text-orange-400" : "text-slate-500"}`} />
              <span>Withdraw</span>
              {activeSection === "withdraw" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-sm shadow-orange-500/50" />
              )}
            </button>

            <button
              onClick={() => setActiveSection("history")}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-all relative ${
                activeSection === "history"
                  ? "text-orange-400 font-extrabold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <History className={`w-4 h-4 ${activeSection === "history" ? "text-orange-400" : "text-slate-500"}`} />
              <span>History</span>
              {activeSection === "history" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-sm shadow-orange-500/50" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── INLINE DYNAMIC CONTENT AREA (ULTRA CLEAN & MINIMAL) ── */}
      <div className="max-w-xl mx-auto p-3 sm:p-5 space-y-4">

        {/* ── SECTION 1: INLINE ADD CASH FORM ── */}
        {activeSection === "add_cash" && (
          <Card className="bg-slate-900/90 border-slate-800 shadow-xl rounded-2xl">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4 text-orange-400" />
                  Add Cash
                </h3>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Instant UPI
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Deposit Amount (₹):</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-orange-400">₹</span>
                  <Input
                    type="number"
                    value={addCashAmount}
                    onChange={(e) => setAddCashAmount(e.target.value)}
                    placeholder="100"
                    className="bg-slate-950 border-slate-800 text-white text-lg h-12 pl-8 font-black rounded-xl focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Quick Select Chips */}
              <div>
                <div className="grid grid-cols-5 gap-1.5">
                  {quickChips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setAddCashAmount(chip.toString())}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        addCashAmount === chip.toString()
                          ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-400 shadow-md shadow-orange-500/30 scale-105"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      +₹{chip}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleConfirmAddCash}
                disabled={submittingAddCash}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs h-11 rounded-xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
              >
                {submittingAddCash ? "Adding Cash..." : `Confirm & Add ₹${addCashAmount || 0}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── SECTION 2: INLINE WITHDRAW FORM ── */}
        {activeSection === "withdraw" && (() => {
          const numAmount = parseFloat(withdrawAmount) || 0;
          const withdrawableTotal = (data.deposit || 0) + (data.winnings || 0);
          const isExceedingLimit = numAmount > withdrawableTotal;
          const isInvalidWithdraw = numAmount <= 0 || isExceedingLimit;

          return (
            <Card className="bg-slate-900/90 border-slate-800 shadow-xl rounded-2xl">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-orange-400" />
                    Withdraw Cash
                  </h3>
                  <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Withdrawable: ₹{withdrawableTotal}
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">Withdraw Amount (₹):</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-lg font-black text-orange-400">₹</span>
                    <Input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="100"
                      className={`bg-slate-950 text-white text-sm h-11 pl-8 pr-3 font-bold rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${
                        isExceedingLimit ? "border-red-500/80 focus:border-red-500" : "border-slate-800"
                      }`}
                    />
                  </div>
                  {isExceedingLimit && (
                    <p className="text-[10px] text-red-400 font-semibold mt-1">
                      ⚠️ Amount exceeds your withdrawable balance (Max ₹{withdrawableTotal})
                    </p>
                  )}
                </div>

                {/* Method Switcher */}
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPayoutMethod("UPI")}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        payoutMethod === "UPI" ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-400 shadow-md" : "bg-slate-950 text-slate-400 border-slate-800"
                      }`}
                    >
                      <Smartphone className="w-4 h-4" /> UPI ID
                    </button>

                    <button
                      onClick={() => setPayoutMethod("BANK")}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        payoutMethod === "BANK" ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-400 shadow-md" : "bg-slate-950 text-slate-400 border-slate-800"
                      }`}
                    >
                      <Building2 className="w-4 h-4" /> Bank Account
                    </button>
                  </div>
                </div>

                {payoutMethod === "UPI" ? (
                  <div>
                    <Input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="Enter UPI ID (e.g. name@upi)"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-10 rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={bankDetails.holder_name}
                      onChange={(e) => setBankDetails({ ...bankDetails, holder_name: e.target.value })}
                      placeholder="Account Holder Name"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9 rounded-xl"
                    />
                    <Input
                      value={bankDetails.account_number}
                      onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                      placeholder="Account Number"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9 rounded-xl"
                    />
                    <Input
                      value={bankDetails.ifsc_code}
                      onChange={(e) => setBankDetails({ ...bankDetails, ifsc_code: e.target.value })}
                      placeholder="IFSC Code"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9 rounded-xl"
                    />
                  </div>
                )}

                <Button
                  onClick={handleWithdrawClick}
                  disabled={submittingWithdraw || isInvalidWithdraw}
                  className={`w-full font-extrabold text-xs h-11 rounded-xl transition-all mt-1 ${
                    isInvalidWithdraw 
                      ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-40 shadow-none pointer-events-none"
                      : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-500/25 active:scale-95"
                  }`}
                >
                  {submittingWithdraw 
                    ? "Submitting Payout..." 
                    : isExceedingLimit 
                      ? `Limit Exceeded (Max ₹${withdrawableTotal})` 
                      : "Submit Payout Request"}
                </Button>
              </CardContent>
            </Card>
          );
        })()}

        {/* ── SECTION 3: INLINE TRANSACTIONS HISTORY ── */}
        {activeSection === "history" && (
          <Card className="bg-slate-900/90 border-slate-800 shadow-xl rounded-2xl">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-orange-400" />
                  Transaction History
                </h3>
                <Badge className="bg-orange-500/20 text-orange-300 text-[10px] border-0">
                  {data.transactions.length} Total
                </Badge>
              </div>

              {data.transactions.length === 0 ? (
                <p className="py-12 text-center text-slate-500 text-xs font-medium">No transactions recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                  {data.transactions.map((tx, i) => (
                    <Card key={i} className="bg-slate-950 border-slate-800/80">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            tx.type === "CREDIT" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                          }`}>
                            {tx.type === "CREDIT" ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">
                              {(tx.description || "")
                                .replace(/\s*via\s+UPI\s*\/\s*Payment\s+Gateway/gi, " via UPI")
                                .replace(/\s*\/\s*Payment\s+Gateway/gi, "")
                                .replace(/\s*via\s+Payment\s+Gateway/gi, "")}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {tx.timestamp ? format(new Date(tx.timestamp), "dd MMM yyyy, hh:mm a") : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={`text-xs font-extrabold font-mono ${
                            tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {tx.type === "CREDIT" ? "+" : "-"}₹{tx.amount}
                          </span>
                          {/* Render Invoice Button ONLY for Deposit/Purchase and Withdrawal transactions */}
                          {(() => {
                            const desc = (tx.description || "").toLowerCase();
                            const source = (tx.source || "").toUpperCase();
                            const isExcluded = 
                              source === "WINNINGS" || 
                              source === "REWARD_AD" || 
                              source === "PROMO_CODE" || 
                              source === "REDEEM_STORE" || 
                              desc.includes("bonus") || 
                              desc.includes("reward") || 
                              desc.includes("prize") || 
                              desc.includes("win") || 
                              desc.includes("earned") || 
                              desc.includes("referral");
                            
                            const isInvoiceEligible = !isExcluded && (
                              source === "WITHDRAWAL" || 
                              source === "DEPOSIT" || 
                              source === "UPI" || 
                              tx.bucket === "DEPOSIT" || 
                              desc.includes("withdraw") || 
                              desc.includes("added") || 
                              desc.includes("purchased") || 
                              desc.includes("deposit") || 
                              desc.includes("topup")
                            );

                            return isInvoiceEligible ? (
                              <CoinInvoiceDownload 
                                paymentRequest={{
                                  id: tx.id || `TX-${i + 1}`,
                                  type: tx.type,
                                  description: tx.description,
                                  user_ign: data.user?.ign || data.user?.username || "Pro_Player",
                                  user_name: data.user?.full_name || data.user?.name || data.user?.username || "Player",
                                  inr_amount: tx.amount,
                                  diamond_amount: tx.amount,
                                  created_date: tx.timestamp || new Date().toISOString()
                                }}
                                user={data.user}
                              />
                            ) : null;
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── WITHDRAW CONFIRMATION MODAL ── */}
      <Dialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-xs rounded-2xl p-5">
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30 mx-auto">
              <Banknote className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">Confirm Withdrawal</h3>
              <p className="text-xs text-slate-400 mt-1">Please confirm your payout request details.</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400 font-semibold">Payout Amount:</span>
                <span className="font-extrabold text-orange-400">₹{withdrawAmount}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400 font-semibold">Method:</span>
                <span className="font-bold text-white">{payoutMethod}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => setShowWithdrawConfirm(false)}
                className="bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-bold h-10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmWithdraw}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-extrabold h-10 rounded-xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
              >
                Confirm & Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SUCCESS MODAL (ADD CASH CONFIRMATION) ── */}
      <Dialog open={addCashSuccess} onOpenChange={setAddCashSuccess}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-xs rounded-2xl text-center p-5">
          <div className="py-2 space-y-4 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Deposit Successful!</h3>
            </div>
            <Button
              onClick={() => setAddCashSuccess(false)}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs h-10 rounded-xl px-6 w-full shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
