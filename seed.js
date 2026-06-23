import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

async function seed() {
  try {
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, 'shopecdiv@gmail.com', '84543600');
      console.log("Logged in existing user!");
    } catch (err) {
      console.log("User not found or invalid credential, creating new user...");
      userCredential = await createUserWithEmailAndPassword(auth, 'shopecdiv@gmail.com', '84543600');
      console.log("Created new user!");
      
      // Add user to users collection to make them an admin
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: 'shopecdiv@gmail.com',
        full_name: 'Admin',
        role: 'admin',
        wallet_balance: 1000,
        diamonds_balance: 500,
        created_date: Date.now()
      });
      console.log("User added to users collection as Admin!");
    }

    const videoBannerRef = collection(db, 'video_banners');
    await addDoc(videoBannerRef, {
      video_url: "dQw4w9WgXcQ", 
      video_type: "youtube",
      active: true,
      created_date: Date.now()
    });
    console.log("Video banner added!");

    const bannersRef = collection(db, 'banners');
    await addDoc(bannersRef, {
      image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070",
      link_url: "",
      active: true,
      created_date: Date.now()
    });
    console.log("Banner added!");

    const announcementsRef = collection(db, 'announcements');
    await addDoc(announcementsRef, {
      title: "Welcome to BATTLEHUB FF!",
      message: "We have migrated to a new system!",
      priority: "High",
      active: true,
      show_on_home: true,
      created_date: Date.now()
    });
    console.log("Announcement added!");

    const tournamentsRef = collection(db, 'tournaments');
    await addDoc(tournamentsRef, {
      title: "Free Fire Grand Clash",
      game: "Free Fire",
      type: "Squad",
      entry_fee: 50,
      prize_pool: 1000,
      status: "Upcoming",
      start_time: Date.now() + 86400000,
      max_teams: 12,
      registered_teams: 0,
      created_date: Date.now()
    });
    console.log("Tournament added!");

    console.log("Seeding complete! You can exit.");
    process.exit(0);
  } catch (e) {
    console.error("Error seeding:", e);
    process.exit(1);
  }
}

seed();
