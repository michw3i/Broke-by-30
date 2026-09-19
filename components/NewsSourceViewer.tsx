import type { RawDocument } from "@/types/xtract";

export function NewsSourceViewer({ document }: { document: RawDocument }) {
  return <section className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5">
    <div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Original source</p><span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">{document.sourceKind === "live" ? "Live feed" : "Cached demo"}</span></div>
    <h3 className="text-lg font-semibold text-white">{document.headline}</h3>
    <p className="mt-2 text-sm text-slate-400">{document.sourceName} · {new Date(document.publishedAt).toLocaleDateString()}</p>
    <p className="mt-4 border-l-2 border-sky-400 pl-3 text-sm leading-6 text-slate-300">{document.content}</p>
    <a className="mt-4 inline-flex text-sm font-semibold text-sky-300 hover:text-sky-200" href={document.sourceUrl} target="_blank" rel="noreferrer">View original public source ↗</a>
  </section>;
}
