import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc, query, limit, updateDoc, addDoc } from "firebase/firestore";

// Copy firebase config from SaaS web
const firebaseConfig = {
  apiKey: "AIzaSyBPoUEVfjtAwT1A94vbJuI-ZS9z6AqhVsI",
  authDomain: "battlehubff-8dbc7.firebaseapp.com",
  databaseURL: "https://battlehubff-8dbc7-default-rtdb.firebaseio.com",
  projectId: "battlehubff-8dbc7",
  storageBucket: "battlehubff-8dbc7.firebasestorage.app",
  messagingSenderId: "957392257082",
  appId: "1:957392257082:web:f7fe3262688aa358d0b503",
  measurementId: "G-Q587ZV0N1Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncVideo() {
  console.log("Checking video_banners...");
  let videoData = null;

  try {
    const q1 = query(collection(db, "video_banners"), limit(5));
    const snap1 = await getDocs(q1);
    snap1.forEach(doc => {
      console.log("video_banners:", doc.id, doc.data());
      if (doc.data().active) videoData = doc.data();
    });
  } catch (e) { console.log("video_banners error:", e.message); }

  console.log("Checking website_videos...");
  try {
    const q2 = query(collection(db, "website_videos"), limit(5));
    const snap2 = await getDocs(q2);
    snap2.forEach(doc => {
      console.log("website_videos:", doc.id, doc.data());
      if (doc.data().active || !videoData) videoData = doc.data();
    });
  } catch (e) { console.log("website_videos error:", e.message); }

  if (videoData) {
    console.log("Found video:", videoData.video_url);
    console.log("Saving to app_settings...");
    
    const settingsRef = collection(db, "app_settings");
    const existing = await getDocs(query(settingsRef));
    let existingId = null;
    existing.forEach(d => {
      if (d.data().setting_key === "website_promo_video") existingId = d.id;
    });

    const newData = {
      setting_key: "website_promo_video",
      setting_value: videoData.video_url,
      video_type: videoData.video_type || "direct"
    };

    if (existingId) {
      await updateDoc(doc(db, "app_settings", existingId), newData);
    } else {
      await addDoc(collection(db, "app_settings"), newData);
    }
    console.log("Successfully synced video to app_settings!");
  } else {
    console.log("No video found to sync.");
  }
}

syncVideo();
