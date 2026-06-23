import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

import BannerCarousel from "../components/home/BannerCarousel";
import VideoBanner from "../components/home/VideoBanner";
import AnnouncementBanner from "../components/home/AnnouncementBanner";
import MatchCountdownTimer from "../components/home/MatchCountdownTimer";
import TournamentSections from "../components/home/TournamentSections";
import TournamentProgressBar from "../components/home/TournamentProgressBar";

export default function Home() {
  const [tournaments, setTournaments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load user + tournaments first (fast) — show immediately
      const [u, allTournaments] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Tournament.list("-created_date", 50).catch(() => [])
      ]);
      setUser(u);

      const active = (allTournaments || []).filter(t =>
        t.is_template !== true &&
        t.status !== "Completed" &&
        t.status !== "Cancelled" &&
        t.title
      );
      setTournaments(active);
      setLoading(false);

      // Load registration counts in background (non-blocking)
      base44.entities.Registration.list("-created_date", 100).then(allRegs => {
        const countMap = {};
        (allRegs || []).forEach(r => {
          countMap[r.tournament_id] = (countMap[r.tournament_id] || 0) + 1;
        });
        setTournaments(prev => prev.map(t => ({ ...t, current_teams: countMap[t.id] || 0 })));
      }).catch(() => {});
    } catch (e) {
      console.error("Home loadData error:", e);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Video Banner */}
      <VideoBanner />

      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Countdown Timer */}
      <div className="px-4 pt-4 max-w-7xl mx-auto">
        <MatchCountdownTimer />
      </div>

      {/* Banner Carousel */}
      <div className="px-4 max-w-7xl mx-auto mb-5">
        <BannerCarousel />
      </div>

      {/* User Journey Progress Bar */}
      <TournamentProgressBar user={user} />

      {/* Tournament Sections */}
      <div className="px-4 max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              🔥 Tournaments
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">Qualifier → Semifinal → Grand Final</p>
          </div>
          <Link to={createPageUrl("Tournaments")}>
            <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 pr-1">
              View All →
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-t-orange-500 border-orange-500/20 rounded-full animate-spin" />
          </div>
        ) : (
          <TournamentSections tournaments={tournaments} />
        )}
      </div>

      {/* Quick Access */}
      <div className="px-4 max-w-7xl mx-auto mb-8">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Access</h2>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Tournaments", emoji: "🏆", href: "MyTournaments" },
            { label: "Leaderboard", emoji: "⭐", href: "Leaderboard" },
            { label: "Wallet", emoji: "💰", href: "Wallet" },
            { label: "Earn 💎", emoji: "💎", href: "EarnDiamonds" },
          ].map(({ label, emoji, href }) => (
            <Link key={label} to={createPageUrl(href)}>
              <div className="bg-gray-900 border border-gray-800 hover:border-orange-500/40 hover:bg-gray-800 rounded-2xl p-3 text-center cursor-pointer active:scale-95">
                <span className="text-2xl">{emoji}</span>
                <p className="text-gray-300 text-xs font-semibold mt-1.5 leading-tight">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-gray-800/60 text-center max-w-7xl mx-auto">
        <Trophy className="w-8 h-8 text-orange-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">
          Made with ❤️ by{" "}
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
            BattleHub FF
          </span>
        </p>
      </footer>
    </div>
  );
}