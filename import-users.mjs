// BATTLEHUB FF — CSV User Import Script
// Run with: node import-users.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration (matching seed script)
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

const now = new Date().toISOString();

// Helper to parse a simple CSV line (handling quotes/commas)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, '').trim());
}

async function runImport() {
  let csvPath = path.join(__dirname, 'users.csv.csv');
  if (!fs.existsSync(csvPath)) {
    csvPath = path.join(__dirname, 'users.csv');
  }
  if (!fs.existsSync(csvPath)) {
    console.log(`ℹ️ 'users.csv' not found. Falling back to template 'users_template.csv'...`);
    csvPath = path.join(__dirname, 'users_template.csv');
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: Neither 'users.csv' nor 'users_template.csv' exists.`);
    process.exit(1);
  }

  console.log(`📖 Reading CSV file from: ${csvPath}`);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length <= 1) {
    console.error(`❌ CSV file is empty or only contains headers.`);
    process.exit(1);
  }

  const headers = parseCSVLine(lines[0]);
  console.log('📋 Detected Headers:', headers);

  let successCount = 0;
  let errorCount = 0;

  const CONCURRENCY_LIMIT = 50;
  let activePromises = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    // Map row values to keys based on headers
    const rawData = {};
    headers.forEach((header, index) => {
      rawData[header.toLowerCase().trim()] = row[index] || '';
    });

    const email = rawData.email;
    if (!email || !email.includes('@')) {
      console.warn(`⚠️ Row ${i + 1} skipped: invalid or missing email (${email || 'None'})`);
      errorCount++;
      continue;
    }

    const emailKey = email.toLowerCase().trim();
    const currentIndex = i;

    const importTask = (async () => {
      try {
        // 1. Prepare User Data
        const userData = {
          email: emailKey,
          full_name: rawData.full_name || rawData.name || 'BattleHub User',
          ign: rawData.ign || '',
          game_uid: rawData.game_uid || rawData.uid || '',
          wallet_balance: parseFloat(rawData.wallet_balance || '0') || 0,
          unique_id: rawData.unique_id || `BH${Math.floor(100000 + Math.random() * 900000)}`,
          rank: rawData.rank || 'Bronze',
          mobile_number: rawData.mobile_number || rawData.phone || '',
          role: rawData.role || 'user',
          created_date: now
        };

        // Set user record under lowercased email ID
        const userRef = doc(db, 'users', emailKey);
        const p1 = setDoc(userRef, userData);

        // 2. Prepare Diamond Balance Data
        const diamondBal = parseInt(rawData.diamond_balance || '0') || 0;
        const bhCoinBal = parseInt(rawData.bh_coin_balance || '0') || 0;

        const diamondData = {
          user_id: emailKey,
          user_ign: userData.ign || userData.full_name,
          diamond_balance: diamondBal,
          bh_coin_balance: bhCoinBal,
          transactions: [
            {
              type: "Credit",
              coin_type: "Diamond",
              amount: diamondBal,
              description: "🎉 CSV Import Initial Balance",
              timestamp: now
            },
            {
              type: "Credit",
              coin_type: "BH Coin",
              amount: bhCoinBal,
              description: "🪙 CSV Import Initial Balance",
              timestamp: now
            }
          ],
          created_date: now
        };

        // Generate a unique doc ID for the diamond record, but associate it with the emailKey user_id
        const diamondRef = doc(db, 'diamonds', `imported_${emailKey.replace(/[@.]/g, '_')}`);
        const p2 = setDoc(diamondRef, diamondData);

        await Promise.all([p1, p2]);

        console.log(`✅ [${currentIndex}/${lines.length - 1}] Imported: ${emailKey} | Wallet: ₹${userData.wallet_balance} | Diamonds: ${diamondBal} | BH Coins: ${bhCoinBal}`);
        successCount++;
      } catch (err) {
        console.error(`❌ Row ${currentIndex + 1} (${emailKey}) failed to import:`, err.message);
        errorCount++;
      }
    })();

    activePromises.push(importTask);

    if (activePromises.length >= CONCURRENCY_LIMIT || i === lines.length - 1) {
      await Promise.all(activePromises);
      activePromises = [];
    }
  }

  // Double check any remaining active promises
  if (activePromises.length > 0) {
    await Promise.all(activePromises);
  }

  console.log('\n======================================');
  console.log(`🎉 Import Finished!`);
  console.log(`✅ Success: ${successCount} users imported`);
  console.log(`❌ Failures/Skipped: ${errorCount}`);
  console.log('======================================\n');
}

runImport().catch(err => {
  console.error("❌ Fatal Import Error:", err);
  process.exit(1);
});
