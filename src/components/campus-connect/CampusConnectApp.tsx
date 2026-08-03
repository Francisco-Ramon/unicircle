import React, { useState } from "react";
import { Sparkles, Heart, MessageCircle, Calendar, ShieldAlert, User, Crown, SlidersHorizontal, Lock, CheckCircle2, Flame, GraduationCap, Building2, Globe, Menu, X, ArrowRight } from "lucide-react";
import { BrandNamesModal } from "./BrandNamesModal";
import { RegistrationWizard, StudentProfileData } from "./RegistrationWizard";
import { LiveFaceVerification } from "./LiveFaceVerification";
import { DiscoverDeck, StudentProfile } from "./DiscoverDeck";
import { FilterDrawer } from "./FilterDrawer";
import { MatchCelebrationModal } from "./MatchCelebrationModal";
import { RealTimeChatSuite } from "./RealTimeChatSuite";
import { CampusEventsHub } from "./CampusEventsHub";
import { CommunityHub } from "./CommunityHub";
import { UserProfileStudio } from "./UserProfileStudio";
import { SafetyPrivacyCenter } from "./SafetyPrivacyCenter";
import { ExecutiveAdminConsole } from "./ExecutiveAdminConsole";
import { CampusVipStudio } from "./CampusVipStudio";
import { INSTITUTIONS_DATA } from "./UniversityDatabase";

// Initial Mock Verified Student Profiles across institutions
const MOCK_PROFILES: StudentProfile[] = [
  {
    id: "1",
    name: "Sarah Jenkins",
    age: 21,
    gender: "Female",
    campus: "Stanford University",
    course: "Computer Science & AI",
    yearOfStudy: "3rd Year (Junior)",
    distanceKm: 2,
    compatibilityScore: 97,
    verified: true,
    online: true,
    intentMode: "Dating",
    photos: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80",
    ],
    bio: "AI researcher building generative models. Big fan of late-night espresso, indie rock concerts, and weekend bouldering!",
    interests: ["AI & Coding", "Indie Rock", "Gym & Fitness", "Coffee & Cafes"],
    prompts: [
      { question: "My ideal Sunday on campus...", answer: "Coffee at student union, 2 hours of coding, then acoustic guitar on the oval lawn!" },
    ],
    height: "168 cm",
    lifestyle: { smoking: "Non-smoker", drinking: "Socially" },
  },
  {
    id: "2",
    name: "Amani Wanjiru",
    age: 21,
    gender: "Female",
    campus: "University of Nairobi",
    course: "Medicine & Surgery",
    yearOfStudy: "4th Year",
    distanceKm: 5,
    compatibilityScore: 96,
    verified: true,
    online: true,
    intentMode: "Dating",
    photos: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    ],
    bio: "Med student at UoN Chiromo campus! Passionate about public health, debate, and exploring Nairobi cafes on weekends.",
    interests: ["Medicine", "Debating", "Coffee & Cafes", "Volunteering"],
    prompts: [
      { question: "Key to my heart...", answer: "Good conversation over Kenya AA coffee." },
    ],
    height: "170 cm",
    lifestyle: { smoking: "Non-smoker", drinking: "Socially" },
  },
  {
    id: "3",
    name: "Stacy Muthoni",
    age: 20,
    gender: "Female",
    campus: "Jomo Kenyatta University of Agriculture and Technology",
    course: "Mechatronics Engineering",
    yearOfStudy: "3rd Year",
    distanceKm: 8,
    compatibilityScore: 93,
    verified: true,
    online: true,
    intentMode: "Dating",
    photos: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&auto=format&fit=crop&q=80",
    ],
    bio: "Building autonomous robotics at JKUAT Juja! Looking for fellow tech geeks and weekend road trip buddies.",
    interests: ["Mechatronics", "Hackathons", "Travel & Backpacking", "Sci-Fi Movies"],
    prompts: [
      { question: "Fun fact about me...", answer: "I built my own drone controller in sophomore year!" },
    ],
    height: "166 cm",
    lifestyle: { smoking: "Non-smoker", drinking: "Never" },
  },
];

