type GameHeaderProps = {
  age?: number;
  progress?: number;
  xtract?: number;
};

export default function GameHeader({
  age = 27,
  progress = 68,
  xtract = 3,
}: GameHeaderProps) {
  return (
    <header className="game-header">
      <a className="wordmark" href="/">
        BROKE <i>BY</i> 30
      </a>

      <div className="age-track" aria-label="Age progress">
        <span>AGE {age}</span>
        <div>
          <b style={{ width: `${Math.max(progress, 8)}%` }} />
        </div>
        <span>30</span>
      </div>

      <span className="xtract-count">
        XTRACT <b>{xtract}</b>
      </span>
    </header>
  );
}
