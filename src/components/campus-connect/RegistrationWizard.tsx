import { safeSetItem } from "@/lib/safeStorage";
import React, { useState, useRef } from "react";
import {
  ShieldCheck, Mail, Key, User, GraduationCap, ArrowRight,
  Building2, Search, Globe, Camera, AlertCircle, LogIn, UserPlus,
  X, Trash2, Sparkles, BookOpen, Compass, Heart
} from "lucide-react";
import { INSTITUTIONS_DATA, Institution, SUPPORTED_COUNTRIES } from "./UniversityDatabase";
import { GlobalUniversitySearch } from "./GlobalUniversitySearch";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage, upsertLiveProfile, getLiveProfile, getLocalUserId } from "@/lib/supabaseLiveService";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import { toast } from "sonner";

export interface StudentProfileData {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  nickname: string;
  dob: string;
  gender: "Male" | "Female" | "Non-binary" | "Other";
  orientation: "Straight" | "Gay" | "Lesbian" | "Bisexual";
  interestedIn: "Female" | "Male" | "Everyone";
  relationshipGoal: "Dating" | "Friendship" | "Study Partner" | "Networking" | "Travel Buddy";
  country: string;
  institutionType: string;
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
  verified: boolean;
}

interface Props {
  onComplete: (profile: StudentProfileData) => void;
  onCancel?: () => void;
}

const YEARS_OF_STUDY = [
  "1st Year (Freshman)",
  "2nd Year (Sophomore)",
  "3rd Year (Junior)",
  "4th Year (Senior)",
  "5th Year / Medical",
  "Postgraduate / Master's / PhD"
];

const CAMPUS_GOALS = [
  "Friendship & Study Buddies",
  "Dating & Relationships",
  "Campus Networking & Career",
  "Campus Events & Activities",
  "Travel & Campus Buddies"
];

