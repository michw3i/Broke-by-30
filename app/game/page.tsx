"use client";

import { useState } from "react";

export default function GamePage() {
  const [selected, setSelected] = useState("");
  return (
    <main className="game-shell">
      <header className="game-header"><a className="wordmark" href="/">BROKE <i>BY</i> 30</a><span>AGE 22 / 30</span></header>
      <section className="event-panel"><p className="eyebrow">Your first decision</p><h1>Your first apartment</h1><p className="event-prompt">You got the job. Now you need somewhere to put your stuff.</p>
        {selected ? <div className="consequence"><p className="eyebrow">Decision recorded</p><h2>{selected}</h2><a className="primary-button" href="/">Back to home <span>-&gt;</span></a></div> : <div className="choice-list">{["Take the sunny one - $1,450 / month", "Find a roommate - $850 / month", "Stay with family - $300 / month"].map((choice) => <button className="choice" key={choice} onClick={() => setSelected(choice)}>{choice}<b>-&gt;</b></button>)}</div>}
      </section>
    </main>
  );
}
