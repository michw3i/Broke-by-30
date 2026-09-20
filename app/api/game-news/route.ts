import { NextRequest, NextResponse } from "next/server";
import { xtractDocument } from "@/lib/xtract/extract";
import type { GameCard } from "@/types/game";
import type {
  GeneratedLifeEvent,
  RawDocument,
  XtractResponse,
} from "@/types/xtract";

type SourceCategory =
  | "jobs"
  | "inflation"
  | "rates"
  | "credit"
  | "energy"
  | "housing"
  | "income"
  | "spending";

type RawArticle = {
  sourceName: string;
  title: string;
  description: string;
  url: string;
  publishedAt?: string;
  categoryHint: SourceCategory;
};

type ApiGameOption = GameCard["options"][number] & {
  income?: number;
  expense?: number;
  invest?: number;
};

type ApiGameSource = NonNullable<GameCard["source"]> & {
  topic?: string;
  signal?: string;
  affectedArea?: string;
  direction?: string;
  magnitude?: string;
  explanation?: string;
  gameRelevance?: string;
  publishedAt?: string;
  scenarioId?: string;
};

type ApiGameCard = Omit<GameCard, "options" | "source"> & {
  options: ApiGameOption[];
  source?: ApiGameSource;
};

/*
 * Trusted first-party public feeds only.
 *
 * These feed URLs are published by the agencies themselves:
 * BLS, Federal Reserve, EIA, Census, and BEA.
 */
const FEEDS: Array<{
  sourceName: string;
  url: string;
  categoryHint: SourceCategory;
}> = [
  {
    sourceName: "U.S. Bureau of Labor Statistics",
    url: "https://www.bls.gov/feed/cpi.rss",
    categoryHint: "inflation",
  },
  {
    sourceName: "U.S. Bureau of Labor Statistics",
    url: "https://www.bls.gov/feed/empsit.rss",
    categoryHint: "jobs",
  },
  {
    sourceName: "U.S. Bureau of Labor Statistics",
    url: "https://www.bls.gov/feed/jolts.rss",
    categoryHint: "jobs",
  },

  {
    sourceName: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_monetary.xml",
    categoryHint: "rates",
  },
  {
    sourceName: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/g19.xml",
    categoryHint: "credit",
  },
  {
    sourceName: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/h15.xml",
    categoryHint: "rates",
  },

  {
    sourceName: "U.S. Energy Information Administration",
    url: "https://www.eia.gov/petroleum/gasdiesel/includes/gas_diesel_rss.xml",
    categoryHint: "energy",
  },
  {
    sourceName: "U.S. Energy Information Administration",
    url: "https://www.eia.gov/rss/todayinenergy.xml",
    categoryHint: "energy",
  },

  {
    sourceName: "U.S. Census Bureau",
    url: "https://www.census.gov/economic-indicators/indicator.xml",
    categoryHint: "housing",
  },

  {
    sourceName: "U.S. Bureau of Economic Analysis",
    url: "https://apps.bea.gov/rss/rss.xml",
    categoryHint: "income",
  },
];

const CATEGORY_ROTATION: SourceCategory[] = [
  "energy",
  "housing",
  "rates",
  "income",
  "jobs",
  "inflation",
  "credit",
  "spending",
];

const FINANCE_KEYWORDS = [
  "job",
  "employment",
  "unemployment",
  "payroll",
  "hiring",
  "layoff",
  "labor",
  "wage",
  "earnings",

  "consumer price",
  "inflation",
  "price",
  "food",
  "grocery",
  "shelter",
  "rent",

  "interest rate",
  "federal funds",
  "monetary policy",
  "consumer credit",
  "credit",
  "loan",
  "mortgage",
  "debt",

  "gasoline",
  "diesel",
  "fuel",
  "electricity",
  "natural gas",
  "energy",
  "utility",

  "housing",
  "home sales",
  "new home",
  "new residential",
  "construction",
  "building permits",

  "retail",
  "consumer spending",
  "personal income",
  "personal consumption",
  "outlays",
  "saving",
];

/*
 * Quality gate for live articles.
 *
 * We want actual economic signals, not agency housekeeping such as:
 * "Upcoming changes to the G.19 release" or methodology notices.
 *
 * We also filter very niche statistical satellite-account releases that
 * are real government data but do not translate cleanly into a personal
 * finance decision for this game.
 */
