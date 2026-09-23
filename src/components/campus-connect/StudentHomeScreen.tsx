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

const DEFAULT_REFERENCE_COMMENTS: Record<string, any[]> = {
  ref_post_1: [
    {
      id: "comm_1_1",
      authorName: "Faith Njeri",
      authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      campus: "University of Nairobi",
      timeAgo: "1h",
      content: "I'll be at the career fair! Let's connect at the tech booth 🚀",
      likes: 3,
      userLiked: false,
    },
    {
      id: "comm_1_2",
      authorName: "Dennis Kiprop",
      authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
      campus: "JKUAT",
      timeAgo: "30m",
      content: "Power systems companies usually set up near Hall 7. Good luck bro!",
      likes: 1,
      userLiked: false,
    }
  ],
  ref_post_2: [
    {
      id: "comm_2_1",
      authorName: "Mary Achieng",
      authorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      campus: "Kenyatta University",
      timeAgo: "2h",
      content: "Library grind never stops! What unit are you revising?",
      likes: 5,
      userLiked: false,
    }
  ],
  ref_post_3: [
    {
      id: "comm_3_1",
      authorName: "Samuel Ochieng",
      authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      campus: "University of Nairobi",
      timeAgo: "4h",
      content: "I have the PDF notes and past exam papers for state space. Let's study together!",
      likes: 4,
      userLiked: false,
    }
  ],
  ref_post_4: [
    {
      id: "comm_4_1",
      authorName: "Grace Wambui",
      authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      campus: "Strathmore University",
      timeAgo: "5h",
      content: "Thanks for the reminder Stella! Submitting mine today.",
      likes: 2,
      userLiked: false,
    }
  ]
};

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
    comments: 2,
    commentsCount: 2,
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
    comments: 1,
    commentsCount: 1,
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
    comments: 1,
    commentsCount: 1,
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
    comments: 1,
    commentsCount: 1,
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

  // Active comments drawer & inputs
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<Record<string, any[]>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("unicircle_home_post_comments");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_REFERENCE_COMMENTS;
  });

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

  // Handle Follow / Unfollow user on feed
  const handleToggleFollow = async (authorId: string, authorName?: string) => {
    if (!authorId || authorId === currentUserId) return;
    const isCurrentlyFollowing = SocialGraphService.isFollowing(currentUserId, authorId);
    
    if (isCurrentlyFollowing) {
      SocialGraphService.unfollowUser(currentUserId, authorId);
      toast.info(`Unfollowed ${authorName || "student"}`);
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
      }, authorId);
      toast.success(`Following ${authorName || "student"}!`);
    }
    setPosts((prev) => [...prev]);
  };

  // Handle Add Comment on Home feed post (Public for all users)
  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const newComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorName: `${userProfile?.firstName || "Student"} ${userProfile?.lastName || ""}`.trim(),
      authorAvatar: userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      campus: userProfile?.campus || userCampus || "Verified Student",
      timeAgo: "Just now",
      content: text,
      likes: 0,
      userLiked: false,
    };

    const currentComments = postComments[postId] || [];
    const updatedComments = [...currentComments, newComment];
    const nextPostComments = { ...postComments, [postId]: updatedComments };
    
    setPostComments(nextPostComments);
    if (typeof window !== "undefined") {
      try {
        safeSetItem("unicircle_home_post_comments", JSON.stringify(nextPostComments));
      } catch (e) {}
    }

    setPosts((prev) => {
      const next = prev.map((p) => {
        if (p.id === postId) {
          const nextCount = (p.commentsCount || p.comments || 0) + 1;
          return { ...p, comments: nextCount, commentsCount: nextCount };
        }
        return p;
      });
      if (typeof window !== "undefined") {
        try {
          safeSetItem("unicircle_home_feed_posts", JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    toast.success("Comment added!");
  };

  // Handle Comment Like
  const handleToggleCommentLike = (postId: string, commentId: string) => {
    const currentComments = postComments[postId] || [];
    const updated = currentComments.map((c) => {
      if (c.id === commentId) {
        const nextLiked = !c.userLiked;
        const nextLikes = nextLiked ? (c.likes || 0) + 1 : Math.max(0, (c.likes || 1) - 1);
        return { ...c, userLiked: nextLiked, likes: nextLikes };
      }
      return c;
    });
    const nextPostComments = { ...postComments, [postId]: updated };
    setPostComments(nextPostComments);
    if (typeof window !== "undefined") {
      try {
        safeSetItem("unicircle_home_post_comments", JSON.stringify(nextPostComments));
      } catch (e) {}
    }
  };

  // Filtered posts based on active feed tab
  const displayedPosts = useMemo(() => {
    if (feedTab === "following") {
      return posts.filter((p) => SocialGraphService.isFollowing(currentUserId, p.authorId) || p.authorId === currentUserId);
    }
    return posts;
  }, [posts, feedTab, currentUserId]);

  return (
    <div className="w-full space-y-3 pb-8">
      {/* 1. X.COM STYLE TOP TAB BAR (FOR YOU / FOLLOWING) */}
      <div className="sticky top-0 z-20 bg-[#080C14]/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-around rounded-2xl mb-2">
        <button
          type="button"
          onClick={() => setFeedTab("feed")}
          className="flex-1 py-3.5 text-center text-sm font-bold relative transition-colors cursor-pointer"
        >
          <span className={feedTab === "feed" ? "text-white font-extrabold text-sm" : "text-slate-400 hover:text-slate-200"}>
            For you
          </span>
          {feedTab === "feed" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setFeedTab("following")}
          className="flex-1 py-3.5 text-center text-sm font-bold relative transition-colors cursor-pointer"
        >
          <span className={feedTab === "following" ? "text-white font-extrabold text-sm" : "text-slate-400 hover:text-slate-200"}>
            Following
          </span>
          {feedTab === "following" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500" />
          )}
        </button>
      </div>

      {/* 2. X.COM STYLE CREATE POST CARD */}
      <div className="bg-[#101726]/80 border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-start gap-3">
          <img
            src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
            alt="User"
            className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's happening on campus?!"
              rows={2}
              className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none resize-none pt-1.5"
            />
          </div>
        </div>

        {/* Optional selected image preview */}
        {imagePreviewUrl && (
          <div className="relative rounded-2xl overflow-hidden max-h-52 border border-white/10 bg-black/40">
            <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => { setSelectedImage(null); setImagePreviewUrl(null); }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition cursor-pointer"
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

        <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 hover:from-indigo-500/25 hover:to-pink-500/25 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-bold transition shadow-sm cursor-pointer"
              title="Upload Photo from Device"
            >
              <Camera className="w-3.5 h-3.5 text-pink-400" />
              <span>Photo</span>
            </button>
          </div>

          <button
            type="button"
            disabled={(!newPostContent.trim() && !selectedImage) || isSubmittingPost}
            onClick={handlePublishPost}
            className="px-5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmittingPost ? "Posting..." : "Post"}
          </button>
        </div>
      </div>

      {/* 3. FEED POSTS LIST */}
      <div className="space-y-3">
        {displayedPosts.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#101726]/80 border border-white/10 text-center space-y-2">
            <p className="text-sm font-bold text-white">No posts in this feed yet</p>
            <p className="text-xs text-slate-400">
              {feedTab === "following"
                ? "You haven't followed any creators yet. Switch to 'For you' to discover students!"
                : "Be the first student to post what's happening on campus!"}
            </p>
          </div>
        ) : (
          displayedPosts.map((post) => {
            const isLiked = post.userLiked;
            const effectiveAuthorId = post.authorId || `author_${post.id}`;
            const isFollowingAuthor = SocialGraphService.isFollowing(currentUserId, effectiveAuthorId);
            const isOwnPost = Boolean(
              (post.authorId && (post.authorId === currentUserId || (userProfile?.id && post.authorId === userProfile.id))) ||
              (userProfile?.firstName && post.authorName?.toLowerCase().includes(userProfile.firstName.toLowerCase()))
            );
            const isCommentsOpen = activeCommentPostId === post.id;
            const commentsList = postComments[post.id] || [];

            return (
              <div
                key={post.id}
                className="bg-[#101726]/80 border border-white/10 rounded-2xl p-4 md:p-5 shadow-xl space-y-3 transition-all hover:border-white/15"
              >
                {/* Post Author Header (X.COM STYLE) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate hover:underline cursor-pointer">
                          {post.authorName}
                        </h4>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs text-slate-400 truncate">
                          • {post.timeAgo}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {post.campus || "University of Nairobi"}
                      </p>
                    </div>
                  </div>

                  {/* Small Sleek Follow Button (X.COM STYLE) */}
                  {isOwnPost ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold shrink-0">
                      You
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(effectiveAuthorId, post.authorName)}
                      className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                        isFollowingAuthor
                          ? "bg-transparent border border-white/20 text-slate-300 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10"
                          : "bg-white text-black hover:bg-slate-200"
                      }`}
                    >
                      {isFollowingAuthor ? "Following" : "Follow"}
                    </button>
                  )}
                </div>

                {/* Post Content */}
                <div className="pt-0.5">
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
                      className="w-full max-h-[450px] object-contain rounded-2xl"
                    />
                  </div>
                )}

                {/* Post Actions Footer */}
                <div className="flex items-center gap-6 pt-2.5 border-t border-white/5 text-xs text-slate-400 font-medium">
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

                  {/* Comments - Click opens/toggles inline comments drawer */}
                  <button
                    type="button"
                    onClick={() => setActiveCommentPostId((prev) => (prev === post.id ? null : post.id))}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isCommentsOpen ? "text-indigo-400 font-bold" : "hover:text-white"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{Math.max(commentsList.length, post.comments || post.commentsCount || 0)}</span>
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

                {/* Inline Comments Section (Open to Anyone on Home Feed) */}
                {isCommentsOpen && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        Comments ({commentsList.length})
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium">Public Discussion</span>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {commentsList.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-3 bg-white/[0.02] rounded-xl border border-white/5">
                          No comments yet. Be the first to comment!
                        </p>
                      ) : (
                        commentsList.map((comm: any) => (
                          <div
                            key={comm.id}
                            className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5"
                          >
                            <img
                              src={comm.authorAvatar}
                              alt={comm.authorName}
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10 mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-bold text-white truncate">{comm.authorName}</span>
                                  {comm.campus && (
                                    <span className="text-[10px] text-slate-400 truncate">• {comm.campus}</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 shrink-0">{comm.timeAgo}</span>
                              </div>
                              <p className="text-xs text-slate-200 mt-1 leading-relaxed whitespace-pre-wrap">
                                {comm.content}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCommentLike(post.id, comm.id)}
                                  className={`text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                    comm.userLiked ? "text-pink-400" : "text-slate-500 hover:text-slate-300"
                                  }`}
                                >
                                  <Heart className={`w-3 h-3 ${comm.userLiked ? "fill-pink-400" : ""}`} />
                                  <span>{comm.likes > 0 ? comm.likes : "Like"}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Input Bar */}
                    <div className="flex items-center gap-2 pt-1.5">
                      <img
                        src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
                        alt="You"
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                      />
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                          placeholder="Write a comment..."
                          className="w-full bg-slate-900/90 border border-white/10 rounded-full pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="absolute right-1.5 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          title="Send Comment"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
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
