import React, { useState, useEffect } from "react";
import { PastTournament } from "@/entities/PastTournament";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Search, Download, Calendar, Target, Users, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function PastTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("all");

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    filterTournaments();
  }, [searchQuery, modeFilter, tournaments]);

  const loadTournaments = async () => {
    const allTournaments = await PastTournament.list("-date");
    setTournaments(allTournaments);
    setFilteredTournaments(allTournaments);
    setLoading(false);
  };

  const filterTournaments = () => {
    let filtered = tournaments;

    if (searchQuery) {
      const lowerQuery = String(searchQuery).toLowerCase();
      filtered = filtered.filter(t => 
        String(t.title || "").toLowerCase().includes(lowerQuery) ||
        String(t.tournament_id || "").toLowerCase().includes(lowerQuery) ||
        t.winners?.some(w => String(w.uid || "").toLowerCase().includes(lowerQuery))
      );
    }

    if (modeFilter !== "all") {
      filtered = filtered.filter(t => t.mode === modeFilter);
    }

    setFilteredTournaments(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-cyan-500" />
            Past Tournaments
          </h1>
          <p className="text-gray-400 mt-1">View completed tournaments, winners, and results</p>
        </motion.div>

        {/* Search and Filters */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by tournament name, ID, or winner UID..."
                  className="pl-10 bg-gray-800 border-gray-700 text-gray-100"
                />
              </div>
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="w-full md:w-48 bg-gray-800 border-gray-700 text-gray-100">
                  <SelectValue placeholder="Filter by mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="Solo">Solo</SelectItem>
                  <SelectItem value="Duo">Duo</SelectItem>
                  <SelectItem value="Squad">Squad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Grid */}
        {filteredTournaments.length === 0 ? (
          <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
            <Trophy className="w-16 h-16 mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Tournaments Found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament, index) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={createPageUrl(`PastTournamentDetail?id=${tournament.id}`)}>
                  <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-cyan-500/50 transition-all cursor-pointer h-full">
                    {tournament.result_image_url && (
                      <div className="h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={tournament.result_image_url}
                          alt={tournament.title}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge className="bg-cyan-500/20 text-cyan-400">
                          {tournament.mode}
                        </Badge>
                        <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                          {tournament.tournament_id}
                        </Badge>
                      </div>
                      <CardTitle className="text-gray-100">{tournament.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(tournament.date), "PPP")}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {tournament.winners && tournament.winners.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                            <Trophy className="w-4 h-4 text-gold-500" />
                            <span>Winner: {tournament.winners[0].player_name}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                              <div className="text-gray-400">Kills</div>
                              <div className="text-cyan-400 font-bold">{tournament.winners[0].kills}</div>
                            </div>
                            <div>
                              <div className="text-gray-400">UID</div>
                              <div className="text-purple-400 font-bold">{tournament.winners[0].uid}</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Reward</div>
                              <div className="text-gold-500 font-bold">{tournament.winners[0].reward} 🪙</div>
                            </div>
                          </div>
                        </div>
                      )}
                      <Button className="w-full mt-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}