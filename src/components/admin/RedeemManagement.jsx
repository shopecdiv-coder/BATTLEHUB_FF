import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { RedeemRequest } from "@/entities/RedeemRequest";
import { Diamond } from "@/entities/Diamond";
import { Notification } from "@/entities/Notification";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function RedeemManagement({ requests, onUpdate }) {
  const [processingId, setProcessingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState({});
  const [userUniqueIds, setUserUniqueIds] = useState({});

  useEffect(() => {
    // Fetch unique IDs for all requesting users
    const fetchUniqueIds = async () => {
      const ids = {};
      for (const req of requests) {
        try {
          const users = await User.filter({ id: req.user_id });
          if (users.length > 0 && users[0].unique_id) {
            ids[req.user_id] = users[0].unique_id;
          }
        } catch (e) {}
      }
      setUserUniqueIds(ids);
    };
    if (requests.length > 0) fetchUniqueIds();
  }, [requests]);

  const handleApprove = async (req) => {
    setProcessingId(req.id);
    try {
      const now = new Date().toISOString();
      await Notification.create({
        recipient_id: req.user_id,
        type: "Prize Distributed",
        title: "✅ Redeem Completed!",
        message: `Your redeem of ${req.diamond_amount} coins (₹${req.inr_amount}) processed. ${adminNotes[req.id] || ''}`,
        link: createPageUrl("Wallet"),
        priority: "High",
        dismissable: true,
        created_at: now
      });

      await RedeemRequest.update(req.id, {
        status: "Completed",
        admin_notes: adminNotes[req.id] || "Transferred",
        processed_at: now
      });

      setProcessingId(null);
      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      setProcessingId(null);
    }
  };

  const handleReject = async (req) => {
    if (!adminNotes[req.id]?.trim()) {
      alert("Please write rejection reason before rejecting");
      return;
    }
    setProcessingId(req.id);
    try {
      const now = new Date().toISOString();

      // Refund coins to user
      const accounts = await Diamond.filter({ user_id: req.user_id }).catch(() => []);
      if (accounts.length > 0) {
        await Diamond.update(accounts[0].id, {
          bh_coin_balance: (accounts[0].bh_coin_balance || 0) + req.diamond_amount,
          transactions: [...(accounts[0].transactions || []), {
            type: "Win",
            coin_type: "BH Coin",
            amount: req.diamond_amount,
            description: `Redeem rejected - coins refunded. Reason: ${adminNotes[req.id]}`,
            timestamp: now
          }]
        });
      }

      await Notification.create({
        recipient_id: req.user_id,
        type: "App Update",
        title: "❌ Redeem Rejected – Coins Refunded",
        message: `Your redeem of ${req.diamond_amount} coins was rejected. Reason: ${adminNotes[req.id]}. Coins have been refunded to your wallet.`,
        link: createPageUrl("Wallet"),
        priority: "High",
        dismissable: true,
        created_at: now
      });

      await RedeemRequest.update(req.id, {
        status: "Rejected",
        admin_notes: adminNotes[req.id],
        processed_at: now
      });

      setProcessingId(null);
      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
          <p className="text-gray-500">No pending requests</p>
        </Card>
      ) : (
        requests.map((req) => (
          <Card key={req.id} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle className="text-white">{req.user_ign}</CardTitle>
                  {userUniqueIds[req.user_id] && (
                    <p className="text-xs text-cyan-400 font-mono">ID: {userUniqueIds[req.user_id]}</p>
                  )}
                  <p className="text-xs text-gray-400">{new Date(req.created_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-400">{req.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-900/50 rounded">
                  <p className="text-xs text-gray-400">Amount</p>
                  <p className="text-2xl font-bold text-orange-400">{req.diamond_amount} 🪙 = ₹{req.inr_amount}</p>
                </div>
                <div className="p-3 bg-gray-900/50 rounded space-y-1">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">💳 Payment Info</p>
                  {req.bank_details.account_holder && <p className="text-sm text-white font-semibold">👤 {req.bank_details.account_holder}</p>}
                  {req.bank_details.account_number && (
                    <p className="text-sm text-cyan-400 font-mono">🏦 Acc: <span className="font-bold">{req.bank_details.account_number}</span></p>
                  )}
                  {req.bank_details.bank_name && (
                    <p className="text-sm text-white">🏛️ Bank: {req.bank_details.bank_name}</p>
                  )}
                  {req.bank_details.ifsc_code && (
                    <p className="text-sm text-yellow-400 font-mono">IFSC: <span className="font-bold">{req.bank_details.ifsc_code}</span></p>
                  )}
                  {req.bank_details.upi_id && <p className="text-sm text-green-400">📲 UPI: {req.bank_details.upi_id}</p>}
                  {req.bank_details.phone_number && <p className="text-sm text-white">📱 Phone: {req.bank_details.phone_number}</p>}
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Admin Notes</Label>
                <Textarea value={adminNotes[req.id] || ""} onChange={(e) => setAdminNotes({...adminNotes, [req.id]: e.target.value})} className="bg-gray-900 border-gray-700 text-white" />
              </div>
              <div className="flex gap-3">
                <Button onClick={() => handleApprove(req)} disabled={processingId === req.id} className="flex-1 bg-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />{processingId === req.id ? "Processing..." : "Approve"}
                </Button>
                <Button onClick={() => handleReject(req)} disabled={processingId === req.id} variant="outline" className="flex-1 border-red-500/50 text-red-400">
                  <XCircle className="w-4 h-4 mr-2" />Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}