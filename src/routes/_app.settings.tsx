import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/ui/page";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Copy, Unlink, RefreshCw, Webhook, Activity, Mail, MessageCircle, User, Instagram, Facebook } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type GoogleStatus = { connected: boolean; email?: string; scopes?: string[]; gmail_ok?: boolean; gmail_compose?: boolean; calendar_ok?: boolean };

type WaStatus = {
  linked: boolean;
  connection: null | {
    whatsapp_phone: string;
    whatsapp_name: string | null;
    linked_at: string;
    last_message_at: string | null;
    status: string;
  };
  pendingQr?: string | null;
  pairingCode?: string | null;
};

async function callWhatsAppFn(action: string, extra: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-link`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
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
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

function GoogleCard() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setStatus(await callGoogleFn("google-status")); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    refresh();
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      toast.success("Google connected.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("google_error")) {
      toast.error(`Google connection failed: ${params.get("google_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleConnect() {
    setBusy(true);
    try {
      const { url } = await callGoogleFn("google-oauth-start");
      window.location.href = url;
    } catch (e: any) { toast.error(e.message); setBusy(false); }
  }
  async function handleDisconnect() {
    if (!confirm("Disconnect Google? This revokes Gmail and Calendar access.")) return;
    setBusy(true);
    try { await callGoogleFn("google-status", { action: "disconnect" }); toast.success("Disconnected."); await refresh(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Card className="hover:shadow-[0_0_25px_rgba(239,68,68,0.15)] transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Mail className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Gmail + Calendar</h3>
              <p className="text-[10px] text-muted-foreground">Google Workspace integration</p>
            </div>
          </div>
          <div>
            {status?.connected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                Not Connected
              </span>
            )}
          </div>
        </div>

        {loading && !status ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
            <RefreshCw className="h-3 w-3 animate-spin text-primary" /> Loading Google Status...
          </div>
        ) : status?.connected ? (
          <div className="space-y-4">
            <div className="text-xs space-y-2 bg-black/20 p-3 rounded-lg border border-border/30">
              <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-medium text-foreground">{status.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gmail Access</span><span className="text-emerald-400">{status.gmail_ok ? "Active" : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Calendar Access</span><span className="text-emerald-400">{status.calendar_ok ? "Active" : "—"}</span></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">Connect your Google account so Mr. Cisco can read your inbox, summarize emails, draft replies, and read your calendar.</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border/30 flex gap-2 w-full">
        {status?.connected ? (
          <>
            <button onClick={handleConnect} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 transition disabled:opacity-50 text-foreground">Reconnect</button>
            <button onClick={handleDisconnect} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/25 transition flex items-center gap-1"><Unlink className="h-3 w-3" /> Disconnect</button>
            <button onClick={refresh} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 transition ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </>
        ) : (
          <button onClick={handleConnect} disabled={busy} className="w-full text-xs px-3 py-2 rounded-lg gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition disabled:opacity-50">{busy ? "Redirecting…" : "Connect Google"}</button>
        )}
      </div>
    </Card>
  );
}

function ProfileCard() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      if (data?.display_name) setName(data.display_name);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase.from("profiles").upsert({ 
      id: user.id, 
      display_name: name,
      updated_at: new Date().toISOString()
    });
    
    if (error) toast.error("Failed to update name");
    else toast.success("Name updated successfully! Mr. Cisco will now use this name.");
    setSaving(false);
  }

  return (
    <Card>
      <h3 className="font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Assistant Preferences</h3>
      <div className="text-sm space-y-3">
        <p className="text-muted-foreground leading-relaxed">What should Mr. Cisco call you when introducing himself? (e.g. "I'm Mr. Cisco, Francisco's assistant")</p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading || saving}
            placeholder="Your preferred name"
            className="flex-1 bg-sidebar border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50 transition-colors text-foreground"
          />
          <button 
            onClick={handleSave} 
            disabled={loading || saving || !name.trim()} 
            className="text-xs px-4 py-1.5 rounded-lg gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Name"}
          </button>
        </div>
      </div>
    </Card>
  );
}

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

type TgStatus = {
  linked: boolean;
  connection: null | {
    telegram_username: string | null;
    telegram_first_name: string | null;
    linked_at: string;
    last_message_at: string | null;
    status: string;
  };
};

