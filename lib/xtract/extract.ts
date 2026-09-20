import type {
  NewsSignal,
  RawDocument,
  XtractResponse,
} from "@/types/xtract";

import { generateScenario } from "./scenarios";

/*
 * One real Nemotron attempt.
 *
 * The game fetches news in the background, so one 12-second window is
 * more useful than killing a request at 7 seconds and starting over.
 */
const XTRACT_TIMEOUT_MS = 12000;

const NVIDIA_ENDPOINT =
  "https://integrate.api.nvidia.com/v1/chat/completions";

const DEFAULT_NVIDIA_MODEL =
  "nvidia/nemotron-3.5-lightning-30b-a3b";

type Rule = {
  words: string[];
  topic: string;
  area:
    | "Auto insurance"
    | "Transportation"
    | "Utilities"
    | "Housing"
    | "Groceries"
    | "Borrowing"
    | "Debt"
    | "Employment"
    | "Income"
    | "Spending"
    | "Everyday budget";
  defaultDirection:
    | "increase"
    | "decrease"
    | "risk"
    | "opportunity"
    | "neutral";
  relevance: string;
};

const RULES: Rule[] = [
  {
    words: [
      "gasoline",
      "diesel",
      "fuel price",
      "motor fuel",
      "pump price",
    ],
    topic: "Transportation fuel costs",
    area: "Transportation",
    defaultDirection: "neutral",
    relevance:
      "Fuel-price changes can directly affect commuting and travel costs.",
  },

  {
    words: [
      "electricity",
      "utility",
      "natural gas",
      "heating oil",
      "propane",
      "household energy",
    ],
    topic: "Household energy costs",
    area: "Utilities",
    defaultDirection: "neutral",
    relevance:
      "Energy-price changes can affect a renter or homeowner's monthly utility bill.",
  },

  {
    words: [
      "consumer credit",
      "revolving credit",
      "credit card",
      "consumer debt",
    ],
    topic: "Consumer credit",
    area: "Debt",
    defaultDirection: "neutral",
    relevance:
      "Consumer-credit conditions can affect how a young adult manages balances and borrowing.",
  },

  {
    words: [
      "federal funds",
      "interest rate",
      "selected interest rates",
      "mortgage rate",
      "treasury yield",
      "monetary policy",
      "borrowing cost",
    ],
    topic: "Interest rates",
    area: "Borrowing",
    defaultDirection: "neutral",
    relevance:
      "Interest-rate changes can affect auto loans, mortgages, refinancing, and savings decisions.",
  },

  {
    words: [
      "new home",
      "new residential",
      "housing starts",
      "building permits",
      "home sales",
      "housing",
      "shelter",
      "rent",
      "apartment",
    ],
    topic: "Housing conditions",
    area: "Housing",
    defaultDirection: "neutral",
    relevance:
      "Housing conditions can affect rent decisions, moving costs, and the affordability of buying a home.",
  },

  {
    words: [
      "job opening",
      "employment",
      "unemployment",
      "payroll",
      "hiring",
      "hire",
      "layoff",
      "separation",
      "labor market",
    ],
    topic: "Labor market conditions",
    area: "Employment",
    defaultDirection: "neutral",
    relevance:
      "Labor-market conditions can affect job security, negotiating power, and the decision to change jobs.",
  },

  {
    words: [
      "personal income",
      "disposable income",
      "earnings",
      "wage",
      "salary",
      "saving rate",
      "personal saving",
    ],
    topic: "Household income",
    area: "Income",
    defaultDirection: "neutral",
    relevance:
      "Income trends can affect saving, debt repayment, and the amount of room in a monthly budget.",
  },

  {
    words: [
      "retail sales",
      "consumer spending",
      "personal consumption",
      "outlays",
      "retail trade",
    ],
    topic: "Consumer spending",
    area: "Spending",
    defaultDirection: "neutral",
    relevance:
      "Consumer-spending changes can affect household budgets and work hours in consumer-facing jobs.",
  },

  {
    words: [
      "food at home",
      "grocery",
      "groceries",
      "food price",
    ],
    topic: "Food prices",
    area: "Groceries",
    defaultDirection: "neutral",
    relevance:
      "Food-price changes can quickly show up in a young adult's weekly budget.",
  },

  {
    words: [
      "consumer price index",
      "cpi",
      "inflation",
      "consumer prices",
      "cost of living",
    ],
    topic: "Inflation",
    area: "Everyday budget",
    defaultDirection: "neutral",
    relevance:
      "Inflation changes what rent, food, transportation, and other everyday purchases cost.",
  },

  {
    words: [
      "insurance",
      "auto insurance",
      "vehicle insurance",
    ],
    topic: "Insurance costs",
    area: "Auto insurance",
    defaultDirection: "neutral",
    relevance:
      "Insurance renewals can change a young adult's monthly budget.",
  },
];

