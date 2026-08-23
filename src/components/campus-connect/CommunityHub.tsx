import React, { useState } from "react";
import {
  Building2, MessageSquare, ThumbsUp, PlusCircle, ShieldCheck,
  Users, Calendar, Info, Search, X, Image, BarChart3, ChevronRight, Send, Heart, CornerDownRight, ExternalLink, Ticket, CheckCircle2, MapPin, ArrowLeft, ArrowRight, Link2, Upload, Trash2
} from "lucide-react";
import { INSTITUTIONS_DATA, Institution, SUPPORTED_COUNTRIES } from "./UniversityDatabase";
import { GlobalUniversitySearch } from "./GlobalUniversitySearch";
import { TWENTY_STUDENT_PROFILES } from "./StudentProfilesDataset";
import {
  dispatchAppNotification,
  fetchNotificationPreferences,
} from "@/lib/notificationService";
import { CampusEvent, EventComment } from "./CampusEventsHub";

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
  authorName: string;
  authorAvatar: string;
  authorCourse: string;
  timeAgo: string;
  content: string;
  image?: string;
  likes: number;
  commentsCount: number;
  userLiked: boolean;
  comments: PostComment[];
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
    commentsCount: 2,
    userLiked: false,
    comments: [
      {
        id: "c1-1",
        authorName: "Mercy Mwangi",
        authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        authorCourse: "Nursing • 3rd Year",
        timeAgo: "1 hour ago",
        content: "Count me in! What time are we meeting on Saturday?",
        likes: 5,
        userLiked: true,
      },
      {
        id: "c1-2",
        authorName: "Kevin Wafula",
        authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
        authorCourse: "Computer Science • 3rd Year",
        timeAgo: "30 mins ago",
        content: "Can CS majors tag along for quiet study? Lib gets packed on weekends!",
        likes: 2,
        userLiked: false,
      }
    ]
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
    commentsCount: 1,
    userLiked: true,
    comments: [
      {
        id: "c2-1",
        authorName: "Dennis Kipchumba",
        authorAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80",
        authorCourse: "Economics • 2nd Year",
        timeAgo: "3 hours ago",
        content: "Hall 9 taking the trophy home for sure 🔥🔥",
        likes: 12,
        userLiked: false,
      }
    ]
  },
  {
    id: "p3",
    authorName: "Kevin Wafula",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    authorCourse: "Computer Science • 3rd Year",
    timeAgo: "8 hours ago",
    content: "Just finished my first AI project using TensorFlow! Looking for teammates for the upcoming East Africa AI Challenge. Drop a comment if interested 💡",
    likes: 35,
    commentsCount: 2,
    userLiked: false,
    comments: [
      {
        id: "c3-1",
        authorName: "Alex Chen",
        authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        authorCourse: "Computer Science & AI • 3rd Year",
        timeAgo: "6 hours ago",
        content: "Definitely interested! I work with PyTorch and NLP models. Sent you a DM on UniCircle!",
        likes: 8,
        userLiked: true,
      },
      {
        id: "c3-2",
        authorName: "Fatuma Hassan",
        authorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
        authorCourse: "Software Engineering • 4th Year",
        timeAgo: "4 hours ago",
        content: "Need a UI/UX designer for the project pitch presentation?",
        likes: 4,
        userLiked: false,
      }
    ]
  },
];

