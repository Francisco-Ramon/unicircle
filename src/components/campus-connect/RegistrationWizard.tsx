import React, { useState, useRef } from "react";
import { ShieldCheck, Mail, Key, User, GraduationCap, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Heart, BookOpen, Compass, Search, Building2, Globe, Camera, Plus, Trash2, Lock, Upload, Flame } from "lucide-react";
import { INSTITUTIONS_DATA, COUNTRIES, Institution } from "./UniversityDatabase";

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

const INTEREST_TAGS = [
  "AI & Coding", "Machine Learning", "Hackathons", "Photography", "Anime",
  "Indie Rock", "Gym & Fitness", "Basketball", "Baking & Cooking", "Sci-Fi Movies",
  "Travel & Backpacking", "Crypto & Web3", "Philosophy", "Psychology", "Chess",
  "Podcasts", "Live Music & Concerts", "Volunteering", "Gaming & Esports", "Coffee & Cafes"
];

export const RegistrationWizard: React.FC<Props> = ({ onComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State Step 1 & 2
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");

  // Step 3 Cascading Institution State
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [selectedType, setSelectedType] = useState<string>("All Types");
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState<Institution>(INSTITUTIONS_DATA[0]);

  // Profile Personal & Automatic Orientation State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [dob, setDob] = useState("2003-05-14");
  
  // Gender & Sexual Orientation Logic
  const [gender, setGender] = useState<"Male" | "Female" | "Non-binary" | "Other">("Female");
  const [orientation, setOrientation] = useState<"Straight" | "Gay" | "Lesbian" | "Bisexual">("Straight");
  const [interestedIn, setInterestedIn] = useState<"Female" | "Male" | "Everyone">("Male");
  const [relationshipGoal, setRelationshipGoal] = useState<"Dating" | "Friendship" | "Study Partner" | "Networking" | "Travel Buddy">("Dating");

  // Academic Details
  const [faculty, setFaculty] = useState("School of Medicine");
  const [course, setCourse] = useState("Medicine & Surgery");
  const [yearOfStudy, setYearOfStudy] = useState("3rd Year");

  // Detailed Lifestyle & Bio
  const [height, setHeight] = useState("168 cm");
  const [smoking, setSmoking] = useState("Non-smoker");
  const [drinking, setDrinking] = useState("Social drinker");
  const [pets, setPets] = useState("Cat lover");
  const [religion, setReligion] = useState("Christian");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Coffee & Cafes", "Gym & Fitness", "Photography"]);
  const [bio, setBio] = useState("");

  // Photo Upload State
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"
  ]);
  const [photoError, setPhotoError] = useState("");

  // Handle Automatic Gender & Orientation Deduction
  const handleGenderChange = (newGender: "Male" | "Female" | "Non-binary" | "Other") => {
    setGender(newGender);
    if (orientation === "Straight") {
      if (newGender === "Female") setInterestedIn("Male");
      if (newGender === "Male") setInterestedIn("Female");
    }
  };

  const handleOrientationChange = (newOrientation: "Straight" | "Gay" | "Lesbian" | "Bisexual") => {
    setOrientation(newOrientation);
    if (newOrientation === "Straight") {
      setInterestedIn(gender === "Female" ? "Male" : "Female");
    } else if (newOrientation === "Gay") {
      setGender("Male");
      setInterestedIn("Male");
    } else if (newOrientation === "Lesbian") {
      setGender("Female");
      setInterestedIn("Female");
    } else if (newOrientation === "Bisexual") {
      setInterestedIn("Everyone");
    }
  };

  const filteredInstitutions = INSTITUTIONS_DATA.filter((inst) => {
    const matchesCountry = selectedCountry === "All" || inst.country === selectedCountry;
    const matchesType = selectedType === "All Types" || inst.type === selectedType;
    const matchesSearch =
      inst.name.toLowerCase().includes(institutionSearch.toLowerCase()) ||
      inst.shortName.toLowerCase().includes(institutionSearch.toLowerCase()) ||
      inst.location.toLowerCase().includes(institutionSearch.toLowerCase());
    return matchesCountry && matchesType && matchesSearch;
  });

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      if (selectedInterests.length < 8) {
        setSelectedInterests([...selectedInterests, interest]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const localUrl = URL.createObjectURL(file);
      setUploadedPhotos([...uploadedPhotos, localUrl]);
      setPhotoError("");
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = (idx: number) => {
    if (uploadedPhotos.length <= 1) {
      setPhotoError("You must upload at least 1 profile picture to complete registration.");
      return;
    }
    setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== idx));
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    if (password.length < 6) return;
    if (password !== confirmPassword) return;
    setStep(2);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length === 6) {
      setStep(3);
    } else {
      setOtpError("Please enter all 6 digits of your university OTP code.");
    }
  };

  const handleProfileComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedPhotos.length === 0) {
      setPhotoError("You must upload at least 1 profile picture to complete registration.");
      return;
    }
    const profile: StudentProfileData = {
      email,
      firstName: firstName || "Student",
      lastName: lastName || "User",
      nickname,
      dob,
      gender,
      orientation,
      interestedIn,
      relationshipGoal,
      country: selectedCountry,
      institutionType: selectedInstitution.type,
      campus: selectedInstitution.name,
      institutionId: selectedInstitution.id,
      faculty,
      course,
      yearOfStudy,
      height,
      lifestyle: { smoking, drinking, pets, religion },
      interests: selectedInterests,
      bio: bio || "Verified student looking for genuine campus connections!",
      photos: uploadedPhotos,
      verified: true,
    };
    onComplete(profile);
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-slate-900/90 border border-white/15 rounded-3xl backdrop-blur-xl shadow-2xl">
      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Step indicators */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[
          { num: 1, label: "Account Security", icon: Key },
          { num: 2, label: "University OTP", icon: Mail },
          { num: 3, label: "Profile, Orientation & Photos", icon: User },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div key={s.num} className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isDone
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/50 scale-105"
                    : "bg-white/5 text-slate-500 border border-white/10"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="hidden sm:block">
                <p className={`text-xs font-semibold ${isActive ? "text-white" : "text-slate-400"}`}>Step {s.num}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Account Creation */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-4 animate-in fade-in duration-300 max-w-xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Your Student Account</h2>
            <p className="text-xs text-slate-400 mt-1">Use your official student email for instant verification.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Student Email Address</label>
            <div className="relative mt-1">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@uonbi.ac.ke or alex.chen@stanford.edu"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mt-4"
          >
            Continue to Verification Code <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step 2: OTP Verification */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in duration-300 text-center max-w-xl mx-auto">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Verify Student Email</h2>
            <p className="text-xs text-slate-400 mt-1">
              Security code sent to <strong className="text-indigo-300">{email || "student@university.edu"}</strong>
            </p>
          </div>

          {/* 6 Digit OTP */}
          <div className="flex justify-center gap-2 max-w-xs mx-auto">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => {
                  const val = e.target.value;
                  const newOtp = [...otp];
                  newOtp[idx] = val;
                  setOtp(newOtp);
                  if (val && idx < 5) {
                    const nextInput = document.getElementById(`otp-${idx + 1}`);
                    if (nextInput) nextInput.focus();
                  }
                }}
                className="w-11 h-12 text-center text-lg font-bold bg-slate-950 border border-white/15 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            ))}
          </div>

          {otpError && <p className="text-xs text-red-400 font-medium">{otpError}</p>}

          <div className="p-3 bg-white/5 rounded-xl text-xs text-slate-400 max-w-xs mx-auto">
            Demo Code: <button type="button" onClick={() => setOtp(["8", "4", "2", "9", "1", "0"])} className="text-indigo-400 font-bold underline">842910</button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              Verify Code <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Step 3: AUTOMATIC ORIENTATION DEDUCTION, MANDATORY PHOTO UPLOAD & LIFESTYLE BIO */}
      {step === 3 && (
        <form onSubmit={handleProfileComplete} className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">Complete Profile & Photo Upload</h2>
            <p className="text-xs text-slate-400 mt-1">Upload profile pictures, set orientation, and write your lifestyle bio.</p>
          </div>

          {/* AUTOMATIC ORIENTATION MATCHING BOX */}
          <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-pink-400" /> Algorithmic Orientation Matching
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Auto-Deducted Mode
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <span>My Gender (Locked)</span>
                  <Lock className="w-3 h-3 text-amber-400" />
                </label>
                <select
                  value={gender}
                  onChange={(e: any) => handleGenderChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-amber-500/40 rounded-xl text-xs text-white font-bold"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Sexual Orientation</label>
                <select
                  value={orientation}
                  onChange={(e: any) => handleOrientationChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-pink-500/40 rounded-xl text-xs text-white font-bold"
                >
                  <option value="Straight">Straight (Opposite Gender)</option>
                  <option value="Gay">Gay (Male seeking Male)</option>
                  <option value="Lesbian">Lesbian (Female seeking Female)</option>
                  <option value="Bisexual">Bisexual / Everyone</option>
                </select>
              </div>
            </div>

            {/* Dynamic Algorithmic Output Explanation */}
            <div className="p-3 bg-slate-900 rounded-xl border border-white/10 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">Algorithm Feed Output:</span>
                <strong className="text-emerald-400 font-bold">
                  {orientation === "Straight" && gender === "Female" && "Female seeking Males (Opposite Gender Automatically Brought)"}
                  {orientation === "Straight" && gender === "Male" && "Male seeking Females (Opposite Gender Automatically Brought)"}
                  {orientation === "Gay" && "Gay Male seeking Gay/Bisexual Males Only"}
                  {orientation === "Lesbian" && "Lesbian Female seeking Lesbian/Bisexual Females Only"}
                  {orientation === "Bisexual" && "Bisexual seeking Everyone"}
                </strong>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>
          </div>

          {/* INTERACTIVE PHOTO UPLOAD AREA */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-400" /> Upload Profile Pictures (Click to Add File)
                </label>
                <span className="text-[11px] text-slate-400">At least 1 photo required for AI face liveness matching</span>
              </div>
              <button
                type="button"
                onClick={triggerFilePicker}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" /> Upload Picture File
              </button>
            </div>

            {/* Interactive Photo Slots Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {uploadedPhotos.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/15 bg-slate-900 group">
                  <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <div
                onClick={triggerFilePicker}
                className="aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-indigo-400 bg-white/5 hover:bg-white/10 transition flex flex-col items-center justify-center cursor-pointer text-center p-2 group"
              >
                <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition" />
                <span className="text-[10px] text-slate-400 font-semibold mt-1">Click to Upload</span>
              </div>
            </div>
            {photoError && <p className="text-xs text-red-400 font-semibold">{photoError}</p>}
          </div>

          {/* DETAILED LIFESTYLE SPECS */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Lifestyle Traits & Preferences</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Smoking</label>
                <select
                  value={smoking}
                  onChange={(e) => setSmoking(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                >
                  <option value="Non-smoker">Non-smoker</option>
                  <option value="Social smoker">Social smoker</option>
                  <option value="Regular smoker">Regular smoker</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Drinking</label>
                <select
                  value={drinking}
                  onChange={(e) => setDrinking(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                >
                  <option value="Non-drinker">Non-drinker</option>
                  <option value="Social drinker">Social drinker</option>
                  <option value="Regular drinker">Regular drinker</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Pets</label>
                <select
                  value={pets}
                  onChange={(e) => setPets(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                >
                  <option value="Dog lover">Dog lover</option>
                  <option value="Cat lover">Cat lover</option>
                  <option value="No pets">No pets</option>
                  <option value="All animals">All animals</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Height</label>
                <input
                  type="text"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Student Names & Campus */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">First Name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Alex"
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">Last Name</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Chen"
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">University / Campus</label>
              <select
                value={selectedInstitution.id}
                onChange={(e) => {
                  const inst = INSTITUTIONS_DATA.find((i) => i.id === e.target.value);
                  if (inst) setSelectedInstitution(inst);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
              >
                {INSTITUTIONS_DATA.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bio Text */}
          <div>
            <label className="text-xs font-semibold text-slate-300">Write Your Bio & Introduction</label>
            <textarea
              rows={3}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other verified students about yourself, your major, interests, and lifestyle..."
              className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            Lock Credentials & Launch Camera Verification <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
