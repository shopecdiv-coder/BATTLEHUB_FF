// Firebase Seed Script - BATTLEHUB FF
// Run with: node seed-firebase.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBPoUEVfjtAwT1A94vbJuI-ZS9z6AqhVsI",
  authDomain: "battlehubff-8dbc7.firebaseapp.com",
  projectId: "battlehubff-8dbc7",
  storageBucket: "battlehubff-8dbc7.firebasestorage.app",
  messagingSenderId: "957392257082",
  appId: "1:957392257082:web:f7fe3262688aa358d0b503",
  measurementId: "G-Q587ZV0N1Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const now = new Date().toISOString();

async function clearCollection(colName) {
  try {
    const snap = await getDocs(collection(db, colName));
    console.log(`🧹 Clearing collection: ${colName} (${snap.size} items)...`);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, colName, d.id));
    }
  } catch (err) {
    console.log(`⚠️ Warning: could not clear ${colName}:`, err.message);
  }
}

async function addItem(colName, data) {
  const ref = await addDoc(collection(db, colName), { ...data, created_date: now });
  console.log(`  ✅ Added to ${colName}: ${ref.id}`);
  return ref.id;
}

// ─── VIDEO BANNERS ───
async function seedVideoBanners() {
  await clearCollection('video_banners');
  console.log('📹 Seeding video_banners...');
  await addItem('video_banners', {
    title: "BATTLEHUB FF – Compete & Win!",
    video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
    thumbnail_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee96b6cabd2c2d7af587d0/08567b05d_bf31fa0a1_logo.png",
    active: true,
    order: 1
  });
}

// ─── BANNERS ───
async function seedBanners() {
  await clearCollection('banners');
  console.log('🖼  Seeding banners...');
  const bannerData = [
    { title: "Daily Tournament – Join Now!", image_url: "https://placehold.co/800x300/FF4500/FFFFFF?text=BATTLEHUB+FF+Daily+Tournament", link_url: "", active: true, order: 1 },
    { title: "Win Real Cash Prizes", image_url: "https://placehold.co/800x300/1a1a2e/FF6B35?text=Win+Real+Cash+Prizes", link_url: "", active: true, order: 2 },
    { title: "Refer & Earn Diamonds", image_url: "https://placehold.co/800x300/16213e/00D4FF?text=Refer+%26+Earn+Diamonds", link_url: "", active: true, order: 3 }
  ];
  for (const b of bannerData) await addItem('banners', b);
}

// ─── ANNOUNCEMENTS ───
async function seedAnnouncements() {
  await clearCollection('announcements');
  console.log('📢 Seeding announcements...');
  const announcements = [
    { message: "🔥 New daily tournaments added! Join and win real cash prizes. Register now before slots fill up!", active: true, priority: 1, type: "info" },
    { message: "💎 Refer your friends and earn 50 diamonds per referral! Share your code from the Wallet section.", active: true, priority: 2, type: "success" },
    { message: "⚠️ Please read tournament rules carefully before joining. Fair play is mandatory.", active: true, priority: 3, type: "warning" }
  ];
  for (const a of announcements) await addItem('announcements', a);
}

