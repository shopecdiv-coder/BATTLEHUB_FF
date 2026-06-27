import { User } from '@/api/entities';

// Basic configuration for Social XP and Ranks
const RANKS = [
  { name: 'Rookie', minXP: 0 },
  { name: 'Contender', minXP: 500 },
  { name: 'Elite', minXP: 1500 },
  { name: 'Diamond', minXP: 3000 },
  { name: 'Champion', minXP: 5000 },
  { name: 'Legend', minXP: 10000 }
];

export const SocialRewards = {
  // Add XP and recalculate Rank
  addXP: async (userId, amount) => {
    try {
      const user = await User.get(userId);
      if (!user) return;
      
      const currentXP = user.social_xp || 0;
      const newXP = currentXP + amount;
      
      // Determine new rank
      let newRank = RANKS[0].name;
      for (const rank of RANKS) {
        if (newXP >= rank.minXP) {
          newRank = rank.name;
        }
      }
      
      const updateData = { social_xp: newXP };
      if (newRank !== user.social_rank) {
        updateData.social_rank = newRank;
        // Optionally trigger a notification for rank up here
      }
      
      await User.update(userId, updateData);
      return { success: true, newXP, newRank };
    } catch (e) {
      console.error("Failed to award social XP:", e);
      return { success: false };
    }
  },

  // Common actions and their XP values
  ACTIONS: {
    ADD_FRIEND: 50,
    PLAY_PARTY_MATCH: 100,
    COMPLETE_TOURNAMENT: 200,
    POSITIVE_REPUTATION: 10,
    DAILY_LOGIN: 25
  }
};
