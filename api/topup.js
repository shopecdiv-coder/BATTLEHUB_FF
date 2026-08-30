import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

function getAdminServices() {
  if (getApps().length === 0) {
    let serviceAccount;
    const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (envServiceAccount) {
      serviceAccount = JSON.parse(envServiceAccount);
    } else {
      const filePath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      if (fs.existsSync(filePath)) {
        serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } else {
        throw new Error('Service account key not found');
      }
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return { db: getFirestore() };
}

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const {
    bhid,            // Target BattleHub ID, e.g. "BH849201948"
    userId,          // Optional direct Firebase user UID
    amount,          // INR amount / coins to add (e.g. 100)
    paymentId,       // Payment Gateway Transaction ID (e.g. Razorpay/UPI ID)
    senderBhid,      // Optional sender BattleHub ID (if gifting)
    senderName,      // Optional sender name / IGN
    source = 'WEBSITE_TOPUP'
  } = req.body || {};

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid positive amount is required.' });
  }

  if (!bhid && !userId) {
    return res.status(400).json({ success: false, error: 'Target BattleHub ID (bhid) or userId is required.' });
  }

  try {
    const { db } = getAdminServices();

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
      } else {
        // Fallback: check if bhid is direct document id
        const docDirect = await db.collection('users').doc(cleanBhid).get();
        if (docDirect.exists) {
          targetUserDoc = docDirect;
          targetUserId = docDirect.id;
          targetUserData = docDirect.data();
        }
      }
    }

    if (!targetUserDoc) {
      return res.status(404).json({
        success: false,
        error: `User not found with BattleHub ID "${bhid}". Balance was not credited.`
      });
    }

    const playerIgn = targetUserData?.ign || targetUserData?.full_name || 'BattleHub Player';
    const playerUniqueId = targetUserData?.unique_id || bhid || targetUserId;
    const nowIso = new Date().toISOString();
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Build Transaction Object
    const isGift = Boolean(senderBhid || senderName);
    const txDescription = isGift
      ? `Gift from ${senderName || senderBhid || 'Player'} (₹${numAmount})`
      : `Website Top-Up (₹${numAmount})`;

    const newTx = {
      id: txId,
      type: 'CREDIT',
      bucket: 'DEPOSIT',
      source: isGift ? 'GIFT_TOPUP' : source,
      amount: numAmount,
      description: txDescription,
      timestamp: nowIso,
      payment_id: paymentId || `web_${Date.now()}`
    };

    // 2. Locate or Create Wallet in `diamonds` collection
    const diamondsRef = db.collection('diamonds');
    const diamondSnap = await diamondsRef.where('user_id', '==', targetUserId).limit(1).get();

    let newDeposit = 0;
    let newTotal = 0;

    if (!diamondSnap.empty) {
      const accountDoc = diamondSnap.docs[0];
      const accData = accountDoc.data();

      const curDeposit = Number(accData.deposit_balance || 0);
      const curBonus = Number(accData.bonus_balance || 0);
      const curWinnings = Number(accData.winnings_balance || 0);

      newDeposit = curDeposit + numAmount;
      newTotal = newDeposit + curBonus + curWinnings;

      const existingTxs = Array.isArray(accData.transactions) ? accData.transactions : [];

      await accountDoc.ref.update({
        deposit_balance: newDeposit,
        bh_coin_balance: newTotal,
        transactions: [newTx, ...existingTxs.slice(0, 49)], // Keep up to 50 recent transactions
        updated_date: nowIso
      });
    } else {
      newDeposit = numAmount;
      newTotal = numAmount;

      await diamondsRef.add({
        user_id: targetUserId,
        user_ign: playerIgn,
        deposit_balance: numAmount,
        bonus_balance: 0,
        winnings_balance: 0,
        bh_coin_balance: numAmount,
        diamond_balance: 0,
        transactions: [newTx],
        created_date: nowIso,
        updated_date: nowIso
      });
    }

    // 3. Create In-App Notification
    await db.collection('notifications').add({
      user_id: targetUserId,
      title: isGift ? 'Gift Top-Up Received! 🎁' : 'Wallet Top-Up Successful! 💰',
      message: isGift
        ? `₹${numAmount} gifted to your Deposit Wallet from ${senderName || senderBhid}! 🎉`
        : `₹${numAmount} added to your BattleHub Deposit Wallet. Ready to join tournaments!`,
      type: 'wallet',
      read: false,
      created_date: nowIso
    }).catch(e => console.warn('Failed to create notification:', e));

    // 4. Create Payment Request Record (Audit Log for Admin Dashboard)
    await db.collection('payment_requests').add({
      user_id: targetUserId,
      user_name: targetUserData?.full_name || playerIgn,
      user_ign: playerIgn,
      user_email: targetUserData?.email || '',
      type: 'Deposit',
      amount: numAmount,
      inr_amount: numAmount,
      diamond_amount: numAmount,
      transaction_id: paymentId || txId,
      status: 'Approved',
      payment_method: isGift ? 'Website Gift Top-Up' : 'Website Top-Up',
      approved_date: nowIso,
      created_date: nowIso
    }).catch(e => console.warn('Failed to record payment_request:', e));

    // 5. Attempt Push Notification if User has FCM Token
    if (targetUserData?.fcm_token) {
      try {
        const message = {
          notification: {
            title: isGift ? '🎁 You Received a Gift!' : '💰 Top-Up Successful!',
            body: `+₹${numAmount} credited to your BattleHub wallet!`
          },
          token: targetUserData.fcm_token
        };
        await getMessaging().send(message);
      } catch (pushErr) {
        console.warn('Failed to send push notification:', pushErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `₹${numAmount} successfully credited to ${playerIgn} (${playerUniqueId})`,
      data: {
        userId: targetUserId,
        unique_id: playerUniqueId,
        player_ign: playerIgn,
        amount_credited: numAmount,
        new_deposit_balance: newDeposit,
        total_balance: newTotal,
        transaction_id: txId,
        timestamp: nowIso
      }
    });

  } catch (err) {
    console.error('Error in /api/topup:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
