import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MatchCountdownReminder() {
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [user, setUser] = useState(null);
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    loadUpcomingMatches();
  }, []);

  // Real-time countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = {};
      upcomingMatches.forEach(match => {
        const diff = new Date(match.date_time) - new Date();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          newTimeLeft[match.id] = { hours, minutes, seconds, diff };
        }
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [upcomingMatches]);

  const loadUpcomingMatches = async () => {
    try {
      const currentUser = await User.me().catch(() => null);
      if (!currentUser) return;
      setUser(currentUser);

      // Load data with error handling
      const registrations = await Registration.filter({ team_leader_id: currentUser.id }).catch(() => []);
      if (!registrations || registrations.length === 0) return;
      
      const allTournaments = await Tournament.list("-date_time", 20).catch(() => []);
      
      if (!registrations || registrations.length === 0) return;

      const tournamentIds = registrations.map(r => r.tournament_id);
      
      const now = new Date();
      const upcoming = (allTournaments || []).filter(t => {
        const matchTime = new Date(t.date_time);
        const diffMs = matchTime - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        return tournamentIds.includes(t.id) && 
               diffHours > 0 && 
               diffHours <= 24 &&
               (t.status === "Registration Open" || t.status === "Registration Closed" || t.status === "Live");
      });

      setUpcomingMatches(upcoming);
    } catch (error) {
      // Silent fail
    }
  };

  if (upcomingMatches.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <AnimatePresence>
        {upcomingMatches.map((match) => {
          const time = timeLeft[match.id];
          if (!time) return null;

          const isUrgent = time.diff <= 5 * 60 * 1000; // 5 minutes
          const isWarning = time.diff <= 15 * 60 * 1000; // 15 minutes

          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`rounded-2xl p-4 border-2 ${
                isUrgent 
                  ? 'bg-red-900/30 border-red-500 animate-pulse' 
                  : isWarning 
                    ? 'bg-orange-900/30 border-orange-500' 
                    : 'bg-blue-900/30 border-blue-500'
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isUrgent ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {isUrgent ? (
                        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-white animate-bounce" />
                      ) : (
                        <Clock className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm md:text-base truncate">{match.title}</p>
                      <p className="text-xs text-gray-400">{match.mode} • {match.map}</p>
                      <p className="text-xs text-yellow-400 mt-1">
                        ⚠️ Room ID & Password will appear 5 min before match
                      </p>
                    </div>
                  </div>
                  
                  {/* Countdown Timer */}
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className="text-center bg-black/30 rounded-lg px-2 md:px-3 py-1 md:py-2">
                      <p className={`text-lg md:text-2xl font-black ${
                        isUrgent ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-blue-400'
                      }`}>
                        {String(time.hours).padStart(2, '0')}
                      </p>
                      <p className="text-[8px] md:text-[10px] text-gray-500">HRS</p>
                    </div>
                    <span className="text-lg md:text-2xl text-gray-500">:</span>
                    <div className="text-center bg-black/30 rounded-lg px-2 md:px-3 py-1 md:py-2">
                      <p className={`text-lg md:text-2xl font-black ${
                        isUrgent ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-blue-400'
                      }`}>
                        {String(time.minutes).padStart(2, '0')}
                      </p>
                      <p className="text-[8px] md:text-[10px] text-gray-500">MIN</p>
                    </div>
                    <span className="text-lg md:text-2xl text-gray-500">:</span>
                    <div className="text-center bg-black/30 rounded-lg px-2 md:px-3 py-1 md:py-2">
                      <p className={`text-lg md:text-2xl font-black ${
                        isUrgent ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-blue-400'
                      }`}>
                        {String(time.seconds).padStart(2, '0')}
                      </p>
                      <p className="text-[8px] md:text-[10px] text-gray-500">SEC</p>
                    </div>
                  </div>
                </div>

  
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}