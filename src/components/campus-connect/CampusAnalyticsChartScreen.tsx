import React, { useState, useEffect } from "react";
import {
  BarChart3, TrendingUp, Users, Heart, BookOpen, Calendar,
  Sparkles, RefreshCw, ShieldCheck, PieChart, Activity, AlertTriangle
} from "lucide-react";
import { AppNavState } from "@/lib/navigationHistory";

interface Props {
  userProfile?: any;
  onNavigate?: (state: AppNavState) => void;
}

export const CampusAnalyticsChartScreen: React.FC<Props> = ({ userProfile, onNavigate }) => {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "all">("month");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [timeframe]);

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 400);
  };

  const userCampus = userProfile?.campus || "University of Nairobi";

  // Aggregated analytics data
  const metrics = [
    { label: "Campus Connections", value: "1,284", change: "+18.4%", icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    { label: "Matches Celebrating", value: "492", change: "+24.1%", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
    { label: "Study Group Invites", value: "860", change: "+12.8%", icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Event Attendees", value: "2,150", change: "+31.2%", icon: Calendar, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  ];

  const intentBreakdown = [
    { label: "Dating & Romance", percentage: 42, count: 540, color: "bg-gradient-to-r from-pink-500 to-rose-500" },
    { label: "Friendship & Campus Life", percentage: 31, count: 398, color: "bg-gradient-to-r from-indigo-500 to-purple-500" },
    { label: "Study Partners & Projects", percentage: 18, count: 231, color: "bg-gradient-to-r from-blue-500 to-cyan-500" },
    { label: "Professional Networking", percentage: 9, count: 115, color: "bg-gradient-to-r from-amber-500 to-orange-500" },
  ];

  const weeklyActivityData = [
    { day: "Mon", matches: 64, posts: 112, events: 28 },
    { day: "Tue", matches: 82, posts: 145, events: 34 },
    { day: "Wed", matches: 95, posts: 168, events: 45 },
    { day: "Thu", matches: 110, posts: 190, events: 52 },
    { day: "Fri", matches: 142, posts: 240, events: 78 },
    { day: "Sat", matches: 178, posts: 310, events: 96 },
    { day: "Sun", matches: 135, posts: 220, events: 64 },
  ];

  const maxActivity = 320;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5" /> Verified Campus Analytics
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Campus Analytics & Insights
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time activity stats, student interest trends, and connection metrics for <span className="text-white font-semibold">{userCampus}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
            {(["week", "month", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition capitalize ${
                  timeframe === t
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-slate-950 border border-white/10 text-slate-400 hover:text-white transition"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Banner if any */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{error}</p>
          </div>
          <button onClick={handleRefresh} className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 font-bold transition text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse space-y-2">
                <div className="w-8 h-8 rounded-xl bg-slate-800" />
                <div className="h-5 bg-slate-800 rounded w-1/2" />
                <div className="h-3 bg-slate-800/60 rounded w-3/4" />
              </div>
            ))}
          </div>
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/5 animate-pulse h-64" />
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {metrics.map((m, idx) => {
              const Icon = m.icon;
              return (
                <div key={idx} className={`p-4 rounded-2xl border backdrop-blur-xl ${m.bg} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl bg-slate-950/60 ${m.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> {m.change}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{m.value}</h3>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{m.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activity Trend Bar Chart */}
          <div className="p-6 bg-slate-900/80 border border-white/10 rounded-3xl backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  Weekly Student Activity Volume
                </h3>
                <p className="text-xs text-slate-400">Total posts, connection requests, and event RSVPs over the past 7 days</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Posts
                </div>
                <div className="flex items-center gap-1.5 text-pink-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Matches
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Events
                </div>
              </div>
            </div>

            {/* Custom Bar Chart Visualizer */}
            <div className="pt-6 pb-2">
              <div className="flex items-end justify-between gap-2 md:gap-4 h-44">
                {weeklyActivityData.map((d, i) => {
                  const postHeightPct = Math.round((d.posts / maxActivity) * 100);
                  const matchHeightPct = Math.round((d.matches / maxActivity) * 100);
                  const eventHeightPct = Math.round((d.events / maxActivity) * 100);

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        <div
                          style={{ height: `${postHeightPct}%` }}
                          className="w-2.5 md:w-3.5 rounded-t-lg bg-indigo-500 group-hover:bg-indigo-400 transition-all duration-300 relative"
                          title={`Posts: ${d.posts}`}
                        />
                        <div
                          style={{ height: `${matchHeightPct}%` }}
                          className="w-2.5 md:w-3.5 rounded-t-lg bg-pink-500 group-hover:bg-pink-400 transition-all duration-300 relative"
                          title={`Matches: ${d.matches}`}
                        />
                        <div
                          style={{ height: `${eventHeightPct}%` }}
                          className="w-2.5 md:w-3.5 rounded-t-lg bg-amber-500 group-hover:bg-amber-400 transition-all duration-300 relative"
                          title={`Events: ${d.events}`}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition">{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Student Intent & Engagement Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Intent Breakdown */}
            <div className="p-6 bg-slate-900/80 border border-white/10 rounded-3xl backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-400" />
                  Student Intent Distribution
                </h3>
                <span className="text-xs text-slate-400 font-medium">1,284 Students</span>
              </div>

              <div className="space-y-3 pt-1">
                {intentBreakdown.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-200">{item.label}</span>
                      <span className="text-slate-400">{item.percentage}% ({item.count})</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        style={{ width: `${item.percentage}%` }}
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Campus Highlights */}
            <div className="p-6 bg-slate-900/80 border border-white/10 rounded-3xl backdrop-blur-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  Top Engagement Insights
                </h3>
                <p className="text-xs text-slate-400 mt-1">Highlights from active student groups this week</p>
              </div>

              <div className="space-y-2.5">
                {[
                  { title: "Most Active Faculty", desc: "School of Computing & AI (420 active posts)" },
                  { title: "Top Campus Event", desc: "Nairobi Student Tech Summit (340 RSVPs)" },
                  { title: "Peak Connection Time", desc: "Wednesdays & Fridays from 6 PM to 10 PM" },
                ].map((insight, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{insight.title}</h4>
                      <p className="text-[11px] text-slate-400">{insight.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
