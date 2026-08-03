import React, { useState } from "react";
import { ShieldCheck, Users, Heart, AlertTriangle, CheckCircle2, XCircle, Activity, BarChart3, Database, Lock, Eye, Filter, Plus, Building2, Globe } from "lucide-react";
import { INSTITUTIONS_DATA, Institution, COUNTRIES } from "./UniversityDatabase";

interface VerificationItem {
  id: string;
  name: string;
  campus: string;
  course: string;
  submittedAt: string;
  confidence: number;
  livePhoto: string;
  profilePhoto: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

const SAMPLE_QUEUE: VerificationItem[] = [
  {
    id: "v1",
    name: "Marcus Vance",
    campus: "Harvard University",
    course: "Economics & Finance",
    submittedAt: "10 mins ago",
    confidence: 98.6,
    livePhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    profilePhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    status: "PENDING",
  },
  {
    id: "v2",
    name: "Elena Rostova",
    campus: "MIT",
    course: "Bioengineering",
    submittedAt: "24 mins ago",
    confidence: 99.2,
    livePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    profilePhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    status: "PENDING",
  },
];

export const ExecutiveAdminConsole: React.FC = () => {
  const [queue, setQueue] = useState<VerificationItem[]>(SAMPLE_QUEUE);
  const [institutions, setInstitutions] = useState<Institution[]>(INSTITUTIONS_DATA);
  const [activeTab, setActiveTab] = useState<"overview" | "verification" | "institutions">("overview");

  // New Institution Modal Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newShortName, setNewShortName] = useState("");
  const [newCountry, setNewCountry] = useState("Kenya");
  const [newCounty, setNewCounty] = useState("Nairobi");
  const [newType, setNewType] = useState<"University" | "College" | "Polytechnic">("University");
  const [newDomain, setNewDomain] = useState("");

  const handleApprove = (id: string) => {
    setQueue(queue.map((item) => (item.id === id ? { ...item, status: "APPROVED" } : item)));
  };

  const handleReject = (id: string) => {
    setQueue(queue.map((item) => (item.id === id ? { ...item, status: "REJECTED" } : item)));
  };

  const handleAddInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDomain.trim()) return;
    const created: Institution = {
      id: `inst-${Date.now()}`,
      name: newName,
      shortName: newShortName || newName.substring(0, 4).toUpperCase(),
      country: newCountry,
      stateCounty: newCounty,
      type: newType as any,
      domains: [newDomain.trim()],
      logoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80",
      location: `${newCounty}, ${newCountry}`,
      verifiedStudentsCount: 1,
      activeUsersCount: 1,
      clubsCount: 5,
      establishedYear: 2024,
      popularMajors: ["General Studies"],
    };

    setInstitutions([...institutions, created]);
    INSTITUTIONS_DATA.push(created);
    setNewName("");
    setNewDomain("");
    setShowAddModal(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Admin Header */}
      <div className="p-6 bg-slate-900 border border-white/15 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Lock className="w-3.5 h-3.5 text-purple-400" /> Executive Admin Console
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Multi-University System Oversight</h2>
          <p className="text-xs text-slate-400 mt-1">Manage global institutions, domain verification regex patterns, and facial liveness queues.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "overview" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveTab("institutions")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "institutions" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Institutions ({institutions.length})
          </button>
          <button
            onClick={() => setActiveTab("verification")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "verification" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Verification Queue ({queue.filter((q) => q.status === "PENDING").length})
          </button>
        </div>
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Institutions</span>
                <Building2 className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">{institutions.length}</p>
              <span className="text-[11px] text-indigo-400 font-semibold">Across {COUNTRIES.length} Countries</span>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Verified Students</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">124,540</p>
              <span className="text-[11px] text-emerald-400 font-semibold">+18.4% this month</span>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Cross-Campus Matches</span>
                <Heart className="w-4 h-4 text-pink-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">342,190</p>
              <span className="text-[11px] text-pink-400 font-semibold">100% Verified Humans</span>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">AI Liveness Pass Rate</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">99.6%</p>
              <span className="text-[11px] text-emerald-400 font-semibold">0 Catfish Profiles</span>
            </div>
          </div>
        </div>
      )}

      {/* Institutions Studio */}
      {activeTab === "institutions" && (
        <div className="p-6 bg-slate-900 border border-white/15 rounded-3xl backdrop-blur-2xl shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Registered Institutions & Domain Rules</h3>
              <p className="text-xs text-slate-400">Dynamically add new accredited universities, colleges, and polytechnics without code changes.</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Institution
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {institutions.map((inst) => (
              <div key={inst.id} className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src={inst.logoUrl} alt={inst.shortName} className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white">{inst.name} ({inst.shortName})</h4>
                    <p className="text-xs text-indigo-300">{inst.location} • {inst.type}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Domain: {inst.domains.join(", ")}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                  {inst.verifiedStudentsCount.toLocaleString()} Students
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Queue */}
      {activeTab === "verification" && (
        <div className="p-6 bg-slate-900 border border-white/15 rounded-3xl backdrop-blur-2xl shadow-xl space-y-6">
          <h3 className="text-lg font-bold text-white">Pending Biometric Verification Submissions</h3>

          <div className="space-y-4">
            {queue.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-950 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <img src={item.livePhoto} alt="Live" className="w-16 h-16 rounded-2xl object-cover border border-emerald-500/40" />
                      <span className="text-[9px] text-emerald-400 font-mono block mt-1">Live Capture</span>
                    </div>
                    <span className="text-xs text-slate-500 font-bold">vs</span>
                    <div className="text-center">
                      <img src={item.profilePhoto} alt="Profile" className="w-16 h-16 rounded-2xl object-cover border border-indigo-500/40" />
                      <span className="text-[9px] text-indigo-400 font-mono block mt-1">Profile Photo</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                    <p className="text-xs text-indigo-300">{item.campus} • {item.course}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Submitted: {item.submittedAt} | Match Confidence: <strong className="text-emerald-400">{item.confidence}%</strong>
                    </p>
                  </div>
                </div>

                {item.status === "PENDING" ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(item.id)}
                      className="px-4 py-2 rounded-xl bg-red-600/20 text-red-300 border border-red-500/40 text-xs font-bold"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg"
                    >
                      Approve Badge
                    </button>
                  </div>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300">
                    {item.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Institution Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" /> Add New Institution
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 text-xs">Close</button>
            </div>

            <form onSubmit={handleAddInstitution} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Institution Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Maseno University"
                  className="w-full p-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Abbreviation</label>
                  <input
                    type="text"
                    value={newShortName}
                    onChange={(e) => setNewShortName(e.target.value)}
                    placeholder="e.g. MASENO"
                    className="w-full p-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Type</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
                  >
                    <option value="University">University</option>
                    <option value="College">College</option>
                    <option value="Polytechnic">Polytechnic</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Country</label>
                  <select
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">County / State</label>
                  <input
                    type="text"
                    value={newCounty}
                    onChange={(e) => setNewCounty(e.target.value)}
                    placeholder="e.g. Kisumu"
                    className="w-full p-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Student Email Domain Pattern</label>
                <input
                  type="text"
                  required
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="e.g. maseno.ac.ke"
                  className="w-full p-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
              >
                Register Institution into Database
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
