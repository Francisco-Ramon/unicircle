import React, { useState } from "react";
import { SlidersHorizontal, Check, Heart, Users, BookOpen, Briefcase, GraduationCap, ShieldCheck, MapPin, Sparkles, Globe, Building2 } from "lucide-react";
import { COUNTRIES } from "./UniversityDatabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  intentMode: string;
  onChangeIntentMode: (mode: string) => void;
  discoveryRadius: "MY_INSTITUTION" | "NEARBY" | "NATIONWIDE" | "INTERNATIONAL";
  onChangeDiscoveryRadius: (radius: "MY_INSTITUTION" | "NEARBY" | "NATIONWIDE" | "INTERNATIONAL") => void;
}

export const FilterDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  intentMode,
  onChangeIntentMode,
  discoveryRadius,
  onChangeDiscoveryRadius,
}) => {
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(26);
  const [distanceKm, setDistanceKm] = useState(25);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [onlineNow, setOnlineNow] = useState(false);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState("Kenya");

  if (!isOpen) return null;

  const radiusModes = [
    { id: "MY_INSTITUTION", label: "My Institution Only", icon: Building2, desc: "Only students from your enrolled university" },
    { id: "NEARBY", label: "Nearby Institutions", icon: MapPin, desc: "Students from neighboring campuses in your region" },
    { id: "NATIONWIDE", label: "Nationwide (All Campuses)", icon: ShieldCheck, desc: "Verified students from every university in the country" },
    { id: "INTERNATIONAL", label: "International Exchange", icon: Globe, desc: "Cross-border verified student discovery worldwide" },
  ];

  const intents = [
    { id: "Dating", label: "Dating & Romance", icon: Heart, desc: "Find genuine romantic connections on campus" },
    { id: "Friendship", label: "BFF & Friend Finder", icon: Users, desc: "Make verified student friends & activity buddies" },
    { id: "Study Partner", label: "Study Buddies", icon: BookOpen, desc: "Collaborate on majors, exams & projects" },
    { id: "Networking", label: "Career & Mentorship", icon: Briefcase, desc: "Network with seniors & campus alumni" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#0F172A] border border-white/15 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/40">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xl font-bold text-white">Multi-University Filter Engine</h3>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20">
            Apply & Close
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 max-h-[75vh]">
          {/* 4-LEVEL DISCOVERY RADIUS SWITCHER */}
          <div>
            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-3">
              1. Discovery Campus Scope (4 Radius Levels)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {radiusModes.map((rm) => {
                const Icon = rm.icon;
                const isSelected = discoveryRadius === rm.id;
                return (
                  <button
                    key={rm.id}
                    onClick={() => onChangeDiscoveryRadius(rm.id as any)}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? "bg-indigo-600/30 border-indigo-500 shadow-lg ring-1 ring-indigo-500"
                        : "bg-slate-950/80 border-white/10 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`p-1.5 rounded-lg ${isSelected ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{rm.label}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{rm.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intent Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">2. Matching Intent Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {intents.map((item) => {
                const Icon = item.icon;
                const isSelected = intentMode === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChangeIntentMode(item.id)}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? "bg-pink-600/20 border-pink-500 shadow-lg ring-1 ring-pink-500"
                        : "bg-slate-950/80 border-white/10 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`p-1.5 rounded-lg ${isSelected ? "bg-pink-600 text-white" : "bg-white/5 text-slate-400"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-pink-400" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.label}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Country Selection */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Country Scope</label>
            <select
              value={selectedCountryFilter}
              onChange={(e) => setSelectedCountryFilter(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-xs text-white"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Security & Verification Toggles */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-white/5 cursor-pointer">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Strict Student Verification</span>
                  <span className="text-[11px] text-slate-400">Require official .edu / .ac.ke domain + face liveness score</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950 flex gap-3">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
          >
            Apply Scope & Refresh Feed
          </button>
        </div>
      </div>
    </div>
  );
};
