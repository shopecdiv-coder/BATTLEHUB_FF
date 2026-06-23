import React, { useState, useEffect } from "react";
import { Diamond } from "@/entities/Diamond";
import { RedeemRequest } from "@/entities/RedeemRequest";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { RedeemCode } from "@/entities/RedeemCode";
import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { AppSettings } from "@/entities/AppSettings";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { 
  Coins, ArrowUpCircle, ArrowDownCircle, CreditCard, TrendingUp, AlertTriangle, 
  Gem, Info, CheckCircle, XCircle, Wallet2, History, RefreshCw, ArrowRight,
  Gift, Banknote, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import BuyCoinsStepper from "../components/wallet/BuyCoinsStepper";
import PhoneNumberModal from "../components/wallet/PhoneNumberModal";
import CoinInvoiceDownload from "../components/wallet/CoinInvoiceDownload";
import { createPageUrl } from "@/utils";

export default function Wallet() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [coinAccount, setCoinAccount] = useState(null);
  const [redeemRequests, setRedeemRequests] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [redeemCodes, setRedeemCodes] = useState([]);
  const [codeAmount, setCodeAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeemAmount, setRedeemAmount] = useState(0);
  const [bankDetails, setBankDetails] = useState({ account_holder: "", account_number: "", ifsc_code: "", bank_name: "", upi_id: "", phone_number: "" });
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showDiamondInfo, setShowDiamondInfo] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [tutorialLink, setTutorialLink] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { loadData(); loadTutorialLink(); }, []);

  const loadTutorialLink = async () => {
    const settings = await AppSettings.filter({ setting_key: "wallet_tutorial_link" }).catch(() => []);
    if (settings.length > 0) setTutorialLink(settings[0].setting_value);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      if (!currentUser.mobile_number && !currentUser.phone) { setShowPhoneModal(true); setLoading(false); return; }
      const accounts = await Diamond.filter({ user_id: currentUser.id });
      if (accounts.length > 0) {
        setCoinAccount(accounts[0]);
      } else {
        const newAccount = await Diamond.create({ user_id: currentUser.id, user_ign: currentUser.ign || currentUser.full_name, diamond_balance: 0, bh_coin_balance: 0, transactions: [] });
        setCoinAccount(newAccount);
      }
      const [requests, payments, codes] = await Promise.all([
        RedeemRequest.filter({ user_id: currentUser.id }, "-created_date"),
        PaymentRequest.filter({ user_id: currentUser.id }, "-created_date"),
        RedeemCode.filter({ user_id: currentUser.id }, "-created_date")
      ]);
      setRedeemRequests(requests);
      setPaymentRequests(payments);
      setRedeemCodes(codes);
    } catch (e) { setError("Failed to load wallet"); }
    setLoading(false);
  };

  const bhCoins = coinAccount?.bh_coin_balance || 0;
  const diamonds = coinAccount?.diamond_balance || 0;

  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(false);

  const handleRedeem = async () => {
    if (redeemAmount < 1 || redeemAmount > bhCoins) { setError(`Invalid amount. Balance: ${bhCoins} BH Coins`); return; }
    if (!bankDetails.account_holder || (!bankDetails.upi_id && !bankDetails.phone_number && !bankDetails.account_number)) { setError("Please fill required fields"); return; }
    if (bankDetails.account_number && !bankDetails.ifsc_code) { setError("IFSC code required for bank account"); return; }
    setSubmitting(true);
    setError("");
    try {
      // First deduct coins, then create request
      const now = new Date().toISOString();
      const updatedTransactions = [...(coinAccount.transactions || []), { type: "Redeem", coin_type: "BH Coin", amount: -redeemAmount, description: `Redeem request for ₹${redeemAmount}`, timestamp: now }];
      await Diamond.update(coinAccount.id, { bh_coin_balance: bhCoins - redeemAmount, transactions: updatedTransactions });
      await RedeemRequest.create({ user_id: user.id, user_ign: user.ign || user.full_name, diamond_amount: redeemAmount, inr_amount: redeemAmount, bank_details: bankDetails, status: "Pending", admin_notes: "Processing within 10 hours" });
      await Notification.create({ recipient_id: user.id, type: "Prize Distributed", title: "🏦 Redeem Request Submitted", message: `Request to redeem ${redeemAmount} coins (₹${redeemAmount}) submitted.`, link: createPageUrl("Wallet"), priority: "Medium", dismissable: true, created_at: now }).catch(() => null);
      await loadData();
      setRedeemAmount(0);
      setBankDetails({ account_holder: "", account_number: "", ifsc_code: "", bank_name: "", upi_id: "", phone_number: "" });
      setRedeemSuccess(true);
      setTimeout(() => setRedeemSuccess(false), 4000);
    } catch (e) {
      console.error("Redeem error:", e);
      setError("Failed to submit redeem request. Please try again.");
    }
    setSubmitting(false);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Wallet2 },
    { id: "history", label: "Transactions", icon: History },
    { id: "redeem", label: "Redeem", icon: TrendingUp },
    { id: "codes", label: "Get Code", icon: Gift },
  ];

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 border-b border-gray-800 px-4 pt-6 pb-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <Wallet2 className="w-7 h-7 text-orange-400" /> BattleHub Wallet
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">{user?.ign || user?.full_name}</p>
            </div>
            <button onClick={loadData} className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* BH Coin */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Coins className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="text-xs text-gray-400 font-medium">BH Coin</span>
              </div>
              <p className="text-4xl font-black text-yellow-400">{bhCoins.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">≈ ₹{bhCoins.toLocaleString()}</p>
              <button
                onClick={() => setShowBuyModal(true)}
                className="mt-3 w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-semibold rounded-lg py-1.5 flex items-center justify-center gap-1"
              >
                <CreditCard className="w-3 h-3" /> Buy More
              </button>
            </div>
            {/* Diamond */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Gem className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Diamond</span>
                </div>
                <button onClick={() => setShowDiamondInfo(true)} className="text-purple-400/60 hover:text-purple-400">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-4xl font-black text-purple-400">{diamonds.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Earned currency</p>
              <button
                onClick={() => navigate(createPageUrl("EarnDiamonds"))}
                className="mt-3 w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-semibold rounded-lg py-1.5 flex items-center justify-center gap-1"
              >
                <Gem className="w-3 h-3" /> Earn More
              </button>
            </div>
          </div>

          {/* Buy Coins CTA */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowBuyModal(true)}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
            >
              <CreditCard className="w-5 h-5" /> Buy BH Coins Now
              <ArrowRight className="w-4 h-4" />
            </button>
            {tutorialLink && (
              <button
                onClick={() => setShowHelpPopup(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 rounded-2xl flex items-center justify-center gap-1.5"
                title="Watch Tutorial"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === t.id ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <t.icon className="w-3 h-3" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {error && (
          <Alert className="bg-red-500/10 border-red-500/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Purchases</p>
                <p className="text-2xl font-black text-yellow-400">{paymentRequests.length}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Redeemed</p>
                <p className="text-2xl font-black text-green-400">{redeemRequests.length}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Txns</p>
                <p className="text-2xl font-black text-blue-400">{coinAccount?.transactions?.length || 0}</p>
              </div>
            </div>

            {/* Purchase History */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-yellow-400" /> Purchase History</h3>
                <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">{paymentRequests.length}</Badge>
              </div>
              {paymentRequests.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-600 text-sm">No purchases yet</div>
              ) : (
                <div className="divide-y divide-gray-800/50 max-h-64 overflow-y-auto">
                  {paymentRequests.map((req) => (
                    <div key={req.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
                            <Coins className="w-4 h-4 text-yellow-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">+{req.diamond_amount} 🪙</p>
                            <p className="text-xs text-gray-500">{format(new Date(req.created_date), "dd MMM, HH:mm")}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`text-xs mb-1 ${req.status === "Verified" ? "bg-green-500/20 text-green-400" : req.status === "Rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>{req.status}</Badge>
                          <p className="text-xs text-gray-400">₹{req.inr_amount}</p>
                        </div>
                      </div>
                      {req.transaction_id && <p className="text-xs text-gray-600 ml-10">Txn: {req.transaction_id}</p>}
                      <div className="ml-10 mt-1"><CoinInvoiceDownload paymentRequest={req} user={user} /></div>
                      {req.admin_notes && <p className="text-xs text-blue-400 ml-10 mt-1">{req.admin_notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Redeem History */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2"><Banknote className="w-4 h-4 text-green-400" /> Redeem Requests</h3>
                <Badge className="bg-green-500/20 text-green-400 text-xs">{redeemRequests.length}</Badge>
              </div>
              {redeemRequests.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-600 text-sm">No redeem requests yet</div>
              ) : (
                <div className="divide-y divide-gray-800/50 max-h-48 overflow-y-auto">
                  {redeemRequests.map((req) => (
                    <div key={req.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
                          <ArrowUpCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">₹{req.inr_amount}</p>
                          <p className="text-xs text-gray-500">{format(new Date(req.created_date), "dd MMM yyyy")}</p>
                        </div>
                      </div>
                      <Badge className={`text-xs ${req.status === "Completed" ? "bg-green-500/20 text-green-400" : req.status === "Rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>{req.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === "history" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2"><History className="w-4 h-4 text-blue-400" /> All Transactions</h3>
            </div>
            {!coinAccount?.transactions?.length ? (
              <div className="px-4 py-16 text-center text-gray-600">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-800" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {coinAccount.transactions.slice().reverse().map((tx, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.amount > 0 ? "bg-green-500/15" : "bg-red-500/15"}`}>
                        {tx.amount > 0 ? <ArrowUpCircle className="w-4 h-4 text-green-400" /> : <ArrowDownCircle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{tx.description}</p>
                        <p className="text-xs text-gray-500">{tx.timestamp ? format(new Date(tx.timestamp), "dd MMM, HH:mm") : ""}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </p>
                      <p className="text-xs text-gray-600">{tx.coin_type === "Diamond" ? "💎" : "🪙"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REDEEM TAB */}
        {activeTab === "redeem" && (
          <div className="space-y-4">
            {/* Available balance indicator */}
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Available to Redeem</p>
                <p className="text-3xl font-black text-green-400">{bhCoins} <span className="text-base text-gray-400">BH Coins</span></p>
                <p className="text-xs text-green-500">≈ ₹{bhCoins}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500/30" />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2"><Banknote className="w-5 h-5 text-green-400" /> Redeem BH Coins</h3>
              
              <div>
                <Label className="text-gray-400 text-xs">Amount (BH Coins)</Label>
                <Input type="number" min="1" max={bhCoins} value={redeemAmount} onChange={(e) => setRedeemAmount(parseInt(e.target.value) || 0)} className="bg-gray-800 border-gray-700 text-white mt-1 rounded-xl" disabled={submitting} />
                {redeemAmount > 0 && <p className="text-xs text-green-400 mt-1">💰 You'll receive: ₹{redeemAmount}</p>}
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Account Holder Name *</Label>
                <Input value={bankDetails.account_holder} onChange={(e) => setBankDetails({...bankDetails, account_holder: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-1 rounded-xl" disabled={submitting} />
              </div>

              <div className="space-y-3">
                <Label className="text-gray-400 text-xs">Payment Method (Pick any one)</Label>
                
                <div>
                  <Label className="text-gray-500 text-xs">UPI ID</Label>
                  <Input value={bankDetails.upi_id} onChange={(e) => setBankDetails({...bankDetails, upi_id: e.target.value, phone_number: "", account_number: "", ifsc_code: "", bank_name: ""})} placeholder="example@upi" className="bg-gray-800 border-gray-700 text-white mt-1 rounded-xl" disabled={submitting || !!bankDetails.phone_number || !!bankDetails.account_number} />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-800"></div>
                  <span className="text-gray-600 text-xs">OR</span>
                  <div className="flex-1 h-px bg-gray-800"></div>
                </div>

                <div>
                  <Label className="text-gray-500 text-xs">Phone (UPI)</Label>
                  <Input value={bankDetails.phone_number} onChange={(e) => setBankDetails({...bankDetails, phone_number: e.target.value, upi_id: "", account_number: "", ifsc_code: "", bank_name: ""})} placeholder="+91XXXXXXXXXX" className="bg-gray-800 border-gray-700 text-white mt-1 rounded-xl" disabled={submitting || !!bankDetails.upi_id || !!bankDetails.account_number} />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-800"></div>
                  <span className="text-gray-600 text-xs">OR</span>
                  <div className="flex-1 h-px bg-gray-800"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-500 text-xs">Bank Account No.</Label>
                    <Input value={bankDetails.account_number} onChange={(e) => setBankDetails({...bankDetails, account_number: e.target.value, upi_id: "", phone_number: ""})} placeholder="XXXXXXXXXXXX" className="bg-gray-800 border-gray-700 text-white mt-1 rounded-xl" disabled={submitting || !!bankDetails.upi_id || !!bankDetails.phone_number} />
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">IFSC Code</Label>
                    <Input value={bankDetails.ifsc_code} onChange={(e) => setBankDetails({...bankDetails, ifsc_code: e.target.value})} placeholder="SBIN0001234" className="bg-gray-800 border-gray-700 text-white mt-1 rounded-xl" disabled={submitting || !bankDetails.account_number} />
                  </div>
                </div>
                {bankDetails.account_number && (
                  <div>
                    <Label className="text-gray-500 text-xs">Bank Name</Label>
                    <Input value={bankDetails.bank_name} onChange={(e) => setBankDetails({...bankDetails, bank_name: e.target.value})} placeholder="State Bank of India" className="bg-gray-800 border-gray-700 text-white mt-1 rounded-xl" disabled={submitting} />
                  </div>
                )}
              </div>

              {redeemSuccess && (
                <div className="bg-green-500/15 border border-green-500/30 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-bold text-lg">✅ Redeem Request Submitted!</p>
                  <p className="text-gray-400 text-sm mt-1">Admin will process within 10 hours.</p>
                </div>
              )}
              <Button
                onClick={handleRedeem}
                disabled={redeemSuccess || redeemAmount < 1 || redeemAmount > bhCoins || !bankDetails.account_holder || (!bankDetails.upi_id && !bankDetails.phone_number && !bankDetails.account_number) || (bankDetails.account_number && !bankDetails.ifsc_code) || submitting}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 py-6 rounded-xl font-bold text-base"
              >
                {submitting ? "Processing..." : redeemSuccess ? "Submitted ✅" : `Redeem ₹${redeemAmount || 0}`}
              </Button>
            </div>
          </div>
        )}

        {/* GET CODE TAB */}
        {activeTab === "codes" && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2"><Gift className="w-5 h-5 text-purple-400" /> Get Redeem Code</h3>
              <p className="text-xs text-gray-500">Convert your BH Coins to a redeemable code</p>
              
              <div>
                <Label className="text-gray-400 text-xs">BH Coins to Convert</Label>
                <Input type="number" min="1" max={bhCoins} value={codeAmount} onChange={(e) => setCodeAmount(parseInt(e.target.value) || 0)} className="bg-gray-800 border-gray-700 text-white mt-1 rounded-xl" disabled={submitting} />
                <p className="text-xs text-gray-600 mt-1">Available: {bhCoins} BH Coins</p>
              </div>

              {codeSuccess && (
                <div className="bg-green-500/15 border border-green-500/30 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-bold text-lg">✅ Code Request Submitted!</p>
                  <p className="text-gray-400 text-sm mt-1">Admin will send your code shortly.</p>
                </div>
              )}
              <Button
                onClick={async () => {
                  if (codeAmount < 1 || codeAmount > bhCoins) { setError("Invalid amount"); return; }
                  setSubmitting(true);
                  try {
                    await RedeemCode.create({ user_id: user.id, user_ign: user.ign || user.full_name, coin_amount: codeAmount, status: "Pending" });
                    const now = new Date().toISOString();
                    await Diamond.update(coinAccount.id, { bh_coin_balance: bhCoins - codeAmount, transactions: [...(coinAccount.transactions || []), { type: "Redeem", coin_type: "BH Coin", amount: -codeAmount, description: `Code request for ${codeAmount} coins`, timestamp: now }] });
                    await Notification.create({ recipient_id: user.id, type: "App Update", title: "🎁 Code Requested", message: `Request for ${codeAmount} coins code submitted!`, link: createPageUrl("Wallet"), priority: "High", dismissable: true, created_at: now }).catch(() => null);
                    await loadData(); setCodeAmount(0); setCodeSuccess(true); setTimeout(() => setCodeSuccess(false), 4000);
                  } catch (e) { console.error(e); setError("Failed to request code. Try again."); }
                  setSubmitting(false);
                }}
                disabled={submitting || codeAmount < 1 || codeAmount > bhCoins}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 py-5 rounded-xl font-bold"
              >
                {submitting ? "Processing..." : "Request Redeem Code"}
              </Button>
            </div>

            {/* Code history */}
            {redeemCodes.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="font-bold text-white text-sm">Your Code Requests</h3>
                </div>
                <div className="divide-y divide-gray-800/50">
                  {redeemCodes.map((code) => (
                    <div key={code.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-500/15 rounded-full flex items-center justify-center">
                            <Gift className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{code.coin_amount} Coins</p>
                            <p className="text-xs text-gray-500">{format(new Date(code.created_date), "dd MMM, HH:mm")}</p>
                          </div>
                        </div>
                        <Badge className={code.status === "Sent" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>{code.status}</Badge>
                      </div>
                      {code.redeem_code && (
                        <div className="ml-10 flex items-center gap-2 mt-1">
                          <code className="text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded text-sm">{code.redeem_code}</code>
                          <Button size="sm" onClick={() => { navigator.clipboard.writeText(code.redeem_code); alert("Copied!"); }} className="bg-purple-600/80 text-xs h-7 px-2">Copy</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <PhoneNumberModal open={showPhoneModal} onClose={() => setShowPhoneModal(false)} user={user} onPhoneSaved={(phone) => { setUser({...user, mobile_number: phone, phone: phone}); setShowPhoneModal(false); loadData(); }} />
      <BuyCoinsStepper open={showBuyModal} onClose={(shouldRefresh) => { setShowBuyModal(false); if (shouldRefresh) loadData(); }} user={user} />

      <Dialog open={showDiamondInfo} onOpenChange={setShowDiamondInfo}>
        <DialogContent className="bg-gray-900 border-purple-500/30 max-w-sm rounded-2xl">
          <div className="space-y-4 p-2">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Gem className="w-9 h-9 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">What are Diamonds?</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: CheckCircle, color: "text-green-400", text: "Earn by completing tasks in Earn Diamonds section" },
                { icon: CheckCircle, color: "text-green-400", text: "Use for tournament entry (1💎 = 1🪙)" },
                { icon: XCircle, color: "text-red-400", text: "Cannot be purchased with real money" },
                { icon: XCircle, color: "text-red-400", text: "Cannot be withdrawn to bank" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <item.icon className={`w-4 h-4 ${item.color} mt-0.5 flex-shrink-0`} />
                  <p className="text-sm text-gray-300">{item.text}</p>
                </div>
              ))}
            </div>
            <Button onClick={() => { setShowDiamondInfo(false); navigate(createPageUrl("EarnDiamonds")); }} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              Go Earn Diamonds
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHelpPopup} onOpenChange={setShowHelpPopup}>
        <DialogContent className="bg-gray-900 border-blue-500/30 max-w-sm rounded-2xl">
          <div className="space-y-4 p-2 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-9 h-9 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">Watch Tutorial</h3>
            <p className="text-gray-400 text-sm">Learn how to buy BH Coins step by step</p>
            <a href={tutorialLink} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-red-600 hover:bg-red-700 rounded-xl">Watch on YouTube</Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}