// Builds the Google OAuth consent URL for the calling user.
// Returns { url } — the frontend then redirects the browser there.
import { GOOGLE_SCOPES, corsHeaders, jsonResponse, buildState, getCallerUserId } from "../_shared/google.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await getCallerUserId(req);
    if ("error" in auth) return auth.error;

    const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!CLIENT_ID || !REDIRECT_URI) return jsonResponse({ error: "Google OAuth not configured" }, 500);

    const state = await buildState(auth.userId, SERVICE_KEY);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      scope: GOOGLE_SCOPES.join(" "),
      state,
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return jsonResponse({ url });
  } catch (e: any) {
    console.error("google-oauth-start error:", e);
    return jsonResponse({ error: e?.message ?? "Unknown error" }, 500);
  }
});
