import React, { useState, useEffect } from "react";
import { LegalContent } from "@/entities/LegalContent";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, FileText, RefreshCw, ShieldAlert, Scale, Info } from "lucide-react";

export default function LegalPolicies() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("disclaimer");
  const [policies, setPolicies] = useState({
    privacy_policy: null,
    terms_conditions: null,
    refund_policy: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllPolicies();
  }, []);

  const loadAllPolicies = async () => {
    try {
      const [privacyDoc, termsDoc, refundDoc] = await Promise.all([
        LegalContent.filter({ content_type: "privacy_policy" }),
        LegalContent.filter({ content_type: "terms_conditions" }),
        LegalContent.filter({ content_type: "refund_policy" })
      ]);

      setPolicies({
        privacy_policy: privacyDoc[0] || null,
        terms_conditions: termsDoc[0] || null,
        refund_policy: refundDoc[0] || null
      });
    } catch (error) {
      console.error("Error loading legal policies:", error);
    }
    setLoading(false);
  };

  const tabs = [
    { id: "disclaimer", label: "Disclaimer", icon: ShieldAlert },
    { id: "fair_play", label: "Fair Play", icon: Scale },
    { id: "privacy_policy", label: "Privacy", icon: Lock },
    { id: "terms_conditions", label: "Terms", icon: FileText },
    { id: "refund_policy", label: "Refund", icon: RefreshCw }
  ];

  const currentPolicy = policies[activeTab];

  const getPolicyContent = () => {
    if (activeTab === "disclaimer") {
      return '<div class="space-y-4">' +
        '<p class="text-sm font-bold text-orange-500 uppercase tracking-wider mb-2">BATTLEHUB OFFICIAL DISCLAIMER</p>' +
        '<p class="text-slate-300 leading-relaxed text-xs sm:text-sm">BattleHub is an independent esports platform hosting competitive tournaments for various games. BattleHub is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Garena (Free Fire), Krafton (BGMI), Activision (Call of Duty Mobile), Supercell (Clash Royale/Brawl Stars), or any other game developers or publishers.</p>' +
        '<p class="text-slate-300 leading-relaxed text-xs sm:text-sm">All game names, logos, character assets, brands, and registered trademarks belong to their respective publishers and copyright owners. The use of any game titles or brand names on this platform is solely for tournament listing, identification, and reference purposes, and does not imply any sponsorship or association with the game publishers.</p>' +
      '</div>';
    }

    if (activeTab === "fair_play") {
      return '<div class="space-y-4">' +
        '<p class="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">FAIR PLAY & ANTI-CHEAT POLICY</p>' +
        '<p class="text-slate-300 leading-relaxed text-xs sm:text-sm">At BattleHub, we maintain a zero-tolerance policy towards cheating, hacking, and unsportsmanlike behavior. To ensure a fair and competitive environment, all players must adhere to the following rules:</p>' +
        '<ul class="list-disc pl-5 space-y-3 text-slate-300 text-xs sm:text-sm">' +
          '<li><strong>1. Third-Party Modifications:</strong> Use of any hacks, scripts, aimbots, wallhacks, or modified game client files is strictly prohibited. Detection will result in an immediate and permanent account ban.</li>' +
          '<li><strong>2. Teaming & Collusion:</strong> Collaborating with players from other teams/squads to manipulate match outcomes will lead to immediate disqualification and forfeiture of all tournament rewards.</li>' +
          '<li><strong>3. Account Sharing & Emulators:</strong> Players must play on their registered mobile accounts. Unless specified otherwise for a tournament, emulator play is prohibited.</li>' +
          '<li><strong>4. Multiple Accounts:</strong> Creating multiple BattleHub accounts to gain an unfair advantage or exploit referral bonuses will result in all related accounts being permanently banned.</li>' +
          '<li><strong>5. Decision Finality:</strong> BattleHub Administrators hold the final decision-making power regarding cheat reports, dispute resolutions, and ban enforcement.</li>' +
        '</ul>' +
      '</div>';
    }

    let htmlContent = currentPolicy?.content || "";

    // Prepend a prominent warning disclaimer to Terms & Conditions
    if (activeTab === "terms_conditions" && htmlContent) {
      const disclaimerHeader = '<div class="pl-4 border-l-2 border-amber-500/50 my-6 py-1 text-left" style="text-align: left;"><p class="font-bold text-xs text-amber-400 uppercase tracking-wider mb-1">⚠️ Important Disclaimer</p><p class="text-xs leading-relaxed text-slate-400">BattleHub is not affiliated, associated, or officially connected with Garena, Krafton, Activision, Supercell, or any other game publishers. All game names, trademarks, and logos belong to their respective owners.</p></div>';
      htmlContent = disclaimerHeader + htmlContent;
    }

    return htmlContent;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 pb-24 relative overflow-hidden ">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-orange-600/5 blur-[120px] pointer-events-none rounded-full" />
        <div className="max-w-2xl mx-auto space-y-6 relative z-10">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
               <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
          
          <div className="bg-slate-900/50 rounded-2xl p-6 mt-6 space-y-4">
             <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
             <div className="space-y-3 mt-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-4 w-full bg-white/5 rounded animate-pulse" />)}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-24 relative overflow-hidden ">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-orange-600/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Back Button & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="text-gray-400 hover:text-white p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-black tracking-wider uppercase text-slate-300">
            Legal & Policies
          </h1>
          <div className="w-9 h-9 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-2xl gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[75px] sm:min-w-0 flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                  isActive 
                    ? "bg-slate-800 text-orange-500 shadow-lg border border-slate-700/50" 
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Policy Content Card */}
        <Card className="bg-[#0b0c10]/60 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <CardContent className="p-6">
            <div className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-end">
              <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                {activeTab === "disclaimer" 
                  ? "Platform Disclaimer" 
                  : activeTab === "fair_play" 
                  ? "Anti-Cheat Rules" 
                  : currentPolicy?.title || (activeTab === "privacy_policy" ? "Privacy Policy" : activeTab === "terms_conditions" ? "Terms & Conditions" : "Refund Policy")}
              </h2>
              {currentPolicy?.version && (
                <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded font-mono">
                  v{currentPolicy.version}
                </span>
              )}
            </div>
            
            <div className="prose prose-invert max-w-none min-h-[300px]">
              {getPolicyContent() ? (
                <div 
                  className="text-gray-300 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: getPolicyContent() }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
                  <Info className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-medium">Policy content not loaded. Contact Support.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {currentPolicy?.last_updated && (
          <p className="text-center text-slate-600 text-[10px] font-mono">
            LAST UPDATED: {new Date(currentPolicy.last_updated).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
