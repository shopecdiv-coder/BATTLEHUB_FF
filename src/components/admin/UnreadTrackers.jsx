import { useState, useEffect } from "react";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { RedeemRequest } from "@/entities/RedeemRequest";
import { SupportTicket } from "@/entities/SupportTicket";
import { RedeemCode } from "@/entities/RedeemCode";

export function useAdminUnreadCounts() {
  const [unreadPayments, setUnreadPayments] = useState(0);
  const [unreadRedeems, setUnreadRedeems] = useState(0);
  const [unreadTickets, setUnreadTickets] = useState(0);
  const [unreadCodes, setUnreadCodes] = useState(0);

  useEffect(() => {
    loadCounts();
    // Only load once — refresh triggered by onUpdate callback from parent
  }, []);

  const loadCounts = async () => {
    try {
      const [payments, redeems, tickets, codes] = await Promise.all([
        PaymentRequest.filter({ status: "Pending" }).catch(() => []),
        RedeemRequest.filter({ status: "Pending" }).catch(() => []),
        SupportTicket.filter({ status: "Open" }).catch(() => []),
        RedeemCode.filter({ status: "Pending" }).catch(() => [])
      ]);

      setUnreadPayments(payments.length);
      setUnreadRedeems(redeems.length);
      setUnreadTickets(tickets.length);
      setUnreadCodes(codes.length);
    } catch (e) {
      // Silent fail
    }
  };

  return { unreadPayments, unreadRedeems, unreadTickets, unreadCodes };
}

export function useSupportUnreadCount(userId) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    
    loadCount();
    const interval = setInterval(loadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [userId]);

  const loadCount = async () => {
    try {
      const tickets = await SupportTicket.filter({ user_id: userId });
      const unread = tickets.filter(t => {
        const lastMsg = t.messages?.[t.messages.length - 1];
        return lastMsg && lastMsg.sender_id !== userId && t.status !== "Resolved" && t.status !== "Closed";
      }).length;
      setUnreadCount(unread);
    } catch (e) {
      // Silent fail
    }
  };

  return unreadCount;
}