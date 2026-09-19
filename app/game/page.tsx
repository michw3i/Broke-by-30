"use client";

import { useEffect, useRef, useState } from "react";
import type { GameCard, GameOption } from "@/types/game";

type FeedEntry = {
  t: string;
  tone: "mute" | "title" | "you" | "source";
  cash?: number;
  debt?: number;
  url?: string;
};

const C = {
  bg: "#12132b",
  device: "#23243f",
  paper: "#f5efe0",
  ink: "#14162e",
  gold: "#ffc542",
  gain: "#35b34a",
  loss: "#e0453e",
  blue: "#3d7bd6",
  mute: "#6b6f88",
  cream2: "#e9e1cd",
};

const START = {
  age: 18,
  cash: 1200,
  net: 500,
  debt: 0,
};

const END_AGE = 30;

const money = (n: number) =>
  `${n < 0 ? "-$" : "$"}${Math.abs(Math.round(n)).toLocaleString()}`;

const DECK: GameCard[] = [
  {
    kind: "life",
    title: "YOUR CAR NEEDS $1,800 IN REPAIRS",
    body: "The check-engine light finally meant something.",
    options: [
      {
        label: "Pay in cash",
        cash: -1800,
        net: 0,
        debt: 0,
        note: "Ouch, but it is done.",
      },
      {
        label: "Put it on a card",
        cash: -200,
        net: -55,
        debt: 1600,
        note: "Minimums for a while.",
      },
      {
        label: "Take the bus",
        cash: 0,
        net: -120,
        debt: 0,
        note: "You are late to work a lot.",
      },
    ],
  },

  {
    kind: "life",
    title: "FRIENDS WANT YOU IN VEGAS",
    body: "Flights, hotel, the whole thing.",
    options: [
      {
        label: "Go all out",
        cash: -900,
        net: 0,
        debt: 0,
        note: "Worth it? Debatable.",
      },
      {
        label: "Go, but budget",
        cash: -250,
        net: 0,
        debt: 0,
        note: "Fun without the bill.",
      },
      {
        label: "Sit this one out",
        cash: 0,
        net: 0,
        debt: 0,
        note: "FOMO, but solvent.",
      },
    ],
  },

  {
    kind: "life",
    title: "A RAISE - IF YOU RELOCATE",
    body: "Same company, new city, more money.",
    options: [
      {
        label: "Take it",
        cash: -2000,
        net: 430,
        debt: 0,
        note: "Big move, bigger paycheck.",
      },
      {
        label: "Stay put",
        cash: 0,
        net: 0,
        debt: 0,
        note: "Roots over raise.",
      },
    ],
  },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

* {
  box-sizing: border-box;
}

.pix {
  font-family: 'Press Start 2P', monospace;
}

.mono {
  font-family: 'DejaVu Sans Mono', 'Courier New', monospace;
}

.panel {
  border: 4px solid ${C.ink};
  box-shadow: 6px 6px 0 ${C.ink};
}

.opt {
  border: 3px solid ${C.ink};
  box-shadow: 4px 4px 0 ${C.ink};
  background: ${C.paper};
  cursor: pointer;
}

.opt:hover {
  background: ${C.cream2};
}

.opt:active,
.bigbtn:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

.bigbtn {
  border: 4px solid ${C.ink};
  box-shadow: 5px 5px 0 ${C.ink};
  cursor: pointer;
}

.scan {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.06) 0 2px,
    transparent 2px 4px
  );
}

.feed::-webkit-scrollbar {
  width: 8px;
}

