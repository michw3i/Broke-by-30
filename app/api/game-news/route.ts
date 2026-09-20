import { NextRequest, NextResponse } from "next/server";
import { xtractDocument } from "@/lib/xtract/extract";
import type { GameCard } from "@/types/game";
import type {
  NewsSignal,
  RawDocument,
  XtractResponse,
} from "@/types/xtract";

type RawArticle = {
  sourceName: string;
  title: string;
  description: string;
  url: string;
  publishedAt?: string;
};

type ScenarioCategory =
  | "jobs"
  | "housing"
  | "inflation"
  | "wages"
  | "rates"
  | "general";

type ScenarioDirection =
  | "up"
  | "down"
  | "stable";

type ScenarioTemplate = {
  title: string;
  body: string;
  options: GameCard["options"];
};

/*
 * Public sources.
 *
 * We first fetch real public information, then hand the selected
 * document to the actual Xtract pipeline in lib/xtract/extract.ts.
 */
const FEEDS = [
  {
    sourceName: "U.S. Bureau of Labor Statistics",
    url: "https://www.bls.gov/feed/cpi.rss",
  },
  {
    sourceName: "U.S. Bureau of Labor Statistics",
    url: "https://www.bls.gov/feed/empsit.rss",
  },
  {
    sourceName: "U.S. Bureau of Labor Statistics",
    url: "https://www.bls.gov/feed/jolts.rss",
  },
  {
    sourceName: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
  },
];

const FINANCE_KEYWORDS = [
  "consumer price",
  "inflation",
  "price",
  "shelter",
  "rent",
  "housing",
  "employment",
  "unemployment",
  "job",
  "job opening",
  "layoff",
  "labor",
  "hiring",
  "wage",
  "earnings",
  "salary",
  "interest rate",
  "federal funds",
  "monetary policy",
  "credit",
  "loan",
  "mortgage",
  "consumer",
  "spending",
  "insurance",
  "food",
  "grocery",
];

/*
 * These exist only so the hackathon demo still works if:
 * - Wi-Fi fails
 * - government feeds fail
 * - NVIDIA fails
 * - the API key runs out
 *
 * They are explicitly marked as cached/local.
 */
