import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, Clock, BookOpen } from "lucide-react";
import { PageHeader, Card } from "@/components/ui/page";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});

const EVENTS = [
  { time: "09:00", end: "09:30", title: "Leadership stand-up", type: "internal" },
  { time: "11:00", end: "12:00", title: "Investor call — Lex Capital", type: "external" },
  { time: "15:00", end: "16:30", title: "Product review", type: "internal" },
];

const FREE_SLOTS = [
  { start: "09:30", end: "11:00", duration: "1h 30m" },
  { start: "12:00", end: "15:00", duration: "3h" },
  { start: "16:30", end: "18:00", duration: "1h 30m" },
];

function CalendarPage() {
  async function scheduleStudy(slot: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("activity_logs").insert({
      user_id: user.id, action: "study_session_scheduled", metadata: { slot },
    });
    toast.success(`Study session pencilled in for ${slot}`, { description: "Approval required to commit to your real calendar." });
  }

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Today · mock events." actions={
        <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">Mock data</span>
      } />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-primary" /> Today's events</h3>
          <div className="space-y-3">
            {EVENTS.map((e, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-card/40 border border-border/50">
                <div className="text-xs font-mono text-primary w-20 shrink-0">
                  {e.time}<br /><span className="text-muted-foreground">{e.end}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 capitalize">{e.type}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Free time</h3>
          <div className="space-y-3">
            {FREE_SLOTS.map((s, i) => (
              <div key={i} className="p-3 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-mono">{s.start} – {s.end}</div>
                  <span className="text-xs text-muted-foreground">{s.duration}</span>
                </div>
                <button
                  onClick={() => scheduleStudy(`${s.start}–${s.end}`)}
                  className="mt-2 text-xs px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground inline-flex items-center gap-1.5 shadow-glow hover:opacity-95 transition"
                >
                  <BookOpen className="w-3 h-3" /> Schedule study session
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