.feed::-webkit-scrollbar-thumb {
  background: ${C.mute};
}
`;

export default function BrokeBy30() {
  const [age, setAge] = useState(START.age);
  const [cash, setCash] = useState(START.cash);
  const [net, setNet] = useState(START.net);
  const [debt, setDebt] = useState(START.debt);

  const [feed, setFeed] = useState<FeedEntry[]>([
    {
      t: `YOU'RE 18 WITH ${money(START.cash)}.`,
      tone: "mute",
    },
  ]);

  const [phase, setPhase] =
    useState<"decide" | "resolved" | "over">("decide");

  const [eventIndex, setEventIndex] = useState(0);

  const [newsCard, setNewsCard] =
    useState<GameCard | null>(null);

  const [newsState, setNewsState] =
    useState<"idle" | "scanning" | "extracting">("idle");

  const [flash, setFlash] =
    useState<"gain" | "loss" | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);

  const newsRequestRef = useRef(false);

  /*
   * IMPORTANT:
   * Keep track of source URLs already shown during this playthrough.
   */
  const usedNewsUrls = useRef<string[]>([]);

  /*
   * Every third game event is automatically powered by Xtract.
   */
  const isNewsTurn =
    eventIndex > 0 && eventIndex % 3 === 2;

  const card =
    newsCard ?? DECK[eventIndex % DECK.length];

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop =
        feedRef.current.scrollHeight;
    }
  }, [feed]);

  useEffect(() => {
    if (
      !isNewsTurn ||
      phase !== "decide" ||
      newsRequestRef.current
    ) {
      return;
    }

    let active = true;

    newsRequestRef.current = true;

    const controller = new AbortController();

    const timeoutMs = 10000;

    setNewsState("scanning");

    console.log("[XTRACT] scanning public news");

    const stageTimer = window.setTimeout(() => {
      if (active) {
        setNewsState("extracting");

        console.log("[XTRACT] extracting signal");
      }
    }, 650);

    const requestTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        console.warn(
          "[XTRACT] client timeout reached"
        );

        controller.abort();
      }
    }, timeoutMs);

    async function loadNewsEvent() {
      try {
        /*
         * Tell the API which sources have already appeared.
         */
        const params = new URLSearchParams();

        for (const url of usedNewsUrls.current.slice(-10)) {
          params.append("exclude", url);
        }

        const requestUrl =
          params.toString().length > 0
            ? `/api/game-news?${params.toString()}`
            : "/api/game-news";

        const response = await fetch(requestUrl, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `game-news returned ${response.status}`
          );
        }

        const body = (await response.json()) as {
          event?: GameCard;
          error?: string;
          mode?: string;
        };

        if (!active) {
          return;
        }

        if (!body.event) {
          throw new Error(
            body.error ?? "No event was returned"
          );
        }

        /*
         * Remember this source so the next news event can avoid it.
         */
        if (body.event.source?.url) {
          usedNewsUrls.current.push(
            body.event.source.url
          );
        }

        console.log(
          "[XTRACT] new event:",
          body.event.title
        );

        console.log(
          "[XTRACT] article:",
          body.event.source?.headline
        );

        console.log(
          "[XTRACT] source:",
          body.event.source?.sourceName
        );

        console.log(
          "[XTRACT] mode:",
          body.mode ??
            body.event.source?.sourceKind
        );

        setNewsCard(body.event);

        setNewsState("idle");
      } catch (error) {
        if (!active) {
          return;
        }

        console.error(
          "[XTRACT] automatic news event failed:",
          error
        );

        /*
         * If the whole API route somehow fails,
         * reset this request so another attempt is possible.
         *
         * Normally route.ts itself provides a fallback,
         * so this should rarely happen.
         */
        newsRequestRef.current = false;

        setNewsState("idle");

        setFeed((items) => [
          ...items,
          {
            t: "XTRACT COULD NOT LOAD NEWS - RETRYING.",
            tone: "mute",
          },
        ]);
      } finally {
        window.clearTimeout(stageTimer);
        window.clearTimeout(requestTimer);
      }
    }

    void loadNewsEvent();

    return () => {
      active = false;

      controller.abort();

      window.clearTimeout(stageTimer);
      window.clearTimeout(requestTimer);
    };
  }, [isNewsTurn, phase]);

  const choose = (option: GameOption) => {
    setCash((value) => value + option.cash);

    setNet((value) => value + option.net);

    setDebt((value) =>
      Math.max(0, value + option.debt)
    );

    if (option.cash) {
      setFlash(
        option.cash > 0 ? "gain" : "loss"
      );
    }

    const entries: FeedEntry[] = [
      {
        t: card.title,
        tone: "title",
      },
      {
        t: `> ${option.label.toUpperCase()} - ${option.note}`,
        tone: "you",
        cash: option.cash,
        debt: option.debt,
      },
    ];

    if (
      card.kind === "news" &&
      card.source
    ) {
      entries.push({
        t: `XTRACT SOURCE: ${
          card.source.sourceName ??
          card.source.headline
        }`,
        tone: "source",
        url: card.source.url,
      });
    }

    setFeed((items) => [
      ...items,
      ...entries,
    ]);

    setPhase("resolved");

    window.setTimeout(() => {
      setFlash(null);
    }, 600);
  };

  const ageUp = () => {
    const settled =
      cash + net * 12;

    const nextAge =
      age + 1;

    setCash(settled);
    setAge(nextAge);

    setFeed((items) => [
      ...items,
      {
        t: `+1 YEAR → AGE ${nextAge}. ${money(
          net * 12
        )} BANKED.`,
        tone: "mute",
      },
    ]);

    if (nextAge >= END_AGE) {
      setPhase("over");
      return;
    }

    setEventIndex(
      (value) => value + 1
    );

    setNewsCard(null);

    newsRequestRef.current = false;

    setNewsState("idle");

    setPhase("decide");
  };

  const restart = () => {
    setAge(START.age);
    setCash(START.cash);
    setNet(START.net);
    setDebt(START.debt);

    setFeed([
      {
        t: `YOU'RE 18 WITH ${money(
          START.cash
        )}.`,
        tone: "mute",
      },
    ]);

    setEventIndex(0);

    setNewsCard(null);

    newsRequestRef.current = false;

    /*
     * A completely new playthrough can use sources again.
     */
    usedNewsUrls.current = [];

    setNewsState("idle");

    setPhase("decide");
  };

  const yearsLeft =
    END_AGE - age;

  const filled =
    age - START.age;

  const totalSeg =
    END_AGE - START.age;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        justifyContent: "center",
        padding: "24px 12px",
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 6px)",
      }}
    >
      <style>{CSS}</style>

      <div
        className="panel"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          background: C.device,
          display: "flex",
          flexDirection: "column",
          height:
            "min(770px, calc(100vh - 48px))",
          padding: 10,
        }}
      >
        <div className="scan" />

        <header
          style={{
            background: C.device,
            padding: "6px 8px 12px",
            color: C.paper,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span
              className="pix"
              style={{
                fontSize: 11,
                color: C.gold,
              }}
            >
              BROKE BY 30
            </span>

            <span
              className="pix"
              style={{ fontSize: 8 }}
            >
              AGE {age} · {yearsLeft} LEFT
            </span>
          </div>

          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "#9aa0c0",
              marginTop: 14,
            }}
          >
            MO · CASH
          </div>

          <div
            className="pix"
            style={{
              fontSize: 28,
              color:
                flash === "loss"
                  ? C.loss
                  : flash === "gain"
                  ? C.gain
                  : C.gold,
            }}
          >
            {money(cash)}
          </div>

          <div
            className="mono"
            style={{
              fontSize: 12,
              marginTop: 8,
              color:
                net >= 0
                  ? C.gain
                  : C.loss,
            }}
          >
            {net >= 0 ? "▲" : "▼"}{" "}
            {money(net)}/mo after expenses ·
            DEBT {money(debt)}
          </div>

          <div
            style={{
              display: "flex",
              gap: 2,
              marginTop: 12,
            }}
          >
            {Array.from({
              length: totalSeg,
            }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 10,
                  border: `2px solid ${C.ink}`,
                  background:
                    i < filled
                      ? C.gold
                      : "#3a3b58",
                }}
              />
            ))}
          </div>
        </header>

        <div
          ref={feedRef}
          className="feed panel"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 12,
            background: C.paper,
            marginBottom: 10,
          }}
        >
          {feed.map((entry, i) => (
            <FeedLine
              key={i}
              entry={entry}
            />
          ))}
        </div>

        <section
          style={{
            background: C.paper,
          }}
          className="panel"
        >
          <div style={{ padding: 12 }}>
            {phase === "decide" &&
              (isNewsTurn &&
              !newsCard ? (
                <LoadingNews
                  stage={newsState}
                />
              ) : (
                <EventCard
                  card={card}
                  onChoose={choose}
                />
              ))}

            {phase === "resolved" && (
              <button
                onClick={ageUp}
                className="bigbtn pix"
                style={{
                  width: "100%",
                  padding: 16,
                  background: C.gold,
                  color: C.ink,
                  fontSize: 12,
                }}
              >
                AGE UP 1 YEAR ▶
              </button>
            )}

            {phase === "over" && (
              <div
                style={{
                  textAlign: "center",
                  padding: "6px 0",
                }}
              >
                <div
                  className="pix"
                  style={{
                    fontSize: 15,
                    color:
                      cash > 0
                        ? C.gain
                        : C.loss,
                  }}
                >
                  {cash > 0
                    ? "YOU MADE IT!"
                    : "BROKE BY 30"}
                </div>

                <div
                  className="mono"
                  style={{
                    fontSize: 13,
                    color: C.mute,
                    marginTop: 10,
                  }}
                >
                  FINAL CASH: {money(cash)}
                </div>

                <button
                  onClick={restart}
                  className="bigbtn pix"
                  style={{
                    marginTop: 14,
                    padding: "12px 18px",
                    background: C.gold,
                    color: C.ink,
                    fontSize: 10,
                  }}
                >
                  ↺ PLAY AGAIN
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function LoadingNews({
  stage,
}: {
  stage:
    | "idle"
    | "scanning"
    | "extracting";
}) {
  return (
    <div
      className="pix"
      style={{
        padding: "25px 4px",
        fontSize: 10,
        lineHeight: 1.8,
        color: C.blue,
      }}
    >
      {stage === "extracting"
        ? "XTRACTING SIGNAL..."
        : "SCANNING THE NEWS..."}
    </div>
  );
}

function EventCard({
  card,
  onChoose,
}: {
  card: GameCard;
  onChoose: (
    option: GameOption
  ) => void;
}) {
  return (
    <div>
      {card.kind === "news" && (
        <div
          className="pix"
          style={{
            display: "inline-block",
            fontSize: 8,
            color: C.paper,
            background: C.blue,
            border: `3px solid ${C.ink}`,
            padding: "4px 6px",
            marginBottom: 10,
          }}
        >
          ★ IN THE NEWS · XTRACT
        </div>
      )}

      <div
        className="mono"
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.ink,
          lineHeight: 1.35,
        }}
      >
        {card.title}
      </div>

      <div
        className="mono"
        style={{
          fontSize: 13,
          color: C.mute,
          marginTop: 6,
          lineHeight: 1.4,
        }}
      >
        {card.body}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 14,
        }}
      >
        {card.options.map(
          (option, i) => (
            <button
              key={i}
              onClick={() =>
                onChoose(option)
              }
              className="opt mono"
              style={{
                textAlign: "left",
                padding: "11px 12px",
                fontSize: 14,
                fontWeight: 700,
                color: C.ink,
              }}
            >
              ▸ {option.label}
            </button>
          )
        )}
      </div>

      <SourceDetails card={card} />
    </div>
  );
}

