import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { Notification } from "@/entities/Notification";
import { createPageUrl } from "@/utils";
import { CreditCard, Zap } from "lucide-react";

const RAZORPAY_KEY_ID = "rzp_live_SMD4oloMldhyzx";

export default function RazorpayPayment({ amount, user, onSuccess, onFailure }) {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-script")) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert("Payment gateway failed to load. Check your internet connection.");
      setLoading(false);
      return;
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amount * 100, // in paise
      currency: "INR",
      name: "BattleHub FF",
      description: `Purchase ${amount} BH Coins`,
      image: "https://api.dicebear.com/6.x/bottts/svg?seed=battlehub",
      handler: async function (response) {
        try {
          const now = new Date().toISOString();
          await PaymentRequest.create({
            user_id: user.id,
            user_ign: user.ign || user.full_name,
            user_email: user.email,
            diamond_amount: amount,
            inr_amount: amount,
            payment_app: "Razorpay",
            transaction_id: response.razorpay_payment_id,
            status: "Pending"
          });

          await Notification.create({
            recipient_id: user.id,
            type: "App Update",
            title: "💳 Payment Received!",
            message: `Payment of ₹${amount} received. ${amount} BH Coins will be credited within 30 minutes.`,
            link: createPageUrl("Wallet"),
            priority: "High",
            dismissable: true,
            created_at: now
          });

          onSuccess(response.razorpay_payment_id);
        } catch (err) {
          console.error("Error saving payment:", err);
          alert("Payment done but saving failed. Contact support with ID: " + response.razorpay_payment_id);
        }
        setLoading(false);
      },
      prefill: {
        name: user.full_name || user.ign || "",
        email: user.email || "",
        contact: user.phone || user.mobile_number || ""
      },
      notes: {
        user_id: user.id,
        user_ign: user.ign || user.full_name,
        coins_requested: amount
      },
      theme: {
        color: "#f97316"
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
          if (onFailure) onFailure();
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      alert("Payment failed: " + response.error.description);
      setLoading(false);
      if (onFailure) onFailure();
    });

    rzp.open();
    setLoading(false);
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading || amount < 1}
      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 py-6 text-base font-bold"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Loading...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Pay ₹{amount} via Razorpay
          <Badge className="bg-white/20 text-white text-xs">Instant</Badge>
        </span>
      )}
    </Button>
  );
}