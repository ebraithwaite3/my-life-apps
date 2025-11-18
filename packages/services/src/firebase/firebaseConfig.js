// packages/services/src/firebase/firebaseConfig.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "calendarconnectionv2.firebaseapp.com",
  projectId: "calendarconnectionv2",
  storageBucket: "calendarconnectionv2.firebasestorage.app",
  messagingSenderId: "569488542917",
  appId: "1:569488542917:web:8dc010ea8924e1d8a5b4ac",
  measurementId: "G-4PHYJ1TPJM"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence
let auth;
const initializeAuth = async () => {
  // Return existing auth if already initialized
  if (auth) {
    console.log('✅ Auth already initialized, returning existing instance');
    return auth;
  }

  try {
    const authModule = await import('firebase/auth');
    
    try {
      auth = authModule.initializeAuth(app, {
        persistence: authModule.getReactNativePersistence(AsyncStorage)
      });
      console.log('✅ Auth initialized with AsyncStorage persistence');
    } catch (persistenceError) {
      // If auth already exists, just get it
      if (persistenceError.code === 'auth/already-initialized') {
        auth = authModule.getAuth(app);
        console.log('✅ Auth already existed, retrieved instance');
      } else {
        console.log('⚠️ Persistence failed, falling back to memory-only auth:', persistenceError.message);
        auth = authModule.getAuth(app);
        console.log('✅ Auth initialized with memory persistence');
      }
    }
    
    return auth;
  } catch (error) {
    console.error('❌ Auth initialization error:', error);
    throw error;
  }
};

// Initialize Firestore
let db;
const initializeFirestore = async () => {
  // Return existing db if already initialized
  if (db) {
    console.log('✅ Firestore already initialized, returning existing instance');
    return db;
  }

  try {
    const firestoreModule = await import('firebase/firestore');
    db = firestoreModule.getFirestore(app);
    console.log('✅ Firestore initialized');
    return db;
  } catch (error) {
    console.error('❌ Firestore initialization error:', error);
    throw error;
  }
};

// Export the initializers and app
export { initializeAuth, initializeFirestore, app };