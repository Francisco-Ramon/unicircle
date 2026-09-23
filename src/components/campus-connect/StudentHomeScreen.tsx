import { safeSetItem } from "@/lib/safeStorage";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search, Calendar, MessageSquare, ShieldCheck, Heart, UserPlus, ArrowRight,
  Building2, X, Users, MapPin, GraduationCap, UserCheck, CheckCircle2,
  Image, Camera, Video, Edit3, MoreHorizontal, Share2, Sparkles, Send, Plus
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchLivePosts,
  fetchLiveEvents,
  fetchLiveDiscoverProfiles,
  createLivePost,
  likeLivePost,
  uploadToStorage,
  getLocalUserId,
  subscribeToLiveCommunity
} from "@/lib/supabaseLiveService";
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

const DEFAULT_REFERENCE_POSTS = [
  {
    id: "ref_post_1",
    authorId: "auth_brian_okoth",
    authorName: "Brian Okoth",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    campus: "University of Nairobi",
    timeAgo: "2h",
    content: "Anyone going to the Engineering Career Fair this Friday? I'm looking for opportunities in power systems and automation. Let's link up! 💯",
    likes: 24,
    comments: 8,
    commentsCount: 8,
    userLiked: false,
  },
  {
    id: "ref_post_2",
    authorId: "auth_jane_wanjiku",
    authorName: "Jane Wanjiku",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    campus: "UoN Campus",
    timeAgo: "3h",
    content: "The library at UoN is such a vibe at this time. Just finished my revision and feeling good. Keep pushing guys! 👊",
    likes: 56,
    comments: 12,
    commentsCount: 12,
    userLiked: false,
  },
  {
    id: "ref_post_3",
    authorId: "auth_kevin_akinyi",
    authorName: "Kevin Akinyi",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    campus: "Engineering Faculty",
    timeAgo: "5h",
    content: "Does anyone have the control systems 3 notes (especially the state space section)? I'm struggling with it. We can study together if you're also interested.",
    likes: 18,
    comments: 6,
    commentsCount: 6,
    userLiked: false,
  },
  {
    id: "ref_post_4",
    authorId: "auth_stella_mwangi",
    authorName: "Stella Mwangi",
    authorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    campus: "UoN Campus",
    timeAgo: "6h",
    content: "Good morning everyone! Don't forget the KUCCPS online application deadline is next week. Make sure you've submitted your documents. 🙏",
    likes: 42,
    comments: 15,
    commentsCount: 15,
    userLiked: false,
  },
];

