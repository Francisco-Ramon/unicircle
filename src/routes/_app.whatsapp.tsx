import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { PageHeader, Card } from "@/components/ui/page";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, RefreshCw, Phone, Clock, ChevronRight, ArrowLeft, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/whatsapp")({
  component: WhatsAppPage,
});

type Conversation = {
  id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata: any;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function extractPhone(title: string) {
  const match = title.match(/\((\d+)\)/);
  return match ? match[1] : null;
}

function extractName(title: string) {
  return title.replace("WhatsApp: ", "").replace(/\s*\(\d+\)/, "").trim();
}

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [waConnected, setWaConnected] = useState<boolean | null>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, last_message_at, created_at")
        .eq("user_id", user.id)
        .ilike("title", "WhatsApp:%")
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setConversations(data ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conv: Conversation) => {
    setMsgLoading(true);
    setMessages([]);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at, metadata")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data ?? []) as Message[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    // Check if server is running
    fetch("https://mr-cisco-whatsapp-production.up.railway.app/api/whatsapp-status")
      .then(r => r.json())
      .then(d => setWaConnected(d.linked))
      .catch(() => setWaConnected(false));
  }, [loadConversations]);

  useEffect(() => {
    if (selected) loadMessages(selected);
  }, [selected, loadMessages]);

  // Auto-refresh messages every 5s when a conversation is open
  useEffect(() => {
    if (!selected) return;
    const t = setInterval(() => loadMessages(selected), 5000);
    return () => clearInterval(t);
  }, [selected, loadMessages]);

  if (selected) {
    const phone = extractPhone(selected.title);
    const name = extractName(selected.title);

    return (
      <div className="flex flex-col h-[calc(100dvh-9rem)] md:h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setSelected(null)}
            className="p-2 rounded-lg hover:bg-card border border-transparent hover:border-border transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
            {name[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="font-semibold">{name}</div>
            {phone && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 w-3" /> +{phone}
              </div>
            )}
          </div>
          <button
            onClick={() => loadMessages(selected)}
            className="ml-auto p-2 rounded-lg hover:bg-card border border-transparent hover:border-border transition"
          >
            <RefreshCw className={`w-4 h-4 ${msgLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {msgLoading && messages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">Loading messages…</div>
          )}
          {messages.map((msg) => {
            const isAI = msg.role === "assistant";
            return (
              <div key={msg.id} className={`flex ${isAI ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isAI
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border rounded-bl-sm"
                }`}>
                  {!isAI && (
                    <div className="text-[10px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> {name}
                    </div>
                  )}
                  {isAI && (
                    <div className="text-[10px] font-semibold text-primary-foreground/60 mb-1">
                      Mr. Cisco
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <div className={`text-[10px] mt-1.5 ${isAI ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && !msgLoading && (
            <div className="text-sm text-muted-foreground text-center py-8">No messages yet.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        subtitle="All WhatsApp conversations handled by Mr. Cisco."
        actions={
          <div className="flex items-center gap-3">
            <span className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-full border ${
              waConnected
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                : "text-muted-foreground border-border bg-card"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${waConnected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
              {waConnected ? "Connected · 254713288681" : "Server offline"}
            </span>
            <button
              onClick={loadConversations}
              disabled={loading}
              className="text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition flex items-center gap-1 border border-border hover:border-primary/40"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        }
      />

      {loading && conversations.length === 0 && (
        <Card>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <RefreshCw className="w-3 h-3 animate-spin" /> Loading conversations…
          </div>
        </Card>
      )}

      {!loading && conversations.length === 0 && (
        <Card>
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">No conversations yet</div>
              <div className="text-sm text-muted-foreground mt-1">
                When someone messages your WhatsApp number, the conversation will appear here automatically.
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {conversations.map((conv) => {
          const name = extractName(conv.title);
          const phone = extractPhone(conv.title);
          return (
            <button
              key={conv.id}
              onClick={() => setSelected(conv)}
              className="w-full text-left"
            >
              <Card className="hover:border-primary/40 transition cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    {name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{name}</span>
                      {conv.last_message_at && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {timeAgo(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                    {phone && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> +{phone}
                      </div>
                    )}
                    <div className="text-xs text-emerald-400/80 mt-1 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition shrink-0" />
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
