import { demoDocuments } from "@/data/demoNews";
import { fetchLatestDocuments } from "@/lib/news/adapters";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("mode") === "demo") {
    return NextResponse.json({ documents: demoDocuments, mode: "cached-demo", message: "Showing cached, traceable public-source demo documents." });
  }
  try {
    const documents = await fetchLatestDocuments();
    if (documents.length) return NextResponse.json({ documents, mode: "live" });
  } catch { /* explicit demo fallback below */ }
  return NextResponse.json({ documents: demoDocuments, mode: "cached-demo", message: "Live feeds are unavailable; showing cached public-source demo documents." });
}
