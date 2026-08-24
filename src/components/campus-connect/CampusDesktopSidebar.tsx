import React from "react";
import {
  Home, Search, Users, Calendar, MessageSquare, Bell, User, Settings,
  BarChart3, LogOut, ShieldCheck, ChevronDown, Sparkles, Building2
} from "lucide-react";
import { TabType, AppNavState } from "@/lib/navigationHistory";

interface Props {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  userProfile?: any;
  unreadNotifCount?: number;
  activeMatchesCount?: number;
  themeMode?: "light" | "dark" | "system";
  onSignOut?: () => void;
}

export const CampusDesktopSidebar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  userProfile,
  unreadNotifCount = 0,
  activeMatchesCount = 0,
  themeMode = "dark",
  onSignOut,
}) => {
  const isLight = themeMode === "light";
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "discover", label: "Discover Students", icon: Search },
    { id: "communities", label: "Communities", icon: Users },
    { id: "events", label: "Campus Events", icon: Calendar },
    { id: "chat", label: "Chats & Messages", icon: MessageSquare, badge: activeMatchesCount > 0 ? activeMatchesCount : undefined },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotifCount > 0 ? unreadNotifCount : undefined },
  ];

  return (
    <aside className={`w-64 xl:w-72 h-full p-4 flex flex-col justify-between shrink-0 select-none border-r ${
      isLight ? "bg-white/90 border-slate-200" : "bg-[#0B0F17]/90 border-white/10"
    }`}>
      <div className="space-y-6">
        {/* Brand Header */}
        <div
          onClick={() => onTabChange("home")}
          className="flex items-center gap-3 px-2 py-1 cursor-pointer group"
        >
          <img
            src="/unicircle-icon.png"
            alt="UniCircle Logo"
            className="w-9 h-9 object-contain group-hover:scale-105 transition-transform"
          />
          <div>
            <h1 className={`text-lg font-black tracking-tight flex items-center gap-0.5 ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              Uni<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Circle</span>
            </h1>
            <p className={`text-[10px] font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Verified Campus Network
            </p>
          </div>
        </div>

        {/* Vertical Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === "notifications" && activeTab === "alerts");

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as TabType)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-lg shadow-indigo-600/20"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : isLight ? "text-slate-500" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-pink-500 text-white"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Direct Desktop Sign Out Button */}
          {onSignOut && (
            <div className="pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => onSignOut()}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* User Profile Pill at Bottom with Popup Menu */}
      <div className="relative">
        {/* Profile Dropup Menu */}
        {showProfileMenu && (
          <div className={`absolute bottom-full mb-2 left-0 right-0 p-2 rounded-2xl border shadow-2xl space-y-1 z-50 ${
            isLight ? "bg-white border-slate-200 shadow-xl" : "bg-slate-900 border-white/15"
          }`}>
            <button
              onClick={() => { onTabChange("profile"); setShowProfileMenu(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === "profile"
                  ? "bg-indigo-600 text-white"
                  : isLight ? "text-slate-700 hover:bg-slate-100" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <User className="w-4 h-4 text-indigo-400" /> My Profile
            </button>

            <button
              onClick={() => { onTabChange("settings"); setShowProfileMenu(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === "settings"
                  ? "bg-indigo-600 text-white"
                  : isLight ? "text-slate-700 hover:bg-slate-100" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4 text-purple-400" /> Settings & Privacy
            </button>

            <button
              onClick={() => { onTabChange("chart"); setShowProfileMenu(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === "chart" || activeTab === "analytics"
                  ? "bg-indigo-600 text-white"
                  : isLight ? "text-slate-700 hover:bg-slate-100" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" /> Campus Analytics
            </button>

            {onSignOut && (
              <div className="pt-1 border-t border-white/10">
                <button
                  onClick={() => { onSignOut(); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        )}

        <div
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={`p-3 rounded-2xl border transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
            isLight ? "bg-slate-100 border-slate-200 hover:border-slate-300" : "bg-slate-950/80 border-white/10 hover:border-white/20"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-white/10">
              <img
                src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
                alt="User"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80";
                }}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 p-0.5 bg-emerald-500 rounded-full text-slate-950">
                <ShieldCheck className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="min-w-0">
              <h4 className={`text-xs font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                {userProfile?.firstName || "Student"} {userProfile?.lastName || ""}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">{userProfile?.campus || "University"}</p>
            </div>
          </div>

          <ChevronDown className={`w-4 h-4 transition-transform ${showProfileMenu ? "rotate-180 text-indigo-400" : "text-slate-400"}`} />
        </div>
      </div>
    </aside>
  );
};
