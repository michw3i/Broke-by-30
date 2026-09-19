import type { RawDocument } from "@/types/xtract";
import type { NewsSource } from "./types";

const clean = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export class RssNewsSource implements NewsSource {
  constructor(public readonly id: string, public readonly name: string, private readonly feedUrl: string) {}

  async fetch(): Promise<RawDocument[]> {
    const response = await fetch(this.feedUrl, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error(`${this.name} returned ${response.status}`);
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
  }
}

export const liveSources: NewsSource[] = [
  new RssNewsSource("bls", "U.S. Bureau of Labor Statistics", "https://www.bls.gov/feed/bls_latest.rss"),
];

export async function fetchLatestDocuments(): Promise<RawDocument[]> {
  const settled = await Promise.allSettled(liveSources.map((source) => source.fetch()));
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}
