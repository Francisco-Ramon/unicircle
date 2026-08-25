import { safeSetItem } from "@/lib/safeStorage";
import React, { useState, useEffect } from "react";
import {
  Home, Search, Users, MessageSquare, Calendar, User, ShieldCheck,
  Bell, Settings, Bookmark, LogOut, ChevronDown, HelpCircle, Palette, Sparkles, BarChart3
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
import { CampusAnalyticsChartScreen } from "./CampusAnalyticsChartScreen";
import { SettingsScreen, AccentTheme, ThemeMode } from "./SettingsScreen";
import { StudentHomeScreen } from "./StudentHomeScreen";
import { CampusDesktopSidebar } from "./CampusDesktopSidebar";
import { CampusRightPanel } from "./CampusRightPanel";
import { SplashScreen } from "./SplashScreen";
import { TWENTY_STUDENT_PROFILES } from "./StudentProfilesDataset";
import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  fetchNotificationPreferences,
  getStoredNotifications,
  dispatchAppNotification,
} from "@/lib/notificationService";
import {
  AppNavState,
  TabType,
  decodeNavState,
  pushNavState,
  replaceNavState,
  encodeNavState,
} from "@/lib/navigationHistory";
import { supabase } from "@/integrations/supabase/client";
import { signOutUser } from "@/lib/auth";
import {
  getLiveProfile,
  upsertLiveProfile,
  fetchLiveDiscoverProfiles,
  fetchUserConversations,
  recordLiveSwipe,
  getLocalUserId,
} from "@/lib/supabaseLiveService";


const DEFAULT_FREE_PROFILE: StudentProfileData = {
  id: "ac5c42f3-1682-4f58-9522-ef7f7cbd88fd",
  email: "student@unicircle.app",
  firstName: "Alex",
  lastName: "Cisco",
  nickname: "Alex",
  dob: "2003-01-01",
  gender: "Male",
  orientation: "Straight",
  interestedIn: "Everyone",
  relationshipGoal: "Friendship",
  country: "Kenya",
  institutionType: "University",
  campus: "University of Nairobi",
  institutionId: "uon",
  faculty: "Engineering & Technology",
  course: "Computer Science",
  yearOfStudy: "3rd Year",
  height: "178 cm",
  lifestyle: { smoking: "Non-smoker", drinking: "Social drinker", pets: "Pet lover", religion: "Other" },
  interests: ["Campus Events", "Networking", "Tech", "Music", "Photography"],
  bio: "Computer Science student at UoN. Excited to connect on UniCircle!",
  photos: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"],
  verified: true,
};

