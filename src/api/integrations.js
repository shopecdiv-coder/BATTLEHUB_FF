import { db } from './firebaseClient';
import { collection, addDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

import { uploadFileToAWS } from '@/utils/awsStorage';

// 1. UploadFile - Now uses AWS S3 globally
export const UploadFile = async ({ file, onProgress }) => {
  return new Promise(async (resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    try {
      const file_url = await uploadFileToAWS(file, onProgress);
      
      resolve({ file_url });
    } catch (error) {
      console.error("Upload error:", error);
      reject(error);
    }
  });
};

// 2. SendEmail - Queue email in a Firestore 'mail' collection (compatible with "Trigger Email" extension)
export const SendEmail = async ({ to, subject, body, html }) => {
  try {
    const colRef = collection(db, 'mail');
    await addDoc(colRef, {
      to,
      message: {
        subject,
        text: body,
        ...(html ? { html } : {})
      },
      created_date: new Date().toISOString()
    });
    return { success: true };
  } catch (e) {
    console.error("Error queueing email:", e);
    throw e;
  }
};

// 3. InvokeLLM - Client-side Gemini API call using free Developer Key or local fallback
export const InvokeLLM = async ({ prompt }) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is not defined. Using local fallback.");
    const query = prompt.toLowerCase();
    if (query.includes("tournament") || query.includes("tournaments") || query.includes("मैच") || query.includes("टूर्नामेंट")) {
      return "🏆 BattleHub FF me active tournaments check karne ke liye aap homepage par active section dekh sakte hain. Naye tournaments roz add hote hain!";
    }
    if (query.includes("support") || query.includes("help") || query.includes("मदद")) {
      return "💬 Aapko koi bhi help chahiye toh aap Support Section me jaakar ticket raise kar sakte hain, ya support team se WhatsApp/Email par contact kar sakte hain.";
    }
    if (query.includes("diamond") || query.includes("coin") || query.includes("पैसे")) {
      return "💎 Aap Wallet section me jaakar diamonds purchase kar sakte hain ya tournaments jeet kar diamonds earn kar sakte hain.";
    }
    return "👋 Main BATTLEHUB FF ka AI Assistant hoon. AI chat ko fully active karne ke liye, kripya `.env` me apni Gemini API Key (`VITE_GEMINI_API_KEY`) set karein.";
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "माफ़ कीजिये, मैं अभी जवाब नहीं दे पा रहा हूँ।";
  } catch (e) {
    console.error("Gemini API error:", e);
    return "Error: " + e.message;
  }
};

// 4. SendSMS - Mock placeholder function
export const SendSMS = async ({ phone, message }) => {
  console.log(`Mock SMS sent to ${phone}: ${message}`);
  return { success: true };
};

// 5. GenerateImage - Mock placeholder function
export const GenerateImage = async ({ prompt }) => {
  console.log(`Mock GenerateImage request: ${prompt}`);
  return { file_url: "https://placehold.co/600x400?text=Mock+AI+Image" };
};

// 6. ExtractDataFromUploadedFile - Mock placeholder function
export const ExtractDataFromUploadedFile = async ({ fileUrl }) => {
  console.log(`Mock ExtractDataFromUploadedFile request: ${fileUrl}`);
  return { success: true, text: "Mock extracted text data" };
};

// Compatibility export
export const Core = {
  UploadFile,
  SendEmail,
  InvokeLLM,
  SendSMS,
  GenerateImage,
  ExtractDataFromUploadedFile
};
