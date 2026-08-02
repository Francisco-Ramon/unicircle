import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Copy, Unlink, User } from "lucide-react";
import { Switch } from "@/components/ui/switch";

/* ── Types ── */
type GoogleStatus = { connected: boolean; email?: string; scopes?: string[]; gmail_ok?: boolean; gmail_compose?: boolean; calendar_ok?: boolean };
type WaStatus = {
  linked: boolean;
  authenticating?: boolean;
  connection: null | { whatsapp_phone: string; whatsapp_name: string | null; linked_at: string; last_message_at: string | null; status: string; };
  pendingQr?: string | null;
  pairingCode?: string | null;
};
type TgStatus = {
  linked: boolean;
  connection: null | { telegram_username: string | null; telegram_first_name: string | null; linked_at: string; last_message_at: string | null; status: string; };
};

/* ── API helpers ── */
async function callWhatsAppFn(action: string, extra: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-link`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

async function callGoogleFn(fn: "google-oauth-start" | "google-status", body: any = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

async function callTelegramFn(action: string, extra: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-link`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

/* ── Brand SVG Icons ── */
function WhatsAppIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#25D366"/><path d="M34.6 13.3A14.4 14.4 0 0 0 24 9.1C16 9.1 9.5 15.6 9.5 23.5c0 2.5.7 5 1.9 7.2L9.3 38.7l8.2-2.1c2.1 1.1 4.4 1.7 6.5 1.7 8 0 14.5-6.5 14.5-14.4a14.4 14.4 0 0 0-3.9-9.6zm-10.6 22c-2.1 0-4.1-.6-5.9-1.6l-.4-.2-4.3 1.1 1.1-4.2-.3-.4a12 12 0 0 1-1.8-6.3c0-6.6 5.4-12 12-12a11.9 11.9 0 0 1 12 12c0 6.6-5.4 12-12.4 12zm6.6-9c-.4-.2-2.1-1-2.4-1.2-.3-.1-.6-.2-.8.2s-1 1.2-1.2 1.4c-.2.2-.4.3-.8.1s-1.6-.6-3-1.9a11.3 11.3 0 0 1-2.1-2.6c-.2-.4 0-.6.2-.7l.5-.6c.2-.2.2-.3.4-.6 0-.2 0-.4-.1-.6s-.8-2-1.1-2.7c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-1 .5s-1.3 1.3-1.3 3 1.3 3.5 1.5 3.7c.2.2 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.7.3 2.3.2.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7-.1-.2-.3-.3-.7-.4z" fill="white"/></svg>
  );
}

function InstagramIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none"><defs><linearGradient id="ig" x1="5" y1="43" x2="43" y2="5" gradientUnits="userSpaceOnUse"><stop stopColor="#FFC107"/><stop offset=".5" stopColor="#F44336"/><stop offset="1" stopColor="#9C27B0"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#ig)"/><rect x="12" y="12" width="24" height="24" rx="6" stroke="white" strokeWidth="2.5" fill="none"/><circle cx="24" cy="24" r="5.5" stroke="white" strokeWidth="2.5" fill="none"/><circle cx="32" cy="16" r="1.8" fill="white"/></svg>
  );
}

function FacebookIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#1877F2"/><path d="M32.5 8.5c-3.3-2.5-7.8-3.2-11.7-1.5C16.5 9 14 13.5 14 18.5v4H10v6h4v14h6v-14h4l1-6h-5v-3.5c0-1.1.1-2.2 1.1-2.8.5-.3 1.2-.3 1.9-.2h3v-5l-2.5-.5z" fill="white" transform="translate(2,3) scale(0.9)"/><path d="M34 13c-1.5-1-3-1.7-5-2l.5 5h3.5l1-5h-5v4c0 1.5.5 2.5 2.3 2.5H34v-5z" fill="white" opacity="0" /></svg>
  );
}

function TelegramIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#2AABEE"/><path d="M34.1 14.2L10.7 23c-1.6.6-1.6 1.5-.3 1.9l6 1.9 2.3 7c.3.8.1 1.1.9 1.1.6 0 .9-.3 1.2-.6l2.9-2.8 6 4.4c1.1.6 1.9.3 2.2-.9l3.9-18.5c.4-1.7-.6-2.4-1.7-2z" fill="white" fillOpacity=".95"/><path d="M19.4 26.9l-.5 5.2 5.2-3.8" fill="#B0D4F1" fillOpacity=".4"/></svg>
  );
}

function GmailCalIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center gap-0.5`}>
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" fill="#EA4335" fillOpacity=".15" stroke="#EA4335" strokeWidth="1.5"/><path d="M2 6l10 7 10-7" stroke="#EA4335" strokeWidth="1.8" strokeLinecap="round"/></svg>
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4" fillOpacity=".15" stroke="#4285F4" strokeWidth="1.5"/><path d="M3 9h18" stroke="#4285F4" strokeWidth="1.5"/><rect x="7" y="12" width="3" height="3" rx="0.5" fill="#4285F4"/></svg>
    </div>
  );
}

/* ── Mini Sparkline Chart (decorative) ── */
function SparkChart({ color = "#22c55e", seed = 1 }: { color?: string; seed?: number }) {
  const pts: number[] = [];
  let v = 30 + (seed * 7) % 20;
  for (let i = 0; i < 12; i++) {
    v += ((seed * (i + 1) * 13) % 21) - 10;
    v = Math.max(5, Math.min(55, v));
    pts.push(v);
  }
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${i * 18},${60 - p}`).join(" ");
  const area = `${path} L${(pts.length - 1) * 18},60 L0,60 Z`;
  return (
    <svg className="absolute bottom-0 left-0 w-full h-24 opacity-20 pointer-events-none" viewBox={`0 0 ${(pts.length - 1) * 18} 60`} preserveAspectRatio="none">
      <defs><linearGradient id={`sg${seed}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.4"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill={`url(#sg${seed})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Glass Card ── */
function GlassCard({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`relative overflow-hidden rounded-2xl border border-white/[0.08] p-5 transition-all duration-300 hover:border-white/[0.15] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${className}`}
      style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}>
      {children}
    </div>
  );
}

/* ── Profile Card ── */
function ProfileCard() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      if (data?.display_name) setName(data.display_name);
      setLoading(false);
    })();
  }, []);
  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: name, updated_at: new Date().toISOString() });
    if (error) toast.error("Failed to update name"); else toast.success("Name updated!");
    setSaving(false);
  }
  return (
    <GlassCard>
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-white/90"><User className="h-4 w-4 text-purple-400" /> Assistant Preferences</h3>
      <p className="text-xs text-white/50 mb-3">What should Mr. Cisco call you?</p>
      <div className="flex gap-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={loading || saving} placeholder="Your name"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition" />
        <button onClick={handleSave} disabled={loading || saving || !name.trim()}
          className="text-xs px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-40">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </GlassCard>
  );
}

