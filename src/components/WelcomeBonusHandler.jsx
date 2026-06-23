import { useEffect, useState } from "react";
import { User } from "@/entities/User";
import { Diamond } from "@/entities/Diamond";
import { Referral } from "@/entities/Referral";
import { AppSettings } from "@/entities/AppSettings";

export default function WelcomeBonusHandler() {
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (!processed) {
      handleNewUser();
    }
  }, [processed]);

  const handleNewUser = async () => {
    try {
      const user = await User.me().catch(() => null);
      if (!user) return;

      // Check if already processed this session
      if (user.welcome_bonus_given) {
        // Still check for referral from URL
        await handleReferralFromURL(user);
        setProcessed(true);
        return;
      }

      // Get welcome bonus settings
      const bonusSettings = await AppSettings.filter({ setting_key: "welcome_bonus" }).catch(() => []);
      const bonusEnabled = bonusSettings.length > 0 ? bonusSettings[0].is_enabled !== false : true;
      const bonusAmount = bonusSettings.length > 0 ? parseInt(bonusSettings[0].setting_value) || 1 : 1;

      // Give welcome bonus if enabled
      if (bonusEnabled && bonusAmount > 0) {
        await giveWelcomeBonus(user, bonusAmount);
      }

      // Handle referral from URL
      await handleReferralFromURL(user);

      // Mark user as processed
      await User.updateMyUserData({ welcome_bonus_given: true }).catch(() => {});
      
      setProcessed(true);
    } catch (error) {
      console.error("Welcome bonus error:", error);
      setProcessed(true);
    }
  };

  const giveWelcomeBonus = async (user, bonusAmount) => {
    try {
      const accounts = await Diamond.filter({ user_id: user.id }).catch(() => []);
      const now = new Date().toISOString();

      if (accounts.length > 0) {
        // Check if welcome bonus already given
        const hasBonus = accounts[0].transactions?.some(t => 
          t.description?.includes("Welcome Bonus")
        );
        if (!hasBonus) {
          await Diamond.update(accounts[0].id, {
            amount: (accounts[0].amount || 0) + bonusAmount,
            transactions: [...(accounts[0].transactions || []), {
              type: "Win",
              amount: bonusAmount,
              description: "🎉 Welcome Bonus",
              timestamp: now
            }]
          });
        }
      } else {
        await Diamond.create({
          user_id: user.id,
          user_ign: user.ign || user.full_name,
          amount: bonusAmount,
          transactions: [{
            type: "Win",
            amount: bonusAmount,
            description: "🎉 Welcome Bonus",
            timestamp: now
          }]
        });
      }
    } catch (e) {
      console.error("Give bonus error:", e);
    }
  };

  const handleReferralFromURL = async (user) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refId = urlParams.get("ref");
      
      if (!refId || refId === user.id) {
        return;
      }

      // Check if referral already exists for this user
      const existingRef = await Referral.filter({ referred_user_id: user.id }).catch(() => []);
      
      if (existingRef.length > 0) {
        // Already has a referral, clear URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Find referrer - try direct ID match first
      let referrer = null;
      const allUsers = await User.list("-created_date", 200).catch(() => []);
      
      // Try exact match
      referrer = allUsers.find(u => u.id === refId);
      
      // Try partial match (for short IDs)
      if (!referrer) {
        referrer = allUsers.find(u => u.id.startsWith(refId) || u.id.includes(refId));
      }

      if (!referrer || referrer.id === user.id) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Get reward amount from settings
      const rewardSettings = await AppSettings.filter({ setting_key: "referral_system" }).catch(() => []);
      const isEnabled = rewardSettings.length > 0 ? rewardSettings[0].is_enabled !== false : true;
      const rewardAmount = rewardSettings.length > 0 ? parseInt(rewardSettings[0].setting_value) || 5 : 5;

      if (!isEnabled) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Create referral record - Pending status
      await Referral.create({
        referrer_id: referrer.id,
        referrer_ign: referrer.ign || referrer.full_name || "User",
        referred_user_id: user.id,
        referred_user_ign: user.ign || user.full_name || "New User",
        status: "Pending",
        reward_amount: rewardAmount,
        reward_credited: false,
        transferred: false
      });

      // Clear ref from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
    } catch (e) {
      console.error("Referral handling error:", e);
    }
  };

  return null;
}