import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, ChevronRight, CheckCircle, XCircle, Flame } from "lucide-react";
import { format } from "date-fns";

// Group registrations into journeys: each Qualifier starts a new journey
function buildJourneys(regs, tournamentsMap) {
  // Sort regs by registration date ascending
  const sorted = [...regs].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const journeys = [];
  let current = null;

  for (const reg of sorted) {
    const t = tournamentsMap[reg.tournament_id];
    if (!t) continue;
    const type = t.tournament_type || (t.stage === "semifinal" ? "Semifinal" : t.stage === "grand_final" ? "Grand Final" : "Qualifier");

    if (type === "Qualifier") {
      // Start a new journey
      current = { qualifierReg: { reg, tournament: t }, semifinalReg: null, grandFinalReg: null };
      journeys.push(current);
    } else if (type === "Semifinal") {
      if (!current) {
        current = { qualifierReg: null, semifinalReg: { reg, tournament: t }, grandFinalReg: null };
        journeys.push(current);
      } else if (!current.semifinalReg) {
        current.semifinalReg = { reg, tournament: t };
      }
    } else if (type === "Grand Final") {
      if (!current) {
        current = { qualifierReg: null, semifinalReg: null, grandFinalReg: { reg, tournament: t } };
        journeys.push(current);
      } else if (!current.grandFinalReg) {
        current.grandFinalReg = { reg, tournament: t };
      }
    }
  }
  return journeys.reverse(); // Most recent first
}

function JourneyBar({ journey, isLatest }) {
  const { qualifierReg, semifinalReg, grandFinalReg } = journey;

  // Determine disqualified: qualifier exists but no semifinal and qualifier tournament is Completed
  const qCompleted = qualifierReg?.tournament?.status === "Completed";
  const sfCompleted = semifinalReg?.tournament?.status === "Completed";
  const disqualified = qCompleted && !semifinalReg && !grandFinalReg;
  const finished = !!grandFinalReg;

  const steps = [
    { key: "qualifier", label: "Qualifier", emoji: "🎯", data: qualifierReg, color: "blue" },
    { key: "semifinal", label: "Semifinal", emoji: "⚔️", data: semifinalReg, color: "purple" },
    { key: "grandfinal", label: "Grand Final", emoji: "🏆", data: grandFinalReg, color: "orange" },
  ];

  const currentStepIdx = grandFinalReg ? 2 : semifinalReg ? 1 : 0;
  const progressPercent = disqualified ? 15 : finished ? 100 : currentStepIdx === 0 ? 5 : currentStepIdx === 1 ? 50 : 100;

  const colorMap = {
    blue: { ring: "ring-blue-500", bg: "bg-blue-500", text: "text-blue-400", light: "bg-blue-500/15 border-blue-500/30" },
    purple: { ring: "ring-purple-500", bg: "bg-purple-500", text: "text-purple-400", light: "bg-purple-500/15 border-purple-500/30" },
    orange: { ring: "ring-orange-500", bg: "bg-orange-500", text: "text-orange-400", light: "bg-orange-500/15 border-orange-500/30" },
  };

  const activeStep = steps[currentStepIdx];
  const activeData = activeStep.data;

  return (
    <div className={`bg-gray-900 border ${isLatest ? 'border-orange-500/30' : 'border-gray-800'} rounded-2xl overflow-hidden mb-3`}>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className={`w-4 h-4 ${isLatest ? 'text-orange-400' : 'text-gray-600'}`} />
          <span className={`font-bold text-sm ${isLatest ? 'text-white' : 'text-gray-400'}`}>
            {isLatest ? 'Current Journey' : `Journey — ${qualifierReg ? format(new Date(qualifierReg.tournament.date_time), "MMM yyyy") : "Past"}`}
          </span>
          {disqualified && <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">Disqualified</span>}
          {finished && <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">🏆 Completed</span>}
        </div>
        {activeData && isLatest && (
          <Link to={createPageUrl(`TournamentDetail?id=${activeData.tournament.id}`)}>
            <span className="text-orange-400 text-xs font-semibold flex items-center gap-0.5">View <ChevronRight className="w-3 h-3" /></span>
          </Link>
        )}
      </div>

      <div className="px-4 mb-3">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${disqualified ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        {steps.map((step, idx) => {
          const c = colorMap[step.color];
          const isActive = idx === currentStepIdx && !disqualified;
          const isPast = idx < currentStepIdx || (finished && idx <= 2);
          return (
            <div
              key={step.key}
              className={`rounded-xl border p-2.5 text-center transition-all ${
                isActive ? c.light : isPast ? "bg-gray-800/50 border-gray-700/50 opacity-70" : disqualified && idx > 0 ? "bg-gray-800/20 border-gray-800/30 opacity-25" : "bg-gray-800/30 border-gray-800/50 opacity-40"
              }`}
            >
              <div className={`text-lg mb-0.5 ${!isActive && !isPast ? "grayscale opacity-50" : ""}`}>{step.emoji}</div>
              <p className={`text-[10px] font-bold ${isActive ? c.text : isPast ? "text-gray-400" : "text-gray-600"}`}>{step.label}</p>
              {isPast && !disqualified && <CheckCircle className="w-3 h-3 text-emerald-400 mx-auto mt-0.5" />}
              {disqualified && idx === 0 && <XCircle className="w-3 h-3 text-red-400 mx-auto mt-0.5" />}
              {isActive && step.data && <p className="text-[9px] text-gray-500 mt-0.5 truncate">{step.data.tournament.title}</p>}
            </div>
          );
        })}
      </div>

      {activeData && isLatest && (
        <div className="border-t border-gray-800/60 px-4 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-white text-xs font-semibold">{activeData.tournament.title}</p>
            <p className="text-gray-500 text-[10px]">
              Team: <span className="text-gray-300">{activeData.reg.team_name}</span>
              {" · "}
              {format(new Date(activeData.tournament.date_time), "MMM d, h:mm a")}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            activeData.reg.status === "Qualified" ? "bg-emerald-500/15 text-emerald-400" :
            activeData.reg.status === "Confirmed" ? "bg-blue-500/15 text-blue-400" :
            "bg-gray-700 text-gray-400"
          }`}>
            {activeData.reg.status}
          </span>
        </div>
      )}
    </div>
  );
}

export default function TournamentProgressBar({ user }) {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadJourney();
    else setLoading(false);
  }, [user]);

  const loadJourney = async () => {
    try {
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

  if (loading || journeys.length === 0) return null;

  // On home: only show if the latest journey has at least one non-completed tournament
  const latest = journeys[0];
  const hasActiveTournament = latest && (
    (latest.qualifierReg && latest.qualifierReg.tournament?.status !== "Completed") ||
    (latest.semifinalReg && latest.semifinalReg.tournament?.status !== "Completed") ||
    (latest.grandFinalReg && latest.grandFinalReg.tournament?.status !== "Completed")
  );
  if (!hasActiveTournament) return null;

  return (
    <div className="mx-4 mb-5">
      <JourneyBar journey={latest} isLatest={true} />
    </div>
  );
}

export { buildJourneys, JourneyBar };