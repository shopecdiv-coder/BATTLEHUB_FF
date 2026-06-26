import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Users, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RegistrationInvoiceDownload from "@/components/tournament/RegistrationInvoiceDownload";

import { format } from "date-fns";

export default function MyTournaments() {
  const [registrations, setRegistrations] = useState([]);
  const [tournaments, setTournaments] = useState({});
  const [user, setUser] = useState(null);
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
        "-created_date"
      );
      setRegistrations(myRegistrations);

      // Load tournament details to check status
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
      console.error("Error loading registrations:", error);
    }
    setLoading(false);
  };

  const filterByStatus = (status) => {
    if (status === "all") return registrations;
    if (status === "Completed") {
      return registrations.filter(r => {
        const tournament = tournaments[r.tournament_id];
        return tournament?.status === "Completed";
      });
    }
    return registrations.filter(r => r.status === status);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            My Tournaments
          </h1>
          <p className="text-gray-400 mt-1">Track all your tournament registrations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total Registered"
            value={registrations.length}
            icon={Trophy}
            color="purple"
          />
          <StatsCard
            title="Active"
            value={registrations.filter(r => r.status === "Registered" || r.status === "Confirmed").length}
            icon={Users}
            color="cyan"
          />
          <StatsCard
            title="Completed"
            value={registrations.filter(r => {
              const tournament = tournaments[r.tournament_id];
              return tournament?.status === "Completed";
            }).length}
            icon={Calendar}
            color="purple"
          />
        </div>

        <RegistrationList registrations={registrations} tournaments={tournaments} loading={loading} />
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }) {
  return (
    <div>
      <Card className={`bg-gradient-to-br ${
        color === 'purple' 
          ? 'from-purple-900/30 to-purple-800/10 border-purple-500/20' 
          : 'from-cyan-900/30 to-cyan-800/10 border-cyan-500/20'
      } backdrop-blur-sm`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{title}</p>
              <p className="text-3xl font-bold text-gray-100 mt-1">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
              color === 'purple' ? 'from-purple-500 to-purple-600' : 'from-cyan-500 to-cyan-600'
            } flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RegistrationList({ registrations, tournaments, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i} className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-3/4 bg-gray-800" />
              <Skeleton className="h-4 w-1/2 bg-gray-800 mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
        <Trophy className="w-16 h-16 mx-auto text-gray-700 mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Tournaments</h3>
        <p className="text-gray-500 mb-6">You haven't registered for any tournaments yet</p>
        <Link to={createPageUrl("Tournaments")}>
          <Button className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600">
            Browse Tournaments
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {registrations.map((registration) => {
        const tournament = tournaments[registration.tournament_id];
        const isCompleted = tournament?.status === "Completed";
        
        return (
          <div key={registration.id}>
            <Link to={createPageUrl(`TournamentDetail?id=${registration.tournament_id}`)}>
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 transition-all mb-2">
                        {registration.tournament_title}
                      </h3>
                      <p className="text-sm text-gray-400">Team: {registration.team_name}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge className={
                        registration.status === "Confirmed" ? "bg-green-500/20 text-green-400 border-green-500/50" :
                        registration.status === "Registered" ? "bg-blue-500/20 text-blue-400 border-blue-500/50" :
                        registration.status === "Disqualified" ? "bg-red-500/20 text-red-400 border-red-500/50" :
                        "bg-gray-500/20 text-gray-400 border-gray-500/50"
                      }>
                        {registration.status}
                      </Badge>
                      {isCompleted && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                          Tournament Completed
                        </Badge>
                      )}
                    </div>
                  </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{registration.team_members?.length || 1} Members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Registered {format(new Date(registration.created_date), "MMM d, yyyy")}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800">
                  <RegistrationInvoiceDownload registration={registration} tournament={tournament} />
                  <Button
                    variant="ghost"
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      );
      })}
    </div>
  );
}