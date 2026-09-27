import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { AppShell, TYPE_META, formatDate } from "@/components/AppShell";
import {
  Search, Trash2, ArrowRight, Loader2, Inbox,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const FILTERS = [
  { id: "all", label: "All", testid: "history-filter-all" },
  { id: "summary", label: "Summaries", testid: "history-filter-summary" },
  { id: "flashcards", label: "Flashcards", testid: "history-filter-flashcards" },
  { id: "quiz", label: "Quizzes", testid: "history-filter-quiz" },
];

export default function History() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get("/generations").then((res) => setItems(res.data)).catch(() => setItems([]));
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((g) => {
      if (filter !== "all" && g.type !== filter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (g.title || "").toLowerCase().includes(q) || (g.preview || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, filter, query]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/generations/${toDelete.id}`);
      setItems((prev) => prev.filter((g) => g.id !== toDelete.id));
      toast.success("Generation deleted");
    } catch {
      toast.error("Couldn't delete. Please try again.");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 tracking-tight">History</h1>
          <p className="text-slate-500 mt-2">Revisit everything you've generated.</p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              data-testid="history-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keyword or topic…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-white text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                data-testid={f.testid}
                onClick={() => setFilter(f.id)}
                className={`px-3.5 h-11 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f.id ? "bg-primary text-primary-foreground" : "bg-white border border-border text-slate-600 hover:bg-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {items === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" data-testid="history-empty">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-secondary text-slate-400 mb-4">
              <Inbox className="w-7 h-7" />
            </span>
            <p className="text-slate-600 font-medium">
              {items.length === 0 ? "Nothing here yet" : "No matches found"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {items.length === 0 ? "Generate your first study material from the dashboard." : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((g, i) => (
              <motion.li
                key={g.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                data-testid="history-item-card"
                className="bg-white rounded-2xl border border-border p-4 sm:p-5 flex items-center gap-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_META[g.type].chip}`}>
                      {TYPE_META[g.type].label}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(g.created_at)}</span>
                  </div>
                  <p className="text-slate-700 line-clamp-1">{g.preview || g.title}</p>
                </div>
                <button
                  data-testid="history-item-open-button"
                  onClick={() => navigate(`/generation/${g.id}`)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-secondary text-slate-700 text-sm font-medium hover:bg-accent transition-colors shrink-0"
                >
                  Open <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  data-testid="history-item-delete-button"
                  onClick={() => setToDelete(g)}
                  className="grid place-items-center w-9 h-9 rounded-lg text-slate-400 hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this generation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove it from your history. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-confirm-button"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-[#DC2626] hover:bg-[#b91c1c]"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
