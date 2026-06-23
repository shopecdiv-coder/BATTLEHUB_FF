import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calendar, CheckCircle, Trophy } from "lucide-react";
import { format } from "date-fns";


export default function MyMatchesSection() {
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [tournaments, setTournaments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const myRegistrations = await Registration.filter(
        { team_leader_id: currentUser.id },
        "-created_date",
        20
      );
      setRegistrations(myRegistrations);

      // Load tournament details for status
      const tournamentIds = [...new Set(myRegistrations.map(r => r.tournament_id))];
      const tournamentsMap = {};
      
      for (const tid of tournamentIds) {
        const tourneys = await Tournament.filter({ id: tid });
        if (tourneys.length > 0) {
          tournamentsMap[tid] = tourneys[0];
        }
      }
      setTournaments(tournamentsMap);
    } catch (error) {
      // User not logged in
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00FFFF] via-[#00CCFF] to-[#FF004C]">
            My Matches
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card border-2 border-[#00FFFF]/30 rounded-2xl p-6 animate-pulse">
              <div className="h-20 bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00FFFF] via-[#00CCFF] to-[#FF004C]">
            My Matches
          </h2>
          <p className="text-[#A0A0A0] mt-2">Login to see your registered tournaments</p>
        </div>
        <Link to={createPageUrl("Tournaments")}>
          <Button className="glass-card border-2 border-[#00FFFF]/50 text-[#00FFFF] hover:bg-[#00FFFF]/10 px-6 py-3 rounded-xl font-bold mx-auto block">
            Browse Tournaments
          </Button>
        </Link>
      </section>
    );
  }

  const ongoing = registrations.filter(r => {
    const t = tournaments[r.tournament_id];
    return t?.status === "Live" || t?.status === "Registration Closed";
  }).length;

  const upcoming = registrations.filter(r => {
    const t = tournaments[r.tournament_id];
    return t?.status === "Registration Open" || t?.status === "Upcoming";
  }).length;

  const completed = registrations.filter(r => {
    const t = tournaments[r.tournament_id];
    return t?.status === "Completed";
  }).length;

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00FFFF] via-[#00CCFF] to-[#FF004C]">
          My Matches
        </h2>
        <p className="text-[#A0A0A0] mt-2">Track your tournament journey</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link to={createPageUrl("MyTournaments")}>
          <div className="glass-card border-2 border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-500 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <RefreshCw className="w-7 h-7 text-cyan-400" />
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-400 text-lg px-3 py-1">{ongoing}</Badge>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Ongoing</h3>
            <p className="text-[#A0A0A0] text-sm">Currently playing</p>
          </div>
        </Link>

        <Link to={createPageUrl("MyTournaments")}>
          <div className="glass-card border-2 border-blue-500/30 rounded-2xl p-6 hover:border-blue-500 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-7 h-7 text-blue-400" />
              </div>
              <Badge className="bg-blue-500/20 text-blue-400 text-lg px-3 py-1">{upcoming}</Badge>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Upcoming</h3>
            <p className="text-[#A0A0A0] text-sm">Registered matches</p>
          </div>
        </Link>

        <Link to={createPageUrl("MyTournaments")}>
          <div className="glass-card border-2 border-green-500/30 rounded-2xl p-6 hover:border-green-500 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 text-lg px-3 py-1">{completed}</Badge>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Completed</h3>
            <p className="text-[#A0A0A0] text-sm">Finished matches</p>
          </div>
        </Link>
      </div>

      {registrations.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="w-16 h-16 mx-auto text-[#00FFFF]/30 mb-4" />
          <p className="text-[#A0A0A0] mb-4">You haven't registered for any tournaments yet</p>
          <Link to={createPageUrl("Tournaments")}>
            <Button className="bg-gradient-to-r from-[#00FFFF] to-[#0088FF] hover:from-[#00CCFF] hover:to-[#0066CC] text-white font-bold rounded-xl neon-glow">
              Browse Tournaments
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
}