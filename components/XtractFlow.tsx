"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { convertXtractScenarioToGameEvent } from "@/lib/xtract/gameEventAdapter";
import { queueXtractGameEvent } from "@/lib/xtract/gameEventStore";
import type { RawDocument, XtractResponse } from "@/types/xtract";
import { GeneratedScenario } from "./GeneratedScenario";
import { NewsSignalCard } from "./NewsSignalCard";
import { NewsSourceViewer } from "./NewsSourceViewer";

type Status = "idle" | "loading" | "extracting" | "error";

export function XtractFlow() {
  const router = useRouter();
  const [documents, setDocuments] = useState<RawDocument[]>([]);
  const [selected, setSelected] = useState<RawDocument | null>(null);
  const [result, setResult] = useState<XtractResponse | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [note, setNote] = useState("");
  const [isQueued, setIsQueued] = useState(false);

  async function scan(useDemo = false) {
    setStatus("loading"); setResult(null); setIsQueued(false);
    try {
      const response = await fetch(`/api/news${useDemo ? "?mode=demo" : ""}`);
      if (!response.ok) throw new Error(`News route returned ${response.status}`);
      const body = await response.json() as { documents: RawDocument[]; message?: string };
      setDocuments(body.documents); setSelected(body.documents[0] ?? null);
      setNote(body.message ?? "Live public-source documents loaded."); setStatus("idle");
    } catch (error) { setStatus("error"); setNote(`Could not load sources: ${error instanceof Error ? error.message : "unknown error"}`); }
  }

  async function extract() {
    if (!selected) return;
    setStatus("extracting"); setResult(null); setIsQueued(false); setNote("Sending the selected source to /api/xtract...");
    try {
      const response = await fetch("/api/xtract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document: selected }) });
      const body = await response.json() as XtractResponse;
      if (!response.ok) throw new Error(body.error ?? `Xtract route returned ${response.status}`);
      setResult(body); setNote(body.error ?? (body.mode === "ai" ? "AI extraction completed." : "Local fallback completed — safe to demo without an API key.")); setStatus("idle");
    } catch (error) { setStatus("error"); setNote(`Xtract failed: ${error instanceof Error ? error.message : "unknown error"}`); }
  }

  function addToGame() {
    if (!result?.scenario || !result.signal) return;
    queueXtractGameEvent(convertXtractScenarioToGameEvent(result.scenario, result.signal, result.mode, result.fallbackReason));
    setIsQueued(true);
    window.setTimeout(() => router.push("/"), 500);
  }

  const noticeStyle = status === "error" || result?.error ? "border-rose-300/40 bg-rose-300/10 text-rose-100" : status === "extracting" || status === "loading" ? "border-sky-300/40 bg-sky-300/10 text-sky-100" : "border-slate-700 bg-slate-800/70 text-slate-300";
  return <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
    <aside className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">1 · News sources</p><h2 className="mt-2 text-2xl font-bold text-white">Find a real-world signal</h2>
      <button onClick={() => scan()} disabled={status === "loading"} className="mt-5 w-full rounded-xl bg-sky-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-sky-300 disabled:opacity-60">{status === "loading" ? "Scanning public feeds..." : "Scan Latest News"}</button>
      <button onClick={() => scan(true)} disabled={status === "loading"} className="mt-2 w-full rounded-xl border border-slate-600 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-sky-300 disabled:opacity-60">Use cached demo sources</button>
      {note && <p role="status" className={`mt-3 rounded-lg border p-3 text-sm leading-5 ${noticeStyle}`}>{note}</p>}
      <div className="mt-5 grid gap-2">{documents.map((document) => <button key={document.id} onClick={() => { setSelected(document); setResult(null); setIsQueued(false); setNote("Source selected. Ready for Xtract."); }} className={`rounded-xl border p-3 text-left transition ${selected?.id === document.id ? "border-sky-300 bg-sky-300/10" : "border-slate-700 hover:border-slate-500"}`}><p className="text-sm font-semibold text-white">{document.headline}</p><p className="mt-1 text-xs text-slate-400">{document.sourceName} · {document.sourceKind === "live" ? "LIVE" : "CACHED DEMO"}</p></button>)}</div>
    </aside>
    <main className="grid gap-5">{selected ? <><NewsSourceViewer document={selected}/><button onClick={extract} disabled={status === "extracting"} className="rounded-xl bg-amber-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60">{status === "extracting" ? "Xtracting signal..." : "2 · Xtract Signal & Generate Event"}</button>{result?.fallbackReason && <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-5 text-amber-100"><span className="font-bold">Fallback status:</span> {result.fallbackReason}</p>}{result?.signal && <NewsSignalCard signal={result.signal}/>} {result?.scenario && <GeneratedScenario scenario={result.scenario} onAddToGame={addToGame} isQueued={isQueued}/>}</> : <div className="rounded-2xl border border-dashed border-slate-600 p-10 text-center text-slate-400">Scan a feed or load cached demo sources to begin.</div>}</main>
  </div>;
}
