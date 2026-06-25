import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, Flame, PlayCircle, MapPin } from "lucide-react";
import { format } from "date-fns";
import RegistrationCloseTimer from "../RegistrationCloseTimer";
import { Button } from "@/components/ui/button";

function TournamentCard({ tournament }) {
  const isSFGF = tournament.tournament_type === "Semifinal" || tournament.tournament_type === "Grand Final";

  return (
    <Link to={createPageUrl(`TournamentDetail?id=${tournament.id}`)}>
      <div className="w-[160px] sm:w-[200px] flex-shrink-0 bg-gray-950 border border-gray-800 hover:border-orange-500/50 rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.98] group">
        {/* Banner */}
        <div className="h-24 relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
          {tournament.banner_url ? (
            <img src={tournament.banner_url} alt={tournament.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Flame className="w-8 h-8 text-orange-500/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
          {/* Status badge */}
          {!(isSFGF && tournament.status === "Registration Open") && (
            <div className="absolute top-1.5 right-1.5">
              <Badge className={`text-[8px] font-bold px-1 py-0 ${
                tournament.status === "Registration Open" ? "bg-emerald-500 text-white" :
                "bg-gray-700 text-gray-300"
              }`}>
                {tournament.status}
              </Badge>
            </div>
          )}
          {/* Type Badge */}
          {tournament.tournament_type && (
            <div className="absolute top-1.5 left-1.5">
              <Badge className="bg-gray-900/80 backdrop-blur-sm text-gray-200 border border-gray-700 text-[9px] px-1.5 py-0">
                {tournament.tournament_type}
              </Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 pb-3">
          <p className="text-white font-bold text-xs line-clamp-1 mb-1.5">{tournament.title}</p>
          <div className="flex items-center gap-1 flex-wrap mb-1.5">
            <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] px-1.5 py-0">{tournament.mode}</Badge>
            {tournament.map && <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] px-1.5 py-0">{tournament.map}</Badge>}
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <div className="flex items-center gap-0.5 min-w-0">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">{format(new Date(tournament.date_time), "MMM d, h:mm a")}</span>
            </div>
            <div className="flex items-center gap-0.5 text-yellow-400 font-bold">
              <Trophy className="w-3 h-3" />
              <span>₹{(tournament.prize_pool || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <div className="flex items-center gap-0.5">
              <Users className="w-3 h-3" />
              <span>{tournament.current_teams || 0}/{tournament.max_teams}</span>
            </div>
            {tournament.status === "Registration Open" && !isSFGF && (
              <span className="text-orange-400 font-bold text-[10px] px-2 py-0.5 bg-orange-500/10 rounded-sm">JOIN</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SectionContainer({ title, children, link }) {
  return (
    <div className="mb-6 mx-4 bg-gray-900/40 border border-gray-800/80 rounded-2xl p-3 pb-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[13px] font-black text-gray-200 tracking-wide uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          {title}
        </h3>
        {link && (
          <Link to={link} className="text-[10px] text-gray-400 hover:text-white">
            View All →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function HorizontalList({ tournaments }) {
  if (!tournaments || tournaments.length === 0) return null;
  return (
    <div className="flex overflow-x-auto gap-2.5 pb-2 snap-x hide-scrollbar">
      {tournaments.map(t => (
        <div key={t.id} className="snap-start">
          <TournamentCard tournament={t} />
        </div>
      ))}
    </div>
  );
}

function LiveMatchSection({ liveTournaments }) {
  const navigate = useNavigate();
  if (!liveTournaments || liveTournaments.length === 0) return null;
  const t = liveTournaments[0];

  return (
    <SectionContainer title="Live Matches">
      <div 
        className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden relative group cursor-pointer"
        onClick={() => navigate(createPageUrl(`TournamentDetail?id=${t.id}`))}
      >
        <div className="h-32 sm:h-40 relative">
          {t.banner_url ? (
             <img src={t.banner_url} alt={t.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center">
              <Flame className="w-10 h-10 text-red-500/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent" />
          
          <div className="absolute top-2 left-2">
            <Badge className="bg-red-600 hover:bg-red-600 text-white font-bold px-1.5 py-0 text-[10px] flex items-center gap-1 shadow-lg shadow-red-500/20">
              <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>
              LIVE
            </Badge>
          </div>
          
          <div className="absolute bottom-2 left-2 right-2">
            <div className="flex justify-between items-end">
              <div>
                <h4 className="text-sm font-black text-white leading-tight">{t.title}</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-300 mt-0.5">
                  <span className="text-cyan-400">{t.map || "Bermuda"}</span>
                  <span>•</span>
                  <div className="flex items-center gap-0.5">
                    <Users className="w-2.5 h-2.5 text-gray-400" />
                    <span>{t.current_teams || 0} / {t.max_teams} Teams</span>
                  </div>
                </div>
              </div>
              <div>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (t.live_link) {
                      window.open(t.live_link, "_blank");
                    } else {
                      alert("Broadcast not available at the moment");
                    }
                  }}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-500/20 font-bold px-3 h-7 text-[10px]"
                >
                  WATCH LIVE
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}

export default function TournamentSections({ tournaments }) {
  const liveMatches = tournaments.filter(t => t.status === "Live");
  
  // Logic for Semi / Grand Final: Must be Completed OR Registration Open
  const sfGfTypes = ["Semifinal", "Grand Final"];
  const isSfGf = (t) => sfGfTypes.includes(t.tournament_type) || t.stage === "semifinal" || t.stage === "grand_final";
  
  const semifinals = tournaments.filter(t => 
    (t.tournament_type === "Semifinal" || t.stage === "semifinal") && 
    (t.status === "Completed" || t.status === "Registration Open")
  );
  
  const grandFinals = tournaments.filter(t => 
    (t.tournament_type === "Grand Final" || t.stage === "grand_final") && 
    (t.status === "Completed" || t.status === "Registration Open")
  );

  // Upcoming: Registration Open BUT NOT Semifinal/Grand Final
  const upcoming = tournaments.filter(t => 
    t.status === "Registration Open" && !isSfGf(t)
  );
  
  // Qualifiers: All other closed ones
  const closed = tournaments.filter(t => t.status !== "Registration Open" && t.status !== "Live");
  const qualifiers = closed.filter(t => !isSfGf(t));

  return (
    <div className="w-full">
      <LiveMatchSection liveTournaments={liveMatches} />
      
      {upcoming.length > 0 && (
        <SectionContainer title="Upcoming Tournaments" link={createPageUrl("Tournaments")}>
          <HorizontalList tournaments={upcoming} />
        </SectionContainer>
      )}

      {qualifiers.length > 0 && (
        <SectionContainer title="Qualifiers">
          <HorizontalList tournaments={qualifiers} />
        </SectionContainer>
      )}

      {semifinals.length > 0 && (
        <SectionContainer title="Semifinals">
          <HorizontalList tournaments={semifinals} />
        </SectionContainer>
      )}

      {grandFinals.length > 0 && (
        <SectionContainer title="Grand Finals" link={createPageUrl("Tournaments")}>
          <HorizontalList tournaments={grandFinals} />
        </SectionContainer>
      )}
    </div>
  );
}