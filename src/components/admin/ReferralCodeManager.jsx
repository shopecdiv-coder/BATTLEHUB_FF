import React, { useState, useEffect } from "react";
import { AppSettings } from "@/entities/AppSettings";
import { User } from "@/entities/User";
import { Diamond } from "@/entities/Diamond";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Plus, X, Coins } from "lucide-react";

export default function ReferralCodeManager() {
  const [validCodes, setValidCodes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bonusAmount, setBonusAmount] = useState(10);
  const [givingBonus, setGivingBonus] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const users = await User.list();
    setAllUsers(users);

    const settings = await AppSettings.filter({ setting_key: "valid_referral_codes" });
    if (settings.length > 0 && settings[0].setting_value) {
      try {
        const codes = JSON.parse(settings[0].setting_value);
        setValidCodes(codes);
      } catch (e) {
        setValidCodes([]);
      }
    }
    setLoading(false);
  };

  const generateReferralCode = (userId) => {
    if (!userId) return "";
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return `BH${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}`;
  };

  const addAllUserCodes = async () => {
    const allCodes = allUsers.map(u => generateReferralCode(u.id)).filter(c => c);
    await saveValidCodes(allCodes);
  };

  const removeCode = async (code) => {
    const updated = validCodes.filter(c => c !== code);
    await saveValidCodes(updated);
  };

  const saveValidCodes = async (codes) => {
    const settings = await AppSettings.filter({ setting_key: "valid_referral_codes" });
    const value = JSON.stringify(codes);
    
    if (settings.length > 0) {
      await AppSettings.update(settings[0].id, { setting_value: value });
    } else {
      await AppSettings.create({
        setting_key: "valid_referral_codes",
        setting_value: value,
        is_enabled: true
      });
    }
    setValidCodes(codes);
  };

  const giveBonusToAll = async () => {
    if (bonusAmount < 1) {
      alert("Bonus amount must be at least 1 coin");
      return;
    }

    const confirmed = confirm(`Give ${bonusAmount} BH🪙 bonus to ALL ${allUsers.length} users?`);
    if (!confirmed) return;

    setGivingBonus(true);
    
    try {
      const now = new Date().toISOString();
      
      for (const user of allUsers) {
        const accounts = await Diamond.filter({ user_id: user.id });
        
        if (accounts.length > 0) {
          await Diamond.update(accounts[0].id, {
            amount: (accounts[0].amount || 0) + bonusAmount,
            transactions: [
              ...(accounts[0].transactions || []),
              {
                type: "Win",
                amount: bonusAmount,
                description: `🎁 Special Bonus from Admin`,
                timestamp: now
              }
            ]
          });
        } else {
          await Diamond.create({
            user_id: user.id,
            user_ign: user.ign || user.full_name,
            amount: bonusAmount,
            transactions: [{
              type: "Win",
              amount: bonusAmount,
              description: `🎁 Special Bonus from Admin`,
              timestamp: now
            }]
          });
        }
      }
      
      alert(`✅ Successfully distributed ${bonusAmount} BH🪙 to all ${allUsers.length} users!`);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to distribute bonus");
    }
    
    setGivingBonus(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-400" />
            Valid Referral Codes ({validCodes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={addAllUserCodes}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add All User Codes ({allUsers.length})
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto p-2">
            {validCodes.length === 0 ? (
              <p className="text-gray-500 text-sm">No valid codes yet. Click "Add All User Codes" to enable all user referral codes.</p>
            ) : (
              validCodes.map((code, index) => (
                <div key={index} className="flex items-center gap-1 bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full border border-purple-500/50">
                  <span className="text-sm font-mono">{code}</span>
                  <button
                    onClick={() => removeCode(code)}
                    className="text-red-400 hover:text-red-300 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-500/30">
        <CardHeader>
          <CardTitle className="text-yellow-400 flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Give Bonus to All Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-sm">
            Celebrate special occasions by giving bonus coins to all registered users!
          </p>
          
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Bonus Amount (BH🪙)</label>
              <Input
                type="number"
                min="1"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(parseInt(e.target.value) || 0)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter bonus amount"
              />
            </div>
            <Button
              onClick={giveBonusToAll}
              disabled={givingBonus || bonusAmount < 1}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90"
            >
              {givingBonus ? "Processing..." : `Give ${bonusAmount} BH🪙 to All`}
            </Button>
          </div>
          
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-xs">
              ⚠️ This will give {bonusAmount} BH🪙 to all {allUsers.length} registered users. Total: {bonusAmount * allUsers.length} BH🪙
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}