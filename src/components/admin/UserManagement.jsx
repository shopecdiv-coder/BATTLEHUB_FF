import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Diamond } from "@/entities/Diamond";
import { Notification } from "@/entities/Notification";
import { Registration } from "@/entities/Registration";
import { MessageTemplate } from "@/entities/MessageTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, Search, Send, Coins, Bell, Eye, X, 
  Copy, Check, Trophy, Calendar, Download, Gamepad2, Ban, Shield, MessageCircle, Gem
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserPerformanceDashboard from "./UserPerformanceDashboard";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [userDiamond, setUserDiamond] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  
  // Send notification
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  
  // Send coins
  const [coinAmount, setCoinAmount] = useState(0);
  const [coinReason, setCoinReason] = useState("");
  const [sendingCoins, setSendingCoins] = useState(false);
  
  // Ban user
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);
  
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadUsers();
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const allTemplates = await MessageTemplate.filter({ is_active: true });
      setTemplates(allTemplates || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  useEffect(() => {
    if (search) {
      const filtered = users.filter(u => 
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.ign?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.unique_id?.toLowerCase().includes(search.toLowerCase()) ||
        u.id?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [search, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Load all users in a single fetch (up to 5000)
      const allUsers = await User.list("-created_date", 5000).catch(() => []);
      
      setUsers(allUsers || []);
      setFilteredUsers(allUsers || []);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    
    // Load user's registrations and diamond account
    const [regs, diamonds] = await Promise.all([
      Registration.filter({ team_leader_id: user.id }, "-created_date", 20).catch(() => []),
      Diamond.filter({ user_id: user.id }).catch(() => [])
    ]);
    
    setUserRegistrations(regs || []);
    setUserDiamond(diamonds.length > 0 ? diamonds[0] : null);
  };

  const sendNotification = async () => {
    if (!notifTitle || !notifMessage || !selectedUser) return;
    
    setSendingNotif(true);
    try {
      await Notification.create({
        recipient_id: selectedUser.id,
        type: "Admin Announcement",
        title: notifTitle,
        message: notifMessage,
        priority: "High",
        dismissable: true,
        created_at: new Date().toISOString()
      });
      
      alert(`✅ Notification sent to ${selectedUser.ign || selectedUser.full_name}`);
      setNotifTitle("");
      setNotifMessage("");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to send notification");
    }
    setSendingNotif(false);
  };

  const sendCoins = async (coinType = "bh") => {
    if (!coinAmount || coinAmount <= 0 || !selectedUser) return;
    
    setSendingCoins(true);
    try {
      const now = new Date().toISOString();
      
      if (userDiamond) {
        const updateData = coinType === "diamond" 
          ? {
              diamond_balance: (userDiamond.diamond_balance || 0) + coinAmount,
              transactions: [...(userDiamond.transactions || []), {
                type: "Diamond Earned",
                coin_type: "Diamond",
                amount: coinAmount,
                description: coinReason || `Admin sent ${coinAmount} diamonds`,
                timestamp: now
              }]
            }
          : {
              bh_coin_balance: (userDiamond.bh_coin_balance || 0) + coinAmount,
              transactions: [...(userDiamond.transactions || []), {
                type: "Win",
                coin_type: "BH Coin",
                amount: coinAmount,
                description: coinReason || `Admin sent ${coinAmount} BH coins`,
                timestamp: now
              }]
            };
        await Diamond.update(userDiamond.id, updateData);
      } else {
        await Diamond.create({
          user_id: selectedUser.id,
          user_ign: selectedUser.ign || selectedUser.full_name,
          diamond_balance: coinType === "diamond" ? coinAmount : 0,
          bh_coin_balance: coinType === "bh" ? coinAmount : 0,
          transactions: [{
            type: coinType === "diamond" ? "Diamond Earned" : "Win",
            coin_type: coinType === "diamond" ? "Diamond" : "BH Coin",
            amount: coinAmount,
            description: coinReason || `Admin sent ${coinAmount} ${coinType === "diamond" ? "diamonds" : "BH coins"}`,
            timestamp: now
          }]
        });
      }
      
      await Notification.create({
        recipient_id: selectedUser.id,
        type: "Prize Distributed",
        title: coinType === "diamond" ? "💎 Diamonds Received!" : "🪙 Coins Received!",
        message: `You received ${coinAmount} ${coinType === "diamond" ? "diamonds" : "BH coins"}. ${coinReason || ''}`,
        priority: "High",
        dismissable: true,
        created_at: now
      });
      
      alert(`✅ ${coinAmount} ${coinType === "diamond" ? "💎" : "🪙"} sent to ${selectedUser.ign || selectedUser.full_name}`);
      setCoinAmount(0);
      setCoinReason("");
      await selectUser(selectedUser);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to send");
    }
    setSendingCoins(false);
  };

  const copyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const banUser = async () => {
    if (!selectedUser || !banReason) return;
    
    setBanning(true);
    try {
      await User.update(selectedUser.id, {
        is_banned: true,
        ban_reason: banReason,
        banned_at: new Date().toISOString(),
        banned_email: selectedUser.email // Store email to prevent re-registration
      });
      
      await Notification.create({
        recipient_id: selectedUser.id,
        type: "Admin Announcement",
        title: "⛔ Account Banned",
        message: `Your account has been banned. Reason: ${banReason}`,
        priority: "Urgent",
        dismissable: false,
        created_at: new Date().toISOString()
      });
      
      alert(`✅ User ${selectedUser.ign || selectedUser.full_name} has been banned`);
      setBanReason("");
      await loadUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to ban user");
    }
    setBanning(false);
  };

  const unbanUser = async () => {
    if (!selectedUser) return;
    
    setBanning(true);
    try {
      await User.update(selectedUser.id, {
        is_banned: false,
        ban_reason: null,
        banned_at: null
      });
      
      alert(`✅ User ${selectedUser.ign || selectedUser.full_name} has been unbanned`);
      await loadUsers();
      await selectUser(selectedUser);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to unban user");
    }
    setBanning(false);
  };

  const downloadUserCoinReport = (user, diamond) => {
    let content = `╔══════════════════════════════════════════╗\n`;
    content += `║    🏆 BATTLEHUB FF — COIN REPORT 🏆      ║\n`;
    content += `╚══════════════════════════════════════════╝\n\n`;
    content += `Player  : ${user.ign || user.full_name}\n`;
    content += `Email   : ${user.email}\n`;
    content += `Unique ID: ${user.unique_id || `BH${user.id.substring(0, 6).toUpperCase()}`}\n`;
    content += `Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}\n\n`;
    content += `══════════════════════════════════════════\n`;
    content += `              💰 BALANCES\n`;
    content += `══════════════════════════════════════════\n`;
    content += `BH Coins  : ${diamond?.bh_coin_balance || 0} 🪙\n`;
    content += `Diamonds  : ${diamond?.diamond_balance || 0} 💎\n\n`;
    content += `══════════════════════════════════════════\n`;
    content += `           📋 TRANSACTION HISTORY\n`;
    content += `══════════════════════════════════════════\n\n`;
    const txs = diamond?.transactions || [];
    if (txs.length === 0) {
      content += `No transactions found.\n`;
    } else {
      txs.forEach((tx, i) => {
        content += `[${i+1}] ${tx.type} | ${tx.coin_type} | ${tx.amount > 0 ? '+' : ''}${tx.amount}\n`;
        content += `    Reason : ${tx.description || 'N/A'}\n`;
        content += `    Time   : ${tx.timestamp ? format(new Date(tx.timestamp), 'dd MMM yyyy, hh:mm a') : 'N/A'}\n\n`;
      });
    }
    content += `══════════════════════════════════════════\n`;
    content += `        Total Transactions: ${txs.length}\n`;
    content += `══════════════════════════════════════════\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CoinReport_${user.ign || user.full_name}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const setWalletBalance = async (coinType, newBalance) => {
    if (!selectedUser || newBalance < 0) return;
    setSendingCoins(true);
    try {
      const now = new Date().toISOString();
      const newBal = parseInt(newBalance) || 0;
      if (userDiamond) {
        const updateData = coinType === "bh"
          ? {
              bh_coin_balance: newBal,
              transactions: [...(userDiamond.transactions || []), {
                type: "Win", coin_type: "BH Coin", amount: newBal - (userDiamond.bh_coin_balance || 0),
                description: `Admin set BH Coin balance to ${newBal}`, timestamp: now
              }]
            }
          : {
              diamond_balance: newBal,
              transactions: [...(userDiamond.transactions || []), {
                type: "Diamond Earned", coin_type: "Diamond", amount: newBal - (userDiamond.diamond_balance || 0),
                description: `Admin set Diamond balance to ${newBal}`, timestamp: now
              }]
            };
        await Diamond.update(userDiamond.id, updateData);
      } else {
        await Diamond.create({
          user_id: selectedUser.id,
          user_ign: selectedUser.ign || selectedUser.full_name,
          bh_coin_balance: coinType === "bh" ? newBal : 0,
          diamond_balance: coinType === "diamond" ? newBal : 0,
          transactions: [{
            type: coinType === "bh" ? "Win" : "Diamond Earned",
            coin_type: coinType === "bh" ? "BH Coin" : "Diamond",
            amount: newBal,
            description: `Admin set balance to ${newBal}`, timestamp: now
          }]
        });
      }
      alert(`✅ Balance updated to ${newBal}`);
      await selectUser(selectedUser);
    } catch (e) {
      alert("Failed to update balance");
    }
    setSendingCoins(false);
  };

  const downloadUsersPDF = () => {
    let content = `═══════════════════════════════════════════════\n`;
    content += `            🏆 BATTLEHUB FF 🏆\n`;
    content += `       ALL USERS - COMPLETE DATABASE\n`;
    content += `═══════════════════════════════════════════════\n\n`;
    content += `Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}\n`;
    content += `Total Registered Users: ${users.length}\n`;
    content += `\n═══════════════════════════════════════════════\n\n`;
    
    users.forEach((u, index) => {
      const uniqueId = u.unique_id || `BH${u.id.substring(0, 6).toUpperCase()}`;
      const refCode = u.referral_code || u.id.substring(0, 8).toUpperCase();
      
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      content += `                USER #${index + 1}\n`;
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      content += `📋 PERSONAL INFORMATION:\n`;
      content += `  • Unique ID         : ${uniqueId}\n`;
      content += `  • Full Name         : ${u.full_name || 'N/A'}\n`;
      content += `  • In-Game Name (IGN): ${u.ign || 'Not Set'}\n`;
      content += `  • Game UID          : ${u.game_uid || 'Not Set'}\n`;
      content += `  • Email Address     : ${u.email}\n`;
      content += `  • Mobile Number     : ${u.mobile_number || u.phone || 'Not Provided'}\n`;
      content += `  • Account Role      : ${(u.role || 'user').toUpperCase()}\n`;
      content += `  • Player Rank       : ${u.rank || 'Unranked'}\n\n`;
      
      content += `🎮 GAMING STATISTICS:\n`;
      content += `  • Total Tournaments : ${u.total_tournaments || u.total_matches || 0}\n`;
      content += `  • Total Victories   : ${u.total_wins || 0}\n`;
      content += `  • Total Eliminations: ${u.total_kills || 0}\n`;
      content += `  • Win Rate          : ${u.total_tournaments > 0 ? Math.round((u.total_wins / u.total_tournaments) * 100) : 0}%\n\n`;
      
      content += `💰 WALLET & EARNINGS:\n`;
      content += `  • BH Coins Balance  : ${u.coins_balance || 0} 🪙\n`;
      content += `  • Total Earnings    : ₹${u.total_earnings || 0}\n\n`;
      
      content += `📅 ACCOUNT DETAILS:\n`;
      content += `  • Registration Date : ${format(new Date(u.created_date), 'dd MMM yyyy')}\n`;
      content += `  • Account Age       : ${Math.floor((Date.now() - new Date(u.created_date).getTime()) / (1000 * 60 * 60 * 24))} days\n`;
      content += `  • Referral Code     : ${refCode}\n`;
      content += `  • Referred By User  : ${u.referred_by || 'Direct Signup'}\n`;
      content += `  • Account Status    : ${u.is_banned ? '🚫 BANNED' : '✅ Active'}\n`;
      
      if (u.is_banned) {
        content += `  • Ban Date          : ${u.banned_at ? format(new Date(u.banned_at), 'dd MMM yyyy') : 'N/A'}\n`;
        content += `  • Ban Reason        : ${u.ban_reason || 'No reason provided'}\n`;
      }
      content += `\n`;
    });
    
    content += `\n═══════════════════════════════════════════════\n`;
    content += `         THANK YOU FOR BEING A PART OF\n`;
    content += `              BATTLEHUB FF COMMUNITY\n`;
    content += `═══════════════════════════════════════════════\n`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BattleHub_AllUsers_${format(new Date(), 'yyyy-MM-dd_HHmm')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('✅ All users data downloaded successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">User Management</h2>
          <Badge className="bg-cyan-500/20 text-cyan-400">{users.length}</Badge>
        </div>
        <Button
          onClick={downloadUsersPDF}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Download All Users PDF
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, IGN, email or Unique ID..."
          className="bg-gray-800 border-gray-700 text-white pl-10"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">All Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto space-y-2">
            {filteredUsers.length > 100 && (
              <div className="text-xs text-gray-400 bg-gray-700/30 rounded-lg p-2 text-center mb-2">
                Showing 100 of {filteredUsers.length} users. Use search to narrow results.
              </div>
            )}
            {filteredUsers.slice(0, 100).map((u) => (
              <div
                key={u.id}
                onClick={() => selectUser(u)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUser?.id === u.id 
                    ? 'bg-cyan-500/20 border border-cyan-500/50' 
                    : 'bg-gray-700/50 hover:bg-gray-700'
                }`}
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-cyan-600 text-white">
                    {u.ign?.[0]?.toUpperCase() || u.full_name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{u.ign || u.full_name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-cyan-400 font-mono">{u.unique_id || `BH${u.id.substring(0, 6).toUpperCase()}`}</p>
                    {u.ign && (
                      <Badge className="bg-purple-500/20 text-purple-400 text-[9px]">
                        <Gamepad2 className="w-2 h-2 mr-1" />
                        {u.ign}
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge className="bg-gray-600 text-gray-300 text-[10px]">
                  {u.role || 'user'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Selected User Details */}
        {selectedUser ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                User Details
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="bg-gray-900 w-full rounded-none border-b border-gray-700">
                <TabsTrigger value="details" className="flex-1">Details & Actions</TabsTrigger>
                <TabsTrigger value="performance" className="flex-1">📊 Performance</TabsTrigger>
              </TabsList>
              <TabsContent value="performance" className="p-4 max-h-[600px] overflow-y-auto">
                <UserPerformanceDashboard user={selectedUser} userRegistrations={userRegistrations} userDiamond={userDiamond} />
              </TabsContent>
              <TabsContent value="details" className="p-4">
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {/* User Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback className="bg-cyan-600 text-white text-xl">
                    {selectedUser.ign?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xl font-bold text-white">{selectedUser.ign || selectedUser.full_name}</p>
                  <p className="text-sm text-gray-400">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-cyan-500/20 text-cyan-400 font-mono">
                      {selectedUser.unique_id || `BH${selectedUser.id.substring(0, 6).toUpperCase()}`}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyId(selectedUser.unique_id || `BH${selectedUser.id.substring(0, 6).toUpperCase()}`)}
                      className="h-6 px-2"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-yellow-400">{userDiamond?.bh_coin_balance || 0}</p>
                  <p className="text-xs text-gray-500">🪙 BH Coins</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-purple-400">{userDiamond?.diamond_balance || 0}</p>
                  <p className="text-xs text-gray-500">💎 Diamonds</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-cyan-400">{selectedUser.total_wins || 0}</p>
                  <p className="text-xs text-gray-500">Wins</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-red-400">{selectedUser.total_kills || 0}</p>
                  <p className="text-xs text-gray-500">Kills</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center col-span-2">
                  <p className="text-xl font-bold text-purple-400">{userRegistrations.length}</p>
                  <p className="text-xs text-gray-500">Tournaments</p>
                </div>
              </div>

              {/* Transaction History */}
              {userDiamond?.transactions && userDiamond.transactions.length > 0 && (
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-3">
                    <Coins className="w-4 h-4" />
                    Recent Transactions
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userDiamond.transactions.slice(-10).reverse().map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-gray-800/50 p-2 rounded">
                        <div>
                          <p className="text-white text-xs">{tx.description}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(tx.timestamp), 'dd MMM, hh:mm a')}
                          </p>
                        </div>
                        <Badge className={tx.type.includes('Win') || tx.type.includes('Earned') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {tx.type.includes('Win') || tx.type.includes('Earned') ? '+' : '-'}{tx.amount} {tx.coin_type === 'Diamond' ? '💎' : '🪙'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit Stats */}
              <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <Trophy className="w-4 h-4" />
                  Edit Player Stats
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-400 text-xs">Total Wins</Label>
                    <Input
                      type="number"
                      defaultValue={selectedUser.total_wins || 0}
                      onChange={(e) => setSelectedUser({...selectedUser, _newWins: parseInt(e.target.value) || 0})}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Total Kills</Label>
                    <Input
                      type="number"
                      defaultValue={selectedUser.total_kills || 0}
                      onChange={(e) => setSelectedUser({...selectedUser, _newKills: parseInt(e.target.value) || 0})}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      await User.update(selectedUser.id, {
                        total_wins: selectedUser._newWins ?? selectedUser.total_wins ?? 0,
                        total_kills: selectedUser._newKills ?? selectedUser.total_kills ?? 0
                      });
                      alert("Stats updated!");
                      selectUser(selectedUser);
                    } catch (e) {
                      alert("Failed to update");
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Save Stats
                </Button>
              </div>

              {/* Send Message Template & WhatsApp */}
              <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <MessageCircle className="w-4 h-4" />
                    Send WhatsApp Message
                  </div>
                </div>
                
                <div>
                  <Label className="text-gray-300 text-sm mb-2">Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={(v) => {
                    setSelectedTemplate(v);
                    const template = templates.find(t => t.id === v);
                    if (template) {
                      // Replace variables with user data
                      let message = template.message_template;
                      message = message.replace(/{name}/g, selectedUser.ign || selectedUser.full_name);
                      message = message.replace(/{email}/g, selectedUser.email);
                      message = message.replace(/{unique_id}/g, selectedUser.unique_id || `BH${selectedUser.id.substring(0, 6).toUpperCase()}`);
                      setNotifMessage(message);
                    }
                  }}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 max-h-60">
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-white">
                          {t.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Message preview..."
                  className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                  rows={6}
                />

                {selectedUser.mobile_number || selectedUser.phone ? (
                  <a 
                    href={`https://wa.me/${(selectedUser.mobile_number || selectedUser.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(notifMessage)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full bg-green-600 hover:bg-green-700" disabled={!notifMessage}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send via WhatsApp
                    </Button>
                  </a>
                ) : (
                  <Button className="w-full bg-gray-700 cursor-not-allowed" disabled>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    No Phone Number
                  </Button>
                )}
              </div>

              {/* Send In-App Notification */}
              <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-purple-400 font-semibold">
                  <Bell className="w-4 h-4" />
                  Send In-App Notification
                </div>
                <Input
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Notification title"
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <Textarea
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Notification message..."
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={2}
                />
                <Button
                  onClick={sendNotification}
                  disabled={sendingNotif || !notifTitle || !notifMessage}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingNotif ? "Sending..." : "Send Notification"}
                </Button>
              </div>

              {/* Manage Currency */}
              <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-yellow-400 font-semibold">
                    <Coins className="w-4 h-4" />
                    Manage Currency
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      {userDiamond?.bh_coin_balance || 0} 🪙
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-400">
                      {userDiamond?.diamond_balance || 0} 💎
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => downloadUserCoinReport(selectedUser, userDiamond)}
                      className="h-6 px-2 bg-blue-600/80 hover:bg-blue-600 text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" /> Coin Report
                    </Button>
                  </div>
                </div>
                
                {/* ADD coins */}
                <div className="border-t border-yellow-500/20 pt-3 space-y-2">
                  <Label className="text-gray-400 text-xs font-semibold">➕ Add Currency</Label>
                  <Input
                    type="number"
                    value={coinAmount}
                    onChange={(e) => setCoinAmount(parseInt(e.target.value) || 0)}
                    placeholder="Amount to add"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <Input
                    value={coinReason}
                    onChange={(e) => setCoinReason(e.target.value)}
                    placeholder="Reason"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => sendCoins("bh")}
                      disabled={sendingCoins || coinAmount <= 0}
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                      <Coins className="w-4 h-4 mr-1" />
                      {sendingCoins ? "Sending..." : `Add 🪙`}
                    </Button>
                    <Button
                      onClick={() => sendCoins("diamond")}
                      disabled={sendingCoins || coinAmount <= 0}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <Gem className="w-4 h-4 mr-1" />
                      {sendingCoins ? "Sending..." : `Add 💎`}
                    </Button>
                  </div>
                </div>

                {/* SET balance directly */}
                <div className="border-t border-yellow-500/20 pt-3 space-y-2">
                  <Label className="text-gray-400 text-xs font-semibold">✏️ Set Balance Directly</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-gray-500 text-xs">New 🪙 BH Coins</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          id="set-bh-input"
                          defaultValue={userDiamond?.bh_coin_balance || 0}
                          className="bg-gray-800 border-gray-700 text-white text-sm"
                          min="0"
                        />
                        <Button
                          size="sm"
                          disabled={sendingCoins}
                          onClick={() => {
                            const val = document.getElementById('set-bh-input')?.value;
                            setWalletBalance("bh", parseInt(val) || 0);
                          }}
                          className="bg-yellow-700 hover:bg-yellow-600 px-2 shrink-0"
                        >Set</Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-gray-500 text-xs">New 💎 Diamonds</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          id="set-diamond-input"
                          defaultValue={userDiamond?.diamond_balance || 0}
                          className="bg-gray-800 border-gray-700 text-white text-sm"
                          min="0"
                        />
                        <Button
                          size="sm"
                          disabled={sendingCoins}
                          onClick={() => {
                            const val = document.getElementById('set-diamond-input')?.value;
                            setWalletBalance("diamond", parseInt(val) || 0);
                          }}
                          className="bg-purple-700 hover:bg-purple-600 px-2 shrink-0"
                        >Set</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ban User */}
              <div className={`p-4 rounded-lg space-y-3 ${selectedUser.is_banned ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
                <div className="flex items-center gap-2 font-semibold" style={{ color: selectedUser.is_banned ? '#4ade80' : '#f87171' }}>
                  {selectedUser.is_banned ? <Shield className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  {selectedUser.is_banned ? 'User is Banned' : 'Ban User'}
                </div>
                
                {selectedUser.is_banned ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">
                      Reason: <span className="text-red-400">{selectedUser.ban_reason}</span>
                    </p>
                    <Button
                      onClick={unbanUser}
                      disabled={banning}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {banning ? "Processing..." : "Unban User"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Ban reason (e.g., Cheating, Fraud)"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Button
                      onClick={banUser}
                      disabled={banning || !banReason}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      {banning ? "Banning..." : "Ban User Permanently"}
                    </Button>
                    <p className="text-xs text-red-400">⚠️ User won't be able to login again with this email</p>
                  </>
                )}
              </div>

              {/* Recent Registrations */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-purple-400 font-semibold mb-3">
                  <Trophy className="w-4 h-4" />
                  Recent Registrations ({userRegistrations.length})
                </div>
                {userRegistrations.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-2">No registrations</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userRegistrations.map((reg) => (
                      <div key={reg.id} className="flex items-center justify-between text-sm bg-gray-800/50 p-2 rounded">
                        <div>
                          <p className="text-white">{reg.tournament_title}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(reg.created_date), 'dd MMM yyyy, hh:mm a')}
                          </p>
                        </div>
                        <Badge className={
                          reg.status === "Registered" ? "bg-green-500/20 text-green-400" :
                          "bg-gray-500/20 text-gray-400"
                        }>
                          {reg.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </TabsContent>
            </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="flex items-center justify-center h-[400px]">
              <div className="text-center text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a user to view details</p>
                <p className="text-sm">and send notifications or coins</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}