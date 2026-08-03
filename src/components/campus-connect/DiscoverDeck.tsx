import React, { useState } from "react";
import { Heart, X, Star, Bookmark, Flag, ShieldCheck, MapPin, GraduationCap, Sparkles, ChevronLeft, ChevronRight, Info, CheckCircle2, SlidersHorizontal, Eye } from "lucide-react";

export interface StudentProfile {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Non-binary";
  orientation?: "Straight" | "Gay" | "Lesbian" | "Bisexual";
  campus: string;
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
  // 100% STRICT BI-DIRECTIONAL & ORIENTATION RECOMMENDATION ALGORITHM
  const filteredProfiles = profiles.filter((p) => {
    if (!currentProfile?.gender) return false;

    const userGender = currentProfile.gender;
    const userOrientation = currentProfile.orientation || (currentProfile.interestedIn === "Male" ? "Straight" : "Straight");

    // 1. STRAIGHT FEMALE: Automatically brings Males
    if (userGender === "Female" && (userOrientation === "Straight" || currentProfile.interestedIn === "Male")) {
      if (p.gender !== "Male") return false;
      if (p.orientation === "Gay") return false; // Exclude Gay Males
    }

    // 2. STRAIGHT MALE: Automatically brings Females
    if (userGender === "Male" && (userOrientation === "Straight" || currentProfile.interestedIn === "Female")) {
      if (p.gender !== "Female") return false;
      if (p.orientation === "Lesbian") return false; // Exclude Lesbian Females
    }

    // 3. GAY MALE: Only Gay or Bisexual Males brought
    if (userGender === "Male" && userOrientation === "Gay") {
      if (p.gender !== "Male") return false;
      if (p.orientation !== "Gay" && p.orientation !== "Bisexual") return false;
    }

    // 4. LESBIAN FEMALE: Only Lesbian or Bisexual Females brought
    if (userGender === "Female" && userOrientation === "Lesbian") {
      if (p.gender !== "Female") return false;
      if (p.orientation !== "Lesbian" && p.orientation !== "Bisexual") return false;
    }

    return true;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [swipeAnimation, setSwipeAnimation] = useState<"like" | "pass" | "superlike" | null>(null);

  const activeCard = filteredProfiles[currentIndex];

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeCard && photoIndex < activeCard.photos.length - 1) {
      setPhotoIndex(photoIndex + 1);
    }
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
    }
  };

  const triggerSwipe = (action: "like" | "pass" | "superlike") => {
    if (!activeCard) return;
    setSwipeAnimation(action);
    setTimeout(() => {
      if (action === "like") onSwipeLike(activeCard);
      if (action === "pass") onSwipePass(activeCard);
      if (action === "superlike") onSwipeSuperLike(activeCard);

      setSwipeAnimation(null);
      setPhotoIndex(0);
      setShowDetailDrawer(false);
      setCurrentIndex((prev) => prev + 1);
    }, 300);
  };

  if (!activeCard || currentIndex >= filteredProfiles.length) {
    return (
      <div className="w-full max-w-md mx-auto p-8 text-center bg-slate-900/80 border border-white/10 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-20 h-20 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
          <Sparkles className="w-10 h-10 animate-spin" />
        </div>
        <h3 className="text-2xl font-bold text-white">That's everyone matching your profile!</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-xs">
          Reviewed all verified student profiles matching your strict orientation algorithm settings.
        </p>
        <button
          onClick={onOpenFilters}
          className="mt-6 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" /> Expand Discovery Settings
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Intent Banner */}
      <div className="w-full flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Mode:</span>
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-pink-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
            {intentMode}
          </span>
        </div>
        <button
          onClick={onOpenFilters}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition text-xs flex items-center gap-1.5"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Main Swipe Card */}
      <div
        className={`w-full aspect-[3/4] relative rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-slate-950 transition-all duration-300 ${
          swipeAnimation === "like"
            ? "translate-x-32 rotate-12 opacity-0"
            : swipeAnimation === "pass"
            ? "-translate-x-32 -rotate-12 opacity-0"
            : swipeAnimation === "superlike"
            ? "-translate-y-32 scale-90 opacity-0"
            : ""
        }`}
      >
        {/* Photo Image */}
        <img
          src={activeCard.photos[photoIndex]}
          alt={activeCard.name}
          className="w-full h-full object-cover select-none"
        />

        {/* Photo Navigation Touch Areas */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={handlePrevPhoto} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer" onClick={handleNextPhoto} />

        {/* Top Indicators */}
        <div className="absolute top-3 inset-x-3 z-20 flex flex-col gap-2">
          {/* Photo Pagination Dots */}
          <div className="flex gap-1.5">
            {activeCard.photos.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full flex-1 transition-all duration-200 ${
                  idx === photoIndex ? "bg-white shadow" : "bg-white/30"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            {/* Verified Student Badge */}
            {activeCard.verified && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Student
              </span>
            )}

            {/* Compatibility Score */}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> {activeCard.compatibilityScore}% Match
            </span>
          </div>
        </div>

        {/* Bottom Card Gradient & Quick Info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-6 z-20 pointer-events-auto">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">{activeCard.name}</h2>
                <span className="text-2xl font-light text-slate-300">{activeCard.age}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-300 text-xs mt-1">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span>{activeCard.course} • {activeCard.yearOfStudy}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                <MapPin className="w-4 h-4 text-pink-400" />
                <span>{activeCard.campus} (~{activeCard.distanceKm} km away)</span>
              </div>
            </div>

            <button
              onClick={() => setShowDetailDrawer(true)}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition border border-white/20 shadow-lg"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Interest & Lifestyle Pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[11px] font-bold border border-pink-500/30">
              🚬 {activeCard.lifestyle.smoking}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30">
              🍸 {activeCard.lifestyle.drinking}
            </span>
            {activeCard.interests.slice(0, 2).map((tag) => (
              <span key={tag} className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-medium backdrop-blur-md">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons Deck */}
      <div className="flex items-center justify-center gap-4 mt-6 z-20">
        <button
          onClick={() => triggerSwipe("pass")}
          className="w-14 h-14 rounded-full bg-slate-900 border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:scale-110 transition duration-200 flex items-center justify-center shadow-lg"
        >
          <X className="w-7 h-7" />
        </button>

        <button
          onClick={() => triggerSwipe("superlike")}
          className="w-12 h-12 rounded-full bg-slate-900 border border-amber-400/40 text-amber-400 hover:bg-amber-400/10 hover:scale-110 transition duration-200 flex items-center justify-center shadow-lg"
        >
          <Star className="w-6 h-6" />
        </button>

        <button
          onClick={() => triggerSwipe("like")}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-600 to-indigo-600 text-white hover:scale-110 transition duration-200 flex items-center justify-center shadow-xl shadow-pink-600/30"
        >
          <Heart className="w-8 h-8 fill-white" />
        </button>
      </div>

      {/* Detailed Drawer Modal */}
      {showDetailDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#0F172A] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div>
                <h3 className="text-2xl font-bold text-white">{activeCard.name}, {activeCard.age}</h3>
                <p className="text-xs text-indigo-400">{activeCard.campus} • {activeCard.course}</p>
              </div>
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {/* Bio */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Biography</h4>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-white/5 italic">
                "{activeCard.bio}"
              </p>
            </div>

            {/* Detailed Lifestyle Pills */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lifestyle Specs</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                  <span className="text-slate-400 block">Smoking:</span>
                  <strong className="text-white">{activeCard.lifestyle.smoking}</strong>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                  <span className="text-slate-400 block">Drinking:</span>
                  <strong className="text-white">{activeCard.lifestyle.drinking}</strong>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                  <span className="text-slate-400 block">Pets:</span>
                  <strong className="text-white">{activeCard.lifestyle.pets || "Animal friendly"}</strong>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                  <span className="text-slate-400 block">Height:</span>
                  <strong className="text-white">{activeCard.height}</strong>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => triggerSwipe("pass")}
                className="flex-1 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs border border-red-500/30"
              >
                Pass
              </button>
              <button
                onClick={() => triggerSwipe("like")}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
              >
                Like Profile ❤️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
