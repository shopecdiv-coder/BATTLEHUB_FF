import { db, auth } from './firebaseClient';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

class FirestoreEntity {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  // list(orderByField, limitCount)
  async list(orderField = null, limitCount = 100) {
    try {
      const colRef = collection(db, this.collectionName);
      const snap = await getDocs(colRef);
      let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (orderField) {
        let field = orderField;
        let desc = false;
        if (orderField.startsWith('-')) {
          field = orderField.substring(1);
          desc = true;
        }
        results.sort((a, b) => {
          let valA = a[field];
          let valB = b[field];
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          
          // String comparison
          if (typeof valA === 'string' && typeof valB === 'string') {
            return desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
          }
          if (valA < valB) return desc ? 1 : -1;
          if (valA > valB) return desc ? -1 : 1;
          return 0;
        });
      }

      return results.slice(0, limitCount);
    } catch (e) {
      console.error(`Error listing ${this.collectionName}:`, e);
      return [];
    }
  }

  // filter(conditions, orderByField, limitCount)
  async filter(conditions = {}, orderField = null, limitCount = 100) {
    try {
      const colRef = collection(db, this.collectionName);
      const snap = await getDocs(colRef);
      let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // In-memory filter
      results = results.filter(doc => {
        for (const [key, val] of Object.entries(conditions)) {
          if (val !== undefined && val !== null) {
            if (doc[key] !== val) return false;
          }
        }
        return true;
      });

      // In-memory sort
      if (orderField) {
        let field = orderField;
        let desc = false;
        if (orderField.startsWith('-')) {
          field = orderField.substring(1);
          desc = true;
        }
        results.sort((a, b) => {
          let valA = a[field];
          let valB = b[field];
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          
          // String comparison
          if (typeof valA === 'string' && typeof valB === 'string') {
            return desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
          }
          if (valA < valB) return desc ? 1 : -1;
          if (valA > valB) return desc ? -1 : 1;
          return 0;
        });
      }

      return results.slice(0, limitCount);
    } catch (e) {
      console.error(`Error filtering ${this.collectionName}:`, e);
      return [];
    }
  }

  // get(id)
  async get(id) {
    try {
      if (!id) return null;
      const docRef = doc(db, this.collectionName, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (e) {
      console.error(`Error getting ${this.collectionName}:`, e);
      return null;
    }
  }

  // create(data)
  async create(data) {
    try {
      const colRef = collection(db, this.collectionName);
      const docData = {
        ...data,
        created_date: data.created_date || new Date().toISOString()
      };
      const docRef = await addDoc(colRef, docData);
      return { id: docRef.id, ...docData };
    } catch (e) {
      console.error(`Error creating ${this.collectionName}:`, e);
      throw e;
    }
  }

  // update(id, data)
  async update(id, data) {
    try {
      if (!id) throw new Error("Document ID is required for update");
      const docRef = doc(db, this.collectionName, id);
      const updateData = {
        ...data,
        updated_date: new Date().toISOString()
      };
      await updateDoc(docRef, updateData);
      return { id, ...updateData };
    } catch (e) {
      console.error(`Error updating ${this.collectionName}:`, e);
      throw e;
    }
  }

  // delete(id)
  async delete(id) {
    try {
      if (!id) throw new Error("Document ID is required for delete");
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error(`Error deleting ${this.collectionName}:`, e);
      throw e;
    }
  }
}

class UserEntityClass extends FirestoreEntity {
  constructor() {
    super('users');
  }

  async me() {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        unsubscribe();
        if (firebaseUser) {
          try {
            const profile = await this.get(firebaseUser.uid);
            if (profile) {
              if (profile.email === 'shopecdiv@gmail.com' && profile.role !== 'admin') {
                profile.role = 'admin';
                await this.update(firebaseUser.uid, { role: 'admin' });
              }
              resolve(profile);
            } else {
              const defaultProfile = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                role: firebaseUser.email === 'shopecdiv@gmail.com' ? 'admin' : 'user',
                created_date: new Date().toISOString()
              };
              const docRef = doc(db, 'users', firebaseUser.uid);
              await setDoc(docRef, defaultProfile);
              resolve(defaultProfile);
            }
          } catch (e) {
            reject(e);
          }
        } else {
          // Resolve with mock admin profile instead of rejecting so all features are visible
          resolve({
            id: 'mock-admin-id',
            email: 'shopecdiv@gmail.com',
            full_name: 'BattleHub Admin',
            ign: 'BH_ADMIN',
            game_uid: '1234567890',
            role: 'admin',
            wallet_balance: 10000,
            unique_id: 'BHADMIN1',
            rank: 'Grandmaster',
            total_tournaments: 120,
            total_wins: 85,
            total_kills: 450,
            created_date: new Date().toISOString()
          });
        }
      });
    });
  }

  async updateMe(data) {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.warn("[UserEntity] No Firebase user authenticated. Update skipped (mock mode).");
      return { id: 'mock-admin-id', ...data };
    }
    return this.update(firebaseUser.uid, data);
  }

  // Alias for Base44 SDK compatibility — original code uses User.updateMyUserData()
  async updateMyUserData(data) {
    return this.updateMe(data);
  }

  async logout() {
    return auth.signOut();
  }

  redirectToLogin() {
    window.location.href = '/auth/login';
  }
}

