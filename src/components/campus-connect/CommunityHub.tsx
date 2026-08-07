import React, { useState } from "react";
import {
  Building2, MessageSquare, ThumbsUp, PlusCircle, ShieldCheck,
  Users, Calendar, Info, Search, X, Image, BarChart3, ChevronRight
} from "lucide-react";
import { INSTITUTIONS_DATA, SUPPORTED_COUNTRIES } from "./UniversityDatabase";
import { TWENTY_STUDENT_PROFILES } from "./StudentProfilesDataset";

interface CommunityPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorCourse: string;
  timeAgo: string;
  content: string;
  image?: string;
  likes: number;
  commentsCount: number;
  userLiked: boolean;
}

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: "p1",
    authorName: "Brian Omondi",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    authorCourse: "Medicine & Surgery • 4th Year",
    timeAgo: "2 hours ago",
    content: "Setting up a weekend study group for 3rd & 4th year med students at the Chiromo Campus library. All verified students welcome! 🩺📚",
    likes: 42,
    commentsCount: 18,
    userLiked: false,
  },
  {
    id: "p2",
    authorName: "Amani Wanjiru",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    authorCourse: "Law • 2nd Year",
    timeAgo: "5 hours ago",
    content: "Inter-Hall Debate Competition next Tuesday at Taifa Hall! 🏆 Come support Hall 9 vs Hall 4. Registration closes Friday.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80",
    likes: 68,
    commentsCount: 24,
    userLiked: true,
  },
  {
    id: "p3",
    authorName: "Kevin Wafula",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    authorCourse: "Computer Science • 3rd Year",
    timeAgo: "8 hours ago",
    content: "Just finished my first AI project using TensorFlow! Looking for teammates for the upcoming East Africa AI Challenge. Drop a comment if interested 💡",
    likes: 35,
    commentsCount: 12,
    userLiked: false,
  },
];

interface Props {
  userProfile: any;
}