const STABLE_PHRASES = [
  "change little",
  "changed little",
  "little changed",
  "unchanged",
  "held steady",
  "holding steady",
  "remained steady",
  "roughly unchanged",
  "approximately unchanged",
  "essentially unchanged",
  "stable",
  "flat",
];

const UP_PHRASES = [
  "increased",
  "increase",
  "rose",
  "rising",
  "higher",
  "grew",
  "growth",
  "climbed",
  "gained",
  "accelerated",
  "up from",
];

const DOWN_PHRASES = [
  "decreased",
  "decrease",
  "declined",
  "decline",
  "fell",
  "falling",
  "lower",
  "dropped",
  "drop",
  "eased",
  "slowed",
  "slowing",
  "weakened",
  "down from",
];

const EMPLOYMENT_RISK_PHRASES = [
  "layoff",
  "layoffs",
  "job cuts",
  "lost jobs",
  "payroll employment decreased",
  "employment decreased",
  "unemployment increased",
  "unemployment rose",
];

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  label: string,
  timeoutMs = XTRACT_TIMEOUT_MS
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs
    );

  try {
    console.log(
      `[xtract] ${label} request started`
    );

    return await fetch(
      input,
      {
        ...init,
        signal:
          controller.signal,
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        `${label} timed out after ${timeoutMs}ms`
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function evidenceFor(
  document: RawDocument,
  words: string[]
) {
  const sentences =
    document.content.split(
      /(?<=[.!?])\s+/
    );

  const matched =
    sentences.find(
      (sentence) =>
        words.some(
          (word) =>
            sentence
              .toLowerCase()
              .includes(
                word.toLowerCase()
              )
        )
    );

  return (
    matched ??
    sentences[0] ??
    document.content
  )
    .slice(0, 330)
    .trim();
}

function inferRuleDirection(
  haystack: string,
  rule: Rule
): NewsSignal["direction"] {
  /*
   * Stability has highest priority.
   *
   * Example:
   * "job openings and unemployment changed little"
   * must not become a layoff-risk scenario.
   */
  if (
    STABLE_PHRASES.some(
      (phrase) =>
        haystack.includes(
          phrase
        )
    )
  ) {
    return "neutral";
  }

  if (
    rule.area === "Employment" &&
    EMPLOYMENT_RISK_PHRASES.some(
      (phrase) =>
        haystack.includes(
          phrase
        )
    )
  ) {
    return "risk";
  }

  const hasUp =
    UP_PHRASES.some(
      (phrase) =>
        haystack.includes(
          phrase
        )
    );

  const hasDown =
    DOWN_PHRASES.some(
      (phrase) =>
        haystack.includes(
          phrase
        )
    );

  if (
    hasUp &&
    !hasDown
  ) {
    if (
      rule.area === "Employment" ||
      rule.area === "Income"
    ) {
      return "opportunity";
    }

    return "increase";
  }

  if (
    hasDown &&
    !hasUp
  ) {
    if (
      rule.area === "Employment"
    ) {
      return "risk";
    }

    return "decrease";
  }

  return rule.defaultDirection;
}

function inferMagnitude(
  haystack: string
): NewsSignal["magnitude"] {
  if (
    includesAny(
      haystack,
      [
        "surged",
        "plunged",
        "sharp increase",
        "sharp decline",
        "substantial",
        "significant increase",
        "significant decrease",
      ]
    )
  ) {
    return "high";
  }

  if (
    STABLE_PHRASES.some(
      (phrase) =>
        haystack.includes(
          phrase
        )
    )
  ) {
    return "low";
  }

  return "medium";
}

function signalText(
  rule: Rule,
  direction:
    NewsSignal["direction"]
) {
  if (
    direction === "neutral"
  ) {
    return `${rule.topic} changed little in the latest public data`;
  }

  if (
    direction === "risk"
  ) {
    return `${rule.topic} points to greater financial or employment risk`;
  }

  if (
    direction ===
    "opportunity"
  ) {
    return `${rule.topic} points to a potential financial opportunity`;
  }

  if (
    direction ===
    "increase"
  ) {
    return `${rule.topic} increased in the latest public data`;
  }

  return `${rule.topic} decreased in the latest public data`;
}

export function extractDeterministically(
  document: RawDocument
): NewsSignal | null {
  const haystack =
    `${document.headline} ${document.content}`.toLowerCase();

  const rule =
    RULES.find(
      (candidate) =>
        candidate.words.some(
          (word) =>
            haystack.includes(
              word
            )
        )
    );

  if (!rule) {
    return null;
  }

  const direction =
    inferRuleDirection(
      haystack,
      rule
    );

  const magnitude =
    inferMagnitude(
      haystack
    );

  return {
    id:
      `signal-${document.id}`,

    headline:
      document.headline,

    sourceName:
      document.sourceName,

    sourceUrl:
      document.sourceUrl,

    publishedAt:
      document.publishedAt,

    topic:
      rule.topic,

    signal:
      signalText(
        rule,
        direction
      ),

    affectedArea:
      rule.area,

    direction,
    magnitude,

    evidence:
      evidenceFor(
        document,
        [
          ...STABLE_PHRASES,
          ...rule.words,
          ...UP_PHRASES,
          ...DOWN_PHRASES,
        ]
      ),

    sourceSection:
      "Source excerpt",

    explanation:
      `Xtract matched the public source to ${rule.area.toLowerCase()} and classified the direction using language found in the source.`,

    gameRelevance:
      rule.relevance,

    sourceKind:
      document.sourceKind,
  };
}

function extractJsonObject(
  raw: string
): string | null {
  const cleaned =
    raw
      .replace(
        /```json/gi,
        ""
      )
      .replace(
        /```/g,
        ""
      )
      .trim();

  const firstBrace =
    cleaned.indexOf("{");

  if (
    firstBrace === -1
  ) {
    return null;
  }

  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (
    let i = firstBrace;
    i < cleaned.length;
    i += 1
  ) {
    const char =
      cleaned[i];

    if (insideString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (
        char === "\\"
      ) {
        escaped = true;
        continue;
      }

      if (
        char === '"'
      ) {
        insideString = false;
      }

      continue;
    }

    if (
      char === '"'
    ) {
      insideString = true;
      continue;
    }

    if (
      char === "{"
    ) {
      depth += 1;
    }

    if (
      char === "}"
    ) {
      depth -= 1;

      if (
        depth === 0
      ) {
        return cleaned.slice(
          firstBrace,
          i + 1
        );
      }
    }
  }

  return null;
}

function normalizeEvidence(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    )
    .replace(
      /[“”"]/g,
      ""
    )
    .trim();
}

function evidenceExistsInDocument(
  evidence: string,
  document: RawDocument
) {
  const evidenceNormalized =
    normalizeEvidence(
      evidence
    );

  const documentNormalized =
    normalizeEvidence(
      `${document.headline} ${document.content}`
    );

  if (
    evidenceNormalized.length <
    8
  ) {
    return false;
  }

  if (
    documentNormalized.includes(
      evidenceNormalized
    )
  ) {
    return true;
  }

  const prefix =
    evidenceNormalized.slice(
      0,
      80
    );

  return (
    prefix.length >= 20 &&
    documentNormalized.includes(
      prefix
    )
  );
}

function parseAiResponse(
  raw: string,
  document: RawDocument
): NewsSignal | null {
  try {
    const json =
      extractJsonObject(
        raw
      );

    if (!json) {
      console.warn(
        "[xtract] Nemotron response did not contain JSON"
      );

      return null;
    }

    const value =
      JSON.parse(
        json
      ) as Partial<NewsSignal>;

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

    const validMagnitudes = [
      "low",
      "medium",
      "high",
    ];

    if (
      !validDirections.includes(
        value.direction
      )
    ) {
      console.warn(
        "[xtract] invalid direction from Nemotron:",
        value.direction
      );

      return null;
    }

    if (
      !validMagnitudes.includes(
        value.magnitude
      )
    ) {
      console.warn(
        "[xtract] invalid magnitude from Nemotron:",
        value.magnitude
      );

      return null;
    }

    if (
      !evidenceExistsInDocument(
        value.evidence,
        document
      )
    ) {
      console.warn(
        "[xtract] Nemotron evidence was not found in source document:",
        value.evidence
      );

      return null;
    }

    return {
      ...value,

      id:
        `signal-${document.id}`,

      headline:
        document.headline,

      sourceName:
        document.sourceName,

      sourceUrl:
        document.sourceUrl,

      publishedAt:
        document.publishedAt,

      sourceSection:
        value.sourceSection ??
        "Source excerpt",

      explanation:
        value.explanation ??
        "Financially meaningful signal extracted from the public source using NVIDIA Nemotron.",

      gameRelevance:
        value.gameRelevance ??
        "This real-world signal may affect a young adult's financial decisions.",

      sourceKind:
        document.sourceKind,
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
  const key =
    process.env
      .NVIDIA_API_KEY
      ?.trim();

  if (!key) {
    console.log(
      "[xtract] NVIDIA_API_KEY missing; skipping Nemotron"
    );

    return null;
  }

  const model =
    process.env
      .NVIDIA_MODEL
      ?.trim() ||
    DEFAULT_NVIDIA_MODEL;

  const systemPrompt = `
You are Xtract, a grounded financial-signal extraction engine for a personal-finance life simulation.

Read ONE trusted public economic source and identify ONE financially meaningful signal that could realistically affect a U.S. adult age 22 to 30.

Stay strictly grounded in the supplied source.
Never invent trends, statistics, causes, facts, or quotations.

If the source says unchanged, little changed, stable, flat, or approximately unchanged, direction MUST be neutral.

When the source contains several indicators moving in different directions, choose the ONE signal with the clearest realistic personal-finance consequence and do not exaggerate it.

For affectedArea, prefer ONE of these exact values when it fits:
Auto insurance
Transportation
Utilities
Housing
Groceries
Borrowing
Debt
Employment
Income
Spending
Everyday budget

The evidence field MUST contain a short VERBATIM excerpt copied directly from the supplied document.

Return ONLY valid JSON.
Do not return Markdown.
Do not write anything outside the JSON.

Use exactly this structure:

{
  "topic": "short specific topic",
  "signal": "one sentence describing exactly what the source supports",
  "affectedArea": "one personal-finance area",
  "direction": "increase | decrease | risk | opportunity | neutral",
  "magnitude": "low | medium | high",
  "evidence": "exact short excerpt copied from source",
  "sourceSection": "Source excerpt",
  "explanation": "brief explanation of why the evidence supports the signal",
  "gameRelevance": "one realistic way this could affect a 22-30 year old"
}
`.trim();

  const userPrompt = `
SOURCE NAME:
${document.sourceName}

HEADLINE:
${document.headline}

PUBLISHED:
${document.publishedAt}

DOCUMENT:
${document.content}
`.trim();

  console.log(
    "[xtract] Nemotron attempt 1/1",
    {
      documentId:
        document.id,

      model,

      thinking:
        false,

      timeoutMs:
        XTRACT_TIMEOUT_MS,
    }
  );

  const response =
    await fetchWithTimeout(
      NVIDIA_ENDPOINT,

      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${key}`,

          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body:
          JSON.stringify({
            model,

            messages: [
              {
                role:
                  "system",

                content:
                  systemPrompt,
              },

              {
                role:
                  "user",

                content:
                  userPrompt,
              },
            ],

            chat_template_kwargs: {
              enable_thinking:
                false,
            },

            temperature:
              0.1,

            max_tokens:
              300,

            stream:
              false,
          }),
      },

      "NVIDIA/Nemotron",

      XTRACT_TIMEOUT_MS
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    console.error(
      "[xtract] NVIDIA API ERROR",
      {
        status:
          response.status,

        body:
          responseText.slice(
            0,
            1000
          ),
      }
    );

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
    body =
      JSON.parse(
        responseText
      );
  } catch {
    throw new Error(
      "NVIDIA returned a non-JSON API response"
    );
  }

  const rawContent =
    body.choices?.[0]
      ?.message
      ?.content ?? "";

  if (!rawContent) {
    throw new Error(
      "NVIDIA returned no message content"
    );
  }

  console.log(
    "[xtract] Nemotron response received"
  );

  const signal =
    parseAiResponse(
      rawContent,
      document
    );

  if (!signal) {
    console.warn(
      "[xtract] Nemotron response could not be validated"
    );

    return null;
  }

  console.log(
    "[xtract] NEMOTRON SUCCESS",
    {
      topic:
        signal.topic,

      affectedArea:
        signal.affectedArea,

      direction:
        signal.direction,

      evidence:
        signal.evidence,
    }
  );

  return signal;
}

export async function xtractDocument(
  document: RawDocument
): Promise<XtractResponse> {
  console.log(
    "[xtract] started",
    {
      id:
        document.id,

      headline:
        document.headline,

      sourceKind:
        document.sourceKind,

      hasNvidiaKey:
        Boolean(
          process.env
            .NVIDIA_API_KEY
        ),
    }
  );

  let fallbackReason =
    "NVIDIA_API_KEY is not configured, so Xtract used its local deterministic extractor.";

  if (
    process.env
      .NVIDIA_API_KEY
  ) {
    try {
      const aiSignal =
        await extractWithNvidia(
          document
        );

      if (aiSignal) {
        const scenario =
          generateScenario(
            aiSignal
          );

        console.log(
          "[xtract] AI BRANCH SUCCEEDED",
          {
            affectedArea:
              aiSignal
                .affectedArea,

            scenarioId:
              scenario.id,
          }
        );

        return {
          signal:
            aiSignal,

          scenario,

          mode:
            "ai",
        };
      }

      fallbackReason =
        "Nemotron responded, but its output could not be validated against the public source, so Xtract used its deterministic fallback.";
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "unknown error";

      fallbackReason =
        `NVIDIA/Nemotron failed (${message}), so Xtract used its deterministic fallback.`;

      console.warn(
        "[xtract] falling back:",
        fallbackReason
      );
    }
  } else {
    console.log(
      "[xtract] deterministic extractor selected because NVIDIA_API_KEY is missing"
    );
  }

  const signal =
    extractDeterministically(
      document
    );

  if (signal) {
    const scenario =
      generateScenario(
        signal
      );

    console.log(
      "[xtract] DETERMINISTIC FALLBACK",
      {
        affectedArea:
          signal
            .affectedArea,

        direction:
          signal.direction,

        scenarioId:
          scenario.id,
      }
    );

    return {
      signal,

      scenario,

      mode:
        "deterministic-fallback",

      fallbackReason,
    };
  }

  console.warn(
    "[xtract] no financially meaningful signal found",
    document.id
  );

  return {
    signal:
      null,

    scenario:
      null,

    mode:
      "deterministic-fallback",

    fallbackReason,

    error:
      "No financially meaningful signal was detected in this document.",
  };
}

function includesAny(
  text: string,
  words: string[]
) {
  return words.some(
    (word) =>
      text.includes(
        word
      )
  );
}
