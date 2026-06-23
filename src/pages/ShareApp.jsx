import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, MessageCircle, Send, Copy, Mail, Twitter, Instagram } from "lucide-react";

export default function ShareApp() {
  const [copied, setCopied] = useState(false);
  
  const appUrl = "https://battlehubff.site";
  const shareMessage = `🎮 Join BattleHub - Free Fire Tournament Platform!\n\n🏆 Play competitive matches and tournaments!\n💰 Daily tournaments with exciting prizes\n⚡ Instant payouts\n\nJoin now: ${appUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
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
        alert("📱 Copy the link and share in your Instagram story or bio!");
        navigator.clipboard.writeText(appUrl);
        return;
      default:
        if (navigator.share) {
          navigator.share({ title: "BattleHub", text: shareMessage, url: appUrl });
        } else {
          handleCopy();
        }
    }
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Share2 className="w-12 h-12 text-orange-400" />
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
              Share BattleHub
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Help your friends join India's best Free Fire tournament platform
          </p>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-sm">
            🔥 Play Free Fire Tournaments!
          </Badge>
        </div>

        <Card className="bg-gradient-to-br from-orange-900/30 to-red-900/20 border-orange-500/30">
          <CardContent className="p-6 text-center space-y-4">
            <h3 className="text-2xl font-bold text-white">App Link</h3>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={appUrl}
                className="flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg"
              />
              <Button onClick={handleCopy} className="bg-orange-500 hover:bg-orange-600">
                {copied ? "✓ Copied" : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Share On</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleShare("whatsapp")}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6 text-lg"
            >
              <MessageCircle className="w-6 h-6 mr-3" />
              WhatsApp
            </Button>
            
            <Button
              onClick={() => handleShare("telegram")}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-6 text-lg"
            >
              <Send className="w-6 h-6 mr-3" />
              Telegram
            </Button>
            
            <Button
              onClick={() => handleShare("twitter")}
              className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white py-6 text-lg"
            >
              <Twitter className="w-6 h-6 mr-3" />
              Twitter
            </Button>
            
            <Button
              onClick={() => handleShare("instagram")}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-6 text-lg"
            >
              <Instagram className="w-6 h-6 mr-3" />
              Instagram
            </Button>
            
            <Button
              onClick={() => handleShare("email")}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-6 text-lg"
            >
              <Mail className="w-6 h-6 mr-3" />
              Email
            </Button>
            
            <Button
              onClick={() => handleShare("more")}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-6 text-lg"
            >
              <Share2 className="w-6 h-6 mr-3" />
              More Options
            </Button>
          </div>
        </div>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">What is BattleHub?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-300">
            <p>🎮 <strong>Free Fire Tournament Platform</strong></p>
            <p>💰 <strong>Exciting Prizes</strong> - Rewards for top performers</p>
            <p>⚡ <strong>Daily Tournaments</strong> - Solo, Duo, and Squad matches</p>
            <p>🏆 <strong>Professional Esports</strong> - Fair play and instant results</p>
            <p>💳 <strong>Easy Withdrawals</strong> - UPI, Bank transfer, or redeem codes</p>
            <p>📱 <strong>Mobile Friendly</strong> - Play anywhere, anytime</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-6 text-center">
            <p className="text-yellow-400 font-semibold text-lg">
              🎁 Share with friends and both get bonus diamonds!
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Use your referral code in the Referrals section
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}