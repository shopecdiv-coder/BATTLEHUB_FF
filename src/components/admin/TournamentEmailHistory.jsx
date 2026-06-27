import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { sendBrevoEmail } from "@/utils/brevoEmail";

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
      let toEmail = reg.created_by;
      if (toEmail === 'shopecdiv@gmail.com' || toEmail === 'helpbattlehub@gmail.com') {
        try {
          const actualUser = await User.filter({ unique_id: reg.team_leader_uid });
          if (actualUser && actualUser.length > 0 && actualUser[0].email) {
            toEmail = actualUser[0].email;
          }
        } catch(err) { console.error("Could not fetch user email", err); }
      }

      const invoiceId = `BHFF-${reg.id?.slice(-8)?.toUpperCase() || "00000000"}`;
      const membersList = reg.team_members?.map((m, i) => `  ${i+1}. ${m.ign} (UID: ${m.uid})${m.isLeader ? " [Team Head]" : ""}`).join("\n") || `  1. ${reg.team_leader_ign} (UID: ${reg.team_leader_uid})`;

      const isQualified = /semi|final|grand/i.test(tournament?.title || '');
      const headerTitle = isQualified ? "🌟 QUALIFICATION CONFIRMED" : "🏆 REGISTRATION CONFIRMED";
      const greetingText = isQualified 
        ? `Congratulations! Your team has officially qualified for <strong>${tournament?.title || 'Tournament'}</strong>!`
        : `You have successfully registered for <strong>${tournament?.title || 'Tournament'}</strong>!`;

      const htmlBody = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);">
  <div style="background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); padding: 40px 20px; text-align: center;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee96b6cabd2c2d7af587d0/08567b05d_bf31fa0a1_logo.png" alt="BATTLEHUB FF" style="width: 90px; height: 90px; object-fit: cover; margin-bottom: 15px; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.4); border: 3px solid rgba(255,255,255,0.2);" />
    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.4); text-transform: uppercase;">BATTLEHUB FF</h1>
    <p style="margin: 12px 0 0 0; color: #e0f2fe; font-size: 17px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${headerTitle}</p>
  </div>
  <div style="padding: 35px 25px;">
    <p style="font-size: 17px; line-height: 1.6; margin-top: 0; color: #e2e8f0;">Hi <strong style="color: #38bdf8;">${reg.team_leader_ign || 'Player'}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">${greetingText}</p>
    <div style="background-color: #1e293b; border-radius: 10px; padding: 25px; margin: 30px 0; border-left: 5px solid #38bdf8; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <h3 style="margin: 0 0 15px 0; color: #38bdf8; font-size: 19px; border-bottom: 1px solid #334155; padding-bottom: 12px; display: flex; align-items: center;">📋 Official Entry Invoice</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
        <tr><td style="padding: 10px 0; color: #94a3b8; width: 40%;">Invoice No:</td><td style="padding: 10px 0; font-weight: 600; color: #f8fafc;">${invoiceId}</td></tr>
        <tr><td style="padding: 10px 0; color: #94a3b8;">Match Date:</td><td style="padding: 10px 0; font-weight: 600; color: #f8fafc;">${matchDate}</td></tr>
        <tr><td style="padding: 10px 0; color: #94a3b8;">Game Mode:</td><td style="padding: 10px 0; font-weight: 600; color: #f8fafc;">${tournament?.mode || 'N/A'}</td></tr>
        <tr><td style="padding: 10px 0; color: #94a3b8;">Team Name:</td><td style="padding: 10px 0; font-weight: 600; color: #f8fafc;">${reg.team_name || 'N/A'}</td></tr>
      </table>
    </div>
    <div style="background-color: #1e293b; border-radius: 10px; padding: 25px; margin: 30px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <h3 style="margin: 0 0 15px 0; color: #a78bfa; font-size: 19px; border-bottom: 1px solid #334155; padding-bottom: 12px;">👥 Registered Squad</h3>
      <pre style="font-family: inherit; margin: 0; color: #cbd5e1; white-space: pre-wrap; font-size: 15px; line-height: 1.7;">${membersList}</pre>
    </div>
    <div style="background-color: #451a03; border-radius: 10px; padding: 20px; border: 1px solid #78350f; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
      <p style="margin: 0; color: #fde047; font-size: 15px; font-weight: 700; display: flex; align-items: center;">⚠️ IMPORTANT GUIDELINES:</p>
      <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #fef08a; font-size: 14px; line-height: 1.6;">
        <li><strong>Room ID & Password</strong> will be shared via app pop-up <strong>10 minutes</strong> before the match.</li>
        <li>Ensure your in-game IGN exactly matches the registered IGN. Any mismatch will result in kicking from the room.</li>
      </ul>
    </div>
  </div>
  <div style="background-color: #020617; padding: 25px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #1e293b;">
    <p style="margin: 0;">© ${new Date().getFullYear()} <strong style="color: #94a3b8;">BattleHub FF</strong>. All rights reserved.</p>
    <p style="margin: 6px 0 0 0;">India's Premium Esports Tournament Platform</p>
  </div>
</div>`;

      await sendBrevoEmail({
        to_email: toEmail,
        to_name: reg.team_leader_ign || 'Player',
        subject: `${headerTitle} — ${tournament?.title || 'Tournament'} | BattleHub FF`,
        htmlContent: htmlBody
      });

      setSentEmails(prev => new Set([...prev, reg.id]));
      alert(`✅ Email sent to ${reg.created_by}`);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to send email: " + (e.text || e.message || "Unknown error"));
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