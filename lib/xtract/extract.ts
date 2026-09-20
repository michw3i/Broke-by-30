import type {
  NewsSignal,
  RawDocument,
  XtractResponse,
} from "@/types/xtract";

import { generateScenario } from "./scenarios";

/*
 * Keep the AI responsive for gameplay.
 * Attempt 1 gets enough time for the normal 3-6 second response.
 * Attempt 2 is a short recovery attempt before the local fallback takes over.
 */
const NVIDIA_FIRST_TIMEOUT_MS = 7000;
const NVIDIA_RETRY_TIMEOUT_MS = 4000;
const NVIDIA_MAX_ATTEMPTS = 2;

const NVIDIA_ENDPOINT =
  "https://integrate.api.nvidia.com/v1/chat/completions";

const DEFAULT_NVIDIA_MODEL =
  "nvidia/nemotron-3.5-lightning-30b-a3b";

const terms = [
  {
    words: ["insurance"],
    topic: "Insurance costs",
    area: "Auto insurance",
    direction: "increase" as const,
    magnitude: "high" as const,
    signal: "Insurance costs are rising",
    relevance:
      "A renewal can squeeze a young driver's monthly budget.",
  },
  {
    words: ["shelter", "rent", "housing"],
    topic: "Housing costs",
    area: "Rent",
    direction: "increase" as const,
    magnitude: "high" as const,
    signal: "Housing costs are putting pressure on renters",
    relevance:
      "Rent is often the largest monthly bill for players in their twenties.",
  },
  {
    words: ["food", "grocery"],
    topic: "Food prices",
    area: "Groceries",
    direction: "increase" as const,
    magnitude: "medium" as const,
    signal: "Food costs are increasing",
    relevance:
      "Routine grocery spending can slowly erode a player's cushion.",
  },
  {
    words: ["layoff", "job cuts", "unemployment"],
    topic: "Job market risk",
    area: "Employment",
    direction: "risk" as const,
    magnitude: "high" as const,
    signal: "Job-market conditions are creating layoff risk",
    relevance:
      "Income stability and job-search decisions become more important.",
  },
  {
    words: ["wage", "earnings", "payroll"],
    topic: "Wage growth",
    area: "Income",
    direction: "opportunity" as const,
    magnitude: "medium" as const,
    signal: "Wage data may create income opportunities",
    relevance:
      "A player may have more leverage to negotiate or seek a new role.",
  },
  {
    words: ["federal funds", "interest rate", "mortgage"],
    topic: "Interest rates",
    area: "Borrowing",
    direction: "opportunity" as const,
    magnitude: "medium" as const,
    signal: "Interest-rate conditions changed",
    relevance:
      "Loan and savings decisions may become more consequential.",
  },
  {
    words: [
      "consumer price index",
      "cpi",
      "inflation",
      "major economic indicators",
    ],
    topic: "Inflation pressure",
    area: "Everyday budget",
    direction: "increase" as const,
    magnitude: "medium" as const,
    signal: "Inflation is increasing pressure on everyday costs",
    relevance:
      "Rising prices can make rent, food, transportation, and savings goals harder to manage.",
  },
];

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  label: string,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[xtract] ${label} request started`);

    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
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
  const sentence = document.content
    .split(/(?<=[.!?])\s+/)
    .find((part) =>
      words.some((word) =>
        part.toLowerCase().includes(word.toLowerCase())
      )
    );

  return (sentence ?? document.content).slice(0, 330).trim();
}

/*
 * Reliable local backup.
 * Stability wording is handled first so an article that says
 * "change little" does not become a fake negative job-market event.
 */
export function extractDeterministically(
  document: RawDocument
): NewsSignal | null {
  const haystack =
    `${document.headline} ${document.content}`.toLowerCase();

  const stablePhrases = [
    "change little",
    "changed little",
    "little changed",
    "unchanged",
    "held steady",
    "holding steady",
    "remained steady",
    "roughly unchanged",
    "approximately unchanged",
    "stable",
  ];

  const isStable = stablePhrases.some((phrase) =>
    haystack.includes(phrase)
  );

  if (isStable) {
    const employmentWords = [
      "job opening",
      "employment",
      "unemployment",
      "payroll",
      "hire",
      "hiring",
      "separation",
      "labor",
    ];

    const employmentRelated = employmentWords.some((word) =>
      haystack.includes(word)
    );

    if (employmentRelated) {
      return {
        id: `signal-${document.id}`,
        headline: document.headline,
        sourceName: document.sourceName,
        sourceUrl: document.sourceUrl,
        publishedAt: document.publishedAt,
        topic: "Labor market conditions",
        signal: "Labor-market conditions changed little.",
        affectedArea: "Employment",
        direction: "neutral",
        magnitude: "low",
        evidence: evidenceFor(document, stablePhrases),
        sourceSection: "Source excerpt",
        explanation:
          "The public source describes the labor-market measures as unchanged or little changed.",
        gameRelevance:
          "The player may want to stay aware of the job market, but the source does not support a major improvement or deterioration in employment conditions.",
        sourceKind: document.sourceKind,
      };
    }

    const housingWords = ["rent", "shelter", "housing"];
    const housingRelated = housingWords.some((word) =>
      haystack.includes(word)
    );

    if (housingRelated) {
      return {
        id: `signal-${document.id}`,
        headline: document.headline,
        sourceName: document.sourceName,
        sourceUrl: document.sourceUrl,
        publishedAt: document.publishedAt,
        topic: "Housing costs",
        signal: "Housing costs changed little.",
        affectedArea: "Rent",
        direction: "neutral",
        magnitude: "low",
        evidence: evidenceFor(document, stablePhrases),
        sourceSection: "Source excerpt",
        explanation:
          "The public source describes housing costs as relatively stable.",
        gameRelevance:
          "Stable housing costs make the player's monthly budget more predictable.",
        sourceKind: document.sourceKind,
      };
    }
  }

  const match = terms.find((term) =>
    term.words.some((word) => haystack.includes(word))
  );

  if (!match) return null;

  return {
    id: `signal-${document.id}`,
    headline: document.headline,
    sourceName: document.sourceName,
    sourceUrl: document.sourceUrl,
    publishedAt: document.publishedAt,
    topic: match.topic,
    signal: match.signal,
    affectedArea: match.area,
    direction: match.direction,
    magnitude: match.magnitude,
    evidence: evidenceFor(document, match.words),
    sourceSection: "Source excerpt",
    explanation:
      `Xtract matched a public-source reference to ${match.area.toLowerCase()} and classified the likely household impact.`,
    gameRelevance: match.relevance,
    sourceKind: document.sourceKind,
  };
}

function extractJsonObject(raw: string): string | null {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  if (firstBrace === -1) return null;

  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (let i = firstBrace; i < cleaned.length; i += 1) {
    const char = cleaned[i];

    if (insideString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') insideString = false;
      continue;
    }

    if (char === '"') {
      insideString = true;
      continue;
    }

    if (char === "{") depth += 1;

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return cleaned.slice(firstBrace, i + 1);
      }
    }
  }

  return null;
}

function normalizeEvidence(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”"]/g, "")
    .trim();
}

function evidenceExistsInDocument(
  evidence: string,
  document: RawDocument
) {
  const evidenceNormalized = normalizeEvidence(evidence);
  const documentNormalized = normalizeEvidence(
    `${document.headline} ${document.content}`
  );

  if (evidenceNormalized.length < 8) return false;

  if (documentNormalized.includes(evidenceNormalized)) {
    return true;
  }

  const prefix = evidenceNormalized.slice(0, 80);

  return (
    prefix.length >= 20 &&
    documentNormalized.includes(prefix)
  );
}

function parseAiResponse(
  raw: string,
  document: RawDocument
): NewsSignal | null {
  try {
    const json = extractJsonObject(raw);

    if (!json) {
      console.warn("[xtract] Nemotron response did not contain JSON");
      return null;
    }

    const value = JSON.parse(json) as Partial<NewsSignal>;

    if (
      !value.topic ||
      !value.signal ||
      !value.affectedArea ||
      !value.evidence ||
      !value.direction ||
      !value.magnitude
    ) {
      console.warn(
        "[xtract] Nemotron JSON missing required fields",
        value
      );
      return null;
    }

    const validDirections = [
      "increase",
      "decrease",
      "risk",
      "opportunity",
      "neutral",
    ];

    const validMagnitudes = ["low", "medium", "high"];

    if (!validDirections.includes(value.direction)) {
      console.warn(
        "[xtract] invalid direction from Nemotron:",
        value.direction
      );
      return null;
    }

    if (!validMagnitudes.includes(value.magnitude)) {
      console.warn(
        "[xtract] invalid magnitude from Nemotron:",
        value.magnitude
      );
      return null;
    }

    if (!evidenceExistsInDocument(value.evidence, document)) {
      console.warn(
        "[xtract] Nemotron evidence was not found in source document:",
        value.evidence
      );
      return null;
    }

    return {
      ...value,
      id: `signal-${document.id}`,
      headline: document.headline,
      sourceName: document.sourceName,
      sourceUrl: document.sourceUrl,
      publishedAt: document.publishedAt,
      sourceSection: value.sourceSection ?? "Source excerpt",
      explanation:
        value.explanation ??
        "Financially meaningful signal extracted from the public source using NVIDIA Nemotron.",
      gameRelevance:
        value.gameRelevance ??
        "This real-world signal may affect a young adult's financial decisions.",
      sourceKind: document.sourceKind,
    } as NewsSignal;
  } catch (error) {
    console.warn(
      "[xtract] failed to parse Nemotron response:",
      error
    );
    return null;
  }
}

async function extractWithNvidia(
  document: RawDocument
): Promise<NewsSignal | null> {
  const key = process.env.NVIDIA_API_KEY?.trim();

  if (!key) {
    console.log(
      "[xtract] NVIDIA_API_KEY missing; skipping Nemotron"
    );
    return null;
  }

  const model =
    process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;

  /*
   * Intentionally short prompt. Less prompt/output work helps latency,
   * while evidence validation below still protects traceability.
   */
  const systemPrompt = `
