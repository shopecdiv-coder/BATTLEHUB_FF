import { secureFetch } from './apiClient';

/**
 * Tournament API Service
 * Handles server-side validated actions for Tournaments instead of direct Firestore writes.
 */
export const tournamentsApi = {
  
  /**
   * Securely update a tournament leaderboard
   * (Matches OWASP IDOR & RBAC guidelines - Backend will verify ownership)
   */
  updateLeaderboard: async (tournamentId, matchId, teamScores) => {
    return secureFetch(`/tournaments/${tournamentId}/leaderboard`, {
      method: 'POST',
      body: JSON.stringify({ matchId, teamScores })
    });
  },

  /**
   * Securely change tournament status (e.g. Publish, Close Registration)
   */
  updateStatus: async (tournamentId, status) => {
    return secureFetch(`/tournaments/${tournamentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }
};
