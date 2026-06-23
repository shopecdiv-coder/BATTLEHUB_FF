import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Eye } from "lucide-react";
import { format } from "date-fns";

export default function MatchList({ matches, tournamentStatus }) {
  if (matches.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardContent className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Matches Yet</h3>
          <p className="text-gray-500">Matches will be created once registration closes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <Card key={match.id} className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-purple-500/50 transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-100">
                Match #{match.match_number}
              </CardTitle>
              <Badge className={
                match.status === "Live" ? "bg-red-500 text-white" :
                match.status === "Completed" ? "bg-green-500 text-white" :
                "bg-gray-500 text-white"
              }>
                {match.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {match.start_time && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(match.start_time), "PPP p")}</span>
              </div>
            )}

            {match.room_code && (
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Room Code</p>
                <p className="font-mono text-lg font-bold text-purple-400">{match.room_code}</p>
                {match.room_password && (
                  <>
                    <p className="text-xs text-gray-400 mt-2 mb-1">Password</p>
                    <p className="font-mono text-lg font-bold text-cyan-400">{match.room_password}</p>
                  </>
                )}
              </div>
            )}

            {match.results && match.results.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-300">Results</p>
                <div className="space-y-1">
                  {match.results.slice(0, 3).map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-800/30 rounded text-sm">
                      <span className="text-gray-300">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} {result.team_name}
                      </span>
                      <span className="text-purple-400 font-semibold">
                        {result.total_points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link to={createPageUrl(`MatchDetail?id=${match.id}`)}>
              <Button variant="outline" className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                <Eye className="w-4 h-4 mr-2" />
                View Match Details
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}