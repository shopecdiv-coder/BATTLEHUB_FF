import React, { useState, useEffect } from "react";
import { Referral } from "@/entities/Referral";
import { AppSettings } from "@/entities/AppSettings";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Gift, CheckCircle, XCircle, Clock, Save, Coins, EyeOff, Download, Copy, Search } from "lucide-react";
import { format } from "date-fns";

export default function ReferralManagement({ onUpdate }) {
  const [referrals, setReferrals] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [referralPageVisible, setReferralPageVisible] = useState(true);
  const [rewardAmount, setRewardAmount] = useState(5);
  const [welcomeBonus, setWelcomeBonus] = useState(1);
  const [welcomeBonusEnabled, setWelcomeBonusEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allReferrals, referralSettings, bonusSettings, pageSettings, users] = await Promise.all([
        Referral.list("-created_date"),
        AppSettings.filter({ setting_key: "referral_system" }),
        AppSettings.filter({ setting_key: "welcome_bonus" }),
        AppSettings.filter({ setting_key: "referral_page_visible" }),
        User.list("-created_date", 500).catch(() => [])
      ]);
      
      // Generate unique_id for users missing it
      for (const u of users) {
        if (!u.unique_id) {
          const uniqueId = `BH${u.id.substring(0, 6).toUpperCase()}`;
          await User.update(u.id, { unique_id: uniqueId });
          u.unique_id = uniqueId;
        }
      }
      
      setAllUsers(users || []);
      setReferrals(allReferrals);
      
      if (referralSettings.length > 0) {
        setSettings(referralSettings[0]);
        setIsEnabled(referralSettings[0].is_enabled);
        setRewardAmount(parseInt(referralSettings[0].setting_value) || 5);
      }

      if (bonusSettings.length > 0) {
        setWelcomeBonusEnabled(bonusSettings[0].is_enabled);
        setWelcomeBonus(parseInt(bonusSettings[0].setting_value) || 1);
      }

      if (pageSettings.length > 0) {
        setReferralPageVisible(pageSettings[0].is_enabled);
      }
    } catch (error) {
      console.error("Error loading referrals:", error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save referral settings
      const referralSettings = await AppSettings.filter({ setting_key: "referral_system" });
      if (referralSettings.length > 0) {
        await AppSettings.update(referralSettings[0].id, {
          is_enabled: isEnabled,
          setting_value: String(rewardAmount)
        });
      } else {
        await AppSettings.create({
          setting_key: "referral_system",
          setting_value: String(rewardAmount),
          is_enabled: isEnabled,
          description: "Referral system settings"
        });
      }

      // Save welcome bonus settings
      const bonusSettings = await AppSettings.filter({ setting_key: "welcome_bonus" });
      if (bonusSettings.length > 0) {
        await AppSettings.update(bonusSettings[0].id, {
          is_enabled: welcomeBonusEnabled,
          setting_value: String(welcomeBonus)
        });
      } else {
        await AppSettings.create({
          setting_key: "welcome_bonus",
          setting_value: String(welcomeBonus),
          is_enabled: welcomeBonusEnabled,
          description: "Welcome bonus for new users"
        });
      }

      // Save referral page visibility
      const pageSettings = await AppSettings.filter({ setting_key: "referral_page_visible" });
      if (pageSettings.length > 0) {
        await AppSettings.update(pageSettings[0].id, {
          is_enabled: referralPageVisible
        });
      } else {
        await AppSettings.create({
          setting_key: "referral_page_visible",
          setting_value: "true",
          is_enabled: referralPageVisible,
          description: "Show/hide referral page"
        });
      }

      alert("Settings saved!");
      onUpdate?.();
    } catch (error) {
      console.error("Error saving settings:", error);
    }
    setSaving(false);
  };

  const markAsInvalid = async (referral) => {
    try {
      await Referral.update(referral.id, { 
        status: "Invalid",
        invalid_reason: "Marked invalid by admin"
      });
      loadData();
    } catch (error) {
      console.error("Error updating referral:", error);
    }
  };

  const completedCount = referrals.filter(r => r.status === "Completed").length;
  const pendingCount = referrals.filter(r => r.status === "Pending").length;
  const invalidCount = referrals.filter(r => r.status === "Invalid").length;

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const downloadAllCodes = () => {
    let content = `═══════════════════════════════════════════════\n`;
    content += `       🏆 BATTLE HUB 🏆\n`;
    content += `       ALL ACCOUNT CODES\n`;
    content += `═══════════════════════════════════════════════\n\n`;
    content += `Generated: ${format(new Date(), "PPP p")}\n`;
    content += `Total Users: ${allUsers.length}\n`;
    content += `\n═══════════════════════════════════════════════\n\n`;
    
    content += `Account Code | IGN | Full Name | Email\n`;
    content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    allUsers.forEach((u) => {
      const uniqueId = u.unique_id || 'N/A';
      content += `${uniqueId} | ${u.ign || '-'} | ${u.full_name || '-'} | ${u.email}\n`;
    });
    
    content += `\n═══════════════════════════════════════════════\n`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BattleHub_Account_Codes_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Filter users by search - also check unique_id
  const filteredUsers = searchCode ? allUsers.filter(u => {
    const code = u.referral_code || u.id.substring(0, 8).toUpperCase();
    const uniqueId = u.unique_id || '';
    const ign = u.ign || '';
    const name = u.full_name || '';
    return code.toLowerCase().includes(searchCode.toLowerCase()) ||
           uniqueId.toLowerCase().includes(searchCode.toLowerCase()) ||
           ign.toLowerCase().includes(searchCode.toLowerCase()) ||
           name.toLowerCase().includes(searchCode.toLowerCase());
  }) : allUsers;

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card className="bg-gradient-to-br from-blue-950 via-black to-blue-900 border-2 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <Gift className="w-5 h-5" />
            Referral & Bonus Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Referral System */}
          <div className="flex items-center justify-between p-4 bg-blue-900/30 rounded-lg border border-blue-500/20">
            <div>
              <Label className="text-gray-100 font-semibold">Referral System</Label>
              <p className="text-xs text-gray-400">Enable/disable referral program</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          {/* Referral Page Visibility */}
          <div className="flex items-center justify-between p-4 bg-red-900/20 rounded-lg border border-red-500/30">
            <div>
              <Label className="text-gray-100 font-semibold flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-red-400" />
                Hide Referral Page
              </Label>
              <p className="text-xs text-gray-400">When OFF, referral page will be hidden from menu</p>
            </div>
            <Switch checked={referralPageVisible} onCheckedChange={setReferralPageVisible} />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Referral Reward Amount (₹)</Label>
            <Input
              type="number"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 w-32"
            />
          </div>

          {/* Welcome Bonus */}
          <div className="border-t border-blue-500/30 pt-4">
            <div className="flex items-center justify-between p-4 bg-blue-900/30 rounded-lg mb-4 border border-blue-500/20">
              <div>
                <Label className="text-gray-100 font-semibold flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  Welcome Bonus (New User)
                </Label>
                <p className="text-xs text-gray-400">Give coins to new users on signup</p>
              </div>
              <Switch checked={welcomeBonusEnabled} onCheckedChange={setWelcomeBonusEnabled} />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Welcome Bonus Amount (Coins)</Label>
              <Input
                type="number"
                value={welcomeBonus}
                onChange={(e) => setWelcomeBonus(parseInt(e.target.value) || 0)}
                className="bg-gray-800 border-gray-700 w-32"
              />
            </div>
          </div>

          <Button onClick={saveSettings} disabled={saving} className="bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-900/20 border-green-500/30">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-400">{completedCount}</p>
            <p className="text-xs text-gray-400">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-900/20 border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
            <p className="text-xs text-gray-400">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-4 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-400">{invalidCount}</p>
            <p className="text-xs text-gray-400">Invalid</p>
          </CardContent>
        </Card>
      </div>

      {/* All Account Codes */}
      <Card className="bg-gradient-to-br from-purple-950 to-black border-purple-500/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-purple-400 flex items-center gap-2">
            <Gift className="w-5 h-5" />
            All User Account Codes ({allUsers.length})
          </CardTitle>
          <Button onClick={downloadAllCodes} className="bg-purple-600 hover:bg-purple-700">
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Search by account code, IGN or name..."
              className="bg-gray-800 border-gray-700 text-white pl-10"
            />
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredUsers.slice(0, 100).map((u) => {
              const uniqueId = u.unique_id || 'N/A';
              return (
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="font-semibold text-white">{u.ign || u.full_name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500/20 text-purple-400 font-mono text-sm px-3">
                      {uniqueId}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCode(uniqueId)}
                      className="h-8 w-8 p-0"
                    >
                      {copiedCode === uniqueId ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Referrals List */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-100">Referral History ({referrals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No referrals yet</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-100">
                      {ref.referrer_ign} → {ref.referred_user_ign}
                    </p>
                    <p className="text-xs text-gray-500">
                      Reward: ₹{ref.reward_amount || rewardAmount} | {ref.tournament_played ? `Tournament: ${ref.tournament_played}` : "No tournament yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      ref.status === "Completed" ? "bg-green-500/20 text-green-400" :
                      ref.status === "Pending" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }>
                      {ref.status}
                    </Badge>
                    {ref.status === "Pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsInvalid(ref)}
                        className="border-red-500 text-red-400 text-xs"
                      >
                        Mark Invalid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}