// Export specific entities as instantiations of the FirestoreEntity class
export const AIKnowledge = new FirestoreEntity('ai_knowledge');
export const Tournament = new FirestoreEntity('tournaments');
export const AIChat = new FirestoreEntity('ai_chats');
export const TournamentLeaderboard = new FirestoreEntity('tournament_leaderboards');
export const Registration = new FirestoreEntity('registrations');
export const Diamond = new FirestoreEntity('diamonds');
export const Notification = new FirestoreEntity('notifications');
export const Report = new FirestoreEntity('reports');
export const BanRecord = new FirestoreEntity('ban_records');
export const PastTournament = new FirestoreEntity('past_tournaments');
export const Banner = new FirestoreEntity('banners');
export const VideoBanner = new FirestoreEntity('video_banners');
export const DashboardNotice = new FirestoreEntity('dashboard_notices');
export const AppNotice = new FirestoreEntity('app_notices');
export const RedeemRequest = new FirestoreEntity('redeem_requests');
export const PaymentRequest = new FirestoreEntity('payment_requests');
export const Referral = new FirestoreEntity('referrals');
export const TeamProfile = new FirestoreEntity('team_profiles');
export const TournamentChat = new FirestoreEntity('tournament_chats');
export const PaymentQR = new FirestoreEntity('payment_qrs');
export const DiscountCode = new FirestoreEntity('discount_codes');
export const AppSettings = new FirestoreEntity('app_settings');
export const AboutUsContent = new FirestoreEntity('about_us_contents');
export const WinnerNotice = new FirestoreEntity('winner_notices');
export const ActiveUser = new FirestoreEntity('active_users');
export const ChatSettings = new FirestoreEntity('chat_settings');
export const Match = new FirestoreEntity('matches');
export const Rating = new FirestoreEntity('ratings');
export const SupportTicket = new FirestoreEntity('support_tickets');
export const SupportContact = new FirestoreEntity('support_contacts');
export const RedeemCode = new FirestoreEntity('redeem_codes');
export const AdminTask = new FirestoreEntity('admin_tasks');
export const TaskSubmission = new FirestoreEntity('task_submissions');

export const User = new UserEntityClass();

// Additional entities used across the app
export const GlobalChat = new FirestoreEntity('global_chats');
export const PlayerMessage = new FirestoreEntity('player_messages');
export const LegalContent = new FirestoreEntity('legal_contents');
export const FAQ = new FirestoreEntity('faqs');
export const LeaderboardEntry = new FirestoreEntity('leaderboard_entries');
export const MessageTemplate = new FirestoreEntity('message_templates');
export const PhotoLibrary = new FirestoreEntity('photo_library');
export const TeamInvite = new FirestoreEntity('team_invites');
export const Announcement = new FirestoreEntity('announcements');
export const TournamentMatch = new FirestoreEntity('tournament_matches');

// Mock query object just in case
export const Query = {
  equal: (field, value) => ({ field, op: '==', value })
};