const FALLBACK_EVENTS: GameCard[] = [
  {
    kind: "news",
    title: "YOUR RENT RENEWAL JUST GOT MORE EXPENSIVE",
    body:
      "Public inflation data tracks pressure on shelter costs. Your landlord sends a renewal notice raising your rent by $150 per month.",
    options: [
      {
        label: "Sign the renewal",
        cash: 0,
        net: -150,
        debt: 0,
        note: "You keep the apartment, but your monthly budget gets tighter.",
      },
      {
        label: "Try to negotiate",
        cash: 0,
        net: -75,
        debt: 0,
        note: "Your landlord agrees to a smaller increase.",
      },
      {
        label: "Move somewhere cheaper",
        cash: -900,
        net: 50,
        debt: 0,
        note: "Moving hurts now, but cheaper rent helps later.",
      },
    ],
    source: {
      sourceName: "U.S. Bureau of Labor Statistics",
      headline: "Consumer Price Index",
      evidence:
        "The Consumer Price Index tracks changes in prices paid by consumers, including shelter.",
      url: "https://www.bls.gov/cpi/",
      sourceKind: "cached",
      extractionMode: "local",
    },
  },

  {
    kind: "news",
    title: "THE JOB MARKET IS HOLDING STEADY",
    body:
      "Public labor data shows job openings and hiring can change from month to month. You are deciding whether now is the right time to leave your current job.",
    options: [
      {
        label: "Stay at your current job",
        cash: 0,
        net: 0,
        debt: 0,
        note: "You choose stability while you watch the market.",
      },
      {
        label: "Start applying anyway",
        cash: -75,
        net: 125,
        debt: 0,
        note: "The search takes effort, but you eventually find a modest raise.",
      },
      {
        label: "Invest in a certification",
        cash: -600,
        net: 100,
        debt: 0,
        note: "You improve your skills while waiting for better opportunities.",
      },
    ],
    source: {
      sourceName: "U.S. Bureau of Labor Statistics",
      headline: "Job Openings and Labor Turnover Survey",
      evidence:
        "JOLTS measures job openings, hires, and separations across the U.S. labor market.",
      url: "https://www.bls.gov/jlt/",
      sourceKind: "cached",
      extractionMode: "local",
    },
  },

  {
    kind: "news",
    title: "BORROWING CONDITIONS ARE CHANGING",
    body:
      "Federal Reserve policy affects borrowing conditions. You were planning to finance a used car this month.",
    options: [
      {
        label: "Finance the car",
        cash: -1500,
        net: -260,
        debt: 10500,
        note: "You get the car, but take on a monthly payment.",
      },
      {
        label: "Save a bigger down payment",
        cash: -2500,
        net: -160,
        debt: 7000,
        note: "More money up front means less debt later.",
      },
      {
        label: "Keep your current car",
        cash: -400,
        net: 0,
        debt: 0,
        note: "A repair buys you more time without another loan.",
      },
    ],
    source: {
      sourceName: "Federal Reserve",
      headline: "Monetary Policy",
      evidence:
        "Federal Reserve monetary policy influences broader borrowing conditions and interest rates.",
      url: "https://www.federalreserve.gov/monetarypolicy.htm",
      sourceKind: "cached",
      extractionMode: "local",
    },
  },

  {
    kind: "news",
    title: "YOUR PAY REVIEW IS COMING UP",
    body:
      "Public earnings data tracks changes in worker pay. Your annual performance review is next week.",
    options: [
      {
        label: "Ask for a raise",
        cash: 0,
        net: 200,
        debt: 0,
        note: "You negotiate and improve your monthly income.",
      },
      {
        label: "Apply elsewhere",
        cash: -75,
        net: 275,
        debt: 0,
        note: "Another employer offers you more money.",
      },
      {
        label: "Stay quiet",
        cash: 0,
        net: 0,
        debt: 0,
        note: "Your pay stays the same.",
      },
    ],
    source: {
      sourceName: "U.S. Bureau of Labor Statistics",
      headline: "Real Earnings",
      evidence:
        "BLS publishes earnings data showing how worker pay changes over time.",
      url: "https://www.bls.gov/news.release/realer.htm",
      sourceKind: "cached",
      extractionMode: "local",
    },
  },
];

export async function GET(request: NextRequest) {
  const excludedUrls = new Set(
    request.nextUrl.searchParams
      .getAll("exclude")
      .map((url) => decodeURIComponent(url))
  );

  try {
    const articles = await fetchArticles();

    const candidates = shuffle(
      articles
        .filter(isFinanciallyRelevant)
        .filter((article) => !excludedUrls.has(article.url))
    );

    /*
     * Try a few different live articles.
     *
     * If Nemotron says one is not financially meaningful,
     * try another instead of immediately dropping to a canned event.
     */
    const maxAttempts = Math.min(4, candidates.length);

    for (let index = 0; index < maxAttempts; index += 1) {
      const article = candidates[index];

      console.log(
        "[game-news] LIVE ARTICLE:",
        article.title
      );

      console.log(
        "[game-news] sending article through REAL Xtract pipeline"
      );

      const document = articleToRawDocument(article);

      const result = await xtractDocument(document);

      console.log(
        "[game-news] XTRACT mode:",
        result.mode
      );

      if (result.fallbackReason) {
        console.log(
          "[game-news] XTRACT fallback reason:",
          result.fallbackReason
        );
      }

      if (!result.signal) {
        console.warn(
          "[game-news] article produced no usable Xtract signal, trying another article"
        );

        continue;
      }

      const event = signalToGameEvent(
        result.signal,
        article,
        result
      );

      console.log(
        "[game-news] EVENT READY:",
        event.title
      );

      console.log(
        "[game-news] extraction displayed as:",
        result.mode === "ai"
          ? "AI EXTRACTION"
          : "LOCAL FALLBACK"
      );

      return NextResponse.json({
        event,
        mode: result.mode,
        signal: result.signal,
      });
    }

    console.warn(
      "[game-news] no live article produced a usable signal; using cached public fallback"
    );

    return NextResponse.json({
      event: chooseFallback(excludedUrls),
      mode: "cached-fallback",
    });
  } catch (error) {
    console.error(
      "[game-news] live Xtract pipeline failed:",
      error
    );

    return NextResponse.json({
      event: chooseFallback(excludedUrls),
      mode: "cached-fallback",
    });
  }
}

