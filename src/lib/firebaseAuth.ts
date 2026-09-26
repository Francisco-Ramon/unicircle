import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User,
  UserCredential,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import { safeSetItem } from "./safeStorage";

export interface AuthStudentUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Universal error message translator for Firebase Auth error codes
 */
export function getFirebaseAuthErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  const code = error?.code || (typeof error === "string" ? error : "");
  const msg = error?.message || "";

  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email address already exists. Please sign in instead.";
    case "auth/invalid-email":
      return "Please enter a valid university email address.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/user-not-found":
      return "No student account found with this email. Please create an account.";
    case "auth/wrong-password":
      return "Incorrect password. Please verify your credentials and try again.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please verify and try again.";
    case "auth/user-disabled":
      return "This student account has been disabled. Please contact campus support.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network connection failed. Please check your internet connection.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is not enabled in Firebase Authentication Console. Please enable it under Sign-in method.";
    case "auth/invalid-api-key":
      return "Invalid Firebase API key. Please check your environment variables.";
    default:
      if (typeof msg === "string" && msg.length > 0) {
        // Strip out Firebase internal code prefix if present (e.g., "Firebase: Error (auth/invalid-credential).")
        const clean = msg.replace(/^Firebase:\s*/i, "").replace(/\s*\(auth\/[^)]+\)\.?/i, "");
        return clean || "Authentication failed. Please try again.";
      }
      return "Authentication error. Please try again.";
  }
}

/**
 * Register a new student using Firebase Authentication
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<UserCredential> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Authentication is not configured.");
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);

  if (displayName && credential.user) {
    try {
      await updateProfile(credential.user, {
        displayName: displayName.trim(),
      });
    } catch (err) {
      console.warn("Failed to set display name on auth profile:", err);
    }
  }

  if (typeof window !== "undefined" && credential.user) {
    safeSetItem("unicircle_user_id", credential.user.uid);
    safeSetItem("unicircle_registered", "true");
  }

  return credential;
}

/**
 * Sign in an existing student using Firebase Authentication
 */
export async function signInWithEmail(email: string, pass: string): Promise<UserCredential> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Authentication is not configured.");
  }

  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);

  if (typeof window !== "undefined" && credential.user) {
    safeSetItem("unicircle_user_id", credential.user.uid);
    safeSetItem("unicircle_registered", "true");
  }

  return credential;
}

/**
 * Sign out student and cleanly purge local auth cache
 */
export async function signOutStudent(): Promise<void> {
  try {
    if (auth) {
      await signOut(auth);
    }
  } catch (err) {
    console.warn("Firebase sign out warning:", err);
  }

  if (typeof window !== "undefined") {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("firebase:") || k.startsWith("unicircle_") || k.startsWith("sb-"))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Authentication is not configured.");
  }
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Reactive Auth State Listener
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth?.currentUser || null;
}

/**
 * Get current authenticated canonical UID
 */
export function getCurrentUid(): string | null {
  return auth?.currentUser?.uid || null;
}
