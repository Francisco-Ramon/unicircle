import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db, isFirebaseConfigured } from "./firebase";
import { getCurrentUser, getCurrentUid } from "./firebaseAuth";
import { safeSetItem } from "./safeStorage";
import { StudentProfileData } from "@/components/campus-connect/RegistrationWizard";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  nickname: string;
  username?: string;
  dob: string;
  gender: "Male" | "Female" | "Non-binary" | "Other";
  orientation: "Straight" | "Gay" | "Lesbian" | "Bisexual";
  interestedIn: "Female" | "Male" | "Everyone";
  relationshipGoal: "Dating" | "Friendship" | "Study Partner" | "Networking" | "Travel Buddy";
  country: string;
  university: string;
  campus: string;
  institutionId: string;
  faculty: string;
  course: string;
  yearOfStudy: string;
  height: string;
  lifestyle: { smoking: string; drinking: string; pets: string; religion: string };
  interests: string[];
  bio: string;
  photos: string[];
  photoURL?: string;
  verificationStatus: VerificationStatus;
  verified: boolean;
  isOnline: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Convert Firestore document data into StudentProfileData compatible with existing UI
 */
export function mapFirestoreToStudentProfile(data: any, uid: string): StudentProfileData {
  const firstName = data?.firstName || data?.first_name || (data?.displayName ? data.displayName.split(" ")[0] : "Student");
  const lastName = data?.lastName || data?.last_name || (data?.displayName ? data.displayName.split(" ").slice(1).join(" ") : "");
  const photos = Array.isArray(data?.photos) && data.photos.length > 0 
    ? data.photos 
    : (data?.photoURL ? [data.photoURL] : []);

  const isVerified = data?.verificationStatus === "verified" || data?.verified === true;

  return {
    id: uid,
    email: data?.email || "",
    firstName,
    lastName,
    nickname: data?.nickname || firstName,
    dob: data?.dob || "2003-01-01",
    gender: data?.gender || "Male",
    orientation: data?.orientation || "Straight",
    interestedIn: data?.interestedIn || "Everyone",
    relationshipGoal: data?.relationshipGoal || "Friendship",
    country: data?.country || "Kenya",
    institutionType: data?.institutionType || "University",
    campus: data?.campus || data?.university || "University of Nairobi",
    institutionId: data?.institutionId || "uon",
    faculty: data?.faculty || "General Studies",
    course: data?.course || "Undergraduate",
    yearOfStudy: data?.yearOfStudy || "1st Year (Freshman)",
    height: data?.height || "170 cm",
    lifestyle: data?.lifestyle || { smoking: "Non-smoker", drinking: "Social drinker", pets: "Pet lover", religion: "Other" },
    interests: Array.isArray(data?.interests) && data.interests.length > 0 ? data.interests : ["Campus Events", "Networking"],
    bio: data?.bio || "Verified student on UniCircle",
    photos,
    verified: isVerified,
  };
}

/**
 * Fetch a student profile by UID from Firestore
 */
export async function getUserProfile(uid: string): Promise<StudentProfileData | null> {
  if (!isFirebaseConfigured || !db || !uid) return null;

  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return mapFirestoreToStudentProfile(data, uid);
    }
  } catch (err: any) {
    console.warn(`Failed to fetch user profile for uid ${uid}:`, err?.message || err);
  }

  return null;
}

/**
 * Fetch the currently authenticated student profile from Firestore
 */
export async function getCurrentUserProfile(): Promise<StudentProfileData | null> {
  const uid = getCurrentUid();
  if (!uid) return null;
  return getUserProfile(uid);
}

/**
 * Create a new student profile in Firestore users/{uid}
 * Idempotent: Does not overwrite if already exists unless specified
 */
export async function createUserProfile(
  uid: string,
  profile: Partial<StudentProfileData>
): Promise<StudentProfileData> {
  if (!isFirebaseConfigured || !db || !uid) {
    throw new Error("Firestore is not initialized.");
  }

  const userDocRef = doc(db, "users", uid);
  const existingDoc = await getDoc(userDocRef);

  if (existingDoc.exists()) {
    return mapFirestoreToStudentProfile(existingDoc.data(), uid);
  }

  const firstName = (profile.firstName || "Student").trim();
  const lastName = (profile.lastName || "").trim();
  const displayName = `${firstName} ${lastName}`.trim();

  const firestoreData: Record<string, any> = {
    uid,
    email: profile.email || "",
    firstName,
    lastName,
    displayName,
    nickname: profile.nickname || firstName,
    dob: profile.dob || "2003-01-01",
    gender: profile.gender || "Male",
    orientation: profile.orientation || "Straight",
    interestedIn: profile.interestedIn || "Everyone",
    relationshipGoal: profile.relationshipGoal || "Friendship",
    country: profile.country || "Kenya",
    university: profile.campus || "University of Nairobi",
    campus: profile.campus || "University of Nairobi",
    institutionId: profile.institutionId || "uon",
    faculty: profile.faculty || "General Studies",
    course: profile.course || "Undergraduate",
    yearOfStudy: profile.yearOfStudy || "1st Year (Freshman)",
    height: profile.height || "170 cm",
    lifestyle: profile.lifestyle || { smoking: "Non-smoker", drinking: "Social drinker", pets: "Pet lover", religion: "Other" },
    interests: profile.interests || ["Campus Events", "Networking"],
    bio: profile.bio || `Verified student at ${profile.campus || "University of Nairobi"}`,
    photos: profile.photos || [],
    photoURL: profile.photos && profile.photos.length > 0 ? profile.photos[0] : "",
    verificationStatus: "unverified",
    verified: false,
    isOnline: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userDocRef, firestoreData, { merge: true });

  const resolved = mapFirestoreToStudentProfile(firestoreData, uid);

  if (typeof window !== "undefined") {
    safeSetItem("unicircle_user_id", uid);
    safeSetItem("unicircle_user_profile", JSON.stringify(resolved));
  }

  return resolved;
}