/*
 * THIS IS THE KEY CONNECTION.
 *
 * Public article
 *      ↓
 * RawDocument
 *      ↓
 * xtractDocument()
 *      ↓
 * Nemotron or deterministic fallback
 */
function articleToRawDocument(
  article: RawArticle
): RawDocument {
  return {
    id: makeDocumentId(article),

    headline: article.title,

    sourceName: article.sourceName,

    sourceUrl: article.url,

    publishedAt:
      article.publishedAt ??
      new Date().toISOString(),

    content:
      article.description.trim().length > 0
        ? article.description
        : article.title,

    sourceKind: "live",
  };
}

function makeDocumentId(
  article: RawArticle
): string {
  const normalized = article.url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `news-${normalized || Date.now()}`;
}

/*
 * Xtract has already decided:
 * - topic
 * - financial area
 * - direction
 * - magnitude
 * - evidence
 *
 * This function ONLY translates that signal into
 * the game's existing event format.
 */
function signalToGameEvent(
  signal: NewsSignal,
  article: RawArticle,
  result: XtractResponse
): GameCard {
  const category =
    categorizeSignal(signal);

  const direction =
    getScenarioDirection(
      signal,
      category
    );

  const scenario =
    buildScenario(
      category,
      direction,
      signal
    );

  return {
    kind: "news",

    title: scenario.title,

    body: scenario.body,

    options: scenario.options,

    source: {
      sourceName:
        signal.sourceName ||
        article.sourceName,

      headline:
        signal.headline ||
        article.title,

      /*
       * This is the evidence Xtract/Nemotron extracted.
       * Your extract.ts validates AI evidence against the
       * actual source before returning it.
       */
      evidence:
        signal.evidence,

      url:
        signal.sourceUrl ||
        article.url,

      sourceKind: "live",

      extractionMode:
        result.mode === "ai"
          ? "ai"
          : "local",
    },
  };
}

