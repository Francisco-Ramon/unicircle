import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { compressImageFile } from "./supabaseLiveService";

// Firebase Configuration from environment variables with fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBBBSSZhhRIeZiX-_9yn6iPOYfBGR2SLIk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "unicircle-5d9cc.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "unicircle-5d9cc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "unicircle-5d9cc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "39665974829",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:39665974829:web:83ab5116356635fc54c2a4",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && (firebaseConfig.storageBucket || firebaseConfig.projectId)
);

export let firebaseApp: any = null;
export let firebaseStorage: any = null;
export let firebaseDb: any = null;
export let firebaseAuth: any = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firebaseStorage = getStorage(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    firebaseAuth = getAuth(firebaseApp);
  } catch (err) {
    console.warn("Failed to initialize Firebase:", err);
  }
}

/**
 * Upload an image file directly to Firebase Storage
 */
export async function uploadToFirebase(
  file: File,
  folder: "posts" | "avatars" | "events" = "posts"
): Promise<string | null> {
  if (!isFirebaseConfigured || !firebaseStorage) {
    return null;
  }

  try {
    const { file: compressedFile } = await compressImageFile(file, 1400, 0.82);
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
    const storageRef = ref(firebaseStorage, filename);

    const snapshot = await uploadBytes(storageRef, compressedFile, {
      contentType: "image/jpeg",
      cacheControl: "public,max-age=31536000",
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err) {
    console.warn("Firebase Storage upload error:", err);
    return null;
  }
}

/**
 * Publish post to Firebase Firestore
 */
export async function createFirestorePost(postData: {
  authorId: string;
  authorName: string;
  authorAvatar: string;
  campus: string;
  content: string;
  imageUrl?: string;
}): Promise<string | null> {
  if (!isFirebaseConfigured || !firebaseDb) return null;

  try {
    const docRef = await addDoc(collection(firebaseDb, "posts"), {
      ...postData,
      createdAt: serverTimestamp(),
      likesCount: 0,
      commentsCount: 0,
    });
    return docRef.id;
  } catch (err) {
    console.warn("Firestore post creation error:", err);
    return null;
  }
}
