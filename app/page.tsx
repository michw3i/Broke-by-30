import Link from "next/link";

export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07111f] px-6 text-white">
      <section className="max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">SteelHacks · Financial life simulation</p><h1 className="mt-5 text-5xl font-black tracking-tight sm:text-7xl">Broke by 30</h1><p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">A life sim about the decisions behind your money. See how real public financial signals become the moments that shape a life.</p><Link href="/xtract" className="mt-9 inline-flex rounded-xl bg-sky-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-sky-300">Try News to Life Event →</Link><p className="mt-5 text-sm text-slate-500">Live public feeds when available · traceable cached demo fallback</p></section>
    </main>
  );
}
