import React, { useState } from "react";
import {
  Settings, User, Shield, Bell, Eye, Moon, Sun, Monitor, Palette,
  Globe, Zap, HelpCircle, Info, LogOut, ChevronRight, Lock, Check,
  Sliders, ShieldCheck, Trash2, Smartphone, Volume2, AlertTriangle, RefreshCw, BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  fetchNotificationPreferences,
  saveNotificationPreferenceToDatabase,
} from "@/lib/notificationService";

export type ThemeMode = "light" | "dark" | "system";
export type AccentTheme = "blue" | "purple" | "emerald" | "sunset" | "ocean" | "rose";

export const ACCENT_THEMES: { id: AccentTheme; name: string; icon: string; colorClass: string; gradient: string }[] = [
  { id: "blue", name: "UniCircle Blue", icon: "🎓", colorClass: "bg-indigo-600", gradient: "from-indigo-600 to-blue-600" },
  { id: "purple", name: "Royal Purple", icon: "🟣", colorClass: "bg-purple-600", gradient: "from-purple-600 to-indigo-600" },
  { id: "emerald", name: "Emerald", icon: "🟢", colorClass: "bg-emerald-600", gradient: "from-emerald-600 to-teal-600" },
  { id: "sunset", name: "Sunset", icon: "🟠", colorClass: "bg-amber-600", gradient: "from-amber-600 to-orange-600" },
  { id: "ocean", name: "Ocean", icon: "🌊", colorClass: "bg-cyan-600", gradient: "from-cyan-600 to-blue-600" },
  { id: "rose", name: "Rose", icon: "🌸", colorClass: "bg-pink-600", gradient: "from-pink-600 to-rose-600" },
];

interface Props {
  userProfile?: any;
  onNavigateToTab?: (tab: string) => void;
  accentTheme?: AccentTheme;
  onSelectAccentTheme?: (accent: AccentTheme) => void;
  themeMode?: ThemeMode;
  onSelectThemeMode?: (mode: ThemeMode) => void;
  notificationPrefs?: NotificationPreferences;
  onUpdateNotificationPrefs?: (prefs: NotificationPreferences) => void;
}

