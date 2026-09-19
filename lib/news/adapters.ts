import type { RawDocument } from "@/types/xtract";
import type { NewsSource } from "./types";

const clean = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
export const REQUEST_TIMEOUT_MS = 6000;

async function fetchWithTimeout(input: string, init: RequestInit = {}, label: string, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[news] fetch started", label, input);
    }
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`${label} returned ${response.status}`);
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export class RssNewsSource implements NewsSource {
  constructor(public readonly id: string, public readonly name: string, private readonly feedUrl: string) {}

  async fetch(): Promise<RawDocument[]> {
    const label = `${this.name} RSS`;
    try {
      const response = await fetchWithTimeout(this.feedUrl, { next: { revalidate: 900 } }, label, REQUEST_TIMEOUT_MS);
      const xml = await response.text();
      const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
      return items.slice(0, 6).flatMap((item, index) => {
        const pick = (tag: string) => item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1];
        const headline = clean(pick("title") ?? "");
        const sourceUrl = clean(pick("link") ?? "");
        const content = clean(pick("description") ?? pick("content:encoded") ?? "");
        if (!headline || !sourceUrl || !content) return [];
        const published = pick("pubDate");
        return [{ id: `${this.id}-${index}-${sourceUrl}`, headline, sourceName: this.name, sourceUrl, content, publishedAt: published ? new Date(clean(published)).toISOString() : new Date().toISOString(), sourceKind: "live" as const }];
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[news] live fetch failed", label, error instanceof Error ? error.message : error);
      }
      throw error;
    }
  }
}

export const liveSources: NewsSource[] = [
  new RssNewsSource("bls", "U.S. Bureau of Labor Statistics", "https://www.bls.gov/feed/bls_latest.rss"),
];

export async function fetchLatestDocuments(): Promise<RawDocument[]> {
  const settled = await Promise.allSettled(liveSources.map((source) => source.fetch()));
  const documents = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (process.env.NODE_ENV !== "production") {
    console.log("[news] live fetch completed", { count: documents.length, failures: settled.filter((result) => result.status === "rejected").length });
  }
  return documents;
}