const INITIAL_COMMUNITY_EVENTS: CampusEvent[] = [
  {
    id: "ce1",
    title: "Taifa Hall Debate & Cultural Night 🏆",
    category: "Party",
    date: "Tue, Aug 18",
    time: "6:00 PM - 10:00 PM",
    location: "Taifa Hall, Main Campus",
    campus: "University of Nairobi",
    organizer: "UoN Debating Society",
    rsvpCount: 145,
    maxCapacity: 300,
    userRsvpd: true,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80",
    description: "Annual debate showdown followed by music and networking! Register using the link below if you are a contestant.",
    redirectUrl: "https://forms.gle/uon-debate-registration",
    attendees: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    ],
    comments: [
      {
        id: "cec-1",
        authorName: "Amani Wanjiru",
        authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        content: "Make sure to register via the Google Form redirect link before Friday!",
        timeAgo: "3 hours ago",
        likes: 9,
        userLiked: true
      }
    ]
  }
];

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

  const userInst = findInst(userCampus) || INSTITUTIONS_DATA[0];
  const activeInst = (navState?.tab === "communities" && navState.communityId)
    ? (findInst(navState.communityId) || userInst)
    : userInst;

  const [activeTab, setActiveTab] = useState<"feed" | "events" | "members" | "about">("feed");
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState("");

  // Posts state
  const [posts, setPosts] = useState<CommunityPost[]>(INITIAL_POSTS);

  // Community Events state
  const [communityEvents, setCommunityEvents] = useState<CampusEvent[]>(INITIAL_COMMUNITY_EVENTS);
  const selectedEventId = (navState?.tab === "communities") ? navState.eventId : undefined;
  const selectedEvent = communityEvents.find((e) => e.id === selectedEventId) || null;
  const showCreateEventModal = (navState?.tab === "communities" && navState.modal === "host-event");
  const [eventCommentInput, setEventCommentInput] = useState("");

  const handleSelectInstitution = (inst: any) => {
    setShowSwitcher(false);
    if (onUpdateProfile && userProfile) {
      onUpdateProfile({
        ...userProfile,
        campus: inst.name,
        country: inst.country,
        institutionId: inst.id,
      });
    }
    if (onNavigate) {
      onNavigate({ tab: "communities", communityId: inst.id });
    }
  };

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

  const handleToggleLike = (postId: string) => {
    setPosts(posts.map((p) =>
      p.id === postId
        ? { ...p, userLiked: !p.userLiked, likes: p.userLiked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

  const handleToggleCommentLike = (postId: string, commentId: string) => {
    setPosts(posts.map((p) => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: p.comments.map((c) =>
          c.id === commentId
            ? { ...c, userLiked: !c.userLiked, likes: c.userLiked ? c.likes - 1 : c.likes + 1 }
            : c
        )
      };
    }));
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const newComment: PostComment = {
      id: `comm-${Date.now()}`,
      authorName: `${userProfile?.firstName || "Alex"} ${userProfile?.lastName || "Chen"}`,
      authorAvatar: userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      authorCourse: `${userProfile?.course || "Computer Science"} • ${userProfile?.yearOfStudy || "3rd Year"}`,
      timeAgo: "Just now",
      content: text,
      likes: 0,
      userLiked: false,
    };

    setPosts(posts.map((p) => {
      if (p.id !== postId) return p;
      return {
        ...p,
        commentsCount: p.commentsCount + 1,
        comments: [...p.comments, newComment],
      };
    }));

    setCommentInputs({ ...commentInputs, [postId]: "" });
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    const postTitle = newPostContent.substring(0, 45);
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
      comments: [],
    };
    setPosts([newPost, ...posts]);
    setNewPostContent("");
    setNewPostImage("");
    setShowNewPost(false);

    // Dispatch community_post notification if preference is ON
    const prefs = await fetchNotificationPreferences();
    dispatchAppNotification({
      type: "community_post",
      fromName: activeInst?.name || "Campus Community",
      fromAvatar: userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&auto=format&fit=crop&q=80",
      fromUniversity: activeInst?.name || "University of Nairobi",
      message: `posted: '${postTitle}${newPostContent.length > 45 ? "..." : ""}'`,
    }, prefs);
  };

  const toggleEventRsvp = (eventId: string) => {
    setCommunityEvents(communityEvents.map((e) => {
      if (e.id !== eventId) return e;
      const nextState = !e.userRsvpd;
      return {
        ...e,
        userRsvpd: nextState,
        rsvpCount: nextState ? e.rsvpCount + 1 : e.rsvpCount - 1,
      };
    }));
    if (selectedEvent && selectedEvent.id === eventId) {
      setSelectedEvent((prev) => prev ? {
        ...prev,
        userRsvpd: !prev.userRsvpd,
        rsvpCount: prev.userRsvpd ? prev.rsvpCount - 1 : prev.rsvpCount + 1,
      } : null);
    }
  };

  const handleCreateCommunityEvent = () => {
    if (!eventTitle.trim() || !eventLocation.trim()) return;

    let formattedUrl = eventRedirectUrl.trim();
    if (formattedUrl && !formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const defaultImg = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80";

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

    setCommunityEvents([newEvt, ...communityEvents]);
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
          { id: "feed", label: "School Feed", icon: MessageSquare },
          { id: "members", label: "Verified Students", icon: Users },
          { id: "about", label: "About School", icon: Info },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === "feed" && activeTab === ("events" as any));
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
      {(activeTab === "feed" || (activeTab as any) === "events") && (
        <div className="space-y-4">
          {/* School-Associated Events Section */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Upcoming Events at {activeInst.shortName || activeInst.name}
              </h3>
              <button
                onClick={() => onNavigate && onNavigate({ tab: "events" })}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
              >
                View Events Hub <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {communityEvents
                .filter((evt) => !evt.campus || evt.campus.toLowerCase().includes(activeInst.name.toLowerCase()) || activeInst.name.toLowerCase().includes((evt.campus || "").toLowerCase()))
                .slice(0, 2)
                .map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      if (onNavigate) {
                        onNavigate({ tab: "events", category: evt.category, eventId: evt.id, eventView: "details" });
                      }
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-white/5 hover:border-indigo-500/30 cursor-pointer transition group"
                  >
                    <img src={evt.image} alt={evt.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition">{evt.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{evt.date} • {evt.location}</p>
                      <span className="text-[9px] font-bold text-emerald-400 mt-0.5 inline-block">{evt.rsvpCount} going</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Post Composer */}
          {!showNewPost ? (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] hover:border-white/10 transition">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
                  alt="You"
                  className="w-9 h-9 rounded-xl object-cover shrink-0"
                />
                <button
                  onClick={() => setShowNewPost(true)}
                  className="flex-1 text-left text-sm text-slate-400 hover:text-white transition truncate"
                >
                  What's happening on campus?
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setShowNewPost(true);
                    setTimeout(() => postFileInputRef.current?.click(), 100);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Upload photo from device"
                >
                  <Image className="w-4 h-4 text-indigo-400" />
                  <span>Upload Photo</span>
                </button>
              </div>
            </div>
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
                <div className="relative group rounded-xl overflow-hidden border border-white/10">
                  <img src={newPostImage} alt="Attached preview" className="w-full max-h-56 object-cover rounded-xl" />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => postFileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-xs font-bold text-white transition backdrop-blur-md cursor-pointer"
                    >
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPostImage("")}
                      className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition backdrop-blur-md cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={postFileInputRef}
                    accept="image/*"
                    onChange={handlePostFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => postFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Upload Photo from Device"
                  >
                    <Image className="w-4 h-4 text-indigo-400" />
                    <span>Upload Photo</span>
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
          {posts.map((post) => {
            const isCommentsOpen = activeCommentPostId === post.id;
            return (
              <div key={post.id} className="bg-slate-900/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-lg transition">
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
          })}
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

      {/* Worldwide University Switcher Modal */}
      {showSwitcher && (
        <GlobalUniversitySearch
          title="Change University Worldwide"
          currentUniversityName={activeInst.name}
          onSelectInstitution={(inst) => {
            setActiveInst(inst);
            if (userProfile) {
              userProfile.campus = inst.name;
              userProfile.country = inst.country;
              userProfile.institutionId = inst.id;
            }
            setShowSwitcher(false);
            if (onNavigate) {
              onNavigate({ tab: "communities", communityId: inst.id });
            }
          }}
          onClose={() => setShowSwitcher(false)}
        />
      )}
    </div>
  );
};