export const StudentHomeScreen: React.FC<Props> = ({
  userProfile,
  liveProfiles = [],
  onNavigateToDiscover,
  onNavigateToEvents,
  onNavigateToCommunity,
  onNavigate,
}) => {
  // Feed Filter Tabs: "feed" | "following" | "students"
  const [feedTab, setFeedTab] = useState<"feed" | "following" | "students">("feed");

  // Create Post State
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active user data
  const currentUserId = userProfile?.id || getLocalUserId();
  const userCampus = userProfile?.campus || "University of Nairobi";

  // Feed Posts
  const [posts, setPosts] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("unicircle_home_feed_posts");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_REFERENCE_POSTS;
  });

  // Live Students pool
  const [liveStudents, setLiveStudents] = useState<any[]>([]);

  // Load posts & profiles on mount
  useEffect(() => {
    let isMounted = true;
    let unsubscribePosts: (() => void) | undefined;

    // 1. Fetch live posts
    fetchLivePosts().then((dbPosts) => {
      if (!isMounted) return;
      if (dbPosts && dbPosts.length > 0) {
        const formatted = dbPosts.map((lp) => ({
          id: lp.id,
          authorId: lp.author_id,
          authorName: lp.profiles?.first_name
            ? `${lp.profiles.first_name} ${lp.profiles.last_name || ""}`.trim()
            : "Verified Student",
          authorAvatar: lp.profiles?.photos?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          campus: lp.campus || userCampus,
          timeAgo: formatTimeAgo(lp.created_at),
          content: lp.content,
          image: lp.image_url,
          likes: lp.likes_count || 0,
          comments: lp.comments_count || 0,
          commentsCount: lp.comments_count || 0,
          userLiked: false,
        }));

        // Merge DB posts with default reference posts (avoid duplicates)
        const dbIds = new Set(formatted.map((p) => p.id));
        const merged = [...formatted, ...DEFAULT_REFERENCE_POSTS.filter((p) => !dbIds.has(p.id))];
        setPosts(merged);
        if (typeof window !== "undefined") {
          safeSetItem("unicircle_home_feed_posts", JSON.stringify(merged));
        }
      }
    }).catch((err) => console.warn("HomeScreen posts load:", err));

    // 2. Fetch live profiles
    fetchLiveDiscoverProfiles().then((profs) => {
      if (!isMounted) return;
      if (profs && profs.length > 0) {
        setLiveStudents(profs);
      }
    }).catch(() => {});

    // 3. Subscribe to realtime new posts
    unsubscribePosts = subscribeToLiveCommunity({
      onNewPost: (incoming) => {
        if (!isMounted) return;
        const newPost = {
          id: incoming.id,
          authorId: incoming.author_id,
          authorName: incoming.profiles?.first_name
            ? `${incoming.profiles.first_name} ${incoming.profiles.last_name || ""}`.trim()
            : "Verified Student",
          authorAvatar: incoming.profiles?.photos?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          campus: incoming.campus || userCampus,
          timeAgo: "Just now",
          content: incoming.content,
          image: incoming.image_url,
          likes: 0,
          comments: 0,
          commentsCount: 0,
          userLiked: false,
        };

        setPosts((prev) => {
          const dedupe = prev.filter((p) => p.id !== newPost.id);
          const next = [newPost, ...dedupe];
          if (typeof window !== "undefined") {
            safeSetItem("unicircle_home_feed_posts", JSON.stringify(next));
          }
          return next;
        });
      },
    });

    return () => {
      isMounted = false;
      if (unsubscribePosts) unsubscribePosts();
    };
  }, [userCampus]);

  // Handle Create Post
  const handlePublishPost = async () => {
    if (!newPostContent.trim() && !selectedImage) {
      toast.error("Please enter some text or select an image for your post.");
      return;
    }

    try {
      setIsSubmittingPost(true);
      let uploadedImageUrl: string | undefined;

      if (selectedImage) {
        uploadedImageUrl = await uploadToStorage(selectedImage, "post_images");
      }

      const created = await createLivePost({
        author_id: currentUserId,
        campus: userCampus,
        content: newPostContent.trim(),
        image_url: uploadedImageUrl,
      });

      const newPostEntry = {
        id: created?.id || `post_${Date.now()}`,
        authorId: currentUserId,
        authorName: `${userProfile?.firstName || "Student"} ${userProfile?.lastName || ""}`.trim(),
        authorAvatar: userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        campus: userCampus,
        timeAgo: "Just now",
        content: newPostContent.trim(),
        image: uploadedImageUrl,
        likes: 0,
        comments: 0,
        commentsCount: 0,
        userLiked: false,
      };

      setPosts((prev) => [newPostEntry, ...prev]);
      setNewPostContent("");
      setSelectedImage(null);
      setImagePreviewUrl(null);
      toast.success("Post published to campus feed!");
    } catch (err: any) {
      console.error("Publish post error:", err);
      toast.error("Unable to publish post. Please check your connection.");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Handle Like
  const handleToggleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextLiked = !p.userLiked;
          const nextCount = nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1);
          return { ...p, userLiked: nextLiked, likes: nextCount };
        }
        return p;
      })
    );

    try {
      await likeLivePost(postId, currentUserId);
    } catch (e) {}
  };

  // Filtered posts based on active feed tab
  const displayedPosts = useMemo(() => {
    if (feedTab === "following") {
      return posts.filter((p) => SocialGraphService.isFollowing(currentUserId, p.authorId) || p.authorId === currentUserId);
    }
    return posts;
  }, [posts, feedTab, currentUserId]);

  return (
    <div className="w-full space-y-4">
      {/* 1. CAMPUS HEADER CARD */}
      <div className="bg-[#101726]/80 border border-white/10 rounded-2xl p-5 shadow-xl transition-all">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* University Crest Emblem */}
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 p-1 flex items-center justify-center shrink-0 shadow-md">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/University_of_Nairobi_Coat_of_arms.png/300px-University_of_Nairobi_Coat_of_arms.png"
                alt="University Crest"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&auto=format&fit=crop&q=80";
                }}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                  <span>General Campus Feed</span>
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500 text-white" />
                  </span>
                </h1>

                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>All Campuses</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-0.5">
                General updates & student discussions across all universities
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToCommunity()}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
            title="Options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Feed Navigation Tabs */}
        <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/5 text-sm">
          <button
            onClick={() => setFeedTab("feed")}
            className={`pb-2 font-semibold transition-all relative cursor-pointer ${
              feedTab === "feed"
                ? "text-white border-b-2 border-indigo-500 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            General Feed
          </button>

          <button
            onClick={() => setFeedTab("following")}
            className={`pb-2 font-semibold transition-all relative cursor-pointer ${
              feedTab === "following"
                ? "text-white border-b-2 border-indigo-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Following
          </button>

          <button
            onClick={() => {
              if (feedTab === "students") {
                onNavigateToDiscover();
              } else {
                setFeedTab("students");
              }
            }}
            className={`pb-2 font-semibold transition-all relative cursor-pointer ${
              feedTab === "students"
                ? "text-white border-b-2 border-indigo-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Students
          </button>
        </div>
      </div>

      {/* 2. CREATE POST CARD ("What's happening on campus?") */}
      {feedTab !== "students" && (
        <div className="bg-[#101726]/80 border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
              alt="User"
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10"
            />
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handlePublishPost();
                  }
                }}
                placeholder="What's happening on campus?"
                className="w-full bg-[#162035]/60 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* Optional selected image preview */}
          {imagePreviewUrl && (
            <div className="relative rounded-xl overflow-hidden max-h-48 border border-white/10 bg-black/40">
              <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => { setSelectedImage(null); setImagePreviewUrl(null); }}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedImage(file);
                setImagePreviewUrl(URL.createObjectURL(file));
              }
            }}
          />

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 hover:from-indigo-500/25 hover:to-pink-500/25 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-bold transition shadow-sm cursor-pointer"
                title="Upload Photo from Device"
              >
                <Camera className="w-3.5 h-3.5 text-pink-400" />
                <span>Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toast.info("Video uploads supported up to 50MB via campus feed.");
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                <Video className="w-4 h-4 text-pink-400" />
                <span>Video</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToCommunity()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Post</span>
              </button>
            </div>

            <button
              type="button"
              disabled={isSubmittingPost}
              onClick={handlePublishPost}
              className="px-6 py-2 rounded-xl bg-[#5438DC] hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSubmittingPost ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      )}

      {/* 3. STUDENTS TAB VIEW (If user clicked "Students") */}
      {feedTab === "students" && (
        <div className="bg-[#101726]/80 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Verified Students on {userCampus}</span>
            </h3>
            <button
              onClick={onNavigateToDiscover}
              className="text-xs text-indigo-400 font-semibold hover:underline"
            >
              Discover Mode
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {liveStudents.slice(0, 8).map((student) => (
              <div
                key={student.id}
                onClick={() => onNavigate?.({ tab: "discover", profileId: student.id })}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                <img
                  src={student.photos?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                  alt={student.first_name}
                  className="w-11 h-11 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate">
                    {student.first_name} {student.last_name || ""}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">{student.course} • {student.year_of_study}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FEED POSTS LIST */}
      {feedTab !== "students" && (
        <div className="space-y-4">
          {displayedPosts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#101726]/80 border border-white/10 text-center space-y-2">
              <p className="text-sm font-semibold text-white">No posts in this feed yet</p>
              <p className="text-xs text-slate-400">Be the first to share what's happening on campus!</p>
            </div>
          ) : (
            displayedPosts.map((post) => {
              const isLiked = post.userLiked;

              return (
                <div
                  key={post.id}
                  className="bg-[#101726]/80 border border-white/10 rounded-2xl p-5 shadow-xl space-y-3 transition-all hover:border-white/15"
                >
                  {/* Post Author Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">
                          {post.authorName}
                        </h4>
                        <p className="text-xs text-slate-400 truncate">
                          {post.timeAgo} • {post.campus}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateToCommunity()}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Post Content */}
                  <div className="pt-1">
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  {/* Post Image Attachment */}
                  {post.image && (
                    <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/5 max-h-[450px] flex items-center justify-center">
                      <img
                        src={post.image}
                        alt="Post media"
                        className="w-full max-h-[450px] object-cover rounded-2xl"
                      />
                    </div>
                  )}

                  {/* Post Actions Footer */}
                  <div className="flex items-center gap-6 pt-3 border-t border-white/5 text-xs text-slate-400 font-medium">
                    {/* Like */}
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isLiked ? "text-pink-500 font-bold" : "hover:text-white"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? "fill-pink-500 text-pink-500" : ""}`} />
                      <span>{post.likes}</span>
                    </button>

                    {/* Comments */}
                    <button
                      type="button"
                      onClick={() => onNavigateToCommunity()}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments || post.commentsCount || 0}</span>
                    </button>

                    {/* Share */}
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `${post.authorName} on UniCircle`,
                            text: post.content,
                            url: window.location.href,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(`${post.authorName}: "${post.content}" - on UniCircle ${window.location.href}`);
                          toast.success("Post link copied to clipboard!");
                        }
                      }}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer ml-auto"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

function formatTimeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  } catch {
    return "1h";
  }
}
