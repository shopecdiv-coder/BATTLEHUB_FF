// BATTLEHUB FF — Base44 Data Upload Script
// Run with: node upload-base44-data.mjs <collection_name> <path_to_json_file>
// Example: node upload-base44-data.mjs tournaments data/tournaments.json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc, collection } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration (matching seed/import scripts)
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
const db = getFirestore(app);

async function uploadData() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("❌ Error: Missing arguments.");
    console.log("Usage: node upload-base44-data.mjs <firestore_collection_name> <path_to_json_file>");
    console.log("Example: node upload-base44-data.mjs tournaments ./tournaments.json");
    process.exit(1);
  }

  const collectionName = args[0];
  const filePath = path.resolve(args[1]);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at ${filePath}`);
    process.exit(1);
  }

  console.log(`📖 Reading data from ${filePath}...`);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  let dataList;

  try {
    dataList = JSON.parse(rawData);
    if (!Array.isArray(dataList)) {
      // If it's a single object, wrap it in an array
      dataList = [dataList];
    }
  } catch (err) {
    console.error(`❌ Error parsing JSON:`, err.message);
    process.exit(1);
  }

  console.log(`🚀 Starting upload of ${dataList.length} items to collection '${collectionName}'...`);

  // Firestore allows up to 500 operations per batch write
  const BATCH_LIMIT = 500;
  let batch = writeBatch(db);
  let count = 0;
  let successCount = 0;

  for (const item of dataList) {
    // Determine document ID. If item has an 'id' or '_id', use it, otherwise Firestore generates one.
    const docId = item.id || item._id;
    
    // Clean up internal JSON properties if any
    const uploadItem = { ...item };
    delete uploadItem.id;
    delete uploadItem._id;
    if (!uploadItem.created_date) {
      uploadItem.created_date = new Date().toISOString();
    }

    let docRef;
    if (docId) {
      docRef = doc(db, collectionName, String(docId));
      batch.set(docRef, uploadItem, { merge: true });
    } else {
      // Auto-generate doc ref with ID
      docRef = doc(collection(db, collectionName));
      batch.set(docRef, uploadItem);
    }

    count++;

    if (count >= BATCH_LIMIT) {
      console.log(`📤 Committing batch of ${count} items...`);
      await batch.commit();
      successCount += count;
      batch = writeBatch(db);
      count = 0;
    }
  }

  // Commit remaining items
  if (count > 0) {
    console.log(`📤 Committing final batch of ${count} items...`);
    await batch.commit();
    successCount += count;
  }

  console.log(`\n======================================`);
  console.log(`🎉 Upload Finished!`);
  console.log(`✅ Successfully uploaded ${successCount} items to '${collectionName}'`);
  console.log(`======================================\n`);
}

uploadData().catch(err => {
  console.error("❌ Fatal Upload Error:", err);
  process.exit(1);
});