export const CampusConnectApp: React.FC = () => {
  // 100% Free Direct Access: No login/account creation required
  const [isRegistered, setIsRegistered] = useState<boolean>(true);
  const [isBiometricVerified, setIsBiometricVerified] = useState<boolean>(true);
  const [showVerificationStudio, setShowVerificationStudio] = useState(false);

  // User Profile: Default to active verified student profile
  const [userProfile, setUserProfile] = useState<StudentProfileData>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("unicircle_user_profile");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.firstName || parsed.first_name)) return parsed;
        }
      } catch (err) {
        console.warn("Failed to load user profile from localStorage:", err);
      }
    }
    return DEFAULT_FREE_PROFILE;
  });

  // Global Reset Handler: Keeps app active in free mode
  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (e) {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("unicircle_user_profile");
      safeSetItem("unicircle_user_profile", JSON.stringify(DEFAULT_FREE_PROFILE));
    }
    setUserProfile(DEFAULT_FREE_PROFILE);
    setIsRegistered(true);
    setIsBiometricVerified(true);
    setShowVerificationStudio(false);
    setActiveTab("home");
    setShowUserDropdown(false);
    toast.success("Feed refreshed in free access mode!");
  };

  // Load and sync real logged-in user profile from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadCurrentStudent() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user && isMounted) {
          setIsRegistered(true);
          const liveProf = await getLiveProfile(authData.user.id);
          if (liveProf) {
            setUserProfile((prev) => {
              const updatedPhotos = (liveProf.photos && liveProf.photos.length > 0)
                ? liveProf.photos
                : (prev?.photos || ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"]);

              const merged: StudentProfileData = {
                email: authData.user.email || liveProf.email || prev?.email || "student@unicircle.app",
                firstName: liveProf.first_name || prev?.firstName || "Student",
                lastName: liveProf.last_name || prev?.lastName || "",
                nickname: liveProf.first_name || prev?.nickname || "Student",
                dob: prev?.dob || "2003-01-01",
                gender: (liveProf.gender as any) || prev?.gender || "Female",
                orientation: prev?.orientation || "Straight",
                interestedIn: (liveProf.interested_in as any) || prev?.interestedIn || "Everyone",
                relationshipGoal: prev?.relationshipGoal || "Friendship",
                country: liveProf.country || prev?.country || "Kenya",
                institutionType: "University",
                campus: liveProf.campus || prev?.campus || "University of Nairobi",
                institutionId: prev?.institutionId || "uon",
                faculty: prev?.faculty || "General Studies",
                course: liveProf.course || prev?.course || "Undergraduate",
                yearOfStudy: liveProf.year_of_study || prev?.yearOfStudy || "3rd Year",
                height: prev?.height || "170 cm",
                lifestyle: prev?.lifestyle || { smoking: "Non-smoker", drinking: "Social drinker", pets: "Pet lover", religion: "Other" },
                bio: liveProf.bio || prev?.bio || "Student on UniCircle looking to connect with peers!",
                interests: (liveProf.interests && liveProf.interests.length > 0) ? liveProf.interests : (prev?.interests || ["Campus Events", "Networking"]),
                photos: updatedPhotos,
                verified: liveProf.verified ?? prev?.verified ?? true,
              };
              if (typeof window !== "undefined") {
                safeSetItem("unicircle_user_profile", JSON.stringify(merged));
              }
              return merged;
            });
          }
        } else if (isMounted) {
          const localProfStr = typeof window !== "undefined" ? localStorage.getItem("unicircle_user_profile") : null;
          if (localProfStr) {
            try {
              const localProf = JSON.parse(localProfStr);
              if (localProf && (localProf.firstName || localProf.first_name)) {
                setIsRegistered(true);
                const syncId = authData?.user?.id || localProf.id || getLocalUserId();
                await upsertLiveProfile({
                  id: syncId,
                  first_name: localProf.firstName || localProf.first_name,
                  last_name: localProf.lastName || localProf.last_name || "",
                  email: localProf.email || `${syncId.substring(0, 8)}@unicircle.app`,
                  campus: localProf.campus || "University of Nairobi",
                  course: localProf.course || "Undergraduate",
                  year_of_study: localProf.yearOfStudy || localProf.year_of_study || "3rd Year",
                  photos: localProf.photos || [],
                  bio: localProf.bio || "",
                  interests: localProf.interests || ["Campus Events", "Networking"],
                  gender: localProf.gender || "Female",
                  verified: true,
                });
              }
            } catch (e) {}
          } else {
            setIsRegistered(false);
            setUserProfile(null);
          }
        }
      } catch (err) {
        console.warn("Could not sync live student profile from Supabase:", err);
      }
    }
    loadCurrentStudent();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setIsRegistered(false);
        setUserProfile(null);
      } else {
        loadCurrentStudent();
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleUpdateProfile = async (updated: StudentProfileData) => {
    setUserProfile(updated);
    if (typeof window !== "undefined") {
      try {
        safeSetItem("unicircle_user_profile", JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to save user profile to localStorage:", err);
      }
    }

    try {
      const syncUser = await ensureAuthenticatedUser();
      const syncId = syncUser?.id || (updated as any).id || userProfile?.id || getLocalUserId();
      await upsertLiveProfile({
        id: syncId,
        first_name: updated.firstName,
        last_name: updated.lastName,
        campus: updated.campus,
        country: updated.country,
        course: updated.course,
        year_of_study: updated.yearOfStudy,
        bio: updated.bio,
        photos: updated.photos,
        interests: updated.interests,
        gender: updated.gender,
        interested_in: updated.interestedIn,
        verified: updated.verified ?? true,
      });

      const refreshed = await fetchLiveDiscoverProfiles(syncId);
      if (refreshed && refreshed.length > 0) {
        setLiveProfiles(refreshed);
      }
    } catch (err) {
      console.warn("Could not push profile updates to Supabase:", err);
    }
  };

  // Centralized Navigation History State with Refresh Persistence
  const [navState, setNavState] = useState<AppNavState>(() => {
    if (typeof window === "undefined") return { tab: "home" };
    if (window.location.hash && window.location.hash.length > 1) {
      return decodeNavState(window.location.hash);
    }
    try {
      const lastHash = localStorage.getItem("unicircle_last_nav_hash");
      if (lastHash && lastHash.length > 1) {
        return decodeNavState(lastHash);
      }
      const lastTab = localStorage.getItem("unicircle_last_active_tab");
      if (lastTab) {
        return { tab: lastTab as TabType };
      }
    } catch (e) {}
    return { tab: "home" };
  });

  const activeTab = navState.tab;

  const [intentMode, setIntentMode] = useState<string>("Dating");
  const [discoveryRadius, setDiscoveryRadius] = useState<"MY_INSTITUTION" | "NEARBY" | "NATIONWIDE" | "INTERNATIONAL">("NATIONWIDE");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Notification Preferences & Unread Count State
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(() => {
    return getStoredNotifications().filter((n) => !n.read).length;
  });

  // User Profile Avatar "More" Dropdown State
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Theme & Personalization State (persisted to localStorage)
  const [accentTheme, setAccentThemeState] = useState<AccentTheme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("unicircle_accent_theme");
      if (saved) return saved as AccentTheme;
    }
    return "blue";
  });

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("unicircle_theme_mode");
      if (saved === "light" || saved === "dark" || saved === "system") return saved as ThemeMode;
    }
    return "dark";
  });

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (typeof window !== "undefined") {
      safeSetItem("unicircle_theme_mode", mode);
    }
  };

  const setAccentTheme = (acc: AccentTheme) => {
    setAccentThemeState(acc);
    if (typeof window !== "undefined") {
      safeSetItem("unicircle_accent_theme", acc);
    }
  };

  // Connections State
  const [matches, setMatches] = useState<StudentProfile[]>([TWENTY_STUDENT_PROFILES[0], TWENTY_STUDENT_PROFILES[1], TWENTY_STUDENT_PROFILES[3]]);
  const [activeChatMatch, setActiveChatMatch] = useState<StudentProfile | null>(TWENTY_STUDENT_PROFILES[0]);
  const [celebratedMatch, setCelebratedMatch] = useState<StudentProfile | null>(null);
  const [liveProfiles, setLiveProfiles] = useState<StudentProfile[]>([]);

  // Fetch real students from Supabase and hydrate conversations
  useEffect(() => {
    async function loadLiveStudentsAndChats() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData?.user?.id || getLocalUserId();

        // 1. Fetch real student accounts for discovery
        const liveProfs = await fetchLiveDiscoverProfiles(currentUserId);
        if (liveProfs && liveProfs.length > 0) {
          const formatted: StudentProfile[] = liveProfs.map((lp) => ({
            id: lp.id,
            name: `${lp.first_name || "Student"} ${lp.last_name || ""}`.trim(),
            age: 21,
            gender: (lp.gender as any) || "Female",
            campus: lp.campus || "University of Nairobi",
            country: lp.country || "Kenya",
            course: lp.course || "Computer Science",
            yearOfStudy: lp.year_of_study || "3rd Year",
            distanceKm: 1.2,
            compatibilityScore: 92,
            verified: lp.verified ?? true,
            online: true,
            intentMode: "Dating",
            photos: (lp.photos && lp.photos.length > 0) ? lp.photos : ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"],
            bio: lp.bio || "Student on UniCircle looking to connect with peers!",
            interests: (lp.interests && lp.interests.length > 0) ? lp.interests : ["Coding", "Campus Life", "Coffee"],
            prompts: [
              { question: "Best spot to study on campus", answer: "The university library top floor" }
            ],
            height: "172 cm",
            lifestyle: { smoking: "Non-smoker", drinking: "Socially" },
          }));
          setLiveProfiles(formatted);
          setMatches((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            return [...formatted.filter((f) => !existingIds.has(f.id)), ...prev];
          });
        }

        // 2. Fetch real conversations for the user
        if (currentUserId) {
          const convs = await fetchUserConversations(currentUserId);
          if (convs && convs.length > 0) {
            const convMatches: StudentProfile[] = convs
              .filter((c) => c.otherUser)
              .map((c) => {
                const u = c.otherUser!;
                return {
                  id: u.id,
                  name: `${u.first_name || "Student"} ${u.last_name || ""}`.trim(),
                  age: 21,
                  gender: (u.gender as any) || "Female",
                  campus: u.campus || "University of Nairobi",
                  country: u.country || "Kenya",
                  course: u.course || "Computer Science",
                  yearOfStudy: u.year_of_study || "3rd Year",
                  distanceKm: 1.0,
                  compatibilityScore: 95,
                  verified: u.verified ?? true,
                  online: true,
                  intentMode: "Dating",
                  photos: (u.photos && u.photos.length > 0) ? u.photos : ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"],
                  bio: u.bio || "Matched on UniCircle!",
                  interests: u.interests || ["Campus Life"],
                  prompts: [],
                  height: "170 cm",
                  lifestyle: { smoking: "No", drinking: "Socially" },
                };
              });

            if (convMatches.length > 0) {
              setMatches((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                return [...convMatches.filter((cm) => !existingIds.has(cm.id)), ...prev];
              });
              if (!activeChatMatch) {
                setActiveChatMatch(convMatches[0]);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not load live discover profiles or conversations:", err);
      }
    }

    loadLiveStudentsAndChats();
  }, [activeTab]);

  // Fetch notification preferences and listen for updates
  React.useEffect(() => {
    fetchNotificationPreferences().then(setNotifPrefs);

    const handleNotifUpdate = () => {
      const count = getStoredNotifications().filter((n) => !n.read).length;
      setUnreadNotifCount(count);
    };

    window.addEventListener("unicircle-notifications-updated", handleNotifUpdate);
    return () => window.removeEventListener("unicircle-notifications-updated", handleNotifUpdate);
  }, []);

  // Synchronize URL hash and browser history (popstate / hashchange / refresh)
  React.useEffect(() => {
    const initialDecoded = decodeNavState(window.location.hash);
    replaceNavState(initialDecoded);

    const handlePopState = (e: PopStateEvent) => {
      let stateToApply: AppNavState;
      if (e.state && e.state.unicircleNav) {
        stateToApply = e.state.unicircleNav;
      } else {
        stateToApply = decodeNavState(window.location.hash);
      }
      setNavState(stateToApply);
      setShowFilterDrawer(false);
      setShowUserDropdown(false);
      setCelebratedMatch(null);
    };

    const handleHashChange = () => {
      const decoded = decodeNavState(window.location.hash);
      setNavState((prev) => {
        if (encodeNavState(prev) === encodeNavState(decoded)) return prev;
        return decoded;
      });
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Persist current route on every nav change
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = encodeNavState(navState);
      try {
        safeSetItem("unicircle_last_active_tab", navState.tab);
        safeSetItem("unicircle_last_nav_hash", hash);
      } catch (e) {}
      if (window.location.hash !== hash) {
        replaceNavState(navState);
      }
    }
  }, [navState]);

  const handleNavigate = (newState: AppNavState) => {
    setNavState(newState);
    setShowUserDropdown(false);
    pushNavState(newState);
  };

  const handleTabChange = (newTab: TabType) => {
    if (newTab === activeTab && !navState.category && !navState.eventId && !navState.profileId && !navState.matchId && !navState.communityId) return;
    const newState: AppNavState = { tab: newTab };
    handleNavigate(newState);
  };

  const handleSwipeLike = async (profile: StudentProfile) => {
    if (!matches.some((m) => m.id === profile.id)) {
      setMatches([profile, ...matches]);
      setCelebratedMatch(profile);
    }
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user && profile.id.length > 10) {
      await recordLiveSwipe({
        swiperId: authData.user.id,
        targetId: profile.id,
        action: "like",
      });
    }
  };

  const handleSwipePass = async (profile: StudentProfile) => {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user && profile.id.length > 10) {
      await recordLiveSwipe({
        swiperId: authData.user.id,
        targetId: profile.id,
        action: "pass",
      });
    }
  };

  const handleSwipeSuperLike = async (profile: StudentProfile) => {
    if (!matches.some((m) => m.id === profile.id)) {
      setMatches([profile, ...matches]);
      setCelebratedMatch(profile);
    }
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user && profile.id.length > 10) {
      await recordLiveSwipe({
        swiperId: authData.user.id,
        targetId: profile.id,
        action: "superlike",
      });
    }
  };

  return (
    <div data-theme={themeMode} className={`min-h-screen font-sans flex flex-col lg:flex-row selection:bg-indigo-500 selection:text-white transition-colors duration-300 ${
      themeMode === "light" ? "bg-white text-slate-900" : "bg-[#070A10] text-slate-100"
    }`}>
      {/* UniCircle X-Style Launch Splash Screen */}
      <SplashScreen />

      {/* 1. DESKTOP LEFT SIDEBAR NAVIGATION (Visible on lg >= 1024px) */}
      {isRegistered && userProfile && (
        <div className="hidden lg:flex h-screen sticky top-0 shrink-0 z-30">
          <CampusDesktopSidebar
            activeTab={activeTab}
            onTabChange={(tab) => handleTabChange(tab)}
            userProfile={userProfile}
            unreadNotifCount={unreadNotifCount}
            activeMatchesCount={matches.length}
            themeMode={themeMode}
            onSignOut={handleSignOut}
          />
        </div>
      )}

      {/* 2. MOBILE & TABLET TOP HEADER (Visible on < 1024px) */}
      <header className={`lg:hidden sticky top-0 z-40 backdrop-blur-xl px-4 py-2.5 border-b transition-colors duration-300 ${
        themeMode === "light" ? "bg-white/90 border-slate-200 shadow-sm" : "bg-[#0B0F17]/90 border-white/10"
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => handleTabChange("home")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img
              src="/unicircle-icon.png"
              alt="UniCircle Logo"
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform"
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

          {/* Desktop Navigation Icons Bar (Tablet fallback) */}
          {isRegistered && (
            <nav className={`hidden md:flex lg:hidden items-center gap-1 px-2 py-1 rounded-2xl border transition-colors duration-300 ${
              themeMode === "light" ? "bg-slate-100 border-slate-200" : "bg-slate-900/80 border-white/10"
            }`}>
              {[
                { id: "home", label: "Home", icon: Home },
                { id: "discover", label: "Discover", icon: Search },
                { id: "communities", label: "Communities", icon: Users },
                { id: "events", label: "Events", icon: Calendar },
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
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-pink-500 border-2 border-slate-950 text-[9px] font-black text-white flex items-center justify-center min-w-[18px]">
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
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
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80";
                  }}
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pr-1" />
              </button>

              {/* User Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-bold text-white truncate">{userProfile?.firstName || "Student"} {userProfile?.lastName || ""}</p>
                    <p className="text-[10px] text-slate-400 truncate">{userProfile?.campus || "University"}</p>
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
                    onClick={() => { handleTabChange("chart"); setShowUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <BarChart3 className="w-4 h-4 text-cyan-400" /> Campus Analytics
                  </button>

                  <div className="pt-1 border-t border-white/10">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition cursor-pointer"
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

      {/* 3. CENTER COLUMN MAIN CONTENT WRAPPER */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto">
        <main className="flex-1 p-3 md:p-6 max-w-3xl mx-auto w-full min-w-0 pb-24 lg:pb-6">
          <>
            {activeTab === "home" && (
                <StudentHomeScreen
                  userProfile={userProfile}
                  liveProfiles={liveProfiles}
                  onNavigateToDiscover={() => handleTabChange("discover")}
                  onNavigateToEvents={() => handleTabChange("events")}
                  onNavigateToCommunity={() => handleTabChange("communities")}
                  onNavigate={handleNavigate}
                />
              )}

              {activeTab === "discover" && (
                <DiscoverDeck
                  currentProfile={userProfile}
                  profiles={[...liveProfiles, ...TWENTY_STUDENT_PROFILES.filter((s) => !liveProfiles.some((lp) => lp.id === s.id))]}
                  onSwipeLike={handleSwipeLike}
                  onSwipePass={handleSwipePass}
                  onSwipeSuperLike={handleSwipeSuperLike}
                  onOpenFilters={() => setShowFilterDrawer(true)}
                  intentMode={intentMode}
                  navState={navState}
                  onNavigate={handleNavigate}
                />
              )}

              {activeTab === "communities" && (
                <CommunityHub
                  userProfile={userProfile}
                  onUpdateProfile={handleUpdateProfile}
                  navState={navState}
                  onNavigate={handleNavigate}
                />
              )}

              {activeTab === "events" && (
                <CampusEventsHub
                  userProfile={userProfile}
                  navState={navState}
                  onNavigate={handleNavigate}
                />
              )}

              {activeTab === "chat" && (
                <RealTimeChatSuite
                  activeMatch={activeChatMatch}
                  matches={matches}
                  onSelectMatch={(m) => setActiveChatMatch(m)}
                  navState={navState}
                  onNavigate={handleNavigate}
                />
              )}

              {(activeTab === "notifications" || activeTab === "alerts") && (
                <NotificationsScreen
                  userProfile={userProfile}
                  onNavigate={handleNavigate}
                />
              )}

              {(activeTab === "chart" || activeTab === "analytics") && (
                <CampusAnalyticsChartScreen
                  userProfile={userProfile}
                  onNavigate={handleNavigate}
                />
              )}

              {activeTab === "profile" && (
                <UserProfileStudio
                  profile={userProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onLaunchLivenessScan={() => setShowVerificationStudio(true)}
                  onNavigateToSettings={() => handleTabChange("settings")}
                />
              )}

              {activeTab === "settings" && (
                <SettingsScreen
                  userProfile={userProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onNavigateToTab={(tab) => handleTabChange(tab as any)}
                  accentTheme={accentTheme}
                  onSelectAccentTheme={(acc) => setAccentTheme(acc)}
                  themeMode={themeMode}
                  onSelectThemeMode={(mode) => setThemeMode(mode)}
                  notificationPrefs={notifPrefs}
                  onUpdateNotificationPrefs={(p) => setNotifPrefs(p)}
                />
              )}
            </>
        </main>

        {/* 4. MOBILE & TABLET BOTTOM NAVIGATION BAR (< 1024px) */}
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl px-2 py-2 flex items-center justify-around border-t transition-colors duration-300 shadow-2xl ${
          themeMode === "light"
            ? "bg-white/95 border-slate-200 text-slate-700 shadow-slate-900/10"
            : "bg-[#0B0F17]/95 border-white/10 text-slate-400 shadow-black"
        }`}>
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "discover", label: "Discover", icon: Search },
            { id: "communities", label: "Community", icon: Users },
            { id: "events", label: "Events", icon: Calendar },
            { id: "chat", label: "Chats", icon: MessageSquare, badge: matches.length > 0 ? matches.length : undefined },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as any)}
                className={`relative flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "text-indigo-400 font-black scale-105"
                    : themeMode === "light"
                    ? "text-slate-500 hover:text-slate-900"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? "text-indigo-400 stroke-[2.5]" : ""}`} />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[8px] font-black min-w-[15px] h-[15px] flex items-center justify-center border border-slate-950">
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight">{tab.label}</span>
                {isActive && (
                  <span className="absolute -bottom-0.5 w-4 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. DESKTOP RIGHT CONTEXTUAL PANEL (Visible on xl >= 1280px) */}
      {isRegistered && (
        <div className="hidden xl:flex h-screen sticky top-0 shrink-0 z-30">
          <CampusRightPanel
            onNavigate={handleNavigate}
            userProfile={userProfile}
            themeMode={themeMode}
          />
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
