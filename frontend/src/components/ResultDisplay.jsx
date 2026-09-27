import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, ChevronLeft, ChevronRight, RotateCw, Lightbulb,
  ListChecks, Sparkles, RefreshCw, Trophy, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

export function ResultDisplay({ type, result }) {
  if (type === "summary") return <SummaryView result={result} />;
  if (type === "flashcards") return <FlashcardsView result={result} />;
  if (type === "quiz") return <QuizView result={result} />;
  return null;
}

/* ---------------- Summary ---------------- */
function SummaryView({ result }) {
  const [copied, setCopied] = useState(false);
  const concepts = result?.concepts || [];
  const keyPoints = result?.key_points || [];

  const copyAll = async () => {
    const text = [
      "OVERVIEW\n" + (result?.overview || ""),
      "\nKEY CONCEPTS\n" + concepts.map((c) => "• " + c).join("\n"),
      "\nKEY POINTS\n" + keyPoints.map((c) => "• " + c).join("\n"),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Summary copied to clipboard");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div data-testid="summary-content" className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={copyAll}
          data-testid="copy-summary-button"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground/90 hover:bg-secondary transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy summary"}
        </button>
      </div>

      <Section icon={Sparkles} title="Overview">
        <p className="text-foreground/90 leading-relaxed text-[1.05rem]">{result?.overview}</p>
      </Section>

      {concepts.length > 0 && (
        <Section icon={Lightbulb} title="Key concepts">
          <div className="flex flex-wrap gap-2">
            {concepts.map((c, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium">
                {c}
              </span>
            ))}
          </div>
        </Section>
      )}

      {keyPoints.length > 0 && (
        <Section icon={ListChecks} title="Key points">
          <ul className="space-y-2.5">
            {keyPoints.map((p, i) => (
              <li key={i} className="flex gap-3 text-foreground/90 leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent text-accent-foreground">
          <Icon className="w-4 h-4" />
        </span>
        <h3 className="font-serif text-xl text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ---------------- Flashcards ---------------- */
function FlashcardsView({ result }) {
  const cards = result?.cards || [];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState({});

  if (cards.length === 0) return <Empty text="No flashcards were generated." />;

  const card = cards[index];
  const go = (dir) => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.min(Math.max(i + dir, 0), cards.length - 1)), 120);
  };
  const masteredCount = Object.values(mastered).filter(Boolean).length;

  return (
    <div data-testid="flashcard-container" className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-mono uppercase tracking-wider text-muted-foreground">
          Card {index + 1} of {cards.length}
        </span>
        <span className="text-muted-foreground">{masteredCount} mastered</span>
      </div>

      <div className="perspective-1000">
        <motion.button
          onClick={() => setFlipped((f) => !f)}
          data-testid="flashcard-flip-button"
          className="relative w-full h-72 sm:h-80 text-left"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            data-testid="flashcard-front"
            className="absolute inset-0 backface-hidden rounded-2xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center shadow-sm"
          >
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground/70 mb-4">Question</span>
            <p className="font-serif text-2xl sm:text-3xl text-foreground leading-snug">{card.question}</p>
            <span className="mt-6 text-sm text-muted-foreground/70 flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" /> Tap to reveal
            </span>
          </div>
          <div
            data-testid="flashcard-back"
            className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border border-primary/25 bg-accent p-8 flex flex-col items-center justify-center text-center shadow-sm"
          >
            <span className="font-mono text-xs uppercase tracking-wider text-accent-foreground/60 mb-4">Answer</span>
            <p className="text-lg sm:text-xl text-accent-foreground leading-relaxed">{card.answer}</p>
          </div>
        </motion.button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          data-testid="flashcard-prev-button"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground/90 hover:bg-secondary transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>

        <button
          onClick={() => setMastered((m) => ({ ...m, [index]: !m[index] }))}
          data-testid="flashcard-master-button"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            mastered[index]
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-foreground/90 hover:bg-secondary"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {mastered[index] ? "Mastered" : "Mark mastered"}
        </button>

        <button
          onClick={() => go(1)}
          disabled={index === cards.length - 1}
          data-testid="flashcard-next-button"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground/90 hover:bg-secondary transition-colors disabled:opacity-40"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Quiz ---------------- */
function QuizView({ result }) {
  const questions = result?.questions || [];
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) return <Empty text="No quiz questions were generated." />;

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0), 0);

  const retry = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div data-testid="quiz-container" className="space-y-5">
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="quiz-score-card"
          className="bg-card rounded-2xl border border-primary/25 p-6 flex items-center gap-4"
        >
          <span className="grid place-items-center w-14 h-14 rounded-2xl bg-accent text-accent-foreground">
            <Trophy className="w-7 h-7" />
          </span>
          <div className="flex-1">
            <p className="font-serif text-2xl text-foreground">
              You scored {score} / {questions.length}
            </p>
            <p className="text-muted-foreground text-sm">
              {score === questions.length ? "Perfect — you've got this!" : "Review the explanations below and try again."}
            </p>
          </div>
          <button
            onClick={retry}
            data-testid="quiz-retry-button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[#2D4E37] transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </motion.div>
      )}

      {questions.map((q, qi) => (
        <div key={qi} data-testid="quiz-question-item" className="bg-card rounded-2xl border border-border p-5 sm:p-6">
          <p className="font-medium text-foreground mb-4 leading-relaxed">
            <span className="font-mono text-sm text-muted-foreground/70 mr-2">{qi + 1}.</span>
            {q.question}
          </p>
          <div className="space-y-2.5">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const isCorrect = q.correct_index === oi;
              let cls = "border-border bg-card hover:bg-secondary";
              if (submitted) {
                if (isCorrect) cls = "border-primary bg-accent";
                else if (selected && !isCorrect) cls = "border-[#fecaca] bg-[#FEF2F2] dark:border-[#7f1d1d] dark:bg-[#3a1d1d]";
                else cls = "border-border bg-card opacity-70";
              } else if (selected) {
                cls = "border-primary bg-accent";
              }
              return (
                <button
                  key={oi}
                  disabled={submitted}
                  onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  data-testid="quiz-option-button"
                  className={`w-full text-left px-4 py-3 rounded-xl border text-foreground/90 transition-colors flex items-center justify-between gap-3 ${cls}`}
                >
                  <span>{opt}</span>
                  {submitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                  {submitted && selected && !isCorrect && <XCircle className="w-5 h-5 text-[#DC2626] shrink-0" />}
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {submitted && q.explanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
              >
                <p className="mt-4 text-sm text-muted-foreground bg-secondary rounded-lg px-3.5 py-3 leading-relaxed">
                  <span className="font-semibold text-foreground/90">Why: </span>
                  {q.explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={!allAnswered}
          data-testid="quiz-submit-button"
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-[#2D4E37] transition-colors disabled:opacity-50"
        >
          {allAnswered ? "Check answers" : `Answer all ${questions.length} questions`}
        </button>
      )}
    </div>
  );
}

function Empty({ text }) {
  return <div className="text-center text-muted-foreground py-10">{text}</div>;
}
