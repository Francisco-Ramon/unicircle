import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, MessageSquare, ListPlus, RefreshCw, Mail, Sparkles, Loader2, X, Check } from "lucide-react";
import { PageHeader, Card } from "@/components/ui/page";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";

export const Route = createFileRoute("/_app/inbox")({
  component: InboxPage,
});

type Email = {
  id: string;
  thread_id?: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
};

type Draft = {
  id: string;
  gmail_message_id: string | null;
  to_addr: string | null;
  subject: string | null;
  body: string;
  status: string;
  created_at: string;
};

async function callGmail(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("gmail-api", {
    body: { action, ...body },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

function InboxPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftingFor, setDraftingFor] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const loadDrafts = useCallback(async () => {
    try {
      const d = await callGmail("list_drafts");
      setDrafts((d?.drafts ?? []).filter((x: Draft) => x.status === "pending"));
    } catch (_) { /* ignore */ }
  }, []);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const d = await callGmail("list_unread", { max: 20 });
      setEmails(d?.emails ?? []);
    } catch (e: any) {
      const errMsg = e.message ?? "";
      if (errMsg.includes("not_connected") || errMsg.includes("non-2xx") || errMsg.includes("refresh_failed")) {
        setConnected(false);
      } else {
        toast.error(errMsg || "Failed to load emails");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("google-status", { body: {} });
        const isConnected = !!data?.connected && !!data?.gmail_ok;
        setConnected(isConnected);
        if (isConnected) {
          await Promise.all([loadEmails(), loadDrafts()]);
        }
      } catch {
        setConnected(false);
      }
    })();
  }, [loadEmails, loadDrafts]);

  async function summarizeInbox() {
    setSummarizing(true);
    try {
      const d = await callGmail("summarize_inbox", { max: 10 });
      setSummary(d?.summary ?? "");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSummarizing(false);
    }
  }

  async function generateReply(emailId: string) {
    setDraftingFor(emailId);
    try {
      await callGmail("draft_reply", { id: emailId, tone: "professional" });
      toast.success("Draft saved — review below");
      await loadDrafts();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setDraftingFor(null);
    }
  }

  async function discardDraft(id: string) {
    try {
      await callGmail("discard_draft", { draft_id: id });
      setDrafts((p) => p.filter((d) => d.id !== id));
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  async function markAsTask(emailSubject: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, title: `Reply: ${emailSubject}`, priority: "high",
    });
    if (error) toast.error(error.message);
    else toast.success("Added to tasks");
  }

  return (
    <div>
      <PageHeader
        title="Inbox"
        subtitle={connected ? "Live unread emails from your Gmail." : "Connect Gmail to see your inbox."}
        actions={
          connected ? (
            <div className="flex gap-2">
              <button
                onClick={summarizeInbox}
                disabled={summarizing}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 inline-flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Summarize inbox
              </button>
              <button
                onClick={loadEmails}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 inline-flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          ) : null
        }
      />

      {connected === false && (
        <Card>
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Gmail isn't connected</div>
              <div className="text-sm text-muted-foreground mt-1">
                Head to Settings → Integrations to connect your Google account. Once connected, your unread mail will show up here.
              </div>
            </div>
          </div>
        </Card>
      )}

      {summary && (
        <Card className="mb-3 border-primary/30">
          <div className="text-[10px] uppercase tracking-widest text-primary mb-2 inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Inbox summary
          </div>
          <pre className="text-sm whitespace-pre-wrap font-sans text-foreground/85">{summary}</pre>
        </Card>
      )}

      {drafts.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Pending drafts</div>
          {drafts.map((d) => (
            <Card key={d.id} className="border-primary/30">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">To: {d.to_addr}</div>
                  <div className="font-medium text-sm">{d.subject}</div>
                  <pre className="text-sm mt-2 whitespace-pre-wrap font-sans text-foreground/85">{d.body}</pre>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    title="Drafts can only be approved manually — Mr. Cisco never sends"
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground inline-flex items-center gap-1.5 cursor-not-allowed"
                  >
                    <Check className="w-3 h-3" /> Send (manual)
                  </button>
                  <button
                    onClick={() => discardDraft(d.id)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-card border border-border hover:border-destructive/40 inline-flex items-center gap-1.5"
                  >
                    <X className="w-3 h-3" /> Discard
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {connected && (
        <div className="space-y-3">
          {loading && emails.length === 0 && (
            <Card><div className="text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading inbox…</div></Card>
          )}
          {!loading && emails.length === 0 && (
            <Card><div className="text-sm text-muted-foreground">Inbox zero — no unread mail.</div></Card>
          )}
          {emails.map((e) => {
            const fromName = e.from?.split("<")[0]?.trim() || e.from || "Unknown";
            return (
              <Card key={e.id} className={e.unread ? "border-primary/30" : ""}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {fromName[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate max-w-[60%]">{fromName}</span>
                      {e.unread && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/20 inline-flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Unread
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">{e.date ? new Date(e.date).toLocaleString() : ""}</span>
                    </div>
                    <div className="text-sm mt-1 font-medium">{e.subject || "(no subject)"}</div>
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.snippet}</div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => generateReply(e.id)}
                        disabled={draftingFor === e.id}
                        className="text-xs px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground inline-flex items-center gap-1.5 shadow-glow hover:opacity-95 transition disabled:opacity-60"
                      >
                        {draftingFor === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                        Generate Reply
                      </button>
                      <button
                        onClick={() => markAsTask(e.subject)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 inline-flex items-center gap-1.5 transition"
                      >
                        <ListPlus className="w-3 h-3" /> Mark as Task
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
