import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
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

    // 1. Generate the custom Password Reset Link using Firebase Admin
    const actionCodeSettings = {
      // You can specify an action URL here if you have a custom page, 
      // otherwise it uses the default Firebase hosting URL which is fine.
      url: `https://battlehubff-8dbc7.firebaseapp.com/__/auth/action`
    };
    const resetLink = await getAuth().generatePasswordResetLink(email, actionCodeSettings);

    // 2. Prepare the Brevo Custom HTML Email
    const htmlContent = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);">
  <div style="background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); padding: 40px 20px; text-align: center;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee96b6cabd2c2d7af587d0/08567b05d_bf31fa0a1_logo.png" alt="BATTLEHUB FF" style="width: 90px; height: 90px; object-fit: cover; margin-bottom: 15px; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.4); border: 3px solid rgba(255,255,255,0.2);" />
    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.4); text-transform: uppercase;">BATTLEHUB FF</h1>
    <p style="margin: 12px 0 0 0; color: #e0f2fe; font-size: 17px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">🔐 PASSWORD RESET REQUEST</p>
  </div>
  <div style="padding: 35px 25px;">
    <p style="font-size: 17px; line-height: 1.6; margin-top: 0; color: #e2e8f0;">Hi <strong style="color: #38bdf8;">Warrior</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Someone requested a password reset for your BattleHub FF account. If this was you, please click the secure button below to set a new password.</p>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${resetLink}" style="background: linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; letter-spacing: 1px; display: inline-block; box-shadow: 0 4px 15px rgba(56, 189, 248, 0.4);">RESET PASSWORD</a>
    </div>

    <div style="background-color: #451a03; border-radius: 10px; padding: 20px; border: 1px solid #78350f; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
      <p style="margin: 0; color: #fde047; font-size: 14px; font-weight: 700; display: flex; align-items: center;">⚠️ SECURITY NOTICE:</p>
      <p style="margin: 8px 0 0 0; color: #fef08a; font-size: 14px; line-height: 1.6;">If you did not request a password reset, please ignore this email or contact support immediately. This link will expire securely in 24 hours.</p>
    </div>
  </div>
  <div style="background-color: #020617; padding: 25px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #1e293b;">
    <p style="margin: 0;">© ${new Date().getFullYear()} <strong style="color: #94a3b8;">BattleHub FF</strong>. All rights reserved.</p>
    <p style="margin: 6px 0 0 0;">Official Esports Tournament Platform</p>
  </div>
</div>
    `;

    // 3. Send email using Brevo
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = "notification@battlehubff.site"; 

    const brevoPayload = {
      sender: { name: "BATTLEHUB FF", email: senderEmail },
      to: [{ email: email }],
      subject: "🔐 Reset Your Password — BATTLEHUB FF",
      htmlContent: htmlContent
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(brevoPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo Error:", errorData);
      throw new Error("Failed to send custom email via Brevo");
    }

    return res.status(200).json({ success: true, message: 'Password reset link sent successfully via Brevo.' });
  } catch (error) {
    console.error('Error in sendPasswordReset:', error);
    return res.status(500).json({ error: 'Error sending reset email', details: error.message, stack: error.stack });
  }
}
