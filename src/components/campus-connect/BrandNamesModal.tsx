import React, { useState } from "react";
import { Sparkles, CheckCircle2, Bookmark, Vote, ExternalLink, Flame, GraduationCap, Heart, Users, Zap, Search } from "lucide-react";

export interface BrandName {
  id: number;
  name: string;
  tagline: string;
  category: "Academic" | "Modern" | "Romance" | "Social" | "NextGen";
  domain: string;
  votes: number;
}

const INITIAL_BRANDS: BrandName[] = [
  // Academic & Prestigious
  { id: 1, name: "Quadrangle", tagline: "Meet on the Quad", category: "Academic", domain: "quadrangle.edu", votes: 142 },
  { id: 2, name: "Univibe", tagline: "Campus frequency & energy", category: "Academic", domain: "univibe.app", votes: 98 },
  { id: 3, name: "ScholarSpark", tagline: "Intellectual & romantic sparks", category: "Academic", domain: "scholarspark.com", votes: 76 },
  { id: 4, name: "AcademiaSocial", tagline: "Prestige student network", category: "Academic", domain: "academiasocial.org", votes: 64 },
  { id: 5, name: "AlmaMate", tagline: "Your Alma Mater soulmate", category: "Academic", domain: "almamate.co", votes: 215 },
  { id: 6, name: "CampusPulse", tagline: "The heartbeat of student life", category: "Academic", domain: "campuspulse.io", votes: 189 },
  { id: 7, name: "Lectura", tagline: "Modern academic social environment", category: "Academic", domain: "lectura.app", votes: 53 },
  { id: 8, name: "HonorBound", tagline: "Trust & verified connections", category: "Academic", domain: "honorbound.edu", votes: 41 },
  { id: 9, name: "CampusCrown", tagline: "Premium student experience", category: "Academic", domain: "campuscrown.com", votes: 88 },
  { id: 10, name: "DormVerse", tagline: "The ultimate student ecosystem", category: "Academic", domain: "dormverse.io", votes: 167 },

  // Modern & Minimalist
  { id: 11, name: "VibeCheck", tagline: "Instant alignment & chemical match", category: "Modern", domain: "vibecheck.campus", votes: 310 },
  { id: 12, name: "UniPulse", tagline: "Streamlined, energetic student hub", category: "Modern", domain: "unipulse.app", votes: 124 },
  { id: 13, name: "Kith", tagline: "Friendship & intimate connections", category: "Modern", domain: "kith.social", votes: 95 },
  { id: 14, name: "CampusLink", tagline: "Clean, direct student connection", category: "Modern", domain: "campuslink.net", votes: 112 },
  { id: 15, name: "Bonded", tagline: "Verified authentic human bonds", category: "Modern", domain: "bonded.edu", votes: 84 },
  { id: 16, name: "Nock", tagline: "Knock on dorm doors digitally", category: "Modern", domain: "nock.app", votes: 136 },
  { id: 17, name: "Kinship", tagline: "Pure, verified relationships", category: "Modern", domain: "kinship.io", votes: 91 },
  { id: 18, name: "Orbit Campus", tagline: "Keep your campus in your orbit", category: "Modern", domain: "orbitcampus.com", votes: 158 },
  { id: 19, name: "Sparks", tagline: "Instant student chemistry", category: "Modern", domain: "sparks.campus", votes: 204 },
  { id: 20, name: "Aura", tagline: "Vibe and personality matching", category: "Modern", domain: "aura.student", votes: 275 },

  // Romance & Dating Focused
  { id: 21, name: "DormAmor", tagline: "Love in campus life", category: "Romance", domain: "dormamor.com", votes: 194 },
  { id: 22, name: "GreekMeet", tagline: "Sorority & fraternity social vibe", category: "Romance", domain: "greekmeet.app", votes: 173 },
  { id: 23, name: "CampusCupid", tagline: "Targeted campus matching", category: "Romance", domain: "campuscupid.io", votes: 228 },
  { id: 24, name: "MatchQuad", tagline: "Matching on university grounds", category: "Romance", domain: "matchquad.edu", votes: 109 },
  { id: 25, name: "UniCrush", tagline: "Secret & verified campus crushes", category: "Romance", domain: "unicrush.app", votes: 340 },
  { id: 26, name: "Stargaze Campus", tagline: "Romantic campus nights", category: "Romance", domain: "stargaze.campus", votes: 89 },
  { id: 27, name: "VelvetQuad", tagline: "Luxurious campus dating", category: "Romance", domain: "velvetquad.com", votes: 102 },
  { id: 28, name: "FirstGlance", tagline: "Instant verified attraction", category: "Romance", domain: "firstglance.edu", votes: 118 },
  { id: 29, name: "SparkDorm", tagline: "Dormitory chemistry", category: "Romance", domain: "sparkdorm.io", votes: 155 },
  { id: 30, name: "HeartCode", tagline: "Smart algorithmic campus matching", category: "Romance", domain: "heartcode.app", votes: 210 },

  // Friendships, Networking & Study
  { id: 31, name: "ClassMatey", tagline: "Study & friendship buddy", category: "Social", domain: "classmatey.com", votes: 87 },
  { id: 32, name: "UniCircle", tagline: "Your trusted university inner circle", category: "Social", domain: "unicircle.edu", votes: 178 },
  { id: 33, name: "Synergy Campus", tagline: "Collaborate, date, and network", category: "Social", domain: "synergycampus.io", votes: 133 },
  { id: 34, name: "CampusCrew", tagline: "Find your group and tribe", category: "Social", domain: "campuscrew.app", votes: 245 },
  { id: 35, name: "StudySpark", tagline: "From library sessions to romance", category: "Social", domain: "studyspark.edu", votes: 162 },
  { id: 36, name: "CoCampus", tagline: "Shared student living & experiences", category: "Social", domain: "cocampus.com", votes: 119 },
  { id: 37, name: "QuadTribe", tagline: "Authentic student community", category: "Social", domain: "quadtribe.org", votes: 104 },
  { id: 38, name: "UniGather", tagline: "Campus events & meetups", category: "Social", domain: "unigather.app", votes: 147 },
  { id: 39, name: "PeerPoint", tagline: "Verified peer-to-peer network", category: "Social", domain: "peerpoint.edu", votes: 93 },
  { id: 40, name: "CampusSphere", tagline: "360-degree student ecosystem", category: "Social", domain: "campussphere.io", votes: 181 },

  // Next-Gen & AI Ready
  { id: 41, name: "OmniCampus", tagline: "The all-in-one student social OS", category: "NextGen", domain: "omnicampus.ai", votes: 290 },
  { id: 42, name: "Synapse Student", tagline: "AI-driven compatibility engine", category: "NextGen", domain: "synapse.student", votes: 166 },
  { id: 43, name: "NexusUni", tagline: "The central connection point", category: "NextGen", domain: "nexusuni.app", votes: 141 },
  { id: 44, name: "PulseID", tagline: "Identity-first student network", category: "NextGen", domain: "pulseid.edu", votes: 202 },
  { id: 45, name: "Aether Campus", tagline: "Floating glassmorphic universe", category: "NextGen", domain: "aethercampus.io", votes: 159 },
  { id: 46, name: "Veritas Social", tagline: "Truth, trust & zero fake profiles", category: "NextGen", domain: "veritas.campus", votes: 325 },
  { id: 47, name: "Zenith Student", tagline: "Peak student social experience", category: "NextGen", domain: "zenithstudent.com", votes: 115 },
  { id: 48, name: "HyperQuad", tagline: "High-speed campus discovery", category: "NextGen", domain: "hyperquad.app", votes: 238 },
  { id: 49, name: "Velox Social", tagline: "Ultra-fast student matching", category: "NextGen", domain: "veloxsocial.io", votes: 97 },
  { id: 50, name: "CampusProxima", tagline: "Discover students nearest to you", category: "NextGen", domain: "campusproxima.com", votes: 174 },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectName: (name: string) => void;
  selectedName: string;
}

