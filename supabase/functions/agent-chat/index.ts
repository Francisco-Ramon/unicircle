// Mr. Cisco — Executive Agent (tool-calling + RAG + persistent memory)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runAgentLoop } from "../_shared/agent-tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Mr. Cisco, a professional executive assistant.

CONVERSATION STYLE:
- Short, conversational, one idea at a time. 1–3 sentences by default.
- Only use bullets when the user asks for a summary, plan, or briefing.
- Never preface with "Certainly" or "As an AI". Just answer.

PERSONA:
- Calm, sharp, proactive. CEO-level clarity without verbosity.

TOOL USE (CRITICAL — DO NOT SKIP):
- You have real tools connected to the user's Gmail, Google Calendar, tasks, and books. USE THEM.
- If the user asks anything about email, inbox, mail, messages → CALL summarize_inbox or list_unread_emails. Do not say "what can I help with" — go fetch it.
- If the user asks about today / schedule / calendar / meetings → CALL list_today_events or list_upcoming_events.
- If the user asks about tasks / todos → CALL list_tasks.
- If the user asks about books / reading → CALL list_books.
- If the user asks for a daily briefing / morning brief / what's on today → CALL generate_daily_briefing AND list_today_events AND summarize_inbox, then synthesize.
- If a tool returns { error: "not_connected" } for Gmail/Calendar, tell the user to connect Google in Settings — but only after you actually tried.
- Never claim you cannot read email or calendar. You can. Just call the tool.

APPROVAL DISCIPLINE (CRITICAL):
- NEVER send an email. You can only DRAFT email replies. After drafting, show the draft and ask the user to approve/edit before anything is sent. (Sending is not even available to you.)
- NEVER create a calendar event without explicit user approval. The flow is:
    1. Use propose_calendar_event to stage the event.
    2. Show the proposed event back to the user and ask: "Do you want me to add this to your calendar?"
    3. Only call create_calendar_event(approved: true) AFTER the user clearly says yes.
- If a Gmail or Calendar tool returns { error: "not_connected" }, tell the user to connect Google in Settings — do not attempt anything else.

DOCUMENTS:
- If document context is provided in [DOCUMENTS], cite the filename when you use it: e.g. "From contract.pdf: ...".
- If the user asks about something outside the documents, answer normally without forcing them in.

CAPABILITIES (via tools):
- Gmail (read + summarize + draft only — never send).
- Google Calendar (read events, find free time, propose + create events with approval).
- Tasks, Reading (real DB).

