import React, { useState } from "react";
import {
  Calendar, MapPin, Users, Ticket, Sparkles, PlusCircle, CheckCircle2,
  Search, Filter, X, ArrowLeft, Send, Heart, MessageSquare, Clock, Building, ExternalLink, Link2, Upload, Image as ImageIcon, Trash2
} from "lucide-react";
import {
  dispatchAppNotification,
  fetchNotificationPreferences,
} from "@/lib/notificationService";

export interface EventComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timeAgo: string;
  likes: number;
  userLiked: boolean;
}

export interface CampusEvent {
  id: string;
  title: string;
  category: "Party" | "Hackathon" | "Study Group" | "Concert" | "Sports";
  date: string;
  time: string;
  location: string;
  campus: string;
  organizer: string;
  rsvpCount: number;
  maxCapacity: number;
  userRsvpd: boolean;
  image: string;
  description: string;
  attendees: string[];
  comments: EventComment[];
  redirectUrl?: string;
}

const SAMPLE_EVENTS: CampusEvent[] = [
  {
    id: "e1",
    title: "Annual Nairobi Inter-Campus Cultural Gala 🎉",
    category: "Party",
    date: "Fri, Aug 14",
    time: "7:00 PM - 2:00 AM",
    location: "UoN Taifa Hall Courtyard",
    campus: "University of Nairobi",
    organizer: "UoN Guild & Social Committee",
    rsvpCount: 342,
    maxCapacity: 500,
    userRsvpd: false,
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80",
    description: "The biggest neon glow cultural gala on campus! Live DJ sets, food stalls, speed friending, and acoustic lounge. Come dressed in vibrant colors and represent your culture!",
    redirectUrl: "https://mookh.com/event/uon-cultural-gala",
    attendees: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    ],
    comments: [
      {
        id: "ec1-1",
        authorName: "Brenda Wanjiku",
        authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        content: "Who is pulling up from Chiromo campus? Looking for a carpool!",
        timeAgo: "2 hours ago",
        likes: 7,
        userLiked: true,
      },
      {
        id: "ec1-2",
        authorName: "John Kirui",
        authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        content: "Hyped for the DJ lineup! 🎧💃",
        timeAgo: "45 mins ago",
        likes: 3,
        userLiked: false,
      }
    ]
  },
  {
    id: "e2",
    title: "East Africa AI & Innovation Summit 🚀",
    category: "Hackathon",
    date: "Sat, Aug 22",
    time: "9:00 AM - 6:00 PM",
    location: "Strathmore iLab Africa",
    campus: "Strathmore University",
    organizer: "Strathmore Tech Society",
    rsvpCount: 128,
    maxCapacity: 150,
    userRsvpd: true,
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80",
    description: "Build groundbreaking AI applications in 10 hours. $5,000 in startup prizes, free catering, and mentor matching with top tech leaders across East Africa.",
    redirectUrl: "https://forms.gle/strathmore-ai-summit",
    attendees: [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    ],
    comments: [
      {
        id: "ec2-1",
        authorName: "Alex Chen",
        authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        content: "Already registered! If anyone needs an LLM / Python dev on their team, ping me!",
        timeAgo: "1 day ago",
        likes: 12,
        userLiked: true,
      }
    ]
  },
  {
    id: "e3",
    title: "Sunset Acoustic Music Session & Picnic 🎸",
    category: "Concert",
    date: "Wed, Aug 19",
    time: "6:00 PM - 9:00 PM",
    location: "Oval Lawn Campus Park",
    campus: "Stanford University",
    organizer: "Acoustic Society",
    rsvpCount: 89,
    maxCapacity: 120,
    userRsvpd: false,
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
    description: "Bring a blanket and enjoy relaxing acoustic performances by student artists as the sun sets over campus. Free mocktails and snacks provided!",
    attendees: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80",
    ],
    comments: []
  },
];

import { AppNavState } from "@/lib/navigationHistory";

interface Props {
  userProfile?: any;
  navState?: AppNavState;
  onNavigate?: (state: AppNavState) => void;
}