const LOW_VALUE_ARTICLE_PHRASES = [
  "upcoming changes to",
  "changes to the release",
  "changes to this release",
  "release schedule",
  "schedule of releases",
  "methodology",
  "methodological",
  "technical notice",
  "technical update",
  "data users",
  "will no longer be reported",
  "will no longer report",
  "discontinued",
  "discontinuation",
  "correction notice",
  "correction to",
  "correction of",
  "corrected observation",
  "data correction",
  "series correction",
  "revised observation",
  "observation was corrected",
  "observation has been corrected",
  "errata",
  "benchmark revision",
  "annual revision",
  "historical revision",
  "revisions to the estimates",
  "satellite account",
  "arts and cultural production",
  "travel and tourism satellite",
  "outdoor recreation satellite",
  "marine economy satellite",
  "digital economy satellite",
  "commercial paper funding facility",
  "cpff",
  "change in reporting",
  "changes in reporting",
  "reporting change",
];

const CONCRETE_SIGNAL_PHRASES = [
  "increased",
  "increase",
  "decreased",
  "decrease",
  "rose",
  "rising",
  "fell",
  "declined",
  "dropped",
  "grew",
  "growth",
  "little changed",
  "changed little",
  "unchanged",
  "held steady",
  "remained steady",
  "percent",
  "million",
  "billion",
  "thousand",
  "job openings",
  "hires",
  "payroll",
  "unemployment",
  "consumer price index",
  "personal income",
  "consumer spending",
  "personal consumption",
  "consumer credit",
  "federal funds rate",
  "interest rate",
  "mortgage",
  "gasoline",
  "diesel",
  "electricity",
  "new home sales",
  "housing starts",
  "building permits",
  "retail sales",
];

/*
 * Some official feed entries use short generic titles such as
 * "New Home Sales". These are still useful if their description contains
 * real data, so the quality check considers title + description together.
 */
const DIRECTLY_USEFUL_RELEASE_PHRASES = [
  "consumer price index",
  "employment situation",
  "job openings and labor turnover",
  "personal income and outlays",
  "consumer credit",
  "new home sales",
  "new residential construction",
  "retail sales",
  "gasoline and diesel",
  "fomc statement",
  "federal reserve issues fomc statement",
];

/*
 * Avoid presenting stale historical feed items as if they were current
 * news. If an item has no parseable date, keep it rather than guessing.
 */
const MAX_ARTICLE_AGE_DAYS = 365;

/*
 * Demo-safe fallbacks.
 *
 * These are clearly marked as cached-demo, and each still points to a
 * real official public source. They only appear when live feeds/Xtract
 * cannot produce a usable event.
 */