// ─── TOURNAMENTS ───
async function seedTournaments() {
  await clearCollection('tournaments');
  console.log('🏆 Seeding tournaments...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  const baseRules = `⚔️ BattleHub Free Fire Tournament Rules

1. Entry Eligibility
• Minimum Account Level: 50 or higher
• Account Age: At least 30 days old

2. Match Rules
• No teaming with enemies
• No hacking or cheating
• PC players & unauthorized emulators are NOT allowed
• Screen recording may be requested for verification

3. Penalties
• First Offense: 7-day suspension + prize forfeiture
• Second Offense: 30-day suspension + blacklist

⚖️ All administrative decisions are final.`;

  const tournaments = [
    {
      title: "BATTLEHUB Qualifier Solo – ₹500 Prize",
      tournament_type: "Qualifier", mode: "Solo", map: "Bermuda",
      entry_fee: 10, prize_pool: 500, max_teams: 50, current_teams: 12,
      status: "Registration Open", date_time: tomorrow.toISOString(),
      banner_url: "https://placehold.co/800x400/FF4500/FFFFFF?text=SOLO+QUALIFIER+%E2%82%B9500",
      room_id: "", room_password: "", per_kill_reward: 5, is_template: false, rules: baseRules
    },
    {
      title: "BATTLEHUB Semifinal Duo – ₹1000 Prize",
      tournament_type: "Semifinal", mode: "Duo", map: "Kalahari",
      entry_fee: 25, prize_pool: 1000, max_teams: 25, current_teams: 8,
      status: "Registration Open", date_time: tomorrow.toISOString(),
      banner_url: "https://placehold.co/800x400/1a1a2e/FF6B35?text=DUO+SEMIFINAL+%E2%82%B91000",
      room_id: "", room_password: "", per_kill_reward: 10, is_template: false, rules: baseRules
    },
    {
      title: "BATTLEHUB Grand Final Squad – ₹5000 Prize",
      tournament_type: "Grand Final", mode: "Squad", map: "Bermuda",
      entry_fee: 100, prize_pool: 5000, max_teams: 15, current_teams: 6,
      status: "Registration Open", date_time: dayAfter.toISOString(),
      banner_url: "https://placehold.co/800x400/0f0f23/FFD700?text=SQUAD+GRAND+FINAL+%E2%82%B95000",
      room_id: "", room_password: "", per_kill_reward: 20, is_template: false, rules: baseRules
    },
    {
      title: "Free Entry – Beginner Solo",
      tournament_type: "Qualifier", mode: "Solo", map: "Purgatory",
      entry_fee: 0, prize_pool: 200, max_teams: 48, current_teams: 0,
      status: "Registration Open", date_time: tomorrow.toISOString(),
      banner_url: "https://placehold.co/800x400/0d1117/00FF88?text=FREE+ENTRY+Beginner+Solo",
      room_id: "", room_password: "", per_kill_reward: 2, is_template: false,
      rules: `⚔️ Beginner Tournament Rules\n\n• FREE to join – no entry fee!\n• Open to all players (no level requirement)\n• No cheating or hacking allowed\n• Fair play mandatory\n\nPrize Distribution:\n• 1st Place: ₹100\n• 2nd Place: ₹60\n• 3rd Place: ₹40`
    }
  ];
  for (const t of tournaments) await addItem('tournaments', t);
}

// ─── PAST TOURNAMENTS ───
async function seedPastTournaments() {
  await clearCollection('past_tournaments');
  console.log('📜 Seeding past_tournaments...');
  const past = [
    {
      title: "BATTLEHUB Solo Showdown",
      tournament_id: "BH-SOLO-101",
      mode: "Solo",
      date: new Date(Date.now() - 2*86400000).toISOString(),
      result_image_url: "https://placehold.co/800x400/1e293b/ffffff?text=Solo+Showdown+Results",
      winners: [
        { player_name: "ProGamer_FF", kills: 12, uid: "BH827361", reward: 250 },
        { player_name: "TrophyHunter", kills: 8, uid: "BH391823", reward: 150 },
        { player_name: "SurvivalKing", kills: 4, uid: "BH112233", reward: 100 }
      ]
    },
    {
      title: "BATTLEHUB Duo Warriors",
      tournament_id: "BH-DUO-202",
      mode: "Duo",
      date: new Date(Date.now() - 4*86400000).toISOString(),
      result_image_url: "https://placehold.co/800x400/0f172a/ffffff?text=Duo+Warriors+Results",
      winners: [
        { player_name: "BooyahKing", kills: 14, uid: "BH998877", reward: 500 },
        { player_name: "SniperPro", kills: 10, uid: "BH443322", reward: 300 },
        { player_name: "HeadshotGod", kills: 6, uid: "BH556677", reward: 200 }
      ]
    },
    {
      title: "BATTLEHUB Squad Elite",
      tournament_id: "BH-SQUAD-303",
      mode: "Squad",
      date: new Date(Date.now() - 7*86400000).toISOString(),
      result_image_url: "https://placehold.co/800x400/090d16/ffffff?text=Squad+Elite+Results",
      winners: [
        { player_name: "EliteSquad_FF", kills: 22, uid: "BH776655", reward: 2000 },
        { player_name: "TeamDelta", kills: 15, uid: "BH887766", reward: 1200 },
        { player_name: "NoMercy", kills: 8, uid: "BH554433", reward: 800 }
      ]
    }
  ];
  for (const p of past) await addItem('past_tournaments', p);
}

// ─── SUPPORT CONTACTS ───
async function seedSupportContacts() {
  await clearCollection('support_contacts');
  console.log('📞 Seeding support_contacts...');
  const contacts = [
    { name: "BattleHub Support", phone: "917983637175", whatsapp_url: "https://wa.me/917983637175?text=Hello%20BattleHub%20Support!", type: "whatsapp", is_active: true, order: 1 },
    { name: "BattleHub Help Desk", phone: "917366877171", whatsapp_url: "https://wa.me/917366877171?text=Hello%20BattleHub%20Help!", type: "whatsapp", is_active: true, order: 2 }
  ];
  for (const c of contacts) await addItem('support_contacts', c);
}

// ─── CHAT SETTINGS ───
async function seedChatSettings() {
  await clearCollection('chat_settings');
  console.log('💬 Seeding chat_settings...');
  await addItem('chat_settings', {
    chat_dp_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee96b6cabd2c2d7af587d0/08567b05d_bf31fa0a1_logo.png",
    background_url: "",
    is_active: true
  });
}

// ─── APP SETTINGS ───
async function seedAppSettings() {
  await clearCollection('app_settings');
  console.log('⚙️  Seeding app_settings...');
  const settings = [
    { setting_key: "app_status", setting_value: "online", is_enabled: true, description: "App status indicator" },
    { setting_key: "app_status_message", setting_value: "All systems operational!", is_enabled: true, description: "Status message" },
    { setting_key: "referral_page_visible", setting_value: "true", is_enabled: true, description: "Show referral page in menu" },
    { setting_key: "wallet_tutorial_link", setting_value: "https://wa.me/917983637175", is_enabled: true, description: "Link for wallet tutorial" },
    { setting_key: "min_withdrawal", setting_value: "100", is_enabled: true, description: "Minimum withdrawal in rupees" },
    { setting_key: "referral_bonus", setting_value: "50", is_enabled: true, description: "Diamonds per referral" },
    { setting_key: "welcome_bonus", setting_value: "20", is_enabled: true, description: "Welcome diamonds for new users" },
    { setting_key: "maintenance_mode", setting_value: "false", is_enabled: false, description: "Enable maintenance mode" }
  ];
  for (const s of settings) await addItem('app_settings', s);
}

// ─── FAQS ───
async function seedFAQs() {
  await clearCollection('faqs');
  console.log('❓ Seeding faqs...');
  const faqs = [
    { question: "How do I join a tournament?", answer: "Go to the 'Play' section, choose a tournament, and click 'Join'. Pay the entry fee (if any) using your diamond balance. Room ID & password will be shared before match time.", category: "Matches", is_active: true, order: 1 },
    { question: "How do I add diamonds to my wallet?", answer: "Go to 'Wallet' → 'Add Diamonds'. Scan the QR code, pay via UPI, and enter the UTR number to verify. Diamonds will be credited within 5 minutes.", category: "Coins", is_active: true, order: 2 },
    { question: "How are prizes distributed?", answer: "Prize money is credited to your BattleHub wallet as diamonds within 24 hours of result announcement. You can withdraw from the Wallet section.", category: "Prizes", is_active: true, order: 3 },
    { question: "Can I withdraw my winnings?", answer: "Yes! Go to 'Wallet' → 'Withdraw'. Minimum withdrawal is ₹100. Payments are processed within 24-48 hours via UPI/Bank Transfer.", category: "Prizes", is_active: true, order: 4 },
    { question: "What if I face technical issues during a match?", answer: "Contact our support team immediately via WhatsApp. Keep a screen recording as proof. Issues must be reported within 30 minutes of the match.", category: "Support", is_active: true, order: 5 },
    { question: "Is PC or emulator allowed?", answer: "No. PC players and unauthorized emulators are strictly prohibited. Only mobile Free Fire is allowed. Detection leads to permanent ban.", category: "Gameplay", is_active: true, order: 6 },
    { question: "How does the referral system work?", answer: "Share your unique referral code from the Wallet section. When a friend registers using your code and joins their first tournament, you earn 50 diamonds!", category: "Coins", is_active: true, order: 7 },
    { question: "How do I check tournament results?", answer: "Go to the Leaderboard section or check your registered tournament details. Results are updated within 2 hours of match completion.", category: "Matches", is_active: true, order: 8 },
    { question: "What is the per-kill reward?", answer: "Many tournaments offer per-kill bonuses (e.g., ₹5 per kill). This is separate from the main prize pool and is credited after result verification.", category: "Prizes", is_active: true, order: 9 },
    { question: "How do I contact support?", answer: "WhatsApp: +91 79836 37175 or +91 73668 77171. Support hours: 9 AM – 10 PM IST.", category: "Support", is_active: true, order: 10 }
  ];
  for (const f of faqs) await addItem('faqs', f);
}

// ─── LEGAL CONTENT ───
async function seedLegalContent() {
  await clearCollection('legal_contents');
  console.log('📋 Seeding legal_contents...');

  const legalDocs = [
    {
      content_type: "rules",
      title: "Tournament Rules & Eligibility",
      version: "2.0",
      last_updated: now,
      content: `⚔️ BattleHub Free Fire Tournament Rules & Eligibility

Participation in any BattleHub event signifies full acceptance of these rules.

1. Entry Eligibility
• Minimum Account Level: 50 or higher
• Account Age: At least 30 days old
• Linked Device: Must be connected to one verified device
• KYC Required for tournaments with prize pool above ₹5,000

2. Headshot & CS-Rank Integrity Rules
• Players with average headshot rate > 80% (last 50 matches) will be flagged
• Sudden spike detection: +30% increase in headshot rate triggers review

3. Pre-Match Compliance
• Only official Free Fire client versions are allowed
• Use of modified clients, unauthorized emulators, or third-party tools is strictly prohibited
• PC players and unauthorized emulators are NOT allowed

4. Detection & Blocking Protocol
• Players exceeding system detection thresholds are automatically suspended
• Flagged players must provide screen recordings and device logs within 24 hours

5. Penalties & Enforcement
• First Offense: 7-day suspension + prize forfeiture + account probation
• Second Offense: 30-day suspension + 1-year blacklist + prize forfeiture
• Third Offense: Permanent ban + internal blacklist + potential legal action

6. Match Conduct & Integrity
• Multi-accounting = permanent ban for all linked accounts
• Collusion, teaming, or match-fixing = instant disqualification
• Cheating, macros, or any unfair manipulation = Immediate prize forfeiture + expulsion

7. Organizer Rights
• Organizers may request livestreams, recordings, or device proofs anytime
• Organizers may freeze prize pools during active investigations
• All administrative decisions are final`
    },
    {
      content_type: "privacy_policy",
      title: "Privacy Policy",
      version: "1.0",
      last_updated: now,
      content: `Privacy Policy – BattleHub FF

Effective Date: January 1, 2025

1. Information We Collect
We collect: name, contact information, gaming profile (Free Fire UID, in-game name), payment info (UPI transaction IDs for verification), and device/usage data.

2. How We Use Your Information
• Provide and improve our tournament services
• Process payments and prize distributions
• Send notifications about tournaments and results
• Prevent fraud and ensure fair play
• Respond to support requests

3. Information Sharing
We do not sell or share your personal information with third parties except when required by law, to protect our rights, or with your explicit consent.

4. Data Security
We implement appropriate security measures to protect your personal information.

5. Your Rights
You have the right to access, correct, or delete your personal data. Contact us to exercise these rights.

6. Contact Us
• WhatsApp: +91 79836 37175
• Email: support@battlehubff.site
• Website: https://battlehubff.site`
    },
    {
      content_type: "terms_conditions",
      title: "Terms & Conditions",
      version: "1.0",
      last_updated: now,
      content: `Terms & Conditions – BattleHub FF

Effective Date: January 1, 2025

1. Acceptance of Terms
By using BattleHub FF, you agree to be bound by these Terms and Conditions.

2. Eligibility
• You must be at least 18 years old to participate in paid tournaments
• You must have a valid Free Fire account
• You must provide accurate information during registration

3. Tournament Rules
• All tournament rules must be followed as posted
• Cheating will result in immediate disqualification and ban
• BattleHub FF reserves the right to modify rules at any time

4. Payments & Prizes
• Entry fees are non-refundable unless the tournament is cancelled by BattleHub FF
• Prize distributions are made within 24-48 hours of result confirmation
• BattleHub FF reserves the right to withhold prizes pending fraud investigation

5. Account Responsibility
• You are responsible for maintaining the security of your account
• Sharing account credentials is prohibited
• Any activity under your account is your responsibility

6. Contact
• WhatsApp: +91 79836 37175
• Email: support@battlehubff.site
• Website: https://battlehubff.site`
    },
    {
      content_type: "refund_policy",
      title: "Refund Policy",
      version: "1.0",
      last_updated: now,
      content: `Refund Policy – BattleHub FF

1. Entry Fee Refunds

REFUND ELIGIBLE:
• Tournament is cancelled by BattleHub FF
• Duplicate payment made by mistake
• Technical failure preventing participation (must be reported within 30 minutes)

NOT REFUND ELIGIBLE:
• Player fails to join the room on time
• Player is disqualified for rule violations
• Change of mind after joining
• Network issues on the player's side

2. Diamond/Wallet Refunds
• Diamonds added to your wallet are non-refundable to the original payment method
• If a payment was made but diamonds were not credited, contact support within 24 hours with your UTR number

3. Withdrawal Issues
• Withdrawal rejections due to incorrect bank details are the player's responsibility

4. How to Request a Refund
1. Go to Support section in the app
2. Create a ticket with subject "Refund Request"
3. Provide tournament name, transaction ID, and reason
4. Our team will review within 48 hours

5. Contact
• WhatsApp: +91 79836 37175
• Email: support@battlehubff.site`
    }
  ];

  for (const d of legalDocs) await addItem('legal_contents', d);
}

