import { useState, useEffect } from "react";
import { Sparkles, Key, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getStoredAiKey, setStoredAiKey } from "@/lib/localAi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AiSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const current = getStoredAiKey();
    setKey(current);
    setHasKey(Boolean(current));
  }, [open]);

  const handleSave = () => {
    setStoredAiKey(key);
    setHasKey(Boolean(key.trim()));
    setOpen(false);
    toast.success(key.trim() ? "Google Gemini API key saved!" : "Using built-in offline engine");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-xs font-medium text-foreground transition-all shadow-xs"
          title="Configure AI API Key"
        >
          <Sparkles className={`w-3.5 h-3.5 ${hasKey ? "text-amber-500 fill-amber-500/20" : "text-muted-foreground"}`} />
          <span className="hidden sm:inline">{hasKey ? "Gemini AI" : "AI Settings"}</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> AI Engine Settings
          </DialogTitle>
          <DialogDescription>
            StudyMate can run completely serverless on Cloudflare using Google's free Gemini 1.5 Flash AI, or via the built-in fast offline engine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3.5 rounded-xl bg-accent/40 border border-border text-xs space-y-1.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hasKey ? "bg-emerald-500" : "bg-amber-500"}`} />
              Current Status: {hasKey ? "Google Gemini 1.5 Flash Active" : "Built-in Fast Engine Active"}
            </p>
            <p className="text-muted-foreground">
              {hasKey
                ? "Your notes will be analyzed by Google Gemini AI directly in your browser."
                : "No API key configured. StudyMate will generate summaries, flashcards, and quizzes using the built-in local parser."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center justify-between">
              <span>Google Gemini API Key (Free)</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Get free key <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="AIzaSy..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your key is saved locally in your browser and never shared with any third party.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {hasKey ? (
              <button
                type="button"
                onClick={() => {
                  setKey("");
                  setStoredAiKey("");
                  setHasKey(false);
                  toast.info("Gemini key removed. Switched to offline engine.");
                }}
                className="text-xs text-[#DC2626] hover:underline"
              >
                Remove key
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition shadow-xs"
            >
              <Check className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
