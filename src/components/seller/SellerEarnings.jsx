import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SellerEarnings() {
  const transactions = [
    { id: "TXN-001", type: "withdrawal", amount: "10,000", date: "12 Jul 2026", status: "completed" },
    { id: "ORD-9820-C", type: "sale", amount: "9,999", date: "10 Jul 2026", status: "completed" },
    { id: "ORD-9815-D", type: "sale", amount: "999", date: "05 Jul 2026", status: "completed" },
    { id: "TXN-002", type: "withdrawal", amount: "5,000", date: "01 Jul 2026", status: "completed" },
  ];

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">Earnings</h2>
          <p className="text-sm text-gray-400">Manage your revenue and withdrawals.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 border-emerald-500/30">
          <CardContent className="p-6">
            <p className="text-emerald-400 text-sm font-medium mb-1">Total Earnings</p>
            <h3 className="text-3xl font-black text-white">₹1,24,500</h3>
            <p className="text-xs text-emerald-400/80 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#00FFFF]/20 to-[#00FFFF]/5 border-[#00FFFF]/30">
          <CardContent className="p-6">
            <p className="text-[#00FFFF] text-sm font-medium mb-1">Available Balance</p>
            <h3 className="text-3xl font-black text-white">₹12,450</h3>
            <Button className="w-full mt-4 bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-bold h-9">
              Withdraw Money
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-gray-800">
          <CardContent className="p-6">
            <p className="text-amber-400 text-sm font-medium mb-1">Pending Settlement</p>
            <h3 className="text-3xl font-black text-white">₹4,500</h3>
            <p className="text-xs text-gray-500 mt-2">Will be cleared in 2-3 business days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="bg-slate-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Bank Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-950 p-4 rounded-xl border border-gray-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-400">Account Holder</p>
                  <p className="font-bold text-white">Rahul Sharma</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-none">Verified</Badge>
              </div>
              <div className="space-y-3 pt-3 border-t border-gray-800">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Bank Name</span>
                  <span className="text-sm text-gray-300 font-medium">HDFC Bank</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Account No.</span>
                  <span className="text-sm text-gray-300 font-mono">**** **** 1234</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">IFSC Code</span>
                  <span className="text-sm text-gray-300 font-mono">HDFC0001234</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4 bg-slate-900 border-gray-700 text-gray-300">
                Update Details
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#00FFFF]" />
                Transaction History
              </CardTitle>
              <Button variant="link" className="text-[#00FFFF] text-sm p-0">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((txn, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      txn.type === 'sale' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {txn.type === 'sale' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{txn.type === 'sale' ? 'Sale: ' + txn.id : 'Withdrawal'}</p>
                      <p className="text-xs text-gray-500">{txn.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${txn.type === 'sale' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {txn.type === 'sale' ? '+' : '-'}₹{txn.amount}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase mt-0.5 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> {txn.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
