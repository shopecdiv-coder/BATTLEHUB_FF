import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function CoinInvoiceDownload({ paymentRequest, user }) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const req = paymentRequest || {};
  const isWithdrawal = req.type === "DEBIT" || (req.description && req.description.toLowerCase().includes("withdraw"));
  
  const invoiceNo = isWithdrawal 
    ? `BH-WD-${(req.id || "TX").toString().slice(-10).toUpperCase()}`
    : `BH-INV-${(req.id || "TX").toString().slice(-10).toUpperCase()}`;

  const paidAmt = Number(req.inr_amount || req.amount || 0);
  const txDate = req.created_date
    ? format(new Date(req.created_date), "dd MMM yyyy, hh:mm a")
    : format(new Date(), "dd MMM yyyy, hh:mm a");

  const realName = 
    user?.full_name || 
    user?.name || 
    req.user_name || 
    "Rahul Sharma";

  const battleHubId = 
    user?.unique_id || 
    (user?.id ? user.id.toString().substring(0, 8) : null) || 
    (req.user_id ? req.user_id.toString().substring(0, 8) : null) || 
    "BH849201";

  const ign = 
    user?.ign || 
    user?.username || 
    req.user_ign || 
    "Rahul_FF_Pro";

  // Dynamic Content for Deposit vs Withdrawal
  const docHeaderTitle = isWithdrawal ? "PAYOUT RECEIPT" : "TAX INVOICE";
  const navTitle = isWithdrawal ? "PAYOUT RECEIPT" : "INVOICE RECEIPT";
  const itemTitle = isWithdrawal ? "Winnings Balance Payout" : "BH Coins Deposit";
  const itemSub = isWithdrawal ? `-${paidAmt} Coins` : `+${paidAmt} Coins`;
  const paymentSectionTitle = isWithdrawal ? "Payout Destination:" : "Payment Details:";
  const paymentMethodName = isWithdrawal ? (req.payment_app || "UPI / Bank Transfer") : (req.payment_app || "UPI Instant Pay");
  const statusLabel = isWithdrawal ? "DISPATCHED" : "SUCCESS";
  const totalPaidLabel = isWithdrawal ? "Total Amount Paid Out" : "Total Amount Paid";

  const handleOpenInvoice = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setOpen(true);
    }, 750);
  };

  const invoicePage = open && (
    <div className="fixed inset-0 z-[999999] w-screen h-screen flex flex-col overflow-hidden bg-slate-950 font-sans">

      {/* ── TOP NAV BAR ── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 shadow-lg z-50">
        <button
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-300" />
          <span>Back to Wallet</span>
        </button>

        <span className="text-xs font-bold text-slate-300 font-mono tracking-wider">
          {navTitle}
        </span>
      </div>

      {/* ── DOCUMENT CANVAS ── */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-3 sm:p-8 flex justify-center items-center custom-scrollbar">
        <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden my-auto font-sans text-slate-800 border border-slate-200">

          <div className="p-6 space-y-4">
            
            {/* ── 1. HEADER ── */}
            <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">BATTLEHUB</h1>
                <p className="text-xs text-slate-500">Greater Noida, UP, India</p>
                <p className="text-xs text-slate-500">helpbattlehub@gmail.com</p>
              </div>

              <div className="text-right">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{docHeaderTitle}</h2>
                <p className="text-xs font-mono font-medium text-slate-700">{invoiceNo}</p>
                <p className="text-xs text-slate-500">{txDate}</p>
              </div>
            </div>

            {/* ── 2. PLAYER INFO & PAYMENT DETAILS ── */}
            <div className="grid grid-cols-2 gap-4 text-xs py-1">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">Player Info:</span>
                <p className="font-medium text-slate-800">{realName}</p>
                <p className="text-slate-600 font-mono text-[11px]">BH ID: {battleHubId}</p>
                <p className="text-slate-600 font-mono text-[11px]">IGN: {ign}</p>
              </div>

              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">{paymentSectionTitle}</span>
                <p className="font-medium text-slate-800">{paymentMethodName}</p>
                <p className="text-slate-600">Status: <span className="font-bold text-slate-900">{statusLabel}</span></p>
              </div>
            </div>

            {/* ── 3. CLEAN TABLE ── */}
            <div className="border border-slate-200 rounded text-xs">
              <div className="bg-slate-50 p-2 flex justify-between font-bold text-slate-800 border-b border-slate-200">
                <span>Item Description</span>
                <span>Qty</span>
                <span className="text-right">Amount</span>
              </div>

              <div className="p-2.5 flex justify-between items-center bg-white border-b border-slate-200">
                <div>
                  <p className="font-medium text-slate-800">{itemTitle}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{itemSub}</p>
                </div>
                <span className="text-slate-700">1</span>
                <span className="font-mono text-slate-800">₹{paidAmt.toFixed(2)}</span>
              </div>

              <div className="p-3 bg-slate-50 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-800">₹{paidAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax / Processing Fee</span>
                  <span className="font-mono text-slate-800">₹0.00</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>{totalPaidLabel}</span>
                  <span className="font-mono text-sm text-slate-900">₹{paidAmt.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* ── 4. LEGAL TERMS & SIGNATURE NOTICE ── */}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center space-y-0.5">
              <p>This is a computer generated document and does not require a physical signature.</p>
              <p className="text-[10px] text-slate-400">Subject to BattleHub Terms & Conditions.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 📥 INVOICE ICON BUTTON IN TRANSACTION LIST */}
      <button
        onClick={handleOpenInvoice}
        disabled={isGenerating}
        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md border text-amber-400 flex items-center justify-center transition-all shrink-0 shadow-sm ${
          isGenerating 
            ? "border-amber-400 bg-amber-500/30 scale-110 shadow-amber-500/30" 
            : "border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/25 active:scale-90"
        }`}
        title="View Official Invoice"
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 transition-all ${
            isGenerating ? "animate-bounce" : ""
          }`}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M12 18v-5" />
          <path d="m9 15 3 3 3-3" opacity={isGenerating ? "0.6" : "1"} />
        </svg>
      </button>

      {/* RENDER FULLSCREEN INVOICE VIA REACT PORTAL DIRECTLY ON DOCUMENT.BODY */}
      {typeof document !== "undefined" && open && createPortal(invoicePage, document.body)}
    </>
  );
}