function categorizeSignal(
  signal: NewsSignal
): ScenarioCategory {
  const text = [
    signal.topic,
    signal.signal,
    signal.affectedArea,
    signal.explanation,
    signal.gameRelevance,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  /*
   * More specific categories first.
   */
  if (
    includesAny(text, [
      "rent",
      "shelter",
      "housing",
      "apartment",
    ])
  ) {
    return "housing";
  }

  if (
    includesAny(text, [
      "job",
      "employment",
      "unemployment",
      "layoff",
      "labor",
      "hiring",
    ])
  ) {
    return "jobs";
  }

  if (
    includesAny(text, [
      "wage",
      "earnings",
      "salary",
      "income",
      "pay ",
      "pay growth",
    ])
  ) {
    return "wages";
  }

  if (
    includesAny(text, [
      "interest rate",
      "mortgage",
      "loan",
      "credit",
      "borrowing",
      "federal funds",
    ])
  ) {
    return "rates";
  }

  if (
    includesAny(text, [
      "inflation",
      "consumer price",
      "grocery",
      "food price",
      "everyday budget",
      "consumer prices",
      "cost of living",
    ])
  ) {
    return "inflation";
  }

  return "general";
}

function getScenarioDirection(
  signal: NewsSignal,
  category: ScenarioCategory
): ScenarioDirection {
  /*
   * Nemotron's explicit answer gets priority.
   */
  if (
    signal.direction === "increase"
  ) {
    return "up";
  }

  if (
    signal.direction === "decrease"
  ) {
    return "down";
  }

  if (
    signal.direction === "neutral"
  ) {
    return "stable";
  }

  /*
   * "risk" means worsening conditions for things such
   * as employment.
   */
  if (
    signal.direction === "risk"
  ) {
    return "down";
  }

  /*
   * "opportunity" usually means improving conditions,
   * except rates can be ambiguous.
   */
  if (
    signal.direction === "opportunity" &&
    category !== "rates"
  ) {
    return "up";
  }

  /*
   * For ambiguous fallback signals, inspect the actual
   * evidence instead of inventing a trend.
   */
  const evidence = [
    signal.signal,
    signal.evidence,
    signal.explanation,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    includesAny(evidence, [
      "unchanged",
      "little changed",
      "held steady",
      "remained steady",
      "stable",
    ])
  ) {
    return "stable";
  }

  if (
    includesAny(evidence, [
      "fell",
      "declined",
      "decreased",
      "lower",
      "dropped",
      "slowed",
      "cut",
      "easing",
    ])
  ) {
    return "down";
  }

  if (
    includesAny(evidence, [
      "rose",
      "increased",
      "higher",
      "grew",
      "rising",
      "climbed",
    ])
  ) {
    return "up";
  }

  return "stable";
}

function buildScenario(
  category: ScenarioCategory,
  direction: ScenarioDirection,
  signal: NewsSignal
): ScenarioTemplate {
  if (category === "jobs") {
    if (direction === "down") {
      return {
        title: "YOUR JOB MARKET JUST GOT TOUGHER",

        body:
          "The latest labor signal points to weaker employment conditions. You are still employed, but finding another job could become harder.",

        options: [
          {
            label: "Start job hunting now",
            cash: -75,
            net: 150,
            debt: 0,
            note: "You begin searching before competition gets worse.",
          },
          {
            label: "Build an emergency fund",
            cash: -600,
            net: 0,
            debt: 0,
            note: "You create a cushion in case your income becomes less secure.",
          },
          {
            label: "Stay put",
            cash: 0,
            net: 0,
            debt: 0,
            note: "You keep working and avoid making a rushed decision.",
          },
        ],
      };
    }

    if (direction === "up") {
      return {
        title: "THE JOB MARKET IS OPENING UP",

        body:
          "The latest labor signal points to stronger opportunities. You have been thinking about whether now is the right time to make a career move.",

        options: [
          {
            label: "Apply for better jobs",
            cash: -75,
            net: 250,
            debt: 0,
            note: "You take advantage of the market and land a better-paying role.",
          },
          {
            label: "Ask your boss for a raise",
            cash: 0,
            net: 175,
            debt: 0,
            note: "Your employer pays more to keep you.",
          },
          {
            label: "Stay comfortable",
            cash: 0,
            net: 0,
            debt: 0,
            note: "You keep your current job.",
          },
        ],
      };
    }

    return {
      title: "THE JOB MARKET IS HOLDING STEADY",

      body:
        "The latest labor signal shows limited movement in hiring conditions. You are thinking about changing jobs, but the data does not give you a clear reason to rush.",

      options: [
        {
          label: "Stay at your current job",
          cash: 0,
          net: 0,
          debt: 0,
          note: "You choose stability while conditions stay about the same.",
        },
        {
          label: "Apply selectively",
          cash: -75,
          net: 125,
          debt: 0,
          note: "You test the market and eventually find a modest raise.",
        },
        {
          label: "Build your skills",
          cash: -600,
          net: 100,
          debt: 0,
          note: "You invest in yourself while waiting for stronger opportunities.",
        },
      ],
    };
  }

  if (category === "housing") {
    if (direction === "down") {
      return {
        title: "RENTERS ARE GETTING SOME RELIEF",

        body:
          "Xtract detected easing housing-cost pressure. Your lease is nearly up, giving you more room to shop around or negotiate.",

        options: [
          {
            label: "Negotiate your renewal",
            cash: 0,
            net: 75,
            debt: 0,
            note: "Your landlord agrees to better terms.",
          },
          {
            label: "Find a cheaper apartment",
            cash: -700,
            net: 150,
            debt: 0,
            note: "Moving hurts now, but your monthly rent drops.",
          },
          {
            label: "Stay without negotiating",
            cash: 0,
            net: 0,
            debt: 0,
            note: "You keep your current place and payment.",
          },
        ],
      };
    }

    if (direction === "stable") {
      return {
        title: "RENT PRESSURE IS HOLDING STEADY",

        body:
          "Xtract found that housing conditions are changing little. Your lease renewal arrives, and you have to decide whether stability is worth staying put.",

        options: [
          {
            label: "Renew the lease",
            cash: 0,
            net: 0,
            debt: 0,
            note: "Your housing costs remain about the same.",
          },
          {
            label: "Try to negotiate",
            cash: 0,
            net: 50,
            debt: 0,
            note: "You manage to lower your monthly cost slightly.",
          },
          {
            label: "Move cheaper",
            cash: -800,
            net: 100,
            debt: 0,
            note: "Moving costs hurt now, but you save each month.",
          },
        ],
      };
    }

    return {
      title: "YOUR RENT RENEWAL JUST GOT MORE EXPENSIVE",

      body:
        "Xtract detected upward pressure on housing costs. Your landlord sends a renewal notice raising your rent by $150 per month.",

      options: [
        {
          label: "Sign the renewal",
          cash: 0,
          net: -150,
          debt: 0,
          note: "You stay, but your monthly budget gets tighter.",
        },
        {
          label: "Negotiate",
          cash: 0,
          net: -75,
          debt: 0,
          note: "Your landlord agrees to a smaller increase.",
        },
        {
          label: "Move somewhere cheaper",
          cash: -900,
          net: 50,
          debt: 0,
          note: "Moving costs hurt now, but your monthly expenses improve.",
        },
      ],
    };
  }

  if (category === "wages") {
    if (direction === "down") {
      return {
        title: "PAY GROWTH IS LOSING MOMENTUM",

        body:
          "Xtract detected weaker wage conditions. Your annual performance review is coming up, but workers may have less negotiating leverage.",

        options: [
          {
            label: "Still ask for a raise",
            cash: 0,
            net: 100,
            debt: 0,
            note: "You negotiate carefully and get a modest increase.",
          },
          {
            label: "Apply elsewhere",
            cash: -75,
            net: 175,
            debt: 0,
            note: "Another employer offers you better pay.",
          },
          {
            label: "Wait",
            cash: 0,
            net: 0,
            debt: 0,
            note: "Your paycheck stays the same.",
          },
        ],
      };
    }

    if (direction === "up") {
      return {
        title: "WORKERS HAVE MORE PAY LEVERAGE",

        body:
          "Xtract detected stronger wage conditions. Your annual review is next week, giving you a reason to negotiate.",

        options: [
          {
            label: "Ask for a raise",
            cash: 0,
            net: 225,
            debt: 0,
            note: "You negotiate and improve your monthly income.",
          },
          {
            label: "Apply elsewhere",
            cash: -75,
            net: 300,
            debt: 0,
            note: "A competitor offers you more money.",
          },
          {
            label: "Stay quiet",
            cash: 0,
            net: 0,
            debt: 0,
            note: "Your pay stays the same.",
          },
        ],
      };
    }

    return {
      title: "PAY CONDITIONS ARE HOLDING STEADY",

      body:
        "Xtract detected little change in wage conditions. Your annual review is coming up, but the market is not giving you much extra leverage.",

      options: [
        {
          label: "Ask for a small raise",
          cash: 0,
          net: 100,
          debt: 0,
          note: "You negotiate a modest increase.",
        },
        {
          label: "Apply elsewhere",
          cash: -75,
          net: 150,
          debt: 0,
          note: "You find another company willing to pay more.",
        },
        {
          label: "Stay quiet",
          cash: 0,
          net: 0,
          debt: 0,
          note: "Nothing changes.",
        },
      ],
    };
  }

  if (category === "rates") {
    if (direction === "down") {
      return {
        title: "BORROWING JUST GOT A LITTLE CHEAPER",

        body:
          "Xtract detected easing borrowing conditions. The used car you have been considering now comes with a more manageable payment.",

        options: [
          {
            label: "Finance the car",
            cash: -1500,
            net: -220,
            debt: 10000,
            note: "You take advantage of the improved borrowing environment.",
          },
          {
            label: "Save a bigger down payment",
            cash: -2500,
            net: -140,
            debt: 6500,
            note: "You reduce how much money you need to borrow.",
          },
          {
            label: "Keep your current car",
            cash: -400,
            net: 0,
            debt: 0,
            note: "You avoid new debt entirely.",
          },
        ],
      };
    }

    if (direction === "up") {
      return {
        title: "BORROWING JUST GOT MORE EXPENSIVE",

        body:
          "Xtract detected tighter borrowing conditions. The car you planned to finance now comes with a noticeably more expensive payment.",

        options: [
          {
            label: "Finance it anyway",
            cash: -1500,
            net: -310,
            debt: 12000,
            note: "You get the car, but the monthly payment follows you.",
          },
          {
            label: "Put more money down",
            cash: -3000,
            net: -180,
            debt: 7000,
            note: "More cash now lowers the amount you borrow.",
          },
          {
            label: "Keep your current car",
            cash: -450,
            net: 0,
            debt: 0,
            note: "A repair keeps you out of new debt.",
          },
        ],
      };
    }

    return {
      title: "BORROWING COSTS ARE HOLDING STEADY",

      body:
        "Xtract found little change in borrowing conditions. You are still deciding whether financing a used car fits your budget.",

      options: [
        {
          label: "Finance it",
          cash: -1500,
          net: -260,
          debt: 10500,
          note: "You take on a predictable monthly payment.",
        },
        {
          label: "Save more first",
          cash: -2000,
          net: -150,
          debt: 7000,
          note: "You lower the amount you need to borrow.",
        },
        {
          label: "Wait",
          cash: -350,
          net: 0,
          debt: 0,
          note: "You repair your current car and delay the loan.",
        },
      ],
    };
  }

  if (category === "inflation") {
    if (direction === "down") {
      return {
        title: "PRICE PRESSURE IS EASING",

        body:
          "Xtract detected cooling price pressure. Your everyday expenses are becoming a little easier to manage.",

        options: [
          {
            label: "Save the difference",
            cash: 0,
            net: 75,
            debt: 0,
            note: "You turn lower expenses into more monthly savings.",
          },
          {
            label: "Pay down debt",
            cash: -300,
            net: 50,
            debt: -300,
            note: "You use the breathing room to reduce debt.",
          },
          {
            label: "Spend the extra room",
            cash: 150,
            net: 0,
            debt: 0,
            note: "You enjoy some of the extra flexibility.",
          },
        ],
      };
    }

    if (direction === "stable") {
      return {
        title: "EVERYDAY PRICES ARE HOLDING STEADY",

        body:
          "Xtract detected little change in price pressure. Your monthly budget is becoming more predictable.",

        options: [
          {
            label: "Keep your current budget",
            cash: 0,
            net: 0,
            debt: 0,
            note: "You stay consistent.",
          },
          {
            label: "Increase savings",
            cash: -300,
            net: 25,
            debt: 0,
            note: "You use the stability to strengthen your emergency fund.",
          },
          {
            label: "Pay down debt",
            cash: -350,
            net: 35,
            debt: -350,
            note: "You reduce your balance while conditions are calm.",
          },
        ],
      };
    }

    return {
      title: "EVERYDAY COSTS KEEP CREEPING HIGHER",

      body:
        "Xtract detected upward price pressure. Your food and household spending is now about $90 higher each month.",

      options: [
        {
          label: "Keep your routine",
          cash: 0,
          net: -90,
          debt: 0,
          note: "Your monthly breathing room gets smaller.",
        },
        {
          label: "Cut eating out",
          cash: 0,
          net: -25,
          debt: 0,
          note: "You offset most of the higher costs.",
        },
        {
          label: "Make a stricter budget",
          cash: -100,
          net: 40,
          debt: 0,
          note: "Some effort now improves your monthly cash flow.",
        },
      ],
    };
  }

  /*
   * Generic event for a real signal that does not fit one of
   * the major categories above.
   */
  return {
    title: "THE ECONOMY JUST CHANGED YOUR FINANCIAL OUTLOOK",

    body:
      `${signal.signal}. You decide whether this is enough of a warning to adjust your finances.`,

    options: [
      {
        label: "Increase savings",
        cash: -300,
        net: 25,
        debt: 0,
        note: "You build a slightly stronger financial cushion.",
      },
      {
        label: "Keep your current plan",
        cash: 0,
        net: 0,
        debt: 0,
        note: "You wait for a clearer signal before changing anything.",
      },
      {
        label: "Pay down debt",
        cash: -250,
        net: 25,
        debt: -250,
        note: "You reduce your balance while keeping most of your cash.",
      },
    ],
  };
}

async function fetchArticles(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const controller =
        new AbortController();

      const timeout =
        setTimeout(() => {
          controller.abort();
        }, 4500);

      try {
        const response =
          await fetch(
            feed.url,
            {
              cache: "no-store",

              signal:
                controller.signal,

              headers: {
                "User-Agent":
                  "BrokeBy30-SteelHacks/1.0",

                Accept:
                  "application/rss+xml, application/xml, text/xml, */*",
              },
            }
          );

        if (!response.ok) {
          throw new Error(
            `${feed.sourceName} returned ${response.status}`
          );
        }

        const xml =
          await response.text();

        return parseFeed(
          xml,
          feed.sourceName
        );
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  const articles: RawArticle[] = [];

  for (const result of results) {
    if (
      result.status ===
      "fulfilled"
    ) {
      articles.push(
        ...result.value
      );
    } else {
      console.warn(
        "[game-news] one public feed failed:",
        result.reason
      );
    }
  }

  if (articles.length === 0) {
    throw new Error(
      "All public news feeds failed"
    );
  }

  return dedupeArticles(articles);
}

function parseFeed(
  xml: string,
  sourceName: string
): RawArticle[] {
  const blocks =
    xml.match(
      /<item\b[\s\S]*?<\/item>/gi
    ) ??
    xml.match(
      /<entry\b[\s\S]*?<\/entry>/gi
    ) ??
    [];

  return blocks
    .map(
      (
        block
      ): RawArticle | null => {
        const title =
          readTag(
            block,
            "title"
          )?.trim() ?? "";

        const description =
          readTag(
            block,
            "description"
          ) ??
          readTag(
            block,
            "summary"
          ) ??
          readTag(
            block,
            "content"
          ) ??
          "";

        const link =
          readTag(
            block,
            "link"
          ) ??
          readAtomLink(block) ??
          "";

        const publishedAt =
          readTag(
            block,
            "pubDate"
          ) ??
          readTag(
            block,
            "published"
          ) ??
          readTag(
            block,
            "updated"
          ) ??
          undefined;

        if (
          !title ||
          !link
        ) {
          return null;
        }

        return {
          sourceName,

          title:
            cleanText(title),

          description:
            cleanText(
              description
            ),

          url:
            cleanText(link),

          publishedAt:
            publishedAt
              ? cleanText(
                  publishedAt
                )
              : undefined,
        };
      }
    )
    .filter(
      (
        article
      ): article is RawArticle =>
        article !== null
    );
}

function isFinanciallyRelevant(
  article: RawArticle
): boolean {
  const text =
    `${article.title} ${article.description}`.toLowerCase();

  return FINANCE_KEYWORDS.some(
    (keyword) =>
      text.includes(keyword)
  );
}

function chooseFallback(
  excludedUrls: Set<string>
): GameCard {
  const unused =
    FALLBACK_EVENTS.filter(
      (event) =>
        !event.source?.url ||
        !excludedUrls.has(
          event.source.url
        )
    );

  if (unused.length > 0) {
    return randomItem(unused);
  }

  return randomItem(
    FALLBACK_EVENTS
  );
}

function readTag(
  block: string,
  tag: string
): string | null {
  const regex =
    new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    );

  return (
    block.match(regex)?.[1] ??
    null
  );
}

function readAtomLink(
  block: string
): string | null {
  return (
    block.match(
      /<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i
    )?.[1] ?? null
  );
}

function cleanText(
  value: string
): string {
  return decodeEntities(
    value
      .replace(
        /<!\[CDATA\[([\s\S]*?)\]\]>/g,
        "$1"
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
  );
}

function decodeEntities(
  value: string
): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(
      /&quot;/g,
      '"'
    )
    .replace(
      /&#39;/g,
      "'"
    )
    .replace(
      /&apos;/g,
      "'"
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function includesAny(
  text: string,
  words: string[]
): boolean {
  return words.some((word) =>
    text.includes(word)
  );
}

function randomItem<T>(
  items: T[]
): T {
  return items[
    Math.floor(
      Math.random() *
        items.length
    )
  ];
}

function shuffle<T>(
  items: T[]
): T[] {
  const copy = [...items];

  for (
    let i =
      copy.length - 1;
    i > 0;
    i -= 1
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1)
      );

    [
      copy[i],
      copy[j],
    ] = [
      copy[j],
      copy[i],
    ];
  }

  return copy;
}

function dedupeArticles(
  articles: RawArticle[]
): RawArticle[] {
  const seen =
    new Set<string>();

  return articles.filter(
    (article) => {
      if (
        seen.has(article.url)
      ) {
        return false;
      }

      seen.add(article.url);

      return true;
    }
  );
}