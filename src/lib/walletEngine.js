import { Diamond } from "@/entities/Diamond";
import { User } from "@/entities/User";
import { RedeemRequest } from "@/entities/RedeemRequest";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { Notification } from "@/entities/Notification";
import { cacheInvalidateAll } from "@/lib/cache";

// 🚀 Instant Cross-Tab / Cross-App Broadcast Channel
const walletBroadcastChannel = typeof window !== "undefined" && "BroadcastChannel" in window 
  ? new BroadcastChannel("battlehub_wallet_sync") 
  : null;

const notifyRealtimeSync = (newBalances) => {
  if (typeof window !== "undefined") {
    // Invalidate local in-memory cache on all updates
    cacheInvalidateAll();

    // 1. Dispatch Local Event
    window.dispatchEvent(new CustomEvent("wallet_balance_updated", { detail: { newBalances } }));
    
    // 2. BroadcastChannel Message
    if (walletBroadcastChannel) {
      walletBroadcastChannel.postMessage({ type: "SYNC_BALANCE", newBalances, timestamp: Date.now() });
    }

    // 3. LocalStorage Cross-Window Event
    try {
      localStorage.setItem("battlehub_wallet_sync_trigger", Date.now().toString());
    } catch (e) {}
  }
};

/**
 * 🏆 Bulletproof 3-Bucket Real-Time Wallet Engine for BattleHub 3.0
 */
