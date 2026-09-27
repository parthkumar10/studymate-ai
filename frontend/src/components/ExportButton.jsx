import { Download } from "lucide-react";
import { exportGenerationPdf } from "@/lib/exportPdf";
import { toast } from "sonner";

export function ExportButton({ type, title, result }) {
  const handle = () => {
    try {
      exportGenerationPdf({ type, title, result });
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error("Couldn't create the PDF. Please try again.");
    }
  };
  return (
    <button
      onClick={handle}
      data-testid="export-pdf-button"
      className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground/90 hover:bg-secondary transition-colors"
    >
      <Download className="w-4 h-4" /> Download PDF
    </button>
  );
}
