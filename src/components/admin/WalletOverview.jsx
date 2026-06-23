import React, { useState, useEffect } from "react";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { RedeemRequest } from "@/entities/RedeemRequest";
import { RedeemCode } from "@/entities/RedeemCode";
import { Diamond } from "@/entities/Diamond";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, TrendingUp, ArrowUpCircle, ArrowDownCircle, Search, Trash2, FileText, Download } from "lucide-react";
import { format } from "date-fns";

function generateInvoiceText(req) {
  const now = new Date();
  const invoiceNo = `BHFF-INV-${req.id?.slice(-8).toUpperCase() || "XXXXXXXX"}`;
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
    `Name          : ${req.user_ign || "-"}`,
    `Email         : ${req.user_email || "-"}`,
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
    `  For support: helpbattlehub@gmail.com`,
    `  Website: BATTLEHUBFF.SITE`,
    `  Refund Policy: Coins are non-refundable once credited.`,
    `  This is a system-generated invoice.`,
    `==========================================================`,
  ].filter(Boolean);
  return lines.join("\n");
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function WalletOverview() {
  const [payments, setPayments] = useState([]);
  const [redeems, setRedeems] = useState([]);
  const [codes, setCodes] = useState([]);
  const [allTxns, setAllTxns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("purchases");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [p, r, c, diamonds, allUsers] = await Promise.all([
      PaymentRequest.list("-created_date", 200).catch(() => []),
      RedeemRequest.list("-created_date", 200).catch(() => []),
      RedeemCode.list("-created_date", 200).catch(() => []),
      Diamond.list("-created_date", 500).catch(() => []),
      User.list("-created_date", 500).catch(() => []),
    ]);
    setPayments(p); setRedeems(r); setCodes(c); setUsers(allUsers);
    const txns = [];
    (diamonds || []).forEach(d => {
      (d.transactions || []).forEach(tx => txns.push({ ...tx, user_id: d.user_id, user_ign: d.user_ign }));
    });
    txns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setAllTxns(txns);
    setLoading(false);
  };

  const deleteItem = async (entity, id, list, setter) => {
    if (!confirm("Delete this record?")) return;
    await entity.delete(id);
    setter(list.filter(x => x.id !== id));
  };

  const downloadAllInvoices = () => {
    const verified = payments.filter(p => p.status === "Verified");
    if (!verified.length) { alert("No verified payments found"); return; }
    const all = verified.map(req => generateInvoiceText(req)).join("\n\n" + "=".repeat(58) + "\n\n");
    downloadText(all, `BHFF-All-Invoices-${format(new Date(), "yyyy-MM-dd")}.txt`);
  };

  const downloadContactsCSV = () => {
    const rows = [["Name", "Email", "Phone", "User ID", "Role"]];
    users.forEach(u => {
      rows.push([
        u.full_name || "", u.email || "",
        u.mobile_number || u.phone || "",
        u.id || "", u.role || "user"
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `BHFF-Contacts-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const totalPurchased = payments.filter(p => p.status === "Verified").reduce((s, p) => s + (p.inr_amount || 0), 0);
  const totalRedeemed = redeems.filter(r => r.status === "Completed").reduce((s, r) => s + (r.inr_amount || 0), 0);

  const TABS = [
    { key: "purchases", label: "Coin Purchases", count: payments.length },
    { key: "redeems", label: "Redeem Requests", count: redeems.length },
    { key: "codes", label: "Redeem Codes", count: codes.length },
    { key: "txns", label: "All Transactions", count: allTxns.length },
  ];

  const f = search.toLowerCase();
  const filteredPayments = payments.filter(p => !f || p.user_ign?.toLowerCase().includes(f) || p.transaction_id?.toLowerCase().includes(f) || p.user_email?.toLowerCase().includes(f));
  const filteredRedeems = redeems.filter(r => !f || r.user_ign?.toLowerCase().includes(f) || r.user_id?.includes(f));
  const filteredCodes = codes.filter(c => !f || c.user_ign?.toLowerCase().includes(f) || c.redeem_code?.toLowerCase().includes(f));
  const filteredTxns = allTxns.filter(t => !f || t.user_ign?.toLowerCase().includes(f) || t.description?.toLowerCase().includes(f));

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Purchased (Verified)", value: `Rs.${totalPurchased}`, icon: Coins, color: "text-green-400" },
          { label: "Total Redeemed (Done)", value: `Rs.${totalRedeemed}`, icon: TrendingUp, color: "text-blue-400" },
          { label: "Pending Purchases", value: payments.filter(p => p.status === "Pending").length, icon: ArrowUpCircle, color: "text-yellow-400" },
          { label: "Pending Redeems", value: redeems.filter(r => r.status === "Pending").length, icon: ArrowDownCircle, color: "text-orange-400" },
        ].map((s, i) => (
          <Card key={i} className="bg-gray-900 border-gray-700">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div><p className="text-xs text-gray-400">{s.label}</p><p className="text-xl font-bold text-white">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={downloadAllInvoices} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <FileText className="w-4 h-4" />All Invoices (.txt)
        </Button>
        <Button onClick={downloadContactsCSV} variant="outline" className="border-green-600 text-green-400 hover:bg-green-500/10 gap-2">
          <Download className="w-4 h-4" />Export Contacts (.csv)
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search by name, email, transaction ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === tab.key ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
            {tab.label} <span className="ml-1 bg-black/30 rounded-full px-1.5 text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Coin Purchases */}
      {activeTab === "purchases" && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader><CardTitle className="text-white text-base">💳 Coin Purchase History</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredPayments.length === 0 && <p className="text-gray-500 text-center py-8">No records</p>}
            {filteredPayments.map(req => (
              <div key={req.id} className="p-3 bg-gray-800/60 rounded-lg flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{req.user_ign} <span className="text-gray-400 font-normal text-xs">({req.user_email})</span></p>
                  <p className="text-xs text-gray-400">Txn: {req.transaction_id || "—"} · {req.payment_app}</p>
                  <p className="text-xs text-gray-500">{format(new Date(req.created_date), "dd MMM yyyy, hh:mm a")}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="text-green-400 font-bold text-sm">Rs.{req.inr_amount} · {req.diamond_amount}🪙</p>
                  <Badge className={req.status === "Verified" ? "bg-green-500/20 text-green-400" : req.status === "Rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}>{req.status}</Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 h-7 px-2 text-xs gap-1"
                      onClick={() => downloadText(generateInvoiceText(req), `BHFF-Invoice-${req.id?.slice(-8)}.txt`)}>
                      <FileText className="w-3 h-3" />Invoice
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 px-2"
                      onClick={() => deleteItem(PaymentRequest, req.id, payments, setPayments)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Redeem Requests */}
      {activeTab === "redeems" && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader><CardTitle className="text-white text-base">🏦 Redeem Request History</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredRedeems.length === 0 && <p className="text-gray-500 text-center py-8">No records</p>}
            {filteredRedeems.map(req => (
              <div key={req.id} className="p-3 bg-gray-800/60 rounded-lg flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{req.user_ign}</p>
                  <p className="text-xs text-gray-400">{req.bank_details?.upi_id || req.bank_details?.phone_number || req.bank_details?.account_number || "—"}</p>
                  <p className="text-xs text-gray-500">{format(new Date(req.created_date), "dd MMM yyyy, hh:mm a")}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="text-orange-400 font-bold text-sm">Rs.{req.inr_amount} · {req.diamond_amount}🪙</p>
                  <Badge className={req.status === "Completed" ? "bg-green-500/20 text-green-400" : req.status === "Rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}>{req.status}</Badge>
                  <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 px-2"
                    onClick={() => deleteItem(RedeemRequest, req.id, redeems, setRedeems)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Redeem Codes */}
      {activeTab === "codes" && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader><CardTitle className="text-white text-base">🎁 Redeem Code Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredCodes.length === 0 && <p className="text-gray-500 text-center py-8">No records</p>}
            {filteredCodes.map(c => (
              <div key={c.id} className="p-3 bg-gray-800/60 rounded-lg flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{c.user_ign}</p>
                  {c.redeem_code && <p className="text-xs text-purple-400 font-mono">{c.redeem_code}</p>}
                  <p className="text-xs text-gray-500">{format(new Date(c.created_date), "dd MMM yyyy, hh:mm a")}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="text-purple-400 font-bold">{c.coin_amount}🪙</p>
                  <Badge className={c.status === "Sent" ? "bg-green-500/20 text-green-400" : c.status === "Rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}>{c.status}</Badge>
                  <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 px-2"
                    onClick={() => deleteItem(RedeemCode, c.id, codes, setCodes)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Transactions */}
      {activeTab === "txns" && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader><CardTitle className="text-white text-base">📋 All User Transactions</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredTxns.length === 0 && <p className="text-gray-500 text-center py-8">No records</p>}
            {filteredTxns.slice(0, 200).map((tx, i) => (
              <div key={i} className="p-3 bg-gray-800/60 rounded-lg flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{tx.user_ign || tx.user_id}</p>
                  <p className="text-xs text-gray-400">{tx.description}</p>
                  <p className="text-xs text-gray-500">{tx.timestamp ? format(new Date(tx.timestamp), "dd MMM yyyy, hh:mm a") : "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>{tx.amount > 0 ? "+" : ""}{tx.amount} {tx.coin_type === "Diamond" ? "💎" : "🪙"}</p>
                  <p className="text-xs text-gray-500">{tx.type}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}