export const BrandNamesModal: React.FC<Props> = ({ isOpen, onClose, onSelectName, selectedName }) => {
  const [brands, setBrands] = useState<BrandName[]>(INITIAL_BRANDS);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [votedIds, setVotedIds] = useState<number[]>([]);

  if (!isOpen) return null;

  const handleVote = (id: number) => {
    if (votedIds.includes(id)) {
      setVotedIds(votedIds.filter((i) => i !== id));
      setBrands(brands.map((b) => (b.id === id ? { ...b, votes: b.votes - 1 } : b)));
    } else {
      setVotedIds([...votedIds, id]);
      setBrands(brands.map((b) => (b.id === id ? { ...b, votes: b.votes + 1 } : b)));
    }
  };

  const filteredBrands = brands.filter((b) => {
    const matchesCategory = activeCategory === "All" || b.category === activeCategory;
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.tagline.toLowerCase().includes(search.toLowerCase()) ||
      b.domain.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: "All", label: "All 50 Brands", icon: Sparkles },
    { id: "Academic", label: "Academic", icon: GraduationCap },
    { id: "Modern", label: "Modern Minimal", icon: Zap },
    { id: "Romance", label: "Dating & Romance", icon: Heart },
    { id: "Social", label: "Social & Study", icon: Users },
    { id: "NextGen", label: "AI & Next-Gen", icon: Flame },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0F172A] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-pink-950/40">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> 50 Strategic Brand Proposals
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Select Platform Brand Identity</h2>
            <p className="text-xs text-slate-400 mt-1">Vote, preview domain availability, and choose the active brand name.</p>
          </div>
          <button
            onClick={onClose}
            className="self-end md:self-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition"
          >
            Close Window
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-white/10 bg-slate-900/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search brand or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Brand Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBrands.map((brand) => {
            const isSelected = selectedName === brand.name;
            const hasVoted = votedIds.includes(brand.id);
            return (
              <div
                key={brand.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between relative group ${
                  isSelected
                    ? "bg-gradient-to-br from-indigo-900/50 via-slate-900 to-pink-950/40 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500"
                    : "bg-slate-900/50 hover:bg-slate-800/60 border-white/10"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{brand.category}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> {brand.domain}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                    {brand.name}
                    {isSelected && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500 text-white font-medium">Selected</span>}
                  </h3>
                  <p className="text-xs text-slate-300 italic mt-0.5">"{brand.tagline}"</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => handleVote(brand.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      hasVoted
                        ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                        : "bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5"
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${hasVoted ? "text-pink-400 fill-pink-400" : ""}`} />
                    <span>{brand.votes} votes</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectName(brand.name);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    }`}
                  >
                    {isSelected ? "Active Brand" : "Select Brand"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950 flex justify-between items-center text-xs text-slate-400">
          <span>Active Selection: <strong className="text-white font-semibold">{selectedName}</strong></span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-lg shadow-indigo-600/20"
          >
            Confirm & Save Brand Choice
          </button>
        </div>
      </div>
    </div>
  );
};
