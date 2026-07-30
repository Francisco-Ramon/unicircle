import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, MessageSquare, ListPlus, RefreshCw, Mail, Sparkles, Loader2, X, Check, UserCheck, Bot, Send, PhoneCall } from "lucide-react";
import { PageHeader, Card } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
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

type Conversation = {
  id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
  ai_paused?: boolean;
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
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
  const [activeTab, setActiveTab] = useState<"chats" | "email">("chats");

  // Gmail states
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftingFor, setDraftingFor] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // WhatsApp/Customer Chat states (Human Handoff)
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [convoMessages, setConvoMessages] = useState<ChatMessage[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [manualText, setManualText] = useState("");
  const [sendingManual, setSendingManual] = useState(false);

  // ── Load Gmail ──
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

  // ── Load Customer Chats & Human Handoff status ──
  const loadConversations = useCallback(async () => {
    setChatsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: convos } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (convos) {
        // Fetch AI paused preferences per conversation
        const { data: prefs } = await supabase
          .from("preferences")
          .select("key, value")
          .eq("user_id", user.id)
          .like("key", "wa_auto_reply_disabled:%");

        const pausedMap = new Set<string>();
        (prefs ?? []).forEach((p) => {
          const cid = p.key.replace("wa_auto_reply_disabled:", "");
          if (p.value === true || (p.value && typeof p.value === "object" && (p.value as any).disabled === true)) {
            pausedMap.add(cid);
          }
        });

        const formatted = convos.map((c) => ({
          ...c,
          ai_paused: pausedMap.has(c.id),
        }));

        // Filter out broadcast/status contacts — they are not real customer conversations
        const realConvos = formatted.filter((c) =>
          !c.title?.toLowerCase().includes('status@broadcast') &&
          !c.title?.toLowerCase().includes('broadcast')
        );

        setConversations(realConvos);
        if (!selectedConvo && realConvos.length > 0) {
          setSelectedConvo(realConvos[0]);
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setChatsLoading(false);
    }
  }, [selectedConvo]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convoId: string) => {
    setMsgLoading(true);
    try {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true })
        .limit(100);

      setConvoMessages(msgs ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConvo) {
      loadMessages(selectedConvo.id);
    }
  }, [selectedConvo, loadMessages]);

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

  // ── Toggle Human Handoff (Pause / Resume AI for specific conversation) ──
  async function toggleHumanTakeover(convo: Conversation, takeOver: boolean) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const prefKey = `wa_auto_reply_disabled:${convo.id}`;

      if (takeOver) {
        // Human takeover: pause AI for this conversation
        await supabase.from("preferences").upsert({
          user_id: user.id,
          key: prefKey,
          value: { disabled: true, paused_by: "human_handoff", timestamp: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,key" });

        toast.success("Human Handoff Active", { description: "AI Auto-Reply paused. You are now in control." });
      } else {
        // Resume AI auto-reply
        await supabase.from("preferences").delete().eq("user_id", user.id).eq("key", prefKey);
        toast.success("AI Resumed", { description: "Mr. Cisco will now reply to this contact automatically." });
      }

      setConversations((prev) =>
        prev.map((c) => (c.id === convo.id ? { ...c, ai_paused: takeOver } : c))
      );
      if (selectedConvo?.id === convo.id) {
        setSelectedConvo((prev) => (prev ? { ...prev, ai_paused: takeOver } : null));
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to toggle handoff");
    }
  }

  // ── Send Manual Message directly to WhatsApp contact ──
  async function handleSendManualMessage() {
    if (!selectedConvo || !manualText.trim()) return;
    setSendingManual(true);

    try {
      const res = await fetch("https://mr-cisco-whatsapp-production.up.railway.app/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConvo.id,
          message: manualText.trim(),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to send: ${res.status} ${errText}`);
      }

      toast.success("Message sent to contact!");
      setManualText("");
      await loadMessages(selectedConvo.id);
    } catch (e: any) {
      toast.error(e.message ?? "Could not send manual message");
    } finally {
      setSendingManual(false);
    }
  }

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
        title="Inbox & Live Customer Center"
        subtitle="Manage live WhatsApp/Telegram chats with Human Handoff, or view Gmail messages."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("chats")}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold inline-flex items-center gap-1.5 transition ${
                activeTab === "chats"
                  ? "bg-primary text-primary-foreground border-primary shadow-glow"
                  : "bg-card border-border hover:border-primary/40 text-muted-foreground"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Customer Chats & Handoff
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold inline-flex items-center gap-1.5 transition ${
                activeTab === "email"
                  ? "bg-primary text-primary-foreground border-primary shadow-glow"
                  : "bg-card border-border hover:border-primary/40 text-muted-foreground"
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Gmail Inbox
            </button>
          </div>
        }
      />

      {/* ── TAB 1: Live Customer Chats (Human Handoff & Takeover) ── */}
      {activeTab === "chats" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Conversation List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conversations</span>
              <button
                onClick={loadConversations}
                disabled={chatsLoading}
                className="text-[10px] px-2 py-1 rounded bg-card border border-border hover:border-primary/40 inline-flex items-center gap-1"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${chatsLoading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {conversations.length === 0 && !chatsLoading && (
              <Card><div className="text-xs text-muted-foreground">No active WhatsApp or Telegram chats yet.</div></Card>
            )}

            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedConvo(c)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selectedConvo?.id === c.id
                    ? "bg-primary/10 border-primary shadow-glow"
                    : "bg-card/40 border-border/50 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-foreground truncate max-w-[170px]">
                    {c.title}
                  </span>
                  {c.ai_paused ? (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                      <UserCheck className="w-2.5 h-2.5" /> Human Mode
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" /> AI Active
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"}
                </div>
              </div>
            ))}
          </div>

          {/* Active Chat & Takeover Control */}
          <div className="lg:col-span-2">
            {selectedConvo ? (
              <Card className="flex flex-col h-[520px] p-0 overflow-hidden border-border/60">
                {/* Header with Human Handoff Switch */}
                <div className="p-4 border-b border-border/50 bg-card/60 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-primary" /> {selectedConvo.title}
                    </h3>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedConvo.ai_paused
                        ? "AI is PAUSED. You are typing manually."
                        : "AI is ACTIVE. Mr. Cisco replies automatically."}
                    </div>
                  </div>

                  {/* TAKE OVER SWITCH */}
                  <div className="flex items-center gap-2.5 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-xs font-semibold text-foreground">Human Takeover</span>
                    <Switch
                      checked={selectedConvo.ai_paused || false}
                      onCheckedChange={(checked) => toggleHumanTakeover(selectedConvo, checked)}
                    />
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
                  {msgLoading && convoMessages.length === 0 && (
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading messages…</div>
                  )}
                  {convoMessages.map((m) => {
                    const isUser = m.role === "user";
                    // Skip empty messages or media stubs
                    const text = (m.content || "").trim();
                    if (!text || text === "undefined" || text === "null") return null;
                    return (
                      <div key={m.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                            isUser
                              ? "bg-zinc-800 text-white rounded-tl-sm"
                              : "bg-emerald-600 text-white rounded-tr-sm"
                          }`}
                        >
                          <div>{text}</div>
                          <div className={`text-[10px] mt-1 text-right ${isUser ? "text-zinc-400" : "text-emerald-200"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {!isUser && <span className="ml-1 opacity-80">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Manual Reply Footer */}
                <div className="p-3 border-t border-border/50 bg-card/60 flex items-center gap-2">
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendManualMessage(); }}
                    placeholder={selectedConvo.ai_paused ? "Type a manual message to send directly..." : "Take over chat to reply manually..."}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={handleSendManualMessage}
                    disabled={sendingManual || !manualText.trim()}
                    className="text-xs px-4 py-2 rounded-lg bg-emerald-500 text-black font-bold inline-flex items-center gap-1.5 shadow-glow hover:opacity-90 transition disabled:opacity-50"
                  >
                    {sendingManual ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Send
                  </button>
                </div>
              </Card>
            ) : (
              <Card><div className="text-xs text-muted-foreground">Select a conversation on the left to view messages and manage takeover.</div></Card>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: Gmail Inbox ── */}
      {activeTab === "email" && (
        <div className="space-y-4">
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
            <Card className="border-primary/30">
              <div className="text-[10px] uppercase tracking-widest text-primary mb-2 inline-flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Inbox summary
              </div>
              <pre className="text-sm whitespace-pre-wrap font-sans text-foreground/85">{summary}</pre>
            </Card>
          )}

          {drafts.length > 0 && (
            <div className="space-y-2">
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
              <div className="flex justify-end gap-2">
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
      )}
    </div>
  );
}
