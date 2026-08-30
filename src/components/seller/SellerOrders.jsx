import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Package, Truck, CheckCircle2, XCircle, RefreshCcw, MoreVertical, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SellerOrders() {
  const [activeTab, setActiveTab] = useState('all');

  const mockOrders = [
    { id: "ORD-9824-A", product: "Logitech G Pro X Superlight", customer: "Rahul Sharma", date: "Today, 10:45 AM", amount: "12,995", status: "new", statusColor: "text-[#00FFFF]", statusBg: "bg-[#00FFFF]/20" },
    { id: "ORD-9823-B", product: "BattleHub Official Jersey", customer: "Anita Desai", date: "Yesterday, 2:30 PM", amount: "1,499", status: "processing", statusColor: "text-amber-400", statusBg: "bg-amber-400/20" },
    { id: "ORD-9820-C", product: "Razer Huntsman Mini", customer: "Vikram Singh", date: "10 Jul 2026", amount: "9,999", status: "shipped", statusColor: "text-indigo-400", statusBg: "bg-indigo-400/20" },
    { id: "ORD-9815-D", product: "Gaming Mousepad XL", customer: "Pooja Patel", date: "05 Jul 2026", amount: "999", status: "delivered", statusColor: "text-green-400", statusBg: "bg-green-400/20" },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return <Package className="w-4 h-4" />;
      case 'processing': return <RefreshCcw className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">Orders</h2>
          <p className="text-sm text-gray-400">Manage and track customer orders.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search by Order ID or Customer..." className="pl-9 bg-slate-900 border-gray-800 text-white focus-visible:ring-[#00FFFF]" />
        </div>
        <Button variant="outline" className="bg-slate-900 border-gray-800 text-gray-300 w-full sm:w-auto">
          <Filter className="w-4 h-4 mr-2" /> Filter By Date
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-900 border border-gray-800 p-1 flex overflow-x-auto no-scrollbar justify-start">
          <TabsTrigger value="all" className="min-w-[80px] data-[state=active]:bg-slate-800 data-[state=active]:text-white">All</TabsTrigger>
          <TabsTrigger value="new" className="min-w-[100px] data-[state=active]:bg-slate-800 data-[state=active]:text-[#00FFFF]">New (12)</TabsTrigger>
          <TabsTrigger value="processing" className="min-w-[100px] data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">Processing (5)</TabsTrigger>
          <TabsTrigger value="shipped" className="min-w-[100px] data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-400">Shipped (8)</TabsTrigger>
          <TabsTrigger value="delivered" className="min-w-[100px] data-[state=active]:bg-slate-800 data-[state=active]:text-green-400">Delivered</TabsTrigger>
          <TabsTrigger value="cancelled" className="min-w-[100px] data-[state=active]:bg-slate-800 data-[state=active]:text-red-400">Cancelled</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-4">
          {mockOrders.map((o, i) => (
            <Card key={i} className="bg-slate-900 border-gray-800">
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap gap-2 justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-[#00FFFF] font-bold">{o.id}</span>
                      <span className="text-xs text-gray-500">• {o.date}</span>
                    </div>
                    <h3 className="text-white font-semibold">{o.product}</h3>
                  </div>
                  <Badge className={`${o.statusBg} ${o.statusColor} border-none flex items-center gap-1.5 px-2.5 py-1`}>
                    {getStatusIcon(o.status)}
                    <span className="capitalize">{o.status}</span>
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-gray-400">
                      {o.customer.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="text-sm text-gray-300 font-medium">{o.customer}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 sm:gap-8">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="text-base font-mono font-bold text-white">₹{o.amount}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-[#00FFFF] hover:text-[#00FFFF] hover:bg-[#00FFFF]/10 rounded-full" title="Chat with Buyer">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white border border-gray-700 h-8">
                        Update Status
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
