import type { RawDocument } from "@/types/xtract";

// These are cached excerpts from public releases, intentionally dated and labeled
// so an offline demo is never presented as a current/live result.
export const demoDocuments: RawDocument[] = [
  {
    id: "demo-bls-cpi-2025-01",
    headline: "Consumer Price Index — January 2025",
    sourceName: "U.S. Bureau of Labor Statistics",
    sourceUrl: "https://www.bls.gov/news.release/archives/cpi_02122025.htm",
    publishedAt: "2025-02-12T13:30:00.000Z",
    sourceKind: "cached-demo",
    content: "The index for shelter rose 0.4 percent in January. The motor vehicle insurance index rose 2.0 percent in January. Over the last year, the shelter index increased 4.4 percent and motor vehicle insurance increased 11.8 percent.",
  },
  {
    id: "demo-fed-rate-2024-12",
    headline: "Federal Reserve issues FOMC statement",
    sourceName: "Federal Reserve Board",
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20241218a.htm",
    publishedAt: "2024-12-18T19:00:00.000Z",
    sourceKind: "cached-demo",
    content: "The Committee decided to lower the target range for the federal funds rate by 1/4 percentage point to 4-1/4 to 4-1/2 percent. The economic outlook is uncertain.",
  },
  {
    id: "demo-bls-cpi-food-2025-01",
    headline: "Consumer Price Index — January 2025: food costs",
    sourceName: "U.S. Bureau of Labor Statistics",
    sourceUrl: "https://www.bls.gov/news.release/archives/cpi_02122025.htm",
    publishedAt: "2025-02-12T13:30:00.000Z",
    sourceKind: "cached-demo",
    content: "The index for food also increased in January, rising 0.4 percent as the index for food at home rose 0.5 percent. The food index increased 2.5 percent over the last year.",
  },
];
