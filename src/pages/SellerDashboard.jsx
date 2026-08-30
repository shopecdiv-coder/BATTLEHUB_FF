import React, { useState } from 'react';
import { Home, Package, ShoppingCart, DollarSign, User } from 'lucide-react';
import SellerOverview from '@/components/seller/SellerOverview';
import SellerProducts from '@/components/seller/SellerProducts';
import SellerOrders from '@/components/seller/SellerOrders';
import SellerEarnings from '@/components/seller/SellerEarnings';
import SellerProfile from '@/components/seller/SellerProfile';

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <SellerOverview />;
      case 'products': return <SellerProducts />;
      case 'orders': return <SellerOrders />;
      case 'earnings': return <SellerEarnings />;
      case 'profile': return <SellerProfile />;
      default: return <SellerOverview />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans relative pb-20 sm:pb-0">
      {/* Main Content Area */}
      <div className="w-full h-full overflow-y-auto custom-scrollbar">
        {renderContent()}
      </div>

      {/* Seller Bottom Navigation - Fixed at bottom for mobile, hidden on large screens if side nav is implemented later */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-950/90 backdrop-blur-md border-t border-gray-800 z-[100] sm:px-6">
        <div className="flex items-center justify-between h-full max-w-lg mx-auto px-4">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
                  isActive ? 'text-[#00FFFF]' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className={`relative p-1.5 rounded-lg transition-colors ${isActive ? 'bg-[#00FFFF]/10' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={isActive ? 2.5 : 2} />
                  {/* Notification Dot Example for Orders */}
                  {item.id === 'orders' && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950"></span>
                  )}
                </div>
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
