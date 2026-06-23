import React, { useState, useEffect } from "react";
import { Registration } from "@/entities/Registration";
import { Tournament } from "@/entities/Tournament";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageCircle, Download, Copy, CheckCircle, Image, Edit2, Save, X } from "lucide-react";
import { format } from "date-fns";

export default function TournamentRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sentMessages, setSentMessages] = useState(new Set());
  const [editingReg, setEditingReg] = useState(null); // id of reg being edited
  const [editData, setEditData] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [allRegs, allTourns] = await Promise.all([
        Registration.list("-created_date", 1000),
        Tournament.list("-created_date", 100)
      ]);
      setRegistrations(allRegs || []);
      setTournaments(allTourns || []);
    } catch (error) { console.error("Error:", error); }
    setLoading(false);
  };

  const filteredRegs = registrations.filter(reg => {
    const matchesTournament = !selectedTournament || reg.tournament_id === selectedTournament;
    const matchesSearch = !searchQuery ||
      reg.team_leader_ign?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.team_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.team_leader_phone?.includes(searchQuery);
    return matchesTournament && matchesSearch;
  });

  const getTournament = (id) => tournaments.find(t => t.id === id);

  const generateInvoiceMessage = (reg) => {
    const tournament = getTournament(reg.tournament_id);
    if (!tournament) return "";

    const invoiceId = `BHFF-${new Date(reg.created_date).getTime().toString().slice(-8)}`;
    const matchDate = new Date(tournament.date_time).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
    const regDate = new Date(reg.created_date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

    const membersText = reg.team_members?.map((m, i) => 
      `  ${i + 1}. ${m.ign} | UID: ${m.uid}${m.isLeader ? " 👑 Leader" : ""}`
    ).join("\n") || `  1. ${reg.team_leader_ign} | UID: ${reg.team_leader_uid}`;

    const prizeText = (() => {
      const dist = tournament.prize_distribution;
      if (!dist) return "";
      const lines = [];
      if (dist.first > 0) lines.push(`  🥇 1st: ₹${dist.first}`);
      if (dist.second > 0) lines.push(`  🥈 2nd: ₹${dist.second}`);
      if (dist.third > 0) lines.push(`  🥉 3rd: ₹${dist.third}`);
      return lines.length > 0 ? "\n🏆 *PRIZE POOL*\n" + lines.join("\n") : "";
    })();

    return `🏆 *BATTLEHUB FF — MATCH CONFIRMATION* 🏆
━━━━━━━━━━━━━━━━━━━━━━━━

✅ *REGISTRATION CONFIRMED*

Hello *${reg.team_leader_ign}*! Your registration is confirmed.

━━━━━━━━━━━━━━━━━━━━━━━━
📋 *TOURNAMENT INFO*
━━━━━━━━━━━━━━━━━━━━━━━━
🎮 *${tournament.title}*
🎯 Mode: ${tournament.mode} | 🗺️ Map: ${tournament.map || "Bermuda"}
📅 Match Date: ${matchDate}
👥 Max Teams: ${tournament.max_teams}
${prizeText}

━━━━━━━━━━━━━━━━━━━━━━━━
🧾 *ENTRY INVOICE*
━━━━━━━━━━━━━━━━━━━━━━━━
📄 Invoice ID: #${invoiceId}
👤 Team: ${reg.team_name || reg.team_leader_ign}
📱 Phone: ${reg.team_leader_phone || "N/A"}

*Team Members:*
${membersText}

💰 Entry Fee: ${tournament.entry_fee || 0} ${reg.payment_method === "Diamond" ? "💎 Diamond" : "🪙 BH Coin"}
💳 Payment Method: ${reg.payment_method || "BH Coin"}
✅ Status: PAID & CONFIRMED
🗓️ Registered: ${regDate}

━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *IMPORTANT RULES*
━━━━━━━━━━━━━━━━━━━━━━━━
• Room ID & Password will be shared 5 mins before match
• Join the room on time — late entries rejected
• Fair play mandatory — cheating = permanent ban
• Keep this message as your entry proof

━━━━━━━━━━━━━━━━━━━━━━━━
🌐 battlehubff.site | 📧 helpbattlehub@gmail.com

🎮 *Good luck! — BattleHub FF Team* 🏆`;
  };

  const sendWhatsApp = (reg) => {
    if (!reg.team_leader_phone) { alert("No phone number available for this user"); return; }
    const message = generateInvoiceMessage(reg);
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${reg.team_leader_phone}?text=${encodedMessage}`;
    window.open(whatsappURL, '_blank');
    setSentMessages(prev => new Set([...prev, reg.id]));
  };

  const copyMessage = (reg) => {
    const message = generateInvoiceMessage(reg);
    navigator.clipboard.writeText(message);
    alert("✅ Message copied to clipboard!");
  };

  const downloadTeamLogos = () => {
    const regsWithLogos = filteredRegs.filter(r => r.team_logo_url);
    if (regsWithLogos.length === 0) { alert("Kisi bhi team ne logo nahi lagaya!"); return; }
    let html = `<html><head><title>Team Logos</title><style>body{background:#111;font-family:sans-serif;padding:20px;} .card{display:inline-block;margin:10px;text-align:center;background:#222;padding:12px;border-radius:10px;border:1px solid #444;} img{width:100px;height:100px;object-fit:cover;border-radius:8px;} p{color:#fff;margin:6px 0 0;font-size:13px;}</style></head><body>`;
    regsWithLogos.forEach(r => {
      html += `<div class="card"><img src="${r.team_logo_url}" /><p>${r.team_name}</p></div>`;
    });
    html += `</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `TeamLogos.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const startEdit = (reg) => {
    setEditingReg(reg.id);
    setEditData({
      team_name: reg.team_name || "",
      team_members: JSON.parse(JSON.stringify(reg.team_members || []))
    });
  };

  const saveEdit = async (reg) => {
    await Registration.update(reg.id, {
      team_name: editData.team_name,
      team_members: editData.team_members
    });
    await loadData();
    setEditingReg(null);
  };

  const downloadReport = () => {
    let content = `BattleHub FF - Tournament Registrations Report\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Total Registrations: ${filteredRegs.length}\n\n`;
    content += `═══════════════════════════════════════════════════════\n\n`;

    filteredRegs.forEach((reg, index) => {
      const tournament = getTournament(reg.tournament_id);
      content += `Registration #${index + 1}\n`;
      content += `Tournament: ${tournament?.title || 'N/A'}\n`;
      content += `Team: ${reg.team_name}\n`;
      content += `Leader: ${reg.team_leader_ign} (${reg.team_leader_uid})\n`;
      content += `Phone: ${reg.team_leader_phone || 'N/A'}\n`;
      content += `Registered: ${format(new Date(reg.created_date), "dd MMM yyyy hh:mm a")}\n`;
      content += `Payment: ${reg.payment_method || 'N/A'} - ${reg.payment_status}\n`;
      content += `Status: ${reg.status}\n`;
      content += `\nTeam Members:\n`;
      reg.team_members?.forEach((member, i) => {
        content += `  ${i + 1}. ${member.ign} (${member.uid})\n`;
      });
      content += `\n---------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BattleHub_Registrations_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
    </div>
  );

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-100">Tournament Registrations</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={downloadTeamLogos} className="bg-purple-600 hover:bg-purple-700">
              <Image className="w-4 h-4 mr-2" /> Team Logos
            </Button>
            <Button onClick={downloadReport} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" /> Download Report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by IGN, team, or phone..."
              className="bg-gray-800 border-gray-700 text-white pl-10"
            />
          </div>
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="All Tournaments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Tournaments</SelectItem>
              {tournaments.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title} • {format(new Date(t.date_time), "dd MMM yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-400">Showing {filteredRegs.length} registration(s)</div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredRegs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No registrations found</p>
          ) : filteredRegs.map(reg => {
            const tournament = getTournament(reg.tournament_id);
            return (
              <div key={reg.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                {editingReg === reg.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Team Name</label>
                      <input value={editData.team_name} onChange={e => setEditData({...editData, team_name: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-white text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 block">Team Members</label>
                      {(editData.team_members || []).map((m, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input value={m.ign} onChange={e => { const arr=[...editData.team_members]; arr[i]={...arr[i],ign:e.target.value}; setEditData({...editData,team_members:arr}); }} placeholder="IGN" className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs" />
                          <input value={m.uid} onChange={e => { const arr=[...editData.team_members]; arr[i]={...arr[i],uid:e.target.value}; setEditData({...editData,team_members:arr}); }} placeholder="UID" className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs" />
                          {m.isLeader && <span className="text-yellow-400 text-xs">👑</span>}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(reg)} className="bg-green-600 flex-1 text-xs"><Save className="w-3 h-3 mr-1"/>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingReg(null)} className="border-gray-600 text-xs"><X className="w-3 h-3"/></Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {reg.team_logo_url && <img src={reg.team_logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover border border-gray-600" />}
                        <div>
                          <p className="font-semibold text-white">{reg.team_name}</p>
                          <p className="text-sm text-gray-400">{reg.team_leader_ign}</p>
                          {reg.team_leader_phone && <p className="text-xs text-cyan-400">📱 {reg.team_leader_phone}</p>}
                        </div>
                      </div>
                      <Badge className={
                        reg.payment_status === "Paid" ? "bg-green-500/20 text-green-400" :
                        reg.payment_status === "Refunded" ? "bg-red-500/20 text-red-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }>
                        {reg.payment_method || "N/A"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <p>🏆 {tournament?.title || 'Unknown Tournament'}</p>
                      <p>📅 {format(new Date(reg.created_date), "dd MMM yyyy, hh:mm a")}</p>
                      <p>🎮 {tournament?.mode} • {reg.team_members?.length || 0} members</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => sendWhatsApp(reg)} className={`flex-1 text-xs ${sentMessages.has(reg.id) ? 'bg-gray-700 opacity-60' : 'bg-green-600 hover:bg-green-700'}`} disabled={!reg.team_leader_phone}>
                        {sentMessages.has(reg.id) ? <><CheckCircle className="w-3.5 h-3.5 mr-1"/>Message Sent</> : <><MessageCircle className="w-3.5 h-3.5 mr-1"/>Send WhatsApp</>}
                      </Button>
                      <Button size="sm" onClick={() => copyMessage(reg)} variant="outline" className="border-gray-600"><Copy className="w-4 h-4"/></Button>
                      <Button size="sm" onClick={() => startEdit(reg)} variant="outline" className="border-cyan-500/50 text-cyan-400"><Edit2 className="w-4 h-4"/></Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}