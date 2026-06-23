import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, MapPin, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { format } from "date-fns";
import RegistrationCloseTimer from "../RegistrationCloseTimer";

export default function FeaturedTournaments({ tournaments, loading }) {
  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i} className="glass-card border-[#00FFFF]/20">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 bg-gray-800" />
              <Skeleton className="h-4 w-1/2 bg-gray-800 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full bg-gray-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Card className="glass-card border-2 border-[#00FFFF]/30 p-12 text-center">
        <Trophy className="w-20 h-20 mx-auto text-[#00FFFF]/50 mb-4" />
        <h3 className="text-2xl font-display font-bold text-white mb-2">No Active Tournaments</h3>
        <p className="text-[#A0A0A0]">Check back soon for upcoming tournaments!</p>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tournaments.map((tournament, index) => (
        <div key={tournament.id} className="hover:scale-[1.02] transition-transform">
          <Link to={createPageUrl(`TournamentDetail?id=${tournament.id}`)}>
            <Card className="bg-gray-900/90 border-2 border-[#00FFFF]/30 hover:border-[#00FFFF] hover-glow transition-all duration-300 overflow-hidden group h-full relative">
              {/* Tournament Banner/Image */}
              <div className="h-40 bg-gradient-to-br from-[#00FFFF]/20 via-[#0088FF]/10 to-[#FF004C]/20 relative overflow-hidden">
                {tournament.banner_url ? (
                  <img 
                    src={tournament.banner_url} 
                    alt={tournament.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Flame className="w-16 h-16 text-[#00FFFF]/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1A] via-transparent to-transparent"></div>
                <Flame className="absolute top-3 left-3 w-6 h-6 text-[#00FFFF]/50 animate-pulse" />
                {/* Hide "Registration Open" badge for Semifinal / Grand Final */}
                {(() => {
                  const isSFGF = tournament.tournament_type === "Semifinal" || tournament.tournament_type === "Grand Final";
                  if (isSFGF && tournament.status === "Registration Open") return null;
                  return (
                    <div className="absolute top-4 right-4">
                      <Badge className={`font-bold ${
                        tournament.status === "Live" ? "bg-[#FF004C] text-white neon-glow-red" :
                        tournament.status === "Registration Open" ? "bg-[#00FF88] text-[#0A0A1A] neon-glow" :
                        "bg-[#A0A0A0] text-white"
                      }`}>
                        {tournament.status}
                      </Badge>
                    </div>
                  );
                })()}
              </div>

              <CardHeader className="pb-3">
                <h3 className="text-xl font-display font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#00FFFF] group-hover:to-[#FF004C] transition-all line-clamp-1">
                  {tournament.title}
                </h3>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <Badge className="bg-[#00FFFF]/20 border border-[#00FFFF]/50 text-[#00FFFF] font-semibold">
                    {tournament.mode}
                  </Badge>
                  <Badge className="bg-[#FF004C]/20 border border-[#FF004C]/50 text-[#FF004C] font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {tournament.map}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[#A0A0A0]">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(tournament.date_time), "MMM d, h:mm a")}</span>
                  </div>
                </div>

                {tournament.registration_closes && (
                  <div className="text-xs">
                    <RegistrationCloseTimer closingDate={tournament.registration_closes} />
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[#A0A0A0]">
                    <Users className="w-4 h-4" />
                    <span>{tournament.current_teams || 0}/{tournament.max_teams} Teams</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#FFD700] font-bold">
                    <Trophy className="w-4 h-4" />
                    <span>₹{tournament.prize_pool?.toLocaleString() || 0}</span>
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-[#00FFFF] to-[#0088FF] hover:from-[#00CCFF] hover:to-[#0066CC] text-white font-bold rounded-xl neon-glow">
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      ))}
    </div>
  );
}