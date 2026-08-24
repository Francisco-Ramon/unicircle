import React, { useState, useRef } from "react";
import { ShieldCheck, Mail, Key, User, GraduationCap, ArrowRight, Building2, Search, Globe, Camera, Upload, CheckCircle2 } from "lucide-react";
import { INSTITUTIONS_DATA, Institution, SUPPORTED_COUNTRIES } from "./UniversityDatabase";
import { GlobalUniversitySearch } from "./GlobalUniversitySearch";
import { getCountryFlag } from "@/lib/globalUniversityService";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage, upsertLiveProfile } from "@/lib/supabaseLiveService";
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
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The Required Multi-Country Onboarding Fields
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

  // Searchable university state
  const [searchUni, setSearchUni] = useState("");
  const [showUniDropdown, setShowUniDropdown] = useState(false);

  // Filter universities by selected country AND search term
  const countryUniversities = INSTITUTIONS_DATA.filter(
    (inst) => inst.country === selectedCountry
  );

  const filteredUniversities = countryUniversities.filter((inst) =>
    inst.name.toLowerCase().includes(searchUni.toLowerCase()) ||
    inst.shortName.toLowerCase().includes(searchUni.toLowerCase()) ||
    inst.city.toLowerCase().includes(searchUni.toLowerCase())
  );

  // Automatically select first university when country changes
  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    const firstUni = INSTITUTIONS_DATA.find((i) => i.country === newCountry);
    if (firstUni) setSelectedInstitution(firstUni);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setIsUploadingPhoto(true);
      const url = await uploadToStorage(files[0], "avatars");
      setProfilePhoto(url);
      setIsUploadingPhoto(false);
      toast.success("Profile photo uploaded!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) { toast.error("Please enter your first name"); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Please enter a valid university email"); return; }
    if (!password || password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setBusy(true);
    
    // Default avatar if none uploaded
    const photoList = profilePhoto
      ? [profilePhoto]
      : ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"];

    // Generate or get persistent user ID
    let persistentId = "";
    if (typeof window !== "undefined") {
      persistentId = localStorage.getItem("unicircle_user_id") || "";
    }
    if (!persistentId) {
      persistentId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      if (typeof window !== "undefined") {
        localStorage.setItem("unicircle_user_id", persistentId);
      }
    }

    // Build student profile object
    const fullProfile: StudentProfileData = {
      id: persistentId,
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

    try {
      // 1. Sign up with Supabase Auth
      let authUserId = "";
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
      } else {
        // Fallback: If user already registered or needs sign in
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInData?.user?.id) {
          authUserId = signInData.user.id;
        }
      }

      const effectiveId = authUserId || persistentId;
      fullProfile.id = effectiveId;
      if (typeof window !== "undefined") {
        localStorage.setItem("unicircle_user_id", effectiveId);
      }

      await upsertLiveProfile({
        id: effectiveId,
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
        bio: `Hi! I'm ${firstName.trim()}, studying at ${selectedInstitution.shortName || selectedInstitution.name}. Excited to connect on UniCircle!`,
        interests: ["Campus Events", "Networking", "Tech"],
      });
    } catch (err: any) {
      console.warn("Profile sync notice:", err);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("unicircle_user_profile", JSON.stringify(fullProfile));
      localStorage.setItem("unicircle_registered", "true");
    }
    toast.success("Welcome to UniCircle! Your student profile is active.");
    onComplete(fullProfile);
    setBusy(false);
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5" /> Simple 1-Step Onboarding
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Your Account</h2>
        <p className="text-sm text-slate-400 mt-1">Join the verified university student network</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl space-y-5">
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
              <User className="w-3.5 h-3.5 text-indigo-400" /> First Name
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
            <Mail className="w-3.5 h-3.5 text-indigo-400" /> University Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.ac.za or .edu"
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* 3. Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-indigo-400" /> Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••• (6+ characters)"
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* 4. Gender & 5. Who to Discover */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Your Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Female" className="bg-slate-900">Female</option>
              <option value="Male" className="bg-slate-900">Male</option>
              <option value="Non-binary" className="bg-slate-900">Non-binary</option>
              <option value="Other" className="bg-slate-900">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Who to Discover?
            </label>
            <select
              value={interestedIn}
              onChange={(e) => setInterestedIn(e.target.value as any)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Everyone" className="bg-slate-900">Everyone</option>
              <option value="Female" className="bg-slate-900">Women Only</option>
              <option value="Male" className="bg-slate-900">Men Only</option>
            </select>
          </div>
        </div>

        {/* Worldwide University Selection */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Select University / College
            </span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3 h-3" /> Worldwide Search
            </span>
          </label>

          <div
            onClick={() => setShowUniDropdown(true)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-2xl p-4 text-sm text-white cursor-pointer flex items-center justify-between hover:border-indigo-500/40 transition group shadow-lg"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">{getCountryFlag(selectedInstitution.country)}</span>
              <div className="min-w-0">
                <p className="font-bold text-white group-hover:text-indigo-300 transition truncate">{selectedInstitution.name}</p>
                <p className="text-xs text-slate-400 truncate">{selectedInstitution.country} {selectedInstitution.city ? `• ${selectedInstitution.city}` : ""}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold shrink-0 ml-2 group-hover:bg-indigo-600 group-hover:text-white transition">
              Search Worldwide ↗
            </span>
          </div>

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
          disabled={busy}
          className="w-full mt-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-indigo-600/30 hover:opacity-95 transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? "Creating Account..." : "Create Account & Continue"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