const FALLBACK_EVENTS: ApiGameCard[] = [
  {
    kind: "news",
    title: "YOUR COMMUTE BUDGET NEEDS A RESET",
    body:
      "EIA publishes recurring retail gasoline and diesel price updates. In this simulated scenario, transportation costs force you to rethink your commute.",
    options: [
      {
        label: "Carpool twice a week",
        cash: 0,
        net: 45,
        debt: 0,
        expense: -45,
        note: "A little inconvenience lowers your monthly transportation bill.",
      },
      {
        label: "Keep driving normally",
        cash: 0,
        net: -55,
        debt: 0,
        expense: 55,
        note: "Convenience wins, but fuel takes more of your budget.",
      },
      {
        label: "Try public transit",
        cash: -90,
        net: 70,
        debt: 0,
        expense: -70,
        note: "A pass costs money up front but lowers recurring commute costs.",
      },
    ],
    source: {
      sourceName: "U.S. Energy Information Administration",
      headline: "Gasoline and Diesel Fuel Update",
      evidence:
        "EIA publishes recurring retail gasoline and on-highway diesel fuel price updates.",
      url: "https://www.eia.gov/petroleum/gasdiesel/",
      sourceKind: "cached-demo",
      extractionMode: "deterministic-fallback",
      fallbackReason:
        "Live public feeds or Xtract were unavailable, so the game used a cached official-source demo event.",
    },
  },
  {
    kind: "news",
    title: "YOU ARE RECHECKING YOUR NEXT LEASE",
    body:
      "The Census Bureau publishes timely economic indicators covering housing and construction. In this simulated scenario, your lease is up soon.",
    options: [
      {
        label: "Renew for stability",
        cash: 0,
        net: -40,
        debt: 0,
        expense: 40,
        note: "You avoid moving costs but accept a slightly higher monthly bill.",
      },
      {
        label: "Get a roommate",
        cash: 0,
        net: 260,
        debt: 0,
        expense: -260,
        note: "Less privacy, much more breathing room.",
      },
      {
        label: "Move farther out",
        cash: -900,
        net: 120,
        debt: 0,
        expense: -120,
        note: "Moving hurts once, then cheaper housing helps each month.",
      },
    ],
    source: {
      sourceName: "U.S. Census Bureau",
      headline: "Economic Indicators",
      evidence:
        "The Census Bureau publishes timely economic indicators covering housing, construction, retail trade, and other parts of the economy.",
      url: "https://www.census.gov/economic-indicators/",
      sourceKind: "cached-demo",
      extractionMode: "deterministic-fallback",
      fallbackReason:
        "Live public feeds or Xtract were unavailable, so the game used a cached official-source demo event.",
    },
  },
  {
    kind: "news",
    title: "YOUR DEBT PLAN NEEDS A SECOND LOOK",
    body:
      "The Federal Reserve publishes recurring consumer-credit data. In this simulated scenario, you look at your own revolving balance.",
    options: [
      {
        label: "Pay down the card",
        cash: -500,
        net: 0,
        debt: -500,
        note: "Less cash today, less debt hanging over you.",
      },
      {
        label: "Keep extra cash",
        cash: 0,
        net: 0,
        debt: 0,
        note: "You preserve your emergency cushion but the balance stays.",
      },
      {
        label: "Split the difference",
        cash: -250,
        net: 0,
        debt: -250,
        note: "You reduce the balance without draining your cash.",
      },
    ],
    source: {
      sourceName: "Federal Reserve",
      headline: "Consumer Credit (G.19)",
      evidence:
        "The Federal Reserve publishes recurring statistics on consumer credit.",
      url: "https://www.federalreserve.gov/releases/g19/current/",
      sourceKind: "cached-demo",
      extractionMode: "deterministic-fallback",
      fallbackReason:
        "Live public feeds or Xtract were unavailable, so the game used a cached official-source demo event.",
    },
  },
  {
    kind: "news",
    title: "YOUR SAVINGS RATE GETS A REALITY CHECK",
    body:
      "BEA publishes personal income, spending, and saving data. In this simulated scenario, you decide what to do with your own monthly margin.",
    options: [
      {
        label: "Automate savings",
        cash: 150,
        net: 0,
        debt: 0,
        note: "You make saving part of the plan instead of whatever is left over.",
      },
      {
        label: "Pay down debt",
        cash: -300,
        net: 0,
        debt: -300,
        note: "You prioritize the balance that is costing you money.",
      },
      {
        label: "Keep your routine",
        cash: 0,
        net: 0,
        debt: 0,
        note: "Nothing changes this month.",
      },
    ],
    source: {
      sourceName: "U.S. Bureau of Economic Analysis",
      headline: "Personal Income and Outlays",
      evidence:
        "BEA publishes recurring data on personal income, consumer spending, and saving.",
      url: "https://www.bea.gov/data/income-saving/personal-income",
      sourceKind: "cached-demo",
      extractionMode: "deterministic-fallback",
      fallbackReason:
        "Live public feeds or Xtract were unavailable, so the game used a cached official-source demo event.",
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

    const relevantArticles = articles
      .filter(isFinanciallyRelevant)
      .filter((article) => !excludedUrls.has(article.url));

    const candidates = relevantArticles
      .filter(isGoodEconomicArticle)
      .sort(
        (a, b) =>
          articleQualityScore(b) -
          articleQualityScore(a)
      );

    const rejectedCount =
      relevantArticles.length -
      candidates.length;

    if (rejectedCount > 0) {
      console.log(
        `[game-news] skipped ${rejectedCount} low-value, administrative, niche, or stale article(s)`
      );
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        event: chooseFallback(excludedUrls),
        mode: "deterministic-fallback",
      });
    }

    /*
     * The caller requests multiple news events one after another.
     * Rotate the preferred category using the number of already-seen
     * source URLs so a run is less likely to become jobs/jobs/jobs/CPI.
     */
    const orderedCandidates = orderByCategoryRotation(
      /*
       * Keep a little randomness among equally useful stories, while
       * preserving the quality score as the main priority.
       */
      lightlyShuffleSameQuality(candidates),
      excludedUrls.size
    );

    /*
     * Usually the first article succeeds because xtractDocument itself
     * has a deterministic fallback. The second attempt only matters when
     * the article is not financially meaningful at all.
     */
    const maxAttempts = Math.min(2, orderedCandidates.length);

    for (let index = 0; index < maxAttempts; index += 1) {
      const article = orderedCandidates[index];

      console.log(
        "[game-news] LIVE ARTICLE:",
        article.sourceName,
        "|",
        article.categoryHint,
        "|",
        article.title
      );

      console.log(
        "[game-news] sending article through REAL Xtract pipeline"
      );

      const result = await xtractDocument(
        articleToRawDocument(article)
      );

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

      /*
       * IMPORTANT:
       * Do not rebuild a second scenario here.
       *
       * xtractDocument already called your teammate's
       * lib/xtract/scenarios.ts and returned result.scenario.
       * Using it here means teammate scenario edits automatically
       * flow into the actual game.
       */
      if (!result.signal || !result.scenario) {
        console.warn(
          "[game-news] article produced no usable Xtract scenario; trying another source"
        );
        continue;
      }

      const event = scenarioToGameCard(
        result.scenario,
        result,
        article
      );

      console.log(
        "[game-news] EVENT READY:",
        event.title,
        "| source:",
        article.sourceName,
        "| scenario:",
        result.scenario.id
      );

      return NextResponse.json({
        event,
        mode: result.mode,
        signal: result.signal,
        scenario: result.scenario,
      });
    }

    console.warn(
      "[game-news] no live article produced a usable scenario; using cached demo fallback"
    );

    return NextResponse.json({
      event: chooseFallback(excludedUrls),
      mode: "deterministic-fallback",
    });
  } catch (error) {
    console.error(
      "[game-news] diversified Xtract pipeline failed:",
      error
    );

    return NextResponse.json({
      event: chooseFallback(excludedUrls),
      mode: "deterministic-fallback",
    });
  }
}

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
    .slice(0, 90);

  return `news-${normalized || Date.now()}`;
}