export const SettingsScreen: React.FC<Props> = ({
  userProfile,
  onNavigateToTab,
  accentTheme = "blue",
  onSelectAccentTheme,
  themeMode = "dark",
  onSelectThemeMode,
  notificationPrefs: externalPrefs,
  onUpdateNotificationPrefs,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("account");
  const [currentAccent, setCurrentAccent] = useState<AccentTheme>(accentTheme);
  const [currentMode, setCurrentMode] = useState<ThemeMode>(themeMode);

  // Notification Controls Preferences State
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    externalPrefs || DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    fetchNotificationPreferences().then((prefs) => {
      setNotifPrefs(prefs);
      if (onUpdateNotificationPrefs) onUpdateNotificationPrefs(prefs);
    });
  }, []);

  const handleToggleNotificationPref = async (key: keyof NotificationPreferences, newValue: boolean) => {
    setSavingKey(key);
    setSaveError(null);
    setSaveSuccess(null);

    // Optimistic UI update
    const previousValue = notifPrefs[key];
    const optimisticPrefs = { ...notifPrefs, [key]: newValue };
    setNotifPrefs(optimisticPrefs);
    if (onUpdateNotificationPrefs) onUpdateNotificationPrefs(optimisticPrefs);

    // Save to database / local cache
    const res = await saveNotificationPreferenceToDatabase(key, newValue, notifPrefs);

    if (!res.success) {
      // Restore previous switch state and display error message
      const revertedPrefs = { ...notifPrefs, [key]: previousValue };
      setNotifPrefs(revertedPrefs);
      if (onUpdateNotificationPrefs) onUpdateNotificationPrefs(revertedPrefs);
      setSaveError(res.error || "Failed to save preference to database");
      setTimeout(() => setSaveError(null), 4000);
    } else {
      setSaveSuccess("Saved to database ✓");
      setTimeout(() => setSaveSuccess(null), 2500);
    }
    setSavingKey(null);
  };

  // Appearance Local Settings
  const [fontSize, setFontSize] = useState<"Small" | "Default" | "Large" | "Extra Large">("Default");
  const [density, setDensity] = useState<"Comfortable" | "Compact" | "Spacious">("Comfortable");
  const [animations, setAnimations] = useState(true);
  const [blurEffects, setBlurEffects] = useState(true);

  // Language Local Setting
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  const handleAccentChange = (accent: AccentTheme) => {
    setCurrentAccent(accent);
    if (onSelectAccentTheme) onSelectAccentTheme(accent);
  };

  const handleModeChange = (mode: ThemeMode) => {
    setCurrentMode(mode);
    if (onSelectThemeMode) onSelectThemeMode(mode);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const CATEGORIES = [
    { id: "account", label: "Account", icon: User, color: "text-indigo-400" },
    { id: "appearance", label: "Appearance", icon: Palette, color: "text-purple-400" },
    { id: "analytics", label: "Campus Analytics", icon: BarChart3, color: "text-indigo-400" },
    { id: "notifications", label: "Notifications", icon: Bell, color: "text-pink-400" },
    { id: "privacy", label: "Privacy", icon: Eye, color: "text-blue-400" },
    { id: "safety", label: "Safety & Security", icon: Shield, color: "text-emerald-400" },
    { id: "accessibility", label: "Accessibility", icon: Sliders, color: "text-cyan-400" },
    { id: "language", label: "Language", icon: Globe, color: "text-amber-400" },
    { id: "storage", label: "Storage & Data", icon: Zap, color: "text-teal-400" },
    { id: "about", label: "About UniCircle", icon: Info, color: "text-slate-400" },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-indigo-400" />
            Settings & Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage your account, appearance, safety, and privacy preferences</p>
        </div>
      </div>

      {/* 2-Column Responsive Layout (Categories Navigation + Active Section Content) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Categories Sidebar */}
        <div className="md:col-span-1 space-y-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : cat.color}`} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Right Active Section Details Pane */}
        <div className="md:col-span-3 bg-slate-900/90 border border-white/10 rounded-3xl p-6 space-y-6 backdrop-blur-xl">
          {/* 1. ACCOUNT CATEGORY */}
          {activeCategory === "account" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Account Information</h3>
                <p className="text-xs text-slate-400">Manage your verified university details and credentials</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">First Name</label>
                    <p className="text-sm font-semibold text-white mt-1">{userProfile?.firstName || "Alex"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Last Name</label>
                    <p className="text-sm font-semibold text-white mt-1">{userProfile?.lastName || "Chen"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">University Email</label>
                    <p className="text-sm font-semibold text-white mt-1">{userProfile?.email || "student@uonbi.ac.ke"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Campus & Country</label>
                    <p className="text-sm font-semibold text-white mt-1">{userProfile?.campus || "University of Nairobi"} ({userProfile?.country || "Kenya"})</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300">Biometric Verification Active</h4>
                      <p className="text-[11px] text-slate-400">Verified student account with biometric facial liveness lock</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex gap-3">
                  <button className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">
                    Change Password
                  </button>
                  <button className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition">
                    Update Phone Number
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CAMPUS ANALYTICS CATEGORY */}
          {activeCategory === "analytics" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  Campus Analytics & Insights
                </h3>
                <p className="text-xs text-slate-400">View real-time connection stats, student engagement trends, and activity metrics for your campus</p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-950/60 border border-white/10 text-center space-y-4">
                <BarChart3 className="w-12 h-12 text-indigo-400 mx-auto" />
                <div>
                  <h4 className="text-base font-bold text-white">Full Campus Activity Dashboard</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Track connection volume, weekly engagement charts, and faculty-wide student interest distribution.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateToTab && onNavigateToTab("chart")}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:opacity-90 transition cursor-pointer"
                >
                  Open Full Analytics Dashboard
                </button>
              </div>
            </div>
          )}

          {/* 2. APPEARANCE CATEGORY */}
          {activeCategory === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Appearance & Theme Personalization</h3>
                <p className="text-xs text-slate-400">Customize accent colors, theme mode, and visual density</p>
              </div>

              {/* Theme Mode Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Theme Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "dark", label: "Dark Mode", icon: Moon },
                    { id: "light", label: "Light Mode", icon: Sun },
                    { id: "system", label: "System Default", icon: Monitor },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSel = currentMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => handleModeChange(mode.id as ThemeMode)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition ${
                          isSel
                            ? "bg-indigo-600/20 border-indigo-500 text-white font-bold"
                            : "bg-slate-950/60 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-1.5 text-indigo-400" />
                        <span className="text-xs">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color Selector */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Accent Theme Color</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ACCENT_THEMES.map((acc) => {
                    const isSelected = currentAccent === acc.id;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleAccentChange(acc.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition text-left ${
                          isSelected
                            ? "bg-slate-950 border-indigo-500 text-white font-bold ring-2 ring-indigo-500/40"
                            : "bg-slate-950/60 border-white/10 text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <span className="text-lg">{acc.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{acc.name}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Size & Spacing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Font Scaling</label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Small">Small (Compact)</option>
                    <option value="Default">Default (Recommended)</option>
                    <option value="Large">Large</option>
                    <option value="Extra Large">Extra Large</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Interface Density</label>
                  <select
                    value={density}
                    onChange={(e) => setDensity(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Comfortable">Comfortable</option>
                    <option value="Compact">Compact</option>
                    <option value="Spacious">Spacious</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Smooth Motion Animations</h4>
                    <p className="text-[11px] text-slate-400">Micro-animations for cards and screen transitions</p>
                  </div>
                  <ToggleSwitch defaultOn={animations} onChange={(v) => setAnimations(v)} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Background Glass Blur Effects</h4>
                    <p className="text-[11px] text-slate-400">Glassmorphism backdrop blurs for navigation bars and modals</p>
                  </div>
                  <ToggleSwitch defaultOn={blurEffects} onChange={(v) => setBlurEffects(v)} />
                </div>
              </div>
            </div>
          )}

          {/* 3. NOTIFICATIONS CATEGORY */}
          {activeCategory === "notifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Notification Controls</h3>
                  <p className="text-xs text-slate-400">Granular control over push, email, and in-app alerts</p>
                </div>
                {saveSuccess && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
                    {saveSuccess}
                  </span>
                )}
              </div>

              {saveError && (
                <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  {saveError}
                </div>
              )}

              <div className="space-y-2.5">
                {[
                  { key: "friendRequests" as const, label: "Friend Requests", desc: "When another verified student sends a friend request" },
                  { key: "directMessages" as const, label: "Direct Messages", desc: "When an accepted connection sends a message" },
                  { key: "relationshipExpressions" as const, label: "Relationship Expressions", desc: "When someone expresses relationship interest" },
                  { key: "studyInvitations" as const, label: "Study Invitations", desc: "Invites to join revision groups or project teams" },
                  { key: "communityAnnouncements" as const, label: "Community Announcements", desc: "Official updates from your university community" },
                  { key: "campusEventReminders" as const, label: "Campus Event Reminders", desc: "Reminders for events you're attending" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.label}</h4>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={notifPrefs[item.key]}
                      disabled={savingKey === item.key}
                      onChange={(newVal) => handleToggleNotificationPref(item.key, newVal)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. PRIVACY CATEGORY */}
          {activeCategory === "privacy" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Privacy & Visibility</h3>
                <p className="text-xs text-slate-400">Control who can discover your profile and see your activity</p>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: "Profile Visibility in Discover", desc: "Allow other students to view your card in Discover feed", defaultOn: true },
                  { label: "Show Online Status", desc: "Display green online indicator when active", defaultOn: true },
                  { label: "Show Read Receipts", desc: "Allow connections to see when you've read their message", defaultOn: true },
                  { label: "Show Typing Indicator", desc: "Show when you are typing a response in chat", defaultOn: true },
                  { label: "Cross-University Discovery", desc: "Allow students from other universities to discover you", defaultOn: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.label}</h4>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </div>
                    <ToggleSwitch defaultOn={item.defaultOn} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. SAFETY & SECURITY CATEGORY */}
          {activeCategory === "safety" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Safety & Account Security</h3>
                <p className="text-xs text-slate-400">Student safety tools, block lists, and authentication controls</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" /> Blocked Users
                  </h4>
                  <p className="text-[11px] text-slate-400">No blocked accounts. Blocked users cannot message or see your profile.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Report History
                  </h4>
                  <p className="text-[11px] text-slate-400">0 active reports. Report inappropriate profiles directly from their card.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-white">Two-Factor Authentication & Trusted Sessions</h4>
                <p className="text-[11px] text-slate-400">Require an OTP code sent to your verified student email on new device logins.</p>
                <button className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">
                  Enable Two-Factor Auth
                </button>
              </div>
            </div>
          )}

          {/* 6. ACCESSIBILITY CATEGORY */}
          {activeCategory === "accessibility" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Accessibility Features</h3>
                <p className="text-xs text-slate-400">Support for screen readers, high contrast, and reduced motion</p>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: "High Contrast Mode", desc: "Increase color contrast for text and icon elements", defaultOn: false },
                  { label: "Reduce Motion", desc: "Disable smooth sliding and spring animations", defaultOn: false },
                  { label: "Keyboard Navigation Enhancements", desc: "Focus indicators for screen readers and tab navigation", defaultOn: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.label}</h4>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </div>
                    <ToggleSwitch defaultOn={item.defaultOn} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. LANGUAGE CATEGORY */}
          {activeCategory === "language" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Language & Region</h3>
                <p className="text-xs text-slate-400">Select your preferred application language</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { code: "en", name: "English (Default)", flag: "🇬🇧" },
                  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
                  { code: "fr", name: "Français", flag: "🇫🇷" },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.name)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border transition ${
                      selectedLanguage.includes(lang.name.split(" ")[0])
                        ? "bg-indigo-600/20 border-indigo-500 text-white font-bold"
                        : "bg-slate-950/60 border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="text-xs">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 8. STORAGE & DATA CATEGORY */}
          {activeCategory === "storage" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Storage & Data Performance</h3>
                <p className="text-xs text-slate-400">Manage image caching and data usage</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Image Cache (14.2 MB)</h4>
                  <p className="text-[11px] text-slate-400">Local profile images and community photos</p>
                </div>
                <button className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Clear Cache
                </button>
              </div>
            </div>
          )}

          {/* 9. ABOUT CATEGORY */}
          {activeCategory === "about" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">About UniCircle</h3>
                <p className="text-xs text-slate-400">Verified social platform for university students</p>
              </div>

              <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/5 space-y-2 text-xs text-slate-300">
                <p className="font-bold text-white text-sm">UniCircle Campus Connect v1.0.0</p>
                <p>Designed for verified university students across East Africa & Global campuses.</p>
                <div className="pt-3 border-t border-white/5 flex flex-wrap gap-4 text-indigo-400 font-semibold">
                  <a href="#" className="hover:underline">Privacy Policy</a>
                  <a href="#" className="hover:underline">Terms of Service</a>
                  <a href="#" className="hover:underline">Community Guidelines</a>
                  <a href="#" className="hover:underline">Report a Bug</a>
                </div>
              </div>
            </div>
          )}

          {/* Sign Out Button at bottom of details */}
          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={handleSignOut}
              className="px-5 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out of Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function ToggleSwitch({
  defaultOn,
  checked,
  disabled,
  onChange,
}: {
  defaultOn?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const [internalOn, setInternalOn] = useState(defaultOn ?? true);
  const isOn = checked !== undefined ? checked : internalOn;

  return (
    <button
      disabled={disabled}
      onClick={() => {
        const next = !isOn;
        setInternalOn(next);
        if (onChange) onChange(next);
      }}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${isOn ? "bg-indigo-600" : "bg-slate-800"}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
          isOn ? "left-0.5" : "left-0.5"
        }`}
        style={{ transform: isOn ? "translateX(22px)" : "translateX(0)" }}
      />
    </button>
  );
}
