import React from "react";
import {
  Home, Search, Users, Calendar, MessageSquare, Bell, Settings,
  LogOut, ShieldCheck, CheckCircle2, User
} from "lucide-react";
import { TabType } from "@/lib/navigationHistory";

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
  unreadNotifCount = 4,
  activeMatchesCount = 4,
  themeMode = "dark",
  onSignOut,
}) => {
  const isLight = themeMode === "light";

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "discover", label: "Discover Students", icon: Search },
    { id: "communities", label: "Communities", icon: Users },
    { id: "events", label: "Campus Events", icon: Calendar },
    { id: "chat", label: "Chats", icon: MessageSquare, badge: activeMatchesCount > 0 ? activeMatchesCount : 4 },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotifCount > 0 ? unreadNotifCount : 4 },
    { id: "profile", label: "My Profile", icon: User },
  ];

  return (
    <aside className={`w-64 xl:w-72 h-full p-5 flex flex-col justify-between shrink-0 select-none border-r transition-colors duration-200 ${
      isLight ? "bg-white border-slate-200" : "bg-[#090D16] border-white/5 text-white"
    }`}>
      <div className="space-y-7">
        {/* Brand Header */}
        <div
          onClick={() => onTabChange("home")}
          className="flex items-center gap-3 px-2 cursor-pointer group"
        >
          <img
            src="/unicircle-icon.png"
            alt="UniCircle Logo"
            className="w-10 h-10 object-contain shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/unicircle-splash-logo.png";
            }}
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-0.5">
              UniCircle
            </h1>
            <p className="text-xs text-slate-400 font-normal">
              Campus Community
            </p>
          </div>
        </div>

        {/* Vertical Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === "notifications" && activeTab === "alerts");

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as TabType)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#4F46E5] text-white shadow-lg shadow-indigo-600/30 font-semibold"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`w-5 h-5 ${isActive ? "text-white stroke-[2.2]" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F43F5E] text-white min-w-[20px] text-center shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 space-y-1 border-t border-white/5">
            {/* Settings */}
            <button
              onClick={() => onTabChange("settings")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[#4F46E5] text-white font-semibold shadow-lg shadow-indigo-600/30"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className={`w-5 h-5 ${activeTab === "settings" ? "text-white stroke-[2.2]" : "text-slate-400"}`} />
              <span>Settings</span>
            </button>

            {/* Direct Sign Out */}
            {onSignOut && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSignOut();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
              >
                <LogOut className="w-5 h-5 text-red-400" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Bottom University Card with Faded Campus Background */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/90 shadow-xl p-4 mt-4">
        {/* Background photo of campus architecture with dark gradient */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=80"
            alt="University Campus"
            className="w-full h-full object-cover opacity-20 filter grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/90 to-transparent" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified Network</span>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{userProfile?.campus || "University of Nairobi"}</span>
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3 fill-blue-500 text-white" />
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              14,250+ students • Nairobi, Kenya
            </p>
          </div>

          <p className="text-[11px] text-slate-400/90 italic pt-1 leading-relaxed">
            Real people. Real stories. Same campus.
          </p>
        </div>
      </div>
    </aside>
  );
};
