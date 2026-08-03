import React from "react";
import { Sparkles, MessageCircle, Heart, ShieldCheck, ArrowRight, X } from "lucide-react";
import { StudentProfile } from "./DiscoverDeck";

interface Props {
  matchedProfile: StudentProfile | null;
  currentUserProfile: any;
  onClose: () => void;
  onStartChat: (profile: StudentProfile) => void;
}

export const MatchCelebrationModal: React.FC<Props> = ({ matchedProfile, currentUserProfile, onClose, onStartChat }) => {
  if (!matchedProfile) return null;

  const icebreakers = [
    `Hey ${matchedProfile.name}! Saw you're studying ${matchedProfile.course} at ${matchedProfile.campus}! 👋`,
    `Hi! Fellow ${matchedProfile.interests[0] || "coffee"} lover on campus! ☕`,
    `Two truths and a lie: What's your favorite spot near ${matchedProfile.campus}? 🎓`,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
      <div className="relative w-full max-w-md bg-gradient-to-b from-indigo-950 via-slate-900 to-purple-950 border border-white/20 rounded-3xl p-8 text-center shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-bold uppercase tracking-widest mb-4 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" /> Mutual Connection Unlocked
        </div>

        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-indigo-300 to-emerald-400 tracking-tight mb-2">
          It's a Match! 🎉
        </h2>
        <p className="text-xs text-slate-300 max-w-xs mx-auto mb-8">
          You and <strong className="text-white font-bold">{matchedProfile.name}</strong> both liked each other's verified student profiles!
        </p>

        {/* Avatar Clash Animation */}
        <div className="relative flex items-center justify-center gap-6 my-6">
          {/* User Avatar */}
          <div className="relative w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-pink-500 to-indigo-500 shadow-2xl shadow-pink-500/40">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
              alt="You"
              className="w-full h-full object-cover rounded-full"
            />
            <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full text-white">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Heart Badge */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-600 to-red-600 text-white flex items-center justify-center shadow-xl animate-bounce">
            <Heart className="w-6 h-6 fill-white" />
          </div>

          {/* Matched Profile Avatar */}
          <div className="relative w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-emerald-500 shadow-2xl shadow-indigo-500/40">
            <img
              src={matchedProfile.photos[0]}
              alt={matchedProfile.name}
              className="w-full h-full object-cover rounded-full"
            />
            <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full text-white">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Icebreakers Box */}
        <div className="my-6 p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-left space-y-2">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">Suggested Icebreaker Starters:</span>
          {icebreakers.map((msg, i) => (
            <div
              key={i}
              onClick={() => onStartChat(matchedProfile)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-slate-200 cursor-pointer transition flex items-center justify-between"
            >
              <span className="truncate pr-2">"{msg}"</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => onStartChat(matchedProfile)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-extrabold text-sm transition shadow-xl shadow-pink-600/30 flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5 fill-white" /> Send Instant Message Now
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs transition"
          >
            Keep Swiping Campus Feed
          </button>
        </div>
      </div>
    </div>
  );
};
