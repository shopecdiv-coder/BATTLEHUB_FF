import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, MessageCircle, Send, Copy, Mail, Twitter, Instagram, Gift, Info } from "lucide-react";
import { toast } from "sonner";

export default function ShareApp() {
  const [copied, setCopied] = useState(false);
  
  const appUrl = "https://battlehubff.site";
  const shareMessage = `🎮 Join BattleHub - Esports & Gaming Tournament Platform!\n\n🏆 Play competitive matches and tournaments!\n💰 Daily tournaments with exciting prizes\n⚡ Instant payouts\n\nJoin now: ${appUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    toast.success("App link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform) => {
    let url = "";
    switch(platform) {
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        break;
      case "telegram":
        url = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(shareMessage)}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
        break;
      case "email":
        url = `mailto:?subject=Join BattleHub&body=${encodeURIComponent(shareMessage)}`;
        break;
      case "instagram":
        navigator.clipboard.writeText(appUrl);
        toast.info("Link copied! Paste it in your Instagram bio or story.");
        return;
      default:
        if (navigator.share) {
          navigator.share({ title: "BattleHub", text: shareMessage, url: appUrl })
            .catch(() => {});
        } else {
          handleCopy();
        }
    }
    if (url) window.open(url, '_blank');
  };

  const sharePlatforms = [
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/20" },
    { id: "telegram", label: "Telegram", icon: Send, color: "text-orange-500 bg-orange-600/10 border-orange-600/20 hover:border-orange-600/40 hover:bg-orange-600/20" },
    { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400 bg-pink-500/10 border-pink-500/20 hover:border-pink-500/40 hover:bg-pink-500/20" },
    { id: "twitter", label: "Twitter", icon: Twitter, color: "text-slate-400 bg-slate-500/10 border-slate-500/20 hover:border-slate-500/40 hover:bg-slate-500/20" },
    { id: "email", label: "Email", icon: Mail, color: "text-indigo-400 bg-red-500/10 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/20" },
    { id: "more", label: "More", icon: Share2, color: "text-rose-400 bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/20" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 md:p-8 pb-32">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-orange-600/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Title Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 uppercase">
            Share App
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm font-medium tracking-wide">
            Invite your friends & dominate the leaderboard together
          </p>
        </div>

        {/* Copy Link Card */}
        <Card className="bg-[#0b0c10]/60 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <CardContent className="p-6 space-y-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">App Link</span>
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl p-1.5 pl-4">
              <input
                readOnly
                value={appUrl}
                className="flex-1 bg-transparent text-sm text-slate-300 outline-none select-all"
              />
              <Button 
                onClick={handleCopy} 
                className="h-10 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-orange-500 hover:text-white rounded-lg flex items-center justify-center px-4 transition-all"
              >
                {copied ? <span className="text-xs font-bold text-emerald-400">Copied</span> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Share Grid */}
        <Card className="bg-[#0b0c10]/60 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <CardContent className="p-6">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-4">Share Via</span>
            <div className="grid grid-cols-3 gap-3">
              {sharePlatforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => handleShare(platform.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 active:scale-95 group relative ${platform.color}`}
                  >
                    <Icon className="w-6 h-6 mb-2 transition-transform group-hover:scale-110 duration-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-white transition-colors">
                      {platform.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Gift / Refer Bonus Banner */}
        <div className="bg-gradient-to-r from-orange-600/10 to-red-500/10 border border-orange-600/20 rounded-3xl p-5 flex items-center gap-4 relative overflow-hidden shadow-lg">
          <div className="w-12 h-12 bg-orange-600/20 border border-orange-600/30 rounded-2xl flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6 text-orange-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Referral Reward</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Share your referral code from settings & earn bonus diamonds for every sign-up!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}