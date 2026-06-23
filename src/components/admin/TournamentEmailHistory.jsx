import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function TournamentEmailHistory({ tournaments }) {
  const [registrations, setRegistrations] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [sentEmails, setSentEmails] = useState(new Set());

  useEffect(() => {
    if (selectedTournament) loadRegistrations();
  }, [selectedTournament]);

  const loadRegistrations = async () => {
    setLoading(true);
    const regs = await Registration.filter({ tournament_id: selectedTournament }, "-created_date").catch(() => []);
    setRegistrations(regs || []);
    setLoading(false);
  };

  const tournament = tournaments?.find(t => t.id === selectedTournament);

  const sendConfirmationEmail = async (reg) => {
    if (!reg.created_by) { alert("No email found for this user"); return; }
    setSendingEmail(reg.id);
    try {
      const matchDate = tournament?.date_time ? new Date(tournament.date_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "TBD";
      const invoiceId = `BHFF-${reg.id?.slice(-8)?.toUpperCase() || "00000000"}`;
      const membersList = reg.team_members?.map((m, i) => `  ${i+1}. ${m.ign} (UID: ${m.uid})${m.isLeader ? " [Team Head]" : ""}`).join("\n") || `  1. ${reg.team_leader_ign} (UID: ${reg.team_leader_uid})`;

      await base44.integrations.Core.SendEmail({
        to: reg.created_by,
        subject: `✅ Registration Confirmed — ${tournament?.title} | BattleHub FF`,
        body: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏆 BATTLEHUB FF — REGISTRATION CONFIRMED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${reg.team_leader_ign},

Your registration has been confirmed. Below are your tournament details and entry invoice.

──────────────────────────────────────
  📋 TOURNAMENT INFORMATION
──────────────────────────────────────
  Tournament   : ${tournament?.title || "N/A"}
  Mode         : ${tournament?.mode || "N/A"}
  Map          : ${tournament?.map || "Bermuda"}
  Match Date   : ${matchDate}
  Team Name    : ${reg.team_name}

──────────────────────────────────────
  👥 REGISTERED PLAYERS
──────────────────────────────────────
${membersList}

──────────────────────────────────────
  🧾 ENTRY INVOICE  [${invoiceId}]
──────────────────────────────────────
  Invoice No.  : ${invoiceId}
  Date         : ${format(new Date(reg.created_date), "dd MMM yyyy, hh:mm a")}
  Player       : ${reg.team_leader_ign}
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  Entry Fee    : ${tournament?.entry_fee || 0} ${reg.payment_method === "Diamond" ? "Diamond 💎" : "BH Coin 🪙"}
  Payment Mode : In-App Wallet (${reg.payment_method || "N/A"})
  Status       : PAID ✅
──────────────────────────────────────

📌 IMPORTANT NOTES:
  • Room ID & Password will be shared via pop-up 5 minutes before match.
  • Keep notifications ON.
  • IGN mismatch may lead to disqualification.

🎮 Good luck and play fair!

──────────────────────────────────────
BattleHub FF | Official Tournament Platform
──────────────────────────────────────
`
      });
      setSentEmails(prev => new Set([...prev, reg.id]));
      alert(`✅ Email sent to ${reg.created_by}`);
    } catch (e) {
      alert("❌ Failed to send email: " + (e.message || "Unknown error"));
    }
    setSendingEmail(null);
  };

  const sendBulkEmails = async () => {
    if (!registrations.length) return;
    const pending = registrations.filter(r => !sentEmails.has(r.id) && r.created_by);
    if (!pending.length) { alert("All emails already sent!"); return; }
    if (!confirm(`Send emails to ${pending.length} players?`)) return;
    
    for (const reg of pending) {
      await sendConfirmationEmail(reg);
      await new Promise(r => setTimeout(r, 500));
    }
    alert(`✅ Sent ${pending.length} emails!`);
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-gray-100 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Email History & Resend
          </CardTitle>
          {registrations.length > 0 && (
            <Button onClick={sendBulkEmails} className="bg-blue-600 hover:bg-blue-700 text-sm">
              <Send className="w-4 h-4 mr-2" /> Send All ({registrations.filter(r => !sentEmails.has(r.id)).length} pending)
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Select a tournament to view email history" />
          </SelectTrigger>
          <SelectContent>
            {(tournaments || []).map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.title} — {format(new Date(t.date_time), "dd MMM yyyy")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {!loading && selectedTournament && registrations.length === 0 && (
          <p className="text-gray-500 text-center py-8">No registrations for this tournament</p>
        )}

        {!loading && registrations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{registrations.length} registrations</span>
              <span className="text-green-400">{sentEmails.size} emails sent this session</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {registrations.map(reg => (
                <div key={reg.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-white text-sm truncate">{reg.team_leader_ign}</p>
                      <Badge className={reg.payment_status === "Paid" ? "bg-green-500/20 text-green-400 text-xs" : "bg-yellow-500/20 text-yellow-400 text-xs"}>
                        {reg.payment_method || "N/A"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{reg.team_name} • {format(new Date(reg.created_date), "dd MMM, HH:mm")}</p>
                    <p className="text-xs text-blue-400">{reg.created_by || "No email"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sentEmails.has(reg.id) ? (
                      <div className="flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle className="w-4 h-4" />
                        <span>Sent</span>
                      </div>
                    ) : (
                      <Clock className="w-4 h-4 text-gray-600" />
                    )}
                    <Button
                      size="sm"
                      onClick={() => sendConfirmationEmail(reg)}
                      disabled={!reg.created_by || sendingEmail === reg.id}
                      className={`text-xs ${sentEmails.has(reg.id) ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                      {sendingEmail === reg.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <>{sentEmails.has(reg.id) ? "Resend" : "Send"} <Mail className="w-3 h-3 ml-1" /></>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}