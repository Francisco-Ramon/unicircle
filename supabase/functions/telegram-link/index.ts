// Mr. Cisco — Telegram link helper
// Authenticated user-side endpoint:
//   POST { action: "generate_code" }    -> { code, expires_at }
//   POST { action: "status" }           -> { linked, connection? }
//   POST { action: "unlink" }           -> { success }
//   POST { action: "set_webhook", url } -> registers Telegram webhook (admin)
//   POST { action: "webhook_info" }     -> Telegram getWebhookInfo
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
    const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

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
      await admin.from("telegram_link_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("used_at", null);

      // Try a few times in case of code collision
      let code = "";
      for (let i = 0; i < 5; i++) {
        const candidate = generateCode();
        const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const { error } = await admin.from("telegram_link_codes").insert({
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
      const { data: conn } = await admin.from("telegram_connections")
        .select("telegram_username, telegram_first_name, linked_at, last_message_at, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      return new Response(JSON.stringify({ linked: !!conn, connection: conn ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unlink") {
      await admin.from("telegram_connections")
        .update({ status: "revoked" })
        .eq("user_id", userId)
        .eq("status", "active");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_webhook") {
      if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not configured");
      const url = body.url as string;
      if (!url) throw new Error("url required");
      const payload: any = { url, allowed_updates: ["message"] };
      if (SECRET) payload.secret_token = SECRET;
      const r = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await r.json();
      return new Response(JSON.stringify(result), {
        status: r.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "webhook_info") {
      if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not configured");
      const r = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
      const result = await r.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("telegram-link error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
