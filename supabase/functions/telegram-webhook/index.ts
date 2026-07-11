// Mr. Cisco — Telegram Webhook
// Receives Telegram updates, handles commands, links accounts, and replies via AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runAgentLoop } from "../_shared/agent-tools.ts";

const TG_API = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

const SYSTEM_PROMPT = `You are Mr. Cisco, a professional executive assistant talking on Telegram.

STYLE: Mobile-first. 1–3 short sentences. Light markdown only (*bold*, _italic_). One idea per reply.

TOOL USE (CRITICAL — DO NOT SKIP):
- You have real tools wired to the user's Gmail, Google Calendar, tasks, and books. USE THEM.
- "check my email" / "what's in my inbox" / "any new mail" → CALL summarize_inbox or list_unread_emails.
- "what's on today" / "my schedule" / "calendar" → CALL list_today_events.
- "tasks" / "todos" → CALL list_tasks.
- "books" / "reading" → CALL list_books.
- "daily briefing" / "morning brief" → CALL generate_daily_briefing + list_today_events + summarize_inbox.
- If a Google tool returns { error: "not_connected" }, tell the user to connect Google in the dashboard Settings.
- Never say you can't read email/calendar — you can. Call the tool.

APPROVAL: Never send email. Drafts only, surfaced in the dashboard. For calendar events, propose first and ask the user to confirm in the dashboard.`;

