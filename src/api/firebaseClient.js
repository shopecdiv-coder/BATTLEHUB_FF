import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

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

export const auth = getAuth(app);
export const db = getFirestore(app);

// Persistence temporarily disabled as it causes issues with large collections like Users
// enableIndexedDbPersistence(db).catch((err) => {
//   console.log("Firebase persistence error:", err.code);
// });
