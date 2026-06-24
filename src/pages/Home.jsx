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
  const [allTournaments, setAllTournaments] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load user + tournaments first (fast) — show immediately
      const [u, fetchedTournaments] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Tournament.list("-created_date", 50).catch(() => [])
      ]);
      setUser(u);
      const tList = fetchedTournaments || [];
      setAllTournaments(tList);

      const active = tList.filter(t =>
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
        const regs = allRegs || [];
        regs.forEach(r => {
          countMap[r.tournament_id] = (countMap[r.tournament_id] || 0) + 1;
        });
        setTournaments(prev => prev.map(t => ({ ...t, current_teams: countMap[t.id] || 0 })));

        if (u) {
          const userRegs = regs.filter(r => r.team_leader_id === u.id);
          setMyRegistrations(userRegs);
        }
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
        <MatchCountdownTimer user={user} registrations={myRegistrations} tournaments={allTournaments} />
      </div>

      {/* Banner Carousel */}
      <div className="px-4 max-w-7xl mx-auto mb-5">
        <BannerCarousel />
      </div>

      {/* User Journey Progress Bar */}
      <TournamentProgressBar user={user} tournaments={allTournaments} />

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

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-gray-800/40 text-center max-w-7xl mx-auto relative overflow-hidden mt-6 bg-gradient-to-b from-transparent to-gray-950/80 rounded-b-3xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 flex items-center justify-center shadow-lg shadow-orange-500/5 hover:scale-110 transition-transform duration-300 group">
            <Trophy className="w-5 h-5 text-orange-400 group-hover:animate-bounce" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-base md:text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-purple-500 drop-shadow">
              Made with ❤️ by BATTLEHUB FF
            </h3>
            <p className="text-gray-600 text-[10px] md:text-xs">© {new Date().getFullYear()} BattleHub FF. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}