function scenarioToGameCard(
  scenario: GeneratedLifeEvent,
  result: XtractResponse,
  article: RawArticle
): ApiGameCard {
  return {
    id: scenario.id,
    kind: "news",
    title: scenario.title,
    body: scenario.description,

    options: scenario.choices.map(
      (choice): ApiGameOption => {
        const effects =
          choice.financialEffects ?? {};

        const income =
          Number(effects.monthlyIncome ?? 0);

        const expense =
          Number(effects.monthlyExpenses ?? 0);

        const cash =
          Number(effects.savings ?? 0);

        const debt =
          Number(effects.debt ?? 0);

        /*
         * Keep the old `net` field for compatibility with the current UI,
         * while also sending explicit income/expense fields so the updated
         * adapter can apply the effect to the correct stat.
         */
        const net =
          income - expense;

        return {
          label: choice.text,
          cash,
          net,
          debt,
          income,
          expense,
          note:
            choice.consequenceText,
        };
      }
    ),

    source: {
      sourceName:
        scenario.sourceAttribution.sourceName ||
        article.sourceName,

      headline:
        scenario.sourceAttribution.headline ||
        article.title,

      evidence:
        scenario.sourceAttribution.evidence,

      url:
        scenario.sourceAttribution.sourceUrl ||
        article.url,

      signalId:
        result.signal?.id,

      sourceKind:
        result.signal?.sourceKind ??
        "live",

      extractionMode:
        result.mode,

      fallbackReason:
        result.fallbackReason,

      topic:
        result.signal?.topic,

      signal:
        result.signal?.signal,

      affectedArea:
        result.signal?.affectedArea,

      direction:
        result.signal?.direction,

      magnitude:
        result.signal?.magnitude,

      explanation:
        result.signal?.explanation,

      gameRelevance:
        result.signal?.gameRelevance,

      publishedAt:
        result.signal?.publishedAt,

      scenarioId:
        scenario.id,
    },
  };
}

