import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Plus, FileText, Quote, Lightbulb, Target, Sparkles, Loader2 } from "lucide-react";
import { PageHeader, Card } from "@/components/ui/page";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendToAgent } from "@/lib/agent";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_app/reading")({
  component: ReadingRoom,
});

type Book = { id: string; title: string; author: string | null; current_chapter: number | null; total_chapters: number | null; status: string };
type Note = { id: string; book_id: string | null; content: string; note_type: string; chapter: number | null; created_at: string };

const NOTE_ICONS: Record<string, any> = { note: FileText, quote: Quote, lesson: Lightbulb, action: Target, summary: Sparkles };

function ReadingRoom() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [aiOutput, setAiOutput] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);

  // add book form
  const [bTitle, setBTitle] = useState("");
  const [bAuthor, setBAuthor] = useState("");

  // add note form
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("note");

  async function loadBooks() {
    const { data } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    setBooks(data ?? []);
    if (!selectedId && data?.length) setSelectedId(data[0].id);
  }
  async function loadNotes(bookId: string) {
    const { data } = await supabase.from("notes").select("*").eq("book_id", bookId).order("created_at", { ascending: false });
    setNotes(data ?? []);
  }
  useEffect(() => { loadBooks(); }, []);
  useEffect(() => { if (selectedId) loadNotes(selectedId); else setNotes([]); setAiOutput(""); }, [selectedId]);

  async function addBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("books").insert({ user_id: user.id, title: bTitle, author: bAuthor || null }).select().single();
    if (error) return toast.error(error.message);
    setBTitle(""); setBAuthor("");
    toast.success("Book added");
    setSelectedId(data.id);
    loadBooks();
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim() || !selectedId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("notes").insert({
      user_id: user.id, book_id: selectedId, content: noteContent, note_type: noteType,
    });
    if (error) return toast.error(error.message);
    setNoteContent("");
    loadNotes(selectedId);
  }

  async function askAgent(prompt: string) {
    if (!selectedId) return;
    const book = books.find((b) => b.id === selectedId);
    setAiBusy(true);
    setAiOutput("");
    try {
      const res = await sendToAgent(
        [{ role: "user", content: `${prompt} for the book "${book?.title}" (id: ${selectedId}). Use the summarize_notes tool first.` }],
        crypto.randomUUID(),
      );
      setAiOutput(res.content);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  const selectedBook = books.find((b) => b.id === selectedId);

  return (
    <div>
      <PageHeader title="Reading Room" subtitle="Books, notes, and AI-extracted insights." />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Books list */}
        <div className="space-y-3">
          <Card>
            <form onSubmit={addBook} className="space-y-2">
              <input
                value={bTitle} onChange={(e) => setBTitle(e.target.value)}
                placeholder="Book title"
                className="w-full bg-input/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
              />
              <input
                value={bAuthor} onChange={(e) => setBAuthor(e.target.value)}
                placeholder="Author"
                className="w-full bg-input/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
              />
              <button className="w-full gradient-primary text-primary-foreground rounded-lg py-2 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-1.5 hover:opacity-95 transition">
                <Plus className="w-4 h-4" /> Add book
              </button>
            </form>
          </Card>

          <div className="space-y-2">
            {books.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`w-full text-left p-3 rounded-xl border transition ${selectedId === b.id ? "bg-primary/10 border-primary/40 shadow-glow" : "bg-card/40 border-border/50 hover:border-primary/30"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-12 rounded-md gradient-primary shadow-card shrink-0 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{b.title}</div>
                    {b.author && <div className="text-xs text-muted-foreground truncate">{b.author}</div>}
                  </div>
                </div>
              </button>
            ))}
            {books.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-6">No books yet.</div>
            )}
          </div>
        </div>

        {/* Selected book details */}
        <div className="space-y-4">
          {selectedBook ? (
            <>
              <Card>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedBook.title}</h2>
                    {selectedBook.author && <p className="text-sm text-muted-foreground">{selectedBook.author}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => askAgent("Summarize the key chapters")} disabled={aiBusy} className="text-xs px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground inline-flex items-center gap-1.5 shadow-glow disabled:opacity-50 hover:opacity-95 transition">
                    <Sparkles className="w-3 h-3" /> Summarize Chapter
                  </button>
                  <button onClick={() => askAgent("Extract the key lessons and financial principles")} disabled={aiBusy} className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 inline-flex items-center gap-1.5 transition disabled:opacity-50">
                    <Lightbulb className="w-3 h-3" /> Extract Key Lessons
                  </button>
                  <button onClick={() => askAgent("Convert the notes into a concrete action plan")} disabled={aiBusy} className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 inline-flex items-center gap-1.5 transition disabled:opacity-50">
                    <Target className="w-3 h-3" /> Convert to Action Plan
                  </button>
                </div>

                {(aiBusy || aiOutput) && (
                  <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    {aiBusy ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Mr. Cisco is reading your notes…
                      </div>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{aiOutput}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              <Card>
                <h3 className="font-semibold mb-3 text-sm">Add note</h3>
                <form onSubmit={addNote} className="space-y-2">
                  <textarea
                    value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Quote, lesson, or note…"
                    rows={3}
                    className="w-full bg-input/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-none"
                  />
                  <div className="flex gap-2">
                    <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className="bg-input/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      <option value="note">Note</option>
                      <option value="quote">Quote</option>
                      <option value="lesson">Lesson</option>
                      <option value="action">Action</option>
                    </select>
                    <button className="ml-auto gradient-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium shadow-glow hover:opacity-95 transition">Save</button>
                  </div>
                </form>
              </Card>

              <div className="space-y-2">
                {notes.map((n) => {
                  const Icon = NOTE_ICONS[n.note_type] || FileText;
                  return (
                    <Card key={n.id}>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{n.note_type}</div>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">{n.content}</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {notes.length === 0 && (
                  <Card className="text-center py-8 text-muted-foreground text-sm">No notes yet for this book.</Card>
                )}
              </div>
            </>
          ) : (
            <Card className="text-center py-16 text-muted-foreground text-sm">Add a book to begin.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
