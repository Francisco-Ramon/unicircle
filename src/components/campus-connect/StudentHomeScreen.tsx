import { safeSetItem } from "@/lib/safeStorage";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Sparkles, Calendar, MessageSquare, ShieldCheck, Heart, UserPlus, ArrowRight, Building2, X, Users, MapPin, GraduationCap, UserCheck } from "lucide-react";
import { TWENTY_STUDENT_PROFILES } from "./StudentProfilesDataset";
import { fetchLivePosts, fetchLiveEvents, fetchLiveDiscoverProfiles, getLocalUserId, subscribeToLiveCommunity } from "@/lib/supabaseLiveService";
import { supabase } from "@/integrations/supabase/client";
import { SocialGraphService } from "@/lib/social/socialGraphService";
import { SocialController } from "@/lib/social/socialController";
import { AppNavState } from "@/lib/navigationHistory";

interface Props {
  userProfile: any;
  liveProfiles?: any[];
  onNavigateToDiscover: () => void;
  onNavigateToEvents: () => void;
  onNavigateToCommunity: () => void;
  onNavigate?: (state: AppNavState) => void;
}

export const StudentHomeScreen: React.FC<Props> = ({
  userProfile,
  liveProfiles = [],
  onNavigateToDiscover,
  onNavigateToEvents,
  onNavigateToCommunity,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeFriends = TWENTY_STUDENT_PROFILES.slice(0, 5);

  const [liveStudents, setLiveStudents] = useState<any[]>(() => {
    if (liveProfiles && liveProfiles.length > 0) {
      return liveProfiles.map((p) => ({
        id: p.id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.first_name || "Student",
        campus: p.campus || "University of Nairobi",
        course: p.course || "Student",
        year: p.year_of_study || "3rd Year",
        photos: (p.photos && p.photos.length > 0) ? p.photos : ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"],
        interests: p.interests || ["Campus Life", "Tech"],
        bio: p.bio || "",
        verified: true,
        online: p.is_online || false,
      }));
    }
    return [];
  });

  const [communityPosts, setCommunityPosts] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("unicircle_community_posts");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [
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
    ];
  });

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([
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
  ]);

  // Load live students, posts, and events on mount + Realtime Subscriptions
  useEffect(() => {
    let isMounted = true;
    let unsubscribePosts: (() => void) | undefined;

    // 1. Fetch live database students from Supabase profiles
    fetchLiveDiscoverProfiles().then((profs) => {
      if (!isMounted) return;
      if (profs && profs.length > 0) {
        const formattedStudents = profs.map((p) => ({
          id: p.id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.first_name || "Student",
          campus: p.campus || "University of Nairobi",
          course: p.course || "Student",
          year: p.year_of_study || "3rd Year",
          photos: (p.photos && p.photos.length > 0) ? p.photos : ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"],
          interests: p.interests || ["Campus Life", "Tech"],
          bio: p.bio || "",
          verified: true,
          online: p.is_online || false,
        }));
        setLiveStudents(formattedStudents);
      }
    }).catch(() => {});

    // 2. Fetch live posts and events
    Promise.all([fetchLivePosts(), fetchLiveEvents()]).then(([livePosts, liveEvents]) => {
      if (!isMounted) return;
      if (livePosts && livePosts.length > 0) {
        const formatted = livePosts.map((lp) => ({
          id: lp.id,
          authorName: lp.profiles?.first_name
            ? `${lp.profiles.first_name} ${lp.profiles.last_name || ""}`.trim()
            : "Verified Student",
          authorAvatar: lp.profiles?.photos?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          authorCourse: `${lp.profiles?.course || "Student"} • ${lp.profiles?.year_of_study || "3rd Year"}`,
          campus: lp.campus || "University of Nairobi",
          timeAgo: new Date(lp.created_at).toLocaleDateString(),
          title: lp.content.substring(0, 45),
          content: lp.content,
          image: lp.image_url,
          likes: lp.likes_count || 0,
          comments: lp.comments_count || 0,
          commentsCount: lp.comments_count || 0,
          authorId: lp.author_id,
        }));
        setCommunityPosts(formatted);
        if (typeof window !== "undefined") {
          safeSetItem("unicircle_community_posts", JSON.stringify(formatted));
        }
      }

      if (liveEvents && liveEvents.length > 0) {
        const formattedEvts = liveEvents.map((le) => ({
          id: le.id,
          title: le.title,
          date: le.date,
          venue: le.location,
          organizer: "Campus Student",
          attendeesCount: le.rsvp_count || 12,
          image: le.image,
        }));
        setUpcomingEvents(formattedEvts);
      }
    }).catch((err) => console.warn("HomeScreen live load:", err));

    // 3. Realtime Community Posts listener
    unsubscribePosts = subscribeToLiveCommunity({
      onNewPost: (newLivePost) => {
        if (!isMounted) return;
        const incomingPost = {
          id: newLivePost.id,
          authorName: newLivePost.profiles?.first_name
            ? `${newLivePost.profiles.first_name} ${newLivePost.profiles.last_name || ""}`.trim()
            : "Verified Student",
          authorAvatar: newLivePost.profiles?.photos?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          authorCourse: "Campus Student",
          campus: newLivePost.campus || "University of Nairobi",
          timeAgo: "Just now",
          title: newLivePost.content.substring(0, 45),
          content: newLivePost.content,
          image: newLivePost.image_url,
          likes: 0,
          comments: 0,
          commentsCount: 0,
          authorId: newLivePost.author_id,
        };

        setCommunityPosts((prev) => {
          const dedupe = prev.filter((p) => p.id !== incomingPost.id);
          const next = [incomingPost, ...dedupe];
          if (typeof window !== "undefined") {
            safeSetItem("unicircle_community_posts", JSON.stringify(next));
          }
          return next;
        });
      },
    });

    // 4. Realtime profiles listener: newly registered students appear in search instantly
    const profileChannel = supabase
      .channel("unicircle-profiles-realtime-search")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          const p: any = payload.new;
          if (p && p.id && isMounted) {
            const formattedItem = {
              id: p.id,
              name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.first_name || "Student",
              campus: p.campus || "University of Nairobi",
              course: p.course || "Student",
              year: p.year_of_study || "3rd Year",
              photos: (p.photos && p.photos.length > 0) ? p.photos : ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"],
              interests: p.interests || ["Campus Life", "Tech"],
              bio: p.bio || "",
              verified: true,
              online: p.is_online || false,
            };
            setLiveStudents((prev) => [formattedItem, ...prev.filter((item) => item.id !== formattedItem.id)]);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (unsubscribePosts) unsubscribePosts();
      supabase.removeChannel(profileChannel);
    };
  }, []);

  // ─── Search Logic Across Live Supabase Database & Profiles ───
  const q = searchQuery.trim().toLowerCase();
  const hasQuery = q.length > 0;

  const searchResults = useMemo(() => {
    if (!hasQuery) return { students: [], posts: [], events: [] };

    // Combine live database profiles and student dataset, deduplicating
    const allStudentsPool = [
      ...liveStudents,
      ...TWENTY_STUDENT_PROFILES.filter((s) => !liveStudents.some((ls) => ls.id === s.id || ls.name.toLowerCase() === s.name.toLowerCase())),
    ];

    const students = allStudentsPool.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.campus && s.campus.toLowerCase().includes(q)) ||
        (s.course && s.course.toLowerCase().includes(q)) ||
        (s.bio && s.bio.toLowerCase().includes(q)) ||
        (s.interests && s.interests.some((i: string) => i.toLowerCase().includes(q)))
    ).slice(0, 8);

    const posts = communityPosts.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.content && p.content.toLowerCase().includes(q)) ||
        (p.authorName && p.authorName.toLowerCase().includes(q)) ||
        (p.campus && p.campus.toLowerCase().includes(q))
    );

    const events = upcomingEvents.filter(
      (e) =>
        (e.title && e.title.toLowerCase().includes(q)) ||
        ((e.venue || (e as any).location) && (e.venue || (e as any).location).toLowerCase().includes(q)) ||
        (e.organizer && e.organizer.toLowerCase().includes(q))
    );

    return { students, posts, events };
  }, [q, liveStudents, communityPosts, upcomingEvents]);

  const totalResults = searchResults.students.length + searchResults.posts.length + searchResults.events.length;
  const showDropdown = isSearchFocused && hasQuery;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 py-2">
      {/* 1. Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Welcome back{userProfile?.firstName ? `, ${userProfile.firstName}` : ""} 👋
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            {userProfile?.campus || "Verified Campus Network"} • {userProfile?.yearOfStudy || "3rd Year"}
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

      {/* 2. Search Bar with Live Results */}
      <div className="relative" ref={searchRef}>
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 z-10" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          placeholder="Search students, events, or community posts..."
          className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-lg"
        />
        {hasQuery && (
          <button
            onClick={() => { setSearchQuery(""); setIsSearchFocused(false); }}
            className="absolute right-3 top-3 p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ─── Live Search Results Dropdown ─── */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 z-30 max-h-[60vh] overflow-y-auto">
            {totalResults === 0 ? (
              <div className="p-6 text-center">
                <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">No results for "{searchQuery}"</p>
                <p className="text-xs text-slate-500 mt-1">Try searching by name, campus, course, or interest</p>
              </div>
            ) : (
              <div className="py-2">
                {/* Student Results */}
                {searchResults.students.length > 0 && (
                  <div>
                    <div className="px-4 py-2 flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students</span>
                      <span className="ml-auto text-[10px] text-slate-500">{searchResults.students.length} found</span>
                    </div>
                    {searchResults.students.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate({ tab: "discover", profileId: student.id, profileView: "details" });
                          } else {
                            onNavigateToDiscover();
                          }
                          setSearchQuery("");
                          setIsSearchFocused(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-left"
                      >
                        <img src={student.photos[0]} alt={student.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white truncate">{student.name}, {student.age}</h4>
                            {student.verified && <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />}
                            {student.online && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 shrink-0" /> {student.course}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 shrink-0" /> {student.campus}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Community Post Results */}
                {searchResults.posts.length > 0 && (
                  <div className={searchResults.students.length > 0 ? "border-t border-white/5" : ""}>
                    <div className="px-4 py-2 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Community Posts</span>
                      <span className="ml-auto text-[10px] text-slate-500">{searchResults.posts.length} found</span>
                    </div>
                    {searchResults.posts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate({ tab: "communities", postId: post.id });
                          } else {
                            onNavigateToCommunity();
                          }
                          setSearchQuery("");
                          setIsSearchFocused(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-left"
                      >
                        <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{post.title || post.content}</h4>
                          <p className="text-[11px] text-slate-400 truncate">{post.authorName} • {post.campus}</p>
                          <p className="text-[10px] text-slate-500">❤️ {post.likes || 0} • 💬 {Array.isArray(post.comments) ? post.comments.length : (post.commentsCount || (typeof post.comments === 'number' ? post.comments : 0))}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Event Results */}
                {searchResults.events.length > 0 && (
                  <div className={(searchResults.students.length > 0 || searchResults.posts.length > 0) ? "border-t border-white/5" : ""}>
                    <div className="px-4 py-2 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Events</span>
                      <span className="ml-auto text-[10px] text-slate-500">{searchResults.events.length} found</span>
                    </div>
                    {searchResults.events.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => { onNavigateToEvents(); setSearchQuery(""); setIsSearchFocused(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-left"
                      >
                        <img src={event.image} alt={event.title} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{event.title}</h4>
                          <p className="text-[11px] text-slate-400 truncate">{event.venue} • {event.date}</p>
                          <p className="text-[10px] text-slate-500">{event.attendeesCount} Going</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* View All footer */}
                <div className="border-t border-white/5 px-4 py-2.5 flex items-center justify-center">
                  <span className="text-[11px] text-slate-500">{totalResults} result{totalResults !== 1 ? "s" : ""} for "<span className="text-indigo-400 font-semibold">{searchQuery}</span>"</span>
                </div>
              </div>
            )}
          </div>
        )}
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

        {communityPosts.map((post) => {
          const currentUserId = userProfile?.id || getLocalUserId();
          const effectiveAuthorId = post.authorId || `author_${post.id}`;
          const isFollowingAuthor = SocialGraphService.isFollowing(currentUserId, effectiveAuthorId);
          
          const isOwnPost = Boolean(
            (post.authorId && (post.authorId === currentUserId || (userProfile?.id && post.authorId === userProfile.id))) ||
            (userProfile?.firstName && post.authorName?.toLowerCase().includes(userProfile.firstName.toLowerCase())) ||
            ((post as any).authorEmail && userProfile?.email && (post as any).authorEmail.toLowerCase() === userProfile.email.toLowerCase())
          );

          return (
            <div
              key={post.id}
              className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 shadow-lg space-y-3 transition"
            >
              <div className="flex items-center justify-between">
                <div
                  onClick={onNavigateToCommunity}
                  className="flex items-center gap-3 cursor-pointer min-w-0"
                >
                  <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1 truncate">
                      {post.authorName} <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">{post.campus} • {post.timeAgo}</p>
                  </div>
                </div>

                {isOwnPost ? (
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/20">
                    You
                  </span>
                ) : (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isFollowingAuthor) {
                        SocialGraphService.unfollowUser(currentUserId, effectiveAuthorId);
                      } else {
                        await SocialController.followUser({
                          id: currentUserId,
                          email: userProfile?.email || "student@unicircle.app",
                          firstName: userProfile?.firstName || "Student",
                          lastName: userProfile?.lastName || "",
                          campus: userProfile?.campus || "University of Nairobi",
                          course: userProfile?.course || "Student",
                          yearOfStudy: userProfile?.yearOfStudy || "3rd Year",
                          bio: userProfile?.bio || "",
                          photos: userProfile?.photos || [],
                          interests: userProfile?.interests || [],
                          gender: userProfile?.gender || "Female",
                          verified: true,
                          isOnline: true,
                        }, effectiveAuthorId);
                      }
                      setCommunityPosts((prev) => [...prev]);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                      isFollowingAuthor
                        ? "bg-white/10 text-slate-300 hover:bg-white/15 border border-white/10"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                    }`}
                  >
                    {isFollowingAuthor ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div onClick={onNavigateToCommunity} className="cursor-pointer">
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>

              {post.image && (
                <div onClick={onNavigateToCommunity} className="rounded-2xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center max-h-[500px] cursor-pointer">
                  <img src={post.image} alt="Post attachment" className="w-full max-h-[500px] object-contain rounded-2xl" />
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-white/10">
                <span>❤️ {post.likes || 0} Likes</span>
                <span>💬 {Array.isArray(post.comments) ? post.comments.length : (post.commentsCount || (typeof post.comments === 'number' ? post.comments : 0))} Comments</span>
              </div>
            </div>
          );
        })}
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
