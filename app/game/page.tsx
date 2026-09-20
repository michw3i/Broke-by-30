"use client";
import React, { useState, useRef, useEffect } from "react";

/* ============================================================
   BROKE BY 30
   Flow: title -> roll character -> play (18..30) -> recap
   ============================================================ */

const C = {
  bg: "#12132b", device: "#23243f", paper: "#f5efe0", ink: "#14162e",
  gold: "#ffc542", goldDk: "#c98b17", gain: "#35b34a", loss: "#e0453e",
  blue: "#3d7bd6", mute: "#6b6f88", cream2: "#e9e1cd",
};

/* ---------- avatar ---------- */
const AVATAR_MAP = [
  "....hhhh....", "..hhhhhhhh..", ".hhhhhhhhhh.", ".hhssssssshh",
  ".hsssssssssh", ".hskssskssh.", ".hsssssssssh", ".hssskssssh.",
  ".hsssssssss.", "..ssssssss..", ".ggccccccgg.", "cccccccccccc",
];
const AVATARS = [
  { h: "#4a3220", s: "#e8b98f" },
  { h: "#161616", s: "#8a5a3a" },
  { h: "#d4a017", s: "#f0cba0" },
  { h: "#7a3524", s: "#c98d6a" },
  { h: "#2b2b3d", s: "#6b4226" },
];
function PixelAvatar({ size = 44, colors = AVATARS[1] }) {
  const n = 12;
  const fill = (ch) =>
    ch === "h" ? colors.h : ch === "s" ? colors.s : ch === "k" ? C.ink :
    ch === "g" ? C.gold : ch === "c" ? C.paper : null;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges"
      style={{ border: `3px solid ${C.ink}`, background: C.ink, boxShadow: `3px 3px 0 ${C.ink}`, flexShrink: 0 }}>
      {AVATAR_MAP.map((row, y) =>
        [...row].map((ch, x) => {
          const f = fill(ch);
          return f ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={f} /> : null;
        })
      )}
    </svg>
  );
}

/* ---------- character generation ---------- */
const FIRST = ["Mo","Ari","Kit","Sam","Remy","Jesse","Noor","Dev","Tam","Ray","Ezra","Nia"];
const LAST  = ["Okafor","Nguyen","Silva","Kaur","Hassan","Reyes","Cohen","Park","Ali","Diaz"];
const CITIES = ["Pittsburgh","Austin","Detroit","Denver","Tampa","Columbus","Buffalo","Fresno"];

