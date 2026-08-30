import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { PartyInvite, Party } from "@/api/entities";
import { X, Check, Users, ShieldOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { db } from "@/api/firebaseClient";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";

export default function GlobalPartyInviteManager() {
  const [user, setUser] = useState(null);
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [kickedPopup, setKickedPopup] = useState(false);
  const [disbandedPopup, setDisbandedPopup] = useState(false);

  // Track party membership to detect kick
  const prevPartyIdRef = useRef(null);
  const prevMemberIdsRef = useRef([]);
  const isInitialRef = useRef(true);

  useEffect(() => {
    User.me().then(u => setUser(u)).catch(() => {});
  }, []);

  // ── Party invite listener ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'party_invites'),
      where('recipient_id', '==', user.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const invites = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const validInvites = invites.filter(i => {
        const isExpired = Date.now() - (i.timestamp || 0) > 5 * 60 * 1000;
        if (isExpired) {
          PartyInvite.update(i.id, { status: 'expired' }).catch(() => {});
          return false;
        }
        return true;
      });
      setIncomingInvites(validInvites);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // ── Party membership watcher — detect kick ─────────────────
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'parties'),
      where('members', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const partyDoc = snap.docs[0];
        const partyId = partyDoc.id;
        const partyData = partyDoc.data();
        const members = partyData.members || [];

        if (partyData.status === 'disbanded') {
          window.__partyWasDisbanded = true;
        }

        prevPartyIdRef.current = partyId;
        prevMemberIdsRef.current = members;
        isInitialRef.current = false;
      } else {
        // Not in any party
        if (!isInitialRef.current && prevPartyIdRef.current) {
          // We were in a party before — this means we got kicked (or left)
          // Only show popup if it wasn't a voluntary leave
          // We use a flag set by the leave button
          if (!window.__partyLeaveVoluntary) {
            if (window.__partyWasDisbanded) {
              setDisbandedPopup(true);
            } else {
              const pId = prevPartyIdRef.current;
              getDoc(doc(db, 'parties', pId)).then(partyDoc => {
                 if (!partyDoc.exists()) {
                     setDisbandedPopup(true);
                 } else {
                     setKickedPopup(true);
                 }
              }).catch(() => setKickedPopup(true));
            }
          }
          window.__partyLeaveVoluntary = false;
          window.__partyWasDisbanded = false;
        }
        prevPartyIdRef.current = null;
        prevMemberIdsRef.current = [];
        isInitialRef.current = false;
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleAccept = async (invite) => {
    try {
      await PartyInvite.update(invite.id, { status: 'accepted' });
      
      const party = await Party.get(invite.party_id);
      if (!party) {
        toast.error("This party no longer exists.");
        return;
      }
      
      if (party.members?.length >= 10) {
        toast.error("Party is full!");
        return;
      }

      if (party.members && !party.members.includes(user.id)) {
        await Party.update(party.id, {
          members: [...party.members, user.id]
        });
      }
      
      toast.success("Joined party!");
      window.dispatchEvent(new CustomEvent('open-party-drawer'));
    } catch (e) {
      toast.error("Failed to accept invite");
    }
  };

  const handleDecline = async (invite) => {
    try {
      await PartyInvite.update(invite.id, { status: 'rejected' });
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* ── Party Invite Popups ── */}
      <div className="fixed bottom-24 right-4 z-[999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {incomingInvites.map(inv => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              className="bg-black/95 backdrop-blur-xl border border-purple-500/30 p-4 rounded-2xl shadow-[0_8px_30px_rgba(168,85,247,0.3)] flex flex-col gap-3 w-80 pointer-events-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-bold">Party Invite</p>
                  <p className="text-xs text-gray-400">
                    <span className="text-purple-300 font-bold truncate max-w-[150px] inline-block align-bottom">{inv.sender_name}</span> invited you
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => handleDecline(inv)}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-gray-300 uppercase transition-all"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(inv)}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" /> Accept
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Kicked from Party Popup ── */}
      <AnimatePresence>
        {kickedPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              transition={{ type: 'spring', damping: 28, stiffness: 450 }}
              className="bg-[#0d0d12] border border-red-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_60px_rgba(220,38,38,0.25)] flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-5 border-2 border-red-500/20">
                <ShieldOff className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Kicked!</h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                The party leader has removed you from the squad.
              </p>
              <button
                onClick={() => setKickedPopup(false)}
                className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(220,38,38,0.4)]"
              >
                Understood
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {disbandedPopup && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              transition={{ type: 'spring', damping: 28, stiffness: 450 }}
              className="bg-[#0d0d12] border border-orange-600/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_60px_rgba(249,115,22,0.25)] flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-orange-600/10 rounded-full flex items-center justify-center mb-5 border-2 border-orange-600/20">
                <ShieldOff className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Disbanded!</h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                The party leader has completely deleted the squad.
              </p>
              <button
                onClick={() => setDisbandedPopup(false)}
                className="w-full py-4 rounded-xl bg-orange-700 hover:bg-orange-600 active:scale-95 text-white font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(249,115,22,0.4)]"
              >
                Understood
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
