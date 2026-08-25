import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImageFile } from "./supabaseLiveService";

// Firebase Configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.storageBucket
);

let firebaseApp: any = null;
let firebaseStorage: any = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firebaseStorage = getStorage(firebaseApp);
  } catch (err) {
    console.warn("Failed to initialize Firebase app:", err);
  }
}

/**
 * Upload an image file directly to Firebase Cloud Storage.
 * Pre-compresses image client-side to ensure fast uploads.
 */
export async function uploadToFirebaseStorage(
  file: File,
  folder: "posts" | "avatars" | "events" = "posts"
): Promise<string | null> {
  if (!isFirebaseConfigured || !firebaseStorage) {
    return null;
  }

  try {
    // 1. Client-side image compression
    const { file: compressedFile } = await compressImageFile(file, 1400, 0.82);
    
    // 2. Create storage reference with timestamped unique name
    const ext = "jpg";
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const storageRef = ref(firebaseStorage, filename);

    // 3. Upload bytes
    const snapshot = await uploadBytes(storageRef, compressedFile, {
      contentType: "image/jpeg",
      cacheControl: "public,max-age=31536000",
    });

    // 4. Retrieve permanent public CDN download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err) {
    console.warn("Firebase Storage upload error:", err);
    return null;
  }
}
