import React, { useState, useEffect } from "react";
import { Tournament } from "@/entities/Tournament";
import { Registration } from "@/entities/Registration";
import { User } from "@/entities/User";
import { Link, useLocation } from "react-router-dom";
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

const TournamentCard = ({ tournament, registration }) => {
  const isSFGF = tournament.tournament_type === "Semifinal" || tournament.tournament_type === "Grand Final";

  return (
    <div className="h-full">
      <Link to={createPageUrl(`TournamentDetail?id=${tournament.id}`)}>
        <div className="h-full bg-gray-950 border border-gray-800 hover:border-orange-500/50 rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.98] group flex flex-col">
          {/* Banner */}
          <div className="h-28 relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex-shrink-0">
            {tournament.banner_url ? (
              <img src={tournament.banner_url} alt={tournament.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-orange-500/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
            
            {/* Registration Overlay if My Matches */}
            {registration && (
              <div className="absolute top-1.5 left-1.5 z-10 max-w-[60%] truncate">
                <Badge className="bg-gray-900/90 text-purple-400 font-bold border border-gray-700 shadow-md px-1.5 py-0.5 text-[9px]">
                  {registration.status}
                </Badge>
              </div>
            )}

            {/* Status badge */}
            {!(isSFGF && tournament.status === "Registration Open") && (
              <div className="absolute top-1.5 right-1.5">
                <Badge className={`text-[9px] font-bold px-1.5 py-0.5 ${
                  tournament.status === "Registration Open" ? "bg-emerald-500 text-white" :
                  tournament.status === "Live" ? "bg-red-500 text-white" :
                  "bg-gray-700 text-gray-300"
                }`}>
                  {tournament.status}
                </Badge>
              </div>
            )}
            {/* Type Badge */}
            {tournament.tournament_type && !registration && (
              <div className="absolute top-1.5 left-1.5">
                <Badge className="bg-gray-900/80 backdrop-blur-sm text-gray-200 border border-gray-700 text-[9px] px-1.5 py-0.5">
                  {tournament.tournament_type}
                </Badge>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 pb-3 flex flex-col flex-grow">
            <h3 className="text-white font-bold text-sm line-clamp-1 mb-2 group-hover:text-orange-400 transition-colors">{tournament.title}</h3>
            <div className="flex items-center gap-1 flex-wrap mb-2">
              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] px-1.5 py-0">{tournament.mode}</Badge>
              {tournament.map && <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] px-1.5 py-0">{tournament.map}</Badge>}
            </div>
            
            <div className="flex flex-col gap-1.5 mt-auto">
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <div className="flex items-center gap-1 min-w-0">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {format(new Date(tournament.date_time), "MMM d, h:mm a")}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-yellow-400 font-bold flex-shrink-0">
                  <Trophy className="w-3 h-3" />
                  <span>₹{(tournament.prize_pool || 0).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{tournament.current_teams || 0}/{tournament.max_teams}</span>
                </div>
                {tournament.status === "Registration Open" && !isSFGF && (
                  <span className="text-orange-400 font-bold text-[10px] px-2 py-0.5 bg-orange-500/10 rounded-sm">JOIN</span>
                )}
                {registration && (
                  <span className="text-orange-400 font-bold text-[10px] flex items-center gap-1">Details <ArrowRight className="w-2.5 h-2.5"/></span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default function Tournaments() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const defaultTab = searchParams.get("tab") || "all";

  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("upcoming");
  const [modeFilter, setModeFilter] = useState("all");
  const [mapFilter, setMapFilter] = useState("all");
  const [mainTab, setMainTab] = useState(defaultTab);
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

  const autoCloseTournaments = (tournamentsList) => {
    const now = new Date();
    tournamentsList.forEach(t => {
      if (t.status === "Registration Open" && t.registration_closes && new Date(t.registration_closes) < now) {
        t.status = "Registration Closed";
        Tournament.update(t.id, { status: "Registration Closed" }).catch(() => {});
      }
    });
    return tournamentsList;
  };

  const loadData = async () => {
    // Load tournaments immediately - don't wait for user data
    const CACHE_KEY = 'tournaments_list';
    const cached = cacheGet(CACHE_KEY);
    if (cached) {
      setTournaments(autoCloseTournaments(cached));
      setLoading(false);
    } else {
      Tournament.list("-date_time").then(t => {
        const data = autoCloseTournaments(t || []);
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
        String(t.title || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter === "upcoming") {
      // Only Qualifiers that are Open
      filtered = filtered.filter(t => 
        t.status === "Registration Open" && 
        t.tournament_type !== "Semifinal" && 
        t.tournament_type !== "Grand Final"
      );
    } else if (statusFilter === "live") {
      filtered = filtered.filter(t => t.status === "Live");
    } else if (statusFilter === "closed") {
      // Qualifiers that are Closed + Any Semis/Finals that are Open or Closed
      filtered = filtered.filter(t => 
        t.status === "Registration Closed" || 
        (t.status === "Registration Open" && (t.tournament_type === "Semifinal" || t.tournament_type === "Grand Final"))
      );
    } else if (statusFilter === "completed") {
      filtered = filtered.filter(t => t.status === "Completed");
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
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="live">Live</TabsTrigger>
                    <TabsTrigger value="closed">Closed</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
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
            ) : statusFilter === "closed" ? (
              <div className="space-y-6">
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5">
                  <h2 className="text-[15px] font-black text-gray-200 tracking-wide uppercase mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Qualifiers
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                    {filteredTournaments.filter(t => t.tournament_type === "Qualifier" || !t.tournament_type).slice(0, page * PAGE_SIZE).map((tournament) => (
                      <TournamentCard key={tournament.id} tournament={tournament} />
                    ))}
                  </div>
                </div>
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5">
                  <h2 className="text-[15px] font-black text-gray-200 tracking-wide uppercase mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Semifinals
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                    {filteredTournaments.filter(t => t.tournament_type === "Semifinal").slice(0, page * PAGE_SIZE).map((tournament) => (
                      <TournamentCard key={tournament.id} tournament={tournament} />
                    ))}
                  </div>
                </div>
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5">
                  <h2 className="text-[15px] font-black text-gray-200 tracking-wide uppercase mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    Grand Finals
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                    {filteredTournaments.filter(t => t.tournament_type === "Grand Final").slice(0, page * PAGE_SIZE).map((tournament) => (
                      <TournamentCard key={tournament.id} tournament={tournament} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {filteredTournaments.slice(0, page * PAGE_SIZE).map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} />
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
              <div className="space-y-10">
                {myRegistrations.filter(r => myTournamentsMap[r.tournament_id]?.status !== "Completed").length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-orange-400 mb-4 border-b border-gray-800 pb-2 uppercase tracking-wider">Upcoming My Matches</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                      {myRegistrations.filter(r => myTournamentsMap[r.tournament_id]?.status !== "Completed").map((registration) => {
                        const tournament = myTournamentsMap[registration.tournament_id];
                        if (!tournament) return null;
                        return (
                          <TournamentCard key={registration.id} tournament={tournament} registration={registration} />
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {myRegistrations.filter(r => myTournamentsMap[r.tournament_id]?.status === "Completed").length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-500 mb-4 border-b border-gray-800 pb-2 uppercase tracking-wider">Past Matches</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                      {myRegistrations.filter(r => myTournamentsMap[r.tournament_id]?.status === "Completed").map((registration) => {
                        const tournament = myTournamentsMap[registration.tournament_id];
                        if (!tournament) return null;
                        return (
                          <TournamentCard key={registration.id} tournament={tournament} registration={registration} />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}