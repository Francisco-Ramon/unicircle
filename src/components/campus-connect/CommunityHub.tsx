import { safeSetItem } from "@/lib/safeStorage";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2, MessageSquare, ThumbsUp, PlusCircle, Plus, ShieldCheck,
  Users, Calendar, Info, Search, X, Image, Camera, BarChart3, ChevronRight, Send, Heart, CornerDownRight, ExternalLink, Ticket, CheckCircle2, MapPin, ArrowLeft, ArrowRight, Link2, Upload, Trash2
} from "lucide-react";
import { INSTITUTIONS_DATA, Institution, SUPPORTED_COUNTRIES } from "./UniversityDatabase";
import { TWENTY_STUDENT_PROFILES } from "./StudentProfilesDataset";
import {
  dispatchAppNotification,
  fetchNotificationPreferences,
} from "@/lib/notificationService";
import { CampusEvent, EventComment } from "./CampusEventsHub";
import {
  fetchLivePosts,
  createLivePost,
  toggleLiveLike,
  addLivePostComment,
  broadcastPostLike,
  broadcastPostComment,
  fetchLiveEvents,
  createLiveEvent,
  uploadToStorage,
  subscribeToLiveCommunity,
  fetchLiveDiscoverProfiles,
  getLocalUserId,
} from "@/lib/supabaseLiveService";
import { supabase } from "@/integrations/supabase/client";
import { SocialController } from "@/lib/social/socialController";
import { SocialGraphService } from "@/lib/social/socialGraphService";
import { RealtimeDistributionService } from "@/lib/social/realtimeService";
import { PostVisibility } from "@/lib/social/types";
import { StudentProfileModal, AuthorProfileData } from "./StudentProfileModal";

interface PostComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorCourse: string;
  timeAgo: string;
  content: string;
  likes: number;
  userLiked: boolean;
}

interface CommunityPost {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar: string;
  authorCourse: string;
  timeAgo: string;
  content: string;
  image?: string;
  campus?: string;
  visibility?: PostVisibility;
  likes: number;
  commentsCount: number;
  userLiked: boolean;
  comments: PostComment[];
}

const INITIAL_POSTS: CommunityPost[] = [];
const INITIAL_COMMUNITY_EVENTS: CampusEvent[] = [];

import { AppNavState } from "@/lib/navigationHistory";

interface Props {
  userProfile: any;
  onUpdateProfile?: (updated: any) => void;
  navState?: AppNavState;
  onNavigate?: (state: AppNavState) => void;
}

