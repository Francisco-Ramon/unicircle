// Mr. Cisco — WhatsApp Cloud API Webhook
// Handles GET (Meta verification) and POST (incoming messages).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runAgentLoop } from "../_shared/agent-tools.ts";
import { getValidAccessToken } from "../_shared/google.ts";

const GRAPH_VERSION = "v18.0";

const SYSTEM_PROMPT = `You are Mr. Cisco, a professional executive assistant talking on WhatsApp.

STYLE (CRITICAL for WhatsApp):
- Mobile-first: short, conversational, 1–3 short sentences by default.
- Use line breaks for clarity. WhatsApp supports *bold*, _italic_, ~strike~ and \`code\`.
- One idea per reply. Offer ONE next step.
- Only produce a structured briefing when explicitly asked.

PERSONA:
- Calm, sharp, proactive. Same identity as on the web app.
- Never claim to send emails or create events from WhatsApp — say "I'll queue that for you to confirm in the dashboard."`;

async function sendWhatsAppText(phoneNumberId: string, token: string, to: string, body: string) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: body.slice(0, 4000) },
    }),
  });
  if (!r.ok) console.error("whatsapp send failed", r.status, await r.text());
  return r;
}

async function ensureWhatsAppConversation(
  supabase: any,
  userId: string,
  connectionId: string,
  fromPhone: string,
  contactName: string | null,
  isCompanyMode: boolean
): Promise<string> {
  if (!isCompanyMode) {
    const { data: conn } = await supabase
      .from("whatsapp_connections")
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
      .insert({ user_id: userId, title: "WhatsApp Direct", title_generated: true })
      .select("id").single();
    if (error) throw new Error(error.message);

    await supabase.from("whatsapp_connections").update({ conversation_id: created.id }).eq("id", connectionId);
    return created.id;
  } else {
    // Company mode: create/retrieve a unique thread per customer
    const title = contactName ? `WhatsApp: ${contactName} (${fromPhone})` : `WhatsApp: ${fromPhone}`;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("title", title)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title, title_generated: true })
      .select("id").single();
    if (error) throw new Error(error.message);

    return created.id;
  }
}

async function callAgent(messages: any[], apiKey: string, supabase: any, userId: string, systemPrompt: string = SYSTEM_PROMPT): Promise<string> {
  try {
    const { content } = await runAgentLoop({
      apiKey, systemPrompt, messages, supabase, userId, maxIterations: 6,
    });
    return content;
  } catch (e: any) {
    console.error("agent loop error:", e);
    if (e?.status === 429) return "I'm being rate-limited right now. Try again in a moment.";
    if (e?.status === 402) return "AI credits exhausted. Please top up in the dashboard.";
    return "Something went wrong reaching the AI. Try again shortly.";
  }
}

