import { Diamond } from "@/entities/Diamond";
import { User } from "@/entities/User";
import { RedeemRequest } from "@/entities/RedeemRequest";
import { PaymentRequest } from "@/entities/PaymentRequest";
import { Notification } from "@/entities/Notification";
import { cacheInvalidateAll } from "@/lib/cache";
import { auth } from "@/api/firebaseClient";

// ═══════════════════════════════════════════════════════════
// 🔒 BattleHub Wallet Engine v2.0 — UPI-Grade Security
// ALL balance mutations go through the server-side API.
// Client-side code is READ-ONLY for wallet data.
// ═══════════════════════════════════════════════════════════

// 🔒 Server API URL
const WALLET_API_URL = import.meta.env.VITE_WALLET_API_URL || 'https://battlehub-ten.vercel.app/api/wallet';

// Helper: Make authenticated API call to wallet server
async function secureWalletApiCall(action, payload = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not logged in");
  
  const idToken = await currentUser.getIdToken(true);
  
  const response = await fetch(WALLET_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ action, ...payload })
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.message || `Wallet operation failed (${response.status})`);
  }
  
  return data;
}

// 🚀 Cross-Tab Broadcast Channel
const walletBroadcastChannel = typeof window !== "undefined" && "BroadcastChannel" in window 
  ? new BroadcastChannel("battlehub_wallet_sync") 
  : null;

const notifyRealtimeSync = (newBalances) => {
  if (typeof window !== "undefined") {
    cacheInvalidateAll();
    window.dispatchEvent(new CustomEvent("wallet_balance_updated", { detail: { newBalances } }));
    window.dispatchEvent(new CustomEvent("wallet-balance-updated", { detail: { newBalances } }));
    
    if (walletBroadcastChannel) {
      walletBroadcastChannel.postMessage({ type: "SYNC_BALANCE", newBalances, timestamp: Date.now() });
    }

    try {
      localStorage.setItem("battlehub_wallet_sync_trigger", Date.now().toString());
    } catch (e) {}
  }
};

/**
 * 🏦 Secure 3-Bucket Wallet Engine for BattleHub 3.0
 * All write operations go through secure server API.
 * Client-side is READ-ONLY.
 */
