import React, { useState } from "react";
import {
  Heart, X, ShieldCheck, MapPin, GraduationCap,
  SlidersHorizontal, UserPlus, BookOpen, Briefcase,
  Bookmark, Flag, Ban, ChevronDown
} from "lucide-react";

export interface StudentProfile {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Non-binary";
  orientation?: "Straight" | "Gay" | "Lesbian" | "Bisexual";
  campus: string;
  country?: string;
  course: string;
  yearOfStudy: string;
  distanceKm: number;
  compatibilityScore: number;
  verified: boolean;
  online: boolean;
  intentMode: "Dating" | "Friendship" | "Study Partner" | "Networking";
  photos: string[];
  bio: string;
  interests: string[];
  prompts: { question: string; answer: string }[];
  height: string;
  lifestyle: { smoking: string; drinking: string; pets?: string; religion?: string };
}

interface Props {
  currentProfile: any;
  profiles: StudentProfile[];
  onSwipeLike: (profile: StudentProfile) => void;
  onSwipePass: (profile: StudentProfile) => void;
  onSwipeSuperLike: (profile: StudentProfile) => void;
  onOpenFilters: () => void;
  intentMode: string;
}

export const DiscoverDeck: React.FC<Props> = ({
  currentProfile,
  profiles,
  onSwipeLike,
  onSwipePass,
  onSwipeSuperLike,
  onOpenFilters,
  intentMode,
}) => {
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());

  const toggleSave = (id: string) => {
    setSavedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-2">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Discover</h1>
          <p className="text-xs text-slate-400 mt-0.5">Meet verified students near you</p>
        </div>

        <button
          onClick={onOpenFilters}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-white/10 hover:border-white/20 text-xs font-bold text-slate-300 transition"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
          Filters
        </button>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {profiles.map((student) => (
          <div
            key={student.id}
            onClick={() => setSelectedProfile(student)}
            className="bg-slate-900/90 border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer group hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200"
          >
            {/* Photo */}
            <div className="relative aspect-[3/4] overflow-hidden">
              <img
                src={student.photos[0]}
                alt={student.name}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

              {/* Badges */}
              {student.verified && (
                <div className="absolute top-2.5 left-2.5 p-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                </div>
              )}

              {student.online && (
                <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-sm" />
              )}

              {/* Save button */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleSave(student.id); }}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ right: student.online ? "28px" : "10px" }}
              >
                <Bookmark className={`w-3.5 h-3.5 ${savedProfiles.has(student.id) ? "fill-indigo-400 text-indigo-400" : "text-white"}`} />
              </button>

              {/* Name overlay */}
              <div className="absolute bottom-0 inset-x-0 p-3">
                <h3 className="text-sm font-bold text-white leading-tight">{student.name}, {student.age}</h3>
                <p className="text-[11px] text-indigo-300 font-medium truncate mt-0.5">{student.course}</p>
              </div>
            </div>

            {/* Card Footer */}
            <div className="p-3 space-y-1.5">
              <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                <GraduationCap className="w-3 h-3 text-slate-500 shrink-0" />
                {student.campus}
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                {student.country || "Kenya"} • {student.yearOfStudy}
              </p>

              {/* Mutual interests */}
              {student.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {student.interests.slice(0, 2).map((interest) => (
                    <span key={interest} className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-medium">
                      {interest}
                    </span>
                  ))}
                  {student.interests.length > 2 && (
                    <span className="text-[10px] text-slate-500 font-medium">+{student.interests.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative text-white">
            {/* Close */}
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Hero Photo */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-t-3xl">
              <img
                src={selectedProfile.photos[0]}
                alt={selectedProfile.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            </div>

            <div className="p-6 space-y-5 -mt-10 relative">
              {/* Name & Basics */}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black">{selectedProfile.name}, {selectedProfile.age}</h2>
                  {selectedProfile.verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                  {selectedProfile.online && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Online
                    </span>
                  )}
                </div>

                <p className="text-sm text-indigo-300 font-semibold mt-1">{selectedProfile.course} • {selectedProfile.yearOfStudy}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {selectedProfile.campus}, {selectedProfile.country || "Kenya"}
                </p>
              </div>

              {/* Bio */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">About</h4>
                <p className="text-sm text-slate-200 leading-relaxed">{selectedProfile.bio}</p>
              </div>

              {/* Interests */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Interests</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.interests.map((interest) => (
                    <span key={interest} className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              {/* Lifestyle */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lifestyle</h4>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="px-3 py-1 rounded-full bg-white/5">{selectedProfile.height}</span>
                  <span className="px-3 py-1 rounded-full bg-white/5">{selectedProfile.lifestyle.smoking}</span>
                  <span className="px-3 py-1 rounded-full bg-white/5">{selectedProfile.lifestyle.drinking}</span>
                </div>
              </div>

              {/* Connection Notice */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 text-center">
                <p className="text-[11px] text-slate-400 font-medium">
                  🔒 Messaging becomes available once your connection request is accepted.
                </p>
              </div>

              {/* Connection Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { onSwipeLike(selectedProfile); setSelectedProfile(null); }}
                  className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Friend Request
                </button>

                <button
                  onClick={() => { onSwipeLike(selectedProfile); setSelectedProfile(null); }}
                  className="py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" /> Relationship Interest
                </button>

                <button
                  onClick={() => { onSwipeLike(selectedProfile); setSelectedProfile(null); }}
                  className="py-3 rounded-xl bg-white/5 hover:bg-blue-600/20 border border-white/10 text-slate-300 hover:text-blue-300 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Study Together
                </button>

                <button
                  onClick={() => { onSwipeLike(selectedProfile); setSelectedProfile(null); }}
                  className="py-3 rounded-xl bg-white/5 hover:bg-amber-600/20 border border-white/10 text-slate-300 hover:text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" /> Network
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-500">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSave(selectedProfile.id); }}
                  className="flex items-center gap-1.5 hover:text-indigo-400 transition"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${savedProfiles.has(selectedProfile.id) ? "fill-indigo-400 text-indigo-400" : ""}`} />
                  {savedProfiles.has(selectedProfile.id) ? "Saved" : "Save Profile"}
                </button>
                <button className="flex items-center gap-1 hover:text-red-400 transition">
                  <Flag className="w-3 h-3" /> Report
                </button>
                <button className="flex items-center gap-1 hover:text-red-400 transition">
                  <Ban className="w-3 h-3" /> Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
