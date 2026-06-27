import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '@/api/firebaseClient';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoadingAuth(true);
      setAuthError(null);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let profileData = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            full_name: firebaseUser.displayName || '',
            avatar_url: firebaseUser.photoURL || '',
            role: firebaseUser.email === 'shopecdiv@gmail.com' ? 'admin' : 'user',
            created_date: new Date().toISOString()
          };
          
          setUser(profileData);
          setIsAuthenticated(true);

          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            profileData = { ...profileData, ...docSnap.data() };
            
            if (!profileData.avatar_url && firebaseUser.photoURL) {
              profileData.avatar_url = firebaseUser.photoURL;
              await setDoc(userDocRef, { avatar_url: firebaseUser.photoURL }, { merge: true });
            }

            if (profileData.email === 'shopecdiv@gmail.com' && profileData.role !== 'admin') {
              profileData.role = 'admin';
              await setDoc(userDocRef, { role: 'admin' }, { merge: true });
            }
          } else {
            // Check if there is an imported profile by email
            const emailDocRef = doc(db, 'users', firebaseUser.email.toLowerCase());
            const emailSnap = await getDoc(emailDocRef);
            if (emailSnap.exists()) {
              profileData = { ...profileData, ...emailSnap.data(), id: firebaseUser.uid };
              await setDoc(userDocRef, profileData);
              
              // Migrate diamonds
              try {
                const dSnap = await getDocs(query(collection(db, 'diamonds'), where("user_id", "==", firebaseUser.email.toLowerCase())));
                for (const dDoc of dSnap.docs) {
                  await updateDoc(dDoc.ref, { user_id: firebaseUser.uid });
                }
              } catch (dErr) {
                console.error("Error migrating diamonds:", dErr);
              }

              // Delete the temporary email-indexed document
              await deleteDoc(emailDocRef);
            } else {
              if (profileData.email === 'shopecdiv@gmail.com') {
                profileData.role = 'admin';
              }
              await setDoc(userDocRef, profileData);
            }
          }
          
          const localFCM = localStorage.getItem('fcm_token');
          if (localFCM && profileData.fcm_token !== localFCM) {
             profileData.fcm_token = localFCM;
             await setDoc(userDocRef, { fcm_token: localFCM }, { merge: true });
          }
          
          setUser(profileData);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
        } catch (e) {
          console.error("Error loading user profile:", e);
          setAuthError({
            type: 'database_error',
            message: e.message || 'Failed to load user profile'
          });
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for late FCM token injections (e.g. from Android WebView bridge)
  useEffect(() => {
    const handleToken = async (e) => {
      const token = e.detail;
      if (user && user.id && user.fcm_token !== token) {
        try {
          const userDocRef = doc(db, 'users', user.id);
          await setDoc(userDocRef, { fcm_token: token }, { merge: true });
          setUser(prev => ({ ...prev, fcm_token: token }));
        } catch (err) {
          console.error("Failed to sync late FCM token:", err);
        }
      }
    };
    window.addEventListener('fcmTokenReceived', handleToken);
    return () => window.removeEventListener('fcmTokenReceived', handleToken);
  }, [user]);

  const logout = async (shouldRedirect = true) => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
      if (shouldRedirect) {
        window.location.href = '/';
      }
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const login = async (email, password) => {
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (e) {
      console.error("Login error:", e);
      throw e;
    }
  };

  const register = async (email, password, fullName) => {
    try {
      setAuthError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const profileData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        full_name: fullName,
        role: firebaseUser.email === 'shopecdiv@gmail.com' ? 'admin' : 'user',
        created_date: new Date().toISOString()
      };
      await setDoc(userDocRef, profileData);
      return true;
    } catch (e) {
      console.error("Registration error:", e);
      throw e;
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (e) {
      console.error("Reset password error:", e);
      throw e;
    }
  };

  const navigateToLogin = () => {
    // If auth is required, redirect to login page
    window.location.href = '/auth/login';
  };

  const reloadUser = async () => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        setUser(prev => ({ ...prev, ...docSnap.data() }));
      }
    } catch (e) {
      console.error("Failed to reload user", e);
    }
  };

  const checkAppState = async () => {
    return true;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      login,
      register,
      resetPassword,
      setUser,
      reloadUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
