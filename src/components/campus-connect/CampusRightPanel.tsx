import React, { useState } from "react";
import {
  Users, Calendar, Flame, ChevronRight, ArrowUpRight, Check
} from "lucide-react";
import { AppNavState } from "@/lib/navigationHistory";
import { SocialGraphService } from "@/lib/social/socialGraphService";
import { getLocalUserId } from "@/lib/supabaseLiveService";

interface Props {
  onNavigate: (state: AppNavState) => void;
  userProfile?: any;
  liveProfiles?: any[];
  liveEvents?: any[];
  themeMode?: "light" | "dark" | "system";
}

const DEFAULT_SUGGESTED_STUDENTS = [
  {
    id: "sug_1",
    name: "Brian Otieno",
    course: "Engineering",
    year: "3rd Year",
    photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "sug_2",
    name: "Sharon Achieng",
    course: "Business",
    year: "2nd Year",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "sug_3",
    name: "Kevin Mutiso",
    course: "Computer Science",
    year: "3rd Year",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "sug_4",
    name: "Linet Wambui",
    course: "Science",
    year: "2nd Year",
    photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
  },
];

const TRENDING_TOPICS = [
  { tag: "#KUCCPS", postsCount: "1.2K posts" },
  { tag: "#EngineeringWeek", postsCount: "856 posts" },
  { tag: "#HostelLife", postsCount: "620 posts" },
  { tag: "#Freshers2026", postsCount: "489 posts" },
];

const DEFAULT_UPCOMING_EVENTS = [
  {
    id: "evt_1",
    dayName: "FRI",
    dayNum: "12",
    color: "from-indigo-600 to-indigo-700",
    title: "Engineering Career Fair",
    timeLocation: "10:00 AM • UoN Main Campus",
  },
  {
    id: "evt_2",
    dayName: "SAT",
    dayNum: "13",
    color: "from-pink-600 to-rose-600",
    title: "Interfaculty Games",
    timeLocation: "2:00 PM • UoN Sports Complex",
  },
  {
    id: "evt_3",
    dayName: "TUE",
    dayNum: "16",
    color: "from-blue-600 to-indigo-600",
    title: "Tech & Innovation Talk",
    timeLocation: "11:00 AM • UoN Auditorium",
  },
];

export const CampusRightPanel: React.FC<Props> = ({
  onNavigate,
  userProfile,
  liveProfiles = [],
  liveEvents = [],
  themeMode = "dark",
}) => {
  const isLight = themeMode === "light";
  const currentUserId = userProfile?.id || getLocalUserId();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const handleToggleFollow = (id: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        SocialGraphService.unfollowUser(currentUserId, id);
      } else {
        next.add(id);
        SocialGraphService.followUser(currentUserId, id);
      }
      return next;
    });
  };

  // Combine live database profiles with defaults
  const studentList = liveProfiles.length >= 4
    ? liveProfiles.slice(0, 4).map((p) => ({
        id: p.id,
        name: p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Student",
        course: p.course || "Undergraduate",
        year: p.yearOfStudy || p.year_of_study || "2nd Year",
        photo: p.photos?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      }))
    : DEFAULT_SUGGESTED_STUDENTS;

  return (
    <aside className={`w-80 h-full p-4 space-y-4 overflow-y-auto shrink-0 select-none border-l transition-colors duration-200 ${
      isLight ? "bg-white border-slate-200" : "bg-[#090D16] border-white/5 text-white"
    }`}>
      {/* 1. People You May Know */}
      <div className={`p-4 rounded-2xl border transition-colors ${
        isLight ? "bg-slate-50/80 border-slate-200" : "bg-[#101726]/80 border-white/5"
      }`}>
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            People You May Know
          </h3>
          <button
            onClick={() => onNavigate({ tab: "discover" })}
            className="text-[11px] text-indigo-400 font-semibold hover:underline"
          >
            See All
          </button>
        </div>

        <div className="space-y-3.5">
          {studentList.map((student) => {
            const isFollowing = followedIds.has(student.id) || SocialGraphService.isFollowing(currentUserId, student.id);

            return (
              <div key={student.id} className="flex items-center justify-between gap-2.5">
                <div
                  onClick={() => onNavigate({ tab: "discover", profileId: student.id })}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                >
                  <img
                    src={student.photo}
                    alt={student.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                      {student.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {student.course} • {student.year}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleFollow(student.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer ${
                    isFollowing
                      ? "bg-white/10 text-slate-300 border border-white/10 hover:bg-white/15"
                      : "border border-indigo-500/50 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Trending on Campus */}
      <div className={`p-4 rounded-2xl border transition-colors ${
        isLight ? "bg-slate-50/80 border-slate-200" : "bg-[#101726]/80 border-white/5"
      }`}>
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-pink-500" />
            Trending on Campus
          </h3>
          <button
            onClick={() => onNavigate({ tab: "communities" })}
            className="text-[11px] text-indigo-400 font-semibold hover:underline"
          >
            See All
          </button>
        </div>

        <div className="space-y-3">
          {TRENDING_TOPICS.map((topic) => (
            <div
              key={topic.tag}
              onClick={() => onNavigate({ tab: "communities" })}
              className="flex items-center justify-between py-1 cursor-pointer group"
            >
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {topic.tag}
                </h4>
                <p className="text-[10px] text-slate-400">{topic.postsCount}</p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Upcoming Events */}
      <div className={`p-4 rounded-2xl border transition-colors ${
        isLight ? "bg-slate-50/80 border-slate-200" : "bg-[#101726]/80 border-white/5"
      }`}>
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Upcoming Events
          </h3>
          <button
            onClick={() => onNavigate({ tab: "events" })}
            className="text-[11px] text-indigo-400 font-semibold hover:underline"
          >
            See All
          </button>
        </div>

        <div className="space-y-3">
          {DEFAULT_UPCOMING_EVENTS.map((evt) => (
            <div
              key={evt.id}
              onClick={() => onNavigate({ tab: "events" })}
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Date Block Badge */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${evt.color} flex flex-col items-center justify-center text-white shrink-0 shadow-sm`}>
                  <span className="text-[9px] font-bold tracking-wider leading-none uppercase">{evt.dayName}</span>
                  <span className="text-xs font-black leading-none mt-0.5">{evt.dayNum}</span>
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                    {evt.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {evt.timeLocation}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
