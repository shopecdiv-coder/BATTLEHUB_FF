import React from "react";
import SharedChatInterface from "@/components/chat/SharedChatInterface";

export default function GlobalChat() {
  return (
    <div className="fixed inset-0 pt-16 pb-[72px] md:pb-0 flex flex-col z-10">
      <SharedChatInterface roomType="global" roomTitle="BattleHub FF Chat" />
    </div>
  );
}