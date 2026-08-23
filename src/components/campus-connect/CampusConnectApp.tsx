import React, { useState } from "react";
import {
  Home, Search, Users, MessageSquare, Calendar, User, ShieldCheck,
  Bell, Settings, Bookmark, LogOut, ChevronDown, HelpCircle, Palette, Sparkles
} from "lucide-react";
import { RegistrationWizard, StudentProfileData } from "./RegistrationWizard";
import { LiveFaceVerification } from "./LiveFaceVerification";
import { DiscoverDeck, StudentProfile } from "./DiscoverDeck";
import { FilterDrawer } from "./FilterDrawer";
import { MatchCelebrationModal } from "./MatchCelebrationModal";
import { RealTimeChatSuite } from "./RealTimeChatSuite";
import { CampusEventsHub } from "./CampusEventsHub";
import { CommunityHub } from "./CommunityHub";
import { UserProfileStudio } from "./UserProfileStudio";
import { NotificationsScreen } from "./NotificationsScreen";
import { SettingsScreen, AccentTheme, ThemeMode } from "./SettingsScreen";
import { StudentHomeScreen } from "./StudentHomeScreen";
import { TWENTY_STUDENT_PROFILES } from "./StudentProfilesDataset";


export const CampusConnectApp: React.FC = () => {
  // User Session & Registration State
  const [isRegistered, setIsRegistered] = useState(true);
  const [isBiometricVerified, setIsBiometricVerified] = useState(true);
  const [showVerificationStudio, setShowVerificationStudio] = useState(false);

  // User Profile
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

  // Active Screen State with History Sync
  const VALID_TABS = ["home", "discover", "communities", "events", "chat", "notifications", "profile", "settings"] as const;
  type TabType = typeof VALID_TABS[number];

  const getTabFromHash = (): TabType => {
    if (typeof window === "undefined") return "home";
    const hash = window.location.hash.replace("#", "").split("?")[0];
    return VALID_TABS.includes(hash as TabType) ? (hash as TabType) : "home";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromHash);
  const [intentMode, setIntentMode] = useState<string>("Dating");
  const [discoveryRadius, setDiscoveryRadius] = useState<"MY_INSTITUTION" | "NEARBY" | "NATIONWIDE" | "INTERNATIONAL">("NATIONWIDE");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // User Profile Avatar "More" Dropdown State
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Theme & Personalization State
  const [accentTheme, setAccentTheme] = useState<AccentTheme>("blue");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  // Connections State
  const [matches, setMatches] = useState<StudentProfile[]>([TWENTY_STUDENT_PROFILES[0], TWENTY_STUDENT_PROFILES[1], TWENTY_STUDENT_PROFILES[3]]);
  const [activeChatMatch, setActiveChatMatch] = useState<StudentProfile | null>(TWENTY_STUDENT_PROFILES[0]);
  const [celebratedMatch, setCelebratedMatch] = useState<StudentProfile | null>(null);

  // Synchronize URL hash and browser history (popstate / back button)
  React.useEffect(() => {
    const currentHashTab = getTabFromHash();
    if (!window.history.state || !window.history.state.tab) {
      window.history.replaceState({ tab: currentHashTab }, "", `#${currentHashTab}`);
    }

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab && VALID_TABS.includes(e.state.tab)) {
        setActiveTab(e.state.tab);
      } else {
        const hashTab = getTabFromHash();
        setActiveTab(hashTab);
      }
      setShowFilterDrawer(false);
      setShowUserDropdown(false);
      setCelebratedMatch(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleTabChange = (newTab: TabType) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    setShowUserDropdown(false);

    // Update history state smoothly without creating duplicate entries for identical tab
    if (window.location.hash !== `#${newTab}`) {
      window.history.pushState({ tab: newTab }, "", `#${newTab}`);
    }
  };

  const handleSwipeLike = (profile: StudentProfile) => {
    if (!matches.some((m) => m.id === profile.id)) {
      setMatches([profile, ...matches]);
      setCelebratedMatch(profile);
    }
  };

  const handleSwipePass = (profile: StudentProfile) => {};
  const handleSwipeSuperLike = (profile: StudentProfile) => {
    if (!matches.some((m) => m.id === profile.id)) {
      setMatches([profile, ...matches]);
      setCelebratedMatch(profile);
    }
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300 ${
      themeMode === "light" ? "bg-[#F4F6F9] text-slate-800" : "bg-[#070A10] text-slate-100"
    }`}>
      {/* 1. SLIM & LIGHTWEIGHT TOP HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl px-4 py-2.5 border-b transition-colors duration-300 ${
        themeMode === "light" ? "bg-white/90 border-slate-200 shadow-sm" : "bg-[#0B0F17]/90 border-white/10"
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => handleTabChange("home")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img
              src="/unicircle-logo.png"
              alt="UniCircle Logo"
              className="w-8 h-8 object-contain filter drop-shadow-[0_0_8px_rgba(99,102,241,0.4)] group-hover:scale-105 transition-transform"
            />
            <div>
              <h1 className={`text-base font-black tracking-tight flex items-center gap-0.5 ${
                themeMode === "light" ? "text-slate-900" : "text-white"
              }`}>
                Uni<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Circle</span>
              </h1>
              <p className={`text-[9px] font-medium ${themeMode === "light" ? "text-slate-500" : "text-slate-400"}`}>Verified Campus Network</p>
            </div>
          </div>

          {/* Desktop Navigation Icons Bar */}
          {isRegistered && (
            <nav className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-2xl border transition-colors duration-300 ${
              themeMode === "light" ? "bg-slate-100 border-slate-200" : "bg-slate-900/80 border-white/10"
            }`}>
              {[
                { id: "home", label: "Home", icon: Home },
                { id: "discover", label: "Discover", icon: Search },
                { id: "communities", label: "Communities", icon: Users },
                { id: "chat", label: `Chats (${matches.length})`, icon: MessageSquare },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md shadow-indigo-600/20"
                        : themeMode === "light"
                        ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
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

          {/* Right Area: Notifications Bell + Profile Avatar Dropdown */}
          <div className="flex items-center gap-2">
            {/* Notifications Bell */}
            <button
              onClick={() => handleTabChange("notifications")}
              className={`relative p-2 rounded-xl border transition ${
                activeTab === "notifications"
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-slate-900/80 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-pink-500 border-2 border-slate-950" />
            </button>

            {/* Profile Avatar "More" Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 rounded-xl bg-slate-900/80 border border-white/10 hover:border-white/20 transition"
              >
                <img
                  src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
                  alt="User"
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pr-1" />
              </button>

              {/* User Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-bold text-white truncate">{userProfile.firstName} {userProfile.lastName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{userProfile.campus}</p>
                  </div>

                  <button
                    onClick={() => { handleTabChange("profile"); setShowUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <User className="w-4 h-4 text-indigo-400" /> My Profile
                  </button>

                  <button
                    onClick={() => { handleTabChange("settings"); setShowUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <Settings className="w-4 h-4 text-purple-400" /> Settings & Privacy
                  </button>

                  <button
                    onClick={() => { handleTabChange("settings"); setShowUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <Palette className="w-4 h-4 text-pink-400" /> Personalize Theme
                  </button>

                  <button
                    onClick={() => { handleTabChange("communities"); setShowUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <Users className="w-4 h-4 text-emerald-400" /> Communities
                  </button>

                  <button
                    onClick={() => { handleTabChange("events"); setShowUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <Calendar className="w-4 h-4 text-amber-400" /> Events
                  </button>

                  <div className="pt-1 border-t border-white/10">
                    <button
                      onClick={() => setIsRegistered(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN SINGLE-TASK SCREEN */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
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
              setActiveTab("home");
            }}
            onSkipDemo={() => {
              setIsBiometricVerified(true);
              setShowVerificationStudio(false);
            }}
          />
        ) : (
          <>
            {activeTab === "home" && (
              <StudentHomeScreen
                userProfile={userProfile}
                onNavigateToDiscover={() => handleTabChange("discover")}
                onNavigateToEvents={() => handleTabChange("events")}
                onNavigateToCommunity={() => handleTabChange("communities")}
              />
            )}

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

            {activeTab === "communities" && <CommunityHub userProfile={userProfile} />}

            {activeTab === "events" && <CampusEventsHub />}

            {activeTab === "chat" && (
              <RealTimeChatSuite
                activeMatch={activeChatMatch}
                matches={matches}
                onSelectMatch={(m) => setActiveChatMatch(m)}
              />
            )}

            {activeTab === "notifications" && <NotificationsScreen />}

            {activeTab === "profile" && (
              <UserProfileStudio
                profile={userProfile}
                onUpdateProfile={(up) => setUserProfile(up)}
                onLaunchLivenessScan={() => setShowVerificationStudio(true)}
                onNavigateToSettings={() => handleTabChange("settings")}
              />
            )}

            {activeTab === "settings" && (
              <SettingsScreen
                userProfile={userProfile}
                onNavigateToTab={(tab) => handleTabChange(tab as any)}
                accentTheme={accentTheme}
                onSelectAccentTheme={(acc) => setAccentTheme(acc)}
                themeMode={themeMode}
                onSelectThemeMode={(mode) => setThemeMode(mode)}
              />
            )}
          </>
        )}
      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION BAR (5 Core Items) */}
      {isRegistered && (
        <div className={`md:hidden sticky bottom-0 z-40 backdrop-blur-xl px-2 py-2 flex items-center justify-around border-t transition-colors duration-300 ${
          themeMode === "light" ? "bg-white/95 border-slate-200 shadow-lg" : "bg-[#0B0F17]/95 border-white/10"
        }`}>
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "discover", label: "Discover", icon: Search },
            { id: "chat", label: "Chats", icon: MessageSquare },
            { id: "notifications", label: "Alerts", icon: Bell },
            { id: "profile", label: "Profile", icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition ${
                  isActive ? "text-indigo-400 font-extrabold" : "text-slate-500 hover:text-slate-300"
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
