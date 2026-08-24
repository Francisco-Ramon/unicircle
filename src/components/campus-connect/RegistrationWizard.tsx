import React, { useState, useRef } from "react";
import { ShieldCheck, Mail, Key, User, GraduationCap, ArrowRight, Building2, Search, Globe, Camera, Upload, CheckCircle2, AlertCircle, LogIn, UserPlus } from "lucide-react";
import { INSTITUTIONS_DATA, Institution, SUPPORTED_COUNTRIES } from "./UniversityDatabase";
import { GlobalUniversitySearch } from "./GlobalUniversitySearch";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage, upsertLiveProfile, getLiveProfile } from "@/lib/supabaseLiveService";
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

export const RegistrationWizard: React.FC<Props> = ({ onComplete }) => {
  // Auth Mode: Sign Up vs Sign In
  const [authMode, setAuthMode] = useState<"SIGN_UP" | "SIGN_IN">("SIGN_UP");

  // State Machine: IDLE | SUBMITTING | SUCCESS | ERROR
  const [authStatus, setAuthStatus] = useState<"IDLE" | "SUBMITTING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Non-binary" | "Other">("Female");
  const [interestedIn, setInterestedIn] = useState<"Female" | "Male" | "Everyone">("Male");
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [selectedInstitution, setSelectedInstitution] = useState<Institution>(
    INSTITUTIONS_DATA.find((i) => i.country === "Kenya") || INSTITUTIONS_DATA[0]
  );
  const [yearOfStudy, setYearOfStudy] = useState(YEARS_OF_STUDY[2]); // Default 3rd Year

  // Searchable university modal state
  const [showUniDropdown, setShowUniDropdown] = useState(false);

  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    const firstUni = INSTITUTIONS_DATA.find((i) => i.country === newCountry);
    if (firstUni) setSelectedInstitution(firstUni);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      try {
        setIsUploadingPhoto(true);
        const url = await uploadToStorage(files[0], "avatars");
        if (url) {
          setProfilePhoto(url);
          toast.success("Profile photo uploaded successfully!");
        }
      } catch (err) {
        toast.error("Failed to upload photo. You can continue and add it later.");
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  // --------------------------------------------------------------------------
  // HANDLE SIGN IN (Existing Account)
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
        setAuthStatus("ERROR");
        const msg = signInErr?.message || "Invalid email or password. Please try again.";
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
        yearOfStudy: liveProf?.year_of_study || "3rd Year",
        height: "170 cm",
        lifestyle: { smoking: "Non-smoker", drinking: "Social drinker", pets: "Pet lover", religion: "Other" },
        interests: liveProf?.interests || ["Campus Events", "Networking"],
        bio: liveProf?.bio || "Verified Student on UniCircle",
        photos: liveProf?.photos && liveProf.photos.length > 0 ? liveProf.photos : ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"],
        verified: true,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("unicircle_user_id", userId);
        localStorage.setItem("unicircle_user_profile", JSON.stringify(resolvedProfile));
        localStorage.setItem("unicircle_registered", "true");
      }

      setAuthStatus("SUCCESS");
      toast.success(`Welcome back, ${resolvedProfile.firstName}!`);
      onComplete(resolvedProfile);
    } catch (err: any) {
      setAuthStatus("ERROR");
      const msg = err?.message || "An unexpected error occurred during sign-in. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLE SIGN UP (New Account Creation)
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

    setAuthStatus("SUBMITTING");
    setErrorMessage(null);

    const photoList = profilePhoto
      ? [profilePhoto]
      : ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"];

    try {
      let authUserId = "";

      // 1. Sign up with Supabase Auth
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
            year_of_study: yearOfStudy,
          },
        },
      });

      if (authData?.user?.id) {
        authUserId = authData.user.id;
      } else if (signUpErr) {
        // If email is already registered, attempt sign-in automatically
        if (signUpErr.message.toLowerCase().includes("already registered") || signUpErr.message.toLowerCase().includes("exists")) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (signInData?.user?.id) {
            authUserId = signInData.user.id;
          } else {
            setAuthStatus("ERROR");
            const msg = "An account with this email already exists. Please switch to Sign In or check your password.";
            setErrorMessage(msg);
            toast.error(msg);
            return;
          }
        } else {
          setAuthStatus("ERROR");
          const msg = signUpErr.message || "Failed to create account. Please check your details.";
          setErrorMessage(msg);
          toast.error(msg);
          return;
        }
      }

      if (!authUserId) {
        // If user ID was not returned, attempt sign-in to establish session
        const { data: finalSignIn } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (finalSignIn?.user?.id) {
          authUserId = finalSignIn.user.id;
        }
      }

      if (!authUserId) {
        setAuthStatus("ERROR");
        const msg = "Could not establish an authenticated session. Please verify your credentials.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      // 2. Persist Profile to Supabase database with authoritative UUID
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
        relationshipGoal: "Friendship",
        country: selectedInstitution.country || "Kenya",
        institutionType: "University",
        campus: selectedInstitution.name,
        institutionId: selectedInstitution.id,
        faculty: "General Studies",
        course: "Undergraduate",
        yearOfStudy,
        height: "170 cm",
        lifestyle: { smoking: "Non-smoker", drinking: "Social drinker", pets: "Pet lover", religion: "Other" },
        interests: ["Campus Events", "Networking", "Tech"],
        bio: `Hi! I'm ${firstName.trim()}, studying at ${selectedInstitution.shortName || selectedInstitution.name}. Excited to connect on UniCircle!`,
        photos: photoList,
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
        course: "Undergraduate",
        year_of_study: yearOfStudy,
        photos: photoList,
        verified: true,
        bio: fullProfile.bio,
        interests: ["Campus Events", "Networking", "Tech"],
      });

      // 3. Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("unicircle_user_id", authUserId);
        localStorage.setItem("unicircle_user_profile", JSON.stringify(fullProfile));
        localStorage.setItem("unicircle_registered", "true");
      }

      setAuthStatus("SUCCESS");
      toast.success(`Welcome to UniCircle, ${firstName.trim()}! Your profile is active.`);
      onComplete(fullProfile);
    } catch (err: any) {
      setAuthStatus("ERROR");
      const msg = err?.message || "Registration failed due to a connection issue. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const isSubmitting = authStatus === "SUBMITTING";

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5" /> Verified Campus Network
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          {authMode === "SIGN_UP" ? "Create Your Account" : "Welcome Back"}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {authMode === "SIGN_UP" ? "Join the verified university student network" : "Sign in to your UniCircle campus account"}
        </p>

        {/* Tab Switcher: Sign Up vs Sign In */}
        <div className="flex items-center justify-center gap-2 mt-4 bg-slate-900/80 p-1 rounded-2xl border border-white/10 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => { setAuthMode("SIGN_UP"); setErrorMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
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
            <p className="font-bold">Authentication Notice</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SIGN IN FORM */}
      {/* ------------------------------------------------------------------ */}
      {authMode === "SIGN_IN" ? (
        <form onSubmit={handleSignIn} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Address
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
        /* SIGN UP FORM */
        /* ------------------------------------------------------------------ */
        <form onSubmit={handleSignUp} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl space-y-5">
          {/* Profile Photo Upload */}
          <div className="flex flex-col items-center justify-center text-center pb-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 cursor-pointer overflow-hidden flex flex-col items-center justify-center transition-all group shadow-lg"
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-indigo-300 group-hover:text-white">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">Add Photo</span>
                </div>
              )}
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs text-white">
                  Uploading...
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Tap to upload your profile photo (optional)</p>
          </div>

          {/* 1. First & Last Name */}
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
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* 2. Email */}
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
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* 3. Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" /> Password * (min. 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* 4. Gender & Interested In */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Your Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Female" className="bg-slate-900">Female</option>
                <option value="Male" className="bg-slate-900">Male</option>
                <option value="Non-binary" className="bg-slate-900">Non-binary</option>
                <option value="Other" className="bg-slate-900">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Interested In Meeting
              </label>
              <select
                value={interestedIn}
                onChange={(e) => setInterestedIn(e.target.value as any)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Male" className="bg-slate-900">Male Students</option>
                <option value="Female" className="bg-slate-900">Female Students</option>
                <option value="Everyone" className="bg-slate-900">Everyone</option>
              </select>
            </div>
          </div>

          {/* 5. Country Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" /> Country / Region
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {SUPPORTED_COUNTRIES.map((country) => (
                <option key={country} value={country} className="bg-slate-900">
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* 6. University Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" /> University / College
              </label>
              <button
                type="button"
                onClick={() => setShowUniDropdown(true)}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3 h-3" /> Browse All Global Universities
              </button>
            </div>

            <div
              onClick={() => setShowUniDropdown(true)}
              className="w-full bg-slate-950/60 border border-white/10 hover:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-white flex items-center justify-between cursor-pointer transition"
            >
              <span className="font-semibold truncate">{selectedInstitution.name} ({selectedInstitution.city})</span>
              <span className="text-xs text-indigo-400 font-bold ml-2 shrink-0">Change</span>
            </div>

            {showUniDropdown && (
              <GlobalUniversitySearch
                isOpen={showUniDropdown}
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

          {/* 7. Year of Study */}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-indigo-600/30 hover:opacity-95 transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Creating Your Account..." : "Create Account & Enter Campus Network"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
