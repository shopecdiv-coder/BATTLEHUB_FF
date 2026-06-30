import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Referral } from "@/entities/Referral";
import { Diamond } from "@/entities/Diamond";
import { AppSettings } from "@/entities/AppSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Gift, Copy, Share2, Users, CheckCircle, Clock, XCircle, Coins, Wallet, ArrowRight, Trophy, Zap, Star, Shield, UserPlus } from "lucide-react";

import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Generate device fingerprint to prevent multiple referrals from same device
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
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().substring(0, 12);
};

export default function Referrals() {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [rewardAmount, setRewardAmount] = useState(5);
  const [transferring, setTransferring] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  
  // Enter referral code
  const [enterCode, setEnterCode] = useState("");
  const [submittingCode, setSubmittingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");
  const [codeError, setCodeError] = useState(false);

  useEffect(() => {
    setDeviceFingerprint(getDeviceFingerprint());
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      // Load settings
      const [settings, pageSettings] = await Promise.all([
        AppSettings.filter({ setting_key: "referral_system" }).catch(() => []),
        AppSettings.filter({ setting_key: "referral_page_visible" }).catch(() => [])
      ]);
      
      if (settings.length > 0) {
        setSystemEnabled(settings[0].is_enabled);
        if (settings[0].setting_value) {
          setRewardAmount(parseInt(settings[0].setting_value) || 5);
        }
      }

      if (pageSettings.length > 0) {
        setPageVisible(pageSettings[0].is_enabled);
      }

      // Load user's referrals (where user is referrer)
      const myReferrals = await Referral.filter({ referrer_id: currentUser.id }, "-created_date").catch(() => []);
      setReferrals(myReferrals || []);
    } catch (error) {
      console.error("Error loading referrals:", error);
    }
    setLoading(false);
  };

  // Submit referral code - Creates PENDING referral
  const submitReferralCode = async () => {
    if (!enterCode.trim()) {
      setCodeMessage("Please enter a referral code");
      setCodeError(true);
      return;
    }

    setSubmittingCode(true);
    setCodeMessage("");
    setCodeError(false);

    try {
      // Check if user already used a referral code
      if (user.referred_by) {
        setCodeMessage("You have already used a referral code!");
        setCodeError(true);
        setSubmittingCode(false);
        return;
      }

      // Check if this device already used a referral code (fraud prevention)
      const savedDeviceFingerprint = localStorage.getItem('bh_device_ref');
      if (savedDeviceFingerprint) {
        setCodeMessage("This device has already used a referral code!");
        setCodeError(true);
        setSubmittingCode(false);
        return;
      }

      const inputCode = enterCode.trim().toUpperCase();

      // Check if user is trying to use their own code
      const myCode = user.unique_id || 'N/A';
      if (myCode === inputCode) {
        setCodeMessage("You cannot use your own code!");
        setCodeError(true);
        setSubmittingCode(false);
        return;
      }

      // Find referrer - first try by unique_id field directly
      let referrer = null;
      
      // Try to find by unique_id field
      const byUniqueId = await User.filter({ unique_id: inputCode }).catch(() => []);
      if (byUniqueId.length > 0) {
        referrer = byUniqueId[0];
      }
      
      // If not found by unique_id, try scanning recent users
      if (!referrer) {
        try {
          const allUsers = await User.list("-created_date", 200);
          referrer = allUsers.find(u => {
            const userCode = u.unique_id || 'N/A';
            return userCode === inputCode;
          });
        } catch (e) {
          // fallback
        }
      }

      if (!referrer) {
        setCodeMessage("Invalid referral code! Please check the code and try again.");
        setCodeError(true);
        setSubmittingCode(false);
        return;
      }

      // Check if referral already exists
      const existingReferral = await Referral.filter({ 
        referred_user_id: user.id 
      }).catch(() => []);

      if (existingReferral.length > 0) {
        setCodeMessage("You have already used a referral code!");
        setCodeError(true);
        setSubmittingCode(false);
        return;
      }

      // Create referral record with PENDING status
      await Referral.create({
        referrer_id: referrer.id,
        referrer_ign: referrer.ign || referrer.full_name,
        referred_user_id: user.id,
        referred_user_ign: user.ign || user.full_name,
        status: "Pending",
        reward_amount: rewardAmount,
        reward_credited: false,
        transferred: false
      });

      // Mark user as referred and save device fingerprint
      await base44.auth.updateMe({ 
        referred_by: referrer.id,
        device_fingerprint: deviceFingerprint
      });
      
      // Save device fingerprint to prevent same device from using another code
      localStorage.setItem('bh_device_ref', deviceFingerprint);

      setCodeMessage(`✅ Code applied! ${referrer.ign || referrer.full_name} will get 🪙 ${rewardAmount} BH Coins when you play your first paid tournament!`);
      setCodeError(false);
      setEnterCode("");
      
      const updatedUser = await User.me();
      setUser(updatedUser);

    } catch (error) {
      console.error("Error submitting code:", error);
      setCodeMessage("Failed to apply code. Please try again.");
      setCodeError(true);
    }
    setSubmittingCode(false);
  };

  // Transfer completed referral earnings to wallet
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
            description: `🎁 Referral bonus — ${notTransferred.length} referral(s) completed`,
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
            description: `🎁 Referral bonus — ${notTransferred.length} referral(s) completed`,
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
      alert("Failed to transfer. Please try again.");
    }
    setTransferring(false);
  };

  // App download link
  const appDownloadLink = "https://battlehubff.site";
  
  const myReferralCode = user?.unique_id || 'N/A';
  
  // Generate unique_id if not set
  useEffect(() => {
    if (user && !user.unique_id && user.id) {
      const uniqueId = `BH${user.id.substring(0, 6).toUpperCase()}`;
      base44.auth.updateMe({ unique_id: uniqueId }).catch(() => {});
    }
  }, [user]);

  const copyCode = () => {
    navigator.clipboard.writeText(myReferralCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(appDownloadLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `🎮 Join BattleHub and play Free Fire tournaments!\n\n🏆 Play matches and win real money!\n\n📱 Download: ${appDownloadLink}\n\n🎁 Use my code: ${myReferralCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareTelegram = () => {
    const text = `🎮 Join BattleHub and play Free Fire tournaments!\n\n🏆 Play matches and win real money!\n\n🎁 Use code: ${myReferralCode}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(appDownloadLink)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join BattleHub!",
        text: `🎮 Join BattleHub! Play Free Fire tournaments and win real money! 🏆\n\nDownload: ${appDownloadLink}\n\nUse code: ${myReferralCode}`,
        url: appDownloadLink
      });
    } else {
      copyLink();
    }
  };

  // Calculate earnings — use bh_coin_balance credits, not diamond
  const completedReferrals = referrals.filter(r => r.status === "Completed");
  const pendingReferrals = referrals.filter(r => r.status === "Pending");
  const notTransferred = completedReferrals.filter(r => !r.transferred);
  
  // Pending earnings = sum of pending referrals (not yet played tournament)
  const pendingEarnings = pendingReferrals.reduce((sum, r) => sum + (r.reward_amount || rewardAmount), 0);
  
  // Ready to claim = completed but not transferred
  const totalEarned = notTransferred.reduce((sum, r) => sum + (r.reward_amount || rewardAmount), 0);
  
  // Already in wallet
  const totalTransferred = completedReferrals.filter(r => r.transferred).reduce((sum, r) => sum + (r.reward_amount || rewardAmount), 0);
  
  // Lifetime = all completed (transferred + not transferred)
  const lifetimeEarnings = totalEarned + totalTransferred;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!systemEnabled || !pageVisible) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="bg-gray-900 border-gray-800 max-w-md">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-300 mb-2">Referral System Disabled</h2>
            <p className="text-gray-500">The referral program is currently not available. Please check back later!</p>
            <Link to={createPageUrl("Home")}>
              <Button className="mt-4">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Section */}
        <div className="text-center relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-6 md:p-8">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Gift className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white mb-2">
              Refer & Earn 🎁
            </h1>
            <p className="text-white/80 text-base md:text-lg">
              Get <span className="font-bold text-yellow-300">💎 {rewardAmount} Diamonds</span> when your friend plays their first tournament!
            </p>
          </div>
        </div>

        {/* ENTER REFERRAL CODE SECTION - Only show if user hasn't used a code yet */}
        {!user?.referred_by && (
          <div>
            <Card className="bg-gradient-to-br from-black via-blue-950 to-black border-2 border-blue-500/50 shadow-lg shadow-blue-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-400 text-center flex items-center justify-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Enter Friend's Account Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-400 text-sm text-center">
                  Got an account code from a friend? Enter it below (one time only!)
                </p>
                <div className="flex gap-2">
                  <Input
                    value={enterCode}
                    onChange={(e) => setEnterCode(e.target.value.toUpperCase())}
                    placeholder="BH6968F6"
                    maxLength={10}
                    className="bg-black/50 border-blue-500/50 text-white text-center text-lg font-mono uppercase"
                    disabled={submittingCode}
                  />
                  <Button
                    onClick={submitReferralCode}
                    disabled={submittingCode || !enterCode.trim()}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 px-6"
                  >
                    {submittingCode ? "..." : "Apply"}
                  </Button>
                </div>
                {codeMessage && (
                  <p className={`text-sm text-center ${codeError ? 'text-red-400' : 'text-green-400'}`}>
                    {codeMessage}
                  </p>
                )}
                <p className="text-xs text-gray-500 text-center">
                  ⚠️ Referrer gets ₹{rewardAmount} only when you play your first paid tournament
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Show if user already used a code */}
        {user?.referred_by && (
          <Card className="bg-green-900/30 border-green-500/30">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-semibold">You've already used a referral code!</p>
              <p className="text-gray-400 text-sm">Now share YOUR code below to earn rewards</p>
            </CardContent>
          </Card>
        )}

        {/* Your Referral Code & Link */}
        <div>
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-green-500/50 shadow-lg shadow-green-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-400 text-center flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Your Account Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Referral Code Display */}
              <div className="bg-black/50 rounded-2xl p-4 text-center border-2 border-dashed border-yellow-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5"></div>
                <p className="text-xs text-gray-400 mb-1">Your Account Code:</p>
                <p className="text-3xl md:text-4xl font-black text-yellow-400 tracking-wider relative z-10 font-mono">
                  {myReferralCode}
                </p>
                <p className="text-gray-500 text-xs mt-2">Share - ₹{rewardAmount} when friend plays first tournament!</p>
              </div>
              
              {/* Copy Code Button */}
              <Button
                onClick={copyCode}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 py-6 text-lg font-bold text-black"
              >
                <Copy className="w-5 h-5 mr-2" />
                {codeCopied ? "Code Copied! ✓" : "Copy Code"}
              </Button>

              {/* Copy Download Link Button */}
              <Button
                onClick={copyLink}
                variant="outline"
                className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10 py-5"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? "Link Copied! ✓" : "Copy App Download Link"}
              </Button>

              {/* Share Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={shareWhatsApp} className="bg-green-600 hover:bg-green-700 py-5">
                  <span className="text-lg mr-1">📱</span> WhatsApp
                </Button>
                <Button onClick={shareTelegram} className="bg-blue-500 hover:bg-blue-600 py-5">
                  <span className="text-lg mr-1">✈️</span> Telegram
                </Button>
                <Button onClick={shareNative} className="bg-purple-600 hover:bg-purple-700 py-5">
                  <Share2 className="w-4 h-4 mr-1" /> Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Overview */}
        <div>
          <Card className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-400 text-sm font-semibold">Lifetime Earnings (Completed)</p>
                  <p className="text-3xl font-black text-white">₹{lifetimeEarnings}</p>
                </div>
                <Trophy className="w-12 h-12 text-yellow-400/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid - 3 columns */}
        <div className="grid grid-cols-3 gap-3">
          {/* Pending Earnings - Not yet played */}
          <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <Clock className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
              <p className="text-xl font-black text-yellow-400">₹{pendingEarnings}</p>
              <p className="text-[10px] text-gray-400">Pending</p>
              <p className="text-[9px] text-gray-500">(Friend not played)</p>
            </CardContent>
          </Card>
          
          {/* Ready to Claim */}
          <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-500/30">
            <CardContent className="p-4 text-center">
              <Coins className="w-7 h-7 text-green-400 mx-auto mb-2" />
              <p className="text-xl font-black text-green-400">₹{totalEarned}</p>
              <p className="text-[10px] text-gray-400">Ready to Claim</p>
            </CardContent>
          </Card>
          
          {/* In Wallet */}
          <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <Wallet className="w-7 h-7 text-purple-400 mx-auto mb-2" />
              <p className="text-xl font-black text-purple-400">₹{totalTransferred}</p>
              <p className="text-[10px] text-gray-400">In Wallet</p>
            </CardContent>
          </Card>
        </div>

        {/* Transfer Button - Only show if there's something to claim */}
        {totalEarned > 0 && (
          <div>
            <Card className="bg-gradient-to-r from-green-600 to-emerald-600 border-0 shadow-lg shadow-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-lg">₹{totalEarned} Ready!</p>
                    <p className="text-white/80 text-sm">Transfer to wallet now</p>
                  </div>
                  <Button 
                    onClick={transferToWallet}
                    disabled={transferring}
                    className="bg-white text-green-600 hover:bg-gray-100 font-bold px-6"
                  >
                    {transferring ? "..." : "Claim"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gray-900/80 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <Clock className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-400">{pendingReferrals.length}</p>
              <p className="text-xs text-gray-400">Pending (Not Played Yet)</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/80 border-cyan-500/30">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-7 h-7 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-cyan-400">{completedReferrals.length}</p>
              <p className="text-xs text-gray-400">Successful Referrals</p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="bg-gray-900/80 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              How Referral Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { step: 1, text: "Share your CODE via WhatsApp, Telegram, Instagram", icon: Share2, color: "bg-blue-500" },
              { step: 2, text: "Friend downloads app & enters YOUR code", icon: UserPlus, color: "bg-purple-500" },
              { step: 3, text: "₹5 added to your PENDING earnings", icon: Clock, color: "bg-yellow-500" },
              { step: 4, text: "Friend plays FIRST paid tournament", icon: Trophy, color: "bg-orange-500" },
              { step: 5, text: `₹${rewardAmount} moves to READY - Claim to wallet!`, icon: Gift, color: "bg-green-500" }
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-xl">
                <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
                  {item.step}
                </div>
                <p className="text-gray-300 flex-1 text-sm">{item.text}</p>
                <item.icon className="w-5 h-5 text-gray-500" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Anti-Fraud Notice */}
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <p className="font-bold text-red-400 mb-1">⚠️ Fraud Prevention Active</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Each user can enter only ONE referral code ever</li>
                  <li>• Reward only given when friend plays PAID tournament</li>
                  <li>• Same device multiple accounts = No reward</li>
                  <li>• Self-referral = Account ban</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        <Card className="bg-gray-900/80 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Refer History ({referrals.length})</span>
              <Badge className="bg-green-500/20 text-green-400">
                Total: ₹{lifetimeEarnings}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No referrals yet</p>
                <p className="text-gray-600 text-sm mt-1">Start sharing your code!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {referrals.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        ref.status === "Completed" ? "bg-green-500/20" :
                        ref.status === "Pending" ? "bg-yellow-500/20" : "bg-red-500/20"
                      }`}>
                        {ref.status === "Completed" ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                         ref.status === "Pending" ? <Clock className="w-5 h-5 text-yellow-400" /> :
                         <XCircle className="w-5 h-5 text-red-400" />}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{ref.referred_user_ign || "Player"}</p>
                        <p className="text-xs text-gray-500">
                          {ref.status === "Completed" 
                            ? `Played Tournament - ₹${ref.reward_amount || rewardAmount} ${ref.transferred ? '(In Wallet)' : '(Ready to Claim)'}` 
                            : ref.status === "Pending" 
                              ? `Waiting to play tournament - ₹${ref.reward_amount || rewardAmount} Pending` 
                              : ref.invalid_reason || "Invalid"}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      ref.status === "Completed" ? "bg-green-500/20 text-green-400 border-green-500/50" :
                      ref.status === "Pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" :
                      "bg-red-500/20 text-red-400 border-red-500/50"
                    }>
                      {ref.status === "Completed" ? `+₹${ref.reward_amount || rewardAmount}` : 
                       ref.status === "Pending" ? "Pending" : "Invalid"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}