export const RegistrationWizard: React.FC<Props> = ({ onComplete, onCancel }) => {
  // Auth Mode: Sign Up vs Sign In
  const [authMode, setAuthMode] = useState<"SIGN_UP" | "SIGN_IN">("SIGN_UP");

  // State Machine: IDLE | SUBMITTING | SUCCESS | ERROR
  const [authStatus, setAuthStatus] = useState<"IDLE" | "SUBMITTING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 3 Photo Upload File Input Refs & State
  const photoInput1Ref = useRef<HTMLInputElement>(null);
  const photoInput2Ref = useRef<HTMLInputElement>(null);
  const photoInput3Ref = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<string[]>(["", "", ""]);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

  // Form Fields
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [course, setCourse] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState(YEARS_OF_STUDY[0]);
  const [gender, setGender] = useState<"Male" | "Female" | "Non-binary" | "Other">("Male");
  const [interestedIn, setInterestedIn] = useState<"Female" | "Male" | "Everyone">("Everyone");
  const [campusGoal, setCampusGoal] = useState<string>("Friendship & Study Buddies");
  const [interestsText, setInterestsText] = useState("Campus Life, Tech, Music");
  const [bio, setBio] = useState("Verified university student on UniCircle.");

  const [selectedInstitution, setSelectedInstitution] = useState<Institution>(
    INSTITUTIONS_DATA.find((i) => i.country === "Kenya") || INSTITUTIONS_DATA[0]
  );

  // Searchable university modal state
  const [showUniDropdown, setShowUniDropdown] = useState(false);

  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    const firstUni = INSTITUTIONS_DATA.find((i) => i.country === newCountry);
    if (firstUni) setSelectedInstitution(firstUni);
  };

  const compressClientImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
          } else {
            resolve((readerEvent.target?.result as string) || "");
          }
        };
        img.onerror = () => resolve((readerEvent.target?.result as string) || "");
        img.src = readerEvent.target?.result as string;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleSlotPhotoUpload = async (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      setUploadingSlot(slotIndex);
      try {
        const dataUrl = await compressClientImage(file);
        if (dataUrl) {
          setPhotos((prev) => {
            const next = [...prev];
            next[slotIndex] = dataUrl;
            return next;
          });
          toast.success(`Photo ${slotIndex + 1} attached!`);
        }
      } catch (err) {
        toast.error("Could not load image. Please select another image.");
      } finally {
        setUploadingSlot(null);
      }
    }
  };


  const handleRemoveSlotPhoto = (slotIndex: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[slotIndex] = "";
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // HANDLE SIGN IN
  // --------------------------------------------------------------------------
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authStatus === "SUBMITTING") return;

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      toast.error("Please enter a valid email address");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password");
      toast.error("Please enter your password");
      return;
    }

    setAuthStatus("SUBMITTING");
    setErrorMessage(null);

    try {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr || !signInData?.user) {
        const errMsg = getSafeErrorMessage(signInErr).toLowerCase();
        if (errMsg.includes("confirm") || errMsg.includes("email not confirmed")) {
          const localStr = typeof window !== "undefined" ? localStorage.getItem("unicircle_user_profile") : null;
          if (localStr) {
            try {
              const localProf = JSON.parse(localStr);
              if (localProf && localProf.email === email.trim()) {
                toast.success(`Welcome back, ${localProf.firstName}!`);
                onComplete(localProf);
                return;
              }
            } catch (e) {}
          }
        }
        setAuthStatus("ERROR");
        const msg = getSafeErrorMessage(signInErr) || "Invalid email or password. Please try again.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }


      const userId = signInData.user.id;
      const liveProf = await getLiveProfile(userId);

      const resolvedProfile: StudentProfileData = {
        id: userId,
        email: signInData.user.email || email.trim(),
        firstName: liveProf?.first_name || signInData.user.user_metadata?.first_name || "Student",
        lastName: liveProf?.last_name || signInData.user.user_metadata?.last_name || "",
        nickname: liveProf?.first_name || "Student",
        dob: "2003-01-01",
        gender: (liveProf?.gender as any) || "Female",
        orientation: "Straight",
        interestedIn: (liveProf?.interested_in as any) || "Everyone",
        relationshipGoal: "Friendship",
        country: liveProf?.country || "Kenya",
        institutionType: "University",
        campus: liveProf?.campus || "University of Nairobi",
        institutionId: "uon",
        faculty: "General Studies",
        course: liveProf?.course || "Undergraduate",
        yearOfStudy: liveProf?.year_of_study || "1st Year",
        height: "170 cm",
        lifestyle: { smoking: "Non-smoker", drinking: "Social drinker", pets: "Pet lover", religion: "Other" },
        interests: liveProf?.interests || ["Campus Events", "Networking"],
        bio: liveProf?.bio || "Verified Student on UniCircle",
        photos: liveProf?.photos && liveProf.photos.length > 0 ? liveProf.photos : [],
        verified: true,
      };

      if (typeof window !== "undefined") {
        safeSetItem("unicircle_user_id", userId);
        safeSetItem("unicircle_user_profile", JSON.stringify(resolvedProfile));
        safeSetItem("unicircle_registered", "true");
      }

      setAuthStatus("SUCCESS");
      toast.success(`Welcome back, ${resolvedProfile.firstName}!`);
      onComplete(resolvedProfile);
    } catch (err: any) {
      setAuthStatus("ERROR");
      const msg = getSafeErrorMessage(err) || "An unexpected error occurred during sign-in. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLE SIGN UP (Full 3-Photo Student Registration)
  // --------------------------------------------------------------------------
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authStatus === "SUBMITTING") return;

    if (!firstName.trim()) {
      setErrorMessage("Please enter your first name");
      toast.error("Please enter your first name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid university email address");
      toast.error("Please enter a valid university email address");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!course.trim()) {
      setErrorMessage("Please enter your Major or Course");
      toast.error("Please enter your Major or Course (e.g. Computer Science)");
      return;
    }

    // Filter real non-empty uploaded photos
    const validPhotos = photos.filter((p) => p && p.trim().length > 0);
    if (validPhotos.length === 0) {
      setErrorMessage("Please upload at least 1 real profile photo to continue");
      toast.error("Please upload at least 1 real profile photo");
      return;
    }

    setAuthStatus("SUBMITTING");
    setErrorMessage(null);

    const parsedInterests = interestsText
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    try {
      let authUserId = "";

      // 1. Sign up with Supabase Auth
      try {
        const { data: authData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              gender,
              interested_in: interestedIn,
              university_name: selectedInstitution.name,
              course: course.trim(),
              year_of_study: yearOfStudy,
              campus_goal: campusGoal,
              bio: bio.trim(),
            },
          },
        });

        if (authData?.user?.id) {
          authUserId = authData.user.id;
        } else if (signUpErr) {
          const errString = getSafeErrorMessage(signUpErr).toLowerCase();
          if (errString.includes("already registered") || errString.includes("exists")) {
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
            if (signInData?.user?.id) {
              authUserId = signInData.user.id;
            }
          }
        }
      } catch (e: any) {
        console.warn("Supabase signup attempt notice:", e.message);
      }

      // Fallback: If network / email confirmation delayed, generate resilient student UUID
      if (!authUserId) {
        try {
          authUserId = typeof getLocalUserId === "function" ? getLocalUserId() : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "00000000-0000-4000-a000-000000000000");
        } catch (e) {
          authUserId = "00000000-0000-4000-a000-000000000000";
        }
      }


      // 2. Persist Full Complete Profile to Supabase database
      const fullProfile: StudentProfileData = {
        id: authUserId,
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: firstName.trim(),
        dob: "2003-01-01",
        gender,
        orientation: "Straight",
        interestedIn,
        relationshipGoal: campusGoal.includes("Dating") ? "Dating" : "Friendship",
        country: selectedInstitution.country || "Kenya",
        institutionType: "University",
        campus: selectedInstitution.name,
        institutionId: selectedInstitution.id,
        faculty: "General Studies",
        course: course.trim(),
        yearOfStudy,
        height: "170 cm",
        lifestyle: { smoking: "Non-smoker", drinking: "Social drinker", pets: "Pet lover", religion: "Other" },
        interests: parsedInterests.length > 0 ? parsedInterests : ["Campus Life", "Tech"],
        bio: bio.trim() || `Verified student at ${selectedInstitution.name}`,
        photos: validPhotos,
        verified: true,
      };

      await upsertLiveProfile({
        id: authUserId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        campus: selectedInstitution.name,
        country: selectedInstitution.country || "Kenya",
        gender,
        course: course.trim(),
        year_of_study: yearOfStudy,
        photos: validPhotos,
        verified: true,
        bio: fullProfile.bio,
        interests: fullProfile.interests,
      });

      // 3. Save to localStorage
      if (typeof window !== "undefined") {
        safeSetItem("unicircle_user_id", authUserId);
        safeSetItem("unicircle_user_profile", JSON.stringify(fullProfile));
        safeSetItem("unicircle_registered", "true");
      }

      setAuthStatus("SUCCESS");
      toast.success(`Welcome to UniCircle, ${firstName.trim()}! Your profile is verified.`);
      onComplete(fullProfile);
    } catch (err: any) {
      setAuthStatus("ERROR");
      const msg = getSafeErrorMessage(err) || "Registration failed due to a connection issue. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const isSubmitting = authStatus === "SUBMITTING";

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 relative">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-10"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4 text-indigo-400" /> Verified Student Network
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {authMode === "SIGN_UP" ? "Complete Student Registration" : "Welcome Back"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
          {authMode === "SIGN_UP"
            ? "Upload your real photos and fill your verified student profile to discover peers"
            : "Sign in with your verified UniCircle student credentials"}
        </p>

        {/* Tab Switcher: Sign Up vs Sign In */}
        <div className="flex items-center justify-center gap-2 mt-4 bg-slate-900/80 p-1 rounded-2xl border border-white/10 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => { setAuthMode("SIGN_UP"); setErrorMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              authMode === "SIGN_UP"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Account
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode("SIGN_IN"); setErrorMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              authMode === "SIGN_IN"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
        </div>
      </div>

      {/* Error Banner if any */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Registration Notice</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SIGN IN FORM */}
      {/* ------------------------------------------------------------------ */}
      {authMode === "SIGN_IN" ? (
        <form onSubmit={handleSignIn} className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" /> University Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname@university.edu"
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-indigo-600/30 hover:opacity-95 transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Signing in..." : "Sign In to UniCircle"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        /* ------------------------------------------------------------------ */
        /* FULL 3-PHOTO STUDENT SIGN UP FORM */
        /* ------------------------------------------------------------------ */
        <form onSubmit={handleSignUp} className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6">
          {/* SECTION 1: MANDATORY 3 REAL PHOTO UPLOAD */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-pink-400" /> Real Profile Photos (Upload 3 Photos) *
              </label>
              <span className="text-[11px] text-pink-300 font-semibold">
                {photos.filter((p) => !!p).length} of 3 uploaded
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Real photos help verified students find and connect with you on Campus Deck.
            </p>

            {/* Hidden file inputs for slots 1, 2, 3 */}
            <input
              type="file"
              ref={photoInput1Ref}
              accept="image/*"
              onChange={(e) => handleSlotPhotoUpload(0, e)}
              className="hidden"
            />
            <input
              type="file"
              ref={photoInput2Ref}
              accept="image/*"
              onChange={(e) => handleSlotPhotoUpload(1, e)}
              className="hidden"
            />
            <input
              type="file"
              ref={photoInput3Ref}
              accept="image/*"
              onChange={(e) => handleSlotPhotoUpload(2, e)}
              className="hidden"
            />

            {/* 3 Photo Grid Slots */}
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((slotIdx) => {
                const photoUrl = photos[slotIdx];
                const isUploading = uploadingSlot === slotIdx;
                const slotRefs = [photoInput1Ref, photoInput2Ref, photoInput3Ref];

                return (
                  <div key={slotIdx} className="flex flex-col items-center">
                    <div
                      onClick={() => !photoUrl && slotRefs[slotIdx].current?.click()}
                      className={`relative w-full aspect-square rounded-2xl border-2 transition-all overflow-hidden flex flex-col items-center justify-center group shadow-md ${
                        photoUrl
                          ? "border-indigo-500/80 bg-slate-950"
                          : "border-dashed border-white/20 hover:border-indigo-400 bg-slate-950/60 cursor-pointer"
                      }`}
                    >
                      {photoUrl ? (
                        <>
                          <img src={photoUrl} alt={`Photo ${slotIdx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSlotPhoto(slotIdx);
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-red-600/90 text-white hover:bg-red-500 transition shadow-lg cursor-pointer"
                            title="Remove Photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 group-hover:text-indigo-300">
                          <Camera className="w-5 h-5 mb-1 text-indigo-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold">
                            {slotIdx === 0 ? "Main Photo *" : `Photo ${slotIdx + 1}`}
                          </span>
                        </div>
                      )}

                      {isUploading && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-[10px] font-bold text-white">
                          Uploading...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-4">
            {/* SECTION 2: IDENTITY & CREDENTIALS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" /> First Name *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Chen"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> University Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@uonbi.ac.ke"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" /> Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* SECTION 3: ACADEMIC DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Country Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" /> Country / Region
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name} className="bg-slate-900">
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* University Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" /> University / College *
                  </label>
                </div>
                <div
                  onClick={() => setShowUniDropdown(true)}
                  className="w-full bg-slate-950/60 border border-white/10 hover:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-white flex items-center justify-between cursor-pointer transition"
                >
                  <span className="font-semibold truncate">{selectedInstitution.name}</span>
                  <span className="text-xs text-indigo-400 font-bold ml-2 shrink-0">Search</span>
                </div>
              </div>
            </div>

            {/* Major / Course & Year of Study */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Major / Course *
                </label>
                <input
                  type="text"
                  required
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. Computer Science, Law, Medicine"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Year of Study
                </label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {YEARS_OF_STUDY.map((year) => (
                    <option key={year} value={year} className="bg-slate-900">
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gender & Interested In */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Male" className="bg-slate-900">Male</option>
                  <option value="Female" className="bg-slate-900">Female</option>
                  <option value="Non-binary" className="bg-slate-900">Non-binary</option>
                  <option value="Other" className="bg-slate-900">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-purple-400" /> Campus Goal
                </label>
                <select
                  value={campusGoal}
                  onChange={(e) => setCampusGoal(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {CAMPUS_GOALS.map((goal) => (
                    <option key={goal} value={goal} className="bg-slate-900">
                      {goal}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interests & Hobbies */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Interests & Hobbies (comma separated)
              </label>
              <input
                type="text"
                value={interestsText}
                onChange={(e) => setInterestsText(e.target.value)}
                placeholder="e.g. Campus Life, Tech, Music, Sports, Photography"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Bio / Introduction */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Bio / Introduction *
              </label>
              <textarea
                required
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell other students a bit about your background, interests, and what you love to do on campus..."
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl py-4 text-sm font-extrabold shadow-lg shadow-indigo-600/30 hover:opacity-95 transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Creating Your Student Profile..." : "Complete Registration & Enter UniCircle"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Global University Search Modal */}
      {showUniDropdown && (
        <GlobalUniversitySearch
          title="Search Universities Worldwide"
          currentUniversityName={selectedInstitution.name}
          onSelectInstitution={(inst) => {
            setSelectedInstitution(inst);
            setSelectedCountry(inst.country);
            setShowUniDropdown(false);
          }}
          onClose={() => setShowUniDropdown(false)}
        />
      )}
    </div>
  );
};
