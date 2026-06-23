import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Tournament } from "@/entities/Tournament";
import { Registration } from "@/entities/Registration";
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
        User.me().catch(() => null),
        Tournament.list("-created_date", 50).catch(() => [])
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
      Registration.list("-created_date", 100).then(allRegs => {
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
            <h2 className="text-xl font-bold text-white">🏆 Tournaments</h2>
            <p className="text-gray-400 text-sm">Join and win real cash prizes</p>
          </div>
          <Link to={createPageUrl("Tournaments")}>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              <Trophy className="w-4 h-4 mr-1" />
              View All
            </Button>
          </Link>
        </div>
        <TournamentSections tournaments={tournaments} loading={loading} user={user} />
      </div>
    </div>
  );
}