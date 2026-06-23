import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

async function cleanAndSeed() {
  try {
    await signInWithEmailAndPassword(auth, 'shopecdiv@gmail.com', '84543600');
    console.log("Logged in!");

    // Clean old tournaments
    const tournamentsRef = collection(db, 'tournaments');
    const snap = await getDocs(tournamentsRef);
    for (const docSnap of snap.docs) {
      await deleteDoc(doc(db, 'tournaments', docSnap.id));
      console.log(`Deleted tournament ${docSnap.id}`);
    }

    // Clean old video banners
    const vbRef = collection(db, 'video_banners');
    const vbSnap = await getDocs(vbRef);
    for (const docSnap of vbSnap.docs) {
      await deleteDoc(doc(db, 'video_banners', docSnap.id));
    }

    // Clean old banners
    const bRef = collection(db, 'banners');
    const bSnap = await getDocs(bRef);
    for (const docSnap of bSnap.docs) {
      await deleteDoc(doc(db, 'banners', docSnap.id));
    }

    // Clean old announcements
    const aRef = collection(db, 'announcements');
    const aSnap = await getDocs(aRef);
    for (const docSnap of aSnap.docs) {
      await deleteDoc(doc(db, 'announcements', docSnap.id));
    }

    // Insert corrected data
    await addDoc(vbRef, {
      video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 
      video_type: "youtube",
      active: true,
      created_date: Date.now()
    });
    console.log("Added valid Video banner");

    await addDoc(bRef, {
      image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070",
      link_url: "",
      active: true,
      created_date: Date.now()
    });
    console.log("Added valid Banner");

    await addDoc(aRef, {
      title: "Welcome to BATTLEHUB FF!",
      message: "We have migrated to a new system!",
      priority: "High",
      active: true,
      show_on_home: true,
      created_date: Date.now()
    });
    console.log("Added valid Announcement");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await addDoc(tournamentsRef, {
      title: "Free Fire Grand Clash",
      game: "Free Fire",
      mode: "Squad",
      tournament_type: "Qualifier",
      entry_fee: 50,
      prize_pool: 1000,
      status: "Upcoming",
      date_time: tomorrow.toISOString(), // Correct date_time ISO string
      registration_closes: tomorrow.toISOString(),
      max_teams: 12,
      registered_teams: 0,
      map: "Bermuda",
      created_date: Date.now()
    });
    console.log("Added corrected Tournament!");

    console.log("Re-seeding complete!");
    process.exit(0);
  } catch (e) {
    console.error("Error re-seeding:", e);
    process.exit(1);
  }
}

cleanAndSeed();