WHEN YOU USE A TOOL:
- State the result in ONE short sentence, then offer one next step.
- Only produce a full structured briefing when the user explicitly asks for one.`;

// Tool definitions and executor live in _shared/agent-tools.ts (shared with telegram-webhook).

// ---------- RAG helpers ----------
async function embedQuery(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.data[0].embedding;
  } catch { return null; }
}

async function summarizeOldMessages(messages: any[], apiKey: string, useGroq: boolean): Promise<string> {
  const text = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");
  const url = useGroq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const model = useGroq ? "llama-3.3-70b-versatile" : "google/gemini-2.5-flash";
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Summarize the following conversation in 4-6 bullet points capturing key facts, decisions, and unresolved threads. Be terse." },
        { role: "user", content: text },
      ],
    }),
  });
  if (!resp.ok) return "";
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function generateTitle(firstUserMessage: string, apiKey: string, useGroq: boolean): Promise<string> {
  const url = useGroq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const model = useGroq ? "llama-3.3-70b-versatile" : "google/gemini-2.5-flash";
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Generate a 3-6 word title for this chat. Plain text, no quotes, no punctuation at end." },
        { role: "user", content: firstUserMessage.slice(0, 500) },
      ],
    }),
  });
  if (!resp.ok) return "New conversation";
  const data = await resp.json();
  const t = (data.choices?.[0]?.message?.content ?? "New conversation").trim().replace(/^["']|["']$/g, "").slice(0, 80);
  return t || "New conversation";
}

// Detect whether the latest user message likely needs document RAG
function needsDocumentContext(text: string): boolean {
  const lower = text.toLowerCase();
  const triggers = ["document", "file", "pdf", "uploaded", "attached", "what does", "summarize this", "summarize the", "according to", "in the", "from the"];
  return triggers.some((t) => lower.includes(t));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages: clientMessages, conversation_id } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const useGroq = !!GROQ_API_KEY;
    const AI_KEY = GROQ_API_KEY ?? LOVABLE_API_KEY ?? "";
    if (!AI_KEY) throw new Error("No AI API key configured (GROQ_API_KEY or LOVABLE_API_KEY)");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure conversation exists & is owned by user
    const { data: convo } = await supabase.from("conversations").select("*").eq("id", conversation_id).maybeSingle();
    let conversation = convo;
    if (!conversation) {
      const { data: created, error: createErr } = await supabase.from("conversations").insert({
        id: conversation_id, user_id: userId, title: "New conversation",
      }).select().single();
      if (createErr) throw new Error(createErr.message);
      conversation = created;
    } else if (conversation.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = clientMessages[clientMessages.length - 1];
    if (userMsg?.role !== "user") {
      return new Response(JSON.stringify({ error: "Last message must be user" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist user message
    await supabase.from("chat_messages").insert({
      user_id: userId, conversation_id, role: "user", content: userMsg.content,
    });

    // Load full history from DB (source of truth)
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    const allMsgs = (history ?? []).map((m: any) => ({ role: m.role, content: m.content }));

    // Sliding window: last 20, summarize older into rolling summary
    const KEEP = 20;
    let summary = conversation.summary ?? "";
    if (allMsgs.length > KEEP + 5) {
      const older = allMsgs.slice(0, allMsgs.length - KEEP);
      // Only re-summarize if there are notably more old msgs than last summary covered
      const newSummary = await summarizeOldMessages(older, AI_KEY, useGroq);
      if (newSummary) {
        summary = newSummary;
        await supabase.from("conversations").update({ summary }).eq("id", conversation_id);
      }
    }
    const recent = allMsgs.slice(-KEEP);

    // Document context: pull all chunks for documents attached to this conversation
    // (keyword-triggered to keep prompts small for unrelated questions).
    let docContext = "";
    if (needsDocumentContext(userMsg.content)) {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, filename")
        .eq("user_id", userId)
        .eq("conversation_id", conversation_id)
        .eq("status", "ready");

      if (docs && docs.length > 0) {
        const docIds = docs.map((d: any) => d.id);
        const { data: chunks } = await supabase
          .from("document_chunks")
          .select("document_id, chunk_index, content")
          .in("document_id", docIds)
          .order("document_id", { ascending: true })
          .order("chunk_index", { ascending: true })
          .limit(40); // ~60K chars max

        if (chunks && chunks.length > 0) {
          const byDoc = new Map<string, string>();
          for (const d of docs) byDoc.set(d.id, d.filename);
          const grouped = new Map<string, string[]>();
          for (const c of chunks as any[]) {
            const arr = grouped.get(c.document_id) ?? [];
            arr.push(c.content);
            grouped.set(c.document_id, arr);
          }
          const parts: string[] = [];
          for (const [docId, contents] of grouped) {
            parts.push(`--- ${byDoc.get(docId) ?? "document"} ---\n${contents.join("\n")}`);
          }
          docContext = "[DOCUMENTS — verbatim contents below. Quote the filename when answering.]\n" + parts.join("\n\n");
        }
      }
    }

    // Assemble system prompt
    const sysParts = [SYSTEM_PROMPT];
    if (summary) sysParts.push(`\n[CONVERSATION SUMMARY SO FAR]\n${summary}`);
    if (docContext) sysParts.push(`\n${docContext}`);

    let finalContent = "";
    let toolEvents: any[] = [];
    try {
      const result = await runAgentLoop({
        apiKey: AI_KEY,
        systemPrompt: sysParts.join("\n"),
        messages: recent,
        supabase,
        userId,
        maxIterations: 6,
      });
      finalContent = result.content;
      toolEvents = result.tools;
    } catch (e: any) {
      const status = e?.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Persist assistant message
    if (finalContent) {
      await supabase.from("chat_messages").insert({
        user_id: userId, conversation_id, role: "assistant", content: finalContent, metadata: { tools: toolEvents },
      });
    }

    // Update conversation: bump last_message_at, generate title if first turn
    const updates: any = { last_message_at: new Date().toISOString() };
    if (!conversation.title_generated) {
      try {
        const newTitle = await generateTitle(userMsg.content, AI_KEY, useGroq);
        updates.title = newTitle;
        updates.title_generated = true;
      } catch (e) {
        console.error("title gen failed:", e);
      }
    }
    await supabase.from("conversations").update(updates).eq("id", conversation_id);

    return new Response(JSON.stringify({ content: finalContent, tools: toolEvents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-chat error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