async function tg(token: string, method: string, body: any) {
  const r = await fetch(TG_API(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error(`telegram ${method} failed`, r.status, await r.text());
  return r;
}

async function sendMessage(token: string, chat_id: number, text: string) {
  return tg(token, "sendMessage", { chat_id, text, parse_mode: "Markdown", disable_web_page_preview: true });
}

async function sendChatAction(token: string, chat_id: number, action: string) {
  return tg(token, "sendChatAction", { chat_id, action });
}

function extractAiText(message: any): string {
  const content = message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((part: any) => typeof part === "string" ? part : (part?.text ?? part?.content ?? "")).join("").trim();
  }
  return typeof message?.text === "string" ? message.text.trim() : "";
}

async function callTextOnlyFallback(_apiKey: string, text: string): Promise<string> {
  const groq = Deno.env.get("GROQ_API_KEY");
  const gemini = Deno.env.get("GEMINI_API_KEY");
  const url = groq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : gemini
    ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const key = groq ?? gemini ?? Deno.env.get("LOVABLE_API_KEY") ?? "";
  const model = groq ? "llama-3.3-70b-versatile" : gemini ? "gemini-2.5-flash-lite" : "google/gemini-2.5-flash-lite";
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nReply directly to this Telegram message. Do not call tools.` },
        { role: "user", content: text },
      ],
    }),
  });
  if (!resp.ok) {
    console.error("telegram text-only fallback failed:", resp.status, await resp.text());
    return "";
  }
  const data = await resp.json();
  return extractAiText(data.choices?.[0]?.message);
}

async function ensureTelegramConversation(supabase: any, userId: string, connectionId: string): Promise<string> {
  const { data: conn } = await supabase
    .from("telegram_connections")
    .select("conversation_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (conn?.conversation_id) {
    const { data: existing } = await supabase
      .from("conversations").select("id").eq("id", conn.conversation_id).maybeSingle();
    if (existing) return existing.id;
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title: "Telegram", title_generated: true })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("telegram_connections").update({ conversation_id: created.id }).eq("id", connectionId);
  return created.id;
}

async function callAgent(
  messages: any[],
  apiKey: string,
  supabase: any,
  userId: string,
): Promise<string> {
  try {
    const { content } = await runAgentLoop({
      apiKey,
      systemPrompt: SYSTEM_PROMPT,
      messages,
      supabase,
      userId,
      maxIterations: 6,
    });
    if (content?.trim()) return content.trim();
    console.warn("agent loop returned empty content; using telegram text-only fallback");
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";
    return await callTextOnlyFallback(apiKey, lastUser);
  } catch (e: any) {
    console.error("agent loop error:", e);
    if (e?.status === 429) return "I'm being rate-limited right now. Try again in a moment.";
    if (e?.status === 402) return "AI credits exhausted. Please top up in the dashboard.";
    return "Something went wrong reaching the AI. Try again shortly.";
  }
}

Deno.serve(async (req) => {
  const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
  const AI_KEY = GROQ_API_KEY || GEMINI_API_KEY || LOVABLE_API_KEY;

  if (!TOKEN) return new Response("Bot token missing", { status: 500 });
  if (!AI_KEY) return new Response("AI key missing", { status: 500 });

  // Telegram webhook secret check
  if (SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== SECRET) {
      console.warn("Bad webhook secret");
      return new Response("Forbidden", { status: 403 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  // Idempotency: log + dedupe
  if (update.update_id != null) {
    const { error: logErr } = await supabase.from("telegram_updates_log").insert({
      telegram_update_id: update.update_id,
      telegram_chat_id: update.message?.chat?.id ?? null,
      telegram_user_id: update.message?.from?.id ?? null,
      payload: update,
    });
    // unique violation = duplicate, ack and exit
    if (logErr && (logErr as any).code === "23505") {
      return new Response("ok", { status: 200 });
    }
  }

  const message = update.message;
  if (!message || !message.text) return new Response("ok", { status: 200 });

  const chatId = message.chat.id as number;
  const fromId = message.from.id as number;
  const username = message.from.username as string | undefined;
  const firstName = message.from.first_name as string | undefined;
  const text = (message.text as string).trim();

  // Find existing active connection for this chat
  const { data: connection } = await supabase
    .from("telegram_connections")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .eq("status", "active")
    .maybeSingle();

  // ---------- Commands ----------
  if (text.startsWith("/")) {
    const [cmd, ...rest] = text.split(/\s+/);
    const arg = rest.join(" ").trim();

    if (cmd === "/start") {
      const greeting = connection
        ? `Welcome back. I'm Mr. Cisco. Your account is linked — just send a message and I'll help.`
        : `Hi, I'm *Mr. Cisco*, your executive assistant.\n\nTo connect this chat to your account:\n1. Open the dashboard → Settings → Telegram\n2. Generate a 6-digit code\n3. Send it here as: \`/link 123456\`\n\nUse /help to see what I can do.`;
      await sendMessage(TOKEN, chatId, greeting);
      return new Response("ok");
    }

    if (cmd === "/help") {
      await sendMessage(TOKEN, chatId,
        `*Mr. Cisco — commands*\n\n/start — intro\n/link CODE — connect this chat to your account\n/status — check link status\n/newchat — start a fresh thread\n/help — this menu\n\nOnce linked, just message me naturally — daily plans, summaries, briefings.`);
      return new Response("ok");
    }

    if (cmd === "/status") {
      if (connection) {
        await sendMessage(TOKEN, chatId, `✅ Linked since ${new Date(connection.linked_at).toLocaleDateString()}.`);
      } else {
        await sendMessage(TOKEN, chatId, `Not linked yet. Generate a code in the dashboard (Settings → Telegram) and send \`/link 123456\`.`);
      }
      return new Response("ok");
    }

    if (cmd === "/link") {
      if (connection) {
        await sendMessage(TOKEN, chatId, `Already linked. Use /status for details.`);
        return new Response("ok");
      }
      const code = arg.replace(/\D/g, "");
      if (!/^\d{6}$/.test(code)) {
        await sendMessage(TOKEN, chatId, `Send a 6-digit code: \`/link 123456\`. Generate one in the dashboard.`);
        return new Response("ok");
      }
      const { data: linkRow } = await supabase
        .from("telegram_link_codes")
        .select("*")
        .eq("code", code)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (!linkRow) {
        await sendMessage(TOKEN, chatId, `That code is invalid or expired. Generate a fresh one in the dashboard.`);
        return new Response("ok");
      }

      // Deactivate any prior connections for same user or chat
      await supabase.from("telegram_connections")
        .update({ status: "revoked" })
        .or(`user_id.eq.${linkRow.user_id},telegram_chat_id.eq.${chatId}`)
        .eq("status", "active");

      const { error: insErr } = await supabase.from("telegram_connections").insert({
        user_id: linkRow.user_id,
        telegram_user_id: fromId,
        telegram_chat_id: chatId,
        telegram_username: username ?? null,
        telegram_first_name: firstName ?? null,
        status: "active",
        last_message_at: new Date().toISOString(),
      });
      if (insErr) {
        console.error("link insert failed:", insErr);
        await sendMessage(TOKEN, chatId, `Linking failed: ${insErr.message}`);
        return new Response("ok");
      }

      await supabase.from("telegram_link_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", linkRow.id);

      await sendMessage(TOKEN, chatId, `✅ Linked. I'm Mr. Cisco — what's on your mind?`);
      return new Response("ok");
    }

    if (cmd === "/newchat") {
      if (!connection) {
        await sendMessage(TOKEN, chatId, `Link your account first with /link.`);
        return new Response("ok");
      }
      // Drop the conversation pointer so a fresh one is created on next message
      await supabase.from("telegram_connections")
        .update({ conversation_id: null })
        .eq("id", connection.id);
      await sendMessage(TOKEN, chatId, `🧹 Fresh thread started. What's up?`);
      return new Response("ok");
    }

    await sendMessage(TOKEN, chatId, `Unknown command. Try /help.`);
    return new Response("ok");
  }

  // ---------- Plain message ----------
  if (!connection) {
    await sendMessage(TOKEN, chatId,
      `You're not linked yet. Open the dashboard → Settings → Telegram, generate a 6-digit code, then send: \`/link 123456\``);
    return new Response("ok");
  }

  await sendChatAction(TOKEN, chatId, "typing");

  try {
    const userId = connection.user_id;
    const conversationId = await ensureTelegramConversation(supabase, userId, connection.id);

    // Persist incoming user message
    await supabase.from("chat_messages").insert({
      user_id: userId,
      conversation_id: conversationId,
      role: "user",
      content: text,
      channel: "telegram",
      external_message_id: String(message.message_id),
      metadata: { telegram_chat_id: chatId, telegram_user_id: fromId },
    });

    // Load recent history (last 20)
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    const all = (history ?? []).map((m: any) => ({ role: m.role, content: m.content }));
    const recent = all.slice(-20);

    const reply = await callAgent(recent, AI_KEY, supabase, userId);

    const finalReply = reply || "I'm here. What would you like me to help with?";

    // Persist assistant reply
    await supabase.from("chat_messages").insert({
      user_id: userId,
      conversation_id: conversationId,
      role: "assistant",
      content: finalReply,
      channel: "telegram",
      metadata: { telegram_chat_id: chatId },
    });

    await supabase.from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    await supabase.from("telegram_connections")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", connection.id);

    await sendMessage(TOKEN, chatId, finalReply);

    if (update.update_id != null) {
      await supabase.from("telegram_updates_log")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("telegram_update_id", update.update_id);
    }
  } catch (e: any) {
    console.error("telegram-webhook handler error:", e);
    await sendMessage(TOKEN, chatId, "Something went wrong on my end. Try again in a moment.");
    if (update.update_id != null) {
      await supabase.from("telegram_updates_log")
        .update({ status: "error", error: String(e?.message ?? e), processed_at: new Date().toISOString() })
        .eq("telegram_update_id", update.update_id);
    }
  }

  return new Response("ok", { status: 200 });
});
