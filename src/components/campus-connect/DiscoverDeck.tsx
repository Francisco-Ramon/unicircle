import React, { useState } from "react";
import {
  Heart, X, ShieldCheck, MapPin, GraduationCap,
  SlidersHorizontal, UserPlus, BookOpen, Briefcase,
  Bookmark, Flag, Ban, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle
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
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [reportedProfiles, setReportedProfiles] = useState<Set<string>>(new Set());
  const [blockedProfiles, setBlockedProfiles] = useState<Set<string>>(new Set());
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const toggleSave = (id: string) => {
    setSavedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openProfile = (student: StudentProfile) => {
    setSelectedProfile(student);
    setActivePhotoIndex(0);
  };

  const photoCount = selectedProfile?.photos?.length || 0;

  const goNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activePhotoIndex < photoCount - 1) setActivePhotoIndex((i) => i + 1);
  };
  const goPrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activePhotoIndex > 0) setActivePhotoIndex((i) => i - 1);
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
            onClick={() => openProfile(student)}
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

              {/* Photo count badge */}
              {student.photos.length > 1 && (
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] text-white/80 font-bold">
                  1/{student.photos.length}
                </div>
              )}

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

      {/* ─── Profile Detail Modal ─── */}
      {selectedProfile && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center overflow-hidden"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[88vh] overflow-y-auto relative text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* ─── Photo Gallery ─── */}
            <div className="relative">
              {/* Segment Indicator Bars (like Instagram Stories / X.com) */}
              {photoCount > 1 && (
                <div className="absolute top-2.5 left-3 right-3 z-10 flex gap-1">
                  {selectedProfile.photos.map((_, idx) => (
                    <div
                      key={idx}
                      className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/20 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(idx); }}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          idx === activePhotoIndex ? "bg-white w-full" : idx < activePhotoIndex ? "bg-white/60 w-full" : "w-0"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Main Photo — contained, NOT fullscreen */}
              <div className="aspect-[3/4] sm:aspect-[4/5] overflow-hidden rounded-t-3xl sm:rounded-t-3xl bg-slate-950 relative">
                <img
                  src={selectedProfile.photos[activePhotoIndex] || selectedProfile.photos[0]}
                  alt={`${selectedProfile.name} photo ${activePhotoIndex + 1}`}
                  className="w-full h-full object-cover transition-opacity duration-200"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-70" />

                {/* Tap left/right zones to navigate photos */}
                {photoCount > 1 && (
                  <>
                    <div
                      className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-10"
                      onClick={goPrevPhoto}
                    />
                    <div
                      className="absolute inset-y-0 right-0 w-1/3 cursor-pointer z-10"
                      onClick={goNextPhoto}
                    />
                  </>
                )}

                {/* Left / Right Chevrons (visible on hover) */}
                {photoCount > 1 && activePhotoIndex > 0 && (
                  <button
                    onClick={goPrevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition hidden sm:flex"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {photoCount > 1 && activePhotoIndex < photoCount - 1 && (
                  <button
                    onClick={goNextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition hidden sm:flex"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {/* Photo Counter */}
                {photoCount > 1 && (
                  <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-[11px] text-white/90 font-bold">
                    {activePhotoIndex + 1} / {photoCount}
                  </div>
                )}

                {/* Name & Info Overlay on Photo */}
                <div className="absolute bottom-0 inset-x-0 p-4 z-10">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black">{selectedProfile.name}, {selectedProfile.age}</h2>
                    {selectedProfile.verified && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {selectedProfile.online && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-indigo-300 font-semibold mt-0.5">{selectedProfile.course} • {selectedProfile.yearOfStudy}</p>
                  <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {selectedProfile.campus}, {selectedProfile.country || "Kenya"}
                  </p>
                </div>
              </div>

              {/* Thumbnail Strip */}
              {photoCount > 1 && (
                <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-slate-950/60" style={{ scrollbarWidth: "none" }}>
                  {selectedProfile.photos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 transition-all duration-200 ${
                        idx === activePhotoIndex
                          ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-900 scale-105"
                          : "opacity-50 hover:opacity-80"
                      }`}
                    >
                      <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Profile Details ─── */}
            <div className="p-5 space-y-4">
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

              {/* Action Feedback Toast */}
              {actionFeedback && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-pulse">
                  <CheckCircle className="w-4 h-4 shrink-0" /> {actionFeedback}
                </div>
              )}

              {/* Secondary Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-500">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSave(selectedProfile.id); }}
                  className="flex items-center gap-1.5 hover:text-indigo-400 transition"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${savedProfiles.has(selectedProfile.id) ? "fill-indigo-400 text-indigo-400" : ""}`} />
                  {savedProfiles.has(selectedProfile.id) ? "Saved" : "Save Profile"}
                </button>
                <button
                  onClick={() => { setShowReportModal(true); setReportReason(""); }}
                  disabled={reportedProfiles.has(selectedProfile.id)}
                  className={`flex items-center gap-1 transition ${reportedProfiles.has(selectedProfile.id) ? "text-orange-400 cursor-default" : "hover:text-red-400"}`}
                >
                  <Flag className="w-3 h-3" /> {reportedProfiles.has(selectedProfile.id) ? "Reported" : "Report"}
                </button>
                <button
                  onClick={() => setShowBlockConfirm(true)}
                  disabled={blockedProfiles.has(selectedProfile.id)}
                  className={`flex items-center gap-1 transition ${blockedProfiles.has(selectedProfile.id) ? "text-red-400 cursor-default" : "hover:text-red-400"}`}
                >
                  <Ban className="w-3 h-3" /> {blockedProfiles.has(selectedProfile.id) ? "Blocked" : "Block"}
                </button>
              </div>

              {/* ─── Report Modal ─── */}
              {showReportModal && (
                <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
                  <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-red-500/15">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Report {selectedProfile.name}</h3>
                        <p className="text-[11px] text-slate-400">Help us keep UniCircle safe</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {["Harassment or bullying", "Fake profile / catfishing", "Inappropriate content", "Spam or scam", "Underage user", "Other"].map((reason) => (
                        <button
                          key={reason}
                          onClick={() => setReportReason(reason)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition ${
                            reportReason === reason
                              ? "bg-red-500/20 border border-red-500/40 text-red-300"
                              : "bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setShowReportModal(false)}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!reportReason) return;
                          setReportedProfiles((prev) => new Set(prev).add(selectedProfile.id));
                          setShowReportModal(false);
                          setActionFeedback(`Reported ${selectedProfile.name} for: ${reportReason}`);
                          setTimeout(() => setActionFeedback(null), 3000);
                        }}
                        disabled={!reportReason}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold transition"
                      >
                        Submit Report
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Block Confirmation ─── */}
              {showBlockConfirm && (
                <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBlockConfirm(false)}>
                  <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-red-500/15">
                        <Ban className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Block {selectedProfile.name}?</h3>
                        <p className="text-[11px] text-slate-400">They won't be able to see your profile or message you</p>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-400">
                      <p>• {selectedProfile.name} won't appear in your Discover feed</p>
                      <p>• Any existing match will be removed</p>
                      <p>• They won't be notified about this action</p>
                      <p>• You can unblock from Settings later</p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setShowBlockConfirm(false)}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setBlockedProfiles((prev) => new Set(prev).add(selectedProfile.id));
                          setShowBlockConfirm(false);
                          setActionFeedback(`${selectedProfile.name} has been blocked`);
                          setTimeout(() => {
                            setActionFeedback(null);
                            setSelectedProfile(null);
                          }, 2000);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition"
                      >
                        Block User
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
