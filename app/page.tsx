export default function Home() {
  return (
    <main className="home-shell">
      <nav className="site-nav">
        <span className="wordmark">BROKE <i>BY</i> 30</span>
        <span className="nav-note">A financial life simulator</span>
      </nav>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Your twenties, on paper</p>
          <h1>Make it to 30<br /><em>without going broke.</em></h1>
          <p className="hero-description">Every paycheck is a choice. Every choice follows you. Build a life, read the fine print, and find out what your future costs.</p>
          <a className="primary-button" href="/game">Start at age 22 <span>-&gt;</span></a>
          <p className="microcopy">No right answers. Just consequences.</p>
        </div>
        <div className="hero-stats" aria-label="Game overview">
          <div><strong>8</strong><span>years to play</span></div>
          <div><strong>40+</strong><span>life decisions</span></div>
          <div><strong>1</strong><span>financial life</span></div>
        </div>
      </section>
      <section className="home-footer"><p><span className="signal-dot" /> New game: your first apartment is waiting.</p><p className="footer-rule">Learn by living it.</p></section>
    </main>
  );
}
