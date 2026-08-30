import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Plus, Search, Filter, Edit, Trash2, Eye, Tag, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SellerProducts() {
  const [activeTab, setActiveTab] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const mockProducts = [
    { id: 1, name: "Logitech G Pro X Superlight", category: "Gaming Gear", price: "12,995", status: "live", stock: 15, views: 1240 },
    { id: 2, name: "BattleHub Official Jersey", category: "Merchandise", price: "1,499", status: "pending", stock: 50, views: 0 },
    { id: 3, name: "Razer Huntsman Mini", category: "Gaming Gear", price: "9,999", status: "out_of_stock", stock: 0, views: 3450 },
  ];

  const renderProductList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search your products..." className="pl-9 bg-slate-900 border-gray-800 text-white focus-visible:ring-[#00FFFF]" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-slate-900 border-gray-800 text-gray-300">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-bold">
            <Plus className="w-4 h-4 mr-2" /> Add New
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-900 border border-gray-800 p-1 flex overflow-x-auto no-scrollbar">
          <TabsTrigger value="all" className="flex-1 min-w-[100px] data-[state=active]:bg-slate-800 data-[state=active]:text-[#00FFFF]">All (24)</TabsTrigger>
          <TabsTrigger value="live" className="flex-1 min-w-[100px] data-[state=active]:bg-slate-800 data-[state=active]:text-green-400">Live (18)</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 min-w-[100px] data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">Pending (6)</TabsTrigger>
          <TabsTrigger value="drafts" className="flex-1 min-w-[100px] data-[state=active]:bg-slate-800 data-[state=active]:text-gray-400">Drafts (2)</TabsTrigger>
          <TabsTrigger value="out_of_stock" className="flex-1 min-w-[120px] data-[state=active]:bg-slate-800 data-[state=active]:text-red-400">Out of Stock (3)</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-4">
          {mockProducts.map((p) => (
            <Card key={p.id} className="bg-slate-900 border-gray-800 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-32 h-32 bg-slate-800 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-8 h-8 text-gray-600" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white">{p.name}</h3>
                      <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                        <Tag className="w-3 h-3" /> {p.category}
                      </p>
                    </div>
                    <Badge className={
                      p.status === 'live' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                      p.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                      'bg-red-500/20 text-red-400 border-red-500/50'
                    }>
                      {p.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-gray-800/50">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Price</p>
                      <p className="font-mono font-bold text-white">₹{p.price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Stock</p>
                      <p className="font-mono font-bold text-white">{p.stock} Units</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Views</p>
                      <p className="font-mono font-bold text-white flex items-center gap-1"><Eye className="w-3 h-3 text-gray-400" /> {p.views}</p>
                    </div>
                    <div className="flex-1 flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="hover:bg-slate-800 text-gray-400 hover:text-white">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:bg-red-500/20 text-gray-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
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

  return (
    <div className="p-4 sm:p-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">Products</h2>
          <p className="text-sm text-gray-400">Manage your store's inventory and listings.</p>
        </div>
      </div>
      
      {showAddForm ? (
        <div className="bg-slate-900 border border-gray-800 rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Add New Product</h3>
          <p className="text-gray-400 mb-6">This form will use the professional layout we built earlier.</p>
          <Button onClick={() => setShowAddForm(false)} className="bg-slate-800 hover:bg-slate-700 text-white">Back to Products</Button>
        </div>
      ) : (
        renderProductList()
      )}
    </div>
  );
}