// ─── ABOUT US ───
async function seedAboutUs() {
  await clearCollection('about_us_contents');
  console.log('🏢 Seeding about_us_contents...');
  await addItem('about_us_contents', {
    title: "Battle Hub FF",
    content: `<h2 style="color:#FF4500;font-weight:bold;margin-bottom:12px;">India's Premier Free Fire Tournament Platform</h2>
<p style="margin-bottom:16px;">Welcome to <strong>Battle Hub FF</strong> — your ultimate destination for competitive Free Fire gaming. We organize daily tournaments with real cash prizes, bringing together the best players from across India.</p>
<h3 style="color:#FF6B35;font-weight:600;margin-top:20px;margin-bottom:10px;">🎯 Our Mission</h3>
<p style="margin-bottom:16px;">To provide a fair, transparent, and exciting platform where every Free Fire player — from beginner to pro — can compete, win, and grow.</p>
<h3 style="color:#FF6B35;font-weight:600;margin-top:20px;margin-bottom:10px;">🏆 What We Offer</h3>
<ul style="margin-bottom:16px;padding-left:20px;">
  <li style="margin-bottom:8px;"><strong>Daily Tournaments</strong> – Multiple matches every day with cash prizes</li>
  <li style="margin-bottom:8px;"><strong>All Formats</strong> – Solo, Duo, and Squad matches on all maps</li>
  <li style="margin-bottom:8px;"><strong>Instant Payouts</strong> – Prize money credited to your wallet within 24 hours</li>
  <li style="margin-bottom:8px;"><strong>Fair Play Guarantee</strong> – Advanced anti-cheat detection and strict rules</li>
  <li style="margin-bottom:8px;"><strong>Active Community</strong> – Join thousands of passionate Free Fire players</li>
</ul>
<h3 style="color:#FF6B35;font-weight:600;margin-top:20px;margin-bottom:10px;">📞 Contact Us</h3>
<p>• WhatsApp: +91 79836 37175</p>
<p>• Help Desk: +91 73668 77171</p>
<p>• Email: support@battlehubff.site</p>
<p>• Website: https://battlehubff.site</p>`
  });
}