function SourceDetails({
  card,
}: {
  card: GameCard;
}) {
  if (
    card.kind !== "news" ||
    !card.source
  ) {
    return null;
  }

  return (
    <details
      className="mono"
      style={{
        marginTop: 12,
        fontSize: 11,
        color: C.blue,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
        }}
      >
        SOURCE:{" "}
        {card.source.sourceName ??
          card.source.headline}
      </summary>

      <div
        style={{
          marginTop: 7,
          color: C.mute,
          lineHeight: 1.45,
        }}
      >
        {card.source.evidence && (
          <p style={{ margin: "0 0 6px" }}>
            EVIDENCE:{" "}
            {card.source.evidence}
          </p>
        )}

        <p style={{ margin: "0 0 6px" }}>
          HEADLINE:{" "}
          {card.source.headline}
        </p>

        <p style={{ margin: "0 0 6px" }}>
          {card.source.sourceKind ===
          "live"
            ? "LIVE PUBLIC SOURCE"
            : "CACHED PUBLIC DEMO SOURCE"}{" "}
          ·{" "}
          {card.source
            .extractionMode === "ai"
            ? "AI EXTRACTION"
            : "LOCAL XTRACT EXTRACTION"}
        </p>

        <p style={{ margin: "0 0 6px" }}>
          Scenario amounts are simulated
          for gameplay. The real source
          provides the financial signal.
        </p>

        <a
          href={card.source.url}
          target="_blank"
          rel="noreferrer"
          style={{ color: C.blue }}
        >
          VIEW ORIGINAL SOURCE ↗
        </a>
      </div>
    </details>
  );
}

