import React, { useState } from "react";
import { Calendar, MapPin, Users, Ticket, Sparkles, PlusCircle, CheckCircle2, Search, Filter } from "lucide-react";

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
}

const SAMPLE_EVENTS: CampusEvent[] = [
  {
    id: "e1",
    title: "Annual Stanford Neo-Neon Campus Party 🎉",
    category: "Party",
    date: "Fri, Aug 14",
    time: "9:00 PM - 2:00 AM",
    location: "Tressider Student Union Courtyard",
    campus: "Stanford University",
    organizer: "Stanford Social Committee",
    rsvpCount: 342,
    maxCapacity: 500,
    userRsvpd: false,
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80",
    description: "The biggest neon glow party on campus! Free drinks for verified students, live DJ sets, and speed friending lounges.",
    attendees: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: "e2",
    title: "AI Hackathon: Generative Agents for Campus 🚀",
    category: "Hackathon",
    date: "Sat, Aug 22",
    time: "10:00 AM - 8:00 PM",
    location: "Gates Computer Science Building",
    campus: "Stanford University",
    organizer: "Stanford AI Lab & Dev Club",
    rsvpCount: 128,
    maxCapacity: 150,
    userRsvpd: true,
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80",
    description: "Build groundbreaking AI applications in 10 hours. $10,000 in seed prizes, free catering, and mentor matching.",
    attendees: [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    ],
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
    description: "Bring a blanket and enjoy relaxing acoustic performances by student artists as the sun sets.",
    attendees: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80",
    ],
  },
];

export const CampusEventsHub: React.FC = () => {
  const [events, setEvents] = useState<CampusEvent[]>(SAMPLE_EVENTS);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

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
          <p className="text-xs text-slate-400 mt-1">RSVP and discover who from your campus is attending live events.</p>
        </div>

        <button className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 self-start sm:self-auto">
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
            className="bg-slate-900/80 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-indigo-500/50 transition duration-300"
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
              {/* Attendee Avatars */}
              <div className="flex items-center -space-x-2">
                {evt.attendees.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt="Attendee"
                    className="w-7 h-7 rounded-full border-2 border-slate-900 object-cover"
                  />
                ))}
                <span className="w-7 h-7 rounded-full bg-white/10 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                  +
                </span>
              </div>

              <button
                onClick={() => toggleRsvp(evt.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  evt.userRsvpd
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                }`}
              >
                {evt.userRsvpd ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> RSVP'd Spot
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
    </div>
  );
};
