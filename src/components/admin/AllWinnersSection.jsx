import React, { useState, useEffect } from "react";
import { TournamentLeaderboard } from "@/entities/TournamentLeaderboard";
import { Tournament } from "@/entities/Tournament";
import { Diamond } from "@/entities/Diamond";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Search, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AllWinnersSection() {
  const [winners, setWinners] = useState([]);
  const [tournaments, setTournaments] = useState({});
  const [prizeStatus, setPrizeStatus] = useState({}); // key: `${tId}_${rank}` => bool
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get all finalized top-3 leaderboard entries
      const allEntries = await TournamentLeaderboard.filter({ is_finalized: true }, "rank", 500).catch(() => []);
      const top3 = allEntries.filter(e => e.rank >= 1 && e.rank <= 3);

      // Get tournament info
      const tIds = [...new Set(top3.map(e => e.tournament_id))];
      const tourMap = {};
      for (const tid of tIds) {
        const t = await Tournament.filter({ id: tid }).catch(() => []);
        if (t.length > 0) tourMap[tid] = t[0];
      }

      setWinners(top3);
      setTournaments(tourMap);

      // Check prize received: look in Diamond transactions for "Win" type matching tournament
      const statusMap = {};
      const allDiamonds = await Diamond.list("-created_date", 2000).catch(() => []);
      for (const w of top3) {
        const tourTitle = tourMap[w.tournament_id]?.title || "";
        const userDiamond = allDiamonds.find(d => d.user_id === w.user_id);
        if (userDiamond) {
          const received = (userDiamond.transactions || []).some(t =>
            t.type === "Win" && t.description?.includes(tourTitle)
          );
          statusMap[`${w.tournament_id}_${w.rank}`] = received;
        } else {
          statusMap[`${w.tournament_id}_${w.rank}`] = false;
        }
      }
      setPrizeStatus(statusMap);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filtered = winners.filter(w => {
    if (!search) return true;
    const q = search.toLowerCase();
    return w.player_ign?.toLowerCase().includes(q) ||
      w.player_uid?.includes(q) ||
      tournaments[w.tournament_id]?.title?.toLowerCase().includes(q);
  });

  // Group by tournament
  const grouped = {};
  for (const w of filtered) {
    if (!grouped[w.tournament_id]) grouped[w.tournament_id] = [];
    grouped[w.tournament_id].push(w);
  }

  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const rankColors = { 1: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", 2: "text-gray-300 bg-gray-500/10 border-gray-500/30", 3: "text-orange-400 bg-orange-500/10 border-orange-500/30" };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            All Tournament Winners
          </h3>
          <p className="text-sm text-gray-400 mt-1">Top 3 winners from all finalized tournaments</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search player or tournament..."
            className="bg-gray-800 border-gray-700 text-white pl-9"
          />
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
          <Trophy className="w-12 h-12 mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">No finalized tournament winners yet</p>
          <p className="text-xs text-gray-600 mt-1">Finalize leaderboards via Manage Kills/Wins in Tournaments tab</p>
        </Card>
      ) : (
        Object.entries(grouped).map(([tId, tWinners]) => {
          const tournament = tournaments[tId];
          return (
            <Card key={tId} className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    {tournament?.title || "Unknown Tournament"}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className="bg-purple-500/20 text-purple-400">{tournament?.mode || "N/A"}</Badge>
                    {tournament?.date_time && (
                      <Badge variant="outline" className="text-gray-400 text-xs">
                        {new Date(tournament.date_time).toLocaleDateString("en-IN")}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[1,2,3].map(rank => {
                    const w = tWinners.find(e => e.rank === rank);
                    if (!w) return (
                      <div key={rank} className="p-4 bg-gray-800/40 border border-gray-700 rounded-xl text-center">
                        <p className="text-2xl mb-1">{medals[rank]}</p>
                        <p className="text-gray-600 text-sm">No data</p>
                      </div>
                    );
                    const prizeReceived = prizeStatus[`${tId}_${rank}`];
                    return (
                      <div key={rank} className={`p-4 border rounded-xl ${rankColors[rank]} relative`}>
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-2xl">{medals[rank]}</p>
                          {prizeReceived ? (
                            <div className="flex items-center gap-1 bg-green-500/20 border border-green-500/40 rounded-full px-2 py-0.5">
                              <CheckCircle2 className="w-3 h-3 text-green-400" />
                              <span className="text-green-400 text-xs font-semibold">Prize Sent</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 rounded-full px-2 py-0.5">
                              <span className="text-red-400 text-xs font-semibold">⏳ Pending</span>
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-white text-lg">{w.player_ign}</p>
                        <p className="text-xs font-mono text-cyan-400 mb-1">{w.unique_id || w.player_uid}</p>
                        <div className="flex gap-3 text-sm mt-2">
                          <span className="text-red-400">💀 {w.kills || 0} Kills</span>
                          <span className="text-cyan-400">⭐ {w.points || 0} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}