export const CommunityHub: React.FC<Props> = ({ userProfile, onUpdateProfile, navState, onNavigate }) => {
  // Auto-select user's university or navState selected community
  const userCampus = userProfile?.campus || "University of Nairobi";
  const userCountry = userProfile?.country || "Kenya";

  const findInst = (queryStr?: string) => {
    if (!queryStr) return null;
    const qLower = queryStr.toLowerCase();
    const match = INSTITUTIONS_DATA.find(
      (i) => i.name.toLowerCase() === qLower || i.id === queryStr || i.shortName.toLowerCase() === qLower
    );
    if (match) return match;

    // Construct dynamic institution fallback for any searched school worldwide
    return {
      id: `inst-${qLower.replace(/[^a-z0-9]/g, "")}`,
      name: queryStr,
      shortName: queryStr.split(" ").map((w) => w[0]).join("").substring(0, 6).toUpperCase() || "UNI",
      country: userCountry,
      city: userCountry,
      stateCounty: userCountry,
      type: "University" as const,
      domains: [`${qLower.replace(/[^a-z0-9]/g, "")}.edu`],
      logoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80",
      location: `${userCountry}`,
      verifiedStudentsCount: 5400,
      activeUsersCount: 3200,
      clubsCount: 24,
      establishedYear: 2000,
      popularMajors: ["Medicine & Health", "Computer Science", "Business Administration", "Engineering"],
    };
  };

  const [selectedInst, setSelectedInst] = useState<any>(null);
  const userInst = findInst(userCampus) || INSTITUTIONS_DATA[0];
  const activeInst = selectedInst || (navState?.tab === "communities" && navState.communityId
    ? (findInst(navState.communityId) || userInst)
    : userInst);

  // Strict School Membership Check
  const isSchoolMember = Boolean(
    userProfile?.campus &&
    activeInst?.name &&
    (userProfile.campus.toLowerCase().trim() === activeInst.name.toLowerCase().trim() ||
     userProfile.campus.toLowerCase().includes(activeInst.name.toLowerCase()) ||
     activeInst.name.toLowerCase().includes(userProfile.campus.toLowerCase()) ||
     (activeInst.shortName && (
       userProfile.campus.toLowerCase().includes(activeInst.shortName.toLowerCase()) ||
       activeInst.shortName.toLowerCase().includes(userProfile.campus.toLowerCase())
     )))
  );

  const [activeTab, setActiveTab] = useState<"feed" | "following" | "events" | "members" | "about">("feed");

  // Posts state with localStorage initialization
  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("unicircle_community_posts");
        if (saved) return JSON.parse(saved);
      } catch (err) {
        console.warn("Failed to load posts from localStorage:", err);
      }
    }
    return INITIAL_POSTS;
  });

  // Community Events state with localStorage initialization
  const [communityEvents, setCommunityEvents] = useState<CampusEvent[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("unicircle_community_events");
        if (saved) return JSON.parse(saved);
      } catch (err) {
        console.warn("Failed to load events from localStorage:", err);
      }
    }
    return INITIAL_COMMUNITY_EVENTS;
  });

  const selectedEventId = (navState?.tab === "communities") ? navState.eventId : undefined;
  const [localSelectedEvent, setLocalSelectedEvent] = useState<CampusEvent | null>(null);
  const selectedEvent = localSelectedEvent || communityEvents.find((e) => e.id === selectedEventId) || null;
  const setSelectedEvent = (val: CampusEvent | null | ((prev: CampusEvent | null) => CampusEvent | null)) => {
    if (typeof val === "function") {
      setLocalSelectedEvent(val(selectedEvent));
    } else {
      setLocalSelectedEvent(val);
    }
  };

  const [localShowCreateEventModal, setLocalShowCreateEventModal] = useState<boolean>(false);
  const showCreateEventModal = localShowCreateEventModal || (navState?.tab === "communities" && navState.modal === "host-event");
  const setShowCreateEventModal = (val: boolean) => {
    setLocalShowCreateEventModal(val);
    if (onNavigate) {
      onNavigate({ tab: "communities", modal: val ? "host-event" : undefined });
    }
  };
  const [eventCommentInput, setEventCommentInput] = useState("");

  // Verified Community Members & Profile Modal State
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<any | null>(null);
  const [liveCommunityMembers, setLiveCommunityMembers] = useState<any[]>([]);
  const [campusScopeFilter, setCampusScopeFilter] = useState<"all" | "local">("all");

  // Sync posts to localStorage
  const updatePosts = (newPosts: CommunityPost[]) => {
    setPosts(newPosts);
    if (typeof window !== "undefined") {
      try {
        safeSetItem("unicircle_community_posts", JSON.stringify(newPosts));
      } catch (e) {
        console.warn("Could not save posts to localStorage:", e);
      }
    }
  };

  // Sync events to localStorage
  const updateEvents = (newEvents: CampusEvent[]) => {
    setCommunityEvents(newEvents);
    if (typeof window !== "undefined") {
      try {
        safeSetItem("unicircle_community_events", JSON.stringify(newEvents));
      } catch (e) {
        console.warn("Could not save events to localStorage:", e);
      }
    }
  };

  // Load live posts, events & verified members from Supabase
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function loadLiveData() {
      try {
        const [livePostsData, liveEventsData, liveProfs] = await Promise.all([
          fetchLivePosts(),
          fetchLiveEvents(),
          fetchLiveDiscoverProfiles(),
        ]);

        if (isMounted) {
          if (liveProfs && liveProfs.length > 0) {
            const formattedMembers = liveProfs.map((p) => ({
              id: p.id,
              name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.first_name || "Student",
              age: 21,
              campus: p.campus || activeInst.name,
              country: p.country || "Kenya",
              course: p.course || "Student",
              yearOfStudy: p.year_of_study || "3rd Year",
              photos: (p.photos && p.photos.length > 0) ? p.photos : ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"],
              interests: p.interests || ["Campus Life", "Tech"],
              bio: p.bio || "Student on UniCircle looking to connect with peers!",
              verified: true,
              online: p.is_online || true,
              gender: p.gender || "Female",
            }));
            setLiveCommunityMembers(formattedMembers);
          }
          if (livePostsData && livePostsData.length > 0) {
            const formattedPosts: CommunityPost[] = livePostsData.map((lp) => ({
              id: lp.id,
              authorId: lp.author_id || (lp.profiles?.id) || `author_${lp.id}`,
              authorName: lp.profiles?.first_name
                ? `${lp.profiles.first_name} ${lp.profiles.last_name || ""}`.trim()
                : "Verified Student",
              authorAvatar: lp.profiles?.photos?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
              authorCourse: `${lp.profiles?.course || "Student"} • ${lp.profiles?.year_of_study || "3rd Year"}`,
              timeAgo: new Date(lp.created_at).toLocaleDateString(),
              content: lp.content,
              image: lp.image_url,
              campus: lp.campus || "University of Nairobi",
              visibility: (lp.visibility as any) || "PUBLIC",
              likes: lp.likes_count || 0,
              commentsCount: lp.comments_count || 0,
              userLiked: false,
              comments: [],
            }));
            
            // Deduplicate posts by ID
            setPosts((prev) => {
              const existingIds = new Set(formattedPosts.map((p) => p.id));
              const combined = [...formattedPosts, ...prev.filter((p) => !existingIds.has(p.id))];
              if (typeof window !== "undefined") {
                safeSetItem("unicircle_community_posts", JSON.stringify(combined));
              }
              return combined;
            });
          }

          if (liveEventsData && liveEventsData.length > 0) {
            const formattedEvents: CampusEvent[] = liveEventsData.map((le) => ({
              id: le.id,
              title: le.title,
              category: le.category as any,
              date: le.date,
              time: le.time,
              location: le.location,
              campus: le.campus,
              organizer: "Campus Student",
              rsvpCount: le.rsvp_count || 1,
              maxCapacity: 200,
              userRsvpd: false,
              image: le.image,
              description: le.description,
              redirectUrl: le.redirect_url,
              attendees: [],
              comments: [],
            }));
            
            setCommunityEvents((prev) => {
              const existingEvtIds = new Set(formattedEvents.map((e) => e.id));
              const combined = [...formattedEvents, ...prev.filter((e) => !existingEvtIds.has(e.id))];
              if (typeof window !== "undefined") {
                safeSetItem("unicircle_community_events", JSON.stringify(combined));
              }
              return combined;
            });
          }
        }

        // Realtime Subscription across all students
        unsubscribe = subscribeToLiveCommunity({
          onNewPost: (newLivePost) => {
            const incomingPost: CommunityPost = {
              id: newLivePost.id,
              authorId: newLivePost.author_id,
              authorName: newLivePost.profiles?.first_name
                ? `${newLivePost.profiles.first_name} ${newLivePost.profiles.last_name || ""}`.trim()
                : "Verified Student",
              authorAvatar: newLivePost.profiles?.photos?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
              authorCourse: "Campus Student",
              timeAgo: "Just now",
              content: newLivePost.content,
              image: newLivePost.image_url,
              visibility: (newLivePost as any).visibility || "PUBLIC",
              likes: 0,
              commentsCount: 0,
              userLiked: false,
              comments: [],
            };

            setPosts((prev) => {
              const dedupe = prev.filter((p) => p.id !== incomingPost.id);
              const next = [incomingPost, ...dedupe];
              if (typeof window !== "undefined") {
                safeSetItem("unicircle_community_posts", JSON.stringify(next));
              }
              return next;
            });
          },
          onPostLike: ({ postId, likesCount }) => {
            setPosts((prev) =>
              prev.map((p) => (p.id === postId ? { ...p, likes: likesCount } : p))
            );
          },
          onPostComment: ({ postId, comment, commentsCount }) => {
            setPosts((prev) =>
              prev.map((p) => {
                if (p.id !== postId) return p;
                const existing = p.comments || [];
                const dedupe = comment?.id ? existing.filter((c) => c.id !== comment.id) : existing;
                const updatedComments = comment ? [...dedupe, comment] : existing;
                return {
                  ...p,
                  commentsCount: commentsCount || updatedComments.length,
                  comments: updatedComments,
                };
              })
            );
          },
          onNewEvent: (newLiveEvent) => {
            const incomingEvt: CampusEvent = {
              id: newLiveEvent.id,
              title: newLiveEvent.title,
              category: newLiveEvent.category as any,
              date: newLiveEvent.date,
              time: newLiveEvent.time,
              location: newLiveEvent.location,
              campus: newLiveEvent.campus,
              organizer: "Campus Student",
              rsvpCount: 1,
              maxCapacity: 200,
              userRsvpd: false,
              image: newLiveEvent.image,
              description: newLiveEvent.description,
              redirectUrl: newLiveEvent.redirect_url,
              attendees: [],
              comments: [],
            };

            setCommunityEvents((prev) => {
              const dedupe = prev.filter((e) => e.id !== incomingEvt.id);
              const next = [incomingEvt, ...dedupe];
              if (typeof window !== "undefined") {
                safeSetItem("unicircle_community_events", JSON.stringify(next));
              }
              return next;
            });
          },
        });
      } catch (err) {
        console.warn("Could not load Supabase live feed, using cached initial posts:", err);
      }
    }
    loadLiveData();
    const pollTimer = setInterval(loadLiveData, 7000);
    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      if (unsubscribe) unsubscribe();
    };
  }, [activeInst.name]);

  const openCommunityEventDetail = (evt: CampusEvent) => {
    if (onNavigate) {
      onNavigate({ tab: "communities", communityId: activeInst.id, eventId: evt.id, eventView: "details" });
    }
  };

  const openCreateEventModal = () => {
    if (onNavigate) {
      onNavigate({ tab: "communities", communityId: activeInst.id, modal: "host-event" });
    }
  };
  const [eventTitle, setEventTitle] = useState("");
  const [eventCategory, setEventCategory] = useState<CampusEvent["category"]>("Party");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventRedirectUrl, setEventRedirectUrl] = useState("");

  // Placard Poster Drag & Drop State
  const [eventPoster, setEventPoster] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleImageFileUpload = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setEventPoster(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Comments state: open post ID & comment text inputs map
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // New post form & file upload
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState("");
  const postFileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePostImageFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setNewPostImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePostFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePostImageFile(e.target.files[0]);
    }
  };

  const handleToggleLike = async (postId: string) => {
    const postItem = posts.find((p) => p.id === postId);
    const isCurrentlyLiked = Boolean(postItem?.userLiked);
    const currentUserId = userProfile?.id || getLocalUserId();

    const nextPosts = posts.map((p) => {
      if (p.id === postId) {
        const nextLiked = !p.userLiked;
        const nextCount = nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1);
        return { ...p, userLiked: nextLiked, likes: nextCount };
      }
      return p;
    });
    updatePosts(nextPosts);

    try {
      await toggleLiveLike(postId, currentUserId, isCurrentlyLiked);
    } catch (e) {}
  };

  const handleToggleCommentLike = (postId: string, commentId: string) => {
    const nextPosts = posts.map((p) => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: p.comments.map((c) =>
          c.id === commentId
            ? { ...c, userLiked: !c.userLiked, likes: c.userLiked ? c.likes - 1 : c.likes + 1 }
            : c
        )
      };
    });
    updatePosts(nextPosts);
  };

  const handleAddComment = async (postId: string) => {
    if (!isSchoolMember) {
      toast.error(`Only verified students of ${activeInst?.name || "this university"} can comment in this community.`);
      return;
    }
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const currentUserId = userProfile?.id || getLocalUserId();
    let nextCommentsCount = 0;
    const newComment: PostComment = {
      id: `comm-${Date.now()}`,
      authorName: `${userProfile?.firstName || "Student"} ${userProfile?.lastName || ""}`.trim(),
      authorAvatar: userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      authorCourse: `${userProfile?.course || "Student"} • ${userProfile?.yearOfStudy || "3rd Year"}`,
      timeAgo: "Just now",
      content: text,
      likes: 0,
      userLiked: false,
    };

    const nextPosts = posts.map((p) => {
      if (p.id !== postId) return p;
      nextCommentsCount = p.commentsCount + 1;
      return {
        ...p,
        commentsCount: nextCommentsCount,
        comments: [...p.comments, newComment],
      };
    });

    updatePosts(nextPosts);
    setCommentInputs({ ...commentInputs, [postId]: "" });

    try {
      await addLivePostComment({
        postId,
        authorId: currentUserId,
        content: text,
        authorProfile: userProfile,
      });
    } catch (e) {
      console.warn("Community comment sync notice:", e);
    }
  };

  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postVisibility, setPostVisibility] = useState<PostVisibility>("PUBLIC");

  const handleCreatePost = async () => {
    if (!isSchoolMember) {
      toast.error(`Only verified students of ${activeInst?.name || "this university"} can post in this community.`);
      return;
    }
    if (!newPostContent.trim() || isSubmittingPost) return;
    setIsSubmittingPost(true);
    const postTitle = newPostContent.substring(0, 45);

    try {
      let uploadedImageUrl = newPostImage;
      if (postFileInputRef.current?.files?.[0]) {
        const liveUploaded = await uploadToStorage(postFileInputRef.current.files[0], "post_images");
        if (liveUploaded) uploadedImageUrl = liveUploaded;
      }

      const authorProfile = {
        id: userProfile?.id || getLocalUserId(),
        email: userProfile?.email || "student@unicircle.app",
        firstName: userProfile?.firstName || "Student",
        lastName: userProfile?.lastName || "",
        campus: activeInst?.name || userProfile?.campus || "University of Nairobi",
        course: userProfile?.course || "Student",
        yearOfStudy: userProfile?.yearOfStudy || "3rd Year",
        bio: userProfile?.bio || "",
        photos: userProfile?.photos || ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"],
        interests: userProfile?.interests || [],
        gender: userProfile?.gender || "Female",
        verified: true,
        isOnline: true,
      };

      // 1. Authoritative Database Persistence to Supabase
      const livePost = await createLivePost({
        authorId: authorProfile.id,
        authorProfile: authorProfile,
        content: newPostContent.trim(),
        campus: activeInst?.name || userProfile?.campus || "University of Nairobi",
        imageUrl: uploadedImageUrl || undefined,
      });

      if (!livePost) {
        toast.error("Failed to publish post to campus feed. Please try again.");
        setIsSubmittingPost(false);
        return;
      }

      // 2. Synchronize Social Graph Distribution Engine
      try {
        await (SocialController.createPost as any)({
          id: livePost.id,
          author: authorProfile,
          content: newPostContent.trim(),
          campus: activeInst?.name || userProfile?.campus || "University of Nairobi",
          imageUrl: uploadedImageUrl || null,
          visibility: postVisibility,
        });
      } catch (e) {}

      const studentName = `${authorProfile.firstName} ${authorProfile.lastName}`.trim();
      const studentAvatar = authorProfile.photos[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";

      const formatted: CommunityPost = {
        id: livePost.id,
        authorId: livePost.author_id,
        authorName: studentName,
        authorAvatar: studentAvatar,
        authorCourse: `${authorProfile.course} • ${authorProfile.yearOfStudy}`,
        timeAgo: "Just now",
        content: newPostContent.trim(),
        image: uploadedImageUrl || undefined,
        visibility: postVisibility,
        likes: 0,
        commentsCount: 0,
        userLiked: false,
        comments: [],
      };

      updatePosts([formatted, ...posts.filter((p) => p.id !== formatted.id)]);
      setNewPostContent("");
      setNewPostImage("");
      if (postFileInputRef.current) {
        postFileInputRef.current.value = "";
      }
      setShowNewPost(false);
      toast.success("Post published to campus!");

      // Dispatch community_post notification if preference is ON
      try {
        const prefs = await fetchNotificationPreferences();
        dispatchAppNotification({
          type: "community_post",
          fromName: activeInst?.name || "Campus Community",
          fromAvatar: userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&auto=format&fit=crop&q=80",
          fromUniversity: activeInst?.name || "University of Nairobi",
          message: `posted: '${postTitle}${newPostContent.length > 45 ? "..." : ""}'`,
        }, prefs);
      } catch (e) {}
    } catch (err: any) {
      console.warn("Post creation error:", err);
      toast.error(err?.message || "Failed to publish post. Please check your connection and try again.");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const toggleEventRsvp = (eventId: string) => {
    const nextEvents = communityEvents.map((e) => {
      if (e.id !== eventId) return e;
      const nextState = !e.userRsvpd;
      return {
        ...e,
        userRsvpd: nextState,
        rsvpCount: nextState ? e.rsvpCount + 1 : e.rsvpCount - 1,
      };
    });
    updateEvents(nextEvents);

    if (selectedEvent && selectedEvent.id === eventId) {
      setSelectedEvent((prev) => prev ? {
        ...prev,
        userRsvpd: !prev.userRsvpd,
        rsvpCount: prev.userRsvpd ? prev.rsvpCount - 1 : prev.rsvpCount + 1,
      } : null);
    }
  };

  const handleCreateCommunityEvent = async () => {
    if (!eventTitle.trim() || !eventLocation.trim()) return;

    let formattedUrl = eventRedirectUrl.trim();
    if (formattedUrl && !formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const defaultImg = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80";

    const { data: authUser } = await supabase.auth.getUser();
    if (authUser?.user) {
      await createLiveEvent({
        creatorId: authUser.user.id,
        campus: activeInst?.name || "University of Nairobi",
        title: eventTitle,
        category: eventCategory,
        date: eventDate || "TBA",
        time: eventTime || "TBA",
        location: eventLocation,
        image: eventPoster || defaultImg,
        description: eventDesc || "Community event hosted on UniCircle.",
        redirectUrl: formattedUrl || undefined,
      });
    }

    const newEvt: CampusEvent = {
      id: `cevt-${Date.now()}`,
      title: eventTitle,
      category: eventCategory,
      date: eventDate || "TBA",
      time: eventTime || "TBA",
      location: eventLocation,
      campus: activeInst.name,
      organizer: `${userProfile?.firstName || "Alex"} ${userProfile?.lastName || "Chen"}`,
      rsvpCount: 1,
      maxCapacity: 100,
      userRsvpd: true,
      image: eventPoster || defaultImg,
      description: eventDesc || "Community event hosted on UniCircle.",
      redirectUrl: formattedUrl || undefined,
      attendees: [userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"],
      comments: [],
    };

    updateEvents([newEvt, ...communityEvents]);
    setShowCreateEventModal(false);
    setEventTitle("");
    setEventLocation("");
    setEventDesc("");
    setEventRedirectUrl("");
    setEventPoster("");
  };

  const handleAddCommunityEventComment = () => {
    if (!selectedEvent || !eventCommentInput.trim()) return;

    const newComm: EventComment = {
      id: `cecomm-${Date.now()}`,
      authorName: `${userProfile?.firstName || "Alex"} ${userProfile?.lastName || "Chen"}`,
      authorAvatar: userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      content: eventCommentInput.trim(),
      timeAgo: "Just now",
      likes: 0,
      userLiked: false,
    };

    const updated = communityEvents.map((e) => {
      if (e.id === selectedEvent.id) {
        return { ...e, comments: [...e.comments, newComm] };
      }
      return e;
    });

    setCommunityEvents(updated);
    setSelectedEvent({ ...selectedEvent, comments: [...selectedEvent.comments, newComm] });
    setEventCommentInput("");
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 py-1">
      {/* 1. UNIVERSITY HERO CARD WITH CLOCK TOWER ARCHITECTURE PHOTO */}
      <div className="rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl p-5 md:p-6 min-h-[135px] flex items-center">
        {/* Real photo of UoN clock tower / campus building */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&auto=format&fit=crop&q=80"
            alt="Campus Architecture"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070B14]/95 via-[#070B14]/80 to-[#070B14]/40" />
        </div>

        <div className="relative z-10 flex items-center gap-4 min-w-0">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white shadow-xl shadow-indigo-600/40 shrink-0 p-3">
            <Building2 className="w-7 h-7" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-black text-white tracking-tight truncate">
                {activeInst.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {activeInst.city || "Nairobi"}, {activeInst.country || "Kenya"} • {activeInst.verifiedStudentsCount.toLocaleString()} students
            </p>
          </div>
        </div>
      </div>

      {/* 2. HORIZONTAL NAVIGATION PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "feed", label: "Campus Feed", icon: Building2 },
          { id: "following", label: "Following", icon: Users },
          { id: "members", label: "Verified Students", icon: ShieldCheck },
          { id: "about", label: "About School", icon: Info },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === "feed" && (activeTab as any) === "events");
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-extrabold"
                  : "bg-[#0D1424] border border-white/5 text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* FEED TAB (Campus Feed & Following Feed) */}
      {(activeTab === "feed" || activeTab === "following" || (activeTab as any) === "events") && (
        <div className="space-y-4">
          {/* 3. UPCOMING EVENTS AT UON */}
          <div className="p-4 rounded-2xl bg-[#0D1322] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <span>UPCOMING EVENTS AT {activeInst.shortName || "UON"}</span>
              </h3>
              <button
                onClick={() => onNavigate && onNavigate({ tab: "events" })}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
              >
                <span>View Events Hub</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              onClick={() => onNavigate && onNavigate({ tab: "events" })}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#121A2D]/80 border border-white/5 hover:border-indigo-500/30 cursor-pointer transition group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-white/10 flex flex-col items-center justify-center text-white shrink-0 shadow-sm">
                  <span className="text-[10px] font-bold text-blue-400 leading-none uppercase">NOV</span>
                  <span className="text-sm font-black text-white leading-none mt-0.5">05</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition">Campus Tech & Innovation Fair</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">Main Campus • 9:00 AM – 4:00 PM</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition shrink-0" />
            </div>
          </div>

          {/* 4. SCHOOL MEMBER ACCESS GATE OR COMMUNITY FEED */}
          {!isSchoolMember ? (
            <div className="text-center py-12 px-6 bg-[#0D1322]/90 rounded-3xl border border-white/10 space-y-5 my-4 shadow-2xl backdrop-blur-xl">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-pink-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8 text-amber-400" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                  Members Only Community Hub
                </span>
                <h3 className="text-lg font-black text-white">
                  Exclusive to {activeInst.name} Students
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Discussions, campus posts, and student threads inside this community hub are private to verified students enrolled at {activeInst.name}. Only members can see or comment on community posts.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (userProfile && onUpdateProfile) {
                      onUpdateProfile({ ...userProfile, campus: activeInst.name });
                      toast.success(`Campus switched to ${activeInst.name}! You now have full member access.`);
                    } else {
                      setSelectedInst(activeInst);
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  Join {activeInst.shortName || activeInst.name} Hub
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInst(userInst)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  My School ({userInst.shortName || userInst.name})
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate({ tab: "home" })}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-bold border border-white/10 transition cursor-pointer"
                >
                  Public Feed
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 5. CREATE POST QUICK-BAR */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#0D1424] border border-white/10 shadow-lg">
            <div className="relative shrink-0">
              <img
                src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
                alt="You"
                className="w-11 h-11 rounded-full object-cover border border-white/10"
              />
            </div>
            
            <div className="flex-1 flex items-center justify-between gap-2 p-1.5 pl-4 pr-1.5 rounded-2xl bg-[#090E1B] border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setShowNewPost(true)}
                className="flex-1 text-left text-xs md:text-sm text-slate-400 hover:text-white transition truncate cursor-pointer py-1"
              >
                What's happening on campus?
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowNewPost(true);
                  setTimeout(() => postFileInputRef.current?.click(), 150);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141C30] hover:bg-[#1A2540] border border-indigo-500/40 text-indigo-300 hover:text-white font-semibold text-xs transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
                title="Upload Photo"
              >
                <Image className="w-4 h-4 text-indigo-400" />
                <span>Upload Photo</span>
              </button>
            </div>
          </div>

          {/* DEDICATED POST COMPOSER MODAL / SHEET */}
          {showNewPost && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
              <div className="bg-[#0D1322] border border-white/15 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col my-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white leading-tight">Create Campus Post</h3>
                      <p className="text-[10px] text-slate-400">Share with {activeInst.shortName || "campus"} community</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowNewPost(false); setNewPostContent(""); setNewPostImage(""); }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-0.5 scrollbar-thin">
                  {/* Author info & visibility badge */}
                  <div className="flex items-center justify-between gap-2 bg-slate-900/50 p-2.5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
                        alt="You"
                        className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white flex items-center gap-1 truncate">
                          {userProfile?.firstName || "You"} {userProfile?.lastName || ""}
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                          <Building2 className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{activeInst.name}</span>
                        </p>
                      </div>
                    </div>

                    <select
                      value={postVisibility}
                      onChange={(e) => setPostVisibility(e.target.value as any)}
                      className="bg-slate-950 border border-white/10 text-[11px] font-semibold text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer shrink-0"
                    >
                      <option value="PUBLIC">🌍 Public</option>
                      <option value="FOLLOWERS_ONLY">👥 Followers</option>
                    </select>
                  </div>

                  {/* Post text input */}
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder={`What's happening on campus? Share a question, study group, event update, or thought with ${activeInst.shortName || "peers"}...`}
                    rows={4}
                    autoFocus
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl p-3.5 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition shadow-inner"
                  />

                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={postFileInputRef}
                    accept="image/*"
                    onChange={handlePostFileChange}
                    className="hidden"
                  />

                  {/* Attached Photo Preview OR Modern Upload Photo Button */}
                  {newPostImage ? (
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center max-h-64 group">
                      <img src={newPostImage} alt="Attached preview" className="w-full max-h-64 object-contain rounded-2xl" />
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => postFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-xs font-bold text-white transition backdrop-blur-md cursor-pointer flex items-center gap-1 shadow-lg"
                        >
                          <Camera className="w-3.5 h-3.5 text-pink-400" />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewPostImage("");
                            if (postFileInputRef.current) postFileInputRef.current.value = "";
                          }}
                          className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition backdrop-blur-md cursor-pointer shadow-lg"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => postFileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-dashed border-indigo-500/30 hover:border-indigo-400 text-indigo-300 hover:text-white font-bold text-xs transition-all cursor-pointer group shadow-sm active:scale-[0.99]"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-pink-600/30 border border-indigo-500/30 flex items-center justify-center text-pink-300 group-hover:scale-110 transition-transform">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-indigo-200 group-hover:text-white">Add Photo / Media from Device</p>
                        <p className="text-[10px] text-slate-400">JPG, PNG, WEBP from camera or gallery</p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Modal Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => postFileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Image className="w-4 h-4 text-pink-400" />
                    <span>{newPostImage ? "Change Photo" : "Upload Photo"}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowNewPost(false); setNewPostContent(""); setNewPostImage(""); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim() || isSubmittingPost}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      {isSubmittingPost ? (
                        <span>Publishing...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Publish Post</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posts List */}
          {(() => {
            const currentUserId = userProfile?.id || getLocalUserId();
            const visiblePosts = posts.filter((post) => {
              // 1. Campus Scope Filter (All Campuses vs Local Campus)
              if (campusScopeFilter === "local" && post.campus && activeInst.name) {
                const pCamp = post.campus.toLowerCase();
                const aCamp = activeInst.name.toLowerCase();
                if (!pCamp.includes(aCamp) && !aCamp.includes(pCamp)) {
                  return false;
                }
              }

              const effectiveAuthorId = post.authorId || `author_${post.id}`;
              const isOwnPost = Boolean(
                (post.authorId && (post.authorId === currentUserId || (userProfile?.id && post.authorId === userProfile.id))) ||
                (userProfile?.firstName && post.authorName?.toLowerCase().includes(userProfile.firstName.toLowerCase())) ||
                ((post as any).authorEmail && userProfile?.email && (post as any).authorEmail.toLowerCase() === userProfile.email.toLowerCase())
              );

              // 2. If on "Following" feed: STRICTLY only show posts by authors you are actively following!
              if (activeTab === "following") {
                if (isOwnPost) return false;
                return SocialGraphService.isFollowing(currentUserId, effectiveAuthorId);
              }

              // 3. If post is marked FOLLOWERS_ONLY: only show if author or followed
              if (post.visibility === "FOLLOWERS_ONLY") {
                if (isOwnPost) return true;
                return SocialGraphService.isFollowing(currentUserId, effectiveAuthorId);
              }

              return true;
            });

            if (visiblePosts.length === 0) {
              if (activeTab === "following") {
                return (
                  <div className="text-center py-12 px-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-3 my-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white">No Posts in Following Feed Yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      You haven't followed any campus creators yet. Tap <span className="text-indigo-400 font-bold">+ Follow</span> on other students' posts in the Campus Feed to see their posts appear here!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("feed");
                        if (typeof window !== "undefined") {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95 inline-flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Explore Campus Feed</span>
                    </button>
                  </div>
                );
              }
              return (
                <div className="text-center py-10 px-6 bg-[#0D1322] rounded-3xl border border-white/10 space-y-4 my-4 shadow-2xl">
                  {/* Glowing Chat Bubbles Illustration */}
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center text-indigo-400 mx-auto shadow-inner relative">
                    <MessageSquare className="w-8 h-8 text-indigo-400" />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center text-xs font-black shadow-md">+</span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {campusScopeFilter === "local" ? `No Posts on ${activeInst.shortName || activeInst.name} Yet` : "No Campus Posts Yet"}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      {campusScopeFilter === "local"
                        ? `Be the first student to post on ${activeInst.name}! Or switch to 'All Campuses Feed' to see posts from other universities.`
                        : "Be the first student to share an update, start a discussion, or post a photo on campus!"}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {campusScopeFilter === "local" && (
                      <button
                        type="button"
                        onClick={() => setCampusScopeFilter("all")}
                        className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition cursor-pointer"
                      >
                        View All Campuses Feed
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewPost(true);
                        if (typeof window !== "undefined") {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-xl shadow-purple-600/30 hover:scale-105 cursor-pointer active:scale-95 inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Create First Post</span>
                    </button>
                  </div>
                </div>
              );
            }

            return visiblePosts.map((post) => {
            const isCommentsOpen = activeCommentPostId === post.id;
            const currentUserId = userProfile?.id || getLocalUserId();
            const effectiveAuthorId = post.authorId || `author_${post.id}`;
            const isFollowingAuthor = SocialGraphService.isFollowing(currentUserId, effectiveAuthorId);

            const isOwnPost = Boolean(
              (post.authorId && (post.authorId === currentUserId || (userProfile?.id && post.authorId === userProfile.id))) ||
              (userProfile?.firstName && post.authorName?.toLowerCase().includes(userProfile.firstName.toLowerCase())) ||
              ((post as any).authorEmail && userProfile?.email && (post as any).authorEmail.toLowerCase() === userProfile.email.toLowerCase())
            );

            return (
              <div key={post.id} className="bg-slate-900/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-lg transition">
                {/* Post header */}
                <div className="flex items-center justify-between p-4 pb-0">
                  <div
                    onClick={() => setSelectedMemberProfile({
                      id: effectiveAuthorId,
                      name: post.authorName,
                      avatar: post.authorAvatar,
                      campus: post.campus || activeInst.name,
                      course: post.authorCourse || "Student",
                      yearOfStudy: "3rd Year",
                      bio: `Verified student at ${post.campus || activeInst.name}. Active member of the campus community!`,
                      verified: true,
                      online: true,
                      interests: ["Campus Life", "Events", "Clubs"],
                    })}
                    className="flex items-center gap-3 min-w-0 cursor-pointer group/author"
                  >
                    <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-xl object-cover group-hover/author:border-indigo-400 transition" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate group-hover/author:text-indigo-300 transition">
                        {post.authorName}
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        {post.visibility === "FOLLOWERS_ONLY" && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">Followers Only</span>
                        )}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[11px] text-slate-400">{post.authorCourse}</span>
                        {post.campus && (
                          <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/30 text-[10px] flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5 text-indigo-400" />
                            {post.campus}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">• {post.timeAgo}</span>
                      </div>
                    </div>
                  </div>

                  {isOwnPost ? (
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/20">
                      You
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        if (isFollowingAuthor) {
                          SocialGraphService.unfollowUser(currentUserId, effectiveAuthorId);
                        } else {
                          await SocialController.followUser({
                            id: currentUserId,
                            email: userProfile?.email || "student@unicircle.app",
                            firstName: userProfile?.firstName || "Student",
                            lastName: userProfile?.lastName || "",
                            campus: activeInst.name,
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
                        setPosts((prev) => [...prev]);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                        isFollowingAuthor
                          ? "bg-white/10 text-slate-300 hover:bg-white/15 border border-white/10"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                      }`}
                    >
                      {isFollowingAuthor ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Post content */}
                <div className="px-4 py-3">
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Post image */}
                {post.image && (
                  <div className="px-4 pb-3">
                    <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center max-h-[550px]">
                      <img
                        src={post.image}
                        alt="Post attachment"
                        className="w-full max-h-[550px] object-contain rounded-2xl"
                      />
                    </div>
                  </div>
                )}

                {/* Post actions */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        post.userLiked
                          ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                          : "text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${post.userLiked ? "fill-indigo-400 text-indigo-400" : ""}`} />
                      {post.likes}
                    </button>

                    <button
                      onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isCommentsOpen
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{post.commentsCount} {post.commentsCount === 1 ? "Comment" : "Comments"}</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-500 font-medium">Campus Verified Thread</span>
                </div>

                {/* Interactive Comment / Chat Thread Section */}
                {isCommentsOpen && (
                  <div className="bg-slate-950/80 border-t border-white/10 p-4 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Post Comments & Chat Thread
                      </h5>
                      <span className="text-[10px] text-slate-500">{post.comments.length} replies</span>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {post.comments.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">No comments yet. Start the conversation!</p>
                      ) : (
                        post.comments.map((comm) => (
                          <div key={comm.id} className="flex gap-2.5 items-start bg-slate-900/60 p-3 rounded-xl border border-white/[0.04]">
                            <img src={comm.authorAvatar} alt={comm.authorName} className="w-7 h-7 rounded-lg object-cover shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">{comm.authorName}</span>
                                <span className="text-[10px] text-slate-500">{comm.timeAgo}</span>
                              </div>
                              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{comm.content}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <button
                                  onClick={() => handleToggleCommentLike(post.id, comm.id)}
                                  className={`text-[10px] font-bold flex items-center gap-1 ${
                                    comm.userLiked ? "text-pink-400" : "text-slate-500 hover:text-slate-300"
                                  }`}
                                >
                                  <Heart className={`w-3 h-3 ${comm.userLiked ? "fill-pink-400" : ""}`} />
                                  {comm.likes > 0 ? comm.likes : "Like"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Input */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <img
                        src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
                        alt="You"
                        className="w-7 h-7 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment(post.id);
                          }}
                          placeholder="Write a comment or chat..."
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="absolute right-1.5 p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-30"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          });
        })()}
            </>
          )}
      </div>
    )}

      {/* EVENTS TAB (Community Events with Poster Upload & Redirect Links) */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Upcoming Events at {activeInst.shortName}
            </h3>
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Create Event
            </button>
          </div>

          {communityEvents.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 border border-white/[0.06] rounded-2xl">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-400">No upcoming events at {activeInst.shortName}</h3>
              <p className="text-xs text-slate-500 mt-1">Host an event for your university community!</p>
              <button
                onClick={() => setShowCreateEventModal(true)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
              >
                Create Event
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communityEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-lg hover:border-indigo-500/50 cursor-pointer transition flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-40 overflow-hidden">
                      <img src={evt.image} alt={evt.title} className="w-full h-full object-cover" />
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 text-indigo-300 text-[10px] font-bold border border-white/10">
                        {evt.category}
                      </span>
                      {evt.redirectUrl && (
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-purple-950/90 text-purple-300 text-[10px] font-bold border border-purple-500/40 flex items-center gap-1">
                          <ExternalLink className="w-2.5 h-2.5" /> Redirect Link
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-bold text-white leading-snug">{evt.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{evt.description}</p>
                      <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                        <p>🗓️ {evt.date} • {evt.time}</p>
                        <p>📍 {evt.location}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex items-center justify-between border-t border-white/5 mt-2">
                    <span className="text-[11px] text-slate-400">{evt.rsvpCount} Attending</span>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {evt.redirectUrl && (
                        <a
                          href={evt.redirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition"
                          title="Open External Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => toggleEventRsvp(evt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          evt.userRsvpd
                            ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-indigo-600 text-white"
                        }`}
                      >
                        {evt.userRsvpd ? "RSVP'd" : "RSVP"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MEMBERS TAB */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder={`Search ${activeInst.shortName} verified members...`}
              className="w-full bg-slate-900/80 border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-md"
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Verified Members ({activeInst.shortName})
            </h3>
            <span className="text-[11px] text-indigo-400 font-semibold">
              {(() => {
                const q = memberSearchQuery.trim().toLowerCase();
                const all = [
                  ...liveCommunityMembers,
                  ...TWENTY_STUDENT_PROFILES.filter((s) => !liveCommunityMembers.some((lm) => lm.id === s.id || lm.name.toLowerCase() === s.name.toLowerCase())),
                ];
                const filtered = q ? all.filter((s) => s.name.toLowerCase().includes(q) || (s.course && s.course.toLowerCase().includes(q))) : all;
                return `${filtered.length} students`;
              })()}
            </span>
          </div>

          <div className="space-y-2">
            {(() => {
              const q = memberSearchQuery.trim().toLowerCase();
              const allMembers = liveCommunityMembers;
              const filteredMembers = q
                ? allMembers.filter((s) =>
                    s.name.toLowerCase().includes(q) ||
                    (s.course && s.course.toLowerCase().includes(q)) ||
                    (s.campus && s.campus.toLowerCase().includes(q)) ||
                    (s.interests && s.interests.some((i: string) => i.toLowerCase().includes(q)))
                  )
                : allMembers;

              if (filteredMembers.length === 0) {
                return (
                  <div className="text-center py-10 bg-slate-900/40 rounded-2xl border border-white/5">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No members found matching "{memberSearchQuery}"</p>
                  </div>
                );
              }

              return filteredMembers.map((student) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedMemberProfile(student)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-white/[0.04] hover:bg-white/[0.06] hover:border-indigo-500/30 transition cursor-pointer group"
                >
                  <div className="relative shrink-0">
                    <img src={student.photos?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600"} alt={student.name} className="w-11 h-11 rounded-xl object-cover" />
                    {student.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate group-hover:text-indigo-300 transition-colors">
                      {student.name}{student.age ? `, ${student.age}` : ""}
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">{student.course} • {student.yearOfStudy || "Student"}</p>
                    <p className="text-[10px] text-slate-500 truncate">{student.campus}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMemberProfile(student);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 text-xs font-bold hover:bg-indigo-600 hover:text-white transition shadow-sm cursor-pointer shrink-0"
                  >
                    View Profile
                  </button>
                </div>
              ));
            })()}
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

      {/* CREATE EVENT MODAL UNDER COMMUNITY WITH DRAG & DROP POSTER */}
      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" /> Create Event for {activeInst.shortName}
              </h3>
              <button onClick={() => setShowCreateEventModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Event Poster / Placard Drag & Drop Upload Zone */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold flex items-center justify-between">
                  <span>Event Placard / Poster Image</span>
                  {eventPoster && (
                    <button
                      onClick={() => setEventPoster("")}
                      className="text-red-400 hover:text-red-300 font-normal flex items-center gap-1 text-[10px]"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Poster
                    </button>
                  )}
                </label>

                {eventPoster ? (
                  <div className="relative h-40 rounded-2xl overflow-hidden border border-white/20 group">
                    <img src={eventPoster} alt="Poster preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <button
                        onClick={() => setEventPoster("")}
                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs flex items-center gap-1 shadow-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Change Poster
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                      isDragging
                        ? "border-indigo-400 bg-indigo-500/10"
                        : "border-white/15 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-950"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageFileUpload(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-xs">Drag & drop your event poster here</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">or click to browse from device (JPEG, PNG, WEBP)</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Event Title</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Taifa Hall Debate Competition"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Party">Party</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Study Group">Study Group</option>
                    <option value="Concert">Concert</option>
                    <option value="Sports">Sports</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Location</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g. Taifa Hall, Main Campus"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Date</label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    placeholder="e.g. Tue, Aug 18"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Time</label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="e.g. 6:00 PM - 10:00 PM"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  External Ticket / Redirect Link <span className="text-[10px] text-slate-500">(Google Form / Eventbrite URL)</span>
                </label>
                <input
                  type="text"
                  value={eventRedirectUrl}
                  onChange={(e) => setEventRedirectUrl(e.target.value)}
                  placeholder="e.g. https://forms.gle/..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description</label>
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Event details and instructions..."
                  rows={3}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowCreateEventModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCommunityEvent}
                disabled={!eventTitle.trim() || !eventLocation.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-40"
              >
                Publish Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVENT DETAIL & COMMENTS MODAL IN COMMUNITY */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
            {/* Hero Image / Placard */}
            <div className="relative h-64 shrink-0">
              <img src={selectedEvent.image} alt={selectedEvent.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-slate-950/80 text-white hover:bg-white/20 transition backdrop-blur-md"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">
                {selectedEvent.category}
              </span>
            </div>

            {/* Event Info */}
            <div className="p-6 space-y-4 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white leading-tight">{selectedEvent.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">Hosted by <span className="text-indigo-400 font-semibold">{selectedEvent.organizer}</span></p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedEvent.redirectUrl && (
                    <a
                      href={selectedEvent.redirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
                    >
                      <ExternalLink className="w-4 h-4" /> Redirect Link
                    </a>
                  )}

                  <button
                    onClick={() => toggleEventRsvp(selectedEvent.id)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                      selectedEvent.userRsvpd
                        ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                    }`}
                  >
                    {selectedEvent.userRsvpd ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> You're Attending
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" /> RSVP ({selectedEvent.rsvpCount} Going)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {selectedEvent.redirectUrl && (
                <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs text-purple-300">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Link2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="truncate">External Ticket / Registration Link: {selectedEvent.redirectUrl}</span>
                  </div>
                  <a
                    href={selectedEvent.redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition shrink-0"
                  >
                    Open Link ↗
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-white/[0.06] text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Date & Time</p>
                    <p className="font-semibold">{selectedEvent.date} • {selectedEvent.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <MapPin className="w-4 h-4 text-pink-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Location</p>
                    <p className="font-semibold truncate">{selectedEvent.location}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">About Event</h4>
                <p className="text-sm text-slate-200 leading-relaxed">{selectedEvent.description}</p>
              </div>

              {/* Event Comments Section */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 text-indigo-400" /> Event Comments & Discussion ({selectedEvent.comments.length})
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedEvent.comments.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No comments yet. Be the first to comment!</p>
                  ) : (
                    selectedEvent.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-white/[0.04]">
                        <img src={c.authorAvatar} alt={c.authorName} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{c.authorName}</span>
                            <span className="text-[10px] text-slate-500">{c.timeAgo}</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{c.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Field */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={eventCommentInput}
                    onChange={(e) => setEventCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCommunityEventComment();
                    }}
                    placeholder="Comment on this event..."
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddCommunityEventComment}
                    disabled={!eventCommentInput.trim()}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verified Student Profile & Posts Modal */}
      <StudentProfileModal
        isOpen={Boolean(selectedMemberProfile)}
        onClose={() => setSelectedMemberProfile(null)}
        student={selectedMemberProfile}
        userProfile={userProfile}
        allPosts={posts}
        onNavigate={onNavigate}
      />

      {/* Mobile Floating Action Button for Instant Post Creation */}
      <button
        type="button"
        onClick={() => setShowNewPost(true)}
        className="fixed bottom-20 right-4 lg:hidden z-40 w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 text-white flex items-center justify-center shadow-2xl shadow-purple-600/50 hover:scale-105 active:scale-95 transition-transform cursor-pointer border border-white/20"
        title="Create New Post"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>
    </div>
  );
};
