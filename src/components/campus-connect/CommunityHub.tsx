import React, { useState } from "react";
import { Building2, Users, Calendar, Sparkles, MapPin, Award, MessageSquare, ThumbsUp, PlusCircle, CheckCircle2, ChevronRight, Search, ShieldCheck } from "lucide-react";
import { INSTITUTIONS_DATA, Institution } from "./UniversityDatabase";

interface CommunityPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorCourse: string;
  timeAgo: string;
  title: string;
  content: string;
  likes: number;
  commentsCount: number;
  userLiked: boolean;
  category: "General" | "Academic" | "Housing" | "Events" | "Sports";
}

const SAMPLE_POSTS: Record<string, CommunityPost[]> = {
  uon: [
    {
      id: "p1",
      authorName: "Brian Omondi",
      authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      authorCourse: "Medicine & Surgery • 4th Year",
      timeAgo: "2 hours ago",
      title: "UoN Medical School Anatomy Revision Group 🩺",
      content: "Setting up a weekend study group for 3rd & 4th year med students at the Chiromo Campus library. All verified UoN students welcome!",
      likes: 42,
      commentsCount: 18,
      userLiked: false,
      category: "Academic",
    },
    {
      id: "p2",
      authorName: "Amani Wanjiru",
      authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      authorCourse: "Law • 2nd Year",
      timeAgo: "5 hours ago",
      title: "Inter-Hall Debate Competition Next Tuesday! 🏆",
      content: "Main Campus Taifa Hall will be hosting the annual Inter-Hall Moots. Come support Hall 9 vs Hall 4!",
      likes: 68,
      commentsCount: 24,
      userLiked: true,
      category: "Events",
    },
  ],
  mmust: [
    {
      id: "p3",
      authorName: "Kevin Wafula",
      authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
      authorCourse: "Criminology • 3rd Year",
      timeAgo: "1 hour ago",
      title: "Kakamega Campus Hackathon & Innovation Forum 💡",
      content: "Calling all MMUST techies & coders! We're building community emergency response tools at the SPD lab this Friday.",
      likes: 35,
      commentsCount: 9,
      userLiked: false,
      category: "Events",
    },
  ],
  jkuat: [
    {
      id: "p4",
      authorName: "Stacy Muthoni",
      authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      authorCourse: "Mechatronics Engineering • 3rd Year",
      timeAgo: "3 hours ago",
      title: "Robotics Club Juja Campus Workshop 🤖",
      content: "Hands-on workshop on microcontroller programming and autonomous drone navigation this Saturday morning at iHUB Juja.",
      likes: 54,
      commentsCount: 15,
      userLiked: true,
      category: "Academic",
    },
  ],
};

export const CommunityHub: React.FC = () => {
  const [selectedInstId, setSelectedInstId] = useState<string>("uon");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeInst = INSTITUTIONS_DATA.find((i) => i.id === selectedInstId) || INSTITUTIONS_DATA[0];
  const posts = SAMPLE_POSTS[activeInst.id] || SAMPLE_POSTS["uon"];

  const handleToggleLike = (postId: string) => {
    // Local toggle simulator
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim()) return;
    const newP: CommunityPost = {
      id: `p-${Date.now()}`,
      authorName: "Alex Chen",
      authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      authorCourse: "Computer Science • 3rd Year",
      timeAgo: "Just now",
      title: newPostTitle,
      content: newPostContent,
      likes: 1,
      commentsCount: 0,
      userLiked: true,
      category: "General",
    };
    SAMPLE_POSTS[activeInst.id] = [newP, ...(SAMPLE_POSTS[activeInst.id] || [])];
    setNewPostTitle("");
    setNewPostContent("");
    setShowCreateModal(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* University Selector Banner */}
      <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Switch University Community Hub:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {INSTITUTIONS_DATA.map((inst) => (
            <button
              key={inst.id}
              onClick={() => setSelectedInstId(inst.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                selectedInstId === inst.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-950 hover:bg-slate-800 text-slate-400 border border-white/5"
              }`}
            >
              <img src={inst.logoUrl} alt={inst.shortName} className="w-4 h-4 rounded-full object-cover" />
              {inst.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Main University Hero Header Card */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-slate-950">
        <img src={activeInst.bannerUrl} alt={activeInst.name} className="w-full h-48 sm:h-64 object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A10] via-slate-950/60 to-transparent" />

        <div className="relative p-6 sm:p-8 -mt-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div className="flex items-end gap-5">
            <img
              src={activeInst.logoUrl}
              alt={activeInst.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-[#070A10] shadow-2xl shrink-0"
            />
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Institution Hub
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{activeInst.name}</h1>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-1">
                <MapPin className="w-3.5 h-3.5 text-pink-400" /> {activeInst.location} • Est. {activeInst.establishedYear}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-xl shadow-indigo-600/30 flex items-center gap-2 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" /> Post to {activeInst.shortName} Campus
          </button>
        </div>

        {/* Stats Row */}
        <div className="p-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/80 backdrop-blur-md">
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verified Students</span>
            <strong className="text-xl font-black text-white">{activeInst.verifiedStudentsCount.toLocaleString()}</strong>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Users</span>
            <strong className="text-xl font-black text-emerald-400">{activeInst.activeUsersCount.toLocaleString()}</strong>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Clubs</span>
            <strong className="text-xl font-black text-indigo-400">{activeInst.clubsCount} Societies</strong>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Domain Verification</span>
            <strong className="text-xs font-mono text-indigo-300">{activeInst.domains[0]}</strong>
          </div>
        </div>
      </div>

      {/* Community Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Discussions Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight">Trending Campus Discussions</h3>
            <span className="text-xs text-slate-400">{posts.length} Posts</span>
          </div>

          <div className="space-y-4">
            {posts.map((p) => (
              <div key={p.id} className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 shadow-xl space-y-3 hover:border-white/20 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={p.authorAvatar} alt={p.authorName} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {p.authorName}
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </h4>
                      <p className="text-[10px] text-slate-400">{p.authorCourse} • {p.timeAgo}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/20">
                    {p.category}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1">{p.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{p.content}</p>
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-xs text-slate-400">
                  <button className="flex items-center gap-1.5 hover:text-pink-400 transition">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{p.likes} Likes</span>
                  </button>

                  <button className="flex items-center gap-1.5 hover:text-indigo-400 transition">
                    <MessageSquare className="w-4 h-4" />
                    <span>{p.commentsCount} Comments</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Popular Majors & Clubs */}
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" /> Top Academic Majors
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {activeInst.popularMajors.map((m) => (
                <span key={m} className="px-3 py-1 rounded-xl bg-white/5 text-slate-300 text-xs border border-white/5 font-medium">
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-pink-400" /> Student Societies & Clubs
            </h4>
            <div className="space-y-2 text-xs">
              {["Developer & AI Club", "Student Medical Association", "Campus Debating Society", "Rotaract Campus Club"].map((club) => (
                <div key={club} className="p-2.5 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between">
                  <span className="text-white font-medium">{club}</span>
                  <button className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold">
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Post to {activeInst.shortName} Community</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 text-xs">Close</button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Discussion Title</label>
                <input
                  type="text"
                  required
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="e.g. Study Group for Midterms..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Content</label>
                <textarea
                  rows={4}
                  required
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share details with verified campus students..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
              >
                Publish to {activeInst.shortName} Feed
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
