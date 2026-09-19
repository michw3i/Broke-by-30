import GameHeader from "@/components/GameHeader";
import BottomNav from "@/components/BottomNav";

const money = (value: number) => `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString()}`;

const budgetRows = [
  { label: "Rent", amount: -1950, note: "studio in Queens" },
  { label: "Groceries", amount: -420, note: "real food, not just snacks" },
  { label: "Transit", amount: -140, note: "commute, not convenience" },
  { label: "Insurance", amount: -300, note: "medical + renters" },
  { label: "Side income", amount: 650, note: "freelance design" },
];

const obligations = [
  { label: "Emergency fund", value: "$11,200" },
  { label: "Credit card", value: "$1,740" },
  { label: "Student loan", value: "$18,400" },
  { label: "Monthly burn", value: "$2,160" },
];

export default function MoneyPage() {
  return (
    <main className="game-shell">
      <GameHeader age={27} progress={72} xtract={3} />

      <div className="game-layout">
        <aside className="stats-panel">
          <p className="eyebrow">Your financial life</p>
          <h2>Age 27</h2>

          <div className="money-total">
            <span>Cash on hand</span>
            <strong>{money(11520)}</strong>
          </div>

          <div className="stat-line">
            <span>Monthly income</span>
            <strong>{money(4850)}</strong>
          </div>

          <div className="stat-line">
            <span>Total debt</span>
            <strong>{money(20540)}</strong>
          </div>

          <div className="stat-line">
            <span>Credit score</span>
            <strong>688</strong>
          </div>

          <div className="score-meter">
            <span style={{ width: "68%" }} />
          </div>

          <p className="side-note">
            Your runway is steady. The next few years are about deciding what you want to keep and what you can afford to outgrow.
          </p>
        </aside>

        <section className="event-panel money-panel">
          <div className="event-kicker">
            <span>MONEY</span>
            <span>MONTHLY CHECK-IN</span>
          </div>

          <h1>Keep the runway alive.</h1>
          <p className="event-prompt">
            You’re earning more than before, but the bills still arrive before the feelings do.
          </p>

          <div className="money-grid">
            <article className="money-card accent">
              <span>Net monthly cash flow</span>
              <strong>{money(1240)}</strong>
              <small>After essentials and debt minimums</small>
            </article>

            <article className="money-card">
              <span>Savings rate</span>
              <strong>26%</strong>
              <small>On target for a future down payment</small>
            </article>

            <article className="money-card">
              <span>Fixed costs</span>
              <strong>{money(2860)}</strong>
              <small>Housing, food, insurance, transport</small>
            </article>
          </div>

          <div className="budget-panel">
            <div className="budget-header">
              <p className="eyebrow">This month</p>
              <span>{money(1240)}</span>
            </div>

            <div className="budget-list">
              {budgetRows.map((row) => (
                <div key={row.label} className="budget-row">
                  <div>
                    <strong>{row.label}</strong>
                    <small>{row.note}</small>
                  </div>
                  <span className={row.amount < 0 ? "is-negative" : "is-positive"}>
                    {money(row.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="obligations-panel">
            <p className="eyebrow">Accounts to watch</p>
            <div className="obligation-list">
              {obligations.map((item) => (
                <div key={item.label} className="obligation-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <button className="primary-button" type="button">
            Review next move <span>-&gt;</span>
          </button>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
