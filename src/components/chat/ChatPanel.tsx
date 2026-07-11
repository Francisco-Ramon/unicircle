import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, Wrench, Mic, MicOff, Paperclip, Plus, ChevronDown, FileText, X, Copy, RefreshCw, Check, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { sendToAgent, embedDocument, type ChatMsg } from "@/lib/agent";
import { supabase } from "@/integrations/supabase/client";
import { listConversations, createConversation, loadMessages, deleteConversation, type Conversation } from "@/lib/conversations";
import { extractText, ACCEPTED_TYPES, MAX_FILE_SIZE } from "@/lib/documents";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const getSpeechRecognition = (): any => {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

const SUGGESTIONS = ["Plan my day", "Summarize my emails", "What should I do next?", "Generate my daily briefing"];

type ChatMessage = ChatMsg & { id?: string; tools?: any[]; attachments?: { id: string; filename: string }[] };

export function ChatPanel() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showConvoMenu, setShowConvoMenu] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");
  const autoSendRef = useRef<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const convoMenuRef = useRef<HTMLDivElement>(null);

  // Load conversations & resume last on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoadingHistory(false); return; }
        const list = await listConversations();
        setConversations(list);
        if (list.length > 0) {
          await openConversation(list[0].id);
        } else {
          await startNewConversation();
        }
      } catch (e: any) {
        console.error(e);
        toast.error("Failed to load conversations");
      } finally {
        setLoadingHistory(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Click-outside for convo menu
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (convoMenuRef.current && !convoMenuRef.current.contains(e.target as Node)) setShowConvoMenu(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Voice setup
  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    setVoiceSupported(true);
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event: any) => {
      let interim = "", final = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript; else interim += transcript;
      }
      finalTranscriptRef.current = final;
      setInput((final + interim).trim());
    };
    rec.onerror = (e: any) => {
      if (e.error !== "no-speech" && e.error !== "aborted") toast.error(`Voice error: ${e.error}`);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      const text = finalTranscriptRef.current.trim();
      if (autoSendRef.current && text) { autoSendRef.current = false; send(text); }
    };
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openConversation(id: string) {
    setConversationId(id);
    setShowConvoMenu(false);
    try {
      const stored = await loadMessages(id);
      if (stored.length === 0) {
        setMessages([{
          role: "assistant",
          content: "Good day. I'm **Mr. Cisco** — your executive agent. Ask me to plan your day, summarize your inbox, manage tasks, or upload a document and I'll dig into it.",
        }]);
      } else {
        setMessages(stored.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          tools: m.metadata?.tools,
        })));
      }
    } catch (e: any) {
      toast.error("Failed to load conversation");
    }
  }

  async function startNewConversation() {
    try {
      const c = await createConversation();
      setConversations((prev) => [c, ...prev]);
      setConversationId(c.id);
      setMessages([{
        role: "assistant",
        content: "Good day. I'm **Mr. Cisco** — your executive agent. Ask me to plan your day, summarize your inbox, manage tasks, or upload a document and I'll dig into it.",
      }]);
      setShowConvoMenu(false);
      setPendingFiles([]);
    } catch (e: any) {
      toast.error("Failed to start new chat");
    }
  }

  async function removeConversation(id: string) {
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      await deleteConversation(id);
      const next = conversations.filter((c) => c.id !== id);
      setConversations(next);
      if (id === conversationId) {
        if (next.length > 0) await openConversation(next[0].id);
        else await startNewConversation();
      }
    } catch (e: any) {
      toast.error("Failed to delete");
    }
  }

  function toggleVoice() {
    const rec = recognitionRef.current;
    if (!rec) { toast.error("Voice not supported"); return; }
    if (listening) {
      autoSendRef.current = true;
      try { rec.stop(); } catch { /* noop */ }
    } else {
      setInput(""); finalTranscriptRef.current = ""; autoSendRef.current = false;
      try { rec.start(); setListening(true); } catch { toast.error("Could not start mic"); }
    }
  }

  function handleFilePick(files: FileList | null) {
    if (!files) return;
    const valid: File[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > MAX_FILE_SIZE) { toast.error(`${f.name} exceeds 10MB`); return; }
      const ok = /\.(pdf|docx|txt|md)$/i.test(f.name);
      if (!ok) { toast.error(`${f.name}: unsupported type`); return; }
      valid.push(f);
    });
    if (valid.length) setPendingFiles((prev) => [...prev, ...valid]);
  }

  async function uploadAndProcess(file: File): Promise<{ id: string; filename: string } | null> {
    try {
      setUploadingFile(file.name);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !conversationId) throw new Error("Not ready");

      const text = await extractText(file);
      if (!text || text.length < 5) throw new Error("Could not extract text from file");

      const path = `${user.id}/${conversationId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: doc, error: docErr } = await supabase.from("documents").insert({
        user_id: user.id,
        conversation_id: conversationId,
        filename: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        storage_path: path,
        status: "processing",
      }).select().single();
      if (docErr) throw docErr;

      await embedDocument(doc.id, text);
      return { id: doc.id, filename: file.name };
    } catch (e: any) {
      toast.error(`${file.name}: ${e.message || "upload failed"}`);
      return null;
    } finally {
      setUploadingFile(null);
    }
  }

  async function send(text: string) {
    if ((!text.trim() && pendingFiles.length === 0) || busy || !conversationId) return;

    setBusy(true);
    let attachments: { id: string; filename: string }[] = [];

    // Upload files first
    if (pendingFiles.length > 0) {
      const filesToUpload = pendingFiles;
      setPendingFiles([]);
      for (const f of filesToUpload) {
        const res = await uploadAndProcess(f);
        if (res) attachments.push(res);
      }
    }

    const userText = text.trim() || (attachments.length > 0 ? `Uploaded ${attachments.map(a => a.filename).join(", ")}. Please review.` : "");
    const next: ChatMessage[] = [...messages, { role: "user", content: userText, attachments }];
    setMessages(next);
    setInput("");

    try {
      const res = await sendToAgent(
        next.map(({ role, content }) => ({ role, content })),
        conversationId
      );
      setMessages([...next, { role: "assistant", content: res.content || "(no response)", tools: res.tools }]);
      // refresh conversations list for new title / order
      try {
        const list = await listConversations();
        setConversations(list);
      } catch { /* noop */ }
    } catch (e: any) {
      toast.error(e.message || "Agent error");
      setMessages(next);
    } finally {
      setBusy(false);
    }
  }

  async function regenerateLast() {
    if (busy || messages.length < 2) return;
    // Find last user message
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") { lastUserIdx = i; break; }
    if (lastUserIdx < 0) return;
    const trimmed = messages.slice(0, lastUserIdx + 1);
    setMessages(trimmed);
    setBusy(true);
    try {
      const res = await sendToAgent(
        trimmed.map(({ role, content }) => ({ role, content })),
        conversationId!
      );
      setMessages([...trimmed, { role: "assistant", content: res.content || "(no response)", tools: res.tools }]);
    } catch (e: any) {
      toast.error(e.message || "Agent error");
    } finally { setBusy(false); }
  }

  function copyMsg(idx: number, content: string) {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  // Drag and drop handlers
  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragActive(true); }
  function onDragLeave(e: React.DragEvent) { e.preventDefault(); setDragActive(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFilePick(e.dataTransfer.files);
  }

  const currentConvo = conversations.find((c) => c.id === conversationId);

  return (
    <div
      className="flex flex-col h-full glass rounded-2xl shadow-elegant overflow-hidden relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragActive && (
        <div className="absolute inset-0 z-20 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center pointer-events-none">
          <div className="text-primary font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" /> Drop to attach (PDF, DOCX, TXT)
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Mr. Cisco</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {currentConvo?.title ?? "Executive Agent"} · online
          </div>
        </div>

        {/* Conversation switcher */}
        <div className="relative" ref={convoMenuRef}>
          <button
            onClick={() => setShowConvoMenu((v) => !v)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-card/60 border border-border hover:border-primary/40 transition"
            title="Conversations"
          >
            Chats <ChevronDown className="w-3 h-3" />
          </button>
          {showConvoMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 max-h-[60vh] overflow-y-auto bg-popover border border-border rounded-xl shadow-elegant z-30">
              <button
                onClick={startNewConversation}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent/50 border-b border-border text-primary font-medium"
              >
                <Plus className="w-4 h-4" /> New Chat
              </button>
              {conversations.length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">No conversations yet</div>
              )}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 cursor-pointer ${c.id === conversationId ? "bg-accent/30" : ""}`}
                  onClick={() => openConversation(c.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{c.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeConversation(c.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {loadingHistory && (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        )}
        {!loadingHistory && messages.map((m, i) => (
          <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} group`}>
            <div className="max-w-[85%] flex flex-col gap-1.5">
              {m.attachments && m.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {m.attachments.map((a) => (
                    <div key={a.id} className="text-[11px] px-2 py-1 rounded-md bg-card/60 border border-border flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-primary" /> {a.filename}
                    </div>
                  ))}
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "bg-card/60 border border-border text-foreground"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-headings:mt-3 prose-headings:mb-2">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
                {m.tools && m.tools.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1.5">
                    {m.tools.map((t, ti) => (
                      <span key={ti} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20 inline-flex items-center gap-1">
                        <Wrench className="w-2.5 h-2.5" /> {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {m.role === "assistant" && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => copyMsg(i, m.content)}
                    className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    title="Copy"
                  >
                    {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedIdx === i ? "Copied" : "Copy"}
                  </button>
                  {i === messages.length - 1 && (
                    <button
                      onClick={regenerateLast}
                      disabled={busy}
                      className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground inline-flex items-center gap-1 disabled:opacity-40"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-card/60 border border-border rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {uploadingFile ? `Processing ${uploadingFile}…` : "Thinking…"}
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && !loadingHistory && (
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-card/60 border border-border hover:border-primary/40 hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Pending file chips */}
      {pendingFiles.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-2">
          {pendingFiles.map((f, i) => (
            <div key={i} className="text-xs px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 flex items-center gap-2">
              <FileText className="w-3 h-3 text-primary" />
              <span className="max-w-[160px] truncate">{f.name}</span>
              <button
                onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="p-3 border-t border-border flex gap-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={(e) => { handleFilePick(e.target.files); e.target.value = ""; }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          title="Attach file (PDF, DOCX, TXT)"
          className="rounded-xl px-3 py-2.5 text-sm font-medium border bg-card/60 border-border hover:border-primary/40 hover:text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening…" : "Ask Mr. Cisco anything…"}
          className="flex-1 bg-input/40 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition"
          disabled={busy}
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            disabled={busy}
            title={listening ? "Stop & send" : "Speak to Mr. Cisco"}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium border transition disabled:opacity-40 disabled:cursor-not-allowed ${
              listening
                ? "bg-destructive/20 border-destructive/40 text-destructive animate-pulse"
                : "bg-card/60 border-border hover:border-primary/40 hover:text-primary"
            }`}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
        <button
          type="submit"
          disabled={busy || (!input.trim() && pendingFiles.length === 0)}
          className="gradient-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium shadow-glow disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
