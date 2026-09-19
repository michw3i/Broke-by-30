"use client";

import { useState } from "react";

type Stats = { savings: number; debt: number; credit: number; monthly: number };
type Choice = { label: string; detail: string; effect: string; apply: (stats: Stats) => Stats };

const events = [
	{ category: "HOME", title: "Your first apartment", prompt: "You got the job. Now you need somewhere to put your stuff.", choices: [
		{ label: "Take the sunny one", detail: "$1,450 / month · 1 month deposit", effect: "More space, less breathing room.", apply: (s: Stats) => ({ ...s, savings: s.savings - 1450, monthly: s.monthly - 1450 }) },
		{ label: "Find a roommate", detail: "$850 / month · split utilities", effect: "A little less privacy. A lot more runway.", apply: (s: Stats) => ({ ...s, savings: s.savings - 850, monthly: s.monthly - 850 }) },
		{ label: "Stay with family", detail: "$300 / month · contribute at home", effect: "Not glamorous, but your future self approves.", apply: (s: Stats) => ({ ...s, savings: s.savings + 300, monthly: s.monthly - 300 }) },
	] satisfies Choice[] },
	{ category: "CREDIT", title: "An offer in the mail", prompt: "A credit card promises 3% cash back. The APR is 28.99%.", choices: [
		{ label: "Open it and pay in full", detail: "$0 balance · builds credit", effect: "Convenience without the interest.", apply: (s: Stats) => ({ ...s, credit: s.credit + 16 }) },
		{ label: "Use it for a $600 splurge", detail: "$600 balance · minimum payment $25", effect: "The purchase is instant. The interest is patient.", apply: (s: Stats) => ({ ...s, debt: s.debt + 600, credit: s.credit - 8, monthly: s.monthly - 25 }) },
		{ label: "Decline for now", detail: "No new account", effect: "You keep the option value and your peace of mind.", apply: (s: Stats) => s },
	] satisfies Choice[] },
	{ category: "LIFE", title: "The car finally gives up", prompt: "Your commute is 45 minutes. Your car is making a sound that costs money.", choices: [
		{ label: "Repair it", detail: "$1,200 today", effect: "Painful now, cheaper than a new loan.", apply: (s: Stats) => ({ ...s, savings: s.savings - 1200 }) },
		{ label: "Finance a newer car", detail: "$390 / month · 60 months", effect: "Reliable wheels, a long tail of payments.", apply: (s: Stats) => ({ ...s, debt: s.debt + 18000, monthly: s.monthly - 390, credit: s.credit + 4 }) },
		{ label: "Take the bus", detail: "$90 / month pass", effect: "Longer commute, dramatically shorter bill.", apply: (s: Stats) => ({ ...s, monthly: s.monthly - 90 }) },
	] satisfies Choice[] },
];

const money = (value: number) => `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString()}`;

export default function GamePage() {
	const [age, setAge] = useState(22);
	const [eventIndex, setEventIndex] = useState(0);
	const [stats, setStats] = useState<Stats>({ savings: 4200, debt: 0, credit: 612, monthly: 3200 });
	const [lastChoice, setLastChoice] = useState("");
	const event = events[eventIndex];
	const progress = ((age - 22) / 8) * 100;

	function choose(choice: Choice) {
		setStats(choice.apply(stats));
		setLastChoice(choice.effect);
	}

	function continueLife() {
		setLastChoice("");
		if (eventIndex < events.length - 1) setEventIndex(eventIndex + 1);
		else { setAge(Math.min(age + 1, 30)); setEventIndex(0); }
	}

	return (
		<main className="game-shell">
			<header className="game-header"><a className="wordmark" href="/">BROKE <i>BY</i> 30</a><div className="age-track"><span>AGE {age}</span><div><b style={{ width: `${Math.max(progress, 8)}%` }} /></div><span>30</span></div><span className="xtract-count">XTRACT <b>3</b></span></header>
			<div className="game-layout">
				<aside className="stats-panel"><p className="eyebrow">Your financial life</p><h2>Age {age}</h2><div className="money-total"><span>Cash on hand</span><strong>{money(stats.savings)}</strong></div><div className="stat-line"><span>Monthly income</span><strong>{money(stats.monthly)}</strong></div><div className="stat-line"><span>Total debt</span><strong>{money(stats.debt)}</strong></div><div className="stat-line"><span>Credit score</span><strong>{stats.credit}</strong></div><div className="score-meter"><span style={{ width: `${Math.min(Math.max((stats.credit - 300) / 550 * 100, 0), 100)}%` }} /></div><p className="side-note">Your decisions compound. Check back here before you commit.</p></aside>
				<section className="event-panel"><div className="event-kicker"><span>{event.category}</span><span>DECISION {eventIndex + 1} OF {events.length}</span></div><h1>{event.title}</h1><p className="event-prompt">{event.prompt}</p>{!lastChoice ? <div className="choice-list">{event.choices.map((choice) => <button className="choice" key={choice.label} onClick={() => choose(choice)}><span><strong>{choice.label}</strong><small>{choice.detail}</small></span><b>-&gt;</b></button>)}</div> : <div className="consequence"><p className="eyebrow">Decision recorded</p><h2>{lastChoice}</h2><p>That choice will stay with this life. There is no undo, but there is always another year.</p><button className="primary-button" onClick={continueLife}>{eventIndex === events.length - 1 ? `Continue to age ${age + 1}` : "See what happens next"} <span>-&gt;</span></button></div>}<p className="document-hint">Some decisions come with documents. Read the terms, or spend an Xtract token to surface what matters.</p></section>
			</div>
		</main>
	);
}
