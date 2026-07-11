// Public callback Google redirects to after consent.
// Exchanges code for tokens, persists them, then 302-redirects the browser
// back into the app with a success/error query param.
//
// Note: function is named `gmail-oauth-callback` to match the existing
// GOOGLE_REDIRECT_URI secret. It actually handles BOTH Gmail and Calendar
// scopes (granted in one OAuth flow).
import { corsHeaders, verifyState, adminClient } from "../_shared/google.ts";

function appUrlFromReq(req: Request): string {
  const referer = req.headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin; } catch { /* ignore */ }
  }
  // Fallback: derive from origin header
  return req.headers.get("origin") ?? "https://id-preview--4bed0369-78bf-452d-a215-e28656cf2f74.lovable.app";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");

  // Determine where to redirect the user back to in the app.
  // Prefer the state-encoded origin if we have it; fall back to a sane default.
  const APP_BASE = Deno.env.get("APP_BASE_URL") ?? appUrlFromReq(req);
  const settle = (qs: string) =>
    Response.redirect(`${APP_BASE}/settings?${qs}`, 302);

  try {
    if (errParam) return settle(`google_error=${encodeURIComponent(errParam)}`);
    if (!code || !state) return settle("google_error=missing_code");

    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const verified = await verifyState(state, SERVICE_KEY);
    if (!verified) return settle("google_error=invalid_state");

    const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI")!;

    const tokRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    if (!tokRes.ok) {
      console.error("token exchange failed:", tokRes.status, await tokRes.text());
      return settle("google_error=token_exchange_failed");
    }
    const tok = await tokRes.json();

    // Fetch user email
    const meRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const me = meRes.ok ? await meRes.json() : { email: "unknown" };

    const expiry = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
    const scopes = (tok.scope ?? "").split(" ").filter(Boolean);

    const admin = adminClient();
    // Upsert: keep existing refresh_token if Google didn't return a new one
    const { data: existing } = await admin
      .from("google_connections")
      .select("refresh_token")
      .eq("user_id", verified.userId)
      .maybeSingle();

    const refresh_token = tok.refresh_token ?? existing?.refresh_token ?? null;
    if (!refresh_token) {
      // Without a refresh token we can't do offline access; force re-consent next time
      console.warn("No refresh_token returned and none on file for user", verified.userId);
    }

    const { error: upsertErr } = await admin.from("google_connections").upsert({
      user_id: verified.userId,
      google_email: me.email ?? "unknown",
      access_token: tok.access_token,
      refresh_token,
      expiry,
      scopes,
      status: "active",
      connected_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("upsert connection failed:", upsertErr);
      return settle(`google_error=${encodeURIComponent(upsertErr.message)}`);
    }

    await admin.from("activity_logs").insert({
      user_id: verified.userId,
      action: "google_connected",
      metadata: { email: me.email, scopes },
    });

    return settle("google=connected");
  } catch (e: any) {
    console.error("gmail-oauth-callback error:", e);
    return settle(`google_error=${encodeURIComponent(e?.message ?? "unknown")}`);
  }
});