You are Xtract. Extract ONE personal-finance signal from the supplied public economic source for a U.S. adult age 22-30.

Stay strictly grounded in the source. Never invent facts or quotes.
If the source says unchanged, little changed, stable, or flat, direction MUST be neutral.
Evidence MUST be a short verbatim excerpt from the supplied document.

Return ONLY valid JSON with exactly these fields:
topic, signal, affectedArea, direction, magnitude, evidence, sourceSection, explanation, gameRelevance.

direction must be one of: increase, decrease, risk, opportunity, neutral.
magnitude must be one of: low, medium, high.
`.trim();

  const userPrompt = `
SOURCE: ${document.sourceName}
HEADLINE: ${document.headline}
PUBLISHED: ${document.publishedAt}
CONTENT: ${document.content}
`.trim();

  for (
    let attempt = 1;
    attempt <= NVIDIA_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const timeoutMs =
      attempt === 1
        ? NVIDIA_FIRST_TIMEOUT_MS
        : NVIDIA_RETRY_TIMEOUT_MS;

    try {
      console.log(
        `[xtract] Nemotron attempt ${attempt}/${NVIDIA_MAX_ATTEMPTS}`,
        {
          documentId: document.id,
          model,
          thinking: false,
          timeoutMs,
        }
      );

      const response = await fetchWithTimeout(
        NVIDIA_ENDPOINT,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: userPrompt,
              },
            ],
            chat_template_kwargs: {
              enable_thinking: false,
            },
            temperature: 0.1,
            max_tokens: 280,
            stream: false,
          }),
        },
        `NVIDIA/Nemotron attempt ${attempt}`,
        timeoutMs
      );

      const responseText = await response.text();

      if (!response.ok) {
        console.error("[xtract] NVIDIA API ERROR", {
          attempt,
          status: response.status,
          body: responseText.slice(0, 1000),
        });

        // These are configuration/auth/model errors. Retrying will not help.
        if (
          response.status === 400 ||
          response.status === 401 ||
          response.status === 403 ||
          response.status === 404 ||
          response.status === 410
        ) {
          throw new Error(
            `NVIDIA API returned ${response.status}: ${responseText.slice(
              0,
              300
            )}`
          );
        }

        if (attempt < NVIDIA_MAX_ATTEMPTS) {
          console.warn(
            "[xtract] temporary NVIDIA API error, retrying..."
          );
          continue;
        }

        throw new Error(
          `NVIDIA API returned ${response.status}: ${responseText.slice(
            0,
            300
          )}`
        );
      }

      let body: {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      try {
        body = JSON.parse(responseText);
      } catch {
        if (attempt < NVIDIA_MAX_ATTEMPTS) {
          console.warn(
            "[xtract] NVIDIA API response was invalid JSON, retrying..."
          );
          continue;
        }

        throw new Error(
          "NVIDIA returned a non-JSON API response"
        );
      }

      const rawContent =
        body.choices?.[0]?.message?.content ?? "";

      if (!rawContent) {
        if (attempt < NVIDIA_MAX_ATTEMPTS) {
          console.warn(
            "[xtract] NVIDIA returned no message content, retrying..."
          );
          continue;
        }

        throw new Error("NVIDIA returned no message content");
      }

      console.log(
        `[xtract] Nemotron response received on attempt ${attempt}`
      );

      const signal = parseAiResponse(rawContent, document);

      if (!signal) {
        if (attempt < NVIDIA_MAX_ATTEMPTS) {
          console.warn(
            "[xtract] Nemotron response failed validation, retrying..."
          );
          continue;
        }

        return null;
      }

      console.log("[xtract] NEMOTRON SUCCESS", {
        attempt,
        topic: signal.topic,
        direction: signal.direction,
        evidence: signal.evidence,
      });

      return signal;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      console.warn(
        `[xtract] Nemotron attempt ${attempt} failed:`,
        message
      );

      if (attempt === NVIDIA_MAX_ATTEMPTS) {
        throw error;
      }

      console.log("[xtract] retrying Nemotron...");
    }
  }

  return null;
}

export async function xtractDocument(
  document: RawDocument
): Promise<XtractResponse> {
  console.log("[xtract] started", {
    id: document.id,
    headline: document.headline,
    sourceKind: document.sourceKind,
    hasNvidiaKey: Boolean(process.env.NVIDIA_API_KEY),
  });

  let fallbackReason =
    "NVIDIA_API_KEY is not configured, so Xtract used its local deterministic extractor.";

  if (process.env.NVIDIA_API_KEY) {
    try {
      const aiSignal = await extractWithNvidia(document);

      if (aiSignal) {
        const scenario = generateScenario(aiSignal);

        console.log("[xtract] AI BRANCH SUCCEEDED", {
          affectedArea: aiSignal.affectedArea,
          scenarioId: scenario.id,
        });

        return {
          signal: aiSignal,
          scenario,
          mode: "ai",
        };
      }

      fallbackReason =
        "Nemotron responded, but its output could not be validated against the public source, so Xtract used its deterministic fallback.";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown error";

      fallbackReason =
        `NVIDIA/Nemotron failed (${message}), so Xtract used its deterministic fallback.`;

      console.warn("[xtract] falling back:", fallbackReason);
    }
  } else {
    console.log(
      "[xtract] deterministic extractor selected because NVIDIA_API_KEY is missing"
    );
  }

  const signal = extractDeterministically(document);

  if (signal) {
    const scenario = generateScenario(signal);

    console.log("[xtract] DETERMINISTIC FALLBACK", {
      affectedArea: signal.affectedArea,
      direction: signal.direction,
      scenarioId: scenario.id,
    });

    return {
      signal,
      scenario,
      mode: "deterministic-fallback",
      fallbackReason,
    };
  }

  console.warn(
    "[xtract] no financially meaningful signal found",
    document.id
  );

  return {
    signal: null,
    scenario: null,
    mode: "deterministic-fallback",
    fallbackReason,
    error:
      "No financially meaningful signal was detected in this document.",
  };
}
