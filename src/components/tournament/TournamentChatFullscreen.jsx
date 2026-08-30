import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import SharedChatInterface from "@/components/chat/SharedChatInterface";

export default function TournamentChatFullscreen({ tournament, user, isRegistered, onClose }) {
  if (!tournament) return null;

  return createPortal(
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ ease: "easeInOut", duration: 0.28 }}
      className="fixed inset-0 z-[999999] bg-gray-950 flex flex-col overflow-hidden"
    >
      <SharedChatInterface
        roomType="tournament"
        roomId={tournament.id}
        roomTitle={tournament.title}
        isClosed={tournament.status === "Completed" || tournament.status === "Cancelled"}
        isRegistered={isRegistered || user?.role === 'admin' || user?.email === 'shopecdiv@gmail.com'}
        onShrink={onClose}
        user={user}
      />
    </motion.div>,
    document.body
  );
}