// Mr. Cisco — WhatsApp link helper
// Authenticated user-side endpoint:
//   POST { action: "generate_code" }    -> { code, expires_at }
//   POST { action: "status" }           -> { linked, connection? }
//   POST { action: "unlink" }           -> { success }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCode(): string {
  // 6-digit zero-padded
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "generate_code") {
      // Invalidate prior unused codes for this user
      await admin.from("whatsapp_link_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("used_at", null);

      // Try a few times in case of code collision
      let code = "";
      for (let i = 0; i < 5; i++) {
        const candidate = generateCode();
        const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const { error } = await admin.from("whatsapp_link_codes").insert({
          user_id: userId, code: candidate, expires_at: expires,
        });
        if (!error) { code = candidate; break; }
      }
      if (!code) throw new Error("Could not allocate link code");
      return new Response(JSON.stringify({ code, expires_in_seconds: 600 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const { data: conn } = await admin.from("whatsapp_connections")
        .select("whatsapp_phone, whatsapp_name, linked_at, last_message_at, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      return new Response(JSON.stringify({ linked: !!conn, connection: conn ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unlink") {
      await admin.from("whatsapp_connections")
        .update({ status: "revoked" })
        .eq("user_id", userId)
        .eq("status", "active");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("whatsapp-link error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
