import React, { useState } from "react";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { Diamond } from "@/entities/Diamond";
import { Notification } from "@/entities/Notification";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, ExternalLink, Eye, ZoomIn } from "lucide-react";
import { format } from "date-fns";


export default function PaymentManagement({ requests, onUpdate }) {
  const [processingId, setProcessingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState({});
  const [viewingImage, setViewingImage] = useState(null);

  const handleApprove = async (request) => {
    setProcessingId(request.id);
    const now = new Date().toISOString();
    
    try {
      // Add BH coins to user account
      const accounts = await Diamond.filter({ user_id: request.user_id });
      if (accounts.length > 0) {
        const account = accounts[0];
        await Diamond.update(account.id, {
          bh_coin_balance: (account.bh_coin_balance || 0) + request.diamond_amount,
          transactions: [
            ...(account.transactions || []),
            {
              type: "Purchase",
              coin_type: "BH Coin",
              amount: request.diamond_amount,
              description: `Purchased ${request.diamond_amount} BH coins via ${request.payment_app}`,
              timestamp: now
            }
          ]
        });

        // Create notification for user
        await Notification.create({
          recipient_id: request.user_id,
          type: "Prize Distributed",
          title: "💰 Coins Credited Successfully!",
          message: `${request.diamond_amount} coins have been added to your wallet. ${adminNotes[request.id] || 'Thank you for your purchase!'}`,
          link: createPageUrl("Wallet"),
          priority: "High",
          dismissable: true,
          created_at: now
        });
      }

      await PaymentRequest.update(request.id, {
        status: "Verified",
        admin_notes: adminNotes[request.id] || "Payment verified and coins credited",
        admin_message_sent: true,
        processed_at: now
      });

      alert("Payment verified and coins credited successfully!");
      setProcessingId(null);
      onUpdate();
    } catch (error) {
      console.error("Error approving payment:", error);
      alert("Failed to approve payment. Please try again.");
      setProcessingId(null);
    }
  };

  const handleReject = async (request) => {
    setProcessingId(request.id);
    const now = new Date().toISOString();

    try {
      // Create notification for user
      await Notification.create({
        recipient_id: request.user_id,
        type: "App Update",
        title: "❌ Payment Request Rejected",
        message: `Your payment request for ${request.diamond_amount} coins was rejected. Reason: ${adminNotes[request.id] || 'Invalid payment details'}`,
        link: createPageUrl("Wallet"),
        priority: "High",
        dismissable: true,
        created_at: now
      });

      await PaymentRequest.update(request.id, {
        status: "Rejected",
        admin_notes: adminNotes[request.id] || "Payment rejected",
        admin_message_sent: true,
        processed_at: now
      });

      alert("Payment rejected successfully!");
      setProcessingId(null);
      onUpdate();
    } catch (error) {
      console.error("Error rejecting payment:", error);
      alert("Failed to reject payment. Please try again.");
      setProcessingId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-100">Payment Requests</h3>
          <Badge className="bg-green-500/20 text-green-400">
            {requests.length} Pending
          </Badge>
        </div>

        <div className="space-y-3">
          {requests.length === 0 ? (
            <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
              <p className="text-gray-500">No pending payment requests</p>
            </Card>
          ) : (
            requests.map((req) => (
              <div key={req.id}>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-gray-100">
                          {req.user_ign} ({req.user_email})
                        </h4>
                        <p className="text-sm text-gray-400">
                          📅 {format(new Date(req.created_date), "PPP")}
                        </p>
                        <p className="text-xs text-cyan-400">
                          🕐 {format(new Date(req.created_date), "p")}
                        </p>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        {req.status}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-gray-900/50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Amount</p>
                        <p className="text-2xl font-bold text-green-400">
                          {req.diamond_amount} 🪙 = ₹{req.inr_amount}
                        </p>
                      </div>

                      <div className="p-3 bg-gray-900/50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Payment App</p>
                        <Badge className="bg-blue-500/20 text-blue-400">
                          {req.payment_app || "N/A"}
                        </Badge>
                        {req.upi_app_name && (
                          <p className="text-xs text-gray-400 mt-1">App: {req.upi_app_name}</p>
                        )}
                      </div>

                      <div className="p-3 bg-gray-900/50 rounded-lg md:col-span-2">
                        <p className="text-xs text-gray-400 mb-1">
                          {req.payment_app === "Paytm" ? "UPI Reference Number" : 
                           req.payment_app === "Google Pay" ? "UPI Transaction ID" : 
                           "Transaction ID"}
                        </p>
                        <p className="text-sm font-mono text-gray-300">
                          {req.transaction_id}
                        </p>
                      </div>
                    </div>

                    {req.payment_screenshot && (
                      <div className="mb-4">
                        <Label className="text-gray-300 mb-2 block">Payment Screenshot</Label>
                        <div className="relative group">
                          <img
                            src={req.payment_screenshot}
                            alt="Payment Screenshot"
                            className="w-full max-w-md h-64 object-contain rounded border-2 border-green-500/50 cursor-pointer hover:border-green-500"
                            onClick={() => setViewingImage(req.payment_screenshot)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setViewingImage(req.payment_screenshot)}
                          >
                            <ZoomIn className="w-4 h-4 mr-2" />
                            View Full Size
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      <Label className="text-gray-300">Admin Notes (Will be sent to user)</Label>
                      <Textarea
                        value={adminNotes[req.id] || ""}
                        onChange={(e) => setAdminNotes({...adminNotes, [req.id]: e.target.value})}
                        placeholder="Add notes that user will see (e.g., 'Payment verified successfully!')"
                        className="bg-gray-900 border-gray-700 text-gray-100"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprove(req)}
                        disabled={processingId === req.id}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {processingId === req.id ? "Processing..." : "Verify & Credit Coins"}
                      </Button>
                      <Button
                        onClick={() => handleReject(req)}
                        disabled={processingId === req.id}
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>

      {viewingImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setViewingImage(null)}>
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
              <Button
                onClick={() => setViewingImage(null)}
                className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full"
                size="icon"
              >
                <X className="w-5 h-5" />
              </Button>
              <img
                src={viewingImage}
                alt="Payment Screenshot Full Size"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
          </div>
        </div>
      )}
    </>
  );
}