export const CampusEventsHub: React.FC<Props> = ({ userProfile, navState, onNavigate }) => {
  const [events, setEvents] = useState<CampusEvent[]>(SAMPLE_EVENTS);
  const [localCategory, setLocalCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

  const activeCategory = (navState?.tab === "events" && navState.category) ? navState.category : localCategory;

  // Selected event derived from navState (or local fallback)
  const selectedEventId = (navState?.tab === "events") ? navState.eventId : undefined;
  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;
  const eventViewMode = (navState?.tab === "events" && navState.eventView) ? navState.eventView : "details";
  const showHostModal = (navState?.tab === "events" && navState.modal === "host-event");

  const [eventCommentInput, setEventCommentInput] = useState("");

  const setActiveCategory = (category: string) => {
    setLocalCategory(category);
    if (onNavigate) {
      onNavigate({ tab: "events", category });
    }
  };

  const openEventDetail = (event: CampusEvent) => {
    if (onNavigate) {
      onNavigate({ tab: "events", category: activeCategory, eventId: event.id, eventView: "details" });
    }
  };

  const openEventChart = (event: CampusEvent) => {
    if (onNavigate) {
      onNavigate({ tab: "events", category: activeCategory, eventId: event.id, eventView: "chart" });
    }
  };

  const closeEventDetail = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  const openHostEventModal = () => {
    if (onNavigate) {
      onNavigate({ tab: "events", category: activeCategory, modal: "host-event" });
    }
  };
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventCategory, setNewEventCategory] = useState<CampusEvent["category"]>("Party");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventRedirectUrl, setNewEventRedirectUrl] = useState("");

  // Event Placard / Poster State (File Upload or Drag & Drop)
  const [eventPoster, setEventPoster] = useState<string>("");
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

  const toggleRsvp = async (id: string) => {
    const target = events.find((e) => e.id === id);
    const isNowAttending = target ? !target.userRsvpd : false;

    setEvents(
      events.map((e) => {
        if (e.id === id) {
          const nextState = !e.userRsvpd;
          return {
            ...e,
            userRsvpd: nextState,
            rsvpCount: nextState ? e.rsvpCount + 1 : e.rsvpCount - 1,
          };
        }
        return e;
      })
    );

    if (selectedEvent && selectedEvent.id === id) {
      setSelectedEvent((prev) => prev ? {
        ...prev,
        userRsvpd: !prev.userRsvpd,
        rsvpCount: prev.userRsvpd ? prev.rsvpCount - 1 : prev.rsvpCount + 1,
      } : null);
    }

    if (isNowAttending && target) {
      const prefs = await fetchNotificationPreferences();
      dispatchAppNotification({
        type: "event_reminder",
        fromName: target.title,
        fromAvatar: target.image,
        fromUniversity: target.campus,
        message: `Reminder: You're attending ${target.title} on ${target.date}`,
      }, prefs);
    }
  };

  const handleAddEventComment = () => {
    if (!selectedEvent || !eventCommentInput.trim()) return;

    const newComment: EventComment = {
      id: `ec-${Date.now()}`,
      authorName: `${userProfile?.firstName || "Alex"} ${userProfile?.lastName || "Chen"}`,
      authorAvatar: userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      content: eventCommentInput.trim(),
      timeAgo: "Just now",
      likes: 0,
      userLiked: false,
    };

    const updatedEvents = events.map((e) => {
      if (e.id === selectedEvent.id) {
        return { ...e, comments: [...e.comments, newComment] };
      }
      return e;
    });

    setEvents(updatedEvents);
    setSelectedEvent({ ...selectedEvent, comments: [...selectedEvent.comments, newComment] });
    setEventCommentInput("");
  };

  const handleCreateEvent = () => {
    if (!newEventTitle.trim() || !newEventLocation.trim()) return;

    let formattedUrl = newEventRedirectUrl.trim();
    if (formattedUrl && !formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const defaultImage = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80";

    const newEvt: CampusEvent = {
      id: `evt-${Date.now()}`,
      title: newEventTitle,
      category: newEventCategory,
      date: newEventDate || "TBA",
      time: newEventTime || "TBA",
      location: newEventLocation,
      campus: userProfile?.campus || "University of Nairobi",
      organizer: `${userProfile?.firstName || "Alex"} ${userProfile?.lastName || "Chen"}`,
      rsvpCount: 1,
      maxCapacity: 100,
      userRsvpd: true,
      image: eventPoster || defaultImage,
      description: newEventDesc || "Join us for an exciting campus meetup!",
      redirectUrl: formattedUrl || undefined,
      attendees: [userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"],
      comments: [],
    };

    setEvents([newEvt, ...events]);
    setShowHostModal(false);
    setNewEventTitle("");
    setNewEventLocation("");
    setNewEventDesc("");
    setNewEventRedirectUrl("");
    setEventPoster("");
  };

  const filteredEvents = events.filter((e) => {
    const matchesCat = activeCategory === "All" || e.category === activeCategory;
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.location.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const categories = ["All", "Party", "Hackathon", "Concert", "Study Group", "Sports"];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Verified Campus Gatherings
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Campus Events & Social Meetups</h2>
          <p className="text-xs text-slate-400 mt-1">RSVP, comment, upload event placards/posters, and redirect to external links.</p>
        </div>

        <button
          onClick={openHostEventModal}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" /> Host Campus Event
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-white/5"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            onClick={() => openEventDetail(evt)}
            className="bg-slate-900/80 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-indigo-500/50 cursor-pointer transition duration-300"
          >
            <div>
              <div className="relative h-48 overflow-hidden">
                <img
                  src={evt.image}
                  alt={evt.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-indigo-300 text-xs font-bold border border-white/10">
                  {evt.category}
                </span>

                {evt.redirectUrl ? (
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-indigo-950/90 backdrop-blur-md text-indigo-300 text-[10px] font-bold border border-indigo-500/40 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Ticket Link
                  </span>
                ) : (
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                    {evt.rsvpCount} Attending
                  </span>
                )}
              </div>

              <div className="p-5 space-y-3">
                <h3 className="text-lg font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors">
                  {evt.title}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">{evt.description}</p>

                <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{evt.date} • {evt.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-pink-400" />
                    <span className="truncate">{evt.location}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex items-center justify-between border-t border-white/5 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>{evt.comments.length} comments</span>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {evt.redirectUrl && (
                  <a
                    href={evt.redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600 hover:text-white transition"
                    title="Open External Ticket/Registration Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  onClick={() => toggleRsvp(evt.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    evt.userRsvpd
                      ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  }`}
                >
                  {evt.userRsvpd ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Going
                    </>
                  ) : (
                    <>
                      <Ticket className="w-3.5 h-3.5" /> RSVP
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EVENT DETAIL & COMMENTS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
            {/* Hero Image / Placard */}
            <div className="relative h-64 shrink-0">
              <img src={selectedEvent.image} alt={selectedEvent.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <button
                onClick={closeEventDetail}
                className="absolute top-4 left-4 p-2 rounded-full bg-slate-950/80 text-white hover:bg-white/20 transition backdrop-blur-md"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">
                  {selectedEvent.category}
                </span>
                <button
                  onClick={() => openEventChart(selectedEvent)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition border ${
                    eventViewMode === "chart"
                      ? "bg-pink-600 text-white border-pink-500"
                      : "bg-slate-950/80 text-slate-200 border-white/10 hover:bg-white/20"
                  }`}
                >
                  📊 Event Stats / Chart
                </button>
              </div>
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
                    onClick={() => toggleRsvp(selectedEvent.id)}
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

              {/* Conditional View: Chart / Analytics vs Description */}
              {eventViewMode === "chart" ? (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                      📊 Event Registration Analytics & Velocity
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      {Math.round((selectedEvent.rsvpCount / selectedEvent.maxCapacity) * 100)}% Capacity Filled
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-white/5">
                    <div
                      style={{ width: `${Math.min(100, Math.round((selectedEvent.rsvpCount / selectedEvent.maxCapacity) * 100))}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Confirmed RSVPs</p>
                      <p className="text-base font-black text-indigo-400 mt-0.5">{selectedEvent.rsvpCount}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Spots Remaining</p>
                      <p className="text-base font-black text-emerald-400 mt-0.5">{Math.max(0, selectedEvent.maxCapacity - selectedEvent.rsvpCount)}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Max Capacity</p>
                      <p className="text-base font-black text-pink-400 mt-0.5">{selectedEvent.maxCapacity}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">About Event</h4>
                  <p className="text-sm text-slate-200 leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}

              {/* Event Comments Section */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 text-indigo-400" /> Discussion & Q&A ({selectedEvent.comments.length})
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedEvent.comments.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No comments yet. Ask a question or drop a note!</p>
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
                      if (e.key === "Enter") handleAddEventComment();
                    }}
                    placeholder="Comment on this event..."
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddEventComment}
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

      {/* HOST CAMPUS EVENT MODAL WITH DRAG & DROP POSTER UPLOAD */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" /> Host Campus Event
              </h3>
              <button onClick={() => setShowHostModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Event Poster Upload / Drag & Drop Zone */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold flex items-center justify-between">
                  <span>Event Poster / Placard Image</span>
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
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. End of Semester BBQ & Music"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as any)}
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
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    placeholder="e.g. Student Union Lawn"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Date</label>
                  <input
                    type="text"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    placeholder="e.g. Fri, Aug 28"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Time</label>
                  <input
                    type="text"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    placeholder="e.g. 5:00 PM - 9:00 PM"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  External Ticket / Registration Link <span className="text-[10px] text-slate-500">(Optional Redirect URL)</span>
                </label>
                <input
                  type="text"
                  value={newEventRedirectUrl}
                  onChange={(e) => setNewEventRedirectUrl(e.target.value)}
                  placeholder="e.g. https://forms.gle/... or https://eventbrite.com/..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description</label>
                <textarea
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="Tell campus students what to expect..."
                  rows={3}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowHostModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!newEventTitle.trim() || !newEventLocation.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-40"
              >
                Publish Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
