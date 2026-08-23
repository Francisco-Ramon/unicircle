import { Institution, INSTITUTIONS_DATA } from "@/components/campus-connect/UniversityDatabase";

// Extended worldwide fallback database for instant offline/speed search
export const EXTENDED_GLOBAL_INSTITUTIONS: Institution[] = [
  ...INSTITUTIONS_DATA,
  // USA 🇺🇸
  {
    id: "nyu",
    name: "New York University",
    shortName: "NYU",
    country: "United States",
    city: "New York",
    stateCounty: "New York",
    type: "University",
    domains: ["nyu.edu"],
    logoUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&auto=format&fit=crop&q=80",
    location: "New York City, NY, USA",
    verifiedStudentsCount: 29400,
    activeUsersCount: 18200,
    clubsCount: 120,
    establishedYear: 1831,
    popularMajors: ["Film & Television", "Business", "Economics", "Computer Science"],
  },
  {
    id: "harvard",
    name: "Harvard University",
    shortName: "Harvard",
    country: "United States",
    city: "Cambridge",
    stateCounty: "Massachusetts",
    type: "University",
    domains: ["harvard.edu"],
    logoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&auto=format&fit=crop&q=80",
    location: "Cambridge, Massachusetts, USA",
    verifiedStudentsCount: 23000,
    activeUsersCount: 14500,
    clubsCount: 140,
    establishedYear: 1636,
    popularMajors: ["Economics", "Government", "Computer Science", "Biology"],
  },
  {
    id: "mit",
    name: "Massachusetts Institute of Technology",
    shortName: "MIT",
    country: "United States",
    city: "Cambridge",
    stateCounty: "Massachusetts",
    type: "University",
    domains: ["mit.edu"],
    logoUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80",
    location: "Cambridge, Massachusetts, USA",
    verifiedStudentsCount: 11800,
    activeUsersCount: 8900,
    clubsCount: 95,
    establishedYear: 1861,
    popularMajors: ["Computer Science & AI", "Mechanical Engineering", "Physics", "Mathematics"],
  },

  // CANADA 🇨🇦
  {
    id: "utoronto",
    name: "University of Toronto",
    shortName: "UofT",
    country: "Canada",
    city: "Toronto",
    stateCounty: "Ontario",
    type: "University",
    domains: ["utoronto.ca"],
    logoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80",
    location: "Toronto, Ontario, Canada",
    verifiedStudentsCount: 31200,
    activeUsersCount: 19800,
    clubsCount: 105,
    establishedYear: 1827,
    popularMajors: ["Computer Science", "Engineering", "Medicine", "Commerce"],
  },
  {
    id: "ubc",
    name: "University of British Columbia",
    shortName: "UBC",
    country: "Canada",
    city: "Vancouver",
    stateCounty: "British Columbia",
    type: "University",
    domains: ["ubc.ca"],
    logoUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80",
    location: "Vancouver, BC, Canada",
    verifiedStudentsCount: 26800,
    activeUsersCount: 16400,
    clubsCount: 90,
    establishedYear: 1908,
    popularMajors: ["Environmental Science", "Business", "Psychology", "Computer Science"],
  },

  // UNITED KINGDOM 🇬🇧
  {
    id: "cambridge",
    name: "University of Cambridge",
    shortName: "Cambridge",
    country: "United Kingdom",
    city: "Cambridge",
    stateCounty: "Cambridgeshire",
    type: "University",
    domains: ["cam.ac.uk"],
    logoUrl: "https://images.unsplash.com/photo-1548625361-18658097f480?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80",
    location: "Cambridge, United Kingdom",
    verifiedStudentsCount: 23400,
    activeUsersCount: 15200,
    clubsCount: 115,
    establishedYear: 1209,
    popularMajors: ["Natural Sciences", "Engineering", "Mathematics", "Law"],
  },
  {
    id: "imperial",
    name: "Imperial College London",
    shortName: "Imperial",
    country: "United Kingdom",
    city: "London",
    stateCounty: "Greater London",
    type: "University",
    domains: ["imperial.ac.uk"],
    logoUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80",
    location: "London, United Kingdom",
    verifiedStudentsCount: 19800,
    activeUsersCount: 13200,
    clubsCount: 80,
    establishedYear: 1907,
    popularMajors: ["Aeronautical Engineering", "Computing", "Medicine", "Physics"],
  },

  // AUSTRALIA 🇦🇺
  {
    id: "unimelb",
    name: "University of Melbourne",
    shortName: "UniMelb",
    country: "Australia",
    city: "Melbourne",
    stateCounty: "Victoria",
    type: "University",
    domains: ["unimelb.edu.au"],
    logoUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80",
    location: "Melbourne, Victoria, Australia",
    verifiedStudentsCount: 28400,
    activeUsersCount: 17800,
    clubsCount: 95,
    establishedYear: 1853,
    popularMajors: ["Biomedicine", "Commerce", "Arts", "Engineering"],
  },

  // SOUTH AFRICA 🇿🇦
  {
    id: "uct",
    name: "University of Cape Town",
    shortName: "UCT",
    country: "South Africa",
    city: "Cape Town",
    stateCounty: "Western Cape",
    type: "University",
    domains: ["uct.ac.za"],
    logoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80",
    location: "Cape Town, South Africa",
    verifiedStudentsCount: 21500,
    activeUsersCount: 14200,
    clubsCount: 75,
    establishedYear: 1829,
    popularMajors: ["Medicine", "Law", "Commerce", "Marine Biology"],
  },

  // NIGERIA 🇳🇬
  {
    id: "unilag",
    name: "University of Lagos",
    shortName: "UNILAG",
    country: "Nigeria",
    city: "Lagos",
    stateCounty: "Lagos State",
    type: "University",
    domains: ["unilag.edu.ng"],
    logoUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80",
    location: "Akoka, Lagos, Nigeria",
    verifiedStudentsCount: 25000,
    activeUsersCount: 16800,
    clubsCount: 60,
    establishedYear: 1962,
    popularMajors: ["Mass Communication", "Medicine", "Law", "Computer Science"],
  },

  // GHANA 🇬🇭
  {
    id: "ug_legon",
    name: "University of Ghana",
    shortName: "UG Legon",
    country: "Ghana",
    city: "Accra",
    stateCounty: "Greater Accra",
    type: "University",
    domains: ["ug.edu.gh"],
    logoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80",
    location: "Legon, Accra, Ghana",
    verifiedStudentsCount: 19400,
    activeUsersCount: 12100,
    clubsCount: 52,
    establishedYear: 1948,
    popularMajors: ["Political Science", "Medicine", "Business Administration", "Economics"],
  },
];

