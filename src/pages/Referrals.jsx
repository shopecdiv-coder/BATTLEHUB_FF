import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Referral } from "@/entities/Referral";
import { Diamond } from "@/entities/Diamond";
import { AppSettings } from "@/entities/AppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, ArrowLeft, RefreshCw, Coins, CheckCircle2, UserPlus, Users, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const getDeviceFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('BattleHub', 2, 2);
  const canvasData = canvas.toDataURL();
  
  const screenData = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const platform = navigator.platform;
  
  const combined = `${canvasData}-${screenData}-${timezone}-${language}-${platform}`;
  
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().substring(0, 12);
};

const BHCoinIcon = ({ className = "w-5 h-5" }) => (
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

export default function Referrals() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  
  // My Referrer State
  const [joinedVia, setJoinedVia] = useState(null);
  
  // Set default to 20 per user request
  const [rewardAmount, setRewardAmount] = useState(20);
  const [transferring, setTransferring] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState("");

  useEffect(() => {
    setDeviceFingerprint(getDeviceFingerprint());
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      const [settings, pageSettings, myReferrals, joinedViaRecords] = await Promise.all([
        AppSettings.filter({ setting_key: "referral_system" }).catch(() => []),
        AppSettings.filter({ setting_key: "referral_page_visible" }).catch(() => []),
        Referral.filter({ referrer_id: currentUser.id }, "-created_date").catch(() => []),
        Referral.filter({ referred_user_id: currentUser.id }).catch(() => [])
      ]);
      
      if (settings.length > 0) {
        setSystemEnabled(settings[0].is_enabled);
        if (settings[0].setting_value) {
          setRewardAmount(parseInt(settings[0].setting_value) || 20);
        }
      }

      if (pageSettings.length > 0) {
        setPageVisible(pageSettings[0].is_enabled);
      }

      setReferrals(myReferrals || []);

      if (joinedViaRecords && joinedViaRecords.length > 0) {
        setJoinedVia(joinedViaRecords[0]);
      }
      
      // Auto-generate code if none exists
      if (!currentUser.unique_id && currentUser.id) {
        const uniqueId = `BH${currentUser.id.substring(0, 6).toUpperCase()}`;
        await base44.auth.updateMe({ unique_id: uniqueId }).catch(() => {});
        setUser(prev => ({ ...prev, unique_id: uniqueId }));
      }
    } catch (error) {
      console.error("Error loading referrals:", error);
    }
    setLoading(false);
  };

  const transferToWallet = async () => {
    if (totalEarned <= 0) return;
    setTransferring(true);
    try {
      const accounts = await Diamond.filter({ user_id: user.id });
      const now = new Date().toISOString();
      
      if (accounts.length > 0) {
        const account = accounts[0];
        await Diamond.update(account.id, {
          bh_coin_balance: (account.bh_coin_balance || 0) + totalEarned,
          transactions: [...(account.transactions || []), {
            type: "Win",
            coin_type: "BH Coin",
            amount: totalEarned,
            description: `🎁 Referral bonus (${notTransferred.length} friends)`,
            timestamp: now
          }]
        });
      } else {
        await Diamond.create({
          user_id: user.id,
          user_ign: user.ign || user.full_name,
          bh_coin_balance: totalEarned,
          diamond_balance: 0,
          transactions: [{
            type: "Win",
            coin_type: "BH Coin",
            amount: totalEarned,
            description: `🎁 Referral bonus (${notTransferred.length} friends)`,
            timestamp: now
          }]
        });
      }

      for (const ref of notTransferred) {
        await Referral.update(ref.id, { transferred: true });
      }

      alert(`✅ ${totalEarned} BH Coins transferred to your wallet!`);
      loadData();
    } catch (error) {
      console.error("Error transferring:", error);
      alert("Failed to claim rewards.");
    }
    setTransferring(false);
  };

  const myReferralCode = user?.unique_id || 'N/A';
  const appDownloadLink = "https://battlehubff.site";

  const copyCode = () => {
    navigator.clipboard.writeText(myReferralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = () => {
    const text = `🎮 Join BattleHub and play competitive tournaments!\n\n🎁 Use my code: ${myReferralCode} to get started.\n\nDownload: ${appDownloadLink}`;
    if (navigator.share) {
      navigator.share({ title: "Join BattleHub!", text, url: appDownloadLink }).catch(()=>{});
    } else {
      copyCode();
    }
  };

  const completedReferrals = referrals.filter(r => r.status === "Completed");
  const pendingReferrals = referrals.filter(r => r.status === "Pending");
  const notTransferred = completedReferrals.filter(r => !r.transferred);
  
  const totalEarned = notTransferred.reduce((sum, r) => sum + (r.reward_amount || rewardAmount), 0);
  const lifetimeEarnings = completedReferrals.reduce((sum, r) => sum + (r.reward_amount || rewardAmount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 pb-24 ">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
             <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
             <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="h-48 bg-white/5 rounded-3xl animate-pulse" />
          <div className="h-24 bg-white/5 rounded-3xl animate-pulse" />
          <div className="h-24 bg-white/5 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!systemEnabled || !pageVisible) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <XCircle className="w-16 h-16 text-slate-700 mb-4" />
        <h2 className="text-xl font-bold text-slate-300">Referrals Disabled</h2>
        <Button onClick={() => navigate(-1)} className="mt-6">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 pb-20 ">
      <div className="max-w-md mx-auto space-y-3">
        
        {/* Header */}
        <div className="flex items-center gap-2 pb-1">
          <Button onClick={() => navigate(-1)} variant="ghost" size="icon" className="w-8 h-8 rounded-full text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-bold text-white">Refer & Earn</h1>
        </div>

        {/* Hero - Compact Banner */}
        <div className="rounded-[20px] bg-gradient-to-r from-red-600 to-purple-600 p-4 flex items-center justify-between shadow-lg">
          <div>
            <h2 className="text-lg font-black text-white">Get {rewardAmount} BH Coins</h2>
            <p className="text-white/80 text-[11px] leading-tight mt-0.5 max-w-[200px]">
              Invite friends to play their first paid match.
            </p>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-[12px] flex items-center justify-center shrink-0 border border-white/10">
            <BHCoinIcon className="w-6 h-6 drop-shadow-md" />
          </div>
        </div>

        {/* My Referrer Banner */}
        {joinedVia && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-[16px] p-2.5 flex items-center gap-2 justify-center">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-bold text-indigo-400">You were invited by {joinedVia.referrer_ign}</p>
          </div>
        )}

        {/* Code Box - Compact Single Row */}
        <div className="bg-slate-900 border border-white/5 rounded-[20px] p-3 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase ml-1">Your Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-11 bg-black/50 rounded-xl flex items-center justify-center border border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>
              <span className="text-sm font-bold tracking-widest text-white font-mono">{myReferralCode}</span>
            </div>
            <Button onClick={copyCode} className="h-11 w-11 p-0 rounded-xl bg-slate-800 text-white hover:bg-slate-700 shrink-0 border border-white/5">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button onClick={shareNative} className="h-11 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shrink-0">
              Share
            </Button>
          </div>
        </div>

        {/* Stats - Compact Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900 border border-white/5 rounded-[16px] p-3 text-center">
            <p className="text-lg font-black text-white">{referrals.length}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Friends</p>
          </div>
          <div className="bg-slate-900 border border-white/5 rounded-[16px] p-3 text-center">
            <p className="text-lg font-black text-amber-400">{lifetimeEarnings}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Earned</p>
          </div>
          <div className="bg-slate-900 border border-white/5 rounded-[16px] p-3 text-center">
            <p className="text-lg font-black text-slate-300">{pendingReferrals.length}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Pending</p>
          </div>
        </div>

        {/* Claim Rewards (Compact) */}
        {totalEarned > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[16px] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BHCoinIcon className="w-6 h-6 drop-shadow-sm" />
              <div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase">Ready to Claim</p>
                <p className="text-sm font-black text-white">{totalEarned} BH Coins</p>
              </div>
            </div>
            <Button 
              onClick={transferToWallet} 
              disabled={transferring}
              className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
            >
              {transferring ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Claim"}
            </Button>
          </div>
        )}

        {/* My Invites List */}
        {referrals.length > 0 && (
          <div className="bg-slate-900 border border-white/5 rounded-[20px] p-4 flex flex-col gap-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Invites</h3>
            <div className="space-y-2">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">{ref.referred_user_ign}</p>
                      <p className="text-[10px] text-slate-500">{new Date(ref.created_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {ref.transferred ? (
                      <span className="text-[11px] font-bold text-emerald-500 flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                      </span>
                    ) : ref.status === 'Completed' ? (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-500 flex items-center justify-end gap-1">
                        Pending Match
                      </span>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">{ref.reward_amount || rewardAmount} BH Coins</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works - Compact */}
        <div className="bg-slate-900 border border-white/5 rounded-[20px] p-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">How it works</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-orange-500 shrink-0">1</div>
              <p className="text-xs text-slate-300">Share your code with friends</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-orange-500 shrink-0">2</div>
              <p className="text-xs text-slate-300">Friend enters code & plays match</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">3</div>
              <p className="text-xs text-emerald-400 font-medium">You get {rewardAmount} BH Coins!</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
