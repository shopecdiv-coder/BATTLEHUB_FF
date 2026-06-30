import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { PlayerMessage } from "@/entities/PlayerMessage";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Trophy, X, Copy, CheckCircle, ChevronDown } from "lucide-react";

const getExtraMessageOnly = (message) => {
  if (!message) return "";
  if (message.startsWith("ROOM ID:")) {
    const parts = message.split("\n\n");
    if (parts.length > 1) {
      return parts.slice(1).join("\n\n");
    }
    return "";
  }
  return message;
};

export default function GlobalMatchCredentials() {
  const [credentials, setCredentials] = useState([]);
  const [playerMsgCredentials, setPlayerMsgCredentials] = useState([]);
  const [user, setUser] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadCredentials();
    const interval = setInterval(loadCredentials, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCredentials = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const userRegistrations = await Registration.filter({
        team_leader_id: currentUser.id,
        status: "Confirmed"
      });

      const credentialsList = [];
      for (const reg of userRegistrations) {
        const tournaments = await Tournament.filter({ id: reg.tournament_id });
        if (tournaments.length > 0) {
          const tournament = tournaments[0];
          const matchTime = new Date(tournament.date_time).getTime();
          const now = Date.now();
          const tenMinBefore = matchTime - 10 * 60 * 1000;
          if (tournament.room_code && now >= tenMinBefore) {
            credentialsList.push({
              id: tournament.id,
              tournament_title: tournament.title,
              room_code: tournament.room_code,
              room_password: tournament.room_password,
              status: tournament.status,
              source: "tournament"
            });
          }
        }
      }
      setCredentials(credentialsList);

      // Load PlayerMessages with room credentials (auto-expire after 15 min)
      const msgs = await PlayerMessage.filter({ recipient_id: currentUser.id }).then(res => res.filter(m => !m.read)).catch(() => []);
      const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
      const activeMessages = msgs.filter(msg => {
        if (!msg.room_code) return false;
        return new Date(msg.sent_at || msg.created_date).getTime() > fifteenMinAgo;
      });
      setPlayerMsgCredentials(activeMessages);
    } catch {}
  };

  const handleCopy = (credential) => {
    const textToCopy = `Match ID: ${credential.room_code} | Password: ${credential.room_password || "N/A"}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const visibleCredentials = credentials.filter(cred => !dismissed.has(cred.id));
  const allVisible = [...visibleCredentials, ...playerMsgCredentials.filter(m => !dismissed.has(m.id))];

  if (allVisible.length === 0) return null;

  // Minimized: floating icon at TOP-LEFT corner
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed top-20 left-3 z-[200] w-12 h-12 rounded-full shadow-2xl flex items-center justify-center border-2 border-cyan-400"
        style={{ background: "rgba(10, 10, 26, 0.97)", backdropFilter: "blur(10px)" }}
      >
        <Trophy className="w-6 h-6 text-cyan-400" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
          {allVisible.length}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed top-20 left-3 z-[100] max-w-xs space-y-3">
      {allVisible.map((credential) => (
        <div
          key={credential.id}
          className="border-2 border-cyan-400 rounded-2xl p-4 shadow-2xl relative overflow-hidden"
          style={{ background: "rgba(10, 10, 26, 0.97)", backdropFilter: "blur(20px)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10"></div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">🏆 Match Credentials</p>
                  <p className="text-cyan-400 text-xs">{credential.tournament_title}</p>
                </div>
              </div>
              {/* Minimize button */}
              <button
                onClick={() => setMinimized(true)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                title="Minimize"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl p-3 space-y-2 border border-cyan-500/30 bg-gray-900/60">
              <div>
                <p className="text-cyan-400 text-xs font-bold mb-1">MATCH ID</p>
                <div className="border border-cyan-400 rounded-lg px-3 py-2">
                  <p className="text-xl font-black text-cyan-400 text-center tracking-wider">
                    {credential.room_code}
                  </p>
                </div>
              </div>
              {credential.room_password && (
                <div>
                  <p className="text-red-400 text-xs font-bold mb-1">PASSWORD</p>
                  <div className="border border-red-400 rounded-lg px-3 py-2">
                    <p className="text-xl font-black text-red-400 text-center tracking-wider">
                      {credential.room_password}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Extra Message Display */}
            {(() => {
              const extraMsg = getExtraMessageOnly(credential.message);
              if (!extraMsg) return null;
              return (
                <div className="mt-3 p-3 rounded-xl bg-gray-950/80 border border-cyan-500/20 text-xs text-cyan-200 whitespace-pre-wrap break-words leading-relaxed">
                  <p className="font-bold text-[10px] text-cyan-400 uppercase tracking-wider mb-1">📢 Admin Message</p>
                  {extraMsg}
                </div>
              );
            })()}


            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => handleCopy(credential)}
                className="flex-1 bg-cyan-500/20 border border-cyan-400 text-cyan-400 hover:bg-cyan-500/30 font-bold text-xs h-9"
                variant="outline"
              >
                {copied ? <><CheckCircle className="w-3 h-3 mr-1" />Copied!</> : <><Copy className="w-3 h-3 mr-1" />Copy</>}
              </Button>
              <Button
                onClick={() => setMinimized(true)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs h-9"
              >
                Minimize
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              ⬇️ Click minimize — icon stays on screen
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}