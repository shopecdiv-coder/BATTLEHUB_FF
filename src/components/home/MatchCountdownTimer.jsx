import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Trophy, Flame } from "lucide-react";

export default function MatchCountdownTimer({ user, registrations, tournaments }) {
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [timeLeft, setTimeLeft] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingMatches();
  }, [user, registrations, tournaments]);

  // Update countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = {};
      upcomingMatches.forEach(match => {
        newTimeLeft[match.id] = calculateTimeLeft(match.date_time);
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [upcomingMatches]);

  const loadUpcomingMatches = async () => {
    try {
      const currentUser = user || (await User.me().catch(() => null));
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Get user's registrations
      let myRegs = registrations;
      if (!myRegs) {
        myRegs = await Registration.filter({ 
          team_leader_id: currentUser.id 
        }).catch(() => []);
      }

      if (!myRegs || myRegs.length === 0) {
        setUpcomingMatches([]);
        setLoading(false);
        return;
      }

      // Get upcoming tournaments
      const now = new Date();
      const matches = [];

      for (const reg of myRegs) {
        let tournament = null;
        if (tournaments && tournaments.length > 0) {
          tournament = tournaments.find(t => t.id === reg.tournament_id);
        }
        if (!tournament) {
          const tList = await Tournament.filter({ id: reg.tournament_id }).catch(() => []);
          if (tList.length > 0) tournament = tList[0];
        }

        if (tournament) {
          const matchDate = new Date(tournament.date_time);
          const twelveHoursBefore = matchDate - (12 * 60 * 60 * 1000);
          
          // Only show if match is within 12 hours (before match starts)
          if (matchDate > now && now >= new Date(twelveHoursBefore)) {
            matches.push(tournament);
          }
        }
      }

      // Sort by date
      matches.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
      setUpcomingMatches(matches.slice(0, 2)); // Show max 2
    } catch (error) {
      console.error("Error loading matches:", error);
    }
    setLoading(false);
  };

  const calculateTimeLeft = (dateTime) => {
    const now = new Date();
    const matchTime = new Date(dateTime);
    const diff = matchTime - now;

    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, isLive: true };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, isLive: false };
  };

  if (loading || upcomingMatches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {upcomingMatches.map(match => {
        const time = timeLeft[match.id] || calculateTimeLeft(match.date_time);
        const isUrgent = time.hours === 0 && time.minutes < 15;

        return (
          <Link key={match.id} to={createPageUrl(`TournamentDetail?id=${match.id}`)}>
            <div className={`border bg-gray-900 border-gray-800 hover:border-cyan-500/50 rounded-xl overflow-hidden transition-colors ${time.isLive ? 'border-red-500/50 animate-pulse' : ''}`}>
              <div className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    time.isLive ? 'bg-red-500/20 text-red-400' : isUrgent ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {time.isLive ? <Flame className="w-5 h-5 animate-pulse" /> : <Trophy className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs truncate max-w-[120px] sm:max-w-[200px]">{match.title}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px] px-1 py-0">
                        {match.mode}
                      </Badge>
                      {time.isLive && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/20 text-[9px] px-1 py-0 animate-pulse">
                          🔴 LIVE NOW
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Countdown Timer */}
                {!time.isLive && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-0.5">
                      <Clock className={`w-3 h-3 ${isUrgent ? 'text-orange-400' : 'text-cyan-400'}`} />
                      <div className="flex gap-0.5 ml-1">
                        <div className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-center min-w-[24px]">
                          <span className={`font-bold text-[10px] ${isUrgent ? 'text-orange-400' : 'text-cyan-400'}`}>{String(time.hours).padStart(2, '0')}</span>
                        </div>
                        <span className="text-gray-500 font-bold text-[10px] mt-0.5">:</span>
                        <div className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-center min-w-[24px]">
                          <span className={`font-bold text-[10px] ${isUrgent ? 'text-orange-400' : 'text-cyan-400'}`}>{String(time.minutes).padStart(2, '0')}</span>
                        </div>
                        <span className="text-gray-500 font-bold text-[10px] mt-0.5">:</span>
                        <div className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-center min-w-[24px]">
                          <span className={`font-bold text-[10px] ${isUrgent ? 'text-orange-400' : 'text-cyan-400'}`}>{String(time.seconds).padStart(2, '0')}</span>
                        </div>
                      </div>
                    </div>
                    {isUrgent && (
                      <span className="text-[8px] text-orange-400 uppercase font-bold animate-pulse tracking-wider">Starting Soon</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}