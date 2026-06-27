import React from "react";
import { createPortal } from "react-dom";
import SharedChatInterface from "@/components/chat/SharedChatInterface";

export default function TournamentChatFullscreen({ tournament, user, isRegistered, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col animate-in slide-in-from-bottom-full duration-300">
      <SharedChatInterface
        roomType="tournament"
        roomId={tournament.id}
        roomTitle={tournament.title}
        isClosed={tournament.status === "Completed" || tournament.status === "Cancelled"}
        isRegistered={isRegistered || user?.role === 'admin' || user?.email === 'shopecdiv@gmail.com'}
        onShrink={onClose}
        user={user}
      />
    </div>,
    document.body
  );
}