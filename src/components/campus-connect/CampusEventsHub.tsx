import React, { useState } from "react";
import {
  Calendar, MapPin, Users, Ticket, Sparkles, PlusCircle, CheckCircle2,
  Search, Filter, X, ArrowLeft, Send, Heart, MessageSquare, Clock, Building
} from "lucide-react";

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

interface Props {
  userProfile?: any;
}

export const CampusEventsHub: React.FC<Props> = ({ userProfile }) => {
  const [events, setEvents] = useState<CampusEvent[]>(SAMPLE_EVENTS);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

  // Selected event modal/detail view
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [eventCommentInput, setEventCommentInput] = useState("");

  // Host Event Modal
  const [showHostModal, setShowHostModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventCategory, setNewEventCategory] = useState<CampusEvent["category"]>("Party");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");

  const toggleRsvp = (id: string) => {
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
      image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80",
      description: newEventDesc || "Join us for an exciting campus meetup!",
      attendees: [userProfile?.photos?.[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"],
      comments: [],
    };

    setEvents([newEvt, ...events]);
    setShowHostModal(false);
    setNewEventTitle("");
    setNewEventLocation("");
    setNewEventDesc("");
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
          <p className="text-xs text-slate-400 mt-1">RSVP, comment, and discover who from your campus is attending live events.</p>
        </div>

        <button
          onClick={() => setShowHostModal(true)}
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
            onClick={() => setSelectedEvent(evt)}
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
                <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                  {evt.rsvpCount} Attending
                </span>
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

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRsvp(evt.id);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
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
                    <Ticket className="w-3.5 h-3.5" /> RSVP Spot
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EVENT DETAIL & COMMENTS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
            {/* Hero Image */}
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white leading-tight">{selectedEvent.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">Hosted by <span className="text-indigo-400 font-semibold">{selectedEvent.organizer}</span></p>
                </div>

                <button
                  onClick={() => toggleRsvp(selectedEvent.id)}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
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
                      <Ticket className="w-4 h-4" /> RSVP Spot ({selectedEvent.rsvpCount} Going)
                    </>
                  )}
                </button>
              </div>

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

      {/* HOST CAMPUS EVENT MODAL */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" /> Host Campus Event
              </h3>
              <button onClick={() => setShowHostModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
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
