import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Check, Clock, Trash2 } from "lucide-react";
import { PageHeader, Card } from "@/components/ui/page";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

type Task = {
  id: string; title: string; priority: string; deadline: string | null; status: string; created_at: string;
};

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [deadline, setDeadline] = useState("");

  async function load() {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, title, priority, deadline: deadline || null,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setDeadline("");
    toast.success("Task created");
    load();
  }

  async function complete(id: string) {
    await supabase.from("tasks").update({ status: "completed" }).eq("id", id);
    load();
  }
  async function remove(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  const open = tasks.filter((t) => t.status !== "completed");
  const today = open.filter((t) => t.deadline && new Date(t.deadline).toDateString() === new Date().toDateString());
  const week = open.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    const now = new Date();
    const wk = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    return d > now && d <= wk && d.toDateString() !== now.toDateString();
  });
  const later = open.filter((t) => !today.includes(t) && !week.includes(t));
  const done = tasks.filter((t) => t.status === "completed");

  function group(label: string, items: Task[]) {
    if (items.length === 0) return null;
    return (
      <Card>
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-widest text-muted-foreground">{label}</h3>
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-card/40 border border-border/50 group">
              <button
                onClick={() => complete(t.id)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${t.status === "completed" ? "bg-success border-success" : "border-border hover:border-primary"}`}
              >
                {t.status === "completed" && <Check className="w-3 h-3 text-background" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                {t.deadline && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {new Date(t.deadline).toLocaleString()}
                  </div>
                )}
              </div>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                t.priority === "urgent" ? "bg-destructive/15 text-destructive border border-destructive/20" :
                t.priority === "high" ? "bg-warning/15 text-warning border border-warning/20" :
                "bg-muted text-muted-foreground border border-border"
              }`}>{t.priority}</span>
              <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader title="Tasks" subtitle={`${open.length} open · ${done.length} completed`} />

      <Card className="mb-4">
        <form onSubmit={add} className="flex flex-col md:flex-row gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className="flex-1 bg-input/40 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-input/40 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="bg-input/40 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60"
          />
          <button className="gradient-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium shadow-glow inline-flex items-center gap-1.5 hover:opacity-95 transition">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {group("Today", today)}
        {group("This week", week)}
        {group("Later", later)}
        {open.length === 0 && (
          <Card className="text-center py-12 text-muted-foreground text-sm">
            No open tasks. Ask Mr. Cisco to plan your day in the chat panel →
          </Card>
        )}
        {done.length > 0 && group("Completed", done.slice(0, 5))}
      </div>
    </div>
  );
}
