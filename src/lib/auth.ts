import { useEffect, useState } from "react";

export interface StudentAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: StudentAuthUser | null;
  uid: string | null;
  email: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  session: { user: StudentAuthUser } | null;
}

function getStoredClientUser(): StudentAuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const profStr = localStorage.getItem("unicircle_user_profile");
    const uid = localStorage.getItem("unicircle_user_id");
    if (profStr) {
      const prof = JSON.parse(profStr);
      if (prof && (prof.firstName || prof.email)) {
        return {
          uid: prof.id || uid || "client_student",
          email: prof.email || null,
          displayName: `${prof.firstName || "Student"} ${prof.lastName || ""}`.trim(),
          photoURL: prof.photos?.[0] || null,
        };
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Universal React Hook for Client-Side Student Authentication State
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<StudentAuthUser | null>(() => getStoredClientUser());
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getStoredClientUser());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
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
  if (typeof window !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("unicircle_") || k.startsWith("firebase:") || k.startsWith("sb-"))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  }
}
