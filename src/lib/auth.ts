import { useEffect, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthChange, signOutStudent, getCurrentUser } from "./firebaseAuth";

export interface AuthState {
  user: FirebaseUser | null;
  uid: string | null;
  email: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  // Session object for compatibility
  session: { user: FirebaseUser } | null;
}

/**
 * Universal React Hook for Firebase Authentication State
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<FirebaseUser | null>(() => getCurrentUser());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    user,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    loading,
    isAuthenticated: Boolean(user),
    session: user ? { user } : null,
  };
}

/**
 * Global Student Sign-Out
 */
export async function signOutUser(): Promise<void> {
  await signOutStudent();
}
