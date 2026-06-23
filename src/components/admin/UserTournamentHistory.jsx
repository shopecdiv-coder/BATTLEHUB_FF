import React, { useState } from "react";
import { Registration } from "@/entities/Registration";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Trophy, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

export default function UserTournamentHistory() {
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Search by unique_id (BH... format)
      let foundUser = null;
      const users = await User.list("-created_date", 2000);
      foundUser = users.find(u =>
        u.unique_id?.toLowerCase() === searchId.trim().toLowerCase() ||
        u.ign?.toLowerCase() === searchId.trim().toLowerCase()
      );

      if (!foundUser) {
        setError("No user found with this Unique ID or IGN.");
        setLoading(false);
        return;
      }

      const regs = await Registration.filter({ team_leader_id: foundUser.id }, "-created_date");

      setResult({
        user: foundUser,
        registrations: regs || []
      });
    } catch (e) {
      setError("Error searching. Try again.");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          User Tournament History
        </h3>
        <p className="text-sm text-gray-400">Search by BH Unique ID or IGN to see all registered tournaments</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter BH Unique ID (e.g. BH123456) or IGN..."
                className="bg-gray-900 border-gray-700 text-white pl-9"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/40 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* User Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {result.user.avatar_url && (
                  <img src={result.user.avatar_url} alt="avatar" className="w-14 h-14 rounded-full border-2 border-cyan-500" />
                )}
                <div className="flex-1">
                  <h4 className="text-white font-bold text-lg">{result.user.ign || result.user.full_name}</h4>
                  <p className="text-cyan-400 text-sm font-mono">{result.user.unique_id}</p>
                  <p className="text-gray-400 text-xs">{result.user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-400">{result.registrations.length}</p>
                  <p className="text-gray-400 text-xs">Total Registrations</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="p-2 bg-gray-900/50 rounded text-center">
                  <p className="text-white font-semibold">{result.user.total_wins || 0}</p>
                  <p className="text-xs text-gray-400">Wins</p>
                </div>
                <div className="p-2 bg-gray-900/50 rounded text-center">
                  <p className="text-white font-semibold">{result.user.total_kills || 0}</p>
                  <p className="text-xs text-gray-400">Kills</p>
                </div>
                <div className="p-2 bg-gray-900/50 rounded text-center">
                  <p className="text-white font-semibold">{result.user.total_matches || 0}</p>
                  <p className="text-xs text-gray-400">Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registrations */}
          <div className="space-y-3">
            <h4 className="text-gray-200 font-semibold">All Registered Tournaments ({result.registrations.length})</h4>
            {result.registrations.length === 0 ? (
              <Card className="p-8 text-center bg-gray-900/50 border-gray-800">
                <p className="text-gray-500">No tournament registrations found</p>
              </Card>
            ) : (
              result.registrations.map((reg, i) => (
                <Card key={reg.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500 text-xs">#{i + 1}</span>
                          <h5 className="text-white font-semibold">{reg.tournament_title}</h5>
                        </div>
                        <p className="text-gray-400 text-sm">Team: {reg.team_name}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge className={
                            reg.payment_status === "Paid" ? "bg-green-500/20 text-green-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }>{reg.payment_status}</Badge>
                          <Badge className={
                            reg.status === "Confirmed" ? "bg-blue-500/20 text-blue-400" :
                            "bg-gray-500/20 text-gray-400"
                          }>{reg.status}</Badge>
                          {reg.payment_method && (
                            <Badge className="bg-purple-500/20 text-purple-400">{reg.payment_method}</Badge>
                          )}
                        </div>
                        {reg.team_members?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {reg.team_members.map((m, j) => (
                              <span key={j} className="text-xs text-gray-400 bg-gray-900/50 px-2 py-0.5 rounded">
                                {m.ign} {m.uid ? `(${m.uid})` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500 ml-3">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {format(new Date(reg.created_date), "dd MMM yyyy")}
                        <br />
                        {format(new Date(reg.created_date), "hh:mm a")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}