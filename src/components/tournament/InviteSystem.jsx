import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { TeamInvite } from "@/entities/TeamInvite";
import { Registration } from "@/entities/Registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Minimize2, Users, Clock, CheckCircle, XCircle, Send, AlertTriangle } from "lucide-react";

const IST = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

function CountdownTimer({ expiresAt, onExpired }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) { setRemaining("Expired"); onExpired?.(); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const isUrgent = remaining !== "Expired" && parseInt(remaining) < 5;
  return <span className={`font-mono font-bold ${isUrgent ? "text-red-400 animate-pulse" : "text-yellow-400"}`}>{remaining}</span>;
}

// ─── SEND INVITE PANEL ───────────────────────────────────────────────────────
export function SendInvitePanel({ tournament, currentUser, onInviteSent }) {
  const [uniqueId, setUniqueId] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");

  const maxSlots = tournament.mode === "Duo" ? 2 : 4;

  const searchUser = async () => {
    if (!uniqueId.trim()) return;
    setSearching(true);
    setError("");
    setFoundUser(null);

    // Self-check
    const myUniqueId = currentUser.unique_id || 'N/A';
    if (uniqueId.trim().toUpperCase() === myUniqueId.toUpperCase()) {
      setError("You cannot invite yourself.");
      setSearching(false);
      return;
    }

    // Find by unique_id - try filter first for performance, then fallback
    let found = null;
    const searchUid = uniqueId.trim().toUpperCase();
    try {
      const byUniqueId = await User.filter({ unique_id: searchUid });
      if (byUniqueId && byUniqueId.length > 0) {
        found = byUniqueId[0];
      } else {
        const allUsers = await User.list("-created_date", 2000).catch(() => []);
        found = allUsers.find(u => (u.unique_id || 'N/A').toUpperCase() === searchUid);
      }
    } catch {
      const allUsers = await User.list("-created_date", 2000).catch(() => []);
      found = allUsers.find(u => (u.unique_id || 'N/A').toUpperCase() === searchUid);
    }

    if (!found) {
      setError("No player found with this Unique ID.");
      setSearching(false);
      return;
    }
    if (!found.game_uid && !found.ff_uid) {
      setError("This player has not saved their Game UID yet. Invite cannot be sent.");
      setSearching(false);
      return;
    }
    setFoundUser(found);
    setSearching(false);
  };

  const sendInvite = async () => {
    if (!foundUser) return;
    setSending(true);
    setError("");

    // Check if already registered in this tournament
    const regs = await Registration.filter({ tournament_id: tournament.id }).catch(() => []);
    const alreadyReg = regs.some(r =>
      r.team_leader_id === foundUser.id ||
      r.team_members?.some(m => m.uid === (foundUser.game_uid || foundUser.ff_uid))
    );
    if (alreadyReg) {
      setError("This player is already registered in another team for this tournament.");
      setSending(false);
      return;
    }

    // Check pending invite
    const pending = await TeamInvite.filter({ tournament_id: tournament.id, recipient_id: foundUser.id, status: "pending" }).catch(() => []);
    const validPending = pending.filter(i => new Date(i.expires_at) > new Date());
    if (validPending.length > 0) {
      setError("This player already has a pending invite for this tournament.");
      setSending(false);
      return;
    }

    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await TeamInvite.create({
      tournament_id: tournament.id,
      tournament_title: tournament.title,
      tournament_mode: tournament.mode,
      sender_id: currentUser.id,
      sender_ign: currentUser.ign || currentUser.full_name,
      sender_unique_id: currentUser.unique_id || 'N/A',
      recipient_id: foundUser.id,
      recipient_ign: foundUser.ign || foundUser.full_name,
      recipient_unique_id: foundUser.unique_id || 'N/A',
      status: "pending",
      expires_at: expiresAt,
    });

    setSuccess(`✅ Invite sent to ${foundUser.ign || foundUser.full_name}! Expires in 4 hours.`);
    setFoundUser(null);
    setUniqueId("");
    onInviteSent?.();
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Enter your partner's BattleHub Unique ID to invite them</p>
      <div className="flex gap-2">
        <Input
          value={uniqueId}
          onChange={e => { setUniqueId(e.target.value.toUpperCase()); setFoundUser(null); setError(""); setSuccess(""); }}
          placeholder="e.g. BH68EE96"
          className="bg-gray-800 border-gray-600 text-white font-mono uppercase"
          onKeyDown={e => e.key === "Enter" && searchUser()}
        />
        <Button onClick={searchUser} disabled={searching || !uniqueId.trim()} className="bg-cyan-600 hover:bg-cyan-700 shrink-0">
          {searching ? "..." : "Search"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {foundUser && (
        <div className="p-4 bg-gray-800/70 border border-cyan-500/30 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 ring-2 ring-cyan-500">
              <AvatarImage src={foundUser.avatar_url} />
              <AvatarFallback className="bg-cyan-700 text-white">{foundUser.ign?.[0]?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-white">{foundUser.ign || foundUser.full_name}</p>
              <p className="text-xs text-cyan-400 font-mono">{foundUser.unique_id || 'N/A'}</p>
              <p className="text-xs text-gray-400">UID: {foundUser.game_uid || foundUser.ff_uid}</p>
            </div>
          </div>
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Invite expires in 4 hours after sending
            </p>
          </div>
          <Button onClick={sendInvite} disabled={sending} className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700">
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Sending..." : `Send ${tournament.mode} Invite`}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── INCOMING INVITE POPUP ───────────────────────────────────────────────────
export function IncomingInvitePopup({ invite, currentUser, onResponse }) {
  const [minimized, setMinimized] = useState(false);
  const [responding, setResponding] = useState(false);
  const [expired, setExpired] = useState(false);

  const respond = async (action) => {
    setResponding(true);
    await TeamInvite.update(invite.id, { status: action }).catch(() => {});
    onResponse?.(action);
    setResponding(false);
  };

  if (expired) {
    return (
      <div className="fixed bottom-24 right-4 z-50 bg-gray-900 border border-red-500/40 rounded-xl p-4 shadow-2xl w-72">
        <p className="text-red-400 text-sm font-semibold">⏰ Invite request expired.</p>
        <Button size="sm" variant="ghost" onClick={() => onResponse?.("expired")} className="mt-2 text-gray-400 w-full">Dismiss</Button>
      </div>
    );
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-24 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full px-4 py-2 shadow-2xl flex items-center gap-2 text-sm font-semibold"
      >
        <Users className="w-4 h-4" />
        1 Pending Invite
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 bg-gray-900 border border-purple-500/50 rounded-2xl p-5 shadow-2xl w-80">
      <div className="flex items-center justify-between mb-3">
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 uppercase text-xs">
          {invite.tournament_mode} Invite
        </Badge>
        <div className="flex gap-1">
          <button onClick={() => setMinimized(true)} className="text-gray-500 hover:text-gray-300 p-1 rounded">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={() => onResponse?.("dismissed")} className="text-gray-500 hover:text-gray-300 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
          {invite.sender_ign?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <p className="text-white font-bold">{invite.sender_ign}</p>
          <p className="text-xs text-gray-400">wants to play {invite.tournament_mode} with you</p>
        </div>
      </div>

      <div className="p-3 bg-gray-800/60 rounded-xl mb-4 space-y-1">
        <p className="text-xs text-gray-400">Tournament</p>
        <p className="text-sm text-white font-semibold">{invite.tournament_title}</p>
        <div className="flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3 text-yellow-400" />
          <span className="text-xs text-gray-400 mr-1">Time Left:</span>
          <CountdownTimer expiresAt={invite.expires_at} onExpired={() => setExpired(true)} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => respond("accepted")}
          disabled={responding}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="w-4 h-4 mr-1" /> Accept
        </Button>
        <Button
          onClick={() => respond("rejected")}
          disabled={responding}
          variant="outline"
          className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
        >
          <XCircle className="w-4 h-4 mr-1" /> Reject
        </Button>
      </div>
    </div>
  );
}

// ─── SENT INVITE STATUS ───────────────────────────────────────────────────────
export function SentInviteStatus({ invite, onCancel }) {
  const [minimized, setMinimized] = useState(false);
  const [expired, setExpired] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cancelInvite = async () => {
    setCancelling(true);
    await TeamInvite.update(invite.id, { status: "cancelled" }).catch(() => {});
    onCancel?.();
    setCancelling(false);
  };

  if (invite.status === "rejected") {
    return (
      <div className="fixed bottom-24 right-4 z-50 bg-gray-900 border border-red-500/40 rounded-xl p-4 shadow-2xl w-72">
        <p className="text-red-400 text-sm font-semibold">❌ {invite.recipient_ign} rejected your invite.</p>
        <Button size="sm" variant="ghost" onClick={onCancel} className="mt-2 text-gray-400 w-full">Dismiss</Button>
      </div>
    );
  }

  if (invite.status === "accepted") {
    return (
      <div className="fixed bottom-24 right-4 z-50 bg-gray-900 border border-green-500/40 rounded-xl p-4 shadow-2xl w-72">
        <p className="text-green-400 text-sm font-semibold">✅ {invite.recipient_ign} accepted! Team registered.</p>
        <Button size="sm" variant="ghost" onClick={onCancel} className="mt-2 text-gray-400 w-full">Dismiss</Button>
      </div>
    );
  }

  if (minimized) {
    return (
      <button onClick={() => setMinimized(false)} className="fixed bottom-24 right-4 z-50 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full px-4 py-2 shadow-2xl flex items-center gap-2 text-sm font-semibold">
        <Clock className="w-4 h-4" />
        Invite to {invite.recipient_ign}
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 bg-gray-900 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl w-80">
      <div className="flex items-center justify-between mb-3">
        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs">Invite Sent</Badge>
        <div className="flex gap-1">
          <button onClick={() => setMinimized(true)} className="text-gray-500 hover:text-gray-300 p-1 rounded">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-white font-bold mb-1">Invite sent to {invite.recipient_ign}</p>
      <p className="text-xs text-gray-400 mb-4">Waiting for response...</p>

      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-yellow-400" />
        <span className="text-xs text-gray-400 mr-1">Time Left:</span>
        <CountdownTimer expiresAt={invite.expires_at} onExpired={() => setExpired(true)} />
      </div>

      {expired && (
        <p className="text-red-400 text-xs mb-3 text-center">⏰ Invite request expired.</p>
      )}

      <Button onClick={cancelInvite} disabled={cancelling} variant="outline" className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10">
        {cancelling ? "Cancelling..." : "Cancel Invite"}
      </Button>
    </div>
  );
}

// ─── INVITE MANAGER (mounts on tournament detail to watch realtime) ────────
export default function InviteManager({ tournament, currentUser }) {
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [sentInvite, setSentInvite] = useState(null);
  const pollRef = useRef(null);

  const loadInvites = async () => {
    const now = new Date().toISOString();
    // Incoming pending invites for me
    const incoming = await TeamInvite.filter({
      tournament_id: tournament.id,
      recipient_id: currentUser.id,
      status: "pending"
    }).catch(() => []);
    const valid = incoming.filter(i => i.expires_at > now);
    // Auto-expire old ones
    for (const i of incoming.filter(x => x.expires_at <= now)) {
      await TeamInvite.update(i.id, { status: "expired" }).catch(() => {});
    }
    setIncomingInvites(valid);

    // My latest sent pending invite
    const sent = await TeamInvite.filter({
      tournament_id: tournament.id,
      sender_id: currentUser.id
    }, "-created_date", 1).catch(() => []);
    if (sent.length > 0 && ["pending","accepted","rejected"].includes(sent[0].status)) {
      setSentInvite(sent[0]);
    }
  };

  useEffect(() => {
    if (!currentUser || !tournament) return;
    loadInvites();
    pollRef.current = setInterval(loadInvites, 5000);
    return () => clearInterval(pollRef.current);
  }, [currentUser?.id, tournament?.id]);

  return (
    <>
      {incomingInvites.map(inv => (
        <IncomingInvitePopup
          key={inv.id}
          invite={inv}
          currentUser={currentUser}
          onResponse={async (action) => {
            setIncomingInvites(p => p.filter(i => i.id !== inv.id));
            await loadInvites();
          }}
        />
      ))}
      {sentInvite && (
        <SentInviteStatus
          invite={sentInvite}
          onCancel={() => { setSentInvite(null); loadInvites(); }}
        />
      )}
    </>
  );
}