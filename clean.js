import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Parse .env
const envPath = path.resolve('.env');
const envConfig = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) acc[key.trim()] = valueParts.join('=').trim().replace(//g, '');
  return acc;
}, {});

const firebaseConfig = {
  apiKey: envConfig.VITE_FIREBASE_API_KEY,
  authDomain: envConfig.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envConfig.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanParties() {
  console.log('Starting cleanup...');
  const snapshot = await getDocs(collection(db, 'parties'));
  for (const document of snapshot.docs) {
    const data = document.data();
    if (data.members && Array.isArray(data.members)) {
      const uniqueMembers = [...new Set(data.members)];
      if (uniqueMembers.length !== data.members.length) {
        console.log('Fixing duplicate members in party:', document.id);
        await updateDoc(doc(db, 'parties', document.id), { members: uniqueMembers });
      }
    }
  }
  console.log('Cleanup complete!');
  process.exit(0);
}
cleanParties();
