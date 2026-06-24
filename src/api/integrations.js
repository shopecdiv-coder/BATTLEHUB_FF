import { db } from './firebaseClient';
import { collection, addDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// 1. UploadFile - Images to Base64 (direct to Firestore), Videos to Cloudinary
export const UploadFile = async ({ file }) => {
  return new Promise(async (resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    // --- IMAGES: Base64 Compression ---
    if (file.type.startsWith('image/')) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress as JPEG at 70% quality to save Firestore space
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve({ file_url: dataUrl });
          };
          img.onerror = () => reject(new Error("Image processing failed"));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsDataURL(file);
      } catch (err) {
        reject(err);
      }
      return; // Stop here for images
    }

    // --- VIDEOS: Cloudinary Upload ---
    try {
      const cloudName = "didrpegpv";
      const apiKey = "152364715435361";
      const apiSecret = "lF9Ql4CAQMo35ScTgmSgvRCAAyc";
      
      const timestamp = Math.round((new Date).getTime() / 1000);
      
      const strToSign = `timestamp=${timestamp}${apiSecret}`;
      const signature = CryptoJS.SHA1(strToSign).toString(CryptoJS.enc.Hex);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);

      const resourceType = "auto";

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      
      if (result.secure_url) {
        resolve({ file_url: result.secure_url });
      } else {
        console.error("Cloudinary upload failed", result);
        reject(new Error(result.error?.message || "Upload failed"));
      }
    } catch (e) {
      console.error("Error uploading to Cloudinary:", e);
      reject(e);
    }
  });
};

// 2. SendEmail - Queue email in a Firestore 'mail' collection (compatible with "Trigger Email" extension)
export const SendEmail = async ({ to, subject, body }) => {
  try {
    const colRef = collection(db, 'mail');
    await addDoc(colRef, {
      to,
      message: {
        subject,
        text: body
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