export const WalletEngine = {
  /**
   * Fetch current user's 3-bucket wallet balances and transaction history
   * This is the ONLY client-side Firestore read — safe because rules allow reads.
   */
  async getWalletData() {
    try {
      cacheInvalidateAll();

      const user = await User.me();
      if (!user) return { success: false, error: "User not authenticated" };

      let account = null;
      const accounts = await Diamond.filter({ user_id: user.id }).catch(() => []);
      
      if (accounts && accounts.length > 0) {
        accounts.sort((a, b) => Number(b.bh_coin_balance || 0) - Number(a.bh_coin_balance || 0));
        account = accounts[0];
      } else {
        // Don't create wallet from client! Server will create it on first transaction.
        account = { 
          deposit_balance: 0, bonus_balance: 0, winnings_balance: 0, 
          bh_coin_balance: 0, diamond_balance: 0, transactions: [] 
        };
      }

      const [redeemReqs, paymentReqs] = await Promise.all([
        RedeemRequest.filter({ user_id: user.id }, "-created_date").catch(() => []),
        PaymentRequest.filter({ user_id: user.id }, "-created_date").catch(() => [])
      ]);

      const deposit = Number(account?.deposit_balance || 0);
      let bonus = Number(account?.bonus_balance || 0);
      const winnings = Number(account?.winnings_balance || 0);
      const rawTotal = Number(account?.bh_coin_balance || 0);

      if (rawTotal > (deposit + bonus + winnings)) {
        bonus = rawTotal - deposit - winnings;
      }
      const totalCoins = deposit + bonus + winnings;

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
   * Subscribe to Real-Time Balance Updates
   */
  subscribeToUpdates(onUpdateCallback) {
    if (typeof window === "undefined") return () => {};

    const handleLocalEvent = () => {
      cacheInvalidateAll();
      onUpdateCallback();
    };
    window.addEventListener("wallet_balance_updated", handleLocalEvent);
    window.addEventListener("wallet-balance-updated", handleLocalEvent);

    const handleBroadcastMessage = (event) => {
      if (event.data?.type === "SYNC_BALANCE") {
        cacheInvalidateAll();
        onUpdateCallback();
      }
    };
    if (walletBroadcastChannel) {
      walletBroadcastChannel.addEventListener("message", handleBroadcastMessage);
    }

    const handleStorageEvent = (e) => {
      if (e.key === "battlehub_wallet_sync_trigger") {
        cacheInvalidateAll();
        onUpdateCallback();
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    // Reduced polling from 1s to 5s since we have real-time onSnapshot in Layout.jsx
    const intervalId = setInterval(() => {
      cacheInvalidateAll();
      onUpdateCallback();
    }, 5000);

    return () => {
      window.removeEventListener("wallet_balance_updated", handleLocalEvent);
      window.removeEventListener("wallet-balance-updated", handleLocalEvent);
      if (walletBroadcastChannel) {
        walletBroadcastChannel.removeEventListener("message", handleBroadcastMessage);
      }
      window.removeEventListener("storage", handleStorageEvent);
      clearInterval(intervalId);
    };
  },

  /**
   * 🔒 Credit Coins — Server-Side API Call
   * Previously this directly wrote to Firestore from the client.
   * Now it calls the secure server API which validates and writes atomically.
   */
  async creditCoins(amount, bucketType = "BONUS", source = "REWARD_AD", description = "Earned Reward Bonus") {
    try {
      const result = await secureWalletApiCall('admin-credit', {
        targetUserId: auth.currentUser?.uid,
        amount,
        bucket: bucketType,
        reason: `${source}: ${description}`
      });

      notifyRealtimeSync({ totalCoins: result.newBalance });
      return { success: true, totalCoins: result.newBalance };
    } catch (err) {
      console.error("WalletEngine.creditCoins error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * 🔒 Claim Promo Code — Server-Side with Per-User Tracking
   * Previously hardcoded promo codes on client with zero claim tracking.
   * Now server validates, checks per-user claims, and credits atomically.
   */
  async claimPromoCode(code) {
    try {
      const cleanCode = (code || "").trim().toUpperCase();
      if (!cleanCode) return { success: false, error: "Please enter a valid Gift/Promo Code" };

      const result = await secureWalletApiCall('promo-claim', { code: cleanCode });
      
      notifyRealtimeSync({ totalCoins: result.newBalance });
      return { success: true, message: result.message, totalCoins: result.newBalance };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * 🔒 Claim Welcome Bonus
   */
  async claimWelcomeBonus(amount = 20) {
    try {
      const result = await secureWalletApiCall('claim-welcome-bonus', { amount });
      if (result.success) notifyRealtimeSync({ totalCoins: result.newBalance });
      return result;
    } catch (err) {
      console.error("WalletEngine.claimWelcomeBonus error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * 🔒 Claim Referral Bonus
   */
  async claimReferral(amount, friendCount) {
    try {
      const result = await secureWalletApiCall('claim-referral', { amount, friendCount });
      if (result.success) notifyRealtimeSync({ totalCoins: result.newBalance });
      return result;
    } catch (err) {
      console.error("WalletEngine.claimReferral error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * 🔒 Request Reward Redeem — Server-Side Atomic Deduction
   */
  async requestRedeem(rewardType, itemTitle, coinCost, targetAccountDetails) {
    try {
      const result = await secureWalletApiCall('redeem', {
        rewardType,
        itemTitle,
        coinCost,
        targetAccountDetails
      });

      notifyRealtimeSync({ totalCoins: result.newBalance });
      return { success: true, newBalance: result.newBalance };
    } catch (err) {
      console.error("WalletEngine.requestRedeem error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * 🔒 Request Bank / UPI Withdrawal — Server-Side Atomic
   */
  async requestWithdrawal(amount, payoutDetails) {
    try {
      const result = await secureWalletApiCall('withdraw', {
        amount,
        method: payoutDetails?.method || 'upi',
        upiId: payoutDetails?.upiId || payoutDetails?.upi_id,
        bankDetails: payoutDetails?.bankDetails || payoutDetails
      });

      notifyRealtimeSync({ totalCoins: result.newBalance });
      return { success: true, newBalance: result.newBalance };
    } catch (err) {
      console.error("WalletEngine.requestWithdrawal error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * 🔒 Tournament Join — Server-Side Atomic Fee Deduction
   * Ensures fee is deducted from ALL 3 buckets properly and registration
   * only succeeds if deduction succeeds.
   */
  async deductTournamentFee(tournamentId, tournamentTitle, entryFee, paymentMethod = 'BH Coin') {
    try {
      if (!entryFee || Number(entryFee) <= 0) {
        return { success: true, message: 'Free tournament', newBalance: null };
      }

      const result = await secureWalletApiCall('tournament-join', {
        tournamentId,
        tournamentTitle,
        entryFee: Number(entryFee),
        paymentMethod
      });

      notifyRealtimeSync({ totalCoins: result.newBalance });
      return { success: true, newBalance: result.newBalance };
    } catch (err) {
      console.error("WalletEngine.deductTournamentFee error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * 🔒 Admin Credit User (Server-Side)
   */
  async adminCreditUser(targetUserId, amount, bucket = "BONUS", reason = "Admin Credit") {
    try {
      const result = await secureWalletApiCall('admin-credit', {
        targetUserId, amount, bucket, reason
      });
      notifyRealtimeSync({ totalCoins: result.newBalance });
      return result;
    } catch (err) {
      console.error("WalletEngine.adminCreditUser error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * 🔒 Admin Set Balance (Server-Side)
   */
  async adminSetBalance(targetUserId, deposit, bonus, winnings, reason = "Admin Balance Overwrite") {
    try {
      const result = await secureWalletApiCall('admin-set-balance', {
        targetUserId, deposit, bonus, winnings, reason
      });
      notifyRealtimeSync({ totalCoins: result.newBalance });
      return result;
    } catch (err) {
      console.error("WalletEngine.adminSetBalance error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * 🔒 Admin Approve Payment (Server-Side)
   */
  async adminApprovePayment(paymentRequestId, targetUserId, amount, bucket = "DEPOSIT") {
    try {
      const result = await secureWalletApiCall('admin-approve-payment', {
        paymentRequestId, targetUserId, amount, bucket
      });
      notifyRealtimeSync({ totalCoins: result.newBalance });
      return result;
    } catch (err) {
      console.error("WalletEngine.adminApprovePayment error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * 🔒 Admin Award Tournament Prize (Server-Side)
   */
  async adminAwardTournamentPrize(targetUserId, amount, tournamentId, tournamentTitle) {
    try {
      const result = await secureWalletApiCall('tournament-prize', {
        targetUserId, amount, tournamentId, tournamentTitle
      });
      notifyRealtimeSync({ totalCoins: result.newBalance });
      return result;
    } catch (err) {
      console.error("WalletEngine.adminAwardTournamentPrize error:", err);
      return { success: false, error: err.message };
    }
  }
};