// Country flag mapping helper
export function getCountryFlag(countryName: string): string {
  const c = countryName.toLowerCase();
  if (c.includes("kenya")) return "🇰🇪";
  if (c.includes("united states") || c.includes("usa") || c.includes("us")) return "🇺🇸";
  if (c.includes("united kingdom") || c.includes("uk") || c.includes("britain")) return "🇬🇧";
  if (c.includes("canada")) return "🇨🇦";
  if (c.includes("australia")) return "🇦🇺";
  if (c.includes("south africa")) return "🇿🇦";
  if (c.includes("nigeria")) return "🇳🇬";
  if (c.includes("ghana")) return "🇬🇭";
  if (c.includes("uganda")) return "🇺🇬";
  if (c.includes("tanzania")) return "🇹🇿";
  if (c.includes("rwanda")) return "🇷🇼";
  if (c.includes("ethiopia")) return "🇪🇹";
  if (c.includes("burundi")) return "🇧🇮";
  if (c.includes("india")) return "🇮🇳";
  if (c.includes("china")) return "🇨🇳";
  if (c.includes("japan")) return "🇯🇵";
  if (c.includes("germany")) return "🇩🇪";
  if (c.includes("france")) return "🇫🇷";
  if (c.includes("brazil")) return "🇧🇷";
  if (c.includes("mexico")) return "🇲🇽";
  return "🌐";
}

