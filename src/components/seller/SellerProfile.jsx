import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { User, Store, Mail, Phone, MapPin, FileText, Settings, LogOut, Bell, Shield, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function SellerProfile() {
  const settingsGroups = [
    {
      title: "Store Management",
      items: [
        { icon: Store, label: "Basic Information", desc: "Logo, Banner, Store Name & Description" },
        { icon: MapPin, label: "Business Details", desc: "Address, Business Hours, UID" },
        { icon: FileText, label: "Tax & Legal", desc: "GST (Optional), PAN (Optional)" },
        { icon: Map, label: "Shipping Settings", desc: "Delivery Charges, Courier Preference" },
        { icon: Shield, label: "Store Policies", desc: "Return Policy, Privacy Policy" },
      ]
    },
    {
      title: "Account Settings",
      items: [
        { icon: User, label: "Edit Personal Profile", desc: "Seller Name, Phone, Email" },
        { icon: Shield, label: "KYC Verification", desc: "Identity & Business Verification" },
        { icon: Bell, label: "Notification Settings", desc: "Order Alerts, System Announcements" },
        { icon: Settings, label: "App Preferences", desc: "Theme, Language" },
      ]
    }
  ];

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">Store Profile</h2>
          <p className="text-sm text-gray-400">Manage your store settings and account.</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-gray-800 overflow-hidden relative">
        <div className="h-24 bg-gradient-to-r from-red-950 to-[#00FFFF]/20"></div>
        <div className="px-6 pb-6 relative flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
          <div className="w-24 h-24 rounded-2xl bg-slate-800 border-4 border-slate-900 flex items-center justify-center shrink-0 shadow-xl overflow-hidden">
            <Store className="w-10 h-10 text-gray-500" />
          </div>
          <div className="text-center sm:text-left flex-1 mt-2 sm:mt-0">
            <h3 className="text-xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              ProGamer Gear <Badge className="bg-[#00FFFF]/20 text-[#00FFFF] border-none text-[10px]">VERIFIED</Badge>
            </h3>
            <p className="text-sm text-gray-400 mt-1">UID: BH-SLR-98421</p>
          </div>
          <Button variant="outline" className="bg-slate-900 border-gray-700 text-white w-full sm:w-auto mt-4 sm:mt-0">
            View Public Store
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {settingsGroups[0].items.map((item, i) => (
            <Card key={i} className="bg-slate-900 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">{item.label}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="space-y-6">
          {settingsGroups[1].items.map((item, i) => (
            <Card key={i} className="bg-slate-900 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">{item.label}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Card className="bg-red-950/20 border-red-900/30 hover:border-red-900/50 transition-colors cursor-pointer mt-8">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-red-400">Logout Seller Account</h4>
                <p className="text-xs text-red-400/60 mt-0.5">Switch back to buyer mode</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Small Badge component since we didn't import it directly
function Badge({ children, className }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>{children}</span>;
}