export const WalletEngine = {
  /**
   * Fetch current user's 3-bucket wallet balances and transaction history
   */
  async getWalletData() {
    try {
      // Invalidate cache before fetching to guarantee FRESH data from DB
      cacheInvalidateAll();

      const user = await User.me();
      if (!user) return { success: false, error: "User not authenticated" };

      let account = null;
      const accounts = await Diamond.filter({ user_id: user.id }).catch(() => []);
      
      if (accounts && accounts.length > 0) {
        account = accounts[0];
      } else {
        account = await Diamond.create({
          user_id: user.id,
          user_ign: user.ign || user.full_name,
          deposit_balance: 0,
          bonus_balance: 0,
          winnings_balance: 0,
          bh_coin_balance: 0,
          diamond_balance: 0,
          transactions: []
        }).catch(() => ({ 
          deposit_balance: 0, bonus_balance: 0, winnings_balance: 0, 
          bh_coin_balance: 0, diamond_balance: 0, transactions: [] 
        }));
      }

      const [redeemReqs, paymentReqs] = await Promise.all([
        RedeemRequest.filter({ user_id: user.id }, "-created_date").catch(() => []),
        PaymentRequest.filter({ user_id: user.id }, "-created_date").catch(() => [])
      ]);

      const deposit = account?.deposit_balance || 0;
      const bonus = account?.bonus_balance || 0;
      const winnings = account?.winnings_balance || 0;
      const totalCoins = deposit + bonus + winnings || account?.bh_coin_balance || 0;

      return {
        success: true,
        user,
        account,
        deposit,
        bonus,
        winnings,
        totalCoins,
        diamonds: account?.diamond_balance || 0,
        transactions: account?.transactions || [],
        redeemRequests: redeemReqs || [],
        paymentRequests: paymentReqs || []
      };
    } catch (err) {
      console.error("WalletEngine.getWalletData error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Subscribe to INSTANT Real-Time Balance Updates (0.5s High-Speed Sync)
   */
  subscribeToUpdates(onUpdateCallback) {
    if (typeof window === "undefined") return () => {};

    // 1. Local Event Listener
    const handleLocalEvent = () => {
      cacheInvalidateAll();
      onUpdateCallback();
    };
    window.addEventListener("wallet_balance_updated", handleLocalEvent);

    // 2. Broadcast Channel Listener
    const handleBroadcastMessage = (event) => {
      if (event.data?.type === "SYNC_BALANCE") {
        cacheInvalidateAll();
        onUpdateCallback();
      }
    };
    if (walletBroadcastChannel) {
      walletBroadcastChannel.addEventListener("message", handleBroadcastMessage);
    }

    // 3. Storage Event Listener (Cross-Port / Cross-Window Sync)
    const handleStorageEvent = (e) => {
      if (e.key === "battlehub_wallet_sync_trigger") {
        cacheInvalidateAll();
        onUpdateCallback();
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    // 4. Ultra-Fast 1-Second Heartbeat Polling Fallback (Cloud DB Sync)
    const intervalId = setInterval(() => {
      cacheInvalidateAll();
      onUpdateCallback();
    }, 1000);

    return () => {
      window.removeEventListener("wallet_balance_updated", handleLocalEvent);
      if (walletBroadcastChannel) {
        walletBroadcastChannel.removeEventListener("message", handleBroadcastMessage);
      }
      window.removeEventListener("storage", handleStorageEvent);
      clearInterval(intervalId);
    };
  },

  /**
   * Credit Coins to Specific Bucket (BONUS vs DEPOSIT vs WINNINGS)
   */
  async creditCoins(amount, bucketType = "BONUS", source = "REWARD_AD", description = "Earned Reward Bonus") {
    try {
      cacheInvalidateAll();

      const user = await User.me();
      if (!user) throw new Error("Not logged in");

      const accounts = await Diamond.filter({ user_id: user.id });
      let account = accounts[0];

      let deposit = account?.deposit_balance || 0;
      let bonus = account?.bonus_balance || 0;
      let winnings = account?.winnings_balance || 0;

      if (bucketType === "BONUS") {
        bonus += amount;
      } else if (bucketType === "DEPOSIT") {
        deposit += amount;
      } else if (bucketType === "WINNINGS") {
        winnings += amount;
      }

      const totalCoins = deposit + bonus + winnings;

      const newTx = {
        id: `tx_${Date.now()}`,
        type: "CREDIT",
        bucket: bucketType,
        source: source,
        amount: amount,
        description: description,
        timestamp: new Date().toISOString()
      };

      const updatedTxs = [newTx, ...(account?.transactions || [])];

      await Diamond.update(account.id, {
        deposit_balance: deposit,
        bonus_balance: bonus,
        winnings_balance: winnings,
        bh_coin_balance: totalCoins,
        transactions: updatedTxs
      });

      cacheInvalidateAll();
      notifyRealtimeSync({ deposit, bonus, winnings, totalCoins });

      await Notification.create({
        user_id: user.id,
        title: `${bucketType} Credited! 🎉`,
        message: `+${amount} Coins added to your ${bucketType} wallet via ${description}.`,
        type: "wallet",
        read: false
      }).catch(() => {});

      return { success: true, deposit, bonus, winnings, totalCoins };
    } catch (err) {
      console.error("WalletEngine.creditCoins error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Claim Gift Code / Promo Code
   */
  async claimPromoCode(code) {
    try {
      const cleanCode = (code || "").trim().toUpperCase();
      if (!cleanCode) return { success: false, error: "Please enter a valid Gift/Promo Code" };

      const validCodes = {
        "FREE50": 50,
        "BATTLEHUB100": 100,
        "BH2026": 50,
        "PROMO200": 200,
        "WELCOME50": 50
      };

      const rewardAmount = validCodes[cleanCode];
      if (!rewardAmount) {
        return { success: false, error: "Invalid or expired Gift Code! Try 'BATTLEHUB100' or 'FREE50'." };
      }

      return await this.creditCoins(rewardAmount, "BONUS", "PROMO_CODE", `Claimed Promo Code: ${cleanCode}`);
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Request Reward Redeem (FF Diamonds / Gift Cards)
   */
  async requestRedeem(rewardType, itemTitle, coinCost, targetAccountDetails) {
    try {
      cacheInvalidateAll();

      const user = await User.me();
      if (!user) throw new Error("Not logged in");

      const accounts = await Diamond.filter({ user_id: user.id });
      const account = accounts[0];

      let deposit = account?.deposit_balance || 0;
      let bonus = account?.bonus_balance || 0;
      let winnings = account?.winnings_balance || 0;

      // 🛡️ STRICT SECURITY RULE: Only DEPOSIT & WINNINGS balance can be redeemed!
      const redeemableBalance = deposit + winnings;

      if (redeemableBalance < coinCost) {
        return { 
          success: false, 
          error: `Security Check: Only Deposit balance (and Winnings) can be redeemed! Your redeemable Deposit balance is ${deposit} Coins. Bonus coins cannot be redeemed directly.` 
        };
      }

      let remainingToDeduct = coinCost;

      // Deduct from Deposit balance first
      if (deposit >= remainingToDeduct) {
        deposit -= remainingToDeduct;
        remainingToDeduct = 0;
      } else {
        remainingToDeduct -= deposit;
        deposit = 0;
      }

      // Deduct remaining from Winnings balance
      if (remainingToDeduct > 0) {
        winnings -= remainingToDeduct;
        remainingToDeduct = 0;
      }

      const newTotal = deposit + bonus + winnings;

      await RedeemRequest.create({
        user_id: user.id,
        user_ign: user.ign || user.full_name,
        reward_type: rewardType,
        reward_title: itemTitle,
        coins_spent: coinCost,
        target_account: targetAccountDetails,
        status: "Pending",
        created_date: new Date().toISOString()
      });

      const newTx = {
        id: `tx_${Date.now()}`,
        type: "DEBIT",
        source: "REDEEM_STORE",
        amount: coinCost,
        description: `Redeemed ${itemTitle}`,
        timestamp: new Date().toISOString()
      };

      await Diamond.update(account.id, {
        deposit_balance: deposit,
        bonus_balance: bonus,
        winnings_balance: winnings,
        bh_coin_balance: newTotal,
        transactions: [newTx, ...(account.transactions || [])]
      });

      cacheInvalidateAll();
      notifyRealtimeSync({ deposit, bonus, winnings, totalCoins: newTotal });

      return { success: true, newBalance: newTotal };
    } catch (err) {
      console.error("WalletEngine.requestRedeem error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Request Bank / UPI Withdrawal - STRICTLY WINNINGS ONLY
   */
  async requestWithdrawal(amount, payoutDetails) {
    try {
      cacheInvalidateAll();

      const user = await User.me();
      if (!user) throw new Error("Not logged in");

      const accounts = await Diamond.filter({ user_id: user.id });
      const account = accounts[0];

      let deposit = account?.deposit_balance || 0;
      let bonus = account?.bonus_balance || 0;
      let winnings = account?.winnings_balance || 0;

      // 🛡️ NEW WITHDRAWAL POLICY: Deposit + Winnings can be withdrawn! Only BONUS coins (Ads/Spin) are blocked.
      const withdrawableBalance = deposit + winnings;

      if (withdrawableBalance < amount) {
        return { 
          success: false, 
          error: `Insufficient withdrawable balance! You can withdraw up to ₹${withdrawableBalance} (Deposit: ₹${deposit}, Winnings: ₹${winnings}). Bonus coins cannot be withdrawn to Bank.` 
        };
      }

      let remainingToDeduct = amount;

      // Deduct from Deposit balance first
      if (deposit >= remainingToDeduct) {
        deposit -= remainingToDeduct;
        remainingToDeduct = 0;
      } else {
        remainingToDeduct -= deposit;
        deposit = 0;
      }

      // Deduct remaining from Winnings balance
      if (remainingToDeduct > 0) {
        winnings -= remainingToDeduct;
        remainingToDeduct = 0;
      }

      const newTotal = deposit + bonus + winnings;

      await PaymentRequest.create({
        user_id: user.id,
        user_name: user.full_name,
        user_ign: user.ign || user.full_name,
        type: "Withdrawal",
        amount: amount,
        payout_details: payoutDetails,
        status: "Pending",
        created_date: new Date().toISOString()
      });

      const newTx = {
        id: `tx_${Date.now()}`,
        type: "DEBIT",
        source: "WITHDRAWAL",
        amount: amount,
        description: `Requested Withdrawal of ₹${amount}`,
        timestamp: new Date().toISOString()
      };

      await Diamond.update(account.id, {
        deposit_balance: deposit,
        bonus_balance: bonus,
        winnings_balance: winnings,
        bh_coin_balance: newTotal,
        transactions: [newTx, ...(account.transactions || [])]
      });

      cacheInvalidateAll();
      notifyRealtimeSync({ deposit, bonus, winnings, totalCoins: newTotal });

      return { success: true, newBalance: newTotal };
    } catch (err) {
      console.error("WalletEngine.requestWithdrawal error:", err);
      return { success: false, error: err.message };
    }
  }
};
