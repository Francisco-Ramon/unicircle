// Google Calendar operations dispatcher.
// Actions: list_today, list_upcoming, find_free_time,
//          propose_event, approve_event, reject_event, list_pending.
// Events are only created on Google Calendar after explicit approval.
import { corsHeaders, jsonResponse, getCallerUserId, adminClient, getValidAccessToken, googleFetch } from "../_shared/google.ts";

const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary";

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

async function listEvents(token: string, timeMin: string, timeMax: string) {
  const url = `${CAL}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`;
  const r = await googleFetch(token, url);
  if (!r.ok) return { error: await r.text() };
  const data = await r.json();
  const events = (data.items ?? []).map((e: any) => ({
    id: e.id,
    title: e.summary ?? "(no title)",
    description: e.description ?? "",
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
    location: e.location ?? "",
    all_day: !!e.start?.date,
  }));
  return { events };
}

function findFreeSlots(events: any[], dayStart: Date, dayEnd: Date, minMinutes = 30) {
  // Sort by start
  const busy = events
    .filter((e) => !e.all_day && e.start && e.end)
    .map((e) => ({ start: new Date(e.start), end: new Date(e.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const slots: { start: string; end: string; minutes: number }[] = [];
  let cursor = dayStart;
  for (const b of busy) {
    if (b.start > cursor) {
      const mins = (b.start.getTime() - cursor.getTime()) / 60000;
      if (mins >= minMinutes) slots.push({ start: cursor.toISOString(), end: b.start.toISOString(), minutes: Math.round(mins) });
    }
    if (b.end > cursor) cursor = b.end;
  }
  if (cursor < dayEnd) {
    const mins = (dayEnd.getTime() - cursor.getTime()) / 60000;
    if (mins >= minMinutes) slots.push({ start: cursor.toISOString(), end: dayEnd.toISOString(), minutes: Math.round(mins) });
  }
  return slots;
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

    if (action === "list_today") {
      const r = await listEvents(tok.token, startOfDay().toISOString(), endOfDay().toISOString());
      return jsonResponse(r);
    }

    if (action === "list_upcoming") {
      const days = Math.min(Number(body.days ?? 7), 30);
      const end = new Date(); end.setDate(end.getDate() + days);
      const r = await listEvents(tok.token, new Date().toISOString(), end.toISOString());
      return jsonResponse(r);
    }

    if (action === "find_free_time") {
      const date = body.date ? new Date(body.date) : new Date();
      const workStart = new Date(date); workStart.setHours(Number(body.work_start_hour ?? 9), 0, 0, 0);
      const workEnd = new Date(date); workEnd.setHours(Number(body.work_end_hour ?? 18), 0, 0, 0);
      const r = await listEvents(tok.token, workStart.toISOString(), workEnd.toISOString());
      if ("error" in r) return jsonResponse(r, 500);
      const slots = findFreeSlots(r.events, workStart, workEnd, Number(body.min_minutes ?? 30));
      return jsonResponse({ slots, events: r.events });
    }

    if (action === "propose_event") {
      const { title, description, start_time, end_time } = body;
      if (!title || !start_time || !end_time) return jsonResponse({ error: "title, start_time, end_time required" }, 400);
      const { data, error } = await admin.from("pending_calendar_events").insert({
        user_id: auth.userId,
        title, description: description ?? null,
        start_time, end_time,
        status: "pending",
      }).select().single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ pending: data, requires_approval: true });
    }

    if (action === "list_pending") {
      const { data } = await admin.from("pending_calendar_events")
        .select("*").eq("user_id", auth.userId).eq("status", "pending")
        .order("created_at", { ascending: false }).limit(20);
      return jsonResponse({ pending: data ?? [] });
    }

    if (action === "reject_event") {
      if (!body.pending_id) return jsonResponse({ error: "pending_id required" }, 400);
      await admin.from("pending_calendar_events").update({ status: "rejected" })
        .eq("id", body.pending_id).eq("user_id", auth.userId);
      return jsonResponse({ success: true });
    }

    if (action === "approve_event") {
      if (!body.pending_id) return jsonResponse({ error: "pending_id required" }, 400);
      const { data: pending } = await admin.from("pending_calendar_events")
        .select("*").eq("id", body.pending_id).eq("user_id", auth.userId).maybeSingle();
      if (!pending) return jsonResponse({ error: "pending_not_found" }, 404);
      if (pending.status !== "pending") return jsonResponse({ error: "already_resolved", status: pending.status }, 400);

      const r = await googleFetch(tok.token, `${CAL}/events`, {
        method: "POST",
        body: JSON.stringify({
          summary: pending.title,
          description: pending.description ?? undefined,
          start: { dateTime: new Date(pending.start_time).toISOString() },
          end: { dateTime: new Date(pending.end_time).toISOString() },
        }),
      });
      if (!r.ok) {
        const text = await r.text();
        console.error("calendar create failed:", text);
        return jsonResponse({ error: "calendar_create_failed", detail: text }, 500);
      }
      const created = await r.json();
      await admin.from("pending_calendar_events").update({
        status: "created", google_event_id: created.id,
      }).eq("id", pending.id);
      await admin.from("activity_logs").insert({
        user_id: auth.userId, action: "calendar_event_created",
        metadata: { title: pending.title, google_event_id: created.id, start: pending.start_time },
      });
      return jsonResponse({ success: true, event: { id: created.id, title: pending.title, start: pending.start_time, link: created.htmlLink } });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("calendar-api error:", e);
    return jsonResponse({ error: e?.message ?? "Unknown error" }, 500);
  }
});
