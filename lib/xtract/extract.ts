import type { NewsSignal, RawDocument, XtractResponse } from "@/types/xtract";
import { generateScenario } from "./scenarios";

const XTRACT_TIMEOUT_MS = 6500;
const terms = [
  { words: ["insurance"], topic: "Insurance costs", area: "Auto insurance", direction: "increase" as const, magnitude: "high" as const, signal: "Insurance costs are rising", relevance: "A renewal can squeeze a young driver's monthly budget." },
  { words: ["shelter", "rent", "housing"], topic: "Housing costs", area: "Rent", direction: "increase" as const, magnitude: "high" as const, signal: "Housing costs are putting pressure on renters", relevance: "Rent is often the largest monthly bill for players in their twenties." },
  { words: ["food", "grocery"], topic: "Food prices", area: "Groceries", direction: "increase" as const, magnitude: "medium" as const, signal: "Food costs are increasing", relevance: "Routine grocery spending can slowly erode a player's cushion." },
  { words: ["layoff", "job cuts", "unemployment"], topic: "Job market risk", area: "Employment", direction: "risk" as const, magnitude: "high" as const, signal: "Job-market conditions are creating layoff risk", relevance: "Income stability and job-search decisions become more important." },
  { words: ["wage", "earnings", "payroll"], topic: "Wage growth", area: "Income", direction: "opportunity" as const, magnitude: "medium" as const, signal: "Wage data may create income opportunities", relevance: "A player may have more leverage to negotiate or seek a new role." },
  { words: ["federal funds", "interest rate", "mortgage"], topic: "Interest rates", area: "Borrowing", direction: "opportunity" as const, magnitude: "medium" as const, signal: "Interest-rate conditions changed", relevance: "Loan and savings decisions may become more consequential." },
  { words: ["consumer price index", "cpi", "inflation", "major economic indicators"], topic: "Inflation pressure", area: "Everyday budget", direction: "increase" as const, magnitude: "medium" as const, signal: "Inflation is increasing pressure on everyday costs", relevance: "Rising prices can make rent, food, transportation, and savings goals harder to manage." },
];

async function fetchWithTimeout(input: string, init: RequestInit = {}, label: string, timeoutMs = XTRACT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[xtract] fetch started", label, input);
    }
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function evidenceFor(document: RawDocument, words: string[]) {
  const sentence = document.content.split(/(?<=[.!?])\s+/).find((part) => words.some((word) => part.toLowerCase().includes(word)));
  return (sentence ?? document.content).slice(0, 330).trim();
}

export function extractDeterministically(document: RawDocument): NewsSignal | null {
  const haystack = `${document.headline} ${document.content}`.toLowerCase();
  const match = terms.find((term) => term.words.some((word) => haystack.includes(word)));
  if (!match) return null;
  return {
    id: `signal-${document.id}`, headline: document.headline, sourceName: document.sourceName, sourceUrl: document.sourceUrl,
    publishedAt: document.publishedAt, topic: match.topic, signal: match.signal, affectedArea: match.area,
    direction: match.direction, magnitude: match.magnitude, evidence: evidenceFor(document, match.words),
    sourceSection: "Source excerpt", explanation: `Xtract matched a public-source reference to ${match.area.toLowerCase()} and classified the likely household impact.`,
    gameRelevance: match.relevance, sourceKind: document.sourceKind,
  };
}

function parseAiResponse(raw: string, document: RawDocument): NewsSignal | null {
  try {
    const value = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as Partial<NewsSignal>;
    if (!value.topic || !value.signal || !value.affectedArea || !value.evidence || !value.direction || !value.magnitude) return null;
    if (!["increase", "decrease", "risk", "opportunity", "neutral"].includes(value.direction) || !["low", "medium", "high"].includes(value.magnitude)) return null;
    return { ...value, id: `signal-${document.id}`, headline: document.headline, sourceName: document.sourceName, sourceUrl: document.sourceUrl, publishedAt: document.publishedAt, sourceSection: value.sourceSection ?? "Source excerpt", explanation: value.explanation ?? "Financially meaningful signal extracted from the source.", gameRelevance: value.gameRelevance ?? "May affect a young adult's budget.", sourceKind: document.sourceKind } as NewsSignal;
  } catch {
    return null;
  }
}

async function extractWithNvidia(document: RawDocument): Promise<NewsSignal | null> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") console.log("[xtract] NVIDIA_API_KEY missing; skipping AI path");
    return null;
  }

  const prompt = `Extract one financially meaningful signal for a US adult age 22-30. Ignore irrelevant content. Return ONLY valid JSON with topic, signal, affectedArea, direction (increase|decrease|risk|opportunity|neutral), magnitude (low|medium|high), evidence (exact short source excerpt), sourceSection, explanation, gameRelevance. Evidence must come only from the document.\nHEADLINE: ${document.headline}\nCONTENT: ${document.content}`;

  try {
    if (process.env.NODE_ENV !== "production") console.log("[xtract] AI extractor started", document.id, "NVIDIA/Nemotron");
    const response = await fetchWithTimeout("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.NVIDIA_MODEL ?? "nvidia/llama-3.1-nemotron-70b-instruct", temperature: 0.1, messages: [{ role: "user", content: prompt }] }),
    }, "NVIDIA/Nemotron", XTRACT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`NVIDIA API returned ${response.status}`);
    const body = await response.json() as { choices?: { message?: { content?: string } }[] };
    const rawContent = body.choices?.[0]?.message?.content ?? "";
    const signal = parseAiResponse(rawContent, document);
    if (process.env.NODE_ENV !== "production") {
      console.log("[xtract] AI extractor result", signal ? "signal parsed" : "invalid AI JSON");
    }
    return signal;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[xtract] AI extractor failed", error instanceof Error ? error.message : error);
    }
    throw error;
  }
}

export async function xtractDocument(document: RawDocument): Promise<XtractResponse> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[xtract] started", document.id, document.headline, document.sourceKind);
  }

  let fallbackReason = "NVIDIA_API_KEY is not configured, so Xtract used its local deterministic extractor.";
  if (process.env.NVIDIA_API_KEY) {
    try {
      const aiSignal = await extractWithNvidia(document);
      if (aiSignal) {
        const scenario = generateScenario(aiSignal);
        if (process.env.NODE_ENV !== "production") console.log("[xtract] AI branch succeeded", aiSignal.affectedArea, scenario.id);
        return { signal: aiSignal, scenario, mode: "ai" };
      }
      fallbackReason = "The NVIDIA response did not contain a valid signal, so Xtract used its local deterministic extractor.";
    } catch (error) {
      fallbackReason = `NVIDIA extraction failed (${error instanceof Error ? error.message : "unknown error"}), so Xtract used its local deterministic extractor.`;
      if (process.env.NODE_ENV !== "production") console.warn("[xtract] fallback to deterministic extractor", fallbackReason);
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.log("[xtract] deterministic extractor selected (no NVIDIA key)" );
  }

  const signal = extractDeterministically(document);
  if (signal) {
    const scenario = generateScenario(signal);
    if (process.env.NODE_ENV !== "production") console.log("[xtract] deterministic extractor used", signal.affectedArea, scenario.id);
    return { signal, scenario, mode: "deterministic-fallback", fallbackReason };
  }

  if (process.env.NODE_ENV !== "production") console.warn("[xtract] no valid signal found on document", document.id);
  return { signal: null, scenario: null, mode: "deterministic-fallback", fallbackReason, error: "No financially meaningful signal was detected in this document. Try a cached CPI, food, housing, insurance, or interest-rate demo source." };
}
