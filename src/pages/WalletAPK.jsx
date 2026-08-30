import React, { useState, useEffect } from "react";
import { WalletEngine } from "@/lib/walletEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CreditCard, ArrowUpCircle, ArrowDownCircle, Banknote, 
  History, RefreshCw, QrCode, Building2, Smartphone, 
  CheckCircle2, AlertCircle, Sparkles, Trophy, Lock
} from "lucide-react";
import { format } from "date-fns";
import BuyCoinsStepper from "@/components/wallet/BuyCoinsStepper";

export default function WalletAPK() {
  const [data, setData] = useState({ 
    deposit: 0, bonus: 0, winnings: 0, totalCoins: 0, 
    transactions: [], paymentRequests: [] 
  });
  const [loading, setLoading] = useState(true);
  const [showBuyStepper, setShowBuyStepper] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("UPI"); // 'UPI' | 'BANK'
  const [upiId, setUpiId] = useState("");
  const [bankDetails, setBankDetails] = useState({ account_number: "", ifsc_code: "", holder_name: "" });
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  useEffect(() => {
    fetchWallet();
    const unsubscribe = WalletEngine.subscribeToUpdates(() => {
      fetchWallet();
    });
    return () => unsubscribe();
  }, []);

  const fetchWallet = async () => {
    setLoading(true);
    const res = await WalletEngine.getWalletData();
    if (res.success) {
      setData({
        deposit: res.deposit,
        bonus: res.bonus,
        winnings: res.winnings,
        totalCoins: res.totalCoins,
        transactions: res.transactions,
        paymentRequests: res.paymentRequests
      });
    }
    setLoading(false);
  };

  const handleWithdrawSubmit = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid withdrawal amount");
      return;
    }
    if (amt > data.winnings) {
      alert(`Security Check: You can only withdraw Winnings! Your withdrawable Winnings balance is ₹${data.winnings}. Bonus Coins (${data.bonus}) cannot be withdrawn to Bank.`);
      return;
    }

    setSubmittingWithdraw(true);
    const payoutInfo = payoutMethod === "UPI" 
      ? { method: "UPI", upi_id: upiId } 
      : { method: "BANK", ...bankDetails };

    const res = await WalletEngine.requestWithdrawal(amt, payoutInfo);
    setSubmittingWithdraw(false);

    if (res.success) {
      alert("Withdrawal request submitted! Amount will be credited to your account after verification.");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      fetchWallet();
    } else {
      alert(res.error || "Failed to submit withdrawal");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* ── TOP WALLET HEADER ── */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-4 pt-6 shadow-xl relative overflow-hidden">
        <div className="max-w-md mx-auto relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded-full border border-white/10">
              Direct APK 3-Bucket Wallet
            </span>
            <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
              ₹{loading ? "..." : (Number(data?.totalCoins || 0)).toFixed(2)}
              <span className="text-xs text-emerald-200 font-bold">TOTAL BALANCE</span>
            </h1>
          </div>

          <Button
            onClick={fetchWallet}
            size="icon"
            variant="ghost"
            className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2 mt-4">
          <Button
            onClick={() => setShowBuyStepper(true)}
            className="bg-white hover:bg-emerald-50 text-emerald-800 font-black text-xs h-9 rounded-xl shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
            Add Cash (UPI / QR)
          </Button>

          <Button
            onClick={() => setShowWithdrawModal(true)}
            className="bg-emerald-950/80 hover:bg-emerald-900 text-white font-black text-xs h-9 rounded-xl border border-emerald-400/30 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <ArrowDownCircle className="w-4 h-4 text-cyan-400" />
            Withdraw Winnings
          </Button>
        </div>
      </div>

      {/* ── 3-BUCKET BREAKDOWN CARDS ── */}
      <div className="max-w-md mx-auto p-3 space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Wallet Balance Breakdown
        </h2>

        <div className="grid grid-cols-3 gap-2">
          {/* Bucket 1: Deposit */}
          <Card className="bg-slate-900 border-slate-800 text-center">
            <CardContent className="p-2.5">
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Deposit</span>
              <p className="text-sm font-black text-white mt-0.5">₹{data.deposit}</p>
              <span className="text-[8px] text-slate-500 block mt-1">For Matches</span>
            </CardContent>
          </Card>

          {/* Bucket 2: Bonus (Video Ads / Spin) */}
          <Card className="bg-slate-900 border-amber-500/30 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-400 px-1 py-0.2 text-[7px] font-bold">
              Ads/Spin
            </div>
            <CardContent className="p-2.5">
              <span className="text-[9px] text-amber-400 font-bold uppercase block flex items-center justify-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> Bonus
              </span>
              <p className="text-sm font-black text-amber-300 mt-0.5">{data.bonus} Coins</p>
              <span className="text-[8px] text-amber-400/70 block mt-1 flex items-center justify-center gap-0.5">
                <Lock className="w-2 h-2" /> Non-Cashout
              </span>
            </CardContent>
          </Card>

          {/* Bucket 3: Winnings */}
          <Card className="bg-slate-900 border-emerald-500/40 text-center shadow-md">
            <CardContent className="p-2.5">
              <span className="text-[9px] text-emerald-400 font-bold uppercase block flex items-center justify-center gap-0.5">
                <Trophy className="w-2.5 h-2.5" /> Winnings
              </span>
              <p className="text-sm font-black text-emerald-400 mt-0.5">₹{data.winnings}</p>
              <span className="text-[8px] text-emerald-400 block font-bold mt-1">
                Withdrawable
              </span>
            </CardContent>
          </Card>
        </div>

        {/* ── TRANSACTION HISTORY ── */}
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 pt-2 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" /> Recent Transactions
        </h2>

        {data.transactions.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-8 text-center text-slate-500 text-xs">
              No transactions recorded yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.transactions.map((tx, i) => (
              <Card key={i} className="bg-slate-900 border-slate-800">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.type === "CREDIT" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {tx.type === "CREDIT" ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {tx.description}
                        {tx.bucket && (
                          <Badge className="text-[8px] bg-slate-800 text-slate-300 border-0 px-1 py-0">
                            {tx.bucket}
                          </Badge>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {tx.timestamp ? format(new Date(tx.timestamp), "dd MMM yyyy, hh:mm a") : ""}
                      </p>
                    </div>
                  </div>

                  <span className={`text-xs font-extrabold font-mono ${
                    tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {tx.type === "CREDIT" ? "+" : "-"}₹{tx.amount}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── ADD CASH STEPPER MODAL ── */}
      {showBuyStepper && (
        <BuyCoinsStepper
          isOpen={showBuyStepper}
          onClose={() => {
            setShowBuyStepper(false);
            fetchWallet();
          }}
        />
      )}

      {/* ── WITHDRAW MODAL ── */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              Withdraw Winnings (Withdrawable: ₹{data.winnings})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Security Protection:</strong> Only Tournament Winnings (₹{data.winnings}) can be transferred to Bank/UPI. Bonus coins earned from Ads/Spin cannot be withdrawn.
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium mb-1 block">Enter Withdrawal Amount (₹):</label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Max ₹${data.winnings}`}
                className="bg-slate-950 border-slate-800 text-white text-xs h-9"
              />
            </div>

            {/* Method Switcher */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPayoutMethod("UPI")}
                className={`py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  payoutMethod === "UPI" ? "bg-emerald-600 text-white border-emerald-500" : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> UPI ID
              </button>

              <button
                onClick={() => setPayoutMethod("BANK")}
                className={`py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  payoutMethod === "BANK" ? "bg-emerald-600 text-white border-emerald-500" : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Bank Transfer
              </button>
            </div>

            {payoutMethod === "UPI" ? (
              <div>
                <label className="text-xs text-slate-300 font-medium mb-1 block">UPI ID (PhonePe/GPay/Paytm):</label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="username@upi"
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={bankDetails.holder_name}
                  onChange={(e) => setBankDetails({ ...bankDetails, holder_name: e.target.value })}
                  placeholder="Account Holder Name"
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
                <Input
                  value={bankDetails.account_number}
                  onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                  placeholder="Account Number"
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
                <Input
                  value={bankDetails.ifsc_code}
                  onChange={(e) => setBankDetails({ ...bankDetails, ifsc_code: e.target.value })}
                  placeholder="IFSC Code"
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>
            )}

            <Button
              onClick={handleWithdrawSubmit}
              disabled={submittingWithdraw}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-lg"
            >
              {submittingWithdraw ? "Submitting..." : "Submit Winnings Withdrawal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
