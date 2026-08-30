import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '@/api/firebaseClient';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
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
            emailVerified: firebaseUser.emailVerified,
            full_name: firebaseUser.displayName || '',
            avatar_url: firebaseUser.photoURL || '',
            role: firebaseUser.email === 'shopecdiv@gmail.com' ? 'admin' : 'user',
            created_date: new Date().toISOString()
          };
          
          setUser(profileData);
          setIsAuthenticated(true);

          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            profileData = { ...profileData, ...docSnap.data(), emailVerified: firebaseUser.emailVerified };
            
            if (firebaseUser.photoURL && profileData.avatar_url !== firebaseUser.photoURL) {
              const currentAvatar = profileData.avatar_url || '';
              if (!currentAvatar || currentAvatar.includes('googleusercontent.com') || currentAvatar.includes('githubusercontent.com') || currentAvatar.includes('dicebear.com')) {
                profileData.avatar_url = firebaseUser.photoURL;
                await setDoc(userDocRef, { avatar_url: firebaseUser.photoURL }, { merge: true });
              }
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
              await setDoc(userDocRef, profileData, { merge: true });
              
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
              await setDoc(userDocRef, profileData, { merge: true });
            }
          }
          
          const localFCM = localStorage.getItem('fcm_token');
          if (localFCM && profileData.fcm_token !== localFCM) {
             profileData.fcm_token = localFCM;
             await setDoc(userDocRef, { fcm_token: localFCM }, { merge: true });
          }
          
          // Set Online status on login
          profileData.activity_status = 'Online';
          const updateData = { activity_status: 'Online', last_active: new Date().toISOString() };
          
          // Daily Login XP & Streak
          const today = new Date().toISOString().split('T')[0];
          const lastLoginStr = profileData.last_login_date || '';
          if (lastLoginStr !== today) {
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterday = yesterdayDate.toISOString().split('T')[0];
            
            let newStreak = (lastLoginStr === yesterday) ? (profileData.login_streak || 0) + 1 : 1;
            let xpToAdd = 20; // Base daily login XP
            
            if (newStreak >= 7) {
              xpToAdd += 150; // 7-day streak bonus
              newStreak = 0;  // Reset after claiming bonus
            }
            
            const { increment } = await import('firebase/firestore');
            updateData.last_login_date = today;
            updateData.login_streak = newStreak;
            updateData.xp = increment(xpToAdd);
            
            profileData.xp = (profileData.xp || 0) + xpToAdd;
            profileData.login_streak = newStreak;
            profileData.last_login_date = today;
          }
          
          // Ensure every user has a permanent 9-digit unique_id
          if (!profileData.unique_id || profileData.unique_id.length < 11) {
            const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
            const newUid = `BH${randomDigits}`;
            profileData.unique_id = newUid;
            updateData.unique_id = newUid;
          }
          
          await setDoc(userDocRef, updateData, { merge: true });
          
          // Auto-Reputation Logic (Every 12 Days +0.1)
          try {
            const currentRep = profileData.reputation_score !== undefined ? profileData.reputation_score : 5.0;
            if (currentRep < 5.0) {
              const now = new Date();
              const lastRegenStr = profileData.last_reputation_regen_date || profileData.created_date || new Date(0).toISOString();
              const lastRegenDate = new Date(lastRegenStr);
              const daysSinceLastRegen = (now - lastRegenDate) / (1000 * 60 * 60 * 24);

              if (daysSinceLastRegen >= 12) {
                const twelveDaysAgo = new Date(now.getTime() - (12 * 24 * 60 * 60 * 1000)).toISOString();
                
                const qLogs = query(
                  collection(db, 'reputation_logs'),
                  where('user_id', '==', firebaseUser.uid)
                );
                
                const repLogsSnap = await getDocs(qLogs);
                const hasRecentNegative = repLogsSnap.docs.some(d => {
                  const data = d.data();
                  return data.type === 'negative' && (data.timestamp || '') >= twelveDaysAgo;
                });
                
                if (!hasRecentNegative) {
                  // Auto-increase!
                  const newRep = Math.min(5.0, Number((currentRep + 0.1).toFixed(1)));
                  
                  const { ReputationLog } = await import('@/api/entities');
                  await ReputationLog.create({
                    user_id: firebaseUser.uid,
                    reporter_id: 'system',
                    reason: 'Good Behavior (Auto)',
                    change_amount: Number((newRep - currentRep).toFixed(1)),
                    type: 'positive',
                    timestamp: now.toISOString()
                  });
                  
                  profileData.reputation_score = newRep;
                  profileData.last_reputation_regen_date = now.toISOString();
                  
                  await setDoc(userDocRef, { 
                    reputation_score: newRep, 
                    last_reputation_regen_date: now.toISOString() 
                  }, { merge: true });
                } else {
                  // Had a recent negative report, reset timer
                  profileData.last_reputation_regen_date = now.toISOString();
                  await setDoc(userDocRef, { last_reputation_regen_date: now.toISOString() }, { merge: true });
                }
              }
            }
          } catch(err) {
            console.error("Auto-Reputation Error:", err);
          }

          setUser(profileData);
          setIsAuthenticated(true);
        } catch (e) {
          console.error("Error loading user profile:", e);
          setAuthError({
            type: 'database_error',
            message: e.message || 'Failed to load user profile'
          });
        } finally {
          setIsLoadingAuth(false);
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

  // Online/Offline presence logic based on visibility and app closing
  useEffect(() => {
    if (!user || !user.id) return;

    const setStatus = async (status) => {
      try {
        await updateDoc(doc(db, 'users', user.id), { activity_status: status, last_active: new Date().toISOString() });
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setStatus('Offline');
      } else {
        setStatus('Online');
      }
    };

    const handleBeforeUnload = () => {
      setStatus('Offline');
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Heartbeat: update last_active every 3 minutes while the app is visible
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setStatus('Online');
      }
    }, 3 * 60 * 1000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeatInterval);
    };
  }, [user?.id]);

  const logout = async (shouldRedirect = true) => {
    try {
      if (user && user.id) {
        await updateDoc(doc(db, 'users', user.id), { activity_status: 'Offline' }).catch(console.error);
      }
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
      
      // Send verification email
      await sendEmailVerification(firebaseUser);
      
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
      await auth.currentUser.reload(); // Reload Firebase auth state to update emailVerified
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        setUser(prev => ({ 
          ...prev, 
          ...docSnap.data(), 
          emailVerified: auth.currentUser.emailVerified 
        }));
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
