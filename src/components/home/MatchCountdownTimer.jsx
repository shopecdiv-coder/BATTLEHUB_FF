import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Trophy, Flame } from "lucide-react";

export default function MatchCountdownTimer() {
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [timeLeft, setTimeLeft] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingMatches();
  }, []);

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
      const currentUser = await User.me().catch(() => null);
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Get user's registrations
      const registrations = await Registration.filter({ 
        team_leader_id: currentUser.id 
      }).catch(() => []);

      if (registrations.length === 0) {
        setLoading(false);
        return;
      }

      // Get upcoming tournaments
      const now = new Date();
      const matches = [];

      for (const reg of registrations) {
        const tournaments = await Tournament.filter({ id: reg.tournament_id }).catch(() => []);
        if (tournaments.length > 0) {
          const tournament = tournaments[0];
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
            <Card className={`border-2 overflow-hidden ${
              time.isLive 
                ? 'bg-gradient-to-r from-red-900/50 to-orange-900/50 border-red-500 animate-pulse' 
                : isUrgent
                  ? 'bg-gradient-to-r from-orange-900/50 to-yellow-900/50 border-orange-500'
                  : 'bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      time.isLive 
                        ? 'bg-red-500' 
                        : isUrgent 
                          ? 'bg-orange-500' 
                          : 'bg-gradient-to-br from-orange-500 to-red-500'
                    }`}>
                      {time.isLive ? (
                        <Flame className="w-6 h-6 text-white animate-pulse" />
                      ) : (
                        <Trophy className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{match.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-purple-500/30 text-purple-300 text-xs">
                          {match.mode}
                        </Badge>
                        {time.isLive && (
                          <Badge className="bg-red-500 text-white text-xs animate-pulse">
                            🔴 LIVE NOW
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  {!time.isLive && (
                    <div className="flex items-center gap-1">
                      <Clock className={`w-4 h-4 ${isUrgent ? 'text-orange-400' : 'text-cyan-400'}`} />
                      <div className="flex gap-1">
                        <div className={`${isUrgent ? 'bg-orange-500' : 'bg-gray-800'} rounded px-2 py-1 text-center min-w-[32px]`}>
                          <span className="text-white font-bold text-sm">{String(time.hours).padStart(2, '0')}</span>
                        </div>
                        <span className="text-gray-400 font-bold">:</span>
                        <div className={`${isUrgent ? 'bg-orange-500' : 'bg-gray-800'} rounded px-2 py-1 text-center min-w-[32px]`}>
                          <span className="text-white font-bold text-sm">{String(time.minutes).padStart(2, '0')}</span>
                        </div>
                        <span className="text-gray-400 font-bold">:</span>
                        <div className={`${isUrgent ? 'bg-orange-500' : 'bg-gray-800'} rounded px-2 py-1 text-center min-w-[32px]`}>
                          <span className="text-white font-bold text-sm">{String(time.seconds).padStart(2, '0')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isUrgent && !time.isLive && (
                  <p className="text-orange-400 text-xs mt-2 text-center font-semibold animate-pulse">
                    ⚠️ Match starting soon! Get ready!
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}