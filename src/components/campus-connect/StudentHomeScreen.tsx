import { safeSetItem } from "@/lib/safeStorage";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search, Calendar, MessageSquare, ShieldCheck, Heart, UserPlus, ArrowRight,
  Building2, X, Users, MapPin, GraduationCap, UserCheck, CheckCircle2,
  Image, Camera, Video, Edit3, MoreHorizontal, Share2, Sparkles, Send, Plus,
  Flame, TrendingUp, Zap, Compass, ExternalLink, Award, Hash
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
import { INSTITUTIONS_DATA } from "./UniversityDatabase";
import { SocialGraphService } from "@/lib/social/socialGraphService";
import { SocialController } from "@/lib/social/socialController";
import { AppNavState } from "@/lib/navigationHistory";
import { StudentProfileModal, AuthorProfileData } from "./StudentProfileModal";

export interface TrendingItem {
  id: string;
  rank: number;
  type: "post" | "event" | "community" | "student" | "following_post";
  categoryLabel: string;
  categoryIcon: any;
  title: string;
  subtitle: string;
  engagementLabel: string;
  image?: string;
  sourceId: string;
  tags?: string[];
  actionLabel: string;
  authorName?: string;
  authorAvatar?: string;
  campus?: string;
}

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
  // Feed Filter Tabs: "feed" | "trending" | "following"
  const [feedTab, setFeedTab] = useState<"feed" | "trending" | "following">("feed");

  // Trending Category Filter
  const [trendingFilter, setTrendingFilter] = useState<"all" | "discussions" | "events" | "communities" | "students">("all");

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

  // Student Profile Preview Modal State
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<AuthorProfileData | null>(null);

  const handleViewStudentProfile = (studentData: AuthorProfileData) => {
    setSelectedStudentProfile(studentData);
  };

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

  // Dynamic Trending Items Pool (Ranked across posts, events, communities & students)
  const trendingItems = useMemo<TrendingItem[]>(() => {
    const list: TrendingItem[] = [];

    // 1. Hot Discussions & Viral Posts (Ranked by Likes & Comments engagement)
    const sortedPosts = [...posts].sort((a, b) => {
      const scoreA = (a.likes || 0) * 2 + (a.commentsCount || a.comments || 0) * 3;
      const scoreB = (b.likes || 0) * 2 + (b.commentsCount || b.comments || 0) * 3;
      return scoreB - scoreA;
    });

    sortedPosts.slice(0, 3).forEach((p) => {
      const isFollowing = SocialGraphService.isFollowing(currentUserId, p.authorId);
      list.push({
        id: `trend_post_${p.id}`,
        rank: 0,
        type: isFollowing ? "following_post" : "post",
        categoryLabel: isFollowing ? "Trending From Following" : "Trending Discussion",
        categoryIcon: MessageSquare,
        title: p.content.length > 80 ? `${p.content.substring(0, 80)}...` : p.content,
        subtitle: `${p.authorName} • ${p.campus || "University of Nairobi"} • ${p.timeAgo || "Active now"}`,
        engagementLabel: `${(p.likes || 0) + (p.commentsCount || p.comments || 0)} Interactions`,
        image: p.image || undefined,
        sourceId: p.id,
        tags: ["#Discussion", `#${(p.campus || "Campus").replace(/\s+/g, "")}`],
        actionLabel: "Open Discussion",
        authorName: p.authorName,
        authorAvatar: p.authorAvatar,
        campus: p.campus,
      });
    });

    // 2. Hot Campus Events
    const hotEvents = [
      {
        id: "evt_tech_fair_2026",
        title: "Campus Tech & Innovation Fair 2026",
        subtitle: "Main Campus Grounds • This Friday 9:00 AM – 4:00 PM",
        engagementLabel: "184 Students Attending",
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80",
        tags: ["#TechFair", "#Innovation", "#Career"],
      },
      {
        id: "evt_hackathon_ai",
        title: "Inter-University AI & Robotics Challenge",
        subtitle: "Innovation Hub Labs • Next Saturday 10:00 AM",
        engagementLabel: "142 Hackers Registered",
        image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80",
        tags: ["#Hackathon", "#AI", "#Coding"],
      },
      {
        id: "evt_campus_concert",
        title: "Sunset Campus Acoustic Night & DJ Rave",
        subtitle: "Great Court Amphitheater • Saturday 7:00 PM",
        engagementLabel: "260 RSVPs",
        image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
        tags: ["#CampusVibes", "#Music", "#Concert"],
      },
    ];

    hotEvents.forEach((ev) => {
      list.push({
        id: `trend_${ev.id}`,
        rank: 0,
        type: "event",
        categoryLabel: "Popular Campus Event",
        categoryIcon: Calendar,
        title: ev.title,
        subtitle: ev.subtitle,
        engagementLabel: ev.engagementLabel,
        image: ev.image,
        sourceId: ev.id,
        tags: ev.tags,
        actionLabel: "View Event Details",
      });
    });

    // 3. Top University Communities
    const topInstitutions = INSTITUTIONS_DATA.slice(0, 3);
    topInstitutions.forEach((inst) => {
      list.push({
        id: `trend_comm_${inst.id}`,
        rank: 0,
        type: "community",
        categoryLabel: "Top University Community",
        categoryIcon: Building2,
        title: `${inst.name} Hub`,
        subtitle: `${inst.location} • ${inst.clubsCount || 36} Active Student Clubs`,
        engagementLabel: `${inst.verifiedStudentsCount.toLocaleString()} Students`,
        image: inst.bannerUrl || inst.logoUrl,
        sourceId: inst.id,
        tags: ["#Community", `#${inst.shortName || "Uni"}`],
        actionLabel: "Open Community Hub",
      });
    });

    // 4. Rising Student Creators
    const topCreators = [
      {
        id: "auth_brian_okoth",
        name: "Brian Okoth",
        course: "Electrical & Information Engineering",
        campus: "University of Nairobi",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        engagement: "Top Contributor • 1.4k Followers",
      },
      {
        id: "auth_jane_wanjiku",
        name: "Jane Wanjiku",
        course: "Computer Science & AI",
        campus: "UoN Main Campus",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        engagement: "Campus Ambassador • 2.1k Followers",
      },
    ];

    topCreators.forEach((cr) => {
      list.push({
        id: `trend_creator_${cr.id}`,
        rank: 0,
        type: "student",
        categoryLabel: "Rising Student Creator",
        categoryIcon: Users,
        title: cr.name,
        subtitle: `${cr.course} • ${cr.campus}`,
        engagementLabel: cr.engagement,
        image: cr.avatar,
        sourceId: cr.id,
        tags: ["#StudentLeader", "#CampusCreator"],
        actionLabel: "View Student Profile",
        authorName: cr.name,
        authorAvatar: cr.avatar,
        campus: cr.campus,
      });
    });

    return list.map((item, i) => ({ ...item, rank: i + 1 }));
  }, [posts, currentUserId]);

  // Filtered Trending Items
  const filteredTrendingItems = useMemo(() => {
    if (trendingFilter === "discussions") {
      return trendingItems.filter((i) => i.type === "post" || i.type === "following_post");
    }
    if (trendingFilter === "events") {
      return trendingItems.filter((i) => i.type === "event");
    }
    if (trendingFilter === "communities") {
      return trendingItems.filter((i) => i.type === "community");
    }
    if (trendingFilter === "students") {
      return trendingItems.filter((i) => i.type === "student");
    }
    return trendingItems;
  }, [trendingItems, trendingFilter]);

  // Direct Deep Redirection Handler for Trending items (Silently in background)
  const handleTrendingItemClick = (item: TrendingItem) => {
    if (item.type === "community") {
      if (onNavigate) {
        onNavigate({ tab: "communities", communityId: item.sourceId });
      } else {
        onNavigateToCommunity();
      }
    } else if (item.type === "event") {
      if (onNavigate) {
        onNavigate({ tab: "events", eventId: item.sourceId, eventView: "details" });
      } else {
        onNavigateToEvents();
      }
    } else if (item.type === "post" || item.type === "following_post") {
      const targetTab = item.type === "following_post" ? "following" : "feed";
      setFeedTab(targetTab);
      setActiveCommentPostId(item.sourceId);
      setTimeout(() => {
        const el = document.getElementById(item.sourceId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    } else if (item.type === "student") {
      handleViewStudentProfile({
        id: item.sourceId,
        name: item.authorName || item.title,
        avatar: item.authorAvatar || item.image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        campus: item.campus || "University of Nairobi",
        course: item.subtitle,
        bio: "Rising campus student creator on UniCircle.",
        verified: true,
        online: true,
      });
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
      {/* 1. X.COM STYLE TOP TAB BAR (FOR YOU / TRENDING / FOLLOWING) */}
      <div className="sticky top-0 z-20 bg-[#080C14]/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-around rounded-2xl mb-2">
        {/* Tab 1: For You */}
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

        {/* Tab 2: Trending with Authentic Fire Colored Flame and Standard Website Theme */}
        <button
          type="button"
          onClick={() => setFeedTab("trending")}
          className="flex-1 py-3.5 text-center text-sm font-bold relative transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span className="text-base leading-none animate-pulse">🔥</span>
          <span className={feedTab === "trending" ? "text-white font-extrabold text-sm" : "text-slate-400 hover:text-slate-200"}>
            Trending
          </span>
          {feedTab === "trending" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500" />
          )}
        </button>

        {/* Tab 3: Following */}
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

      {/* 2. TRENDING LIVE DISCOVERY LAYER OR FEED CONTENT */}
      {feedTab === "trending" ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Trending Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "all", label: "🔥 All Trends" },
              { id: "discussions", label: "💬 Discussions" },
              { id: "events", label: "🎉 Events" },
              { id: "communities", label: "🏛️ Communities" },
              { id: "students", label: "⚡ Rising Students" },
            ].map((chip) => {
              const isActive = trendingFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setTrendingFilter(chip.id as any)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 text-white shadow-md shadow-indigo-600/25 font-extrabold"
                      : "bg-[#101726]/80 border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Trending Hashtags & Topics Bar */}
          <div className="p-3 rounded-2xl bg-[#101726]/60 border border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <span className="text-xs leading-none">🔥</span> Topics:
            </span>
            {[
              "#KUCCPSDeadline",
              "#TechFair2026",
              "#EngineeringGrind",
              "#LibraryVibes",
              "#UniCircleMatch",
              "#CampusRave",
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setTrendingFilter("discussions");
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-semibold text-slate-300 hover:text-white transition whitespace-nowrap cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Trending Items Ranked List */}
          <div className="space-y-3">
            {filteredTrendingItems.length === 0 ? (
              <div className="p-10 rounded-2xl bg-[#101726]/80 border border-white/10 text-center space-y-2">
                <p className="text-sm font-bold text-white">No trending items in this category</p>
                <p className="text-xs text-slate-400">Switch to 'All Trends' to see everything trending on campus!</p>
              </div>
            ) : (
              filteredTrendingItems.map((item) => {
                const rankBadgeStyle =
                  item.rank === 1
                    ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black shadow-md shadow-orange-500/20"
                    : item.rank === 2
                    ? "bg-gradient-to-r from-slate-200 to-slate-400 text-black font-black"
                    : item.rank === 3
                    ? "bg-gradient-to-r from-amber-600 to-orange-700 text-white font-black"
                    : "bg-white/10 text-slate-300 font-bold border border-white/10";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleTrendingItemClick(item)}
                    className="bg-[#101726]/90 border border-white/10 hover:border-indigo-500/40 rounded-2xl p-4 md:p-5 shadow-xl space-y-3 transition-all cursor-pointer group hover:bg-[#131c2e] hover:shadow-2xl active:scale-[0.995]"
                  >
                    {/* Item Header (Rank + Category + Engagement Pill) */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${rankBadgeStyle}`}>
                          #{item.rank}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold flex items-center gap-1">
                          <item.categoryIcon className="w-3 h-3 text-indigo-400" />
                          {item.categoryLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold">
                        <span className="text-xs leading-none">🔥</span>
                        <span>{item.engagementLabel}</span>
                      </div>
                    </div>

                    {/* Item Content Preview */}
                    <div className="flex items-start gap-3.5">
                      {item.image && (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-white group-hover:text-indigo-300 transition line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.subtitle}
                        </p>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {item.tags.map((tg) => (
                              <span key={tg} className="text-[10px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/5">
                                {tg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Callout Bar */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-xs">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Tap to view original source
                      </span>
                      <button
                        type="button"
                        className="flex items-center gap-1 font-bold text-indigo-400 group-hover:text-indigo-300 transition cursor-pointer"
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 3. X.COM STYLE CREATE POST CARD */}
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

          {/* 4. FEED POSTS LIST */}
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
                    id={post.id}
                    className="bg-[#101726]/80 border border-white/10 rounded-2xl p-4 md:p-5 shadow-xl space-y-3 transition-all hover:border-white/15"
                  >
                    {/* Post Author Header (X.COM STYLE) */}
                    <div className="flex items-center justify-between gap-3">
                      <div
                        onClick={() => handleViewStudentProfile({
                          id: effectiveAuthorId,
                          name: post.authorName,
                          avatar: post.authorAvatar,
                          campus: post.campus || "University of Nairobi",
                          course: "Computer Science",
                          yearOfStudy: "3rd Year",
                          bio: "Verified campus student sharing updates on UniCircle.",
                          verified: true,
                          online: true,
                          interests: ["Tech", "Campus Life", "Events"],
                        })}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group/author"
                      >
                        <img
                          src={post.authorAvatar}
                          alt={post.authorName}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10 group-hover/author:border-indigo-400 transition"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-bold text-white truncate group-hover/author:text-indigo-300 transition">
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

                    {/* Inline Comments Section */}
                    {isCommentsOpen && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                            Comments ({commentsList.length})
                          </span>
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
        </>
      )}

      {/* Student Profile & Posts Preview Modal */}
      <StudentProfileModal
        isOpen={Boolean(selectedStudentProfile)}
        onClose={() => setSelectedStudentProfile(null)}
        student={selectedStudentProfile}
        userProfile={userProfile}
        allPosts={posts}
        onNavigate={onNavigate}
      />
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
