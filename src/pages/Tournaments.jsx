import React, { useState, useEffect } from "react";
import { Tournament } from "@/entities/Tournament";
import { Registration } from "@/entities/Registration";
import { User } from "@/entities/User";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, MapPin, Search, Plus, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import { format } from "date-fns";
import RegistrationCloseTimer from "../components/RegistrationCloseTimer";
import { cacheGet, cacheSet } from "@/lib/cache";

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Registration Open");
  const [modeFilter, setModeFilter] = useState("all");
  const [mapFilter, setMapFilter] = useState("all");
  const [mainTab, setMainTab] = useState("all");
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [myTournamentsMap, setMyTournamentsMap] = useState({});
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, modeFilter, mapFilter]);

  useEffect(() => {
    applyFilters();
  }, [tournaments, searchQuery, statusFilter, modeFilter, mapFilter]);

  const loadData = async () => {
    // Load tournaments immediately - don't wait for user data
    const CACHE_KEY = 'tournaments_list';
    const cached = cacheGet(CACHE_KEY);
    if (cached) {
      setTournaments(cached);
      setLoading(false);
    } else {
      Tournament.list("-date_time").then(t => {
        const data = t || [];
        cacheSet(CACHE_KEY, data, 5 * 60 * 1000);
        setTournaments(data);
        setLoading(false);
      }).catch(() => { setLoading(false); });
    }

    const currentUser = await User.me().catch(() => null);
    if (currentUser) {
      setUser(currentUser);
      const regs = await Registration.filter({ team_leader_id: currentUser.id }, "-created_date").catch(() => []);
      setMyRegistrations(regs);
      // Load tournament details for each registration in parallel
      const map = {};
      await Promise.all(regs.map(async (reg) => {
        const t = await Tournament.filter({ id: reg.tournament_id }).catch(() => []);
        if (t.length > 0) map[reg.tournament_id] = t[0];
      }));
      setMyTournamentsMap(map);
    }
  };

  const applyFilters = () => {
    let filtered = tournaments;

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (modeFilter !== "all") {
      filtered = filtered.filter(t => t.mode === modeFilter);
    }

    if (mapFilter !== "all") {
      filtered = filtered.filter(t => t.map === mapFilter);
    }

    setFilteredTournaments(filtered);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              Tournaments
            </h1>
          </div>
          {user?.role === 'admin' && (
            <Link to={createPageUrl("CreateTournament")}>
              <Button className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Tournament
              </Button>
            </Link>
          )}
        </div>

        {/* Main Tabs: All Tournaments vs My Matches */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="bg-gray-800 grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="all">All Tournaments</TabsTrigger>
            <TabsTrigger value="my" className="relative">
              My Matches
              {myRegistrations.length > 0 && (
                <span className="ml-1.5 bg-orange-500 text-white text-[9px] rounded-full px-1 font-bold">{myRegistrations.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {/* Status filters for All Tournaments */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 mb-4">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search tournaments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-gray-800 border-gray-700 text-gray-100"
                    />
                  </div>
                  <Select value={modeFilter} onValueChange={setModeFilter}>
                    <SelectTrigger className="w-full md:w-36 bg-gray-800 border-gray-700 text-gray-100">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modes</SelectItem>
                      <SelectItem value="Solo">Solo</SelectItem>
                      <SelectItem value="Duo">Duo</SelectItem>
                      <SelectItem value="Squad">Squad</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={mapFilter} onValueChange={setMapFilter}>
                    <SelectTrigger className="w-full md:w-36 bg-gray-800 border-gray-700 text-gray-100">
                      <SelectValue placeholder="Map" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Maps</SelectItem>
                      <SelectItem value="Bermuda">Bermuda</SelectItem>
                      <SelectItem value="Purgatory">Purgatory</SelectItem>
                      <SelectItem value="Kalahari">Kalahari</SelectItem>
                      <SelectItem value="Alpine">Alpine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList className="bg-gray-900 grid grid-cols-4 w-full">
                    <TabsTrigger value="Upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="Registration Open">Open</TabsTrigger>
                    <TabsTrigger value="Live">Live</TabsTrigger>
                    <TabsTrigger value="Completed">Completed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <Card key={i} className="bg-gray-900/50 border-gray-800">
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
            ) : filteredTournaments.length === 0 ? (
              <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
                <Trophy className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Tournaments Found</h3>
                <p className="text-gray-500">Try adjusting your filters or check back later!</p>
              </Card>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTournaments.slice(0, page * PAGE_SIZE).map((tournament) => (
                    <div key={tournament.id}>
                      <Link to={createPageUrl(`TournamentDetail?id=${tournament.id}`)}>
                        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 overflow-hidden group h-full">
                          <div className="h-48 bg-gradient-to-br from-purple-600/20 to-cyan-600/20 relative overflow-hidden">
                            {tournament.banner_url && (
                              <img src={tournament.banner_url} alt={tournament.title} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                            {(() => {
                              const isSFGF = tournament.tournament_type === "Semifinal" || tournament.tournament_type === "Grand Final";
                              if (isSFGF && tournament.status === "Registration Open") return null;
                              return (
                                <div className="absolute top-4 right-4">
                                  <Badge className={
                                    tournament.status === "Live" ? "bg-red-500/90 text-white" :
                                    tournament.status === "Registration Open" ? "bg-green-500/90 text-white" :
                                    tournament.status === "Completed" ? "bg-gray-500/90 text-white" :
                                    "bg-yellow-500/90 text-white"
                                  }>
                                    {tournament.status}
                                  </Badge>
                                </div>
                              );
                            })()}
                          </div>
                          <CardHeader className="pb-3">
                            <h3 className="text-xl font-bold text-gray-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 transition-all">
                              {tournament.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                              <Badge variant="outline" className="border-purple-500/50 text-purple-400">{tournament.mode}</Badge>
                              {tournament.tournament_type && tournament.tournament_type !== "Qualifier" && (
                                <Badge className={tournament.tournament_type === "Grand Final" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : tournament.tournament_type === "Semifinal" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
                                  {tournament.tournament_type}
                                </Badge>
                              )}
                              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                                <MapPin className="w-3 h-3 mr-1" />{tournament.map}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(tournament.date_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })} IST</span>
                            </div>
                            {tournament.registration_closes && tournament.status === "Registration Open" && (
                              <div className="text-xs">
                                <RegistrationCloseTimer closingDate={tournament.registration_closes} />
                              </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-gray-400">
                                <Users className="w-4 h-4" />
                                <span>{tournament.current_teams || 0}/{tournament.max_teams} Teams</span>
                              </div>
                              <div className="flex items-center gap-2 text-purple-400 font-semibold">
                                <Trophy className="w-4 h-4" />
                                <span>₹{tournament.prize_pool?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                            <Button className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold">
                              View Details
                            </Button>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  ))}
                </div>
                {filteredTournaments.length > page * PAGE_SIZE && (
                  <div className="flex justify-center mt-6">
                    <Button onClick={() => setPage(p => p + 1)} variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                      Load More ({filteredTournaments.length - page * PAGE_SIZE} more)
                    </Button>
                  </div>
                )}
              </>
            )}

          </TabsContent>

          <TabsContent value="my">
            {myRegistrations.length === 0 ? (
              <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
                <Trophy className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Registered Tournaments</h3>
                <p className="text-gray-500 mb-6">You haven't registered for any tournaments yet</p>
                <Button onClick={() => setMainTab("all")} className="bg-gradient-to-r from-purple-500 to-cyan-500">
                  Browse Tournaments
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {myRegistrations.map((registration) => {
                  const tournament = myTournamentsMap[registration.tournament_id];
                  const isCompleted = tournament?.status === "Completed";
                  return (
                    <Link key={registration.id} to={createPageUrl(`TournamentDetail?id=${registration.tournament_id}`)}>
                      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-purple-500/50 transition-all group">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-100 group-hover:text-purple-400 transition-all">
                                {registration.tournament_title}
                              </h3>
                              <p className="text-sm text-gray-400">Team: {registration.team_name}</p>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Badge className={
                                registration.status === "Confirmed" ? "bg-green-500/20 text-green-400 border-green-500/50" :
                                registration.status === "Registered" ? "bg-blue-500/20 text-blue-400 border-blue-500/50" :
                                "bg-gray-500/20 text-gray-400 border-gray-500/50"
                              }>
                                {registration.status}
                              </Badge>
                              {isCompleted && (
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">Completed</Badge>
                              )}
                              {tournament && !isCompleted && (
                                <Badge className={
                                  tournament.status === "Live" ? "bg-red-500/20 text-red-400" :
                                  tournament.status === "Registration Open" ? "bg-green-500/20 text-green-400" :
                                  "bg-yellow-500/20 text-yellow-400"
                                }>{tournament.status}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{registration.team_members?.length || 1} Members</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Registered {format(new Date(registration.created_date), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                          <div className="flex justify-end mt-3">
                            <span className="text-purple-400 text-sm flex items-center gap-1">View Details <ArrowRight className="w-3 h-3" /></span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}