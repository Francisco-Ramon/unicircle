import React, { useState } from "react";
import { ShieldCheck, Mail, Key, User, GraduationCap, ArrowRight, Building2, Search } from "lucide-react";
import { INSTITUTIONS_DATA, Institution, SUPPORTED_COUNTRIES } from "./UniversityDatabase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export interface StudentProfileData {
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

  // The Required Multi-Country Onboarding Fields
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Non-binary" | "Other">("Female");
  const [interestedIn, setInterestedIn] = useState<"Female" | "Male" | "Everyone">("Male");
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) { toast.error("Please enter your first name"); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Please enter a valid university email"); return; }
    if (!password || password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setBusy(true);
    try {
      // 1. Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            gender,
            interested_in: interestedIn,
            university_name: selectedInstitution.name,
            year_of_study: yearOfStudy,
          },
        },
      });

      if (error) throw error;

      toast.success("Account created successfully!");

      // 2. Build student profile object
      const fullProfile: StudentProfileData = {
        email,
        firstName,
        lastName: "",
        nickname: firstName,
        dob: "2003-01-01",
        gender,
        orientation: "Straight",
        interestedIn,
        relationshipGoal: "Friendship",
        country: selectedInstitution.country || "South Africa",
        institutionType: "University",
        campus: selectedInstitution.name,
        institutionId: selectedInstitution.id,
        faculty: "General Studies",
        course: "Student",
        yearOfStudy,
        height: "170 cm",
        lifestyle: { smoking: "Non-smoker", drinking: "Social drinker", pets: "Pet lover", religion: "Other" },
        interests: ["Campus Events", "Coffee & Cafes", "Networking"],
        bio: `Hi! I'm ${firstName}, studying at ${selectedInstitution.shortName}. Looking forward to meeting verified students on UniCircle!`,
        photos: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"],
        verified: true,
      };

      onComplete(fullProfile);
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setBusy(false);
    }
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
        {/* 1. First Name */}
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

        {/* Country & University Selection */}
        <div className="space-y-4 pt-2 border-t border-white/10">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Select Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.name} className="bg-slate-900">
                  {c.flag} {c.name} ({c.region})
                </option>
              ))}
            </select>
          </div>

          {/* Searchable University Dropdown */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Select University ({selectedCountry})
            </label>
            
            <div
              onClick={() => setShowUniDropdown(!showUniDropdown)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer flex items-center justify-between hover:border-white/20 transition"
            >
              <span className="font-medium truncate">{selectedInstitution.name}</span>
              <span className="text-xs text-indigo-400 font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 shrink-0 ml-2">
                {selectedInstitution.shortName}
              </span>
            </div>

            {showUniDropdown && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl p-3 z-30 space-y-2 max-h-60 overflow-y-auto">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchUni}
                    onChange={(e) => setSearchUni(e.target.value)}
                    placeholder={`Search ${selectedCountry} university...`}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {filteredUniversities.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No matching university found in {selectedCountry}.
                  </div>
                ) : (
                  filteredUniversities.map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => {
                        setSelectedInstitution(inst);
                        setShowUniDropdown(false);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-between transition ${
                        selectedInstitution.id === inst.id
                          ? "bg-indigo-600 text-white font-bold"
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="truncate">{inst.name}</span>
                      <span className="text-[10px] opacity-70 ml-2 shrink-0">{inst.city}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
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