/**
 * Update an existing student profile in Firestore users/{uid}
 * Enforces client security: rejects updates to server-protected fields
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<StudentProfileData>
): Promise<StudentProfileData> {
  if (!isFirebaseConfigured || !db || !uid) {
    throw new Error("Firestore is not initialized.");
  }

  const currentUid = getCurrentUid();
  if (currentUid && currentUid !== uid) {
    throw new Error("Unauthorized: You can only edit your own student profile.");
  }

  const userDocRef = doc(db, "users", uid);

  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.firstName !== undefined) payload.firstName = updates.firstName.trim();
  if (updates.lastName !== undefined) payload.lastName = updates.lastName.trim();
  if (updates.firstName !== undefined || updates.lastName !== undefined) {
    const fName = (updates.firstName ?? "").trim();
    const lName = (updates.lastName ?? "").trim();
    payload.displayName = `${fName} ${lName}`.trim();
  }
  if (updates.nickname !== undefined) payload.nickname = updates.nickname.trim();
  if (updates.bio !== undefined) payload.bio = updates.bio.trim();
  if (updates.campus !== undefined) {
    payload.campus = updates.campus;
    payload.university = updates.campus;
  }
  if (updates.country !== undefined) payload.country = updates.country;
  if (updates.institutionId !== undefined) payload.institutionId = updates.institutionId;
  if (updates.faculty !== undefined) payload.faculty = updates.faculty;
  if (updates.course !== undefined) payload.course = updates.course.trim();
  if (updates.yearOfStudy !== undefined) payload.yearOfStudy = updates.yearOfStudy;
  if (updates.gender !== undefined) payload.gender = updates.gender;
  if (updates.orientation !== undefined) payload.orientation = updates.orientation;
  if (updates.interestedIn !== undefined) payload.interestedIn = updates.interestedIn;
  if (updates.relationshipGoal !== undefined) payload.relationshipGoal = updates.relationshipGoal;
  if (updates.lifestyle !== undefined) payload.lifestyle = updates.lifestyle;
  if (updates.interests !== undefined) payload.interests = updates.interests;
  if (updates.photos !== undefined) {
    payload.photos = updates.photos;
    if (updates.photos.length > 0) {
      payload.photoURL = updates.photos[0];
    }
  }

  await setDoc(userDocRef, payload, { merge: true });

  const updatedDoc = await getDoc(userDocRef);
  const resolved = mapFirestoreToStudentProfile(updatedDoc.data() || {}, uid);

  if (typeof window !== "undefined") {
    safeSetItem("unicircle_user_profile", JSON.stringify(resolved));
  }

  return resolved;
}

/**
 * Subscribe to real-time updates for a student profile
 */
export function subscribeToUserProfile(
  uid: string,
  onProfile: (profile: StudentProfileData | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured || !db || !uid) {
    onProfile(null);
    return () => {};
  }

  const userDocRef = doc(db, "users", uid);

  return onSnapshot(
    userDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const profile = mapFirestoreToStudentProfile(docSnap.data(), uid);
        onProfile(profile);
      } else {
        onProfile(null);
      }
    },
    (err) => {
      console.warn(`Firestore profile subscription warning for ${uid}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Ensure an authenticated Firebase user has a valid profile document in Firestore
 */
export async function ensureUserProfile(
  user: User,
  fallback?: Partial<StudentProfileData>
): Promise<StudentProfileData> {
  const existing = await getUserProfile(user.uid);
  if (existing) return existing;

  const displayNameParts = (user.displayName || "Student").split(" ");
  const firstName = fallback?.firstName || displayNameParts[0] || "Student";
  const lastName = fallback?.lastName || displayNameParts.slice(1).join(" ") || "";

  return createUserProfile(user.uid, {
    email: user.email || fallback?.email || "",
    firstName,
    lastName,
    photos: user.photoURL ? [user.photoURL] : (fallback?.photos || []),
    ...fallback,
  });
}
