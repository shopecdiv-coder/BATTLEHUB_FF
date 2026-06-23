import React, { useState, useEffect } from "react";
import { Match } from "@/entities/Match";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, Trophy, Flag, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function MatchDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get("id");

  const [match, setMatch] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [matchId]);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      // Not logged in
    }

    const matchData = await Match.filter({ id: matchId });
    if (matchData.length > 0) {
      setMatch(matchData[0]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
          <h3 className="text-xl font-semibold text-gray-300">Match not found</h3>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-gray-100">
                      Match #{match.match_number}
                    </CardTitle>
                    <p className="text-gray-400 mt-1">{match.tournament_title}</p>
                  </div>
                  <Badge className={
                    match.status === "Live" ? "bg-red-500 text-white" :
                    match.status === "Completed" ? "bg-green-500 text-white" :
                    "bg-gray-500 text-white"
                  }>
                    {match.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {match.start_time && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-5 h-5" />
                    <span>{format(new Date(match.start_time), "PPP p")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {match.results && match.results.length > 0 && (
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-100">
                    <Trophy className="w-5 h-5 text-purple-400" />
                    Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {match.results.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg flex items-center justify-between ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-900/30 to-yellow-800/10 border border-yellow-500/20' :
                          index === 1 ? 'bg-gradient-to-r from-gray-700/30 to-gray-600/10 border border-gray-500/20' :
                          index === 2 ? 'bg-gradient-to-r from-orange-900/30 to-orange-800/10 border border-orange-500/20' :
                          'bg-gray-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-100">{result.team_name}</p>
                            <p className="text-sm text-gray-400">
                              Placement: {result.placement} • Kills: {result.kills}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-400">{result.total_points}</p>
                          <p className="text-xs text-gray-500">points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {match.screenshot_urls && match.screenshot_urls.length > 0 && (
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-100">
                    <ImageIcon className="w-5 h-5" />
                    Evidence Screenshots
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {match.screenshot_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-gray-700 group-hover:border-purple-500/50 transition-colors"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">View Full Size</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {match.room_code && (
              <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/10 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-gray-100">Room Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-gray-400 text-sm">Room Code</Label>
                    <div className="mt-1 p-3 bg-gray-900/50 rounded-lg">
                      <p className="font-mono text-xl font-bold text-purple-400 text-center">
                        {match.room_code}
                      </p>
                    </div>
                  </div>
                  {match.room_password && (
                    <div>
                      <Label className="text-gray-400 text-sm">Password</Label>
                      <div className="mt-1 p-3 bg-gray-900/50 rounded-lg">
                        <p className="font-mono text-xl font-bold text-cyan-400 text-center">
                          {match.room_password}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {user && (
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-100">
                    <Flag className="w-5 h-5 text-red-400" />
                    Report Issue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4">
                    Found cheating or suspicious activity? Report it here.
                  </p>
                  <Button
                    onClick={() => setShowReportForm(true)}
                    variant="outline"
                    className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    File a Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}