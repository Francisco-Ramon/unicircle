import React, { useState } from "react";
import { Crown, Zap, Eye, RotateCcw, Sparkles, Check, Flame, ShieldCheck } from "lucide-react";

export const CampusVipStudio: React.FC = () => {
  const [activePlan, setActivePlan] = useState<"Free" | "Gold" | "Platinum">("Gold");
  const [boostActive, setBoostActive] = useState(false);
  const [boostTimer, setBoostTimer] = useState(1800); // 30 minutes

  const triggerProfileBoost = () => {
    setBoostActive(true);
  };

  const plans = [
    {
      id: "Free",
      name: "Standard Student",
      price: "$0",
      period: "forever",
      badge: "Basic",
      features: [
        "100% Verified Student Network",
        "10 Likes per day",
        "Match & Chat access",
        "Campus Events RSVP",
      ],
    },
    {
      id: "Gold",
      name: "Campus Gold 👑",
      price: "$4.99",
      period: "/ month",
      badge: "Popular",
      features: [
        "Unlimited Likes & Swipes",
        "See Who Liked You",
        "1 Free Profile Boost per week",
        "Unlimited Rewinds",
        "Advanced Campus Filters",
      ],
    },
    {
      id: "Platinum",
      name: "VIP Platinum ✨",
      price: "$9.99",
      period: "/ month",
      badge: "VIP Exclusive",
      features: [
        "All Gold Features",
        "Priority Verification Badge",
        "Incognito Ghost Mode",
        "Message Before Matching",
        "Top Spotlight on Campus Feed",
      ],
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Boost Banner */}
      <div className="p-6 bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border border-amber-500/30 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
            <Zap className="w-7 h-7 fill-amber-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">30-Min Campus Spotlight Boost</span>
            <h3 className="text-xl font-bold text-white">Supercharge Profile Views by 10x!</h3>
            <p className="text-xs text-slate-300 mt-0.5">Be the #1 profile shown to students across your university campus.</p>
          </div>
        </div>

        <button
          onClick={triggerProfileBoost}
          disabled={boostActive}
          className={`px-6 py-3 rounded-2xl font-bold text-xs transition shadow-xl shrink-0 flex items-center gap-2 ${
            boostActive
              ? "bg-emerald-600 text-white"
              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/30"
          }`}
        >
          {boostActive ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" /> Boost Active (29m 40s)
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current" /> Activate Spotlight Boost
            </>
          )}
        </button>
      </div>

      {/* Plans Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isSelected = activePlan === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setActivePlan(p.id as any)}
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between cursor-pointer relative ${
                isSelected
                  ? "bg-gradient-to-b from-indigo-950/80 via-slate-900 to-purple-950/80 border-indigo-500 shadow-2xl ring-2 ring-indigo-500/50 scale-105"
                  : "bg-slate-900/60 border-white/10 hover:border-white/20"
              }`}
            >
              <div>
                <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold uppercase tracking-wider inline-block mb-3">
                  {p.badge}
                </span>
                <h3 className="text-xl font-bold text-white">{p.name}</h3>

                <div className="my-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{p.price}</span>
                  <span className="text-xs text-slate-400">{p.period}</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 my-6">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`w-full py-3 rounded-2xl text-xs font-bold transition ${
                  isSelected
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {isSelected ? "Active Plan" : "Upgrade Plan"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
