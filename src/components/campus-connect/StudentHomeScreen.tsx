import React, { useState } from "react";
import { Search, Sparkles, Calendar, MessageSquare, ShieldCheck, Heart, UserPlus, ArrowRight, Building2 } from "lucide-react";
import { TWENTY_STUDENT_PROFILES } from "./StudentProfilesDataset";

interface Props {
  userProfile: any;
  onNavigateToDiscover: () => void;
  onNavigateToEvents: () => void;
  onNavigateToCommunity: () => void;
}

export const StudentHomeScreen: React.FC<Props> = ({
  userProfile,
  onNavigateToDiscover,
  onNavigateToEvents,
  onNavigateToCommunity,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const activeFriends = TWENTY_STUDENT_PROFILES.slice(0, 5);
  const communityPosts = [
    {
      id: "hp1",
      authorName: "Amani Wanjiru",
      authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      campus: "University of Nairobi",
      timeAgo: "2 hours ago",
      title: "Inter-Hall Debate Competition Next Tuesday! 🏆",
      content: "Main Campus Taifa Hall will be hosting the annual Inter-Hall Moots. Come support Hall 9 vs Hall 4!",
      likes: 68,
      comments: 24,
    },
    {
      id: "hp2",
      authorName: "Patricia Nsubuga",
      authorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      campus: "Makerere University",
      timeAgo: "4 hours ago",
      title: "Makerere Innovation Lab AI Hackathon 💡",
      content: "Calling all Makerere techies! We are forming teams for the East Africa AI Climate Resilience Challenge at the CoCIT lab.",
      likes: 42,
      comments: 15,
    },
  ];

  const upcomingEvents = [
    {
      id: "he1",
      title: "Nairobi Student Tech Summit 2026",
      date: "Fri, Aug 14",
      venue: "UoN Taifa Hall",
      organizer: "UoN Tech Society",
      attendeesCount: 340,
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "he2",
      title: "Kampala Inter-Campus Music Fest",
      date: "Sat, Aug 22",
      venue: "Makerere Freedom Square",
      organizer: "Mak Guild Council",
      attendeesCount: 520,
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 py-2">
      {/* 1. Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Welcome back, {userProfile?.firstName || "Alex"} 👋
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            {userProfile?.campus || "University of Nairobi"} • {userProfile?.yearOfStudy || "3rd Year"}
          </p>
        </div>

        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-600 p-0.5 shadow-lg shrink-0">
          <img
            src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
            alt="Profile"
            className="w-full h-full object-cover rounded-[14px]"
          />
        </div>
      </div>

      {/* 2. Simple Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search students, events, or community posts..."
          className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-lg"
        />
      </div>

      {/* 3. Recently Active Friends */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Active Friends</h2>
          <button onClick={onNavigateToDiscover} className="text-xs text-indigo-400 font-semibold hover:underline">
            Find More
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {activeFriends.map((friend) => (
            <div key={friend.id} className="flex flex-col items-center gap-1.5 shrink-0 w-16 cursor-pointer group">
              <div className="relative w-14 h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-indigo-500 to-pink-500">
                <img
                  src={friend.photos[0]}
                  alt={friend.name}
                  className="w-full h-full object-cover rounded-[14px] group-hover:scale-105 transition-transform"
                />
                {friend.online && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-300 truncate w-full text-center">
                {friend.name.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Continuous Feed: Community Posts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Community Posts</h2>
          <button onClick={onNavigateToCommunity} className="text-xs text-indigo-400 font-semibold hover:underline">
            View All
          </button>
        </div>

        {communityPosts.map((post) => (
          <div key={post.id} className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1">
                  {post.authorName} <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </h4>
                <p className="text-[11px] text-slate-400">{post.campus} • {post.timeAgo}</p>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-white leading-snug">{post.title}</h3>
              <p className="text-xs text-slate-300 mt-1">{post.content}</p>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-white/10">
              <span>❤️ {post.likes} Likes</span>
              <span>💬 {post.comments} Comments</span>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Upcoming Campus Events */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Upcoming Campus Events</h2>
          <button onClick={onNavigateToEvents} className="text-xs text-indigo-400 font-semibold hover:underline">
            See All Events
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="bg-slate-900/90 border border-white/10 rounded-3xl overflow-hidden shadow-lg group">
              <div className="relative h-32 overflow-hidden">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                  {event.date}
                </span>
              </div>
              <div className="p-4 space-y-1">
                <h4 className="text-sm font-bold text-white truncate">{event.title}</h4>
                <p className="text-xs text-slate-400">{event.venue} • {event.attendeesCount} Going</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
