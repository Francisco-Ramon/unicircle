import React from "react";
import { Users, Calendar, ShieldCheck, Sparkles, MapPin, ChevronRight, UserPlus, ArrowRight, Activity } from "lucide-react";
import { TWENTY_STUDENT_PROFILES, StudentProfile } from "./StudentProfilesDataset";
import { SAMPLE_EVENTS, CampusEvent } from "./CampusEventsHub";
import { AppNavState } from "@/lib/navigationHistory";

interface Props {
  onNavigate: (state: AppNavState) => void;
  userProfile?: any;
  themeMode?: "light" | "dark" | "system";
}

export const CampusRightPanel: React.FC<Props> = ({ onNavigate, userProfile, themeMode = "dark" }) => {
  const suggestedProfiles = TWENTY_STUDENT_PROFILES.slice(0, 4);
  const upcomingEvents = SAMPLE_EVENTS.slice(0, 3);

  const isLight = themeMode === "light";

  return (
    <aside className={`w-80 h-full p-4 space-y-5 overflow-y-auto shrink-0 select-none border-l ${
      isLight ? "bg-white/80 border-slate-200" : "bg-[#0B0F17]/80 border-white/10"
    }`}>
      {/* 1. Verified Campus Network Status */}
      <div className={`p-4 rounded-3xl border shadow-sm space-y-2.5 ${
        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-white/10"
      }`}>
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Network
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <h4 className={`text-xs font-black uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
            {userProfile?.campus || "University Network"}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            14,250+ Verified Students Active Nationwide
          </p>
        </div>
      </div>

      {/* 2. Suggested Connections */}
      <div className={`p-4 rounded-3xl border shadow-sm space-y-3 ${
        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-white/10"
      }`}>
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            isLight ? "text-slate-800" : "text-white"
          }`}>
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Suggested Connections
          </h3>
          <button
            onClick={() => onNavigate({ tab: "discover" })}
            className="text-[10px] text-indigo-400 font-bold hover:underline"
          >
            See All
          </button>
        </div>

        <div className="space-y-3">
          {suggestedProfiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2.5 group">
              <div
                onClick={() => onNavigate({ tab: "discover" })}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer"
              >
                <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-white/10">
                  <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  {p.verified && (
                    <span className="absolute bottom-0 right-0 p-0.5 bg-emerald-500 rounded-full text-slate-950">
                      <ShieldCheck className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className={`text-xs font-bold truncate group-hover:text-indigo-400 transition ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}>
                    {p.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">{p.course} • {p.campus}</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate({ tab: "discover" })}
                className="p-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition shrink-0 cursor-pointer"
                title="Connect"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Upcoming Campus Events */}
      <div className={`p-4 rounded-3xl border shadow-sm space-y-3 ${
        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-white/10"
      }`}>
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            isLight ? "text-slate-800" : "text-white"
          }`}>
            <Calendar className="w-3.5 h-3.5 text-pink-400" />
            Upcoming Events
          </h3>
          <button
            onClick={() => onNavigate({ tab: "events" })}
            className="text-[10px] text-pink-400 font-bold hover:underline"
          >
            Explore
          </button>
        </div>

        <div className="space-y-3">
          {upcomingEvents.map((evt) => (
            <div
              key={evt.id}
              onClick={() => onNavigate({ tab: "events", eventId: evt.id })}
              className={`p-3 rounded-2xl border transition cursor-pointer group ${
                isLight ? "bg-white border-slate-200 hover:border-indigo-400" : "bg-slate-950/60 border-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-[9px] font-bold">
                  {evt.category}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{evt.date}</span>
              </div>
              <h4 className={`text-xs font-bold mt-1.5 truncate group-hover:text-indigo-400 transition ${
                isLight ? "text-slate-900" : "text-white"
              }`}>
                {evt.title}
              </h4>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {evt.location}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="px-2 pt-2 text-[10px] text-slate-500 space-y-1">
        <div className="flex flex-wrap gap-2">
          <a href="#" className="hover:underline">Privacy</a>
          <span>•</span>
          <a href="#" className="hover:underline">Safety</a>
          <span>•</span>
          <a href="#" className="hover:underline">Terms</a>
          <span>•</span>
          <a href="#" className="hover:underline">Guidelines</a>
        </div>
        <p>© {new Date().getFullYear()} UniCircle Campus Social Platform</p>
      </div>
    </aside>
  );
};
