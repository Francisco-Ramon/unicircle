// Returns the calling user's Google connection status.
// Never returns access_token / refresh_token to the client.
import { corsHeaders, jsonResponse, getCallerUserId, adminClient } from "../_shared/google.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await getCallerUserId(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "status";
    const admin = adminClient();

    if (action === "disconnect") {
      await admin.from("google_connections").delete().eq("user_id", auth.userId);
      await admin.from("activity_logs").insert({
        user_id: auth.userId, action: "google_disconnected", metadata: {},
      });
      return jsonResponse({ success: true });
    }

    const { data: row } = await admin
      .from("google_connections")
      .select("google_email, scopes, status, connected_at")
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (!row || row.status !== "active") {
      return jsonResponse({ connected: false });
    }
    const scopes: string[] = row.scopes ?? [];
    return jsonResponse({
      connected: true,
      email: row.google_email,
      scopes,
      connected_at: row.connected_at,
      gmail_ok: scopes.some((s) => s.includes("gmail.readonly")),
      gmail_compose: scopes.some((s) => s.includes("gmail.compose")),
      calendar_ok: scopes.some((s) => s.includes("calendar")),
    });
  } catch (e: any) {
    console.error("google-status error:", e);
    return jsonResponse({ error: e?.message ?? "Unknown error" }, 500);
  }
});
