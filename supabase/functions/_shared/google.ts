// Shared Google OAuth + token-refresh helpers for edge functions.
// Tokens are persisted in public.google_connections via the service-role client.

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
];

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// HMAC-sign a state value so we can trust user_id round-tripped through Google.
async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function buildState(userId: string, secret: string): Promise<string> {
  const nonce = crypto.randomUUID();
  const ts = Date.now().toString();
  const payload = `${userId}.${nonce}.${ts}`;
  const sig = await hmacSign(payload, secret);
  return btoa(`${payload}.${sig}`).replace(/=+$/, "");
}

export async function verifyState(state: string, secret: string): Promise<{ userId: string } | null> {
  try {
    const decoded = atob(state.replace(/-/g, "+").replace(/_/g, "/"));
    const parts = decoded.split(".");
    if (parts.length !== 4) return null;
    const [userId, nonce, ts, sig] = parts;
    const expected = await hmacSign(`${userId}.${nonce}.${ts}`, secret);
    if (sig !== expected) return null;
    if (Date.now() - Number(ts) > 30 * 60 * 1000) return null;
    return { userId };
  } catch {
    return null;
  }
}

// Refresh access_token if it's expired (or about to expire).
// Returns a fresh access_token, persisting any updates back to the DB.
export async function getValidAccessToken(admin: any, userId: string): Promise<{ token: string; row: any } | { error: string }> {
  const { data: row } = await admin
    .from("google_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!row) return { error: "not_connected" };

  const expiresAt = new Date(row.expiry).getTime();
  if (expiresAt - 60_000 > Date.now()) {
    return { token: row.access_token, row };
  }

  if (!row.refresh_token) return { error: "no_refresh_token" };

  const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    console.error("token refresh failed:", r.status, text);
    return { error: "refresh_failed" };
  }
  const tok = await r.json();
  const newExpiry = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  await admin.from("google_connections").update({
    access_token: tok.access_token,
    expiry: newExpiry,
  }).eq("user_id", userId);
  return { token: tok.access_token, row: { ...row, access_token: tok.access_token, expiry: newExpiry } };
}

export async function googleFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers });
}

// Tiny helper to call AI for summaries / drafts. Prefers free Gemini API key.
export async function aiComplete(systemPrompt: string, userPrompt: string, _model?: string): Promise<string> {
  const gemini = Deno.env.get("GEMINI_API_KEY");
  const url = gemini
    ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const key = gemini ?? Deno.env.get("LOVABLE_API_KEY");
  const model = gemini ? "gemini-2.5-flash" : (_model ?? "google/gemini-2.5-flash");
  if (!key) return "";
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!r.ok) {
    console.error("AI error", r.status, await r.text());
    return "";
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Auth helper: verify caller's JWT via the publishable-key client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
export async function getCallerUserId(req: Request): Promise<{ userId: string } | { error: Response }> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  return { userId: data.user.id };
}

export function adminClient() {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