async function callTelegramFn(action: string, extra: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-link`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

function SettingsPage() {
  const { user } = useAuth();
  const [tgStatus, setTgStatus] = useState<TgStatus | null>(null);
  const [tgLoading, setTgLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [codeExpires, setCodeExpires] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [checkingWebhook, setCheckingWebhook] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);

  // WhatsApp states
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null);
  const [waLoading, setWaLoading] = useState(true);
  const [globalAutoReply, setGlobalAutoReply] = useState(true);

  async function loadGlobalAutoReplyState() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase
        .from("preferences")
        .select("value")
        .eq("user_id", authUser.id)
        .eq("key", "wa_global_auto_reply_disabled")
        .maybeSingle();

      if (error) throw error;

      if (data && (data.value === true || (data.value && typeof data.value === 'object' && (data.value as any).disabled === true))) {
        setGlobalAutoReply(false);
      } else {
        setGlobalAutoReply(true);
      }
    } catch (err: any) {
      console.error("Failed to load global auto-reply preference:", err);
    }
  }

  async function handleToggleGlobalAutoReply(checked: boolean) {
    setGlobalAutoReply(checked);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const key = "wa_global_auto_reply_disabled";
      if (!checked) {
        const { error } = await supabase
          .from("preferences")
          .upsert({
            user_id: authUser.id,
            key,
            value: { disabled: true },
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id,key" });

        if (error) throw error;
        toast.success("AI Auto-reply disabled GLOBALLY");
      } else {
        const { error } = await supabase
          .from("preferences")
          .delete()
          .eq("user_id", authUser.id)
          .eq("key", key);

        if (error) throw error;
        toast.success("AI Auto-reply enabled GLOBALLY");
      }
    } catch (err: any) {
      toast.error("Failed to update preference: " + err.message);
      setGlobalAutoReply(!checked);
    }
  }

  const [waCode, setWaCode] = useState<string | null>(null);
  const [waCodeExpires, setWaCodeExpires] = useState<number | null>(null);
  const [waGenerating, setWaGenerating] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [linkMethod, setLinkMethod] = useState<"qr" | "code">("qr");

  useEffect(() => {
    refreshStatus();
    refreshWaStatus();
    loadGlobalAutoReplyState();
  }, []);

  useEffect(() => {
    if (waStatus?.linked) return;
    const interval = setInterval(() => {
      refreshWaStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [waStatus?.linked]);

  useEffect(() => {
    if (!codeExpires && !waCodeExpires) return;
    const t = setInterval(() => {
      if (codeExpires && Date.now() > codeExpires) {
        setCode(null);
        setCodeExpires(null);
      }
      if (waCodeExpires && Date.now() > waCodeExpires) {
        setWaCode(null);
        setWaCodeExpires(null);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [codeExpires, waCodeExpires]);

  async function refreshStatus() {
    setTgLoading(true);
    try {
      const s = await callTelegramFn("status");
      setTgStatus(s);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTgLoading(false);
    }
  }

  async function refreshWaStatus() {
    setWaLoading(true);
    try {
      const res = await fetch('https://mr-cisco-whatsapp-production.up.railway.app/api/whatsapp-status');
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      if (data.linked) {
        setWaStatus({
          linked: true,
          connection: {
            whatsapp_phone: data.phone,
            whatsapp_name: data.name,
            linked_at: new Date().toISOString(),
            last_message_at: null,
            status: 'active',
          }
        });
      } else {
        setWaStatus({
          linked: false,
          connection: null,
          pendingQr: data.pendingQr || null,
          pairingCode: data.pairingCode || null
        });
      }
    } catch (e: any) {
      // Server not running — show waiting state
      setWaStatus({ linked: false, connection: null, pendingQr: null, pairingCode: null });
    } finally {
      setWaLoading(false);
    }
  }

  async function handleWaUnlink() {
    if (!confirm("Unlink WhatsApp from your account?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("whatsapp_connections")
        .update({ status: "unlinked" })
        .eq("user_id", session.user.id)
        .eq("status", "active");

      if (error) throw error;
      toast.success("WhatsApp unlinked.");
      await refreshWaStatus();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleRequestPairingCode() {
    if (!waPhone.trim()) {
      toast.error("Please enter a phone number");
      return;
    }
    setRequestingCode(true);
    setPairingCode(null);
    try {
      const res = await fetch("https://mr-cisco-whatsapp-production.up.railway.app/api/request-pairing-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: waPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate pairing code");
      setPairingCode(data.pairingCode);
      toast.success("Pairing code generated!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRequestingCode(false);
    }
  }

  function copyWaCode() {
    if (!waCode) return;
    navigator.clipboard.writeText(`/link ${waCode}`);
    toast.success("Copied. Send /link CODE to the WhatsApp bot.");
  }

  async function handleGenerateCode() {
    setGenerating(true);
    try {
      const r = await callTelegramFn("generate_code");
      setCode(r.code);
      setCodeExpires(Date.now() + (r.expires_in_seconds ?? 600) * 1000);
      toast.success("Code generated. Send it to your Telegram bot within 10 minutes.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleUnlink() {
    if (!confirm("Unlink Telegram from your account?")) return;
    try {
      await callTelegramFn("unlink");
      toast.success("Telegram unlinked.");
      await refreshStatus();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(`/link ${code}`);
    toast.success("Copied. Paste it in your Telegram chat with the bot.");
  }

  async function handleRegisterWebhook() {
    setRegisteringWebhook(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`;
      const r = await callTelegramFn("set_webhook", { url });
      if (r?.ok) {
        toast.success("Webhook registered with Telegram.");
      } else {
        toast.error(r?.description || "Telegram rejected the webhook URL.");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRegisteringWebhook(false);
    }
  }

  async function handleCheckWebhook() {
    setCheckingWebhook(true);
    try {
      const r = await callTelegramFn("webhook_info");
      setWebhookInfo(r?.result ?? r);
      toast.success("Fetched webhook status.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCheckingWebhook(false);
    }
  }

  const codeRemainingSec = codeExpires ? Math.max(0, Math.floor((codeExpires - Date.now()) / 1000)) : 0;
  const waCodeRemainingSec = waCodeExpires ? Math.max(0, Math.floor((waCodeExpires - Date.now()) / 1000)) : 0;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, integrations, and preferences." />

      <div className="space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-[0_0_25px_rgba(99,102,241,0.05)] transition-all duration-300">
            <h3 className="font-semibold mb-4 text-sm flex items-center gap-2 border-b border-border/40 pb-3 text-foreground"><User className="h-4 w-4 text-primary" /> Account Details</h3>
            <div className="text-xs space-y-3">
              <div className="flex justify-between bg-black/20 p-2.5 rounded-lg border border-border/30"><span className="text-muted-foreground">Email</span><span className="text-foreground font-medium">{user?.email}</span></div>
              <div className="flex justify-between bg-black/20 p-2.5 rounded-lg border border-border/30"><span className="text-muted-foreground">User ID</span><span className="font-mono text-foreground font-medium">{user?.id?.slice(0, 12)}…</span></div>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="mt-4 w-full text-xs px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/25 font-semibold transition">
              Sign out Account
            </button>
          </Card>

          <ProfileCard />
        </div>

        <div className="border-t border-border/40 pt-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Integrations Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* WhatsApp Card */}
            <Card className="hover:shadow-[0_0_25px_rgba(34,197,94,0.12)] transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">WhatsApp</h3>
                      <p className="text-[10px] text-muted-foreground">Mobile messaging automation</p>
                    </div>
                  </div>
                  <div>
                    {waStatus?.linked ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>

                {waLoading && !waStatus ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                    <RefreshCw className="h-3 w-3 animate-spin text-primary" /> Loading WhatsApp Status...
                  </div>
                ) : waStatus?.linked ? (
                  <div className="space-y-4">
                    <div className="text-xs space-y-2 bg-black/20 p-3 rounded-lg border border-border/30">
                      <div className="flex justify-between"><span className="text-muted-foreground">WhatsApp User</span><span className="font-medium text-foreground">{waStatus.connection?.whatsapp_name || waStatus.connection?.whatsapp_phone || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Linked Phone</span><span className="font-mono text-foreground">{waStatus.connection?.whatsapp_phone || "—"}</span></div>
                    </div>

                    <div className="flex items-center justify-between bg-black/10 border border-border/30 rounded-lg p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-xs text-foreground">Manual Mode (Global)</span>
                        <span className="text-[9px] text-muted-foreground">Silence bot replies globally</span>
                      </div>
                      <Switch
                        checked={!globalAutoReply}
                        onCheckedChange={(checked) => handleToggleGlobalAutoReply(!checked)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Connect your WhatsApp so Mr. Cisco can automatically answer inquiries and handle messages based on your preferences.
                    </p>

                    <div className="flex border-b border-border/40 mb-3">
                      <button
                        type="button"
                        onClick={() => setLinkMethod("qr")}
                        className={`flex-1 pb-1.5 text-xs font-semibold border-b-2 transition ${
                          linkMethod === "qr"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Scan QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkMethod("code")}
                        className={`flex-1 pb-1.5 text-xs font-semibold border-b-2 transition ${
                          linkMethod === "code"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Pairing Code
                      </button>
                    </div>

                    {linkMethod === "qr" ? (
                      waStatus?.pendingQr ? (
                        <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm border border-border">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(waStatus.pendingQr)}`}
                              alt="WhatsApp QR Code"
                              className="w-[140px] h-[140px]"
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground text-center">
                            Scan from WhatsApp → Linked Devices.
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed border-border bg-card/40 space-y-2">
                          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                          <span className="text-[11px] font-medium text-muted-foreground">Starting client session...</span>
                        </div>
                      )
                    ) : (
                      <div className="space-y-3 p-3 rounded-lg border border-border/30 bg-card/20">
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            value={waPhone}
                            onChange={(e) => setWaPhone(e.target.value)}
                            placeholder="e.g. 254713288681"
                            className="flex-1 bg-sidebar border border-border rounded-md px-3 py-1 text-xs focus:outline-none focus:border-primary/50 text-foreground"
                          />
                          <button
                            onClick={handleRequestPairingCode}
                            disabled={requestingCode}
                            className="text-xs px-3 py-1 rounded-lg gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition disabled:opacity-50"
                          >
                            {requestingCode ? "..." : "Get Code"}
                          </button>
                        </div>

                        {(pairingCode || waStatus?.pairingCode) && (
                          <div className="flex flex-col items-center justify-center p-2 rounded border border-primary/40 bg-primary/5 space-y-1">
                            <span className="text-[9px] text-muted-foreground">Pairing Code:</span>
                            <div className="text-xl font-mono tracking-widest text-primary font-bold">
                              {pairingCode || waStatus?.pairingCode}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border/30 flex gap-2 w-full">
                {waStatus?.linked ? (
                  <>
                    <button onClick={handleWaUnlink} className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/25 transition flex items-center gap-1"><Unlink className="h-3 w-3" /> Unlink</button>
                    <button onClick={refreshWaStatus} disabled={waLoading} className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 transition ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground">
                      <RefreshCw className={`h-3 w-3 ${waLoading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                  </>
                ) : (
                  <button onClick={refreshWaStatus} disabled={waLoading} className="w-full text-xs px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/40 transition flex items-center justify-center gap-1.5 font-semibold text-foreground">
                    <RefreshCw className={`h-3 w-3 ${waLoading ? "animate-spin" : ""}`} /> Check Link Status
                  </button>
                )}
              </div>
            </Card>

            {/* Telegram Card */}
            <Card className="hover:shadow-[0_0_25px_rgba(59,130,246,0.12)] transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Send className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Telegram</h3>
                      <p className="text-[10px] text-muted-foreground">Bot channel integration</p>
                    </div>
                  </div>
                  <div>
                    {tgStatus?.linked ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>

                {tgLoading && !tgStatus ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                    <RefreshCw className="h-3 w-3 animate-spin text-primary" /> Loading Telegram Status...
                  </div>
                ) : tgStatus?.linked ? (
                  <div className="space-y-4">
                    <div className="text-xs space-y-2 bg-black/20 p-3 rounded-lg border border-border/30">
                      <div className="flex justify-between"><span className="text-muted-foreground">Connected User</span><span className="font-medium text-foreground">{tgStatus.connection?.telegram_username ? `@${tgStatus.connection.telegram_username}` : tgStatus.connection?.telegram_first_name || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Linked At</span><span className="text-foreground">{new Date(tgStatus.connection!.linked_at).toLocaleDateString()}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs text-muted-foreground">
                    <p className="leading-relaxed">Chat with Mr. Cisco via Telegram. Generate a one-time code to link your bot:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Start chat with bot in Telegram</li>
                      <li>Generate a one-time code below</li>
                      <li>Send <code className="font-mono bg-black/35 px-1 py-0.5 rounded">/link CODE</code> to the bot</li>
                    </ol>

                    {code && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mt-2 flex items-center justify-between">
                        <code className="text-md font-mono font-bold text-foreground">/link {code}</code>
                        <button onClick={copyCode} className="text-[10px] px-2 py-1 bg-card border border-border hover:border-primary/45 rounded transition">Copy</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border/30 flex gap-2 w-full">
                {tgStatus?.linked ? (
                  <>
                    <button onClick={handleUnlink} className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/25 transition flex items-center gap-1"><Unlink className="h-3 w-3" /> Unlink</button>
                    <button onClick={refreshStatus} disabled={tgLoading} className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 transition ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground">
                      <RefreshCw className={`h-3 w-3 ${tgLoading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                  </>
                ) : (
                  <button onClick={handleGenerateCode} disabled={generating} className="w-full text-xs px-3 py-2 rounded-lg gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition disabled:opacity-50">
                    {generating ? "Generating..." : "Generate Code"}
                  </button>
                )}
              </div>
            </Card>

            {/* Google Card */}
            <GoogleCard />

            {/* Instagram Card (Mocked) */}
            <Card className="opacity-70 hover:opacity-85 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-pink-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Instagram</h3>
                      <p className="text-[10px] text-muted-foreground">Auto-reply & direct messages</p>
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                      Coming Soon
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Link your Instagram Professional account to let Mr. Cisco automatically reply to comments and direct messages.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/30 w-full">
                <button disabled className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/50 text-zinc-500 font-semibold cursor-not-allowed">
                  Connect Instagram
                </button>
              </div>
            </Card>

            {/* Facebook Card (Mocked) */}
            <Card className="opacity-70 hover:opacity-85 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
                      <Facebook className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Facebook Messenger</h3>
                      <p className="text-[10px] text-muted-foreground">Customer chat automation</p>
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                      Coming Soon
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Connect your Facebook Page Messenger to let Mr. Cisco handle customer inquiries and direct messages.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/30 w-full">
                <button disabled className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/50 text-zinc-500 font-semibold cursor-not-allowed">
                  Connect Messenger
                </button>
              </div>
            </Card>

          </div>
        </div>

        {/* Webhook Settings and Metadata Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/40 pt-6">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Telegram Webhook Manager</div>
              <div className="flex gap-2">
                <button onClick={handleRegisterWebhook} disabled={registeringWebhook} className="text-[10px] px-2.5 py-1 rounded bg-card border border-border hover:border-primary/45 transition">Register</button>
                <button onClick={handleCheckWebhook} disabled={checkingWebhook} className="text-[10px] px-2.5 py-1 rounded bg-card border border-border hover:border-primary/45 transition">Check Status</button>
              </div>
            </div>
            {webhookInfo && (
              <div className="text-xs space-y-1.5 bg-black/25 p-3 rounded-lg border border-border/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registered</span>
                  <span className={webhookInfo.url ? "text-emerald-400" : "text-zinc-400 font-medium"}>{webhookInfo.url ? "Yes" : "No"}</span>
                </div>
                {webhookInfo.url && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">URL</span><span className="font-mono text-[9px] truncate text-foreground">{webhookInfo.url}</span></div>}
                {webhookInfo.last_error_message && <div className="text-destructive font-mono text-[9px] mt-1">Error: {webhookInfo.last_error_message}</div>}
              </div>
            )}
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground mb-2">About Mr. Cisco</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Mr. Cisco is a modular executive assistant built using Deno edge workers and Supabase. The agent securely manages your workspace using client-authorized RLS credentials.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[10px] text-muted-foreground">Version 1.0.0</span>
              <button onClick={() => toast.info("Mr. Cisco v1.0.0")} className="text-[10px] px-2.5 py-1 rounded bg-card border border-border hover:border-primary/45 transition ml-auto">Build Info</button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
