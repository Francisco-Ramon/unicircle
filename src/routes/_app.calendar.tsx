import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, Clock, BookOpen, RefreshCw, Loader2, Mail } from "lucide-react";
import { PageHeader, Card } from "@/components/ui/page";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});

type CalEvent = {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  location: string;
  all_day: boolean;
};

type FreeSlot = {
  start: string;
  end: string;
  minutes: number;
};

async function callCalendar(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("calendar-api", {
    body: { action, ...body },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CalendarPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      // Load today's events and free time in parallel
      const [eventsData, freeData] = await Promise.all([
        callCalendar("list_today"),
        callCalendar("find_free_time"),
      ]);
      setEvents(eventsData?.events ?? []);
      setFreeSlots(freeData?.slots ?? []);
      setConnected(true);
    } catch (e: any) {
      const errMsg = e.message ?? "";
      if (errMsg.includes("not_connected") || errMsg.includes("non-2xx") || errMsg.includes("refresh_failed")) {
        setConnected(false);
      } else {
        toast.error(errMsg || "Failed to load calendar");
        setConnected(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("google-status", { body: {} });
        const isConnected = !!data?.connected && !!data?.calendar_ok;
        setConnected(isConnected);
        if (isConnected) {
          await loadCalendar();
        }
      } catch {
        setConnected(false);
      }
    })();
  }, [loadCalendar]);

  async function scheduleStudy(slot: FreeSlot) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("activity_logs").insert({
      user_id: user.id, action: "study_session_scheduled", metadata: { slot: `${formatTime(slot.start)}–${formatTime(slot.end)}` },
    });
    toast.success(`Study session pencilled in for ${formatTime(slot.start)}–${formatTime(slot.end)}`, { description: "Approval required to commit to your real calendar." });
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle={connected ? `Today · ${events.length} event${events.length !== 1 ? "s" : ""}` : "Connect Google to see your calendar."}
        actions={
          connected ? (
            <button
              onClick={loadCalendar}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 inline-flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          ) : null
        }
      />

      {connected === false && (
        <Card>
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Google Calendar isn't connected</div>
              <div className="text-sm text-muted-foreground mt-1">
                Head to Settings → Integrations to connect your Google account. Once connected, your real calendar events will show up here.
              </div>
            </div>
          </div>
        </Card>
      )}

      {connected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-primary" /> Today's events</h3>
            <div className="space-y-3">
              {loading && events.length === 0 && (
                <div className="text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading calendar…</div>
              )}
              {!loading && events.length === 0 && (
                <div className="text-sm text-muted-foreground">No events today — enjoy the free time!</div>
              )}
              {events.map((e) => (
                <div key={e.id} className="flex gap-3 p-3 rounded-lg bg-card/40 border border-border/50">
                  <div className="text-xs font-mono text-primary w-20 shrink-0">
                    {e.all_day ? "All day" : formatTime(e.start)}<br />
                    {!e.all_day && <span className="text-muted-foreground">{formatTime(e.end)}</span>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{e.title}</div>
                    {e.location && <div className="text-xs text-muted-foreground mt-0.5">{e.location}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Free time</h3>
            <div className="space-y-3">
              {freeSlots.length === 0 && !loading && (
                <div className="text-sm text-muted-foreground">No free slots found today.</div>
              )}
              {freeSlots.map((s, i) => (
                <div key={i} className="p-3 rounded-lg bg-success/5 border border-success/20">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-mono">{formatTime(s.start)} – {formatTime(s.end)}</div>
                    <span className="text-xs text-muted-foreground">{s.minutes >= 60 ? `${Math.floor(s.minutes / 60)}h ${s.minutes % 60 ? (s.minutes % 60) + "m" : ""}` : `${s.minutes}m`}</span>
                  </div>
                  <button
                    onClick={() => scheduleStudy(s)}
                    className="mt-2 text-xs px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground inline-flex items-center gap-1.5 shadow-glow hover:opacity-95 transition"
                  >
                    <BookOpen className="w-3 h-3" /> Schedule study session
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
