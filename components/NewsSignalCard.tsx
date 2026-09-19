import type { NewsSignal } from "@/types/xtract";

const arrows = { increase: "↑", decrease: "↓", risk: "!", opportunity: "↗", neutral: "•" };
export function NewsSignalCard({ signal }: { signal: NewsSignal }) {
  return <section className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Signal detected</p>
    <div className="mt-2 flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold text-white">{signal.topic} <span className="text-amber-300">{arrows[signal.direction]}</span></h3><p className="mt-1 text-slate-200">{signal.signal}</p></div><span className="rounded-full border border-amber-200/30 px-2 py-1 text-[10px] font-bold uppercase text-amber-200">{signal.magnitude}</span></div>
    <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Evidence · {signal.sourceSection}</p>
    <blockquote className="mt-2 border-l-2 border-amber-300 pl-3 text-sm leading-6 text-slate-200">“{signal.evidence}”</blockquote>
    <p className="mt-4 text-sm leading-6 text-slate-300"><span className="font-semibold text-white">Why Xtract flagged it:</span> {signal.explanation}</p>
    <p className="mt-2 text-sm leading-6 text-slate-300"><span className="font-semibold text-white">Game impact:</span> {signal.gameRelevance}</p>
  </section>;
}
