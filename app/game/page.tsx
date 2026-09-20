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

/* ---------- age-22 career jump (college-tier roles) ---------- */
const GRAD_JOBS = [
  { title: "Junior Analyst",      income: 4200, blurb: "Spreadsheets, but salaried." },
  { title: "Registered Nurse",    income: 5100, blurb: "Twelve-hour shifts, real pay." },
  { title: "Software Developer",  income: 6200, blurb: "You shipped the take-home." },
  { title: "Paralegal",           income: 3800, blurb: "The firm liked your writing." },
  { title: "Accountant",          income: 4600, blurb: "Busy season is brutal." },
  { title: "Teacher",             income: 3500, blurb: "Summers off. Sort of." },
  { title: "Marketing Associate", income: 3900, blurb: "You run the brand's feed." },
  { title: "Lab Technician",      income: 4000, blurb: "Precise work, steady hours." },
  { title: "Civil Engineer",      income: 5400, blurb: "Bridges don't build themselves." },
  { title: "Insurance Adjuster",  income: 4100, blurb: "You assess other people's bad days." },
];

// Builds the age-22 card. Taking the job costs relocation/wardrobe cash
// and raises monthly income to the new role's level.
function careerCard(job, currentIncome) {
  const gain = Math.max(0, job.income - currentIncome);
  return {
    kind: "life",
    career: job.title,
    title: `A ${job.title.toUpperCase()} OFFER LANDS`,
    body: `${job.blurb} It pays ${money(job.income * 12)}/yr — but starting costs money.`,
    options: [
      { label: `Take the job (+${money(gain * 12)}/yr)`, cash: -1200, income: gain,
        note: `You're a ${job.title.toLowerCase()} now.` },
      { label: "Take it, move somewhere cheap", cash: -2200, income: gain, expense: -150,
        note: "Longer commute, lower rent." },
      { label: "Turn it down, stay put", note: "You keep the life you know." },
    ],
  };
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

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
  { kind: "life", title: "YOU GET LAID OFF WITH NO WARNING", body: "Badge deactivated Friday. No severance.",
    options: [
      { label: "Burn savings while job hunting", cash: -4200, note: "Four months of nothing coming in." },
      { label: "Take the first job offered", income: -900, note: "A pay cut, but the bleeding stops." },
      { label: "Float it on credit cards", debt: 6500, note: "The balance grows every month." }] },
  { kind: "life", title: "YOUR LANDLORD SELLS THE BUILDING", body: "Sixty days to be out. The market is worse now.",
    options: [
      { label: "Sign the pricier lease", cash: -2400, expense: 420, note: "Same city, much higher rent." },
      { label: "Move back in with family", cash: -600, expense: -700, note: "Humbling, but you save." },
      { label: "Short-term rentals for now", cash: -3800, expense: 260, note: "Expensive and exhausting." }] },
  { kind: "life", title: "A CAR ACCIDENT - YOU'RE AT FAULT", body: "Nobody's hurt. Everything else is a problem.",
    options: [
      { label: "Pay the deductible and repairs", cash: -3600, expense: 95, note: "Premiums jump too." },
      { label: "Let it go to collections", debt: 8000, note: "This follows you for years." },
      { label: "Sell the car, go carless", cash: 1800, expense: -180, income: -400, note: "Fewer shifts you can reach." }] },
  { kind: "news", title: "INFLATION SPIKES 9% THIS YEAR", body: "Groceries, gas, rent - all of it at once.",
    source: { headline: "Consumer prices post steepest rise in decades", url: "https://example.com/inflation" },
    options: [
      { label: "Absorb it", expense: 340, note: "Everything costs more now." },
      { label: "Cut hard, cancel everything", expense: 120, note: "Lean year. Miserable, but survivable." },
      { label: "Keep your life, use credit", debt: 4200, expense: 200, note: "Papering over the gap." }] },
  { kind: "life", title: "A FAMILY EMERGENCY BACK HOME", body: "They need help and you're the one who can go.",
    options: [
      { label: "Fly out, take unpaid leave", cash: -2800, note: "Three weeks without pay." },
      { label: "Send money instead", cash: -4000, note: "You couldn't be there." },
      { label: "Take a loan to cover both", debt: 5000, note: "Interest on top of guilt." }] },
  { kind: "life", title: "YOUR CREDIT CARD RATE JUMPS TO 29%", body: "A letter you almost didn't open.",
    options: [
      { label: "Aggressively pay it down", cash: -3000, debt: -3500, note: "Painful, but it stops compounding." },
      { label: "Transfer to a new card", cash: -400, debt: 900, note: "Fee now, lower rate for a while." },
      { label: "Keep paying minimums", debt: 2200, note: "The balance wins." }] },
  { kind: "news", title: "YOUR INDUSTRY IS BEING AUTOMATED", body: "Half the postings vanished this quarter.",
    source: { headline: "Automation reshapes entry-level hiring", url: "https://example.com/automation" },
    options: [
      { label: "Retrain into a new field", cash: -5500, income: 700, note: "Expensive bet that pays off." },
      { label: "Hang on where you are", income: -350, note: "Hours cut, pay follows." },
      { label: "Take a second job", income: 500, expense: 120, note: "No free evenings anymore." }] },
  { kind: "life", title: "AN UNINSURED HOSPITAL STAY", body: "Three nights. The bill is $18,000.",
    options: [
      { label: "Negotiate and pay what you can", cash: -5000, debt: 4000, note: "They knocked some off." },
      { label: "Hardship payment plan", expense: 310, note: "Years of monthly payments." },
      { label: "Ignore it", debt: 18000, note: "Collections, credit ruined." }] },
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

/* ---------- backend: extracted news events (teammate's Xtract pipeline) ---------- */
/* GET /api/game-news -> { event: { kind, title, body, options[{label,cash,net,debt,note}],
                           source:{ sourceName, headline, evidence, url } } }
   His `net` = change to monthly leftover (negative = worse).
   Ours splits income/expense, so a negative `net` becomes a positive `expense`. */
function adaptNewsEvent(ev) {
  if (!ev || !Array.isArray(ev.options) || ev.options.length === 0) return null;
  return {
    kind: "news",
    title: ev.title || "IN THE NEWS",
    body: ev.body || "",
    source: ev.source
      ? { headline: ev.source.headline || ev.source.sourceName || "source",
          url: ev.source.url || "#",
          sourceName: ev.source.sourceName,
          evidence: ev.source.evidence }
      : undefined,
    options: ev.options.map((o) => ({
      label: o.label,
      note: o.note || "",
      cash: Number(o.cash || 0),
      debt: Number(o.debt || 0),
      expense: -Number(o.net || 0),   // net -150/mo  ->  expense +150/mo
    })),
  };
}

// Pull several distinct events; `exclude` stops the API repeating the same article.
async function fetchNewsEvents(count = 6) {
  const out = [];
  const seen = [];
  for (let i = 0; i < count; i++) {
    try {
      const qs = seen.map((u) => `exclude=${encodeURIComponent(u)}`).join("&");
      const res = await fetch(`/api/game-news${qs ? "?" + qs : ""}`);
      if (!res.ok) break;
      const data = await res.json();
      const card = adaptNewsEvent(data?.event);
      if (!card) break;
      out.push(card);
      const url = data?.event?.source?.url;
      if (url) seen.push(url); else break;
    } catch { break; }
  }
  return out;
}

/* ---------- constants ---------- */
const START_AGE = 18, END_AGE = 30, CAREER_AGE = 22;
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

/* ---------- shell (module scope: keeps identity stable so inputs keep focus) ---------- */
function Shell({ children }) {
  return (
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
}

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
  const [nameInput, setNameInput] = useState("");      // player-editable name
  const [avatarIdx, setAvatarIdx] = useState(1);       // player-picked avatar
  const [gradJob, setGradJob] = useState(null);        // the age-22 offer
  const [careerDone, setCareerDone] = useState(false); // offer already resolved?
  const [promo, setPromo] = useState(null);            // {title, from, to} after a job upgrade
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed]);

  const net = income - expense;
  const worth = cash + invest - debt;
  const showCareer = age === CAREER_AGE && !careerDone && gradJob;
  const card = showCareer ? careerCard(gradJob, income) : deck[deckPos % deck.length];

  /* --- roll a character from the backend (falls back to local) --- */
  const roll = async () => {
    setPhase("rolling");
    const c = await fetchCharacter();
    setCh(c);
    setNameInput(c.name);                              // prefill, player can edit
    setAvatarIdx(AVATARS.indexOf(c.avatar) >= 0 ? AVATARS.indexOf(c.avatar) : 1);
    setPhase("roll");
  };

  const begin = () => {
    // lock in the player's chosen name + avatar
    const chosenName = nameInput.trim() || ch.name;
    ch.name = chosenName;
    ch.avatar = AVATARS[avatarIdx];
    setAge(START_AGE);
    setCash(ch.cash); setDebt(ch.debt); setInvest(0);
    setIncome(ch.income); setExpense(ch.expense);
    setFeed([
      { t: `${ch.name.toUpperCase()}, 18, ${ch.city.toUpperCase()}`, tone: "mute" },
      { t: `OCCUPATION: ${ch.occupation.toUpperCase()}`, tone: "mute" },
    ]);
    setDeckPos(0); setPhase("decide"); setLastPick(null);
    setGradJob(pick(GRAD_JOBS)); setCareerDone(false);
    setDeck(shuffle(DECK));                       // playable immediately
    fetchNewsEvents(6).then((news) => {           // then fold in real extracted events
      if (news.length) {
        setDeck((d) => shuffle([...news, ...d]));
        setLive(true);
      }
    });
  };

  const choose = (opt) => {
    if (card.career) {
      setCareerDone(true);
      if (opt.income) {
        ch.occupation = card.career;                 // new job title in the HUD
        setPromo({ title: card.career, from: income, to: income + opt.income });
      } else {
        setPromo(null);
      }
    }
    if (opt.cash) { setCash((v) => v + opt.cash); setFlash(opt.cash > 0 ? "gain" : "loss"); }
    if (opt.debt) setDebt((v) => Math.max(0, v + opt.debt));
    if (opt.invest) setInvest((v) => Math.max(0, v + opt.invest));
    if (opt.income) setIncome((v) => v + opt.income);
    if (opt.expense) setExpense((v) => Math.max(0, v + opt.expense));
    setFeed((f) => {
      const lines = [
        { t: card.title, tone: "title" },
        { t: `> ${opt.label.toUpperCase()} - ${opt.note}`, tone: "you", cash: opt.cash },
      ];
      if (card.career && opt.income) {
        lines.push({ t: `NEW JOB: ${card.career.toUpperCase()} - ${money((income + opt.income) * 12)}/YR`, tone: "good" });
      }
      return [...f, ...lines];
    });
    setLastPick(opt); setPhase("resolved");
    setTimeout(() => setFlash(null), 600);
  };

  const ageUp = () => {
    const wasCareerTurn = !!card.career;
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
    // the career card replaces a turn rather than consuming a scenario
    if (!wasCareerTurn) setDeckPos((p) => p + 1);
    setPhase("decide"); setLastPick(null); setPromo(null);
  };

  const restart = () => { setPhase("title"); setCh(null); setFeed([]); };

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
          <PixelAvatar size={76} colors={AVATARS[avatarIdx]} />
          <div>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value.slice(0, 18))}
              placeholder="your name"
              className="mono"
              style={{ width: 150, padding: "7px 9px", fontSize: 13, fontWeight: 700,
                color: C.ink, background: C.paper, border: `3px solid ${C.ink}`,
                boxShadow: `3px 3px 0 ${C.ink}`, outline: "none" }}
            />
            <div className="mono" style={{ fontSize: 12, color: "#9aa0c0", marginTop: 7 }}>Age 18 · {ch.city}</div>
            {ch.fromDB && (
              <div className="mono" style={{ fontSize: 9.5, color: C.gain, marginTop: 5, letterSpacing: 0.5 }}>
                ◆ SNOWFLAKE #{ch.playerId}
              </div>
            )}
          </div>
        </div>

        {/* avatar picker */}
        <div>
          <div className="mono" style={{ fontSize: 10, color: "#8a91ad", letterSpacing: 1, marginBottom: 7, textAlign: "center" }}>
            PICK YOUR LOOK
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {AVATARS.map((a, i) => (
              <div key={i} onClick={() => setAvatarIdx(i)}
                style={{ cursor: "pointer", padding: 2,
                  border: `3px solid ${i === avatarIdx ? C.gold : "#3a3d5e"}`,
                  background: C.ink }}>
                <PixelAvatar size={34} colors={a} />
              </div>
            ))}
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
          <Stat label="INCOME/YR" value={money(ch.income * 12)} color={C.gain} />
          <Stat label="COSTS/YR" value={money(ch.expense * 12)} color={C.loss} />
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
          <Row label="PER YEAR" value={`${net >= 0 ? "+" : ""}${money(net * 12)}`} color={net >= 0 ? C.gain : C.loss} />
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
              {card.career && (
                <div className="pix" style={{ display: "inline-block", fontSize: 8, color: C.ink,
                  background: C.gold, border: `3px solid ${C.ink}`, padding: "4px 6px", marginBottom: 10 }}>
                  ★ CAREER MOVE · AGE 22
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
                <div style={{ marginTop: 11 }}>
                  {card.source.sourceName && (
                    <div className="mono" style={{ fontSize: 9.5, color: C.mute, letterSpacing: 1 }}>
                      EXTRACTED FROM {card.source.sourceName.toUpperCase()}
                    </div>
                  )}
                  <a href={card.source.url} target="_blank" rel="noreferrer" className="mono"
                    style={{ display: "block", marginTop: 4, fontSize: 11, color: C.blue, textDecoration: "none" }}>
                    ⧉ {card.source.headline}
                  </a>
                </div>
              )}
            </div>
          )}

          {phase === "resolved" && promo && (
            <div>
              <div className="pix" style={{ fontSize: 9, color: C.goldDk, marginBottom: 9, textAlign: "center" }}>
                ★ NEW JOB ★
              </div>

              <div style={{ border: `3px solid ${C.ink}`, background: C.gold, padding: "12px 10px", textAlign: "center" }}>
                <div className="mono" style={{ fontSize: 10, color: "#6b5312", letterSpacing: 1 }}>YOU ARE NOW A</div>
                <div className="pix" style={{ fontSize: 12, color: C.ink, marginTop: 8, lineHeight: 1.5 }}>
                  {promo.title.toUpperCase()}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11 }}>
                <div style={{ flex: 1, border: `3px solid ${C.ink}`, background: C.cream2, padding: "8px 9px", textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: 9.5, color: C.mute, letterSpacing: 1 }}>WAS</div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: C.mute, marginTop: 3 }}>
                    {money(promo.from * 12)}/yr
                  </div>
                </div>
                <div className="pix" style={{ fontSize: 12, color: C.gain }}>▶</div>
                <div style={{ flex: 1, border: `3px solid ${C.ink}`, background: C.paper, padding: "8px 9px", textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: 9.5, color: C.mute, letterSpacing: 1 }}>NOW</div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: C.gain, marginTop: 3 }}>
                    {money(promo.to * 12)}/yr
                  </div>
                </div>
              </div>

              <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: C.gain, textAlign: "center", marginTop: 9 }}>
                +{money((promo.to - promo.from) * 12)}/yr raise
              </div>
              <div className="mono" style={{ fontSize: 11.5, color: C.mute, textAlign: "center", margin: "8px 0 10px" }}>
                This year nets <b style={{ color: net >= 0 ? C.gain : C.loss }}>{money(net * 12)}</b>
              </div>

              <button onClick={ageUp} className="bigbtn pix"
                style={{ width: "100%", padding: 15, background: C.gold, color: C.ink, fontSize: 11 }}>
                AGE UP TO {age + 1} ►
              </button>
            </div>
          )}

          {phase === "resolved" && !promo && lastPick && (
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