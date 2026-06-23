import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { PaymentQR } from "@/entities/PaymentQR";
import { DiscountCode } from "@/entities/DiscountCode";
import { Notification } from "@/entities/Notification";
import { AppSettings } from "@/entities/AppSettings";
import { createPageUrl } from "@/utils";
import { HelpCircle, X, ChevronLeft, ChevronRight } from "lucide-react";

export default function BuyCoinsStepper({ open, onClose, user }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [amount, setAmount] = useState(0);
  const [utrNumber, setUtrNumber] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [finalAmount, setFinalAmount] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeQR, setActiveQR] = useState(null);
  const [utrGuideImages, setUtrGuideImages] = useState([]);
  const [utrGuideImage, setUtrGuideImage] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideSlide, setGuideSlide] = useState(0);

  useEffect(() => {
    if (open) {
      setStep(1);
      setAmount(0);
      setUtrNumber("");
      setDiscountCode("");
      setFinalAmount(0);
      setDiscountApplied(null);
      setShowGuide(false);
      setSubmitted(false);
      loadActiveQR();
      loadUTRGuide();
    }
  }, [open]);

  const loadActiveQR = async () => {
    try {
      const qrs = await PaymentQR.filter({ is_active: true });
      if (qrs.length > 0) setActiveQR(qrs[0]);
    } catch {}
  };

  const loadUTRGuide = async () => {
    try {
      const settings = await AppSettings.filter({ setting_key: "utr_guide_image" });
      if (settings.length > 0) setUtrGuideImage(settings[0].setting_value);
      // Load multiple guide images (utr_guide_image_1, _2, _3 etc)
      const allGuideSettings = await AppSettings.filter({ setting_key: "utr_guide_images" }).catch(() => []);
      if (allGuideSettings.length > 0 && allGuideSettings[0].setting_value) {
        try {
          const imgs = JSON.parse(allGuideSettings[0].setting_value);
          setUtrGuideImages(Array.isArray(imgs) ? imgs : []);
        } catch {}
      }
    } catch {}
  };

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    try {
      const codes = await DiscountCode.filter({ code: discountCode.toUpperCase(), is_active: true });
      if (codes.length === 0) { alert("Invalid or expired code"); return; }
      const code = codes[0];
      if (new Date(code.valid_until) < new Date()) { alert("Code expired"); return; }
      if (code.max_uses > 0 && code.current_uses >= code.max_uses) { alert("Code limit reached"); return; }
      if (amount < code.min_amount) { alert(`Minimum ₹${code.min_amount}`); return; }
      setFinalAmount(amount - Math.floor((amount * code.discount_percent) / 100));
      setDiscountApplied(code);
      alert(`✅ ${code.discount_percent}% discount applied!`);
    } catch { alert("Error applying code"); }
  };

  const handleSubmit = async () => {
    if (!utrNumber.trim() || utrNumber.trim().length < 6) { alert("Please enter a valid UTR Number (min 6 digits)"); return; }
    setSubmitting(true);
    try {
      // Check for duplicate UTR
      const existingRequests = await PaymentRequest.filter({ transaction_id: utrNumber.trim() });
      if (existingRequests.length > 0) {
        alert("❌ This UTR number has already been used! Please enter a different UTR.");
        setSubmitting(false);
        return;
      }

      await PaymentRequest.create({
        user_id: user.id,
        user_ign: user.ign || user.full_name,
        user_email: user.email,
        diamond_amount: finalAmount || amount,
        inr_amount: finalAmount || amount,
        payment_app: "UPI",
        transaction_id: utrNumber.trim(),
        discount_code_used: discountApplied ? discountCode : "",
        status: "Pending"
      });

      if (discountApplied) {
        await DiscountCode.update(discountApplied.id, { current_uses: (discountApplied.current_uses || 0) + 1 });
      }

      await Notification.create({
        recipient_id: user.id,
        type: "App Update",
        title: "💳 Payment Request Submitted",
        message: `Your request for ${finalAmount || amount} coins is under review. Coins will be credited within 30 minutes.`,
        link: createPageUrl("Wallet"),
        priority: "Medium",
        dismissable: true,
        created_at: new Date().toISOString()
      });

      setSubmitted(true);
      setTimeout(() => onClose(true), 3000);
    } catch { console.error("Submission failed"); }
    setSubmitting(false);
  };

  const payAmount = finalAmount || amount;

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
              Buy BH Coins
            </h2>
            <Badge className="bg-yellow-500/20 text-yellow-400 mt-2">Step {step} of 2</Badge>
          </div>

          {/* Step Progress Bar */}
          <div className="flex gap-1">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-yellow-500' : 'bg-gray-700'}`} />
            ))}
          </div>

          {/* Step 1: Amount + Discount only */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-400 font-semibold text-center">💰 1 BH Coin = ₹1</p>
              </div>

              <div>
                <Label className="text-gray-300">Amount (Minimum: ₹1)</Label>
                <Input
                  type="number" min="1" value={amount}
                  onChange={(e) => { setAmount(parseInt(e.target.value) || 0); setFinalAmount(0); setDiscountApplied(null); }}
                  placeholder="Enter amount in ₹"
                  className="bg-gray-800 border-gray-700 text-white text-lg mt-1"
                />
                <p className="text-sm text-gray-400 mt-1">You'll get: <span className="text-yellow-400 font-bold">{payAmount || amount} 🪙 BH Coins</span></p>
              </div>

              <div>
                <Label className="text-gray-300">Discount Code (Optional)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="Enter code" className="bg-gray-800 border-gray-700 text-white" />
                  <Button onClick={applyDiscount} variant="outline" className="border-gray-600">Apply</Button>
                </div>
                {discountApplied && (
                  <p className="text-green-400 text-sm mt-1">✓ {discountApplied.discount_percent}% off — Final: ₹{finalAmount}</p>
                )}
              </div>

              <Button onClick={() => setStep(2)} disabled={amount < 1} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-6">
                Next — Pay & Enter UTR →
              </Button>
            </div>
          )}

          {/* Step 2: QR Code on top, then UTR input */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-green-400 font-semibold text-lg">💳 Pay: ₹{payAmount}</p>
                <p className="text-gray-400 text-xs mt-1">Scan the QR below to pay, then enter your UTR number</p>
              </div>

              {/* UTR Input FIRST */}
              <div className="p-4 bg-gray-800 border-2 border-yellow-500/40 rounded-xl space-y-2">
                <Label className="text-white font-semibold block text-base">Enter UTR Number (12 digits)</Label>
                <Input
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="Enter 12-digit UTR number"
                  className="bg-gray-900 border-gray-600 text-white text-lg h-12 font-mono tracking-widest"
                  autoFocus
                  maxLength={12}
                  inputMode="numeric"
                />
                {/* UTR Guide - opens modal */}
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="flex items-center gap-1 text-blue-400 text-xs font-semibold mt-1 underline underline-offset-2"
                >
                  <HelpCircle className="w-3 h-3" />
                  UTR number kahan milega? (tap to view)
                </button>

              </div>

              {/* QR Code BELOW */}
              {activeQR ? (
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl text-center space-y-2">
                  <p className="text-gray-300 font-semibold text-sm">📷 Scan QR to Pay ₹{payAmount}</p>
                  <img src={activeQR.qr_image_url} className="w-44 mx-auto bg-white p-2 rounded-lg" alt="Payment QR" />
                  {activeQR.upi_id && <p className="text-xs text-gray-400">UPI ID: <span className="text-yellow-400 font-mono">{activeQR.upi_id}</span></p>}
                </div>
              ) : (
                <div className="p-4 bg-gray-800 border border-dashed border-gray-600 rounded-xl text-center">
                  <p className="text-gray-500 text-sm">No QR code available. Contact admin.</p>
                </div>
              )}

              {submitted && (
                <div className="bg-green-500/15 border border-green-500/30 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-bold text-lg">✅ Payment Request Submitted!</p>
                  <p className="text-gray-400 text-sm mt-1">Coins will be credited within 30 minutes after verification.</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-gray-700" disabled={submitted}>← Back</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!utrNumber.trim() || utrNumber.length < 6 || submitting || submitted}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-6 font-bold"
                >
                  {submitting ? "Submitting..." : submitted ? "Submitted ✅" : "Submit Request ✓"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* UTR Guide Modal - FULL SCREEN slideshow */}
    {showGuideModal && (
      <div className="fixed inset-0 z-[300] bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
          <h3 className="text-white font-bold text-base">📱 UTR Number Kahan Milega?</h3>
          <button onClick={() => setShowGuideModal(false)} className="text-gray-400 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Slide area */}
        <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-4">
          {(utrGuideImages.length > 0 || utrGuideImage) ? (
            <>
              <img
                src={utrGuideImages.length > 0 ? utrGuideImages[guideSlide] : utrGuideImage}
                alt={`Guide ${guideSlide + 1}`}
                className="max-h-full max-w-full object-contain rounded-xl"
                style={{ maxHeight: "calc(100vh - 160px)" }}
              />
              {utrGuideImages.length > 1 && (
                <>
                  <button
                    onClick={() => setGuideSlide(s => Math.max(0, s - 1))}
                    disabled={guideSlide === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center disabled:opacity-20"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={() => setGuideSlide(s => Math.min(utrGuideImages.length - 1, s + 1))}
                    disabled={guideSlide === utrGuideImages.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center disabled:opacity-20"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="space-y-3 text-sm text-gray-300 w-full max-w-md">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="font-bold text-green-400 mb-1">📱 Google Pay</p>
                <p>Payment History → Transaction → UPI Transaction ID</p>
              </div>
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="font-bold text-blue-400 mb-1">📱 Paytm</p>
                <p>Passbook → Transaction Details → UTR Number</p>
              </div>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="font-bold text-purple-400 mb-1">📱 PhonePe</p>
                <p>Transaction History → Details → UPI Ref No.</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom: dot indicators + counter */}
        {utrGuideImages.length > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 bg-gray-900 border-t border-gray-700">
            {utrGuideImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setGuideSlide(i)}
                className={`w-2.5 h-2.5 rounded-full ${i === guideSlide ? 'bg-blue-400' : 'bg-gray-600'}`}
              />
            ))}
            <span className="text-gray-400 text-xs ml-2">{guideSlide + 1} / {utrGuideImages.length}</span>
          </div>
        )}
      </div>
    )}
    </>
  );
}