// income/expense are MONTHLY. debt is starting debt.
const OCCUPATIONS = [
  { title: "Student",        income: 400,  expense: 950,  cash: 900,  debt: 12000, blurb: "Classes now, bills later." },
  { title: "Unemployed",     income: 0,    expense: 800,  cash: 1600, debt: 0,     blurb: "Between things. Burning savings." },
  { title: "Line Cook",      income: 2100, expense: 1750, cash: 700,  debt: 1200,  blurb: "Long shifts, steady tips." },
  { title: "Retail Clerk",   income: 1900, expense: 1650, cash: 500,  debt: 800,   blurb: "Part-time hours, full-time tired." },
  { title: "Apprentice",     income: 2300, expense: 1800, cash: 600,  debt: 2500,  blurb: "Learning a trade that pays later." },
  { title: "Rideshare Driver",income: 2000, expense: 1700, cash: 400,  debt: 3500,  blurb: "You own the car. The car owns you." },
  { title: "Intern",         income: 1500, expense: 1400, cash: 1100, debt: 6000,  blurb: "Experience, allegedly." },
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
function rollCharacter() {
  const occ = pick(OCCUPATIONS);
  return {
    name: `${pick(FIRST)} ${pick(LAST)}`,
    city: pick(CITIES),
    avatar: pick(AVATARS),
    occupation: occ.title,
    blurb: occ.blurb,
    income: occ.income,
    expense: occ.expense,
    cash: occ.cash,
    debt: occ.debt,
  };
}

/* ---------- backend: real character from Snowflake ---------- */
/* Maps POST /api/characters -> the flat shape this UI uses.
   Their payload:  { success, player: { firstName, city{name}, background{...},
                     occupation{title, annualSalary}, finances{...}, xtractTokens } } */
function adaptPlayer(p) {
  const f = p.finances || {};
  return {
    name: p.firstName || "Player",
    city: p.city?.name || "Somewhere",
    avatar: pick(AVATARS),                    // API sends no avatar; roll one
    occupation: p.occupation?.title || "Unemployed",
    blurb: p.background?.description || p.background?.name || "",
    income: Math.round(Number(p.occupation?.annualSalary || 0) / 12),   // annual -> monthly
    expense: Number(f.monthlyRent || 0) + Number(f.monthlyExpenses || 0),
    cash: Number(f.cash || 0) + Number(f.savings || 0),
    debt: Number(f.studentDebt || 0) + Number(f.creditCardDebt || 0) + Number(f.carDebt || 0),
    playerId: p.playerId,
    xtractTokens: p.xtractTokens ?? 0,
    fromDB: true,
  };
}

async function fetchCharacter() {
  try {
    const res = await fetch("/api/characters", { method: "POST" });
    const data = await res.json();
    if (!data?.success || !data?.player) throw new Error("bad payload");
    return adaptPlayer(data.player);
  } catch {
    return rollCharacter();      // fallback: game always starts
  }
}

/* ---------- deck ---------- */
const DECK = [
  { kind: "life", title: "YOUR CAR NEEDS $1,800 IN REPAIRS", body: "The check-engine light finally meant something.",
    options: [
      { label: "Pay in cash", cash: -1800, note: "Ouch, but it's done." },
      { label: "Put it on a card", cash: -200, debt: 1700, note: "Minimums for a while." },
      { label: "Take the bus", expense: 120, note: "You're late to work a lot." }] },
  { kind: "news", title: "RENT RENEWAL IS UP 6% THIS YEAR", body: "Your landlord sends over the new lease.",
    source: { headline: "US shelter costs climb as CPI rises", url: "https://example.com/cpi" },
    options: [
      { label: "Sign it", expense: 90, note: "Same place, higher rent." },
      { label: "Negotiate", expense: 40, note: "Split the difference." },
      { label: "Move cheaper", cash: -1500, expense: -60, note: "Moving hurts up front." }] },
  { kind: "news", title: "LAYOFFS SWEEP YOUR INDUSTRY", body: "Three companies in your field cut staff this week.",
    source: { headline: "Tech sector sheds jobs in latest round", url: "https://example.com/layoffs" },
    options: [
      { label: "Keep your head down", note: "You survive the round." },
      { label: "Job hunt now", income: 180, note: "Landed a better offer." },
      { label: "Upskill on savings", cash: -600, income: 260, note: "The course paid off." }] },
  { kind: "life", title: "FRIENDS WANT YOU IN VEGAS", body: "Flights, hotel, the whole thing.",
    options: [
      { label: "Go all out", cash: -900, note: "Worth it? Debatable." },
      { label: "Go, but budget", cash: -250, note: "Fun without the bill." },
      { label: "Sit this one out", note: "FOMO, but solvent." }] },
  { kind: "news", title: "THE MARKET DROPS 12%", body: "Your feed is a sea of red today.",
    source: { headline: "Stocks tumble on rate fears", url: "https://example.com/market" },
    options: [
      { label: "Buy the dip", cash: -1000, invest: 1000, note: "You put cash to work." },
      { label: "Hold and wait", note: "You don't flinch." },
      { label: "Panic sell", invest: -400, cash: 400, note: "Cash now, regret later." }] },
  { kind: "life", title: "A RAISE - IF YOU RELOCATE", body: "Same company, new city, more money.",
    options: [
      { label: "Take it", cash: -2000, income: 430, note: "Big move, bigger paycheck." },
      { label: "Stay put", note: "Roots over raise." }] },
  { kind: "life", title: "AN ER VISIT AND A $2,400 BILL", body: "You're fine. The invoice isn't.",
    options: [
      { label: "Pay it off", cash: -2400, note: "Savings took the hit." },
      { label: "Payment plan", expense: 95, note: "Spread over years." },
      { label: "Ignore the letters", debt: 3000, note: "Collections, eventually." }] },
  { kind: "news", title: "STUDENT LOAN RATES TICK UP", body: "Refinancing offers flood your inbox.",
    source: { headline: "Federal loan rates rise again", url: "https://example.com/loans" },
    options: [
      { label: "Refinance lower", cash: -300, debt: -1500, note: "Less interest bleeding." },
      { label: "Pay extra this year", cash: -1200, debt: -1500, note: "Principal down." },
      { label: "Minimums only", debt: 400, note: "Interest keeps stacking." }] },
];

/* ---------- backend ---------- */
const API_BASE = "";
const FETCH_TIMEOUT_MS = 4000;
async function fetchCards() {
  if (!API_BASE) return { cards: DECK, live: false };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/cards`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cards = Array.isArray(data) ? data : data.cards;
    if (!Array.isArray(cards) || cards.length === 0) throw new Error("no cards");
    return { cards, live: true };
  } catch (err) {
    return { cards: DECK, live: false };
  } finally { clearTimeout(timer); }
}

/* ---------- constants ---------- */
const START_AGE = 18, END_AGE = 30;
const DEBT_RATE = 0.18, INVEST_RATE = 0.07;
const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString();

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
.pix{font-family:'Press Start 2P',monospace}
.mono{font-family:ui-monospace,'Courier New',monospace}
.panel{border:4px solid ${C.ink};box-shadow:6px 6px 0 ${C.ink}}
.opt{border:3px solid ${C.ink};box-shadow:4px 4px 0 ${C.ink};background:${C.paper};
 transition:transform .05s,box-shadow .05s;cursor:pointer}
.opt:hover{background:${C.cream2}}
.opt:active{transform:translate(4px,4px);box-shadow:0 0 0 ${C.ink}}
.bigbtn{border:4px solid ${C.ink};box-shadow:5px 5px 0 ${C.ink};
 transition:transform .05s,box-shadow .05s;cursor:pointer}
.bigbtn:active{transform:translate(5px,5px);box-shadow:0 0 0 ${C.ink}}
.scan{pointer-events:none;position:absolute;inset:0;
 background:repeating-linear-gradient(0deg,rgba(0,0,0,.06) 0 2px,transparent 2px 4px)}
.feed::-webkit-scrollbar{width:8px}
.feed::-webkit-scrollbar-thumb{background:${C.mute}}
`;

export default function BrokeBy30() {
  const [phase, setPhase] = useState("title"); // title|rolling|roll|decide|resolved|over
  const [ch, setCh] = useState(null);          // character
  const [age, setAge] = useState(START_AGE);
  const [cash, setCash] = useState(0);
  const [debt, setDebt] = useState(0);
  const [invest, setInvest] = useState(0);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [feed, setFeed] = useState([]);
  const [deck, setDeck] = useState(DECK);
  const [live, setLive] = useState(false);
  const [deckPos, setDeckPos] = useState(0);
  const [flash, setFlash] = useState(null);
  const [lastPick, setLastPick] = useState(null);
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed]);

  const net = income - expense;
  const worth = cash + invest - debt;
  const card = deck[deckPos % deck.length];

  /* --- roll a character from the backend (falls back to local) --- */
  const roll = async () => {
    setPhase("rolling");
    const c = await fetchCharacter();
    setCh(c);
    setPhase("roll");
  };

  const begin = () => {
    setAge(START_AGE);
    setCash(ch.cash); setDebt(ch.debt); setInvest(0);
    setIncome(ch.income); setExpense(ch.expense);
    setFeed([
      { t: `${ch.name.toUpperCase()}, 18, ${ch.city.toUpperCase()}`, tone: "mute" },
      { t: `OCCUPATION: ${ch.occupation.toUpperCase()}`, tone: "mute" },
    ]);
    setDeckPos(0); setPhase("decide"); setLastPick(null);
    fetchCards().then(({ cards, live }) => { setDeck(cards); setLive(live); });
  };

  const choose = (opt) => {
    if (opt.cash) { setCash((v) => v + opt.cash); setFlash(opt.cash > 0 ? "gain" : "loss"); }
    if (opt.debt) setDebt((v) => Math.max(0, v + opt.debt));
    if (opt.invest) setInvest((v) => Math.max(0, v + opt.invest));
    if (opt.income) setIncome((v) => v + opt.income);
    if (opt.expense) setExpense((v) => Math.max(0, v + opt.expense));
    setFeed((f) => [...f,
      { t: card.title, tone: "title" },
      { t: `> ${opt.label.toUpperCase()} - ${opt.note}`, tone: "you", cash: opt.cash }]);
    setLastPick(opt); setPhase("resolved");
    setTimeout(() => setFlash(null), 600);
  };

  const ageUp = () => {
    const banked = net * 12;
    const interest = Math.round(debt * DEBT_RATE);
    const drift = INVEST_RATE + (Math.random() * 0.16 - 0.08);
    const growth = Math.round(invest * drift);
    const newCash = cash + banked;
    const newDebt = debt + interest;
    const newInvest = invest + growth;
    const nextAge = age + 1;

    setCash(newCash); setDebt(newDebt); setInvest(newInvest); setAge(nextAge);
    setFeed((f) => {
      const lines = [{ t: `AGE ${nextAge} - ${money(banked)} EARNED`, tone: "mute" }];
      if (interest) lines.push({ t: `DEBT INTEREST: -${money(interest)}`, tone: "bad" });
      if (growth) lines.push({ t: `INVESTMENTS: ${money(growth)}`, tone: growth >= 0 ? "good" : "bad" });
      return [...f, ...lines];
    });

    if (nextAge >= END_AGE) { setPhase("over"); return; }
    setDeckPos((p) => p + 1); setPhase("decide"); setLastPick(null);
  };

  const restart = () => { setPhase("title"); setCh(null); setFeed([]); };

  /* ---------- shell ---------- */
  const Shell = ({ children }) => (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center",
      alignItems: "flex-start", padding: "24px 12px",
      backgroundImage: "repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0 1px,transparent 1px 6px),repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 1px,transparent 1px 6px)" }}>
      <style>{CSS}</style>
      <div className="panel" style={{ position: "relative", width: "100%", maxWidth: 420, background: C.device,
        display: "flex", flexDirection: "column", height: "min(780px, calc(100vh - 48px))", padding: 10 }}>
        <div className="scan" />
        {children}
      </div>
    </div>
  );

  /* ---------- ROLLING ---------- */
  if (phase === "rolling") return (
    <Shell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 18 }}>
        <PixelAvatar size={80} />
        <div className="pix" style={{ fontSize: 12, color: C.gold, textShadow: `2px 2px 0 ${C.ink}` }}>
          ROLLING A LIFE...
        </div>
      </div>
    </Shell>
  );

  /* ---------- TITLE ---------- */
  if (phase === "title") return (
    <Shell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 22, textAlign: "center", padding: 20 }}>
        <PixelAvatar size={92} />
        <div className="pix" style={{ fontSize: 22, color: C.gold, textShadow: `3px 3px 0 ${C.ink}`, lineHeight: 1.5 }}>
          BROKE<br />BY 30
        </div>
        <div className="mono" style={{ fontSize: 13, color: "#c8ccdf", maxWidth: 270, lineHeight: 1.5 }}>
          You&apos;re 18. Twelve years of money decisions. Don&apos;t end up broke.
        </div>
        <button onClick={roll} className="bigbtn pix"
          style={{ padding: "16px 22px", background: C.gold, color: C.ink, fontSize: 12 }}>
          START ►
        </button>
      </div>
    </Shell>
  );

  /* ---------- CHARACTER ROLL ---------- */
  if (phase === "roll") return (
    <Shell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, padding: 18 }}>
        <div className="pix" style={{ fontSize: 11, color: C.gold, textAlign: "center", textShadow: `2px 2px 0 ${C.ink}` }}>
          YOUR LIFE
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
          <PixelAvatar size={76} colors={ch.avatar} />
          <div>
            <div className="pix" style={{ fontSize: 11, color: C.paper, lineHeight: 1.6 }}>{ch.name.toUpperCase()}</div>
            <div className="mono" style={{ fontSize: 12, color: "#9aa0c0", marginTop: 6 }}>Age 18 · {ch.city}</div>
            {ch.fromDB && (
              <div className="mono" style={{ fontSize: 9.5, color: C.gain, marginTop: 5, letterSpacing: 0.5 }}>
                ◆ SNOWFLAKE #{ch.playerId}
              </div>
            )}
          </div>
        </div>

        <div style={{ border: `3px solid ${C.ink}`, background: C.gold, padding: "10px 12px", textAlign: "center" }}>
          <div className="pix" style={{ fontSize: 11, color: C.ink }}>{ch.occupation.toUpperCase()}</div>
          <div className="mono" style={{ fontSize: 12, color: "#6b5312", marginTop: 6 }}>{ch.blurb}</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Stat label="CASH" value={money(ch.cash)} color={C.goldDk} />
          <Stat label="DEBT" value={money(ch.debt)} color={ch.debt ? C.loss : C.mute} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Stat label="INCOME/MO" value={money(ch.income)} color={C.gain} />
          <Stat label="COSTS/MO" value={money(ch.expense)} color={C.loss} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={roll} className="bigbtn mono"
            style={{ flex: 1, padding: 13, background: C.paper, color: C.ink, fontSize: 13, fontWeight: 700 }}>
            ↻ REROLL
          </button>
          <button onClick={begin} className="bigbtn pix"
            style={{ flex: 1.3, padding: 13, background: C.gold, color: C.ink, fontSize: 11 }}>
            BEGIN ►
          </button>
        </div>
      </div>
    </Shell>
  );

  /* ---------- RECAP ---------- */
  if (phase === "over") {
    const won = worth > 0;
    const title = worth > 60000 ? "ACTUALLY RICH"
      : worth > 20000 ? "COMFORTABLE"
      : worth > 0 ? "SCRAPED BY"
      : worth > -15000 ? "BROKE BY 30"
      : "BURIED IN DEBT";
    return (
      <Shell>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 14, padding: 20, textAlign: "center" }}>
          <PixelAvatar size={82} colors={ch.avatar} />
          <div className="pix" style={{ fontSize: 16, color: won ? C.gain : C.loss, textShadow: `2px 2px 0 ${C.ink}`, lineHeight: 1.5 }}>
            {title}
          </div>
          <div className="mono" style={{ fontSize: 12, color: "#c8ccdf", lineHeight: 1.5, maxWidth: 280 }}>
            {ch.name} started at 18 as a {ch.occupation.toLowerCase()} in {ch.city}. Twelve years later:
          </div>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <Stat label="NET WORTH" value={money(worth)} color={worth >= 0 ? C.gain : C.loss} />
            <Stat label="CASH" value={money(cash)} color={C.goldDk} />
          </div>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <Stat label="INVESTED" value={money(invest)} color={C.gain} />
            <Stat label="DEBT" value={money(debt)} color={debt ? C.loss : C.mute} />
          </div>
          <button onClick={restart} className="bigbtn pix"
            style={{ marginTop: 6, padding: "13px 20px", background: C.gold, color: C.ink, fontSize: 11 }}>
            ↺ NEW LIFE
          </button>
        </div>
      </Shell>
    );
  }

  /* ---------- GAME ---------- */
  const yearsLeft = END_AGE - age;
  const filled = age - START_AGE;
  const totalSeg = END_AGE - START_AGE;

  return (
    <Shell>
      {/* header */}
      {/* ---- status window (RPG style) ---- */}
      <div style={{ border: `4px solid ${C.ink}`, background: "#1b1c33", marginBottom: 10 }}>
        {/* portrait + nameplate */}
        <div style={{ display: "flex", gap: 10, padding: 9, borderBottom: `4px solid ${C.ink}` }}>
          <div style={{ border: `3px solid ${C.gold}`, background: C.ink, padding: 2, flexShrink: 0 }}>
            <PixelAvatar size={54} colors={ch.avatar} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pix" style={{ fontSize: 9, color: C.paper, lineHeight: 1.5,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {ch.name.toUpperCase()}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: C.gold, marginTop: 3, letterSpacing: 0.5 }}>
              {ch.occupation.toUpperCase()}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 5 }}>
              <span className="pix" style={{ fontSize: 13, color: C.gold }}>◆</span>
              <span className="pix" style={{ fontSize: 19, lineHeight: 1,
                color: flash === "loss" ? C.loss : flash === "gain" ? C.gain : C.paper,
                textShadow: `2px 2px 0 ${C.ink}`, transition: "color .2s" }}>
                {money(cash)}
              </span>
            </div>
          </div>
        </div>

        {/* stat sheet with leader dots */}
        <div style={{ padding: "8px 10px 9px" }}>
          <Row label="DEBT" value={money(debt)} color={debt > 0 ? C.loss : "#5a6080"} />
          <Row label="INVESTED" value={money(invest)} color={invest > 0 ? C.gain : "#5a6080"} />
          <Row label="PER MONTH" value={`${net >= 0 ? "+" : ""}${money(net)}`} color={net >= 0 ? C.gain : C.loss} />
        </div>

        {/* year ticker */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
          borderTop: `3px solid ${C.ink}`, background: "#16172c" }}>
          <span className="mono" style={{ fontSize: 9, color: "#7a81a0", letterSpacing: 1 }}>AGE {age}</span>
          <div style={{ display: "flex", gap: 3, flex: 1 }}>
            {Array.from({ length: totalSeg }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 7,
                background: i < filled ? C.gold : "#2f3050" }} />
            ))}
          </div>
          <span className="mono" style={{ fontSize: 9, color: C.gold }}>{yearsLeft} TO GO</span>
        </div>
      </div>

      {/* feed */}
      <div ref={feedRef} className="feed panel" style={{ flex: 1, overflowY: "auto", padding: 12,
        background: C.paper, boxShadow: "inset 3px 3px 0 rgba(0,0,0,.08)", marginBottom: 10 }}>
        {feed.map((e, i) => <FeedLine key={i} e={e} />)}
      </div>

      {/* action */}
      <div className="panel" style={{ background: C.paper }}>
        <div style={{ padding: 12 }}>
          {phase === "decide" && (
            <div>
              {card.kind === "news" && (
                <div className="pix" style={{ display: "inline-block", fontSize: 8, color: C.paper,
                  background: C.blue, border: `3px solid ${C.ink}`, padding: "4px 6px", marginBottom: 10 }}>
                  ★ IN THE NEWS
                </div>
              )}
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.35 }}>{card.title}</div>
              <div className="mono" style={{ fontSize: 13, color: C.mute, marginTop: 6, lineHeight: 1.4 }}>{card.body}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>
                {card.options.map((o, i) => (
                  <button key={i} onClick={() => choose(o)} className="opt mono"
                    style={{ textAlign: "left", padding: "11px 12px", fontSize: 13.5, fontWeight: 700, color: C.ink }}>
                    ▸ {o.label}
                  </button>
                ))}
              </div>
              {card.kind === "news" && card.source && (
                <a href={card.source.url} target="_blank" rel="noreferrer" className="mono"
                  style={{ display: "block", marginTop: 11, fontSize: 11, color: C.blue, textDecoration: "none" }}>
                  ⧉ SOURCE: {card.source.headline}
                </a>
              )}
            </div>
          )}

          {phase === "resolved" && lastPick && (
            <div>
              <div className="pix" style={{ fontSize: 8, color: C.goldDk, marginBottom: 8 }}>YOU CHOSE</div>
              <div className="mono" style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{lastPick.label}</div>
              <div className="mono" style={{ fontSize: 12.5, color: C.mute, marginTop: 4 }}>{lastPick.note}</div>
              <div className="mono" style={{ fontSize: 11.5, color: C.mute, textAlign: "center", margin: "12px 0 10px" }}>
                This year nets <b style={{ color: net >= 0 ? C.gain : C.loss }}>{money(net * 12)}</b>
                {debt > 0 && <> · interest <b style={{ color: C.loss }}>-{money(Math.round(debt * DEBT_RATE))}</b></>}
              </div>
              <button onClick={ageUp} className="bigbtn pix"
                style={{ width: "100%", padding: 15, background: C.gold, color: C.ink, fontSize: 11 }}>
                AGE UP TO {age + 1} ►
              </button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* ---------- small pieces ---------- */
function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, border: `3px solid ${C.ink}`, background: C.paper, padding: "9px 10px" }}>
      <div className="mono" style={{ fontSize: 10, color: C.mute, letterSpacing: 1 }}>{label}</div>
      <div className="pix" style={{ fontSize: 12, color: color || C.ink, marginTop: 6 }}>{value}</div>
    </div>
  );
}
function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, marginTop: 4 }}>
      <span className="mono" style={{ fontSize: 10.5, color: "#8a91ad", letterSpacing: 1 }}>{label}</span>
      <span style={{ flex: 1, borderBottom: "2px dotted #3a3d5e", marginBottom: 3 }} />
      <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
function FeedLine({ e }) {
  if (e.tone === "title")
    return <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginTop: 12 }}>{e.t}</div>;
  if (e.tone === "you")
    return (
      <div className="mono" style={{ marginTop: 4, marginBottom: 6 }}>
        <div style={{ fontSize: 12.5, color: C.mute, lineHeight: 1.4 }}>{e.t}</div>
        {!!e.cash && <span style={{ fontSize: 12, fontWeight: 700, color: e.cash < 0 ? C.loss : C.gain }}>{money(e.cash)}</span>}
      </div>
    );
  if (e.tone === "good" || e.tone === "bad")
    return <div className="mono" style={{ fontSize: 11.5, fontWeight: 700, textAlign: "center", margin: "3px 0",
      color: e.tone === "good" ? C.gain : C.loss }}>{e.t}</div>;
  return <div className="mono" style={{ fontSize: 11, color: "#8a8570", margin: "10px 0", textAlign: "center", letterSpacing: 1 }}>— {e.t} —</div>;
}