// ─── DASHBOARD NOTICES ───
async function seedDashboardNotices() {
  await clearCollection('dashboard_notices');
  console.log('📌 Seeding dashboard_notices...');
  const notices = [
    { title: "Welcome to BattleHub FF!", message: "India's best Free Fire tournament platform. Compete daily and win real cash prizes!", type: "info", is_active: true, priority: 1 },
    { title: "New Tournaments Added Daily", message: "Fresh tournaments added every morning at 9 AM. Don't miss out — slots fill fast!", type: "success", is_active: true, priority: 2 }
  ];
  for (const n of notices) await addItem('dashboard_notices', n);
}

// ─── WINNER NOTICES ───
async function seedWinnerNotices() {
  await clearCollection('winner_notices');
  console.log('🥇 Seeding winner_notices...');
  const winners = [
    { player_name: "ProGamer_FF", game_uid: "PG1234", tournament_name: "Solo Showdown", prize_amount: 500, match_type: "Solo", is_visible: true },
    { player_name: "BooyahKing", game_uid: "BK5678", tournament_name: "Duo Warriors", prize_amount: 1000, match_type: "Duo", is_visible: true },
    { player_name: "EliteSquad_FF", game_uid: "ES9999", tournament_name: "Squad Championship", prize_amount: 2000, match_type: "Squad", is_visible: true }
  ];
  for (const w of winners) await addItem('winner_notices', w);
}

