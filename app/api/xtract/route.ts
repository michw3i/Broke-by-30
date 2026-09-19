import { xtractDocument } from "@/lib/xtract/extract";
import type { RawDocument } from "@/types/xtract";
import { NextResponse } from "next/server";

function isDocument(value: unknown): value is RawDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<RawDocument>;
  return ["id", "headline", "sourceName", "sourceUrl", "publishedAt", "content", "sourceKind"].every((key) => typeof document[key as keyof RawDocument] === "string") && (document.sourceKind === "live" || document.sourceKind === "cached-demo");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isDocument(body.document)) return NextResponse.json({ error: "A complete document is required." }, { status: 400 });
    return NextResponse.json(await xtractDocument(body.document));
  } catch {
    return NextResponse.json({ error: "Xtract could not process that document. Please try another source." }, { status: 500 });
  }
}