export const CommunityHub: React.FC<Props> = ({ userProfile }) => {
  // Auto-select user's university
  const userCampus = userProfile?.campus || "University of Nairobi";
  const userInst = INSTITUTIONS_DATA.find((i) => i.name === userCampus) || INSTITUTIONS_DATA[0];

  const [activeInst, setActiveInst] = useState(userInst);
  const [activeTab, setActiveTab] = useState<"feed" | "events" | "members" | "about">("feed");
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState("");

  // Posts state
  const [posts, setPosts] = useState<CommunityPost[]>(INITIAL_POSTS);

  // New post form
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState("");

  const handleToggleLike = (postId: string) => {
    setPosts(posts.map((p) =>
      p.id === postId
        ? { ...p, userLiked: !p.userLiked, likes: p.userLiked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      authorName: `${userProfile?.firstName || "Alex"} ${userProfile?.lastName || "Chen"}`,
      authorAvatar: userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      authorCourse: `${userProfile?.course || "Computer Science"} • ${userProfile?.yearOfStudy || "3rd Year"}`,
      timeAgo: "Just now",
      content: newPostContent,
      image: newPostImage || undefined,
      likes: 0,
      commentsCount: 0,
      userLiked: false,
    };
    setPosts([newPost, ...posts]);
    setNewPostContent("");
    setNewPostImage("");
    setShowNewPost(false);
  };

  // Filtered universities for switcher
  const filteredInstitutions = INSTITUTIONS_DATA.filter((i) =>
    i.name.toLowerCase().includes(switcherSearch.toLowerCase()) ||
    i.shortName.toLowerCase().includes(switcherSearch.toLowerCase()) ||
    i.city.toLowerCase().includes(switcherSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-2">
      {/* Community Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {activeInst.name}
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <ShieldCheck className="w-2.5 h-2.5 inline mr-0.5" />Verified
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeInst.city}, {activeInst.country} • {activeInst.verifiedStudentsCount.toLocaleString()} students
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSwitcher(true)}
          className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-xs font-bold text-slate-300 transition shrink-0"
        >
          Change University
        </button>
      </div>

      {/* Community Sub-tabs */}
      <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/[0.06]">
        {[
          { id: "feed", label: "Feed", icon: MessageSquare },
          { id: "events", label: "Events", icon: Calendar },
          { id: "members", label: "Members", icon: Users },
          { id: "about", label: "About", icon: Info },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* FEED TAB */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          {/* Post Composer */}
          {!showNewPost ? (
            <button
              onClick={() => setShowNewPost(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] hover:border-white/10 transition text-left"
            >
              <img
                src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
                alt="You"
                className="w-9 h-9 rounded-xl object-cover"
              />
              <span className="text-sm text-slate-500">What's happening on campus?</span>
            </button>
          ) : (
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <img
                  src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
                  alt="You"
                  className="w-9 h-9 rounded-xl object-cover shrink-0"
                />
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share with your campus community..."
                  rows={3}
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 resize-none focus:outline-none"
                />
              </div>

              {newPostImage && (
                <div className="relative">
                  <img src={newPostImage} alt="Attached" className="w-full h-40 object-cover rounded-xl" />
                  <button onClick={() => setNewPostImage("")} className="absolute top-2 right-2 p-1 rounded-full bg-black/60">
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setNewPostImage("https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80")}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition"
                    title="Add image"
                  >
                    <Image className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition" title="Add chart/poll">
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowNewPost(false); setNewPostContent(""); setNewPostImage(""); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim()}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Posts List */}
          {posts.map((post) => (
            <div key={post.id} className="bg-slate-900/60 border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Post header */}
              <div className="flex items-center gap-3 p-4 pb-0">
                <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {post.authorName}
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  </h4>
                  <p className="text-[11px] text-slate-500">{post.authorCourse} • {post.timeAgo}</p>
                </div>
              </div>

              {/* Post content */}
              <div className="px-4 py-3">
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>

              {/* Post image */}
              {post.image && (
                <div className="px-4 pb-3">
                  <img src={post.image} alt="Post attachment" className="w-full rounded-xl object-cover max-h-72" />
                </div>
              )}

              {/* Post actions */}
              <div className="flex items-center gap-1 px-4 py-3 border-t border-white/5">
                <button
                  onClick={() => handleToggleLike(post.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    post.userLiked
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                      : "text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${post.userLiked ? "fill-indigo-400" : ""}`} />
                  {post.likes}
                </button>

                <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:bg-white/5 transition">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {post.commentsCount}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EVENTS TAB */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="text-center py-12">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-400">No upcoming events at {activeInst.shortName}</h3>
            <p className="text-xs text-slate-500 mt-1">Check back soon or create one for your community.</p>
            <button className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">
              Create Event
            </button>
          </div>
        </div>
      )}

      {/* MEMBERS TAB */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={`Search ${activeInst.shortName} students...`}
              className="w-full bg-slate-900/80 border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Online Now</h3>
          <div className="space-y-1">
            {TWENTY_STUDENT_PROFILES.slice(0, 6).map((student) => (
              <div key={student.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition">
                <div className="relative">
                  <img src={student.photos[0]} alt={student.name} className="w-10 h-10 rounded-xl object-cover" />
                  {student.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{student.name}, {student.age}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{student.course} • {student.yearOfStudy}</p>
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 text-[11px] font-bold hover:bg-indigo-600 hover:text-white transition">
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABOUT TAB */}
      {activeTab === "about" && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-white">{activeInst.name}</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p>📍 {activeInst.city}, {activeInst.country}</p>
              <p>🎓 {activeInst.verifiedStudentsCount.toLocaleString()} verified students</p>
              <p>📚 Popular: {activeInst.popularMajors.slice(0, 3).join(", ")}</p>
              <p>🏢 {activeInst.clubsCount} clubs & societies</p>
            </div>
          </div>
        </div>
      )}

      {/* University Switcher Modal */}
      {showSwitcher && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Change University</h3>
              <button onClick={() => { setShowSwitcher(false); setSwitcherSearch(""); }} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={switcherSearch}
                  onChange={(e) => setSwitcherSearch(e.target.value)}
                  placeholder="Search universities..."
                  autoFocus
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filteredInstitutions.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">No universities found.</p>
              ) : (
                filteredInstitutions.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => { setActiveInst(inst); setShowSwitcher(false); setSwitcherSearch(""); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${
                      activeInst.id === inst.id
                        ? "bg-indigo-600/20 border border-indigo-500/30"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{inst.name}</p>
                      <p className="text-[11px] text-slate-500">{inst.city}, {inst.country}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{inst.shortName}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
