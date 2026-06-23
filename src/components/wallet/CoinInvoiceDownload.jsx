import React from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { format } from "date-fns";

export default function CoinInvoiceDownload({ paymentRequest, user }) {
  const generateInvoice = () => {
    const req = paymentRequest;
    const now = new Date();
    const invoiceNo = `BHFF-INV-${req.id?.slice(-8).toUpperCase() || Math.random().toString(36).slice(-8).toUpperCase()}`;
    const paidAmt = req.inr_amount || req.diamond_amount;

    const lines = [
      `==========================================================`,
      `          BATTLEHUB FF - OFFICIAL COIN PURCHASE INVOICE`,
      `==========================================================`,
      ``,
      `COMPANY DETAILS`,
      `----------------------------------------------------------`,
      `Company       : BattleHub FF`,
      `Address       : Greater Noida, Gautam Buddha Nagar, UP, India`,
      `Support Email : helpbattlehub@gmail.com`,
      `Website       : BATTLEHUBFF.SITE`,
      ``,
      `INVOICE DETAILS`,
      `----------------------------------------------------------`,
      `Invoice No.   : ${invoiceNo}`,
      `Invoice Date  : ${format(now, "dd MMM yyyy, hh:mm a")}`,
      `Order / Txn ID: ${req.transaction_id || "N/A"}`,
      `Status        : ${req.status === "Verified" ? "PAYMENT VERIFIED" : req.status.toUpperCase()}`,
      ``,
      `CUSTOMER DETAILS`,
      `----------------------------------------------------------`,
      `Name          : ${user?.full_name || req.user_ign || "-"}`,
      `Email         : ${user?.email || req.user_email || "-"}`,
      `Mobile        : ${user?.mobile_number || user?.phone || "-"}`,
      `User ID       : ${req.user_id}`,
      `Player IGN    : ${req.user_ign || "-"}`,
      ``,
      `PURCHASE DETAILS`,
      `----------------------------------------------------------`,
      `Item                            Qty    Unit Price    Total`,
      `----------------------------------------------------------`,
      `BattleHub FF Coins Pack          1     Rs.${paidAmt.toFixed(2)}      Rs.${paidAmt.toFixed(2)}`,
      `(${req.diamond_amount} BH Coins)`,
      ``,
      `PAYMENT DETAILS`,
      `----------------------------------------------------------`,
      `Payment Method : ${req.payment_app || "UPI"}`,
      `Transaction ID : ${req.transaction_id || "N/A"}`,
      `Payment Status : ${req.status === "Verified" ? "PAID" : req.status.toUpperCase()}`,
      `Payment Date   : ${format(new Date(req.created_date), "dd MMM yyyy, hh:mm a")}`,
      req.processed_at ? `Verified On    : ${format(new Date(req.processed_at), "dd MMM yyyy, hh:mm a")}` : "",
      ``,
      `PRICE BREAKDOWN`,
      `----------------------------------------------------------`,
      `Subtotal                       : Rs.${paidAmt.toFixed(2)}`,
      req.discount_code_used ? `Discount (Code: ${req.discount_code_used})  : Applied` : `Discount                       : Rs.0.00`,
      `GST (Exempt - Digital Goods)   : Rs.0.00`,
      `----------------------------------------------------------`,
      `TOTAL PAID                     : Rs.${paidAmt.toFixed(2)}`,
      `Coins Credited                 : ${req.diamond_amount} BH Coins`,
      ``,
      `==========================================================`,
      `  Thank you for purchasing BattleHub FF Coins!`,
      ``,
      `  For support: helpbattlehub@gmail.com`,
      `  Website: BATTLEHUBFF.SITE`,
      ``,
      `  Refund Policy: Coins are non-refundable once credited.`,
      `  Contact support for disputes.`,
      ``,
      `  This is a system-generated invoice.`,
      `==========================================================`,
    ].filter(l => l !== undefined);

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BHFF-Invoice-${invoiceNo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={generateInvoice}
      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 gap-1"
      title="Download Invoice"
    >
      <FileText className="w-3.5 h-3.5" />
      Invoice
    </Button>
  );
}