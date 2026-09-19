import type { GeneratedLifeEvent } from "@/types/xtract";

export function GeneratedScenario({ scenario, onAddToGame, isQueued }: { scenario: GeneratedLifeEvent; onAddToGame?: () => void; isQueued?: boolean }) {
  return <section className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-5">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Generated life event</p>
    <h3 className="mt-2 text-xl font-bold text-white">{scenario.title}</h3><p className="mt-2 leading-6 text-slate-200">{scenario.description}</p>
    <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Your choices</p>
    <div className="mt-2 grid gap-2">{scenario.choices.map((choice) => <div key={choice.text} className="rounded-xl bg-slate-950/50 p-3"><p className="font-semibold text-white">{choice.text}</p><p className="mt-1 text-sm text-slate-300">{choice.consequenceText}</p></div>)}</div>
    <div className="mt-5 border-t border-emerald-200/20 pt-4 text-xs text-slate-300"><p className="font-bold uppercase tracking-wider text-emerald-200">Traceability</p><p className="mt-1">Scenario → {scenario.newsSignalId} → evidence → {scenario.sourceAttribution.sourceName}</p><a className="mt-1 inline-block text-sky-300 hover:text-sky-200" href={scenario.sourceAttribution.sourceUrl} target="_blank" rel="noreferrer">{scenario.sourceAttribution.headline} ↗</a></div>
    {onAddToGame && <button type="button" onClick={onAddToGame} disabled={isQueued} className="mt-5 w-full rounded-xl bg-emerald-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-default disabled:bg-emerald-100">{isQueued ? "Event queued — opening game…" : "Send Event to Broke by 30 →"}</button>}
  </section>;
}
