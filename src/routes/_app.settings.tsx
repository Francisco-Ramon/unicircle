import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/ui/page";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Copy, Unlink, RefreshCw, Webhook, Activity, Mail, MessageCircle, User } from "lucide-react";
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
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Google (Gmail + Calendar)</h3>
        <button onClick={refresh} disabled={loading} className="text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition flex items-center gap-1">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {loading && !status ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : status?.connected ? (
        <div className="space-y-3">
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-emerald-400">● Connected</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span>{status.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Gmail read</span><span>{status.gmail_ok ? "✓" : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Gmail compose</span><span>{status.gmail_compose ? "✓" : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Calendar</span><span>{status.calendar_ok ? "✓" : "—"}</span></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleConnect} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 transition disabled:opacity-50">Reconnect (re-authorize)</button>
            <button onClick={handleDisconnect} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition flex items-center gap-1"><Unlink className="h-3 w-3" /> Disconnect</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">Connect your Google account so Mr. Cisco can read your inbox, summarize emails, draft replies, and read your calendar. Drafts and events always require your approval — Mr. Cisco never sends or schedules without you.</p>
          <button onClick={handleConnect} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition disabled:opacity-50">{busy ? "Redirecting…" : "Connect Google"}</button>
        </div>
      )}
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

      <div className="space-y-4 max-w-2xl">
        <Card>
          <h3 className="font-semibold mb-3">Account</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">User ID</span><span className="font-mono text-xs">{user?.id?.slice(0, 8)}…</span></div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="mt-4 text-xs px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition">
            Sign out
          </button>
        </Card>

        <ProfileCard />

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Telegram
            </h3>
            <button
              onClick={refreshStatus}
              disabled={tgLoading}
              className="text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              title="Refresh status"
            >
              <RefreshCw className={`h-3 w-3 ${tgLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {tgLoading && !tgStatus ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : tgStatus?.linked ? (
            <div className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-emerald-400">● Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telegram user</span>
                  <span>
                    {tgStatus.connection?.telegram_username
                      ? `@${tgStatus.connection.telegram_username}`
                      : tgStatus.connection?.telegram_first_name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linked</span>
                  <span>{new Date(tgStatus.connection!.linked_at).toLocaleString()}</span>
                </div>
                {tgStatus.connection?.last_message_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last message</span>
                    <span>{new Date(tgStatus.connection.last_message_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleUnlink}
                className="text-xs px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition flex items-center gap-1"
              >
                <Unlink className="h-3 w-3" /> Unlink Telegram
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chat with Mr. Cisco from anywhere via Telegram. Generate a one-time code, then send it to the bot.
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
                <li>Open the Mr. Cisco bot in Telegram and press <span className="font-mono">/start</span></li>
                <li>Generate a code below</li>
                <li>Send <span className="font-mono">/link CODE</span> to the bot within 10 minutes</li>
              </ol>

              {code ? (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Send to the bot:</span>
                    <span className="text-xs text-muted-foreground">expires in {codeRemainingSec}s</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-lg font-mono tracking-widest">/link {code}</code>
                    <button
                      onClick={copyCode}
                      className="text-xs px-2 py-1 rounded-md bg-card border border-border hover:border-primary/40 transition flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                </div>
              ) : null}

              <button
                onClick={handleGenerateCode}
                disabled={generating}
                className="text-xs px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition disabled:opacity-50"
              >
                {generating ? "Generating…" : code ? "Generate new code" : "Generate code"}
              </button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Webhook admin</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRegisterWebhook}
                disabled={registeringWebhook}
                className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Webhook className={`h-3 w-3 ${registeringWebhook ? "animate-pulse" : ""}`} />
                {registeringWebhook ? "Registering…" : "Register webhook"}
              </button>
              <button
                onClick={handleCheckWebhook}
                disabled={checkingWebhook}
                className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Activity className={`h-3 w-3 ${checkingWebhook ? "animate-pulse" : ""}`} />
                {checkingWebhook ? "Checking…" : "Check webhook status"}
              </button>
            </div>

            {webhookInfo && (
              <div className="rounded-lg border border-border bg-card/40 p-3 text-xs space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Active</span>
                  <span className={webhookInfo.url ? "text-emerald-400" : "text-muted-foreground"}>
                    {webhookInfo.url ? "● Yes" : "○ No URL set"}
                  </span>
                </div>
                {webhookInfo.url && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">URL</span>
                    <span className="font-mono text-[10px] truncate" title={webhookInfo.url}>{webhookInfo.url}</span>
                  </div>
                )}
                {typeof webhookInfo.pending_update_count === "number" && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Pending updates</span>
                    <span>{webhookInfo.pending_update_count}</span>
                  </div>
                )}
                {webhookInfo.last_error_message ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Last error</span>
                    <span className="text-destructive text-right">{webhookInfo.last_error_message}</span>
                  </div>
                ) : (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Last error</span>
                    <span className="text-emerald-400">None</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <GoogleCard />

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> WhatsApp
            </h3>
            <button
              onClick={refreshWaStatus}
              disabled={waLoading}
              className="text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              title="Refresh status"
            >
              <RefreshCw className={`h-3 w-3 ${waLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {waLoading && !waStatus ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : waStatus?.linked ? (
            <div className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-emerald-400">● Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WhatsApp user</span>
                  <span>
                    {waStatus.connection?.whatsapp_name
                      ? `${waStatus.connection.whatsapp_name} (${waStatus.connection.whatsapp_phone})`
                      : waStatus.connection?.whatsapp_phone ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linked</span>
                  <span>{new Date(waStatus.connection!.linked_at).toLocaleString()}</span>
                </div>
                {waStatus.connection?.last_message_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last message</span>
                    <span>{new Date(waStatus.connection.last_message_at).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-xs text-foreground">AI Auto-reply (Global)</span>
                    <span className="text-[10px] text-muted-foreground">Turn bot responses ON or OFF for all chats</span>
                  </div>
                  <Switch
                    checked={globalAutoReply}
                    onCheckedChange={handleToggleGlobalAutoReply}
                  />
                </div>
              </div>
              <button
                onClick={handleWaUnlink}
                className="text-xs px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition flex items-center gap-1"
              >
                <Unlink className="h-3 w-3" /> Unlink WhatsApp
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your WhatsApp so Mr. Cisco can read your incoming WhatsApp messages and reply based on your style.
              </p>

              {/* Linking Methods Tabs */}
              <div className="flex border-b border-border mb-4">
                <button
                  type="button"
                  onClick={() => setLinkMethod("qr")}
                  className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition ${
                    linkMethod === "qr"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Scan QR Code
                </button>
                <button
                  type="button"
                  onClick={() => setLinkMethod("code")}
                  className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition ${
                    linkMethod === "code"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Use Pairing Code
                </button>
              </div>

              {linkMethod === "qr" ? (
                waStatus?.pendingQr ? (
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                    <span className="text-xs font-medium text-primary">Scan this QR code with WhatsApp:</span>
                    <div className="p-3 bg-white rounded-lg shadow-sm border border-border">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(waStatus.pendingQr)}`}
                        alt="WhatsApp QR Code"
                        className="w-[180px] h-[180px]"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center">
                      Go to Linked Devices in WhatsApp on your phone and scan. This screen will update automatically.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-border bg-card/40 space-y-3">
                    <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                    <span className="text-xs font-medium text-muted-foreground">Waiting for WhatsApp client to start...</span>
                    <span className="text-[10px] text-muted-foreground/60 text-center max-w-xs">
                      Make sure your local server is running to generate the QR code.
                    </span>
                  </div>
                )
              ) : (
                <div className="space-y-4 p-4 rounded-xl border border-border bg-card/20">
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    Enter your phone number (with country code, e.g. <span className="font-mono">254713288681</span>) to generate a pairing code you can type in WhatsApp.
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      placeholder="e.g. 254713288681"
                      className="flex-1 bg-sidebar border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50 text-foreground"
                    />
                    <button
                      onClick={handleRequestPairingCode}
                      disabled={requestingCode}
                      className="text-xs px-4 py-1.5 rounded-lg gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition disabled:opacity-50"
                    >
                      {requestingCode ? "Requesting..." : "Get Code"}
                    </button>
                  </div>

                  {(pairingCode || waStatus?.pairingCode) && (
                    <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-primary/40 bg-primary/5 space-y-2 mt-2">
                      <span className="text-xs text-muted-foreground">Enter this code in WhatsApp:</span>
                      <div className="text-2xl font-mono tracking-widest text-primary font-bold bg-card px-4 py-2 rounded border border-border select-all">
                        {pairingCode || waStatus?.pairingCode}
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center">
                        Go to WhatsApp → Linked Devices → Link a Device → Link with phone number instead → Enter code
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Webhook configuration</div>
            <div className="rounded-lg border border-border bg-card/40 p-3 text-xs space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                To receive WhatsApp events, set up the webhook in your Facebook App Developer Settings:
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground text-left">Callback URL</span>
                  <span className="font-mono text-[10px] truncate select-all text-right" title={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`}>
                    {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground text-left">Verify Token</span>
                  <span className="font-mono text-[10px] text-right">Set to WHATSAPP_WEBHOOK_VERIFY_TOKEN env var</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">About Mr. Cisco</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Mr. Cisco is a modular executive agent platform. The agent core uses tool-calling to manage your tasks, books, notes, and (mock) inbox/calendar. All your data is private to your account via row-level security.
          </p>
          <button onClick={() => toast.info("Mr. Cisco v1.0 — Executive Agent Platform")} className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 transition">
            Show version
          </button>
        </Card>
      </div>
    </div>
  );
}