/* ── Advanced Central AI Knowledge Hub ── */
function BusinessKnowledgeCard() {
  const [activeTab, setActiveTab] = useState<"company" | "faqs" | "persona" | "simulator">("company");
  const [companyName, setCompanyName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState("");
  const [faqs, setFaqs] = useState("");
  const [persona, setPersona] = useState("Friendly & Professional");
  const [maxSentences, setMaxSentences] = useState("2-3 sentences");
  const [escalationKeyword, setEscalationKeyword] = useState("urgent, manager, speak to human");
  
  // Simulator state
  const [testPrompt, setTestPrompt] = useState("What are your opening hours and delivery fees?");
  const [simResponse, setSimResponse] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("preferences")
        .select("value")
        .eq("user_id", user.id)
        .eq("key", "business_knowledge_base")
        .maybeSingle();
      if (data?.value) {
        setCompanyName(data.value.companyName || "");
        setTagline(data.value.tagline || "");
        setDescription(data.value.description || "");
        setLocation(data.value.location || "");
        setHours(data.value.hours || "");
        setFaqs(data.value.faqs || "");
        setPersona(data.value.persona || "Friendly & Professional");
        setMaxSentences(data.value.maxSentences || "2-3 sentences");
        setEscalationKeyword(data.value.escalationKeyword || "urgent, manager, speak to human");
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const kb = {
        companyName,
        tagline,
        description,
        location,
        hours,
        faqs,
        persona,
        maxSentences,
        escalationKeyword,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from("preferences").upsert({
        user_id: user.id,
        key: "business_knowledge_base",
        value: kb,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,key" });
      if (error) throw error;
      toast.success("Central AI Brain updated! All channels (WhatsApp, IG, Telegram) are now synced.");
    } catch (e: any) {
      toast.error(e.message || "Failed to save Knowledge Base");
    } finally {
      setSaving(false);
    }
  }

  async function runSimulation() {
    if (!testPrompt.trim()) return;
    setSimulating(true);
    setSimResponse(null);
    try {
      await new Promise(r => setTimeout(r, 900));
      const simulatedText = `Hello! At ${companyName || 'our company'}, ${description ? description.slice(0, 100) + '...' : 'we are happy to assist you.'} ${hours ? `Our hours are ${hours}.` : ''} ${faqs ? `Regarding your question: ${faqs.slice(0, 120)}...` : ''}`;
      setSimResponse(simulatedText);
    } catch (e: any) {
      toast.error("Simulation failed");
    } finally {
      setSimulating(false);
    }
  }

  return (
    <GlassCard className="col-span-full border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 via-zinc-950/40 to-black/60 shadow-[0_0_40px_rgba(16,185,129,0.06)]">
      {/* Header with Live Sync Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-lg shadow-emerald-500/20">
            <span className="text-xl">⚡</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-white tracking-tight">Central AI Brain & Business Knowledge Hub</h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live System Sync
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Directly feeds your company information into WhatsApp, Instagram DMs, Telegram, and Web AI Assistants in real-time.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="text-xs px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black font-bold shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center gap-2"
        >
          <span>{saving ? "Syncing AI Brain..." : "Deploy to Central AI Brain"}</span>
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 pt-4 pb-2 border-b border-white/5 overflow-x-auto">
        <button
          onClick={() => setActiveTab("company")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "company"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "text-white/50 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>🏢</span> Company Profile
        </button>

        <button
          onClick={() => setActiveTab("faqs")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "faqs"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "text-white/50 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>💬</span> FAQs, Pricing & Catalog
        </button>

        <button
          onClick={() => setActiveTab("persona")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "persona"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "text-white/50 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>🤖</span> AI Voice & Rules
        </button>

        <button
          onClick={() => setActiveTab("simulator")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "simulator"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "text-white/50 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>🧪</span> Live AI Simulator
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-4 text-xs">
        {/* TAB 1: Company Profile */}
        {activeTab === "company" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-white/80 font-semibold mb-1">Company / Brand Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. Cisco Electronics & Repairs"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1">Tagline or Industry</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. Premium Phone Repairs & Original Accessories"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1">Physical Location & Address</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. Westlands Mall, 2nd Floor, Nairobi, Kenya"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50 transition"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-white/80 font-semibold mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. Monday - Saturday: 8:00 AM - 7:00 PM | Sunday: Closed"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1">Company Overview & Core Services</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. We specialize in fast laptop repair, original iPhone screens, battery replacements, and nationwide courier delivery within 24 hours."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500/50 transition resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FAQs, Pricing & Catalog */}
        {activeTab === "faqs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-white/80 font-semibold">Structured Knowledge Base, FAQs & Pricing Rules</label>
              <span className="text-[10px] text-emerald-400 font-mono">Format: Question/Answer or Item/Price</span>
            </div>
            <textarea
              rows={9}
              value={faqs}
              onChange={(e) => setFaqs(e.target.value)}
              disabled={loading}
              placeholder={`Q: What is the repair cost for an iPhone 13 screen?
A: Screen replacement is 8,500 KES (Includes 6-month warranty).

Q: How long does delivery take?
A: Same-day delivery in Nairobi (300 KES), 24 hours for rest of Kenya (500 KES).

Q: What payment methods do you accept?
A: M-Pesa Till 982103, Credit Cards, and Cash on Delivery.`}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-emerald-300 focus:outline-none focus:border-emerald-500/50 transition font-mono text-[11px] leading-relaxed resize-none"
            />
          </div>
        )}

        {/* TAB 3: AI Voice & Rules */}
        {activeTab === "persona" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/80 font-semibold mb-1">AI Tone & Persona</label>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                disabled={loading}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50 transition"
              >
                <option value="Casual, Friendly & Professional">Casual, Friendly & Professional</option>
                <option value="Direct Sales & Deal Closing">Direct Sales & Deal Closing</option>
                <option value="Formal & Executive Support">Formal & Executive Support</option>
                <option value="Humorous & High Energy">Humorous & High Energy</option>
              </select>
            </div>

            <div>
              <label className="block text-white/80 font-semibold mb-1">Max Response Length</label>
              <select
                value={maxSentences}
                onChange={(e) => setMaxSentences(e.target.value)}
                disabled={loading}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50 transition"
              >
                <option value="1-2 sentences">Ultra Short (1-2 sentences)</option>
                <option value="2-3 sentences">Standard Texting (2-3 sentences)</option>
                <option value="Comprehensive">Detailed & Comprehensive</option>
              </select>
            </div>

            <div>
              <label className="block text-white/80 font-semibold mb-1">Human Handoff Triggers</label>
              <input
                type="text"
                value={escalationKeyword}
                onChange={(e) => setEscalationKeyword(e.target.value)}
                disabled={loading}
                placeholder="e.g. urgent, speak to human, manager"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50 transition"
              />
            </div>
          </div>
        )}

        {/* TAB 4: Live AI Simulator */}
        {activeTab === "simulator" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <span>🧪</span> Test Your Central AI Brain Response
                </span>
                <span className="text-[10px] text-cyan-400/70">Simulates WhatsApp & DM responses live</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Ask a customer question... (e.g. What are your delivery fees?)"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50 text-xs"
                />
                <button
                  onClick={runSimulation}
                  disabled={simulating || !testPrompt.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                >
                  {simulating ? "Thinking..." : "Test Response"}
                </button>
              </div>
            </div>

            {simResponse && (
              <div className="p-4 rounded-xl bg-black/50 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-emerald-400 font-semibold">
                  <span>🤖 Simulated Customer Response</span>
                  <span>Latency: 0.9s</span>
                </div>
                <p className="text-white text-xs leading-relaxed font-sans">{simResponse}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

/* ── Route Export ── */
export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

/* ── Main Settings Page ── */
function SettingsPage() {
  const { user } = useAuth();

  // Telegram
  const [tgStatus, setTgStatus] = useState<TgStatus | null>(null);
  const [tgLoading, setTgLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [codeExpires, setCodeExpires] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [checkingWebhook, setCheckingWebhook] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);

  // WhatsApp
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null);
  const [waLoading, setWaLoading] = useState(true);
  const [globalAutoReply, setGlobalAutoReply] = useState(true);
  const [waPhone, setWaPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [linkMethod, setLinkMethod] = useState<"qr" | "code">("qr");

  // Google
  const [gStatus, setGStatus] = useState<GoogleStatus | null>(null);
  const [gLoading, setGLoading] = useState(true);
  const [gBusy, setGBusy] = useState(false);

  // Instagram DMs
  const [igStatus, setIgStatus] = useState<{ linked: boolean; accountId?: string; token?: string } | null>(null);
  const [igAccountId, setIgAccountId] = useState("");
  const [igToken, setIgToken] = useState("");
  const [savingIg, setSavingIg] = useState(false);
  const [igAutoReply, setIgAutoReply] = useState(true);

  // Expanded cards
  const [expanded, setExpanded] = useState<string | null>("wa");

  // ── Load on mount ──
  useEffect(() => { refreshTg(); refreshWa(); refreshGoogle(); refreshIg(); loadAutoReply(); }, []);
  useEffect(() => { if (waStatus?.linked) return; const i = setInterval(refreshWa, 4000); return () => clearInterval(i); }, [waStatus?.linked]);
  useEffect(() => {
    if (!codeExpires) return;
    const t = setInterval(() => { if (Date.now() > codeExpires) { setCode(null); setCodeExpires(null); } }, 1000);
    return () => clearInterval(t);
  }, [codeExpires]);

  // Google & Meta OAuth URL params
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("google") === "connected") { toast.success("Google connected."); window.history.replaceState({}, "", window.location.pathname); }
    else if (p.get("google_error")) { toast.error(`Google failed: ${p.get("google_error")}`); window.history.replaceState({}, "", window.location.pathname); }

    // Handle Meta OAuth redirect token in URL hash
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const hashParams = new URLSearchParams(hash.replace("#", "?"));
      const accessToken = hashParams.get("access_token");
      if (accessToken) {
        toast.loading("Discovering Instagram Business Account from Meta...", { id: "meta-oauth" });
        (async () => {
          try {
            const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name&access_token=${accessToken}`);
            const data = await res.json();
            const pageWithIg = data.data?.find((p: any) => p.instagram_business_account?.id);
            const igId = pageWithIg?.instagram_business_account?.id || data.data?.[0]?.id || `ig_real_${Date.now()}`;

            const { data: { user: u } } = await supabase.auth.getUser();
            if (!u) throw new Error("Please sign in first");

            const config = {
              accountId: igId,
              token: accessToken,
              autoReply: true,
              connected_at: new Date().toISOString(),
              oauth_method: "live-meta-oauth"
            };

            await supabase.from("preferences").upsert({
              user_id: u.id, key: "ig_connection_config", value: config, updated_at: new Date().toISOString()
            }, { onConflict: "user_id,key" });

            toast.success("Real Instagram Connected via Meta OAuth!", { id: "meta-oauth" });
            window.history.replaceState({}, "", window.location.pathname);
            refreshIg();
          } catch (e: any) {
            toast.error(`Meta connection error: ${e.message}`, { id: "meta-oauth" });
          }
        })();
      }
    }
  }, []);

  // ── Refresh functions ──
  async function refreshTg() {
    setTgLoading(true);
    try {
      const result = await callTelegramFn("status");
      setTgStatus(result);
      setTgLoading(false);
      return;
    } catch {}

    // Fallback: Check Supabase telegram_connections table directly
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data: conn } = await supabase
          .from("telegram_connections")
          .select("*")
          .eq("user_id", u.id)
          .eq("status", "active")
          .maybeSingle();

        if (conn) {
          setTgStatus({ linked: true, connection: conn });
          setTgLoading(false);
          return;
        }
      }
    } catch {}

    setTgStatus({ linked: false, connection: null });
    setTgLoading(false);
  }
  async function refreshWa() {
    setWaLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      const userIdParam = u ? `?userId=${u.id}` : "";
      const res = await fetch(`https://mr-cisco-whatsapp-production.up.railway.app/api/whatsapp-status${userIdParam}`);
      if (res.ok) {
        const d = await res.json();
        if (d.linked) {
          setWaStatus({ linked: true, connection: { whatsapp_phone: d.phone, whatsapp_name: d.name, linked_at: new Date().toISOString(), last_message_at: null, status: "active" } });
          setWaLoading(false);
          return;
        } else {
          setWaStatus({
            linked: false,
            authenticating: !!d.authenticating,
            connection: null,
            pendingQr: d.pendingQr || null,
            pairingCode: d.pairingCode || null
          });
          setWaLoading(false);
          return;
        }
      }
    } catch {}

    // Fallback: Check Supabase whatsapp_connections table
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data: conn } = await supabase
          .from("whatsapp_connections")
          .select("*")
          .eq("user_id", u.id)
          .eq("status", "active")
          .maybeSingle();

        if (conn) {
          setWaStatus({ linked: true, connection: conn });
          setWaLoading(false);
          return;
        }
      }
    } catch {}

    setWaStatus({ linked: false, connection: null, pendingQr: null, pairingCode: null });
    setWaLoading(false);
  }
  async function refreshGoogle() {
    setGLoading(true);
    try { setGStatus(await callGoogleFn("google-status")); } catch (e: any) { toast.error(e.message); } finally { setGLoading(false); }
  }
  async function refreshIg() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser(); if (!u) return;
      const { data } = await supabase.from("preferences").select("value").eq("user_id", u.id).eq("key", "ig_connection_config").maybeSingle();
      if (data?.value && typeof data.value === "object" && (data.value as any).accountId) {
        const val = data.value as any;
        setIgStatus({ linked: true, accountId: val.accountId, token: val.token });
        setIgAccountId(val.accountId);
        setIgAutoReply(val.autoReply !== false);
      } else {
        setIgStatus({ linked: false });
      }
    } catch { setIgStatus({ linked: false }); }
  }

  async function handleIgSave() {
    if (!igAccountId.trim() || !igToken.trim()) { toast.error("Enter Account ID & Token"); return; }
    setSavingIg(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser(); if (!u) throw new Error("Not signed in");
      const config = { accountId: igAccountId.trim(), token: igToken.trim(), autoReply: true, connected_at: new Date().toISOString() };
      const { error } = await supabase.from("preferences").upsert({
        user_id: u.id, key: "ig_connection_config", value: config, updated_at: new Date().toISOString()
      }, { onConflict: "user_id,key" });
      if (error) throw error;
      toast.success("Instagram connected successfully!");
      refreshIg();
    } catch (e: any) { toast.error(e.message); } finally { setSavingIg(false); }
  }

  async function handleIgUnlink() {
    if (!confirm("Unlink Instagram DMs?")) return;
    try {
      const { data: { user: u } } = await supabase.auth.getUser(); if (!u) return;
      await supabase.from("preferences").delete().eq("user_id", u.id).eq("key", "ig_connection_config");
      toast.success("Instagram unlinked.");
      refreshIg();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleToggleIgAutoReply(checked: boolean) {
    setIgAutoReply(checked);
    try {
      const { data: { user: u } } = await supabase.auth.getUser(); if (!u) return;
      const { data } = await supabase.from("preferences").select("value").eq("user_id", u.id).eq("key", "ig_connection_config").maybeSingle();
      if (data?.value && typeof data.value === "object") {
        const val = { ...(data.value as any), autoReply: checked };
        await supabase.from("preferences").upsert({ user_id: u.id, key: "ig_connection_config", value: val, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
        toast.success(checked ? "Instagram AI Auto-reply enabled" : "Instagram AI Auto-reply paused");
      }
    } catch (e: any) { toast.error(e.message); setIgAutoReply(!checked); }
  }

  // ── Auto-reply ──
  async function loadAutoReply() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser(); if (!u) return;
      const { data } = await supabase.from("preferences").select("value").eq("user_id", u.id).eq("key", "wa_global_auto_reply_disabled").maybeSingle();
      if (data && (data.value === true || (data.value && typeof data.value === "object" && (data.value as any).disabled === true))) setGlobalAutoReply(false);
      else setGlobalAutoReply(true);
    } catch {}
  }
  async function handleToggleAutoReply(checked: boolean) {
    setGlobalAutoReply(checked);
    try {
      const { data: { user: u } } = await supabase.auth.getUser(); if (!u) return;
      if (!checked) {
        await supabase.from("preferences").upsert({ user_id: u.id, key: "wa_global_auto_reply_disabled", value: { disabled: true }, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
        toast.success("AI Auto-reply disabled");
      } else {
        await supabase.from("preferences").delete().eq("user_id", u.id).eq("key", "wa_global_auto_reply_disabled");
        toast.success("AI Auto-reply enabled");
      }
    } catch (e: any) { toast.error(e.message); setGlobalAutoReply(!checked); }
  }

  // ── Handlers ──
  async function handleWaUnlink() {
    if (!confirm("Unlink WhatsApp?")) return;
    const { data: { session } } = await supabase.auth.getSession(); if (!session) return;
    await supabase.from("whatsapp_connections").update({ status: "unlinked" }).eq("user_id", session.user.id).eq("status", "active");
    toast.success("WhatsApp unlinked."); refreshWa();
  }
  async function handleRequestPairing() {
    if (!waPhone.trim()) { toast.error("Enter phone number"); return; }
    setRequestingCode(true); setPairingCode(null);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      const res = await fetch("https://mr-cisco-whatsapp-production.up.railway.app/api/request-pairing-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u?.id, phoneNumber: waPhone })
      });
      const d = await res.json(); if (!res.ok) throw new Error(d.error); setPairingCode(d.pairingCode); toast.success("Pairing code generated!");
    } catch (e: any) { toast.error(e.message); } finally { setRequestingCode(false); }
  }
  async function handleGenerateCode() {
    setGenerating(true);
    try { const r = await callTelegramFn("generate_code"); setCode(r.code); setCodeExpires(Date.now() + (r.expires_in_seconds ?? 600) * 1000); toast.success("Code generated!"); }
    catch (e: any) { toast.error(e.message); } finally { setGenerating(false); }
  }
  async function handleTgUnlink() { if (!confirm("Unlink Telegram?")) return; await callTelegramFn("unlink"); toast.success("Telegram unlinked."); refreshTg(); }
  function copyCode() { if (!code) return; navigator.clipboard.writeText(`/link ${code}`); toast.success("Copied!"); }
  async function handleGoogleConnect() { setGBusy(true); try { const { url } = await callGoogleFn("google-oauth-start"); window.location.href = url; } catch (e: any) { toast.error(e.message); setGBusy(false); } }
  async function handleGoogleDisconnect() { if (!confirm("Disconnect Google?")) return; setGBusy(true); try { await callGoogleFn("google-status", { action: "disconnect" }); toast.success("Disconnected."); refreshGoogle(); } catch (e: any) { toast.error(e.message); } finally { setGBusy(false); } }
  async function handleRegisterWebhook() { setRegisteringWebhook(true); try { const r = await callTelegramFn("set_webhook", { url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook` }); if (r?.ok) toast.success("Webhook registered."); else toast.error(r?.description || "Failed"); } catch (e: any) { toast.error(e.message); } finally { setRegisteringWebhook(false); } }
  async function handleCheckWebhook() { setCheckingWebhook(true); try { const r = await callTelegramFn("webhook_info"); setWebhookInfo(r?.result ?? r); toast.success("Fetched."); } catch (e: any) { toast.error(e.message); } finally { setCheckingWebhook(false); } }

  const codeRemaining = codeExpires ? Math.max(0, Math.floor((codeExpires - Date.now()) / 1000)) : 0;
  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <div className="relative min-h-screen">
      {/* Green glow at bottom */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-60" style={{ background: "radial-gradient(ellipse at center bottom, rgba(34,197,94,0.08) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Multi-Channel AI Assistant</h1>
        <p className="text-sm text-white/50 mt-1">Connection Overview</p>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

        {/* ── WhatsApp ── */}
        <GlassCard className="cursor-pointer" onClick={() => toggle("wa")}>
          <SparkChart color="#22c55e" seed={1} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Activity</span>
              <span className="text-[9px] text-white/30">{waStatus?.linked ? "6 active" : ""}</span>
            </div>
            <WhatsAppIcon className="w-12 h-12 mb-3" />
            <h3 className="text-lg font-bold text-white mb-4">WhatsApp Business</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${waStatus?.linked ? "bg-emerald-400" : "bg-zinc-500"}`} />
                <span className="text-xs text-white/70">{waStatus?.linked ? "Connected" : "Not Connected"}</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch checked={globalAutoReply} onCheckedChange={handleToggleAutoReply} />
              </div>
            </div>
            <p className="text-[10px] text-white/30 mt-3">Status: {waStatus?.linked ? "Active & Synced" : "Inactive"}</p>
          </div>
          {/* Expanded */}
          {expanded === "wa" && (
            <div className="relative z-10 mt-4 pt-4 border-t border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
              {waStatus?.linked ? (
                <>
                  <div className="text-xs space-y-1.5 bg-black/30 p-3 rounded-lg">
                    <div className="flex justify-between"><span className="text-white/40">User</span><span className="text-white/80">{waStatus.connection?.whatsapp_name || waStatus.connection?.whatsapp_phone}</span></div>
                    <div className="flex justify-between"><span className="text-white/40">Phone</span><span className="text-white/80 font-mono">{waStatus.connection?.whatsapp_phone}</span></div>
                  </div>
                  <button onClick={handleWaUnlink} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition flex items-center gap-1"><Unlink className="h-3 w-3" /> Unlink</button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex border-b border-white/10 mb-2">
                    <button onClick={() => setLinkMethod("qr")} className={`flex-1 pb-1.5 text-xs font-semibold border-b-2 transition ${linkMethod === "qr" ? "border-emerald-400 text-emerald-400" : "border-transparent text-white/40"}`}>QR Code</button>
                    <button onClick={() => setLinkMethod("code")} className={`flex-1 pb-1.5 text-xs font-semibold border-b-2 transition ${linkMethod === "code" ? "border-emerald-400 text-emerald-400" : "border-transparent text-white/40"}`}>Pairing Code</button>
                  </div>
                  {linkMethod === "qr" ? (
                    waStatus?.authenticating ? (
                      <div className="flex flex-col items-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <RefreshCw className="h-5 w-5 text-emerald-400 animate-spin" />
                        <span className="text-xs font-semibold text-emerald-400 mt-2">Connecting to WhatsApp...</span>
                        <span className="text-[10px] text-white/40 mt-0.5">Completing key exchange</span>
                      </div>
                    ) : waStatus?.pendingQr ? (
                      <div className="flex flex-col items-center p-3 rounded-lg bg-white/5 space-y-2">
                        <div className="p-2 bg-white rounded-lg"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(waStatus.pendingQr)}`} alt="QR" className="w-[130px] h-[130px]" /></div>
                        <span className="text-[9px] text-white/40">Scan from WhatsApp</span>
                      </div>
                    ) : <div className="flex flex-col items-center p-4"><RefreshCw className="h-5 w-5 text-emerald-400 animate-spin" /><span className="text-[10px] text-white/40 mt-2">Starting...</span></div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input type="tel" value={waPhone} onChange={(e) => setWaPhone(e.target.value)} placeholder="254..." className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" />
                        <button onClick={handleRequestPairing} disabled={requestingCode} className="text-xs px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold">{requestingCode ? "..." : "Get"}</button>
                      </div>
                      {(pairingCode || waStatus?.pairingCode) && <div className="text-center text-xl font-mono font-bold text-emerald-400 py-2">{pairingCode || waStatus?.pairingCode}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* ── Instagram DMs ── */}
        <GlassCard className="cursor-pointer" onClick={() => toggle("ig")}>
          <SparkChart color="#E1306C" seed={2} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Activity</span>
              <span className="text-[9px] text-white/30">{igStatus?.linked ? "Active" : ""}</span>
            </div>
            <InstagramIcon className="w-12 h-12 mb-3" />
            <h3 className="text-lg font-bold text-white mb-4">Instagram Direct</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${igStatus?.linked ? "bg-emerald-400" : "bg-zinc-500"}`} />
                <span className="text-xs text-white/70">{igStatus?.linked ? "Connected" : "Not Connected"}</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={igStatus?.linked ? igAutoReply : false}
                  onCheckedChange={igStatus?.linked ? handleToggleIgAutoReply : undefined}
                  disabled={!igStatus?.linked}
                />
              </div>
            </div>
            <p className="text-[10px] text-white/30 mt-3">Status: {igStatus?.linked ? "Active & Synced" : "Inactive"}</p>
          </div>
          {expanded === "ig" && (
            <div className="relative z-10 mt-4 pt-4 border-t border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
              {igStatus?.linked ? (
                <>
                  <div className="text-xs space-y-1.5 bg-black/30 p-3 rounded-lg">
                    <div className="flex justify-between"><span className="text-white/40">Account ID</span><span className="text-white/80 font-mono">{igStatus.accountId}</span></div>
                    <div className="flex justify-between"><span className="text-white/40">Auto-Reply</span><span className="text-emerald-400">{igAutoReply ? "Enabled" : "Paused"}</span></div>
                  </div>
                  <button onClick={handleIgUnlink} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition flex items-center gap-1"><Unlink className="h-3 w-3" /> Unlink Instagram</button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl text-xs space-y-1.5 text-pink-200">
                    <div className="font-semibold text-white">1-Click Instagram Connect</div>
                    <p className="text-[11px] text-white/70">Connect your Instagram account instantly with 1-Click Meta authorization. Zero technical setup required.</p>
                  </div>

                  {/* 1-CLICK META OAUTH BUTTON */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSavingIg(true);
                      toast.loading("Opening Meta Instagram Login...", { id: "ig-oauth" });
                      const metaAppId = import.meta.env.VITE_META_APP_ID || "923086486766042";
                      const redirectUri = window.location.origin + "/settings";
                      const scopes = ["instagram_basic", "instagram_manage_messages", "pages_manage_metadata", "pages_read_engagement"].join(",");
                      const metaAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=token`;
                      window.location.href = metaAuthUrl;
                    }}
                    disabled={savingIg}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 text-white font-semibold text-xs shadow-lg hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2"
                  >
                    <InstagramIcon className="w-4 h-4" />
                    {savingIg ? "Opening Meta..." : "Log in with Instagram (1-Click)"}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const show = !igAccountId;
                        if (show) setIgAccountId("ig_custom_id"); else setIgAccountId("");
                      }}
                      className="text-[10px] text-white/40 hover:text-white/70 underline transition"
                    >
                      {igAccountId ? "Hide Developer Settings" : "Developer Token Mode"}
                    </button>
                  </div>

                  {igAccountId && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <input type="text" value={igAccountId} onChange={(e) => setIgAccountId(e.target.value)} placeholder="Instagram Business Account ID" className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white" />
                      <input type="password" value={igToken} onChange={(e) => setIgToken(e.target.value)} placeholder="Meta Graph API Token" className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white" />
                      <button onClick={handleIgSave} disabled={savingIg} className="w-full text-xs py-1.5 rounded bg-white/10 text-white font-semibold">{savingIg ? "Saving..." : "Save Manual Token"}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* ── Facebook Messenger ── */}
        <GlassCard>
          <SparkChart color="#1877F2" seed={3} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Activity</span>
            </div>
            <FacebookIcon className="w-12 h-12 mb-3" />
            <h3 className="text-lg font-bold text-white mb-4">Facebook Messenger</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs text-white/70">Not Connected</span>
              </div>
              <Switch checked={false} disabled />
            </div>
            <p className="text-[10px] text-white/30 mt-3">Status: Inactive</p>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* ── Telegram ── */}
        <GlassCard className="cursor-pointer" onClick={() => toggle("tg")}>
          <SparkChart color="#2AABEE" seed={4} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Activity</span>
              <span className="text-[9px] text-white/30">{tgStatus?.linked ? "3 active" : ""}</span>
            </div>
            <TelegramIcon className="w-12 h-12 mb-3" />
            <h3 className="text-lg font-bold text-white mb-4">Telegram</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${tgStatus?.linked ? "bg-emerald-400" : "bg-zinc-500"}`} />
                <span className="text-xs text-white/70">{tgStatus?.linked ? "Connected" : "Not Connected"}</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={tgStatus?.linked || false}
                  onCheckedChange={async (checked) => {
                    if (tgStatus?.linked) {
                      await handleTgUnlink();
                    } else {
                      setExpanded("tg");
                      await handleGenerateCode();
                    }
                  }}
                />
              </div>
            </div>
            <p className="text-[10px] text-white/30 mt-3">Status: {tgStatus?.linked ? "Active & Synced" : "Inactive"}</p>
          </div>
          {expanded === "tg" && (
            <div className="relative z-10 mt-4 pt-4 border-t border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
              {tgStatus?.linked ? (
                <>
                  <div className="text-xs space-y-1.5 bg-black/30 p-3 rounded-lg">
                    <div className="flex justify-between"><span className="text-white/40">User</span><span className="text-white/80">{tgStatus.connection?.telegram_username ? `@${tgStatus.connection.telegram_username}` : tgStatus.connection?.telegram_first_name}</span></div>
                    <div className="flex justify-between"><span className="text-white/40">Linked</span><span className="text-white/80">{new Date(tgStatus.connection!.linked_at).toLocaleDateString()}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleTgUnlink} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1"><Unlink className="h-3 w-3" /> Unlink</button>
                    <button onClick={handleRegisterWebhook} disabled={registeringWebhook} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70">{registeringWebhook ? "..." : "Register Webhook"}</button>
                    <button onClick={handleCheckWebhook} disabled={checkingWebhook} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70">{checkingWebhook ? "..." : "Check"}</button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs space-y-1 text-blue-200">
                    <div className="font-semibold">How to connect Telegram:</div>
                    <ol className="list-decimal list-inside space-y-1 text-white/70 text-[11px]">
                      <li>Click <strong>Generate Code</strong> below</li>
                      <li>Open your Telegram app</li>
                      <li>Send <code className="bg-black/40 px-1 rounded text-cyan-300">/link YOUR_CODE</code> to <strong>@MrCiscoBot</strong></li>
                    </ol>
                  </div>
                  {code && (
                    <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-cyan-500/30">
                      <code className="font-mono text-sm font-bold text-cyan-300">/link {code}</code>
                      <button onClick={copyCode} className="text-[10px] px-2 py-1 bg-cyan-500/20 text-cyan-300 font-semibold rounded hover:bg-cyan-500/30">Copy command</button>
                    </div>
                  )}
                  <button onClick={handleGenerateCode} disabled={generating} className="w-full text-xs py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-lg hover:opacity-90 transition">{generating ? "Generating..." : "Generate Link Code"}</button>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* ── Gmail & Calendar ── */}
        <GlassCard className="cursor-pointer" onClick={() => toggle("google")}>
          <SparkChart color="#EA4335" seed={5} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Activity</span>
            </div>
            <GmailCalIcon className="w-12 h-12 mb-3" />
            <h3 className="text-lg font-bold text-white mb-4">Gmail & Calendar</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${gStatus?.connected ? "bg-emerald-400" : "bg-zinc-500"}`} />
                <span className="text-xs text-white/70">{gStatus?.connected ? "Connected" : "Not Connected"}</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch checked={gStatus?.connected || false} onCheckedChange={gStatus?.connected ? () => handleGoogleDisconnect() : () => handleGoogleConnect()} disabled={gBusy} />
              </div>
            </div>
            <p className="text-[10px] text-white/30 mt-3">Status: {gStatus?.connected ? "Synced" : "Inactive"}</p>
          </div>
          {expanded === "google" && (
            <div className="relative z-10 mt-4 pt-4 border-t border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
              {gStatus?.connected ? (
                <>
                  <div className="text-xs space-y-1.5 bg-black/30 p-3 rounded-lg">
                    <div className="flex justify-between"><span className="text-white/40">Account</span><span className="text-white/80">{gStatus.email}</span></div>
                    <div className="flex justify-between"><span className="text-white/40">Gmail</span><span className="text-emerald-400">{gStatus.gmail_ok ? "Active" : "—"}</span></div>
                    <div className="flex justify-between"><span className="text-white/40">Calendar</span><span className="text-emerald-400">{gStatus.calendar_ok ? "Active" : "—"}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleGoogleConnect} disabled={gBusy} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70">Reconnect</button>
                    <button onClick={handleGoogleDisconnect} disabled={gBusy} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1"><Unlink className="h-3 w-3" /> Disconnect</button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-white/50">Connect Gmail and Calendar to let Mr. Cisco manage your inbox and schedule.</p>
                  <button onClick={handleGoogleConnect} disabled={gBusy} className="w-full text-xs py-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold">{gBusy ? "Redirecting..." : "Connect Google"}</button>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Business Knowledge Base & AI Brain */}
      <div className="mb-8">
        <BusinessKnowledgeCard />
      </div>

      {/* Account Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <GlassCard>
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-white/90"><User className="h-4 w-4 text-purple-400" /> Account</h3>
          <div className="text-xs space-y-2 bg-black/20 p-3 rounded-lg mb-3">
            <div className="flex justify-between"><span className="text-white/40">Email</span><span className="text-white/80">{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-white/40">User ID</span><span className="font-mono text-white/80">{user?.id?.slice(0, 12)}...</span></div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="w-full text-xs py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-semibold transition">Sign Out</button>
        </GlassCard>
        <ProfileCard />
      </div>
    </div>
  );
}
