import React, { useState, useEffect } from "react";
import { Search, Globe, X, PlusCircle, Check, Building2, ShieldCheck, Clock, MapPin, Sparkles, Loader2 } from "lucide-react";
import { Institution } from "./UniversityDatabase";
import { searchGlobalUniversities, getCountryFlag, saveCustomInstitution } from "@/lib/globalUniversityService";

interface Props {
  onSelectInstitution: (institution: Institution) => void;
  onClose?: () => void;
  title?: string;
  currentUniversityName?: string;
}

export const GlobalUniversitySearch: React.FC<Props> = ({
  onSelectInstitution,
  onClose,
  title = "Change University",
  currentUniversityName,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Institution[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Custom university submission state
  const [customName, setCustomName] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  const [customCity, setCustomCity] = useState("");

  // Live search effect with 300ms debounce
  useEffect(() => {
    let isMounted = true;
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchGlobalUniversities(trimmed);
      if (isMounted) {
        setResults(res);
        setIsSearching(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleCreateCustomInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customCountry.trim()) return;

    const newInst: Institution = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      shortName: customName.trim().substring(0, 6).toUpperCase(),
      country: customCountry.trim(),
      city: customCity.trim() || customCountry.trim(),
      stateCounty: customCountry.trim(),
      type: "University",
      domains: [`${customName.toLowerCase().replace(/[^a-z0-9]/g, "")}.edu`],
      logoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80",
      location: `${customCity.trim() ? `${customCity.trim()}, ` : ""}${customCountry.trim()}`,
      verifiedStudentsCount: 1,
      activeUsersCount: 1,
      clubsCount: 0,
      establishedYear: new Date().getFullYear(),
      popularMajors: ["General Studies"],
    };

    saveCustomInstitution(newInst);
    onSelectInstitution(newInst);
    if (onClose) onClose();
  };

  const isQueryEmpty = !query.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-1">
              <Globe className="w-3 h-3 text-indigo-400" /> Global Live Search
            </div>
            <h2 className="text-lg font-black text-white">{title}</h2>
            {currentUniversityName && (
              <p className="text-xs text-slate-400 mt-0.5">
                Current: <span className="text-indigo-300 font-semibold">{currentUniversityName}</span>
              </p>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Input Box */}
        <div className="p-4 bg-slate-950 border-b border-white/10 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 z-10" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Search your university worldwide..."
              autoFocus
              className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-3 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {showAddCustom ? (
            /* Custom Add Institution Form */
            <form onSubmit={handleCreateCustomInstitution} className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-indigo-400" /> Add Custom Institution
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">University / College Name *</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Mount Kenya University"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Country *</label>
                  <input
                    type="text"
                    required
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value)}
                    placeholder="e.g. Kenya"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="e.g. Thika"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Submitted institutions are added immediately with <strong>pending verification</strong> badge.</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Submit & Select Institution
              </button>
            </form>
          ) : isQueryEmpty ? (
            /* 1. INITIAL EMPTY SEARCH STATE (No static list!) */
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Search your university</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  Start typing the name of your university above to search 22,000+ institutions worldwide.
                </p>
              </div>

              {/* Quick suggestion chips */}
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Try searching:</p>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
                  {["Mount Kenya", "Strathmore", "New York", "Oxford", "Harvard", "Toronto", "Karatina"].map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-white text-xs font-semibold transition"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : isSearching ? (
            /* 2. LOADING STATE */
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs font-medium text-slate-300">Searching universities worldwide for "{query}"...</p>
            </div>
          ) : results.length === 0 ? (
            /* 3. NO RESULTS STATE */
            <div className="p-8 text-center space-y-3">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-white">No university found for "{query}"</h4>
                <p className="text-xs text-slate-400 mt-1">Can't find your university in the worldwide database?</p>
              </div>
              <button
                onClick={() => {
                  setCustomName(query);
                  setShowAddCustom(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Add Your University Manually
              </button>
            </div>
          ) : (
            /* 4. RESULTS LIST */
            <div className="space-y-2">
              <div className="px-1 pb-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>{results.length} universities found</span>
                <span>Tap to select</span>
              </div>

              {results.map((inst) => {
                const flag = getCountryFlag(inst.country);
                const isSelected = currentUniversityName && (
                  currentUniversityName.toLowerCase() === inst.name.toLowerCase() ||
                  currentUniversityName.toLowerCase() === inst.shortName.toLowerCase()
                );

                return (
                  <div
                    key={inst.id}
                    onClick={() => {
                      onSelectInstitution(inst);
                      if (onClose) onClose();
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer group ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500 shadow-md"
                        : "bg-slate-950/60 border-white/5 hover:border-indigo-500/40 hover:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-lg shrink-0 shadow-inner">
                        {flag}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate flex items-center gap-1.5">
                          {inst.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {flag} {inst.country} {inst.city && inst.city !== inst.country ? `• ${inst.city}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected ? (
                        <button
                          type="button"
                          disabled
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 text-xs font-bold flex items-center gap-1 cursor-default opacity-80"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Current University
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInstitution(inst);
                            if (onClose) onClose();
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30 flex items-center gap-1 cursor-pointer"
                        >
                          Select ↗
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Custom Add Button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="w-full py-3 rounded-2xl bg-slate-950/40 border border-dashed border-white/15 hover:border-indigo-500/40 text-slate-400 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  <span>Can't find your university? Add it manually</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