Deno.serve(async (req) => {
  const VERIFY_TOKEN = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
  const LOVABLE_API_KEY = GROQ_API_KEY || Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("GEMINI_API_KEY") || "";

  // ---------- GET: Meta webhook verification ----------
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      console.log("WhatsApp webhook verified");
      return new Response(challenge ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    console.warn("WhatsApp verification failed", { mode, tokenMatch: token === VERIFY_TOKEN });
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error("WhatsApp credentials missing");
    return new Response("ok", { status: 200 }); // ack so Meta stops retrying
  }
  if (!LOVABLE_API_KEY) {
    console.error("No AI key (GROQ_API_KEY, LOVABLE_API_KEY, or GEMINI_API_KEY) configured");
    return new Response("ok", { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: any;
  try { payload = await req.json(); }
  catch { return new Response("Bad JSON", { status: 400 }); }

  // Iterate entries → changes → messages (Meta sends batched events)
  const entries = payload.entry ?? [];
  for (const entry of entries) {
    const changes = entry.changes ?? [];
    for (const change of changes) {
      const value = change.value ?? {};
      const messages = value.messages ?? [];
      const contacts = value.contacts ?? [];

      for (const msg of messages) {
        try {
          await handleMessage(msg, contacts, supabase, ACCESS_TOKEN, PHONE_NUMBER_ID, LOVABLE_API_KEY, value.metadata);
        } catch (e: any) {
          console.error("whatsapp message handler error:", e);
        }
      }
    }
  }

  return new Response("ok", { status: 200 });
});

function needsDocumentContext(text: string): boolean {
  const lower = text.toLowerCase();
  const triggers = ["document", "file", "pdf", "uploaded", "attached", "what does", "summarize this", "summarize the", "according to", "in the", "from the", "pricing", "services", "hours", "info", "details", "contact"];
  return triggers.some((t) => lower.includes(t));
}

async function handleMessage(
  msg: any,
  contacts: any[],
  supabase: any,
  accessToken: string,
  phoneNumberId: string,
  lovableApiKey: string,
  metadata?: { display_phone_number?: string; phone_number_id?: string }
) {
  const messageId = msg.id as string;
  const fromPhone = msg.from as string; // sender phone
  if (!messageId || !fromPhone) return;

  // Idempotency
  const { error: logErr } = await supabase.from("whatsapp_messages_log").insert({
    whatsapp_message_id: messageId,
    whatsapp_phone: fromPhone,
    payload: msg,
  });
  if (logErr && (logErr as any).code === "23505") {
    console.log("duplicate whatsapp message", messageId);
    return;
  }

  // Only handle text for now — politely reject media/other types
  let text = "";
  if (msg.type === "text") text = (msg.text?.body ?? "").trim();
  else if (msg.type === "button") text = (msg.button?.text ?? "").trim();
  else if (msg.type === "interactive") {
    text = msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? "";
  }

  const contactName = contacts.find((c: any) => c.wa_id === fromPhone)?.profile?.name ?? null;

  // Connection lookup:
  // 1. Check if a company connection matches metadata.display_phone_number (Company Mode)
  let connection = null;
  let isCompanyMode = false;
  const displayPhone = metadata?.display_phone_number;
  
  if (displayPhone) {
    const { data: conn } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("whatsapp_phone", displayPhone)
      .eq("status", "active")
      .maybeSingle();
    if (conn) {
      connection = conn;
      isCompanyMode = true;
    }
  }

  // 2. Fall back to checking if connection is personal assistant mode (whatsapp_phone = fromPhone)
  if (!connection) {
    const { data: conn } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("whatsapp_phone", fromPhone)
      .eq("status", "active")
      .maybeSingle();
    if (conn) {
      connection = conn;
      isCompanyMode = false;
    }
  }

  // ---------- Commands (always available, even unlinked) ----------
  if (text.startsWith("/")) {
    const [cmd, ...rest] = text.split(/\s+/);
    const arg = rest.join(" ").trim();

    if (cmd === "/start" || cmd === "/help") {
      const greeting = connection
        ? `Welcome back. I'm *Mr. Cisco*. Just send me a message and I'll help.\n\nCommands:\n/status — check link\n/newchat — fresh thread\n/help — this menu`
        : `Hi, I'm *Mr. Cisco*, your executive assistant.\n\nTo connect this WhatsApp to your account:\n1. Open the dashboard → Settings → WhatsApp\n2. Generate a 6-digit code\n3. Send it here as: /link 123456`;
      await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, greeting);
      return;
    }

    if (cmd === "/status") {
      const reply = connection
        ? `✅ Linked since ${new Date(connection.linked_at).toLocaleDateString()}.`
        : `Not linked yet. Generate a code in the dashboard (Settings → WhatsApp) and send /link 123456.`;
      await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, reply);
      return;
    }

    if (cmd === "/link") {
      if (connection) {
        await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, "Already linked. Use /status for details.");
        return;
      }
      const code = arg.replace(/\D/g, "");
      if (!/^\d{6}$/.test(code)) {
        await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, "Send a 6-digit code: /link 123456. Generate one in the dashboard.");
        return;
      }
      const { data: linkRow } = await supabase
        .from("whatsapp_link_codes")
        .select("*")
        .eq("code", code)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (!linkRow) {
        await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, "That code is invalid or expired. Generate a fresh one in the dashboard.");
        return;
      }

      // Revoke any prior connections for the same user or phone
      await supabase.from("whatsapp_connections")
        .update({ status: "revoked" })
        .or(`user_id.eq.${linkRow.user_id},whatsapp_phone.eq.${fromPhone}`)
        .eq("status", "active");

      const { error: insErr } = await supabase.from("whatsapp_connections").insert({
        user_id: linkRow.user_id,
        whatsapp_phone: fromPhone,
        whatsapp_name: contactName,
        status: "active",
        last_message_at: new Date().toISOString(),
      });
      if (insErr) {
        console.error("whatsapp link insert failed:", insErr);
        await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, `Linking failed: ${insErr.message}`);
        return;
      }

      await supabase.from("whatsapp_link_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", linkRow.id);

      await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, "✅ Linked. I'm Mr. Cisco — what's on your mind?");
      return;
    }

    if (cmd === "/newchat") {
      if (!connection) {
        await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, "Link your account first with /link.");
        return;
      }
      await supabase.from("whatsapp_connections")
        .update({ conversation_id: null })
        .eq("id", connection.id);
      await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, "🧹 Fresh thread started. What's up?");
      return;
    }

    await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, "Unknown command. Try /help.");
    return;
  }

  // ---------- Plain message ----------
  if (!connection) {
    await sendWhatsAppText(phoneNumberId, accessToken, fromPhone,
      "You're not linked yet. Open the dashboard → Settings → WhatsApp, generate a 6-digit code, then send: /link 123456");
    return;
  }

  if (!text) {
    await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, "I can only read text messages right now. Send me a note and I'll help.");
    return;
  }

  const userId = connection.user_id;
  const conversationId = await ensureWhatsAppConversation(supabase, userId, connection.id, fromPhone, contactName, isCompanyMode);

  await supabase.from("chat_messages").insert({
    user_id: userId,
    conversation_id: conversationId,
    role: "user",
    content: text,
    channel: "whatsapp",
    external_message_id: messageId,
    metadata: { whatsapp_phone: fromPhone, whatsapp_name: contactName },
  });

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  const recent = (history ?? []).map((m: any) => ({ role: m.role, content: m.content })).slice(-20);

  // Load writing style preference or dynamically learn it from Gmail
  let learnedStyle = "";
  try {
    const { data: pref } = await supabase
      .from("preferences")
      .select("value")
      .eq("user_id", userId)
      .eq("key", "whatsapp_learned_style")
      .maybeSingle();

    if (pref?.value?.style) {
      learnedStyle = pref.value.style;
    } else {
      // If Gmail is linked, fetch sent emails to analyze and cache the style
      const g = await getValidAccessToken(supabase, userId);
      if (g && !("error" in g)) {
        const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:me&maxResults=5", {
          headers: { Authorization: `Bearer ${g.token}` }
        });
        if (gmailRes.ok) {
          const gmailData = await gmailRes.json();
          const messages = gmailData.messages || [];
          const emailBodies: string[] = [];
          
          for (const msg of messages) {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
              headers: { Authorization: `Bearer ${g.token}` }
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              let body = "";
              const payload = detailData.payload;
              if (payload) {
                if (payload.body?.data) {
                  const b64 = payload.body.data.replace(/-/g, "+").replace(/_/g, "/");
                  body = new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
                } else if (payload.parts) {
                  const plain = payload.parts.find((p: any) => p.mimeType === "text/plain");
                  if (plain?.body?.data) {
                    const b64 = plain.body.data.replace(/-/g, "+").replace(/_/g, "/");
                    body = new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
                  }
                }
              }
              if (body) {
                emailBodies.push(body.slice(0, 1000));
              }
            }
          }

          if (emailBodies.length > 0) {
            const styleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${lovableApiKey}`;
            const analysisPrompt = `Analyze the writing style of these emails sent by the user to clients/respondents. Identify their tone (formal/informal/brief), typical greetings, signatures, average sentence count, emoji usage, and level of detail. Summarize these rules in 3 short bullet points to guide an assistant who will reply in their style:\n\n${emailBodies.join("\n\n---\n\n")}`;
            
            const analysisRes = await fetch(styleEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: analysisPrompt }] }]
              })
            });
            if (analysisRes.ok) {
              const analysisData = await analysisRes.json();
              learnedStyle = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (learnedStyle) {
                await supabase.from("preferences").upsert({
                  user_id: userId,
                  key: "whatsapp_learned_style",
                  value: { style: learnedStyle, updated_at: new Date().toISOString() }
                }, { onConflict: "user_id,key" });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error learning user writing style:", err);
  }

  // Document RAG: fetch relevant documents for this user
  let docContext = "";
  try {
    if (needsDocumentContext(text)) {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, filename")
        .eq("user_id", userId)
        .eq("status", "ready");

      if (docs && docs.length > 0) {
        const docIds = docs.map((d: any) => d.id);
        const { data: chunks } = await supabase
          .from("document_chunks")
          .select("document_id, content")
          .in("document_id", docIds)
          .limit(20);

        if (chunks && chunks.length > 0) {
          const byDoc = new Map<string, string>();
          for (const d of docs) byDoc.set(d.id, d.filename);
          const parts: string[] = [];
          for (const c of chunks as any[]) {
            parts.push(`[Document: ${byDoc.get(c.document_id)}]\n${c.content}`);
          }
          docContext = "\n\n[RELEVANT BUSINESS DOCUMENTS / INFORMATION]\n" + parts.join("\n\n");
        }
      }
    }
  } catch (docErr) {
    console.error("Error fetching documents for WhatsApp RAG:", docErr);
  }

  let basePrompt = SYSTEM_PROMPT;
  if (isCompanyMode) {
    basePrompt = `You are Mr. Cisco, representing the user's company as a professional customer service representative.
You are chatting with a client or respondent on WhatsApp. Be helpful, professional, and clear. Use the writing style rules learned from the user's past client replies to match their tone and signature.

STYLE (CRITICAL for WhatsApp):
- Mobile-first: short, conversational, 1–3 short sentences by default.
- Use line breaks for clarity. WhatsApp supports *bold*, _italic_, ~strike~ and \`code\`.
- One idea per reply. Offer ONE next step.
- Only produce a structured briefing when explicitly asked.

PERSONA:
- Calm, sharp, proactive.`;
  }

  let customSystemPrompt = learnedStyle
    ? `${basePrompt}\n\nWRITING STYLE (LEARNED FROM USER SENT EMAILS):\n${learnedStyle}`
    : basePrompt;

  if (docContext) {
    customSystemPrompt += docContext;
  }

  const reply = await callAgent(recent, lovableApiKey, supabase, userId, customSystemPrompt);
  const finalReply = reply || "I didn't catch that — could you rephrase?";

  await supabase.from("chat_messages").insert({
    user_id: userId,
    conversation_id: conversationId,
    role: "assistant",
    content: finalReply,
    channel: "whatsapp",
    metadata: { whatsapp_phone: fromPhone },
  });

  await supabase.from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  await supabase.from("whatsapp_connections")
    .update({ last_message_at: new Date().toISOString(), whatsapp_name: contactName ?? connection.whatsapp_name })
    .eq("id", connection.id);

  await sendWhatsAppText(phoneNumberId, accessToken, fromPhone, finalReply);

  await supabase.from("whatsapp_messages_log")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("whatsapp_message_id", messageId);
}