// In-memory cache for user-created custom institutions
const CUSTOM_INSTITUTIONS_KEY = "unicircle_custom_institutions";

export function getCustomInstitutions(): Institution[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CUSTOM_INSTITUTIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn("Failed to parse custom institutions", e);
  }
  return [];
}

export function saveCustomInstitution(inst: Institution) {
  if (typeof window === "undefined") return;
  try {
    const existing = getCustomInstitutions();
    const updated = [inst, ...existing.filter((i) => i.id !== inst.id)];
    localStorage.setItem(CUSTOM_INSTITUTIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save custom institution", e);
  }
}

/**
 * Searches the worldwide Hipolabs API + local database without any country restriction.
 */
export async function searchGlobalUniversities(query: string): Promise<Institution[]> {
  const q = query.trim().toLowerCase();
  const customList = getCustomInstitutions();
  const allLocal = [...customList, ...EXTENDED_GLOBAL_INSTITUTIONS];

  if (!q) {
    return allLocal;
  }

  // First check local matches immediately for fast response
  const localMatches = allLocal.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      i.shortName.toLowerCase().includes(q) ||
      i.country.toLowerCase().includes(q) ||
      i.city.toLowerCase().includes(q)
  );

  // Query Hipolabs & GitHub Open-Source Global Universities API concurrently
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const [nameRes, countryRes] = await Promise.allSettled([
      fetch(`https://universities.hipolabs.com/search?name=${encodeURIComponent(query)}`, { signal: controller.signal }),
      fetch(`https://universities.hipolabs.com/search?country=${encodeURIComponent(query)}`, { signal: controller.signal }),
    ]);
    clearTimeout(timeoutId);

    let rawResults: any[] = [];

    if (nameRes.status === "fulfilled" && nameRes.value.ok) {
      const data = await nameRes.value.json();
      if (Array.isArray(data)) rawResults.push(...data);
    }

    if (countryRes.status === "fulfilled" && countryRes.value.ok) {
      const data = await countryRes.value.json();
      if (Array.isArray(data)) rawResults.push(...data);
    }

    if (rawResults.length > 0) {
      const apiMapped: Institution[] = rawResults.slice(0, 30).map((item: any, idx: number) => {
        const countryName = item.country || "Global";
        const uniName = item.name || "University";
        const domain = item.domains?.[0] || "";

        const existing = localMatches.find((l) => l.name.toLowerCase() === uniName.toLowerCase());
        if (existing) return existing;

        return {
          id: `hipo-${idx}-${domain.replace(/[^a-z0-9]/gi, "") || Date.now()}`,
          name: uniName,
          shortName: uniName.split(" ").map((w: string) => w[0]).join("").substring(0, 6) || "UNI",
          country: countryName,
          city: countryName,
          stateCounty: countryName,
          type: "University",
          domains: item.domains || [domain],
          logoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&auto=format&fit=crop&q=80",
          bannerUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80",
          location: `${countryName}`,
          verifiedStudentsCount: 1200,
          activeUsersCount: 750,
          clubsCount: 25,
          establishedYear: 1900,
          popularMajors: ["General Studies", "Science & Technology", "Arts & Humanities"],
        };
      });

      const merged: Institution[] = [...localMatches];
      apiMapped.forEach((apiInst) => {
        if (!merged.some((m) => m.name.toLowerCase() === apiInst.name.toLowerCase())) {
          merged.push(apiInst);
        }
      });
      return merged;
    }
  } catch (err) {
    console.warn("Global universities online API search fallback:", err);
  }

  return localMatches;
}
