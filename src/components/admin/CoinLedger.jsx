import React, { useState, useEffect } from "react";
import { Diamond } from "@/entities/Diamond";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Search, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

export default function CoinLedger() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stats, setStats] = useState({ totalCoinsIn: 0, totalCoinsOut: 0, totalDiamonds: 0 });

  useEffect(() => {
    loadLedger();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [search, typeFilter, allTransactions]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      // Load all diamond accounts
      let allAccounts = [];
      let skip = 0;
      while (true) {
        const batch = await Diamond.list("-updated_date", 500, skip).catch(() => []);
        if (!batch || batch.length === 0) break;
        allAccounts = [...allAccounts, ...batch];
        if (batch.length < 500) break;
        skip += 500;
      }

      // Flatten all transactions with user info
      const txns = [];
      let totalIn = 0, totalOut = 0, totalDiam = 0;

      for (const account of allAccounts) {
        const txList = account.transactions || [];
        for (const tx of txList) {
          const isCredit = ["Win", "Diamond Earned", "Task Reward", "Purchase"].includes(tx.type);
          if (isCredit && tx.coin_type === "BH Coin") totalIn += tx.amount || 0;
          if (!isCredit && tx.coin_type === "BH Coin") totalOut += tx.amount || 0;
          if (tx.coin_type === "Diamond") totalDiam += tx.amount || 0;

          txns.push({
            ...tx,
            user_id: account.user_id,
            user_ign: account.user_ign,
            bh_coin_balance: account.bh_coin_balance,
            diamond_balance: account.diamond_balance,
            isCredit
          });
        }
      }

      // Sort by timestamp desc
      txns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setAllTransactions(txns);
      setStats({ totalCoinsIn: totalIn, totalCoinsOut: totalOut, totalDiamonds: totalDiam });
    } catch (error) {
      console.error("Error loading ledger:", error);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = allTransactions;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.user_ign?.toLowerCase().includes(s) ||
        tx.user_id?.toLowerCase().includes(s) ||
        tx.description?.toLowerCase().includes(s) ||
        tx.type?.toLowerCase().includes(s)
      );
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter(tx => tx.coin_type === typeFilter || tx.type === typeFilter);
    }
    setFilteredTransactions(filtered);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Coins className="w-6 h-6 text-yellow-400" />
        <h2 className="text-xl font-bold text-white">Coin Ledger</h2>
        <Badge className="bg-yellow-500/20 text-yellow-400">{allTransactions.length} transactions</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-900/30 border-green-500/30">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-400">+{stats.totalCoinsIn.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Total BH Coins IN</p>
          </CardContent>
        </Card>
        <Card className="bg-red-900/30 border-red-500/30">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 text-red-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-400">-{stats.totalCoinsOut.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Total BH Coins OUT</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-900/30 border-purple-500/30">
          <CardContent className="p-4 text-center">
            <ArrowUpDown className="w-6 h-6 text-purple-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-400">{stats.totalDiamonds.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Total Diamonds</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by IGN, user ID, type..." className="bg-gray-800 border-gray-700 text-white pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="BH Coin">BH Coin Only</SelectItem>
            <SelectItem value="Diamond">Diamond Only</SelectItem>
            <SelectItem value="Purchase">Purchase</SelectItem>
            <SelectItem value="Tournament Entry">Tournament Entry</SelectItem>
            <SelectItem value="Win">Win Reward</SelectItem>
            <SelectItem value="Task Reward">Task Reward</SelectItem>
            <SelectItem value="Redeem">Redeem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">All Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[600px] overflow-y-auto space-y-2 p-3">
          {filteredTransactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transactions found</p>
          ) : (
            filteredTransactions.map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">{tx.user_ign || tx.user_id?.substring(0, 10)}</span>
                    <Badge className={tx.isCredit ? "bg-green-500/20 text-green-400 text-[9px]" : "bg-red-500/20 text-red-400 text-[9px]"}>
                      {tx.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{tx.description}</p>
                  {tx.timestamp && (
                    <p className="text-xs text-gray-600">{format(new Date(tx.timestamp), 'dd MMM yyyy, hh:mm a')}</p>
                  )}
                </div>
                <div className="text-right ml-2">
                  <p className={`font-bold text-base ${tx.isCredit ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.isCredit ? '+' : '-'}{tx.amount} {tx.coin_type === 'Diamond' ? '💎' : '🪙'}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}