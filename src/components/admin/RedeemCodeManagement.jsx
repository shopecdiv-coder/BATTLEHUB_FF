import React, { useState, useEffect } from "react";
import { RedeemCode } from "@/entities/RedeemCode";
import { Notification } from "@/entities/Notification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gift, Send, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function RedeemCodeManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState({});
  const [rejectReason, setRejectReason] = useState({});
  const [showRejectInput, setShowRejectInput] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allRequests = await RedeemCode.list("-created_date", 100);
    setRequests(allRequests || []);
    setLoading(false);
  };

  const sendCode = async (request) => {
    const code = codeInput[request.id];
    if (!code?.trim()) { alert("Enter redeem code"); return; }
    await RedeemCode.update(request.id, { redeem_code: code.trim(), status: "Sent" });
    await Notification.create({
      recipient_id: request.user_id,
      type: "Prize Distributed",
      title: "🎁 Redeem Code Ready!",
      message: `Your redeem code is: ${code.trim()}. Check your wallet!`,
      link: "/wallet",
      priority: "High",
      dismissable: true,
      created_at: new Date().toISOString()
    });
    setCodeInput({ ...codeInput, [request.id]: "" });
    await loadData();
    alert("✅ Code sent to user!");
  };

  const rejectCode = async (request) => {
    const reason = rejectReason[request.id]?.trim();
    if (!reason) { alert("Please enter a rejection reason first."); return; }
    if (!confirm(`Reject code request for ${request.user_ign}?\nReason: ${reason}`)) return;
    await RedeemCode.update(request.id, { status: "Rejected", rejection_reason: reason });
    await Notification.create({
      recipient_id: request.user_id,
      type: "App Update",
      title: "❌ Code Request Rejected",
      message: `Your redeem code request for ${request.coin_amount} coins was rejected. Reason: ${reason}`,
      link: "/wallet",
      priority: "High",
      dismissable: true,
      created_at: new Date().toISOString()
    });
    setRejectReason({ ...rejectReason, [request.id]: "" });
    setShowRejectInput({ ...showRejectInput, [request.id]: false });
    await loadData();
    alert("Request rejected.");
  };

  if (loading) {
    return <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div></div>;
  }

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-100">
          <Gift className="w-5 h-5 text-purple-500" />
          Redeem Code Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No requests</p>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-100">{req.user_ign}</p>
                  <p className="text-xs text-gray-500">User ID: {req.user_id?.substring(0, 8)}</p>
                  <p className="text-sm text-gray-400">{req.coin_amount} Coins</p>
                  <p className="text-xs text-gray-500">{format(new Date(req.created_date), "PPP p")}</p>
                </div>
                <Badge className={
                  req.status === "Sent" ? "bg-green-500/20 text-green-400" :
                  req.status === "Used" ? "bg-gray-500/20 text-gray-400" :
                  "bg-yellow-500/20 text-yellow-400"
                }>
                  {req.status}
                </Badge>
              </div>

              {req.status === "Pending" ? (
                <div className="space-y-2 mt-3">
                  <div className="flex gap-2">
                    <Input
                      value={codeInput[req.id] || ""}
                      onChange={(e) => setCodeInput({ ...codeInput, [req.id]: e.target.value })}
                      placeholder="Enter redeem code"
                      className="bg-gray-800 border-gray-600 text-gray-100"
                    />
                    <Button onClick={() => sendCode(req)} className="bg-purple-600 hover:bg-purple-700">
                      <Send className="w-4 h-4 mr-2" />Send
                    </Button>
                  </div>
                  {showRejectInput[req.id] ? (
                    <div className="space-y-2">
                      <Input
                        value={rejectReason[req.id] || ""}
                        onChange={(e) => setRejectReason({ ...rejectReason, [req.id]: e.target.value })}
                        placeholder="Enter rejection reason (required)..."
                        className="bg-gray-800 border-red-500/50 text-gray-100 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => rejectCode(req)} size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                          <XCircle className="w-4 h-4 mr-1" />Confirm Reject
                        </Button>
                        <Button onClick={() => setShowRejectInput({ ...showRejectInput, [req.id]: false })} variant="outline" size="sm" className="flex-1 border-gray-600">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => setShowRejectInput({ ...showRejectInput, [req.id]: true })} variant="outline" size="sm" className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10">
                      <XCircle className="w-4 h-4 mr-2" />Reject Request
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                  <p className="text-xs text-gray-400">Code Sent:</p>
                  <code className="text-sm font-bold text-purple-400">{req.redeem_code}</code>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}