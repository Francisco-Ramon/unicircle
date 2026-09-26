import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

/**
 * Firebase Configuration for UniCircle Platform
 * Loaded from Vite environment variables with robust fallbacks
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBBBSSZhhRIeZiX-_9yn6iPOYfBGR2SLIk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "unicircle-5d9cc.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "unicircle-5d9cc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "unicircle-5d9cc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "39665974829",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:39665974829:web:83ab5116356635fc54c2a4",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-YM6CHYEB77",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

export let app: FirebaseApp;
export let auth: Auth;
export let db: Firestore;
export let storage: FirebaseStorage;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Set browser local persistence for seamless cross-session login
  if (typeof window !== "undefined") {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("Firebase Auth persistence warning:", err);
    });
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { firebaseConfig };
