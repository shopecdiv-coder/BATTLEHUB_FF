import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, MapPin, Flame, ChevronDown, ChevronUp, Shield, Star } from "lucide-react";
import { format } from "date-fns";
import RegistrationCloseTimer from "../RegistrationCloseTimer";

function TournamentCard({ tournament }) {
  const isSFGF = tournament.tournament_type === "Semifinal" || tournament.tournament_type === "Grand Final";

  return (
    <Link to={createPageUrl(`TournamentDetail?id=${tournament.id}`)}>
      <div className="bg-gray-900 border border-gray-800 hover:border-orange-500/50 rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.98] group">
        {/* Banner */}
        <div className="h-32 relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
          {tournament.banner_url ? (
            <img src={tournament.banner_url} alt={tournament.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Flame className="w-12 h-12 text-orange-500/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent" />
          {/* Status badge — hide "Registration Open" for SF/GF */}
          {!(isSFGF && tournament.status === "Registration Open") && (
            <div className="absolute top-2.5 right-2.5">
              <Badge className={`text-[10px] font-bold px-2 py-0.5 ${
                tournament.status === "Live" ? "bg-red-500 text-white" :
                tournament.status === "Registration Open" ? "bg-emerald-500 text-white" :
                "bg-gray-700 text-gray-300"
              }`}>
                {tournament.status}
              </Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-white font-bold text-sm line-clamp-1 mb-2">{tournament.title}</p>
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] px-1.5 py-0.5">{tournament.mode}</Badge>
            {tournament.map && <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] px-1.5 py-0.5">{tournament.map}</Badge>}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {(() => {
                  try {
                    const d = new Date(tournament.date_time);
                    return isNaN(d.getTime()) ? "TBD" : format(d, "MMM d, h:mm a");
                  } catch (e) {
                    return "TBD";
                  }
                })()}
              </span>
            </div>
            <div className="flex items-center gap-1 text-yellow-400 font-bold">
              <Trophy className="w-3 h-3" />
              <span>₹{(tournament.prize_pool || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{tournament.current_teams || 0}/{tournament.max_teams} Teams</span>
            </div>
          </div>
          {tournament.registration_closes && (
            <div className="mt-1.5 text-[10px]">
              <RegistrationCloseTimer closingDate={tournament.registration_closes} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function SectionBlock({ title, emoji, color, tournaments, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (tournaments.length === 0) return null;

  const colorMap = {
    blue: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
    purple: { border: "border-purple-500/30", bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-400" },
    orange: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
    green: { border: "border-green-500/30", bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden`}>
      {/* Section Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 ${c.bg}`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
          <span className={`font-black text-sm ${c.text}`}>{emoji} {title}</span>
          <Badge className={`${c.bg} ${c.text} border ${c.border} text-[10px] px-1.5 py-0`}>
            {tournaments.length}
          </Badge>
        </div>
        {open ? <ChevronUp className={`w-4 h-4 ${c.text}`} /> : <ChevronDown className={`w-4 h-4 ${c.text}`} />}
      </button>

      {open && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      )}
    </div>
  );
}

export default function TournamentSections({ tournaments }) {
  const qualifiers = tournaments.filter(t => t.tournament_type === "Qualifier" || (!t.tournament_type && t.stage === "normal"));
  const semifinals = tournaments.filter(t => t.tournament_type === "Semifinal" || t.stage === "semifinal");
  const grandFinals = tournaments.filter(t => t.tournament_type === "Grand Final" || t.stage === "grand_final");
  const knownTypes = new Set(["Qualifier", "Semifinal", "Grand Final"]);
  const knownStages = new Set(["semifinal", "grand_final"]);
  const others = tournaments.filter(t =>
    !knownTypes.has(t.tournament_type) && !knownStages.has(t.stage) &&
    !qualifiers.includes(t) && !semifinals.includes(t) && !grandFinals.includes(t)
  );

  if (tournaments.length === 0) {
    return (
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-10 text-center">
        <Trophy className="w-14 h-14 mx-auto text-gray-700 mb-3" />
        <p className="text-gray-400 font-semibold">No active tournaments right now</p>
        <p className="text-gray-600 text-sm mt-1">Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionBlock title="Qualifier" emoji="🎯" color="blue" tournaments={qualifiers} defaultOpen={true} />
      <SectionBlock title="Semifinal" emoji="⚔️" color="purple" tournaments={semifinals} defaultOpen={true} />
      <SectionBlock title="Grand Final" emoji="🏆" color="orange" tournaments={grandFinals} defaultOpen={true} />
      <SectionBlock title="Other Matches" emoji="🎮" color="green" tournaments={others} defaultOpen={true} />
    </div>
  );
}