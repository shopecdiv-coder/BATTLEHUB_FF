import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { TeamInvite } from "@/entities/TeamInvite";
import { IncomingInvitePopup, SentInviteStatus } from "./tournament/InviteSystem";

// Global invite watcher - mounts app-wide to show invite popups on any page
export default function GlobalInviteManager() {
  const [user, setUser] = useState(null);
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [sentInvite, setSentInvite] = useState(null);
  const pollRef = useRef(null);

  const loadInvites = async (currentUser) => {
    if (!currentUser) return;
    const now = new Date().toISOString();

    // All pending incoming invites for me (across ALL tournaments)
    const incoming = await TeamInvite.filter({
      recipient_id: currentUser.id,
      status: "pending"
    }).catch(() => []);
    const valid = incoming.filter(i => i.expires_at > now);
    // Auto-expire
    for (const i of incoming.filter(x => x.expires_at <= now)) {
      await TeamInvite.update(i.id, { status: "expired" }).catch(() => {});
    }
    setIncomingInvites(valid);

    // Latest sent invite (any tournament)
    const sent = await TeamInvite.filter({
      sender_id: currentUser.id,
      status: "pending"
    }, "-created_date", 5).catch(() => []);
    const validSent = sent.filter(i => i.expires_at > now);
    if (validSent.length > 0) {
      setSentInvite(validSent[0]);
    } else {
      // Check for recent accepted/rejected
      const recent = await TeamInvite.filter({ sender_id: currentUser.id }, "-created_date", 3).catch(() => []);
      const recentResp = recent.find(i => ["accepted", "rejected"].includes(i.status) && 
        new Date(i.updated_date || i.created_date) > new Date(Date.now() - 5 * 60 * 1000));
      setSentInvite(recentResp || null);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const u = await User.me();
        setUser(u);
        await loadInvites(u);
        pollRef.current = setInterval(() => loadInvites(u), 6000);
      } catch {}
    };
    init();
    return () => clearInterval(pollRef.current);
  }, []);

  if (!user) return null;

  return (
    <>
      {incomingInvites.map(inv => (
        <IncomingInvitePopup
          key={inv.id}
          invite={inv}
          currentUser={user}
          onResponse={async () => {
            setIncomingInvites(p => p.filter(i => i.id !== inv.id));
            await loadInvites(user);
          }}
        />
      ))}
      {sentInvite && (
        <SentInviteStatus
          invite={sentInvite}
          onCancel={() => { setSentInvite(null); loadInvites(user); }}
        />
      )}
    </>
  );
}