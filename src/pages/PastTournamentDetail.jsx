import React, { useState, useEffect } from "react";
import { PastTournament } from "@/entities/PastTournament";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Download, Calendar, Target, Medal, ArrowLeft, X } from "lucide-react";

import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PastTournamentDetail() {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingMedia, setViewingMedia] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const tournamentId = urlParams.get("id");

  useEffect(() => {
    loadTournament();
  }, [tournamentId]);

  const loadTournament = async () => {
    const tournaments = await PastTournament.list();
    const found = tournaments.find(t => t.id === tournamentId);
    setTournament(found);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
          <Trophy className="w-16 h-16 mx-auto text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">Tournament Not Found</h3>
          <Link to={createPageUrl("PastTournaments")}>
            <Button variant="outline" className="mt-4">
              Back to Past Tournaments
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const getMedalColor = (rank) => {
    if (rank === 1) return "from-yellow-400 to-yellow-600";
    if (rank === 2) return "from-gray-300 to-gray-500";
    if (rank === 3) return "from-orange-400 to-orange-600";
    return "from-gray-600 to-gray-700";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to={createPageUrl("PastTournaments")}>
          <Button variant="outline" className="border-gray-700 text-gray-300 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Past Tournaments
          </Button>
        </Link>

        <div>
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-cyan-500/20 text-cyan-400 text-lg px-4 py-1">
                      {tournament.mode}
                    </Badge>
                    <Badge variant="outline" className="border-purple-500/50 text-purple-400 text-lg px-4 py-1">
                      {tournament.tournament_id}
                    </Badge>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-100">{tournament.title}</h1>
                  <div className="flex items-center gap-2 text-gray-400 mt-2">
                    <Calendar className="w-5 h-5" />
                    <span>{format(new Date(tournament.date), "PPP")}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Result Media */}
        {tournament.result_image_url && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100">Tournament Result</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={tournament.result_image_url}
                alt="Tournament Result"
                className="w-full rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setViewingMedia(tournament.result_image_url)}
              />
            </CardContent>
          </Card>
        )}

        {/* Winners Table */}
        {tournament.winners && tournament.winners.length > 0 && (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Trophy className="w-6 h-6 text-gold-500" />
                Winners & Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tournament.winners.map((winner) => (
                  <div
                    key={winner.rank}
                    className={`p-4 rounded-lg bg-gradient-to-r ${getMedalColor(winner.rank)} bg-opacity-10 border-2 ${
                      winner.rank === 1 ? 'border-yellow-500/50' :
                      winner.rank === 2 ? 'border-gray-400/50' :
                      winner.rank === 3 ? 'border-orange-500/50' :
                      'border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getMedalColor(winner.rank)} flex items-center justify-center`}>
                          {winner.rank <= 3 ? (
                            <Medal className="w-6 h-6 text-white" />
                          ) : (
                            <span className="text-white font-bold">#{winner.rank}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-100">{winner.player_name}</h3>
                          <p className="text-sm text-cyan-400 font-mono">UID: {winner.uid}</p>
                        </div>
                      </div>
                      <div className="flex gap-6 text-center">
                        <div>
                          <div className="text-2xl font-bold text-cyan-400">{winner.kills}</div>
                          <div className="text-xs text-gray-500">Kills</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gold-500">{winner.reward} 🪙</div>
                          <div className="text-xs text-gray-500">Reward</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reward Structure */}
        {tournament.reward_structure && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100">Reward Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <Trophy className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                  <div className="text-2xl font-bold text-yellow-400">{tournament.reward_structure.first} 🪙</div>
                  <div className="text-sm text-gray-400">1st Place</div>
                </div>
                <div className="text-center p-4 bg-gray-500/10 rounded-lg border border-gray-400/30">
                  <Trophy className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <div className="text-2xl font-bold text-gray-300">{tournament.reward_structure.second} 🪙</div>
                  <div className="text-sm text-gray-400">2nd Place</div>
                </div>
                <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <Trophy className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                  <div className="text-2xl font-bold text-orange-400">{tournament.reward_structure.third} 🪙</div>
                  <div className="text-sm text-gray-400">3rd Place</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* YouTube Link */}
        {tournament.youtube_link && (
          <Card className="bg-gradient-to-r from-red-900/30 to-red-800/20 border-red-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-100">Watch Live Gameplay</h3>
                    <p className="text-sm text-gray-400">Watch the full tournament replay on YouTube</p>
                  </div>
                </div>
                <a href={tournament.youtube_link} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 8.64L15.27 12 10 15.36V8.64M8 5v14l11-7L8 5z"/>
                    </svg>
                    Watch Now
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {tournament.description && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100">Tournament Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">{tournament.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Full Tournament Details (Rich Text) */}
        {tournament.full_details && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100">Full Tournament Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="text-gray-300 leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: tournament.full_details }}
              />
            </CardContent>
          </Card>
        )}

        {/* Download PDF */}
        {tournament.result_pdf_url && (
          <Card className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border-cyan-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="w-8 h-8 text-cyan-400" />
                  <div>
                    <h3 className="font-bold text-gray-100">Download Full Result</h3>
                    <p className="text-sm text-gray-400">Complete tournament report PDF</p>
                  </div>
                </div>
                <a href={tournament.result_pdf_url} target="_blank" rel="noopener noreferrer" download>
                  <Button className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full Screen Media Viewer */}
      {viewingMedia && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingMedia(null)}
        >
          <button
            onClick={() => setViewingMedia(null)}
            className="absolute top-4 right-4 p-2 bg-gray-800 rounded-full hover:bg-gray-700"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={viewingMedia}
            alt="Full screen view"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}