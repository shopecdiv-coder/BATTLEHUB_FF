import React, { useState, useEffect } from "react";
import { WalletEngine } from "@/lib/walletEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Coins, Gift, Flame, Tv, History, RefreshCw, Sparkles, CheckCircle2, 
  ShieldCheck, Award, Trophy, Lock
} from "lucide-react";
import { format } from "date-fns";

export default function WalletPlayStore() {
  const [data, setData] = useState({ 
    bonus: 0, winnings: 0, deposit: 0, coins: 0, 
    transactions: [], redeemRequests: [] 
  });
  const [loading, setLoading] = useState(true);
  const [watchingAd, setWatchingAd] = useState(false);
  const [adSuccessModal, setAdSuccessModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [playerUidInput, setPlayerUidInput] = useState("");
  const [submittingRedeem, setSubmittingRedeem] = useState(false);
  const [activeTab, setActiveTab] = useState("store");

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchWallet();
    const unsubscribe = WalletEngine.subscribeToUpdates(() => {
      fetchWallet(true);
    });
    return () => unsubscribe();
  }, []);

  const fetchWallet = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setIsRefreshing(true);
    }
    const res = await WalletEngine.getWalletData();
    if (res.success) {
      setData({
        bonus: res.bonus || 0,
        winnings: res.winnings || 0,
        deposit: res.deposit || 0,
        coins: res.totalCoins || res.coins || 0,
        transactions: res.transactions || [],
        redeemRequests: res.redeemRequests || []
      });
    }
    if (!isSilent) {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleWatchAd = async () => {
    setWatchingAd(true);
    setTimeout(async () => {
      const res = await WalletEngine.creditCoins(5, "BONUS", "REWARD_AD", "Watched Video Ad");
      setWatchingAd(false);
      if (res.success) {
        setAdSuccessModal(true);
        fetchWallet();
      }
    }, 2500);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward) return;
    if (!playerUidInput.trim()) {
      alert("Please enter your Game UID / Email address");
      return;
    }

    setSubmittingRedeem(true);
    const res = await WalletEngine.requestRedeem(
      selectedReward.type,
      selectedReward.title,
      selectedReward.coins,
      playerUidInput.trim()
    );
    setSubmittingRedeem(false);

    if (res.success) {
      alert(`Success! Requested ${selectedReward.title}. Items will be credited shortly!`);
      setSelectedReward(null);
      setPlayerUidInput("");
      fetchWallet();
    } else {
      alert(res.error || "Failed to redeem");
    }
  };

  const redeemCatalog = [
    { id: 1, type: "FF_DIAMONDS", title: "110 Free Fire Diamonds", coins: 100, icon: Flame, color: "from-cyan-500 to-blue-600", popular: true },
    { id: 2, type: "GPLAY_CODE", title: "₹50 Google Play Code", coins: 50, icon: Gift, color: "from-emerald-500 to-teal-600", popular: true },
    { id: 3, type: "RAPIDO_VOUCHER", title: "₹30 Rapido Ride Voucher", coins: 30, icon: Trophy, color: "from-amber-500 to-yellow-600" },
    { id: 4, type: "UBER_CODE", title: "₹50 Uber Ride Voucher", coins: 50, icon: Award, color: "from-slate-700 to-slate-900" },
    { id: 5, type: "AMAZON_CODE", title: "₹100 Amazon Pay Voucher", coins: 100, icon: Gift, color: "from-orange-500 to-amber-600" },
    { id: 6, type: "FLIPKART_CODE", title: "₹100 Flipkart Gift Card", coins: 100, icon: Award, color: "from-blue-600 to-indigo-700" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* ── TOP CLEAN MINIMAL DARK BANNER ── */}
      <div className="bg-slate-950 p-4 pt-6 border-b border-slate-800/60 relative">
        <div className="max-w-md mx-auto space-y-3">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                <Coins className="w-4 h-4 text-orange-400" />
              </div>
              <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">
                Total Wallet Balance
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => window.dispatchEvent(new CustomEvent("open-gift-mailbox"))}
                size="icon"
                variant="ghost"
                className="relative w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/20 transition-all active:scale-90"
                title="Gift Mailbox"
              >
                <Gift className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => fetchWallet(false)}
                size="icon"
                variant="ghost"
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all active:scale-90"
                title="Refresh Wallet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? "animate-spin text-orange-400" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Primary Balance Card Box (Matching Web Wallet Box) */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BHCoinIcon className="w-11 h-11 shrink-0" />
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  {loading ? "..." : (Number(data?.coins || (data.deposit + data.bonus + data.winnings) || 0))}
                </h1>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  TOTAL BH COINS
                </span>
              </div>
            </div>
          </div>

          {/* 3-Bucket Balance Breakdown (Clean Dark Slate) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase block truncate">
                BH Coins
              </span>
              <span className="text-xs font-extrabold text-white">{data.deposit}</span>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase block truncate">
                Bonus Coins
              </span>
              <span className="text-xs font-extrabold text-white">{data.bonus}</span>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase block truncate">
                Winnings
              </span>
              <span className="text-xs font-extrabold text-white">₹{data.winnings}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="max-w-md mx-auto p-3 space-y-4">
        {/* Quick Watch Ad Card */}
        <Card className="bg-slate-900 border-slate-800 shadow-md relative overflow-hidden">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                <Tv className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Watch Video Ad <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] border-0">+5 BONUS</Badge>
                </h3>
                <p className="text-[10px] text-slate-400">Earn instant bonus coins</p>
              </div>
            </div>

            <Button
              onClick={handleWatchAd}
              disabled={watchingAd}
              size="sm"
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs h-8 rounded-xl px-4 shadow-md shadow-orange-500/20 shrink-0 active:scale-95 transition-all"
            >
              {watchingAd ? (
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <span>Watch</span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Navigation Tabs (Sleek Bottom Line Style - NO BOXES) */}
        <div className="flex items-center justify-around border-b border-slate-800/80 pt-2 pb-0 px-2">
          <button
            onClick={() => setActiveTab("store")}
            className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-1.5 transition-all relative ${
              activeTab === "store" ? "text-orange-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Gift className={`w-3.5 h-3.5 ${activeTab === "store" ? "text-orange-400" : "text-slate-500"}`} />
            <span>Redeem Store</span>
            {activeTab === "store" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-sm shadow-orange-500/50" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-1.5 transition-all relative ${
              activeTab === "history" ? "text-orange-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className={`w-3.5 h-3.5 ${activeTab === "history" ? "text-orange-400" : "text-slate-500"}`} />
            <span>Redeem History</span>
            {activeTab === "history" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-sm shadow-orange-500/50" />
            )}
          </button>
        </div>

        {/* ── TAB 1: REDEEM STORE ── */}
        {activeTab === "store" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 pt-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Reward
              </h2>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 100% Verified Redeem
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {redeemCatalog.map((item) => (
                <Card
                  key={item.id}
                  onClick={() => setSelectedReward(item)}
                  className="bg-slate-900 border-slate-800 hover:border-orange-500/50 cursor-pointer transition-all hover:scale-[1.02] relative overflow-hidden group shadow-md"
                >
                  {item.popular && (
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg">
                      Popular
                    </div>
                  )}

                  <CardContent className="p-3.5 flex flex-col items-center text-center space-y-2">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{item.title}</h4>
                      <Badge className="bg-orange-500/15 text-orange-400 text-[10px] font-extrabold border border-orange-500/30 mt-1">
                        {item.coins} COINS
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 2: REDEEM HISTORY ── */}
        {activeTab === "history" && (
          <div className="space-y-2.5">
            {data.redeemRequests.length === 0 ? (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="py-10 text-center text-slate-400 text-xs">
                  <History className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  No redeem requests placed yet
                </CardContent>
              </Card>
            ) : (
              data.redeemRequests.map((req, i) => (
                <Card key={req.id || i} className="bg-slate-900 border-slate-800 shadow-md">
                  <CardContent className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-extrabold text-white">
                          {req.reward_title || req.item_name || req.title || req.reward_type || "Reward Redeem"}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {req.target_account || req.player_uid || req.account_number ? `Account/UID: ${req.target_account || req.player_uid || req.account_number}` : ""}
                          {req.coins_spent || req.amount ? ` • ${req.coins_spent || req.amount} Coins` : ""}
                        </p>
                      </div>

                      <Badge className={`text-[9px] font-bold shrink-0 ${
                        req.status === "Approved" || req.status === "Completed"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : req.status === "Rejected"
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}>
                        {req.status || "Pending"}
                      </Badge>
                    </div>

                    {/* Issued Code / PIN Display Box */}
                    {(req.voucher_code || req.code || req.redeem_code) && (
                      <div className="p-2 bg-slate-950 rounded-xl border border-orange-500/30 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Voucher Code</span>
                          <span className="text-xs font-mono font-extrabold text-orange-400 selection:bg-orange-500/30">
                            {req.voucher_code || req.code || req.redeem_code}
                          </span>
                          {(req.voucher_pin || req.pin) && (
                            <span className="text-[10px] text-slate-300 font-mono ml-2">
                              (PIN: {req.voucher_pin || req.pin})
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[9px] font-bold text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg"
                          onClick={() => {
                            navigator.clipboard.writeText(req.voucher_code || req.code || req.redeem_code);
                            alert("Voucher Code copied to clipboard!");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    )}

                    <div className="text-[9px] text-slate-500 flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                      <span>
                        {req.created_date || req.created_at || req.date
                          ? format(new Date(req.created_date || req.created_at || req.date), "dd MMM yyyy, hh:mm a")
                          : "Recently Placed"}
                      </span>
                      <span className="font-mono text-slate-400">ID: #{req.id ? String(req.id).slice(-6) : (i + 1)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── AD SUCCESS MODAL ── */}
      <Dialog open={adSuccessModal} onOpenChange={setAdSuccessModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-xs rounded-2xl text-center">
          <div className="py-4 space-y-3 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">+5 Bonus Coins Credited!</h3>
              <p className="text-xs text-slate-400 mt-0.5">Watched Video Ad Bonus</p>
            </div>
            <Button
              onClick={() => setAdSuccessModal(false)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-8 rounded-lg px-6"
            >
              Great!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── REDEEM CONFIRMATION MODAL ── */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              Redeem {selectedReward?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block font-medium">Cost:</span>
              <span className="text-lg font-black text-amber-400">{selectedReward?.coins} Coins</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium mb-1 block">
                Enter Free Fire UID / Google Play Email:
              </label>
              <Input
                value={playerUidInput}
                onChange={(e) => setPlayerUidInput(e.target.value)}
                placeholder="e.g. 598124012"
                className="bg-slate-950 border-slate-800 text-white text-xs h-9"
              />
            </div>

            <Button
              onClick={handleConfirmRedeem}
              disabled={submittingRedeem}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 rounded-xl shadow-lg"
            >
              {submittingRedeem ? "Processing..." : "Confirm & Redeem"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
