import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { Trophy, Flame } from "lucide-react";
import { buildJourneys, JourneyBar } from "@/components/home/TournamentProgressBar";

export default function JourneyHistory() {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      const regs = await Registration.filter({ team_leader_id: user.id }).catch(() => []);
      if (!regs || regs.length === 0) { setLoading(false); return; }
      const allTournaments = await Tournament.list("-created_date", 100).catch(() => []);
      const tournamentsMap = {};
      (allTournaments || []).forEach(t => { tournamentsMap[t.id] = t; });
      const built = buildJourneys(regs, tournamentsMap);
      setJourneys(built);
    } catch {}
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-4 pb-24">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-5 pt-2">
          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Tournament Journey</h1>
            <p className="text-gray-500 text-xs">Your progress through Qualifier → Semifinal → Grand Final</p>
          </div>
        </div>

        {journeys.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <Trophy className="w-14 h-14 mx-auto text-gray-700 mb-3" />
            <p className="text-gray-400 font-semibold">No journey yet</p>
            <p className="text-gray-600 text-sm mt-1">Register for a Qualifier to start your journey!</p>
          </div>
        ) : (
          <div>
            {journeys.map((journey, i) => (
              <JourneyBar key={i} journey={journey} isLatest={i === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}