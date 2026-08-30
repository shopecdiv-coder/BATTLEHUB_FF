import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, Users, Star, ShoppingBag, Clock, DollarSign, Wallet, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SellerOverview() {
  const metrics = [
    { label: "Total Products", value: "24", icon: Package, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Live Products", value: "18", icon: Activity, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Pending Approval", value: "6", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Total Orders", value: "156", icon: ShoppingBag, color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { label: "Sold Products", value: "342", icon: TrendingUp, color: "text-[#00FFFF]", bg: "bg-[#00FFFF]/10" },
    { label: "Total Revenue", value: "₹45,890", icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Wallet Balance", value: "₹12,450", icon: Wallet, color: "text-violet-400", bg: "bg-violet-400/10" },
    { label: "Average Rating", value: "4.8", icon: Star, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">Dashboard Overview</h2>
          <p className="text-sm text-gray-400">Welcome back! Here's what's happening in your store.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <Card key={i} className="bg-slate-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${m.bg}`}>
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{m.value}</h3>
                <p className="text-xs text-gray-400 font-medium">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="bg-slate-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00FFFF]" />
              Recent Sales Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-gray-700 rounded-lg">
              <Activity className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">Chart Data Loading...</p>
              <p className="text-xs text-gray-500 mt-1">Sales Graph (7/30/90 Days) will appear here</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              Best Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-slate-950 rounded-lg border border-gray-800">
                  <div className="w-12 h-12 bg-slate-800 rounded-md flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">Logitech G Pro Mouse</h4>
                    <p className="text-xs text-gray-400">45 Units Sold</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#00FFFF]">₹4,999</p>
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