// ─── MESSAGE TEMPLATES ───
async function seedMessageTemplates() {
  await clearCollection('message_templates');
  console.log('📝 Seeding message_templates...');
  const templates = [
    { name: "Room Info", content: "🎮 Room ID: {room_id}\n🔑 Password: {room_password}\n⏰ Match starts in 10 minutes!\n\nBe ready. All the best! 🔥", category: "Tournament", is_active: true },
    { name: "Match Start Warning", content: "⚠️ Match starting in 5 minutes!\nRoom ID: {room_id}\nPassword: {room_password}\n\nPlayers who don't join will be marked as absent.", category: "Tournament", is_active: true },
    { name: "Result Announcement", content: "🏆 Results are out!\n\n1st: {winner_1}\n2nd: {winner_2}\n3rd: {winner_3}\n\nPrizes will be credited within 24 hours. Congratulations! 🎉", category: "Tournament", is_active: true },
    { name: "Payment Confirmation", content: "✅ Payment Confirmed!\nAmount: ₹{amount}\nDiamonds added: {diamonds}\n\nYour balance has been updated. Happy gaming! 💎", category: "Payment", is_active: true }
  ];
  for (const t of templates) await addItem('message_templates', t);
}

// ─── AI KNOWLEDGE BASE ───
async function seedAIKnowledge() {
  await clearCollection('ai_knowledge');
  console.log('🤖 Seeding ai_knowledge...');
  const knowledge = [
    { title: "How to join a tournament", content: "To join a tournament: 1) Go to Play tab 2) Choose a tournament 3) Click Join 4) Pay entry fee using diamond balance 5) Wait for Room ID & Password to be shared before match time.", is_active: true, priority: 1 },
    { title: "How to add money/diamonds", content: "To add diamonds: 1) Go to Wallet tab 2) Click Add Diamonds 3) Scan QR code 4) Pay via UPI 5) Enter UTR number 6) Diamonds credited within 5 minutes.", is_active: true, priority: 2 },
    { title: "How to withdraw prize money", content: "To withdraw: 1) Go to Wallet tab 2) Click Withdraw 3) Enter amount (min ₹100) 4) Provide UPI ID or bank details 5) Payment within 24-48 hours.", is_active: true, priority: 3 },
    { title: "Tournament rules summary", content: "Key rules: Minimum account level 50, no PC/emulators allowed, no cheating or hacking, no teaming with enemies, screen recording may be requested. Violations lead to ban.", is_active: true, priority: 4 },
    { title: "Support contact", content: "For support: WhatsApp +91 79836 37175 or +91 73668 77171. Support hours 9AM-10PM IST daily. You can also raise a ticket in the Support section of the app.", is_active: true, priority: 5 }
  ];
  for (const k of knowledge) await addItem('ai_knowledge', k);
}

// ─── MAIN ───
async function main() {
  console.log('🚀 BattleHub FF – Firebase Seed Script (Complete schema format)');
  console.log('===========================================================');
  console.log(`Project: battlehubff-8dbc7\n`);

  try {
    await seedVideoBanners();
    await seedBanners();
    await seedAnnouncements();
    await seedTournaments();
    await seedPastTournaments();
    await seedSupportContacts();
    await seedChatSettings();
    await seedAppSettings();
    await seedFAQs();
    await seedLegalContent();
    await seedAboutUs();
    await seedDashboardNotices();
    await seedWinnerNotices();
    await seedMessageTemplates();
    await seedAIKnowledge();

    console.log('\n✅✅✅  ALL DATA SEEDED SUCCESSFULLY WITH CORRECT SCHEMA!  ✅✅✅');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message || err);
  }

  process.exit(0);
}

main();
