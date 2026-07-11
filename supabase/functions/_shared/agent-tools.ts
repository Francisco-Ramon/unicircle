// Shared agent tool definitions + executor used by both agent-chat and telegram-webhook.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getValidAccessToken, googleFetch } from "./google.ts";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary";

function decodeBase64Url(s: string): string {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? b64 + "=".repeat(4 - (b64.length % 4)) : b64;
    return new TextDecoder().decode(Uint8Array.from(atob(pad), (c) => c.charCodeAt(0)));
  } catch { return ""; }
}
function gmailHeader(headers: any[], name: string): string {
  const h = headers?.find((x: any) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}
function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  const parts = payload.parts ?? [];
  const plain = parts.find((p: any) => p.mimeType === "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);
  const html = parts.find((p: any) => p.mimeType === "text/html");
  if (html?.body?.data) return decodeBase64Url(html.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  for (const p of parts) { const v = extractBody(p); if (v) return v; }
  return "";
}

function extractAiText(message: any): string {
  const content = message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((part: any) => {
      if (typeof part === "string") return part;
      if (typeof part?.text === "string") return part.text;
      if (typeof part?.content === "string") return part.content;
      return "";
    }).join("").trim();
  }
  if (typeof content?.text === "string") return content.text.trim();
  if (Array.isArray(content?.parts)) {
    return content.parts.map((part: any) => typeof part?.text === "string" ? part.text : "").join("").trim();
  }
  if (typeof message?.text === "string") return message.text.trim();
  return "";
}

export const agentTools = [
  { type: "function", function: { name: "list_unread_emails", description: "List up to 15 most recent unread Gmail emails (subject/from/snippet only).", parameters: { type: "object", properties: { max: { type: "number" } }, additionalProperties: false } } },
  { type: "function", function: { name: "get_email", description: "Fetch the full body of a specific Gmail email by id.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false } } },
  { type: "function", function: { name: "summarize_inbox", description: "Summarize the user's unread Gmail inbox grouped by urgency with suggested actions.", parameters: { type: "object", properties: { max: { type: "number" } }, additionalProperties: false } } },
  { type: "function", function: { name: "draft_reply", description: "Draft a reply to a specific Gmail email. Saves draft for user approval. NEVER sends.", parameters: { type: "object", properties: { id: { type: "string" }, tone: { type: "string", enum: ["professional", "friendly", "concise", "formal"] }, instructions: { type: "string" } }, required: ["id"], additionalProperties: false } } },
  { type: "function", function: { name: "list_today_events", description: "List today's Google Calendar events.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function", function: { name: "list_upcoming_events", description: "List upcoming Google Calendar events for the next N days (default 7).", parameters: { type: "object", properties: { days: { type: "number" } }, additionalProperties: false } } },
  { type: "function", function: { name: "find_free_time", description: "Find free time slots in the user's calendar today (or specified date).", parameters: { type: "object", properties: { date: { type: "string" }, min_minutes: { type: "number" }, work_start_hour: { type: "number" }, work_end_hour: { type: "number" } }, additionalProperties: false } } },
  { type: "function", function: { name: "propose_calendar_event", description: "Stage a calendar event for the user to approve. Does NOT create it on Google Calendar yet.", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, start_time: { type: "string" }, end_time: { type: "string" } }, required: ["title", "start_time", "end_time"], additionalProperties: false } } },
  { type: "function", function: { name: "create_calendar_event", description: "Create a previously proposed event on Google Calendar. REQUIRES the user explicitly approved it first.", parameters: { type: "object", properties: { pending_id: { type: "string" }, approved: { type: "boolean" } }, required: ["pending_id", "approved"], additionalProperties: false } } },
  { type: "function", function: { name: "create_task", description: "Create a task in the database.", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }, deadline: { type: "string" } }, required: ["title"], additionalProperties: false } } },
  { type: "function", function: { name: "list_tasks", description: "List user's tasks.", parameters: { type: "object", properties: { status: { type: "string", enum: ["pending", "in_progress", "completed", "all"] } }, additionalProperties: false } } },
  { type: "function", function: { name: "complete_task", description: "Mark a task complete.", parameters: { type: "object", properties: { task_id: { type: "string" } }, required: ["task_id"], additionalProperties: false } } },
  { type: "function", function: { name: "add_book", description: "Add a book to the reading room.", parameters: { type: "object", properties: { title: { type: "string" }, author: { type: "string" } }, required: ["title"], additionalProperties: false } } },
  { type: "function", function: { name: "list_books", description: "List user's books.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function", function: { name: "generate_daily_briefing", description: "Aggregate emails, schedule, tasks, reading into a daily briefing.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
];

export async function executeAgentTool(name: string, args: any, supabase: any, userId: string): Promise<any> {
  const log = (action: string, metadata: any = {}) =>
    supabase.from("activity_logs").insert({ user_id: userId, action, metadata });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  async function withGoogle(): Promise<{ token: string } | { error: string }> {
    const t = await getValidAccessToken(admin, userId);
    if ("error" in t) return { error: t.error };
    return { token: t.token };
  }

  switch (name) {
    case "list_unread_emails": {
      const g = await withGoogle(); if ("error" in g) return { error: "not_connected", hint: "Ask the user to connect Google in Settings." };
      const max = Math.min(Number(args.max ?? 10), 20);
      const r = await googleFetch(g.token, `${GMAIL}/messages?q=is:unread&maxResults=${max}`);
      if (!r.ok) return { error: "gmail_failed" };
      const data = await r.json();
      const ids = (data.messages ?? []).map((m: any) => m.id);
      const metas = await Promise.all(ids.map(async (id: string) => {
        const mr = await googleFetch(g.token, `${GMAIL}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
        if (!mr.ok) return null;
        const m = await mr.json();
        return { id: m.id, snippet: m.snippet, from: gmailHeader(m.payload?.headers ?? [], "From"), subject: gmailHeader(m.payload?.headers ?? [], "Subject"), date: gmailHeader(m.payload?.headers ?? [], "Date") };
      }));
      return { emails: metas.filter(Boolean) };
    }
    case "get_email": {
      const g = await withGoogle(); if ("error" in g) return { error: "not_connected" };
      const r = await googleFetch(g.token, `${GMAIL}/messages/${args.id}?format=full`);
      if (!r.ok) return { error: "not_found" };
      const m = await r.json();
      return { id: m.id, from: gmailHeader(m.payload?.headers ?? [], "From"), subject: gmailHeader(m.payload?.headers ?? [], "Subject"), date: gmailHeader(m.payload?.headers ?? [], "Date"), body: extractBody(m.payload).slice(0, 6000) };
    }
    case "summarize_inbox": {
      const g = await withGoogle(); if ("error" in g) return { error: "not_connected", hint: "Ask the user to connect Google in Settings." };
      const max = Math.min(Number(args.max ?? 8), 12);
      const r = await googleFetch(g.token, `${GMAIL}/messages?q=is:unread&maxResults=${max}`);
      if (!r.ok) return { error: "gmail_failed" };
      const data = await r.json();
      const ids = (data.messages ?? []).map((m: any) => m.id);
      if (ids.length === 0) return { summary: "Inbox zero — no unread mail.", count: 0 };
      const items = await Promise.all(ids.map(async (id: string) => {
        const mr = await googleFetch(g.token, `${GMAIL}/messages/${id}?format=full`);
        if (!mr.ok) return null;
        const m = await mr.json();
        return { id, from: gmailHeader(m.payload?.headers ?? [], "From"), subject: gmailHeader(m.payload?.headers ?? [], "Subject"), body: extractBody(m.payload).slice(0, 600) };
      }));
      return { unread_count: ids.length, emails: items.filter(Boolean) };
    }
    case "draft_reply": {
      const g = await withGoogle(); if ("error" in g) return { error: "not_connected" };
      const r = await googleFetch(g.token, `${GMAIL}/messages/${args.id}?format=full`);
      if (!r.ok) return { error: "not_found" };
      const m = await r.json();
      const from = gmailHeader(m.payload?.headers ?? [], "From");
      const subject = gmailHeader(m.payload?.headers ?? [], "Subject");
      const body = extractBody(m.payload).slice(0, 4000);
      return { source: { id: args.id, from, subject, body }, instructions: args.instructions ?? null, tone: args.tone ?? "professional", note: "Write the draft body now and show it to the user for approval. Never send." };
    }
    case "list_today_events": {
      const g = await withGoogle(); if ("error" in g) return { error: "not_connected" };
      const s = new Date(); s.setHours(0,0,0,0);
      const e = new Date(); e.setHours(23,59,59,999);
      const r = await googleFetch(g.token, `${CAL}/events?timeMin=${encodeURIComponent(s.toISOString())}&timeMax=${encodeURIComponent(e.toISOString())}&singleEvents=true&orderBy=startTime`);
      if (!r.ok) return { error: "calendar_failed" };
      const data = await r.json();
      return { events: (data.items ?? []).map((x: any) => ({ id: x.id, title: x.summary, start: x.start?.dateTime ?? x.start?.date, end: x.end?.dateTime ?? x.end?.date })) };
    }
    case "list_upcoming_events": {
      const g = await withGoogle(); if ("error" in g) return { error: "not_connected" };
      const days = Math.min(Number(args.days ?? 7), 30);
      const s = new Date();
      const e = new Date(); e.setDate(e.getDate() + days);
      const r = await googleFetch(g.token, `${CAL}/events?timeMin=${encodeURIComponent(s.toISOString())}&timeMax=${encodeURIComponent(e.toISOString())}&singleEvents=true&orderBy=startTime&maxResults=30`);
      if (!r.ok) return { error: "calendar_failed" };
      const data = await r.json();
      return { events: (data.items ?? []).map((x: any) => ({ id: x.id, title: x.summary, start: x.start?.dateTime ?? x.start?.date, end: x.end?.dateTime ?? x.end?.date })) };
    }
    case "find_free_time": {
      const g = await withGoogle(); if ("error" in g) return { error: "not_connected" };
      const date = args.date ? new Date(args.date) : new Date();
      const ws = new Date(date); ws.setHours(Number(args.work_start_hour ?? 9), 0, 0, 0);
      const we = new Date(date); we.setHours(Number(args.work_end_hour ?? 18), 0, 0, 0);
      const r = await googleFetch(g.token, `${CAL}/events?timeMin=${encodeURIComponent(ws.toISOString())}&timeMax=${encodeURIComponent(we.toISOString())}&singleEvents=true&orderBy=startTime`);
      if (!r.ok) return { error: "calendar_failed" };
      const data = await r.json();
      const busy = (data.items ?? []).filter((e: any) => e.start?.dateTime).map((e: any) => ({ start: new Date(e.start.dateTime), end: new Date(e.end.dateTime) })).sort((a: any, b: any) => a.start - b.start);
      const slots: any[] = [];
      const minMin = Number(args.min_minutes ?? 30);
      let cursor = ws;
      for (const b of busy) {
        if (b.start > cursor) {
          const mins = (b.start.getTime() - cursor.getTime()) / 60000;
          if (mins >= minMin) slots.push({ start: cursor.toISOString(), end: b.start.toISOString(), minutes: Math.round(mins) });
        }
        if (b.end > cursor) cursor = b.end;
      }
      if (cursor < we) {
        const mins = (we.getTime() - cursor.getTime()) / 60000;
        if (mins >= minMin) slots.push({ start: cursor.toISOString(), end: we.toISOString(), minutes: Math.round(mins) });
      }
      return { slots };
    }
    case "propose_calendar_event": {
      const { data, error } = await admin.from("pending_calendar_events").insert({
        user_id: userId, title: args.title, description: args.description ?? null,
        start_time: args.start_time, end_time: args.end_time, status: "pending",
      }).select().single();
      if (error) return { error: error.message };
      return { pending: data, requires_approval: true, ask_user: "Do you want me to add this to your calendar?" };
    }
    case "create_calendar_event": {
      if (!args.approved) return { error: "Approval required. Ask the user first." };
      const g = await withGoogle(); if ("error" in g) return { error: "not_connected" };
      const { data: pending } = await admin.from("pending_calendar_events").select("*").eq("id", args.pending_id).eq("user_id", userId).maybeSingle();
      if (!pending) return { error: "pending_not_found" };
      if (pending.status !== "pending") return { error: "already_resolved", status: pending.status };
      const r = await googleFetch(g.token, `${CAL}/events`, {
        method: "POST",
        body: JSON.stringify({
          summary: pending.title,
          description: pending.description ?? undefined,
          start: { dateTime: new Date(pending.start_time).toISOString() },
          end: { dateTime: new Date(pending.end_time).toISOString() },
        }),
      });
      if (!r.ok) return { error: "calendar_create_failed", detail: await r.text() };
      const created = await r.json();
      await admin.from("pending_calendar_events").update({ status: "created", google_event_id: created.id }).eq("id", pending.id);
      await log("calendar_event_created", { title: pending.title, google_event_id: created.id });
      return { success: true, event: { id: created.id, title: pending.title, link: created.htmlLink } };
    }
    case "create_task": {
      const { data, error } = await supabase.from("tasks").insert({
        user_id: userId, title: args.title, description: args.description ?? null,
        priority: args.priority ?? "medium", deadline: args.deadline ?? null,
      }).select().single();
      if (error) return { error: error.message };
      await log("task_created", { id: data.id, title: data.title });
      return { task: data };
    }
    case "list_tasks": {
      let q = supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (args.status && args.status !== "all") q = q.eq("status", args.status);
      const { data, error } = await q.limit(50);
      if (error) return { error: error.message };
      return { tasks: data };
    }
    case "complete_task": {
      const { data, error } = await supabase.from("tasks").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", args.task_id).eq("user_id", userId).select().single();
      if (error) return { error: error.message };
      await log("task_completed", { id: args.task_id });
      return { task: data };
    }
    case "add_book": {
      const { data, error } = await supabase.from("books").insert({ user_id: userId, title: args.title, author: args.author ?? null }).select().single();
      if (error) return { error: error.message };
      return { book: data };
    }
    case "list_books": {
      const { data, error } = await supabase.from("books").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) return { error: error.message };
      return { books: data };
    }
    case "generate_daily_briefing": {
      const { data: tasks } = await supabase.from("tasks").select("*").eq("user_id", userId).neq("status", "completed").order("priority", { ascending: false }).limit(5);
      const { data: books } = await supabase.from("books").select("*").eq("user_id", userId).eq("status", "reading").limit(1);
      return { tasks: tasks ?? [], current_book: books?.[0] ?? null, hint: "Use list_today_events and summarize_inbox for live email/calendar info." };
    }
    default: return { error: `Unknown tool: ${name}` };
  }
}

// Pick the AI endpoint: prefer Groq, then Gemini, then Lovable gateway.
function aiEndpoint(): { url: string; key: string; model: string; provider: "groq" | "gemini" | "lovable" } {
  const groq = Deno.env.get("GROQ_API_KEY");
  if (groq) {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: groq,
      model: "llama-3.3-70b-versatile",
      provider: "groq",
    };
  }
  const gemini = Deno.env.get("GEMINI_API_KEY");
  if (gemini) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: gemini,
      model: "gemini-2.5-flash-lite",
      provider: "gemini",
    };
  }
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    key: Deno.env.get("LOVABLE_API_KEY") ?? "",
    model: "google/gemini-2.5-flash",
    provider: "lovable",
  };
}

// Run a tool-using chat loop. apiKey arg is ignored when GEMINI_API_KEY is configured.
export async function runAgentLoop(opts: {
  apiKey: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  supabase: any;
  userId: string;
  maxIterations?: number;
  model?: string;
}): Promise<{ content: string; tools: any[] }> {
  const { systemPrompt, messages, supabase, userId } = opts;
  const maxIterations = opts.maxIterations ?? 6;
  const ep = aiEndpoint();
  const model = opts.model ?? ep.model;

  let working: any[] = [{ role: "system", content: systemPrompt }, ...messages];
  const toolEvents: any[] = [];
  let finalContent = "";

  for (let i = 0; i < maxIterations; i++) {
    let resp!: Response;
    for (let attempt = 0; attempt < 4; attempt++) {
      resp = await fetch(ep.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${ep.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: working, tools: agentTools, tool_choice: "auto" }),
      });
      if (resp.status !== 429 && resp.status !== 503) break;
      const wait = 1500 * Math.pow(2, attempt);
      console.warn(`AI gateway ${resp.status}, retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      const err = new Error(`AI gateway ${resp.status}`);
      (err as any).status = resp.status;
      throw err;
    }
    const data = await resp.json();
    const choice = data.choices?.[0]?.message;
    if (!choice) break;

    if (choice.tool_calls && choice.tool_calls.length > 0) {
      working.push(choice);
      for (const tc of choice.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        const result = await executeAgentTool(tc.function.name, args, supabase, userId);
        toolEvents.push({ name: tc.function.name, args, result });
        working.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue;
    }

    finalContent = extractAiText(choice);
    break;
  }

  // If we exited the loop still mid-tool-use (no text produced), ask the model
  // one more time WITHOUT tools so it must produce a textual answer.
  if (!finalContent) {
    try {
      const resp = await fetch(ep.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${ep.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: working }),
      });
      if (resp.ok) {
        const data = await resp.json();
        finalContent = extractAiText(data.choices?.[0]?.message);
      } else {
        console.error("final-text fallback failed:", resp.status, await resp.text());
      }
    } catch (e) {
      console.error("final-text fallback threw:", e);
    }
  }

  return { content: finalContent, tools: toolEvents };
}