function FeedLine({
  entry,
}: {
  entry: FeedEntry;
}) {
  if (entry.tone === "title") {
    return (
      <div
        className="mono"
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.ink,
          marginTop: 12,
        }}
      >
        {entry.t}
      </div>
    );
  }

  if (entry.tone === "you") {
    return (
      <div
        className="mono"
        style={{
          marginTop: 4,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            color: C.mute,
            lineHeight: 1.4,
          }}
        >
          {entry.t}
        </div>

        {!!entry.cash && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color:
                entry.cash < 0
                  ? C.loss
                  : C.gain,
            }}
          >
            {money(entry.cash)}
          </span>
        )}

        {!!entry.debt && (
          <span
            style={{
              display: "block",
              fontSize: 11,
              color: C.loss,
            }}
          >
            DEBT +{money(entry.debt)}
          </span>
        )}
      </div>
    );
  }

  if (entry.tone === "source") {
    return (
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: C.blue,
          margin: "5px 0 12px",
        }}
      >
        {entry.url ? (
          <a
            href={entry.url}
            target="_blank"
            rel="noreferrer"
            style={{ color: C.blue }}
          >
            {entry.t} ↗
          </a>
        ) : (
          entry.t
        )}
      </div>
    );
  }

  return (
    <div
      className="mono"
      style={{
        fontSize: 11,
        color: "#8a8570",
        margin: "10px 0",
        textAlign: "center",
      }}
    >
      - {entry.t} -
    </div>
  );
}