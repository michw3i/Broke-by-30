import { NextRequest, NextResponse } from "next/server";
import type { GameCard } from "@/types/game";

type RawArticle = {
  sourceName: string;
  title: string;
  description: string;
  url: string;
  publishedAt?: string;
};

type ScenarioTemplate = {
  title: string;
  body: string;
  options: GameCard["options"];
};

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

/*
 * Words that make an article useful for a personal-finance game.
 */
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
  "layoff",
  "labor",
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
];

/*
 * These are only emergency fallbacks.
 * Each one still points to a real public source.
 */
const FALLBACK_EVENTS: GameCard[] = [
  {
    kind: "news",
    title: "YOUR RENT RENEWAL JUST GOT MORE EXPENSIVE",
    body:
      "Recent inflation data shows continued pressure on housing costs. Your landlord sends a renewal that raises your rent by $150 per month.",
    options: [
      {
        label: "Sign the renewal",
        cash: 0,
        net: -150,
        debt: 0,
        note: "You keep the apartment, but your monthly costs rise.",
      },
      {
        label: "Try to negotiate",
        cash: 0,
        net: -75,
        debt: 0,
        note: "Your landlord agrees to meet you halfway.",
      },
      {
        label: "Move somewhere cheaper",
        cash: -900,
        net: 50,
        debt: 0,
        note: "Moving hurts now, but your monthly budget improves.",
      },
    ],
    source: {
      sourceName: "U.S. Bureau of Labor Statistics",
      headline: "Consumer Price Index",
      evidence:
        "The Consumer Price Index measures changes in prices paid by consumers, including shelter costs.",
      url: "https://www.bls.gov/cpi/",
      sourceKind: "cached",
      extractionMode: "local",
    },
  },

  {
    kind: "news",
    title: "THE JOB MARKET IS COOLING",
    body:
      "Recent labor-market data shows employers are becoming more cautious about hiring. You are not laid off, but you are worried your job may be less secure.",
    options: [
      {
        label: "Start applying elsewhere",
        cash: -50,
        net: 100,
        debt: 0,
        note: "The search costs time, but you land a slightly better-paying role.",
      },
      {
        label: "Build your emergency fund",
        cash: -500,
        net: 0,
        debt: 0,
        note: "You move money aside in case your paycheck disappears.",
      },
      {
        label: "Do nothing",
        cash: 0,
        net: 0,
        debt: 0,
        note: "You keep working and hope things stay stable.",
      },
    ],
    source: {
      sourceName: "U.S. Bureau of Labor Statistics",
      headline: "The Employment Situation",
      evidence:
        "BLS employment releases track payroll employment and the unemployment rate.",
      url: "https://www.bls.gov/news.release/empsit.htm",
      sourceKind: "cached",
      extractionMode: "local",
    },
  },

  {
    kind: "news",
    title: "EMPLOYERS ARE POSTING FEWER OPENINGS",
    body:
      "New job-opening data suggests workers have fewer opportunities to jump between companies. You were thinking about leaving your current job for something better.",
    options: [
      {
        label: "Stay at your current job",
        cash: 0,
        net: 0,
        debt: 0,
        note: "You choose stability while hiring is slower.",
      },
      {
        label: "Apply anyway",
        cash: -100,
        net: 175,
        debt: 0,
        note: "The search takes effort, but you eventually find a better role.",
      },
      {
        label: "Spend $600 on a certification",
        cash: -600,
        net: 125,
        debt: 0,
        note: "New skills make you more competitive.",
      },
    ],
    source: {
      sourceName: "U.S. Bureau of Labor Statistics",
      headline: "Job Openings and Labor Turnover Survey",
      evidence:
        "JOLTS measures job openings, hires, and separations in the U.S. labor market.",
      url: "https://www.bls.gov/jlt/",
      sourceKind: "cached",
      extractionMode: "local",
    },
  },

  {
    kind: "news",
    title: "BORROWING JUST GOT MORE EXPENSIVE",
    body:
      "Interest-rate conditions are making borrowing more expensive. You were planning to finance a used car this month.",
    options: [
      {
        label: "Finance the car anyway",
        cash: -1500,
        net: -310,
        debt: 12000,
        note: "You get the car, but the monthly payment follows you.",
      },
      {
        label: "Save a bigger down payment",
        cash: -2500,
        net: -190,
        debt: 7000,
        note: "More cash now means less debt later.",
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
        "Federal Reserve monetary-policy decisions influence broader borrowing conditions and interest rates.",
      url: "https://www.federalreserve.gov/monetarypolicy.htm",
      sourceKind: "cached",
      extractionMode: "local",
    },
  },

  {
    kind: "news",
    title: "PAY IS RISING ACROSS THE JOB MARKET",
    body:
      "Recent earnings data suggests pay is rising for workers. Your annual performance review is next week.",
    options: [
      {
        label: "Ask for a raise",
        cash: 0,
        net: 225,
        debt: 0,
        note: "You use the labor data as leverage and get a raise.",
      },
      {
        label: "Apply to competitors",
        cash: -75,
        net: 300,
        debt: 0,
        note: "You find a company willing to pay more.",
      },
      {
        label: "Stay quiet",
        cash: 0,
        net: 0,
        debt: 0,
        note: "Nothing changes.",
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
  /*
   * The client sends URLs it has already used.
   * This prevents the game from repeatedly showing the same article.
   */
  const excludedUrls = new Set(
    request.nextUrl.searchParams.getAll("exclude").map(decodeURIComponent)
  );

  try {
    const articles = await fetchArticles();

    const relevantArticles = articles
      .filter((article) => isFinanciallyRelevant(article))
      .filter((article) => !excludedUrls.has(article.url));

    /*
     * Randomize the available articles so different playthroughs
     * do not always start with the exact same feed.
     */
    const shuffled = shuffle(relevantArticles);

    if (shuffled.length > 0) {
      const article = shuffled[0];

      console.log("[game-news] selected live article:", article.title);
      console.log("[game-news] source:", article.sourceName);

      const event = articleToGameEvent(article);

      return NextResponse.json({
        event,
        mode: "live",
      });
    }

    console.warn(
      "[game-news] no unused live article found, using rotating fallback"
    );

    return NextResponse.json({
      event: chooseFallback(excludedUrls),
      mode: "fallback",
    });
  } catch (error) {
    console.error("[game-news] live news pipeline failed:", error);

    return NextResponse.json({
      event: chooseFallback(excludedUrls),
      mode: "fallback",
    });
  }
}

async function fetchArticles(): Promise<RawArticle[]> {
  /*
   * Fetch all feeds in parallel.
   *
   * If one government feed fails, the others can still work.
   */
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 4500);

      try {
        const response = await fetch(feed.url, {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            "User-Agent": "BrokeBy30-SteelHacks/1.0",
            Accept:
              "application/rss+xml, application/xml, text/xml, */*",
          },
        });

        if (!response.ok) {
          throw new Error(`${feed.url} returned ${response.status}`);
        }

        const xml = await response.text();

        return parseFeed(xml, feed.sourceName);
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  const articles: RawArticle[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    } else {
      console.warn("[game-news] one feed failed:", result.reason);
    }
  }

  if (articles.length === 0) {
    throw new Error("All public news feeds failed");
  }

  return dedupeArticles(articles);
}

function parseFeed(xml: string, sourceName: string): RawArticle[] {
  /*
   * BLS uses RSS. The Federal Reserve feed may use RSS/Atom style XML.
   * Support both <item> and <entry>.
   */

  const itemBlocks =
    xml.match(/<item\b[\s\S]*?<\/item>/gi) ??
    xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ??
    [];

  return itemBlocks
    .map((block): RawArticle | null => {
      const title =
        readTag(block, "title")?.trim() ?? "";

      const description =
        readTag(block, "description") ??
        readTag(block, "summary") ??
        readTag(block, "content") ??
        "";

      const link =
        readTag(block, "link") ??
        readAtomLink(block) ??
        "";

      const publishedAt =
        readTag(block, "pubDate") ??
        readTag(block, "published") ??
        readTag(block, "updated") ??
        undefined;

      if (!title || !link) {
        return null;
      }

      return {
        sourceName,
        title: cleanText(title),
        description: cleanText(description),
        url: cleanText(link),
        publishedAt: publishedAt
          ? cleanText(publishedAt)
          : undefined,
      };
    })
    .filter((article): article is RawArticle => article !== null);
}

function readTag(block: string, tag: string): string | null {
  const regex = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = block.match(regex);

  return match?.[1] ?? null;
}

function readAtomLink(block: string): string | null {
  const match = block.match(
    /<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i
  );

  return match?.[1] ?? null;
}

function cleanText(value: string): string {
  return decodeEntities(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function isFinanciallyRelevant(article: RawArticle): boolean {
  const text =
    `${article.title} ${article.description}`.toLowerCase();

  return FINANCE_KEYWORDS.some((keyword) =>
    text.includes(keyword)
  );
}

function articleToGameEvent(article: RawArticle): GameCard {
  const text =
    `${article.title} ${article.description}`.toLowerCase();

  const scenario = createScenario(text);

  /*
   * Evidence comes from the real feed's description when available.
   * If the feed has almost no description, use its real title instead.
   */
  const evidence =
    article.description.length >= 30
      ? shorten(article.description, 260)
      : article.title;

  return {
    kind: "news",
    title: scenario.title,
    body: scenario.body,
    options: scenario.options,
    source: {
      sourceName: article.sourceName,
      headline: article.title,
      evidence,
      url: article.url,
      sourceKind: "live",
      extractionMode: "local",
    },
  };
}

function createScenario(text: string): ScenarioTemplate {
  /*
   * Inflation / housing.
   */
  if (
    includesAny(text, [
      "consumer price",
      "inflation",
      "shelter",
      "rent",
      "housing",
    ])
  ) {
    const possibilities: ScenarioTemplate[] = [
      {
        title: "YOUR RENT RENEWAL JUMPS $140",
        body:
          "The latest price data shows continued pressure on housing costs. Your landlord sends a renewal notice raising your rent by $140 per month.",
        options: [
          {
            label: "Renew the lease",
            cash: 0,
            net: -140,
            debt: 0,
            note: "You keep your place, but your monthly budget gets tighter.",
          },
          {
            label: "Negotiate",
            cash: 0,
            net: -70,
            debt: 0,
            note: "Your landlord agrees to a smaller increase.",
          },
          {
            label: "Move",
            cash: -850,
            net: 65,
            debt: 0,
            note: "Moving costs hurt now, but the cheaper rent helps later.",
          },
        ],
      },

      {
        title: "YOUR MONTHLY BUDGET IS GETTING SQUEEZED",
        body:
          "Recent inflation data shows everyday prices remain under pressure. Your normal food and household spending is now about $90 higher each month.",
        options: [
          {
            label: "Keep spending normally",
            cash: 0,
            net: -90,
            debt: 0,
            note: "Convenience wins, but your monthly margin shrinks.",
          },
          {
            label: "Cut eating out",
            cash: 0,
            net: -25,
            debt: 0,
            note: "You absorb part of the increase by changing your habits.",
          },
          {
            label: "Build a stricter budget",
            cash: -100,
            net: 40,
            debt: 0,
            note: "A little effort up front improves your monthly cash flow.",
          },
        ],
      },
    ];

    return randomItem(possibilities);
  }

  /*
   * Job openings / layoffs / unemployment.
   */
  if (
    includesAny(text, [
      "job opening",
      "employment",
      "unemployment",
      "layoff",
      "labor market",
      "payroll",
      "hiring",
    ])
  ) {
    const possibilities: ScenarioTemplate[] = [
      {
        title: "HIRING IS SLOWING IN YOUR INDUSTRY",
        body:
          "Recent labor-market data suggests employers are becoming more cautious. Your company has not announced layoffs, but your team is starting to worry.",
        options: [
          {
            label: "Start job hunting",
            cash: -75,
            net: 150,
            debt: 0,
            note: "You find a slightly better-paying job before things get worse.",
          },
          {
            label: "Build an emergency fund",
            cash: -600,
            net: 0,
            debt: 0,
            note: "You set money aside in case your paycheck disappears.",
          },
          {
            label: "Stay put",
            cash: 0,
            net: 0,
            debt: 0,
            note: "You choose stability and keep working.",
          },
        ],
      },

      {
        title: "THERE ARE FEWER JOBS TO JUMP TO",
        body:
          "New job-opening data suggests workers have fewer outside opportunities. You have been considering leaving your current employer.",
        options: [
          {
            label: "Stay for now",
            cash: 0,
            net: 0,
            debt: 0,
            note: "You wait for the job market to improve.",
          },
          {
            label: "Apply anyway",
            cash: -100,
            net: 175,
            debt: 0,
            note: "The search takes time, but you eventually land a better role.",
          },
          {
            label: "Get a certification",
            cash: -650,
            net: 125,
            debt: 0,
            note: "You spend money now to become a stronger candidate.",
          },
        ],
      },
    ];

    return randomItem(possibilities);
  }

  /*
   * Wages / earnings.
   */
  if (
    includesAny(text, [
      "earnings",
      "wage",
      "salary",
      "compensation",
    ])
  ) {
    return {
      title: "WORKERS ARE EARNING MORE",
      body:
        "Recent earnings data shows pay changing across the labor market. Your annual performance review is next week, and you have to decide how aggressively to negotiate.",
      options: [
        {
          label: "Ask for a raise",
          cash: 0,
          net: 225,
          debt: 0,
          note: "You make your case and get a meaningful raise.",
        },
        {
          label: "Apply somewhere else",
          cash: -100,
          net: 300,
          debt: 0,
          note: "Another employer offers you more money.",
        },
        {
          label: "Do nothing",
          cash: 0,
          net: 0,
          debt: 0,
          note: "Your pay stays the same.",
        },
      ],
    };
  }

  /*
   * Federal Reserve / borrowing / rates.
   */
  if (
    includesAny(text, [
      "interest rate",
      "federal funds",
      "monetary policy",
      "credit",
      "loan",
      "mortgage",
    ])
  ) {
    const possibilities: ScenarioTemplate[] = [
      {
        title: "YOUR CAR LOAN QUOTE JUST GOT WORSE",
        body:
          "Borrowing conditions are changing, and the used car you planned to finance now comes with a more expensive monthly payment.",
        options: [
          {
            label: "Finance it anyway",
            cash: -1500,
            net: -310,
            debt: 12000,
            note: "You get the car, but the payment follows you every month.",
          },
          {
            label: "Put more money down",
            cash: -3000,
            net: -180,
            debt: 7000,
            note: "A larger down payment reduces your loan burden.",
          },
          {
            label: "Keep your current car",
            cash: -450,
            net: 0,
            debt: 0,
            note: "A repair buys you time and keeps you out of new debt.",
          },
        ],
      },

      {
        title: "CARRYING A CREDIT CARD BALANCE HURTS MORE",
        body:
          "Borrowing costs remain expensive. You have a large purchase coming up and are considering putting it on a credit card.",
        options: [
          {
            label: "Put it on the card",
            cash: 0,
            net: -85,
            debt: 1800,
            note: "You get what you need now, but the balance becomes expensive.",
          },
          {
            label: "Pay cash",
            cash: -1800,
            net: 0,
            debt: 0,
            note: "Your savings take the hit, but you avoid new debt.",
          },
          {
            label: "Wait and save",
            cash: 0,
            net: 100,
            debt: 0,
            note: "You delay the purchase and build more breathing room.",
          },
        ],
      },
    ];

    return randomItem(possibilities);
  }

  /*
   * General financially relevant article.
   */
  return {
    title: "THE ECONOMY JUST CHANGED YOUR MONTHLY BUDGET",
    body:
      "A new public economic release signals changing financial conditions. You decide how much room to leave in your budget for uncertainty.",
    options: [
      {
        label: "Increase savings",
        cash: -400,
        net: 25,
        debt: 0,
        note: "You sacrifice some cash now for a stronger cushion.",
      },
      {
        label: "Keep your current budget",
        cash: 0,
        net: 0,
        debt: 0,
        note: "You make no immediate changes.",
      },
      {
        label: "Pay down debt",
        cash: -350,
        net: 35,
        debt: -350,
        note: "Less debt improves your monthly breathing room.",
      },
    ],
  };
}

function chooseFallback(excludedUrls: Set<string>): GameCard {
  /*
   * First prefer a fallback source the player has NOT already seen.
   */
  const unused = FALLBACK_EVENTS.filter(
    (event) =>
      !event.source?.url ||
      !excludedUrls.has(event.source.url)
  );

  if (unused.length > 0) {
    const choice = randomItem(unused);

    console.log(
      "[game-news] using unused fallback:",
      choice.source?.headline
    );

    return choice;
  }

  /*
   * If the player has somehow seen every fallback, pick randomly.
   * This still avoids always returning index 0.
   */
  return randomItem(FALLBACK_EVENTS);
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function shorten(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function dedupeArticles(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();

  return articles.filter((article) => {
    if (seen.has(article.url)) {
      return false;
    }

    seen.add(article.url);

    return true;
  });
}