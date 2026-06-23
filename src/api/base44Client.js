import * as entities from './entities';
import * as integrations from './integrations';

// Compatibility client to satisfy imports of base44 from '@/api/base44Client'
export const base44 = {
  auth: entities.User,
  entities: entities,
  integrations: {
    Core: integrations.Core
  },
  appLogs: {
    logUserInApp: async (pageName) => {
      console.log(`[AppLog] User navigated to page: ${pageName}`);
      return true;
    }
  },
  agents: {
    getWhatsAppConnectURL: (agentId) => {
      // Customize WhatsApp support number here
      return `https://wa.me/917983637175?text=Hello%20BattleHub%20Support!`;
    }
  }
};
