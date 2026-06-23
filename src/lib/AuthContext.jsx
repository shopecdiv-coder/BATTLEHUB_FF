import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '@/api/firebaseClient';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
          const docSnap = await getDoc(userDocRef);
          
          let profileData = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'user',
            created_date: new Date().toISOString()
          };

          if (docSnap.exists()) {
            profileData = { ...profileData, ...docSnap.data() };
            if (profileData.email === 'shopecdiv@gmail.com' && profileData.role !== 'admin') {
              profileData.role = 'admin';
              await setDoc(userDocRef, { role: 'admin' }, { merge: true });
            }
          } else {
            if (profileData.email === 'shopecdiv@gmail.com') {
              profileData.role = 'admin';
            }
            await setDoc(userDocRef, profileData);
          }
          
          setUser(profileData);
          setIsAuthenticated(true);
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
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

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

  const navigateToLogin = () => {
    // If auth is required, redirect to login page
    window.location.href = '/auth/login';
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
      register
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
