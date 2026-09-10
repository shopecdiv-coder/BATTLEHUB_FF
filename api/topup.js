import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// 🔒 SECURE Admin Top-Up API
// Requires Firebase ID Token + verified admin role
// ═══════════════════════════════════════════════════════════

function getAdminServices() {
  if (getApps().length === 0) {
    const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!envServiceAccount) throw new Error('Service account not configured');
    
    let serviceAccount;
    const trimmed = envServiceAccount.trim();
    if (trimmed.startsWith('{')) {
      serviceAccount = JSON.parse(trimmed);
    } else {
      serviceAccount = JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return { db: getFirestore() };
}

// Firebase ID Token Verification
import { getAuth } from 'firebase-admin/auth';

async function verifyFirebaseToken(idToken) {
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return {
      localId: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || ''
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    throw new Error('Invalid or expired authentication token');
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // CORS Configuration
  const allowedOrigins = [
    'https://battlehub.site',
    'https://www.battlehub.site',
    'http://localhost:5173',
    'http://localhost:5174',
    'capacitor://localhost',
    'http://localhost'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://battlehub.site');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // ─── AUTHENTICATION REQUIRED ───
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing authentication token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let userRecord;
  try {
    userRecord = await verifyFirebaseToken(idToken);
  } catch (authErr) {
    return res.status(401).json({ success: false, error: 'Authentication failed: ' + authErr.message });
  }

  const adminUid = userRecord.localId;

  try {
    const { db } = getAdminServices();

    // ─── ADMIN ROLE VERIFICATION ───
    const adminDoc = await db.collection('users').doc(adminUid).get();
    if (!adminDoc.exists) {
      return res.status(403).json({ success: false, error: 'User not found' });
    }
    const adminData = adminDoc.data();
    if (adminData.role !== 'admin' && adminData.is_admin !== true) {
      return res.status(403).json({ success: false, error: 'Admin access required. This attempt has been logged.' });
    }

    const {
      bhid, userId, amount, paymentId,
      senderBhid, senderName, source = 'ADMIN_TOPUP'
    } = req.body || {};

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0 || numAmount > 100000) {
      return res.status(400).json({ success: false, error: 'Valid amount required (₹1 - ₹1,00,000)' });
    }

    if (!bhid && !userId) {
      return res.status(400).json({ success: false, error: 'Target BattleHub ID (bhid) or userId required' });
    }

    // 1. Locate Target User
    let targetUserDoc = null;
    let targetUserId = null;
    let targetUserData = null;

    if (userId) {
      const docDirect = await db.collection('users').doc(userId).get();
      if (docDirect.exists) {
        targetUserDoc = docDirect;
        targetUserId = docDirect.id;
        targetUserData = docDirect.data();
      }
    }

    if (!targetUserDoc && bhid) {
      const cleanBhid = bhid.toString().trim().toUpperCase();
      const snap = await db.collection('users').where('unique_id', '==', cleanBhid).limit(1).get();
      if (!snap.empty) {
        targetUserDoc = snap.docs[0];
        targetUserId = targetUserDoc.id;
        targetUserData = targetUserDoc.data();
      }
    }

    if (!targetUserDoc) {
      return res.status(404).json({ success: false, error: `User not found: "${bhid || userId}"` });
    }

    const playerIgn = targetUserData?.ign || targetUserData?.full_name || 'Player';
    const playerUniqueId = targetUserData?.unique_id || bhid || targetUserId;
    const nowIso = new Date().toISOString();
    const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const clientIp = req.headers['x-forwarded-for'] || 'unknown';

    const isGift = Boolean(senderBhid || senderName);
    const txDescription = isGift
      ? `Gift from ${senderName || senderBhid || 'Admin'} (₹${numAmount})`
      : `Admin Top-Up (₹${numAmount})`;

    const newTx = {
      id: txId, type: 'CREDIT', bucket: 'DEPOSIT',
      source: isGift ? 'GIFT_TOPUP' : source,
      amount: numAmount, description: txDescription,
      timestamp: nowIso, payment_id: paymentId || `admin_${Date.now()}`,
      admin_id: adminUid
    };

    // 2. Atomic wallet update
    let newDeposit = 0, newTotal = 0;

    await db.runTransaction(async (transaction) => {
      const diamondSnap = await db.collection('diamonds').where('user_id', '==', targetUserId).limit(1).get();

      if (!diamondSnap.empty) {
        const accountDoc = diamondSnap.docs[0];
        const accData = accountDoc.data();
        const dRef = accountDoc.ref;

        const curDep = Number(accData.deposit_balance || 0);
        const curBon = Number(accData.bonus_balance || 0);
        const curWin = Number(accData.winnings_balance || 0);
        newDeposit = curDep + numAmount;
        newTotal = newDeposit + curBon + curWin;

        transaction.update(dRef, {
          deposit_balance: newDeposit, bh_coin_balance: newTotal,
          transactions: FieldValue.arrayUnion(newTx), updated_date: nowIso
        });
      } else {
        newDeposit = numAmount;
        newTotal = numAmount;
        transaction.set(db.collection('diamonds').doc(), {
          user_id: targetUserId, user_ign: playerIgn,
          deposit_balance: numAmount, bonus_balance: 0, winnings_balance: 0,
          bh_coin_balance: numAmount, diamond_balance: 0,
          transactions: [newTx], created_date: nowIso, updated_date: nowIso
        });
      }

      // Mirror to users
      transaction.set(db.collection('users').doc(targetUserId), {
        walletBalance: FieldValue.increment(numAmount),
        depositBalance: FieldValue.increment(numAmount),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      // Audit log
      const auditRef = db.collection('wallet_audit_log').doc();
      transaction.set(auditRef, {
        type: 'ADMIN_TOPUP', admin_id: adminUid, target_user_id: targetUserId,
        amount: numAmount, source, payment_id: paymentId || txId,
        is_gift: isGift, timestamp: nowIso,
        ip: clientIp, api_version: '2.0_SECURE'
      });

      // Payment request audit
      transaction.set(db.collection('payment_requests').doc(), {
        user_id: targetUserId, user_name: targetUserData?.full_name || playerIgn,
        user_ign: playerIgn, type: 'Deposit',
        amount: numAmount, inr_amount: numAmount, diamond_amount: numAmount,
        transaction_id: paymentId || txId, status: 'Approved',
        payment_method: isGift ? 'Admin Gift' : 'Admin Top-Up',
        approved_by: adminUid, approved_date: nowIso, created_date: nowIso
      });
    });

    // Notification
    await db.collection('notifications').add({
      user_id: targetUserId,
      title: isGift ? 'Gift Received! 🎁' : 'Top-Up Successful! 💰',
      message: `₹${numAmount} credited to your Deposit Wallet!`,
      type: 'wallet', read: false, created_date: nowIso
    }).catch(() => {});

    // Push notification
    if (targetUserData?.fcm_token) {
      try {
        await getMessaging().send({
          notification: {
            title: isGift ? '🎁 Gift Received!' : '💰 Top-Up!',
            body: `+₹${numAmount} credited to your BattleHub wallet!`
          },
          token: targetUserData.fcm_token
        });
      } catch (pushErr) {
        console.warn('Push notification failed:', pushErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `₹${numAmount} credited to ${playerIgn} (${playerUniqueId})`,
      data: {
        userId: targetUserId, unique_id: playerUniqueId, player_ign: playerIgn,
        amount_credited: numAmount, new_deposit_balance: newDeposit,
        total_balance: newTotal, transaction_id: txId, timestamp: nowIso,
        admin_id: adminUid
      }
    });

  } catch (err) {
    console.error('Error in /api/topup:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
