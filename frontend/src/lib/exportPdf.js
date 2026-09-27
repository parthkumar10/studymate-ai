import { jsPDF } from "jspdf";

const TYPE_LABEL = { summary: "Summary", flashcards: "Flashcards", quiz: "Quiz" };

export function exportGenerationPdf({ type, title, result }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const SAGE = [59, 99, 70];
  const DARK = [30, 41, 59];
  const GREY = [100, 116, 139];

  const ensureSpace = (needed) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const write = (text, { size = 11, style = "normal", color = DARK, gap = 6, indent = 0 } = {}) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text ?? ""), contentW - indent);
    lines.forEach((line) => {
      ensureSpace(size + 4);
      doc.text(line, margin + indent, y);
      y += size + 4;
    });
    y += gap;
  };

  const rule = () => {
    ensureSpace(12);
    doc.setDrawColor(230, 225, 218);
    doc.line(margin, y, pageW - margin, y);
    y += 16;
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...SAGE);
  doc.text("StudyMate", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text(TYPE_LABEL[type] || "Study material", pageW - margin, y, { align: "right" });
  y += 20;
  rule();

  write(title || TYPE_LABEL[type], { size: 15, style: "bold", gap: 12 });

  if (type === "summary") {
    write("Overview", { size: 13, style: "bold", color: SAGE, gap: 4 });
    write(result?.overview || "", { gap: 14 });

    if (result?.concepts?.length) {
      write("Key Concepts", { size: 13, style: "bold", color: SAGE, gap: 4 });
      result.concepts.forEach((c) => write("• " + c, { gap: 2, indent: 4 }));
      y += 10;
    }
    if (result?.key_points?.length) {
      write("Key Points", { size: 13, style: "bold", color: SAGE, gap: 4 });
      result.key_points.forEach((p) => write("• " + p, { gap: 2, indent: 4 }));
    }
  } else if (type === "flashcards") {
    (result?.cards || []).forEach((card, i) => {
      write(`Card ${i + 1}`, { size: 11, style: "bold", color: SAGE, gap: 2 });
      write("Q: " + card.question, { style: "bold", gap: 2 });
      write("A: " + card.answer, { color: GREY, gap: 12 });
    });
  } else if (type === "quiz") {
    (result?.questions || []).forEach((q, i) => {
      write(`${i + 1}. ${q.question}`, { style: "bold", gap: 4 });
      (q.options || []).forEach((opt, oi) => {
        const marker = oi === q.correct_index ? "(correct) " : "( ) ";
        write(marker + opt, { color: oi === q.correct_index ? SAGE : DARK, gap: 1, indent: 8 });
      });
      if (q.explanation) write("Why: " + q.explanation, { size: 10, color: GREY, gap: 12, indent: 8 });
    });
  }

  const safe = (title || TYPE_LABEL[type] || "studymate").replace(/[^a-z0-9]+/gi, "-").slice(0, 40).toLowerCase();
  doc.save(`studymate-${safe}.pdf`);
}
