import React from "react";
import SharedChatInterface from "@/components/chat/SharedChatInterface";

export default function TournamentChat({ tournament, user, isRegistered, onExpand }) {
  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-2xl overflow-hidden border border-gray-800/80">
      <SharedChatInterface
        roomType="tournament"
        roomId={tournament.id}
        roomTitle={tournament.title}
        isClosed={tournament.status === "Completed" || tournament.status === "Cancelled"}
        isRegistered={isRegistered || user?.role === 'admin' || user?.email === 'shopecdiv@gmail.com'}
        onExpand={onExpand}
        user={user}
      />
    </div>
  );
}