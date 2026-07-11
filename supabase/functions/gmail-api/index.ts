// Gmail operations dispatcher.
// Actions: list_unread, get_email, summarize_inbox, draft_reply,
//          list_drafts, discard_draft.
// Never sends email.
import { corsHeaders, jsonResponse, getCallerUserId, adminClient, getValidAccessToken, googleFetch, aiComplete } from "../_shared/google.ts";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

function decodeBase64Url(s: string): string {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? b64 + "=".repeat(4 - (b64.length % 4)) : b64;
    return new TextDecoder().decode(Uint8Array.from(atob(pad), (c) => c.charCodeAt(0)));
  } catch { return ""; }
}

function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  const parts = payload.parts ?? [];
  // Prefer text/plain
  const plain = parts.find((p: any) => p.mimeType === "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);
  const html = parts.find((p: any) => p.mimeType === "text/html");
  if (html?.body?.data) {
    return decodeBase64Url(html.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  // recurse
  for (const p of parts) {
    const v = extractBody(p);
    if (v) return v;
  }
  return "";
}

function header(headers: any[], name: string): string {
  const h = headers?.find((x: any) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

async function fetchEmailMeta(token: string, id: string) {
  const r = await googleFetch(token, `${GMAIL}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
  if (!r.ok) return null;
  const m = await r.json();
  return {
    id: m.id,
    thread_id: m.threadId,
    snippet: m.snippet,
    from: header(m.payload?.headers ?? [], "From"),
    subject: header(m.payload?.headers ?? [], "Subject"),
    date: header(m.payload?.headers ?? [], "Date"),
    unread: (m.labelIds ?? []).includes("UNREAD"),
  };
}

async function fetchEmailFull(token: string, id: string) {
  const r = await googleFetch(token, `${GMAIL}/messages/${id}?format=full`);
  if (!r.ok) return null;
  const m = await r.json();
  const body = extractBody(m.payload);
  return {
    id: m.id,
    thread_id: m.threadId,
    snippet: m.snippet,
    from: header(m.payload?.headers ?? [], "From"),
    to: header(m.payload?.headers ?? [], "To"),
    subject: header(m.payload?.headers ?? [], "Subject"),
    date: header(m.payload?.headers ?? [], "Date"),
    body: body.slice(0, 8000),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await getCallerUserId(req);
    if ("error" in auth) return auth.error;
    const admin = adminClient();
    const tok = await getValidAccessToken(admin, auth.userId);
    if ("error" in tok) return jsonResponse({ error: tok.error }, 400);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list_unread") {
      const max = Math.min(Number(body.max ?? 15), 30);
      const r = await googleFetch(tok.token, `${GMAIL}/messages?q=is:unread&maxResults=${max}`);
      if (!r.ok) return jsonResponse({ error: "gmail_list_failed", detail: await r.text() }, 500);
      const data = await r.json();
      const ids = (data.messages ?? []).map((m: any) => m.id);
      const metas = await Promise.all(ids.map((id: string) => fetchEmailMeta(tok.token, id)));
      return jsonResponse({ emails: metas.filter(Boolean) });
    }

    if (action === "get_email") {
      if (!body.id) return jsonResponse({ error: "id required" }, 400);
      const email = await fetchEmailFull(tok.token, body.id);
      if (!email) return jsonResponse({ error: "not_found" }, 404);
      return jsonResponse({ email });
    }

    if (action === "summarize_inbox") {
      const max = Math.min(Number(body.max ?? 10), 15);
      const r = await googleFetch(tok.token, `${GMAIL}/messages?q=is:unread&maxResults=${max}`);
      if (!r.ok) return jsonResponse({ error: "gmail_list_failed" }, 500);
      const data = await r.json();
      const ids = (data.messages ?? []).map((m: any) => m.id);
      if (ids.length === 0) {
        return jsonResponse({ summary: "Inbox zero — no unread mail.", emails: [] });
      }
      const emails = (await Promise.all(ids.map((id: string) => fetchEmailFull(tok.token, id)))).filter(Boolean) as any[];
      const compact = emails.map((e) => `From: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nBody: ${e.body.slice(0, 800)}`).join("\n---\n");
      const summary = await aiComplete(
        `You are Mr. Cisco summarizing an executive's inbox. Group emails by urgency (HIGH / MEDIUM / LOW). For each, give a one-line summary and a single suggested next action. Be terse and decisive.`,
        compact,
      );
      return jsonResponse({ summary, emails: emails.map((e) => ({ id: e.id, from: e.from, subject: e.subject, date: e.date })) });
    }

    if (action === "draft_reply") {
      if (!body.id) return jsonResponse({ error: "id required" }, 400);
      const email = await fetchEmailFull(tok.token, body.id);
      if (!email) return jsonResponse({ error: "not_found" }, 404);
      const tone = (body.tone as string) ?? "professional";
      const draft = await aiComplete(
        `You are Mr. Cisco drafting a ${tone} email reply for an executive. Write a concise reply (3-6 sentences). Use a friendly but decisive tone. Do NOT include subject lines or signatures — body only.`,
        `Original email:\nFrom: ${email.from}\nSubject: ${email.subject}\nBody: ${email.body}\n\n${body.instructions ? `Special instructions: ${body.instructions}\n` : ""}Draft my reply body now.`,
      );
      const subject = email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
      const { data: saved, error: saveErr } = await admin.from("gmail_drafts").insert({
        user_id: auth.userId,
        gmail_message_id: email.id,
        thread_id: email.thread_id,
        to_addr: email.from,
        subject,
        body: draft,
        status: "pending",
      }).select().single();
      if (saveErr) return jsonResponse({ error: saveErr.message }, 500);
      return jsonResponse({ draft: saved, requires_approval: true });
    }

    if (action === "list_drafts") {
      const { data } = await admin.from("gmail_drafts")
        .select("*").eq("user_id", auth.userId).order("created_at", { ascending: false }).limit(20);
      return jsonResponse({ drafts: data ?? [] });
    }

    if (action === "discard_draft") {
      if (!body.draft_id) return jsonResponse({ error: "draft_id required" }, 400);
      await admin.from("gmail_drafts").update({ status: "discarded" })
        .eq("id", body.draft_id).eq("user_id", auth.userId);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("gmail-api error:", e);
    return jsonResponse({ error: e?.message ?? "Unknown error" }, 500);
  }
});