import { TWENTY_STUDENT_PROFILES } from "./StudentProfilesDataset";

export const CampusConnectApp: React.FC = () => {
  // Brand selection state
  const [brandName, setBrandName] = useState("UniCircle");
  const [showBrandModal, setShowBrandModal] = useState(false);

  // User Session & Registration State
  const [isRegistered, setIsRegistered] = useState(true);
  const [isBiometricVerified, setIsBiometricVerified] = useState(true);
  const [showVerificationStudio, setShowVerificationStudio] = useState(false);
  const [userProfile, setUserProfile] = useState<StudentProfileData>({
    email: "student@uonbi.ac.ke",
    firstName: "Alex",
    lastName: "Chen",
    nickname: "Lex",
    dob: "2003-05-14",
    gender: "Male",
    orientation: "Straight",
    interestedIn: "Female",
    relationshipGoal: "Dating",
    country: "Kenya",
    institutionType: "University",
    campus: "University of Nairobi",
    institutionId: "uon",
    faculty: "School of Computing & Informatics",
    course: "Computer Science & AI",
    yearOfStudy: "3rd Year",
    height: "178 cm",
    lifestyle: { smoking: "Non-smoker", drinking: "Social drinker", pets: "Dog lover", religion: "Christian" },
    interests: ["AI & Coding", "Gym & Fitness", "Coffee & Cafes", "Indie Rock"],
    bio: "CS major passionate about neural networks, late night coffee runs, and weekend hiking trips. Looking for genuine campus connections!",
    photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80"],
    verified: true,
  });

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<"discover" | "communities" | "chat" | "events" | "profile" | "safety" | "admin" | "vip">("discover");
  const [intentMode, setIntentMode] = useState<string>("Dating");
  const [discoveryRadius, setDiscoveryRadius] = useState<"MY_INSTITUTION" | "NEARBY" | "NATIONWIDE" | "INTERNATIONAL">("NATIONWIDE");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Match State with 20 Student Profiles
  const [matches, setMatches] = useState<StudentProfile[]>([TWENTY_STUDENT_PROFILES[0], TWENTY_STUDENT_PROFILES[1], TWENTY_STUDENT_PROFILES[3]]);
  const [activeChatMatch, setActiveChatMatch] = useState<StudentProfile | null>(TWENTY_STUDENT_PROFILES[0]);
  const [celebratedMatch, setCelebratedMatch] = useState<StudentProfile | null>(null);

  const handleSwipeLike = (profile: StudentProfile) => {
    if (!matches.some((m) => m.id === profile.id)) {
      setMatches([profile, ...matches]);
    }
    setCelebratedMatch(profile);
  };

  const handleSwipePass = (profile: StudentProfile) => {};

  const handleSwipeSuperLike = (profile: StudentProfile) => {
    if (!matches.some((m) => m.id === profile.id)) {
      setMatches([profile, ...matches]);
    }
    setCelebratedMatch(profile);
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Global Header */}
      <header className="sticky top-0 z-40 bg-[#0B0F17]/90 border-b border-white/10 backdrop-blur-xl px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand Modal Switcher */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-600/30">
              <Building2 className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">{brandName}</h1>
                <button
                  onClick={() => setShowBrandModal(true)}
                  className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold hover:bg-indigo-500/30 transition flex items-center gap-1"
                >
                  <Globe className="w-3 h-3 text-pink-400" /> Multi-Uni
                </button>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider">National & International Verified Campus Ecosystem</p>
            </div>
          </div>

          {/* Desktop Nav */}
          {isRegistered && (
            <nav className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10">
              {[
                { id: "discover", label: "Discover", icon: Heart },
                { id: "communities", label: "Communities", icon: Building2 },
                { id: "chat", label: `Chat (${matches.length})`, icon: MessageCircle },
                { id: "events", label: "Events", icon: Calendar },
                { id: "profile", label: "Profile", icon: User },
                { id: "safety", label: "Safety", icon: ShieldAlert },
                { id: "vip", label: "VIP Boost", icon: Crown },
                { id: "admin", label: "Admin Console", icon: Lock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md shadow-indigo-600/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Status & Permanent Gender Lock Badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRegistered(false)}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" /> Register New Account
            </button>

            {isBiometricVerified ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> {userProfile.gender} <span className="text-[10px] text-amber-400 font-mono">(Gender Locked 🔒)</span>
              </span>
            ) : (
              <button
                onClick={() => setShowVerificationStudio(true)}
                className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition"
              >
                Verify Face Liveness
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {!isRegistered ? (
          <RegistrationWizard
            onComplete={(profile) => {
              setUserProfile(profile);
              setIsRegistered(true);
              setShowVerificationStudio(true);
            }}
          />
        ) : showVerificationStudio ? (
          <LiveFaceVerification
            onVerified={() => {
              setIsBiometricVerified(true);
              setShowVerificationStudio(false);
              setActiveTab("discover");
            }}
            onSkipDemo={() => {
              setIsBiometricVerified(true);
              setShowVerificationStudio(false);
            }}
          />
        ) : (
          <>
            {activeTab === "discover" && (
              <DiscoverDeck
                currentProfile={userProfile}
                profiles={TWENTY_STUDENT_PROFILES}
                onSwipeLike={handleSwipeLike}
                onSwipePass={handleSwipePass}
                onSwipeSuperLike={handleSwipeSuperLike}
                onOpenFilters={() => setShowFilterDrawer(true)}
                intentMode={intentMode}
              />
            )}

            {activeTab === "communities" && <CommunityHub />}

            {activeTab === "chat" && (
              <RealTimeChatSuite
                activeMatch={activeChatMatch}
                matches={matches}
                onSelectMatch={(m) => setActiveChatMatch(m)}
              />
            )}

            {activeTab === "events" && <CampusEventsHub />}

            {activeTab === "profile" && (
              <UserProfileStudio
                profile={userProfile}
                onUpdateProfile={(up) => setUserProfile(up)}
                onLaunchLivenessScan={() => setShowVerificationStudio(true)}
              />
            )}

            {activeTab === "safety" && <SafetyPrivacyCenter />}

            {activeTab === "admin" && <ExecutiveAdminConsole />}

            {activeTab === "vip" && <CampusVipStudio />}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {isRegistered && (
        <div className="lg:hidden sticky bottom-0 z-40 bg-[#0B0F17]/95 border-t border-white/10 backdrop-blur-xl px-2 py-2 flex items-center justify-around">
          {[
            { id: "discover", label: "Discover", icon: Heart },
            { id: "communities", label: "Hubs", icon: Building2 },
            { id: "chat", label: "Chat", icon: MessageCircle },
            { id: "events", label: "Events", icon: Calendar },
            { id: "profile", label: "Profile", icon: User },
            { id: "safety", label: "Safety", icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition ${
                  isActive ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <BrandNamesModal
        isOpen={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        onSelectName={(name) => {
          setBrandName(name);
          setShowBrandModal(false);
        }}
        selectedName={brandName}
      />

      <FilterDrawer
        isOpen={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        intentMode={intentMode}
        onChangeIntentMode={(m) => setIntentMode(m)}
        discoveryRadius={discoveryRadius}
        onChangeDiscoveryRadius={(r) => setDiscoveryRadius(r)}
      />

      <MatchCelebrationModal
        matchedProfile={celebratedMatch}
        currentUserProfile={userProfile}
        onClose={() => setCelebratedMatch(null)}
        onStartChat={(m) => {
          setCelebratedMatch(null);
          setActiveChatMatch(m);
          setActiveTab("chat");
        }}
      />
    </div>
  );
};
