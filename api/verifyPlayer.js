import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

function getAdminDb() {
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
  return getFirestore();
}

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const bhid = (req.query?.bhid || req.body?.bhid || '').toString().trim().toUpperCase();

  if (!bhid) {
    return res.status(400).json({ success: false, error: 'BattleHub ID (bhid) is required' });
  }

  try {
    const db = getAdminDb();
    const usersRef = db.collection('users');

    // 1. Search by exact unique_id
    let snapshot = await usersRef.where('unique_id', '==', bhid).limit(1).get();

    // 2. Fallback: Search by document ID (if user passed auth UID)
    if (snapshot.empty) {
      const docDirect = await usersRef.doc(bhid).get();
      if (docDirect.exists) {
        const u = docDirect.data();
        return res.status(200).json({
          success: true,
          player: {
            userId: docDirect.id,
            unique_id: u.unique_id || docDirect.id.substring(0, 8).toUpperCase(),
            ign: u.ign || u.full_name || 'BattleHub Player',
            full_name: u.full_name || '',
            avatar_url: u.avatar_url || '',
            verified: true
          }
        });
      }
    }

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: `Player not found with BattleHub ID "${bhid}". Please verify and try again.`
      });
    }

    const docSnap = snapshot.docs[0];
    const userData = docSnap.data();

    return res.status(200).json({
      success: true,
      player: {
        userId: docSnap.id,
        unique_id: userData.unique_id || bhid,
        ign: userData.ign || userData.full_name || 'BattleHub Player',
        full_name: userData.full_name || '',
        avatar_url: userData.avatar_url || '',
        role: userData.role || 'user',
        verified: true
      }
    });
  } catch (error) {
    console.error('Error in /api/verifyPlayer:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
