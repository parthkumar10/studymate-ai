import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, formatApiError } from "@/lib/api";
import { AppShell, TYPE_META, formatDate } from "@/components/AppShell";
import { ResultDisplay } from "@/components/ResultDisplay";
import {
  FileText, Layers, HelpCircle, Sparkles, Loader2, AlertCircle,
  RotateCw, Clock, ArrowRight, FilePlus2,
} from "lucide-react";
import { toast } from "sonner";

const MAX_CHARS = 8000;

const ACTIONS = [
  { id: "summary", label: "Summarise", desc: "Overview, concepts & key points", icon: FileText, testid: "action-selector-summary" },
  { id: "flashcards", label: "Flashcards", desc: "Q&A cards to memorise", icon: Layers, testid: "action-selector-flashcards" },
  { id: "quiz", label: "Quiz", desc: "Multiple-choice questions", icon: HelpCircle, testid: "action-selector-quiz" },
];

const SAMPLE = `Photosynthesis is the process by which green plants, algae and some bacteria convert light energy into chemical energy stored in glucose. It occurs mainly in the chloroplasts, which contain the pigment chlorophyll. The overall equation is 6CO2 + 6H2O + light energy -> C6H12O6 + 6O2.

There are two main stages: the light-dependent reactions and the light-independent reactions (Calvin cycle). The light-dependent reactions take place in the thylakoid membranes and produce ATP and NADPH while splitting water to release oxygen. The Calvin cycle occurs in the stroma and uses ATP and NADPH to fix carbon dioxide into glucose.

Key factors affecting the rate of photosynthesis include light intensity, carbon dioxide concentration and temperature.`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [action, setAction] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);

  const loadRecent = useCallback(() => {
    api.get("/generations").then((res) => setRecent(res.data.slice(0, 5))).catch(() => {});
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const trimmedLen = text.trim().length;
  const over = text.length > MAX_CHARS;

  const generate = async () => {
    if (loading) return;
    setError("");
    if (trimmedLen === 0) {
      setError("Please paste some notes before generating.");
      return;
    }
    if (over) {
      setError(`Your notes are ${text.length} characters. The limit is ${MAX_CHARS}. Please shorten them and try again.`);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post("/generate", { input_text: text, type: action });
      setResult(res.data);
      loadRecent();
      toast.success("Study material generated & saved");
    } catch (err) {
      setError(formatApiError(err, "We couldn't generate right now. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 tracking-tight">Your study workspace</h1>
          <p className="text-slate-500 mt-2">Paste your lecture notes, pick an action, and let StudyMate do the rest.</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Main workspace */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Note input */}
            <div className="bg-white rounded-2xl border border-border p-5 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="font-serif text-xl text-slate-900">Lecture notes</label>
                <button
                  onClick={() => setText(SAMPLE)}
                  data-testid="sample-note-button"
                  className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                >
                  <FilePlus2 className="w-4 h-4" /> Load sample
                </button>
              </div>
              <textarea
                data-testid="note-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type your class notes here…"
                className="w-full min-h-[260px] resize-y rounded-xl border border-input bg-background/50 p-4 text-slate-800 leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition"
              />
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className={over ? "text-[#DC2626] font-medium" : "text-slate-400"} data-testid="char-counter">
                  {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
                </span>
                <span className="text-slate-400">{trimmedLen > 0 ? `${text.trim().split(/\s+/).length} words` : ""}</span>
              </div>
            </div>

            {/* Action selector */}
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-slate-500 mb-3">Choose an action</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {ACTIONS.map((a) => {
                  const active = action === a.id;
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      data-testid={a.testid}
                      onClick={() => setAction(a.id)}
                      className={`text-left rounded-2xl border p-4 transition-all ${
                        active
                          ? "border-primary bg-accent ring-4 ring-primary/10 -translate-y-0.5"
                          : "border-border bg-white hover:border-primary/40 hover:-translate-y-0.5"
                      }`}
                    >
                      <span
                        className={`grid place-items-center w-9 h-9 rounded-lg mb-3 ${
                          active ? "bg-primary text-primary-foreground" : "bg-secondary text-slate-600"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </span>
                      <p className="font-semibold text-slate-900">{a.label}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{a.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate */}
            <button
              onClick={generate}
              disabled={loading}
              data-testid="generate-button"
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-[#2D4E37] transition-colors disabled:opacity-70 flex items-center justify-center gap-2.5 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Generating your study material…
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Generate study material
                </>
              )}
            </button>

            {error && (
              <div
                data-testid="generate-error"
                className="flex items-start gap-3 text-[#DC2626] bg-[#FEF2F2] border border-[#fecaca] rounded-xl px-4 py-3"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm">{error}</p>
                  <button onClick={generate} className="mt-1.5 text-sm font-semibold underline flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5" /> Try again
                  </button>
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="bg-white rounded-2xl border border-border p-6 animate-pulse space-y-3">
                <div className="h-4 bg-secondary rounded w-1/3" />
                <div className="h-3 bg-secondary rounded w-full" />
                <div className="h-3 bg-secondary rounded w-5/6" />
                <div className="h-3 bg-secondary rounded w-4/6" />
              </div>
            )}

            {/* Result */}
            <AnimatePresence>
              {result && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  data-testid="result-view-container"
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_META[result.type].chip}`}>
                      {TYPE_META[result.type].label}
                    </span>
                    <span className="font-serif text-2xl text-slate-900">Result</span>
                  </div>
                  <ResultDisplay type={result.type} result={result.result} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent history sidebar */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-2xl border border-border p-5 sm:p-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" /> Recent
                </h2>
                <button onClick={() => navigate("/history")} className="text-sm text-primary font-medium hover:underline">
                  View all
                </button>
              </div>

              {recent.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center" data-testid="recent-empty">
                  Your generations will appear here.
                </p>
              ) : (
                <ul className="space-y-2.5" data-testid="recent-history-list">
                  {recent.map((g) => (
                    <li key={g.id}>
                      <button
                        data-testid="recent-history-item"
                        onClick={() => navigate(`/generation/${g.id}`)}
                        className="w-full text-left rounded-xl border border-border p-3.5 hover:bg-secondary hover:border-primary/30 transition-colors group"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_META[g.type].chip}`}>
                            {TYPE_META[g.type].label}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2 leading-snug">{g.preview || g.title}</p>
                        <p className="text-xs text-slate-400 mt-1.5">{formatDate(g.created_at)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