async function fetchArticles():
  Promise<RawArticle[]> {
  const results =
    await Promise.allSettled(
      FEEDS.map(async (feed) => {
        const controller =
          new AbortController();

        const timer =
          setTimeout(
            () => controller.abort(),
            5000
          );

        try {
          const response =
            await fetch(feed.url, {
              cache: "no-store",
              signal:
                controller.signal,
              headers: {
                "User-Agent":
                  "BrokeBy30-SteelHacks/1.0",

                Accept:
                  "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
              },
            });

          if (!response.ok) {
            throw new Error(
              `${feed.sourceName} returned ${response.status}`
            );
          }

          const xml =
            await response.text();

          return parseFeed(
            xml,
            feed.sourceName,
            feed.categoryHint
          );
        } finally {
          clearTimeout(timer);
        }
      })
    );

  const articles: RawArticle[] = [];

  for (const result of results) {
    if (
      result.status === "fulfilled"
    ) {
      articles.push(
        ...result.value
      );
    } else {
      console.warn(
        "[game-news] one official public feed failed:",
        result.reason
      );
    }
  }

  if (articles.length === 0) {
    throw new Error(
      "All official public feeds failed"
    );
  }

  return dedupeArticles(articles);
}

function parseFeed(
  xml: string,
  sourceName: string,
  categoryHint: SourceCategory
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
          cleanText(
            readTag(
              block,
              "title"
            ) ?? ""
          );

        const description =
          cleanText(
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
              readTag(
                block,
                "content:encoded"
              ) ??
              ""
          );

        const link =
          cleanText(
            readAtomLink(block) ??
              readTag(
                block,
                "link"
              ) ??
              readTag(
                block,
                "guid"
              ) ??
              ""
          );

        const publishedAt =
          cleanText(
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
              readTag(
                block,
                "date"
              ) ??
              ""
          ) || undefined;

        if (
          !title ||
          !link ||
          !/^https?:\/\//i.test(
            link
          )
        ) {
          return null;
        }

        return {
          sourceName,
          title,
          description,
          url: link,
          publishedAt,
          categoryHint:
            refineCategoryHint(
              categoryHint,
              `${title} ${description}`
            ),
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

function refineCategoryHint(
  original: SourceCategory,
  value: string
): SourceCategory {
  const text =
    value.toLowerCase();

  if (
    includesAny(text, [
      "retail sales",
      "consumer spending",
      "personal consumption",
      "outlays",
    ])
  ) {
    return "spending";
  }

  if (
    includesAny(text, [
      "personal income",
      "disposable income",
      "saving",
      "earnings",
      "wages",
    ])
  ) {
    return "income";
  }

  if (
    includesAny(text, [
      "new home",
      "new residential",
      "housing",
      "construction",
      "building permits",
      "home sales",
    ])
  ) {
    return "housing";
  }

  if (
    includesAny(text, [
      "consumer credit",
      "revolving credit",
    ])
  ) {
    return "credit";
  }

  if (
    includesAny(text, [
      "gasoline",
      "diesel",
      "fuel",
      "electricity",
      "natural gas",
      "energy",
    ])
  ) {
    return "energy";
  }

  return original;
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

function isGoodEconomicArticle(
  article: RawArticle
): boolean {
  const text =
    `${article.title} ${article.description}`.toLowerCase();

  /*
   * Reject agency housekeeping and very niche statistical products.
   * They can be real official pages while still being bad inputs for
   * a life-simulation scenario.
   */
  if (
    LOW_VALUE_ARTICLE_PHRASES.some(
      (phrase) =>
        text.includes(phrase)
    )
  ) {
    console.log(
      "[game-news] quality filter rejected:",
      article.sourceName,
      "|",
      article.title
    );

    return false;
  }

  if (isTooOld(article)) {
    console.log(
      "[game-news] stale article rejected:",
      article.sourceName,
      "|",
      article.title,
      "|",
      article.publishedAt
    );

    return false;
  }

  const directlyUseful =
    DIRECTLY_USEFUL_RELEASE_PHRASES.some(
      (phrase) =>
        text.includes(phrase)
    );

  /*
   * A number is a useful clue that the item actually reports economic
   * data rather than merely describing a publication or dataset.
   */
  const hasNumber =
    /\b\d+(?:\.\d+)?\b/.test(text);

  const hasConcreteSignal =
    CONCRETE_SIGNAL_PHRASES.some(
      (phrase) =>
        text.includes(phrase)
    );

  if (
    !directlyUseful &&
    !hasNumber &&
    !hasConcreteSignal
  ) {
    console.log(
      "[game-news] weak-signal article rejected:",
      article.sourceName,
      "|",
      article.title
    );

    return false;
  }

  return true;
}

function isTooOld(
  article: RawArticle
): boolean {
  if (!article.publishedAt) {
    return false;
  }

  const timestamp =
    Date.parse(article.publishedAt);

  if (Number.isNaN(timestamp)) {
    return false;
  }

  const ageMs =
    Date.now() - timestamp;

  if (ageMs < 0) {
    return false;
  }

  const ageDays =
    ageMs /
    (1000 * 60 * 60 * 24);

  return (
    ageDays >
    MAX_ARTICLE_AGE_DAYS
  );
}

function articleQualityScore(
  article: RawArticle
): number {
  const text =
    `${article.title} ${article.description}`.toLowerCase();

  let score = 0;

  /*
   * Real movement / stability wording is the strongest signal that the
   * story can support a grounded game consequence.
   */
  for (
    const phrase of
    CONCRETE_SIGNAL_PHRASES
  ) {
    if (text.includes(phrase)) {
      score += 2;
    }
  }

  if (
    DIRECTLY_USEFUL_RELEASE_PHRASES.some(
      (phrase) =>
        text.includes(phrase)
    )
  ) {
    score += 5;
  }

  if (
    /\b\d+(?:\.\d+)?\s*%/.test(text)
  ) {
    score += 4;
  } else if (
    /\b\d+(?:\.\d+)?\b/.test(text)
  ) {
    score += 2;
  }

  /*
   * Prefer stories that naturally map to a person's monthly finances.
   */
  if (
    includesAny(text, [
      "rent",
      "shelter",
      "gasoline",
      "grocery",
      "food at home",
      "consumer credit",
      "credit card",
      "interest rate",
      "mortgage",
      "job openings",
      "payroll",
      "unemployment",
      "wage",
      "earnings",
      "personal income",
      "consumer spending",
      "new home sales",
      "retail sales",
    ])
  ) {
    score += 4;
  }

  /*
   * Fresh items get priority, but we still allow older releases within
   * the safe window when a feed does not contain many entries.
   */
  if (article.publishedAt) {
    const timestamp =
      Date.parse(
        article.publishedAt
      );

    if (!Number.isNaN(timestamp)) {
      const ageDays =
        Math.max(
          0,
          (Date.now() - timestamp) /
            (1000 * 60 * 60 * 24)
        );

      if (ageDays <= 45) {
        score += 5;
      } else if (ageDays <= 120) {
        score += 3;
      } else if (ageDays <= 365) {
        score += 1;
      }
    }
  }

  return score;
}

function lightlyShuffleSameQuality(
  candidates: RawArticle[]
): RawArticle[] {
  /*
   * Candidates arrive sorted highest-quality first.
   * Add a tiny random tie-breaker without letting weak articles jump
   * ahead of clearly better ones.
   */
  return candidates
    .map((article) => ({
      article,
      score:
        articleQualityScore(
          article
        ),
      jitter:
        Math.random() * 0.25,
    }))
    .sort(
      (a, b) =>
        b.score +
        b.jitter -
        (a.score +
          a.jitter)
    )
    .map(
      (entry) =>
        entry.article
    );
}

function orderByCategoryRotation(
  candidates: RawArticle[],
  usedCount: number
): RawArticle[] {
  const start =
    usedCount %
    CATEGORY_ROTATION.length;

  const categories = [
    ...CATEGORY_ROTATION.slice(
      start
    ),
    ...CATEGORY_ROTATION.slice(
      0,
      start
    ),
  ];

  const ordered: RawArticle[] = [];

  for (const category of categories) {
    ordered.push(
      ...candidates.filter(
        (article) =>
          article.categoryHint ===
          category
      )
    );
  }

  for (const article of candidates) {
    if (!ordered.includes(article)) {
      ordered.push(article);
    }
  }

  return ordered;
}

function chooseFallback(
  excludedUrls: Set<string>
): ApiGameCard {
  const unused =
    FALLBACK_EVENTS.filter(
      (event) =>
        !event.source?.url ||
        !excludedUrls.has(
          event.source.url
        )
    );

  return pick(
    unused.length > 0
      ? unused
      : FALLBACK_EVENTS
  );
}

function readTag(
  block: string,
  tag: string
): string | null {
  const escapedTag =
    tag.replace(":", "\\:");

  const regex =
    new RegExp(
      `<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`,
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
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function includesAny(
  text: string,
  words: string[]
): boolean {
  return words.some(
    (word) =>
      text.includes(word)
  );
}

function pick<T>(
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
    let i = copy.length - 1;
    i > 0;
    i -= 1
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1)
      );

    [copy[i], copy[j]] = [
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
