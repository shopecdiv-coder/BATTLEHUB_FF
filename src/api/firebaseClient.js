import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBPoUEVfjtAwT1A94vbJuI-ZS9z6AqhVsI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "battlehubff-8dbc7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "battlehubff-8dbc7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "battlehubff-8dbc7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "957392257082",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:957392257082:web:f7fe3262688aa358d0b503",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Q587ZV0N1Q"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Phase 6: Firebase App Check (reCAPTCHA v3)
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

if (typeof window !== "undefined" && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}

// Persistence temporarily disabled as it causes issues with large collections like Users
// enableIndexedDbPersistence(db).catch((err) => {
//   console.log("Firebase persistence error:", err.code);
// });
