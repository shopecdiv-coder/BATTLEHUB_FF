import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Trophy, ChevronRight } from "lucide-react";
import { Announcement } from "@/entities/Announcement";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import BannerCarousel from "../components/home/BannerCarousel";
import MatchCountdownTimer from "../components/home/MatchCountdownTimer";
import TournamentSections from "../components/home/TournamentSections";
import TournamentProgressBar from "../components/home/TournamentProgressBar";

export default function Home() {
  const [tournaments, setTournaments] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAnnouncements, setActiveAnnouncements] = useState([]);
  const [newsModalOpen, setNewsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load user + tournaments first (fast) — show immediately
      const [u, fetchedTournaments, fetchedAnnouncements] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Tournament.list("-created_date", 50).catch(() => []),
        Announcement.filter({ active: true }, "-created_date", 5).catch(() => [])
      ]);
      setUser(u);
      const tList = fetchedTournaments || [];
      const now = new Date();
      tList.forEach(t => {
        if (t.status === "Registration Open" && t.registration_closes && new Date(t.registration_closes) < now) {
          t.status = "Registration Closed";
          if (base44?.entities?.Tournament) {
            base44.entities.Tournament.update(t.id, { status: "Registration Closed" }).catch(() => {});
          }
        }
      });
      setAllTournaments(tList);

      if (fetchedAnnouncements && fetchedAnnouncements.length > 0) {
        setActiveAnnouncements(fetchedAnnouncements);
      }

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
    <div className="min-h-screen bg-gray-950 text-white pb-4">
      {/* Banner Carousel */}
      <div className="px-4 pt-4 max-w-7xl mx-auto mb-6">
        <BannerCarousel />
      </div>

      {/* Latest Announcements */}
      {activeAnnouncements.length > 0 && (
        <div className="px-4 max-w-7xl mx-auto mb-6">
          <div onClick={() => setNewsModalOpen(true)} className="cursor-pointer bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between group hover:border-orange-500/50 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden w-full">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-orange-500" />
              </div>
              <div className="overflow-hidden flex-1 relative">
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-0.5">Latest Announcements</p>
                <div className="flex gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide text-sm font-medium text-white pb-1">
                  {activeAnnouncements.map((news, idx) => (
                    <span key={news.id} className="flex items-center gap-4">
                      <span>{news.title || news.message || "New Announcement"}</span>
                      {idx < activeAnnouncements.length - 1 && <span className="text-gray-600">•</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-orange-400 transition-colors flex-shrink-0 ml-2" />
          </div>
        </div>
      )}

      {/* Countdown Timer */}
      <div className="px-4 max-w-7xl mx-auto mb-6">
        <MatchCountdownTimer user={user} registrations={myRegistrations} tournaments={allTournaments} />
      </div>

      {/* Tournament Sections */}
      <div className="max-w-7xl mx-auto mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-t-orange-500 border-orange-500/20 rounded-full animate-spin" />
          </div>
        ) : (
          <TournamentSections tournaments={tournaments} />
        )}
      </div>

      {/* User Journey Progress Bar */}
      <div className="px-4 max-w-7xl mx-auto mb-6">
        <TournamentProgressBar user={user} tournaments={allTournaments} />
      </div>

      {/* Footer */}
      <footer className="px-4 py-4 border-t border-gray-800/40 text-center max-w-7xl mx-auto relative overflow-hidden bg-gradient-to-b from-transparent to-gray-950/80 rounded-b-3xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 border border-orange-500/20 flex items-center justify-center shadow-lg shadow-orange-500/5 hover:scale-110 transition-transform duration-300 group overflow-hidden">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee96b6cabd2c2d7af587d0/08567b05d_bf31fa0a1_logo.png" alt="BH Logo" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-base md:text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-purple-500 drop-shadow">
              Made with ❤️ by BATTLEHUB FF
            </h3>
          </div>
        </div>
      </footer>

      {/* News Modal */}
      <Dialog open={newsModalOpen} onOpenChange={setNewsModalOpen}>
        <DialogContent className="bg-gray-950 border-gray-800 text-white sm:max-w-md w-[90vw] max-h-[85vh] overflow-y-auto z-[200]">
          <DialogHeader>
            <DialogTitle className="text-orange-400 font-bold uppercase tracking-wider text-xs border-b border-gray-800 pb-2">Latest Announcements</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-6">
            {activeAnnouncements.map((news) => (
              <div key={news.id} className="space-y-3 pb-4 border-b border-gray-800/50 last:border-0 last:pb-0">
                {news.title && <h3 className="text-lg font-bold text-gray-100">{news.title}</h3>}
                {(news.image_url || news.media_url) && (
                  <img src={news.image_url || news.media_url} alt="News" className="w-full rounded-lg object-contain bg-gray-900 max-h-[300px]" />
                )}
                {(news.message || news.text) && (
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{news.message || news.text}</p>
                )}
                <div className="text-[10px] text-gray-500 text-right mt-2">
                  {news.created_date && new Date(news.created_date).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}