import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trophy, Calendar, Users, Coins, Download, X } from "lucide-react";

function downloadInvoice({ tournament, teamName, members, paymentMethod, entryFee, invoiceId }) {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const lines = [
    "═══════════════════════════════════════",
    "       🏆 BATTLEHUB FF - ENTRY INVOICE",
    "═══════════════════════════════════════",
    `Invoice ID  : ${invoiceId}`,
    `Date        : ${now}`,
    "───────────────────────────────────────",
    `Tournament  : ${tournament?.title}`,
    `Mode        : ${tournament?.mode}`,
    `Match Date  : ${tournament?.date_time ? new Date(tournament.date_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}`,
    "───────────────────────────────────────",
    `Team/Player : ${teamName}`,
    `Entry Fee   : ${entryFee} ${paymentMethod === "Diamond" ? "Diamonds" : "BH Coins"}`,
    `Payment     : ${paymentMethod} — Wallet`,
    `Status      : ✅ PAID`,
    "═══════════════════════════════════════",
    "Thank you for joining BattleHub FF! 🎮",
  ].join("\n");
  const blob = new Blob([lines], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `BH-Invoice-${invoiceId}.txt`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function RegistrationSuccessModal({ tournament, teamName, members, paymentMethod, entryFee, invoiceId, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 border border-green-500/40 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl shadow-green-500/10">
        {/* Top success banner */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-center relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Registration Confirmed!</h2>
          <p className="text-green-100 text-sm mt-1">You're officially in the battle!</p>
        </div>

        {/* Tournament info */}
        <div className="p-5 space-y-4">
          <div className="bg-gray-800/60 rounded-xl p-4 space-y-3 border border-gray-700/50">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Tournament</p>
                <p className="text-white font-bold">{tournament?.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Team / Player</p>
                <p className="text-white font-semibold">{teamName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Match Date</p>
                <p className="text-white font-semibold">
                  {tournament?.date_time ? new Date(tournament.date_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice */}
          <div className="bg-gray-800/60 rounded-xl p-4 border border-yellow-500/20">
            <p className="text-xs text-yellow-400 font-bold mb-2">🧾 ENTRY INVOICE — {invoiceId}</p>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300 text-sm">Entry Fee</span>
              </div>
              <span className="text-yellow-400 font-black text-lg">{entryFee} {paymentMethod === "Diamond" ? "💎" : "🪙"}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-500 text-xs">Payment Method</span>
              <span className="text-gray-300 text-xs">{paymentMethod} — Wallet</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-500 text-xs">Status</span>
              <span className="text-green-400 text-xs font-bold">✅ PAID</span>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
            <p className="text-xs text-yellow-300 text-center">📢 Room ID & Password will pop-up 10 minutes before match starts. Stay ready!</p>
          </div>

          <Button
            onClick={() => downloadInvoice({ tournament, teamName, members, paymentMethod, entryFee, invoiceId })}
            variant="outline"
            className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 font-semibold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Invoice
          </Button>

          <Button onClick={onClose} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 font-bold py-5 text-base rounded-xl">
            🎮 Done — Let's Go!
          </Button>
        </div>
      </div>
    </div>
  );
}