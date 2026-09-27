import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { AppShell, TYPE_META, formatDate } from "@/components/AppShell";
import { ResultDisplay } from "@/components/ResultDisplay";
import { ExportButton } from "@/components/ExportButton";
import { ArrowLeft, Loader2, AlertCircle, FileText, ChevronDown } from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export default function GenerationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gen, setGen] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get(`/generations/${id}`)
      .then((res) => active && setGen(res.data))
      .catch((err) => active && setError(formatApiError(err, "We couldn't load this generation.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/history")}
          data-testid="back-to-history-button"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to history
        </button>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div
            data-testid="detail-error"
            className="flex items-start gap-3 text-[#DC2626] bg-[#FEF2F2] border border-[#fecaca] dark:text-[#fca5a5] dark:bg-[#3a1d1d] dark:border-[#7f1d1d] rounded-xl px-4 py-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          gen && (
            <div data-testid="detail-view-container" className="space-y-6">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_META[gen.type].chip}`}>
                    {TYPE_META[gen.type].label}
                  </span>
                  <span className="text-sm text-muted-foreground/70">{formatDate(gen.created_at)}</span>
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl text-foreground tracking-tight leading-snug">
                  {gen.title}
                </h1>
                <div className="mt-4">
                  <ExportButton type={gen.type} title={gen.title} result={gen.result} />
                </div>
              </div>

              <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border px-5">
                <AccordionItem value="notes" className="border-none">
                  <AccordionTrigger data-testid="view-original-notes" className="hover:no-underline py-4">
                    <span className="flex items-center gap-2 text-foreground/90 font-medium">
                      <FileText className="w-4 h-4 text-muted-foreground/70" /> View original notes
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed pb-2">
                      {gen.input_text}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <ResultDisplay type={gen.type} result={gen.result} />
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}
