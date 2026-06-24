import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, title, body } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Missing token, title, or body' });
  }

  try {
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
          return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT is missing from environment variables and serviceAccountKey.json was not found locally.' });
        }
      }

      initializeApp({
        credential: cert(serviceAccount)
      });
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: token,
    };

    const response = await getMessaging().send(message);
    return res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Error sending message', details: error.message });
  }
}
