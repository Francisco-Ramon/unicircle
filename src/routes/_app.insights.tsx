import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Loader2, FileText } from "lucide-react";
import { PageHeader, Card } from "@/components/ui/page";
import { sendToAgent } from "@/lib/agent";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/insights")({
  component: InsightsPage,
});

function InsightsPage() {
  const [briefing, setBriefing] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(15).then(({ data }) => setLogs(data ?? []));
  }, []);

  async function generate() {
    setBusy(true);
    setBriefing("");
    try {
      const res = await sendToAgent(
        [{ role: "user", content: "Generate my daily briefing using the generate_daily_briefing tool, then format it as: 📧 Inbox · 📅 Schedule · ✅ Tasks · 📚 Reading · 🎯 Top 3 priorities for today." }],
        crypto.randomUUID(),
      );
      setBriefing(res.content);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Insights" subtitle="Daily briefings and agent activity." actions={
        <button onClick={generate} disabled={busy} className="gradient-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium shadow-glow inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-95 transition">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate briefing
        </button>
      } />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card className="min-h-[400px]">
          {busy ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Mr. Cisco is preparing your briefing…
            </div>
          ) : briefing ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{briefing}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
              Click <strong>Generate briefing</strong> to get today's executive summary.
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Activity log</h3>
          {logs.length === 0 ? (
            <div className="text-xs text-muted-foreground">No activity yet.</div>
          ) : (
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="text-xs p-2 rounded-lg bg-card/40 border border-border/50">
                  <div className="font-mono text-primary">{l.action}</div>
                  <div className="text-muted-foreground mt-0.5">{new Date(l.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
