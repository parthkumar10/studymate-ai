import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { BookOpenText, Loader2, GraduationCap, Sparkles } from "lucide-react";

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (isSignup && !name.trim()) return setError("Please enter your name.");
    if (!email.trim() || !password) return setError("Please fill in all fields.");
    setLoading(true);
    try {
      if (isSignup) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1516042438821-0abd7a73c4b3?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200')",
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary-foreground/15">
            <BookOpenText className="w-6 h-6" />
          </span>
          <span className="font-serif text-2xl font-semibold">StudyMate</span>
        </div>
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="font-serif text-4xl xl:text-5xl leading-tight">
            Turn raw notes into exam-ready knowledge.
          </h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Paste your lecture notes and let StudyMate craft clear summaries, flashcards, and quizzes — all in one calm workspace.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            {[
              { icon: Sparkles, t: "Concise summaries with key concepts" },
              { icon: GraduationCap, t: "Flashcards & quizzes from your material" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-primary-foreground/90">
                <f.icon className="w-5 h-5 shrink-0" />
                <span>{f.t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-primary-foreground/60 text-sm">Your private study companion.</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
              <BookOpenText className="w-5 h-5" />
            </span>
            <span className="font-serif text-xl font-semibold text-slate-900">StudyMate</span>
          </div>

          <h2 className="font-serif text-3xl text-slate-900 tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-slate-500 mt-2 mb-8">
            {isSignup ? "Start turning notes into study material." : "Sign in to continue studying."}
          </p>

          <form onSubmit={submit} className="space-y-5">
            {isSignup && (
              <Field label="Name">
                <input
                  data-testid="signup-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="input-field"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                data-testid={isSignup ? "signup-email-input" : "login-email-input"}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="input-field"
              />
            </Field>
            <Field label="Password">
              <input
                data-testid={isSignup ? "signup-password-input" : "login-password-input"}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "At least 6 characters" : "••••••••"}
                className="input-field"
              />
            </Field>

            {error && (
              <div
                data-testid="auth-error"
                className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#fecaca] rounded-lg px-3 py-2.5"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid={isSignup ? "signup-submit-button" : "login-submit-button"}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-[#2D4E37] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {isSignup ? "Already have an account?" : "New to StudyMate?"}{" "}
            <Link
              to={isSignup ? "/login" : "/signup"}
              state={location.state}
              data-testid="auth-toggle-button"
              className="text-primary font-semibold hover:underline"
            >
              {isSignup ? "Sign in" : "Create one"}
            </Link>
          </p>
        </motion.div>
      </div>

      <style>{`
        .input-field {
          width: 100%; height: 3rem; padding: 0 0.9rem; border-radius: 0.75rem;
          border: 1px solid hsl(var(--input)); background: #fff; color: hsl(var(--foreground));
          outline: none; transition: border-color .15s, box-shadow .15s; font-size: 0.95rem;
        }
        .input-field:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px rgba(59,99,70,.12); }
        .input-field::placeholder { color: #94A3B8; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
