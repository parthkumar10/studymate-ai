// Local & Gemini AI Generator for StudyMate (Cloudflare-only / Serverless)

export function getStoredAiKey() {
  try {
    return (
      localStorage.getItem("studymate_gemini_key") ||
      process.env.REACT_APP_GEMINI_API_KEY ||
      ""
    );
  } catch (_) {
    return "";
  }
}

export function setStoredAiKey(key) {
  try {
    if (!key) {
      localStorage.removeItem("studymate_gemini_key");
    } else {
      localStorage.setItem("studymate_gemini_key", key.trim());
    }
  } catch (_) {}
}

const SYSTEM_PROMPTS = {
  summary: `You are StudyMate, an academic study assistant. Summarise the student's lecture notes. Return ONLY valid JSON (no markdown formatting, no code fences) with this exact JSON shape:
{
  "overview": "a short 2-3 sentence overview",
  "concepts": ["important concept 1", "important concept 2", "important concept 3"],
  "key_points": ["key point 1", "key point 2", "key point 3", "key point 4"]
}`,
  flashcards: `You are StudyMate, an academic study assistant. Create between 5 and 10 study flashcards from the notes. Return ONLY valid JSON (no markdown formatting, no code fences) with this exact JSON shape:
{
  "cards": [
    {"question": "clear question or term", "answer": "concise explanation or definition"}
  ]
}`,
  quiz: `You are StudyMate, an academic study assistant. Generate between 4 and 6 multiple-choice questions from the notes. Return ONLY valid JSON (no markdown formatting, no code fences) with this exact JSON shape:
{
  "questions": [
    {
      "question": "the question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}`,
};

function cleanJsonText(raw) {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "");
    const lastTick = text.lastIndexOf("```");
    if (lastTick !== -1) {
      text = text.substring(0, lastTick);
    }
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    text = text.substring(start, end + 1);
  }
  return JSON.parse(text);
}

export async function generateWithGemini(type, inputText, apiKey) {
  const systemPrompt = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.summary;
  const prompt = `${systemPrompt}\n\nStrict requirement: Base everything strictly on the supplied notes. Respond with ONLY the raw JSON object.\n\nNotes:\n${inputText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData?.error?.message || `Gemini API error (${response.status})`;
    throw new Error(msg);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("No response from Gemini API");
  return cleanJsonText(rawText);
}

// Smart heuristic generator when no Gemini key is configured
export function generateOffline(type, inputText) {
  const clean = inputText.trim();
  const sentences = clean
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const words = clean.split(/\s+/);

  // Extract candidate concepts (capitalized phrases or keywords)
  const candidateConcepts = Array.from(
    new Set(
      (clean.match(/\b[A-Z][a-zA-Z0-9-]{3,}\b/g) || [])
        .filter((w) => !["This", "There", "When", "With", "What", "They", "These", "Then", "Some", "Most"].includes(w))
    )
  ).slice(0, 6);

  if (candidateConcepts.length < 2) {
    candidateConcepts.push("Key Theory", "Core Process", "Mechanism");
  }

  if (type === "summary") {
    const overview =
      sentences.slice(0, 2).join(" ") ||
      "This material covers the core principles, processes, and essential factors introduced in the lecture.";
    const keyPoints =
      sentences.length > 2
        ? sentences.slice(1, 6)
        : [
            "Covers foundational definitions and core mechanics.",
            "Highlights critical stages and active components.",
            "Outlines practical implications and key variables.",
          ];

    return {
      overview,
      concepts: candidateConcepts,
      key_points: keyPoints,
    };
  }

  if (type === "flashcards") {
    const cards = [];
    // Turn sentences with "is", "occurs", "contains", "produces" into Q&A cards
    for (let i = 0; i < sentences.length && cards.length < 8; i++) {
      const s = sentences[i];
      if (/ (is|are|occurs|refers to|takes place|produces|causes) /i.test(s)) {
        const parts = s.split(/ (?:is|are|occurs|refers to|takes place|produces|causes) /i);
        if (parts.length >= 2 && parts[0].length < 60) {
          cards.push({
            question: `What ${s.includes(" are ") ? "are" : "is"} ${parts[0].trim()}?`,
            answer: s,
          });
          continue;
        }
      }
      // Fallback card from sentence
      const snippet = s.split(",")[0] || s.slice(0, 50);
      cards.push({
        question: `Explain: ${snippet.trim()}`,
        answer: s,
      });
    }

    if (cards.length < 3) {
      cards.push(
        {
          question: `What is the primary subject of these notes?`,
          answer: sentences[0] || clean.slice(0, 150),
        },
        {
          question: `What are the key stages or components involved?`,
          answer: sentences[1] || "Refer to the main lecture segments.",
        }
      );
    }

    return { cards };
  }

  if (type === "quiz") {
    const questions = [];
    for (let i = 0; i < Math.min(sentences.length, 5); i++) {
      const sentence = sentences[i];
      const concept = candidateConcepts[i % candidateConcepts.length] || "Key element";
      questions.push({
        question: `Based on the notes: "${sentence.slice(0, 110)}${sentence.length > 110 ? "…" : ""}" — which statement is accurate?`,
        options: [
          sentence.slice(0, 80) + (sentence.length > 80 ? "…" : ""),
          `It is independent of ${concept}.`,
          `It occurs only under inverse conditions.`,
          `None of the above are valid.`,
        ],
        correct_index: 0,
        explanation: `As stated directly in the notes: "${sentence}"`,
      });
    }

    if (questions.length < 2) {
      questions.push({
        question: "What is the primary conclusion of the provided lecture notes?",
        options: [
          sentences[0] || "The primary mechanisms outlined in the notes.",
          "An unrelated laboratory exception.",
          "Hypothetical models without practical application.",
          "Information not provided in the source text.",
        ],
        correct_index: 0,
        explanation: "Derived directly from the opening statements of your notes.",
      });
    }

    return { questions };
  }

  return { overview: clean.slice(0, 200), concepts: candidateConcepts, key_points: [] };
}
