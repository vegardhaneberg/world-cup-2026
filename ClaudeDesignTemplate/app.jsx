/* global React, ReactDOM, VMDATA, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, TweakRadio */
const { useState, useEffect, useRef } = React;

/* ---------- små ikoner (kun enkle former) ---------- */
function BallCrest() {
  // klassisk ball: hvit sirkel med ett mørkt panel (én pentagon)
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r="13"
        fill="#fdf3e7"
        stroke="#20283f"
        strokeWidth="2"
      />
      <polygon
        points="16,9 22,13.4 19.7,20.5 12.3,20.5 10,13.4"
        fill="#20283f"
      />
    </svg>
  );
}
function IconCoupon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="14" y2="13" />
    </svg>
  );
}
function IconTable() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <rect x="3.5" y="11" width="4.5" height="9" />
      <rect x="9.8" y="6" width="4.5" height="14" />
      <rect x="16" y="14" width="4.5" height="6" />
    </svg>
  );
}

/* ---------- lagdisk ---------- */
function Disc({ team }) {
  return (
    <span className="disc" style={{ background: team.disc, color: team.fg }}>
      {team.code}
    </span>
  );
}

/* ---------- H/U/B-velger ---------- */
function Picker({ match, value, onPick }) {
  const opts = [
    { k: "H", lbl: "Hjemme" },
    { k: "U", lbl: "Uavgjort" },
    { k: "B", lbl: "Borte" },
  ];
  const maxPts = Math.max(match.points.H, match.points.U, match.points.B);
  return (
    <div className="picker">
      {opts.map((o) => {
        const pts = match.points[o.k];
        const hard = pts === maxPts && pts >= 6;
        return (
          <button
            key={o.k}
            className={"pick" + (hard ? " hard" : "")}
            aria-pressed={value === o.k}
            onClick={() => onPick(match.id, o.k)}
          >
            <span className="k">{o.k}</span>
            <span className="lbl">{o.lbl}</span>
            <span className="pt">{pts} p</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- kampkort ---------- */
function MatchCard({ match, value, onPick }) {
  const close = Math.min(match.odds.H, match.odds.B) >= 2.4;
  return (
    <div className="match">
      <div className="match-top">
        <span className="grp">Gruppe {match.group}</span>
        {close && <span className="hardflag">Jevn kamp</span>}
        <span className="ko">
          <b>{match.time}</b> · {match.city}
        </span>
      </div>
      <div className="fixture">
        <div className="team home">
          <Disc team={match.home} />
          <div>
            <div className="nm">{match.home.name}</div>
            <div className="meta">{match.stadium}</div>
          </div>
        </div>
        <span className="vs">VS</span>
        <div className="team away">
          <Disc team={match.away} />
          <div>
            <div className="nm">{match.away.name}</div>
            <div className="meta">Avspark {match.time}</div>
          </div>
        </div>
      </div>
      <Picker match={match} value={value} onPick={onPick} />
    </div>
  );
}

/* ---------- TIPPING-side ---------- */
function TipPage({ picks, onPick }) {
  const { today, upcoming } = VMDATA;
  return (
    <div>
      <div className="section-head">
        <div>
          <div className="sub">Lever før avspark</div>
          <h2>Dagens kamper</h2>
        </div>
        <span className="date-flag">MATCHDAG 8</span>
      </div>

      {today.map((m) => (
        <MatchCard key={m.id} match={m} value={picks[m.id]} onPick={onPick} />
      ))}

      <div className="upcoming">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ fontSize: 22 }}>Senere kamper</h2>
          </div>
        </div>
        {upcoming.map((d) => (
          <div key={d.day}>
            <div className="day-head">{d.day}</div>
            {d.matches.map((m) => (
              <div className="mini" key={m.id}>
                <span className="mt">{m.time}</span>
                <span className="pair">
                  {m.home.name} <span className="x">vs</span> {m.away.name}
                </span>
                <span className="lock">Åpner snart</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- kupong-bunn ---------- */
function Coupon({ picks, delivered, onDeliver }) {
  const { today } = VMDATA;
  const total = today.length;
  const done = today.filter((m) => picks[m.id]).length;
  const possible = today.reduce(
    (s, m) => (picks[m.id] ? s + m.points[picks[m.id]] : s),
    0,
  );
  const pct = Math.round((done / total) * 100);
  return (
    <div className="coupon">
      <div className="coupon-in">
        <div className="progress">
          <div className="row">
            <span className="a">
              {done} / {total} tippet
            </span>
            <span className="b">Mulig utbytte: {possible} p</span>
          </div>
          <div className="bar">
            <i style={{ width: pct + "%" }} />
          </div>
        </div>
        <button
          className={"btn-deliver" + (delivered ? " done" : "")}
          disabled={done === 0}
          onClick={onDeliver}
        >
          {delivered ? "Levert ✓" : "Lever inn"}
        </button>
      </div>
    </div>
  );
}

/* ---------- TABELL-side ---------- */
function TablePage() {
  const { leaderboard } = VMDATA;
  const [scope, setScope] = useState("total");
  const trendCls = (t) => (t > 0 ? "up" : t < 0 ? "dn" : "fl");
  const trendTxt = (t) => (t > 0 ? "↑ " + t : t < 0 ? "↓ " + Math.abs(t) : "–");

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="sub">Verdensmesterligaen</div>
          <h2>Tabellen</h2>
        </div>
        <span className="date-flag">Runde 8 / 12</span>
      </div>

      <div className="lb-controls">
        <button
          className="seg"
          aria-pressed={scope === "total"}
          onClick={() => setScope("total")}
        >
          Totalt
        </button>
        <button
          className="seg"
          aria-pressed={scope === "round"}
          onClick={() => setScope("round")}
        >
          Denne runden
        </button>
      </div>

      <div className="lb-list">
        {leaderboard.map((p) => (
          <div className={"lb-row" + (p.me ? " me" : "")} key={p.name}>
            <span className="rk">{p.rank}</span>
            <div className="who">
              <div className="nm">
                {p.name}
                {p.me && <span className="you-tag">Deg</span>}
              </div>
              <div className="st">
                {p.hit}% treff · {Math.round(p.pts / 8)} p/runde
              </div>
            </div>
            <span className={"trend " + trendCls(p.trend)}>
              {trendTxt(p.trend)}
            </span>
            <span className="score">
              {scope === "round" ? Math.round(p.pts / 8) : p.pts}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- app ---------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
  accent: "#c4492f",
  texture: false,
}; /*EDITMODE-END*/

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState("tip");
  const [picks, setPicks] = useState({});
  const [delivered, setDelivered] = useState(false);
  const [toast, setToast] = useState(false);
  const toastT = useRef(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", t.accent);
    document.body.classList.toggle("texture", !!t.texture);
  }, [t.accent, t.texture]);

  function onPick(id, k) {
    setDelivered(false);
    setPicks((p) => ({ ...p, [id]: p[id] === k ? undefined : k }));
  }
  function onDeliver() {
    setDelivered(true);
    setToast(true);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(false), 2200);
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <span className="crest">
            <BallCrest />
          </span>
          <div className="wordmark">
            <div className="l1">VM</div>
            <div className="l2">Nord-Amerika · sommeren ’26</div>
          </div>
        </div>
        <div className="user-chip">
          <span className="nm">Deg</span>
          <span className="av">D</span>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button
          className="tab"
          role="tab"
          aria-selected={tab === "tip"}
          onClick={() => setTab("tip")}
        >
          <IconCoupon /> Tipping
        </button>
        <button
          className="tab"
          role="tab"
          aria-selected={tab === "tabell"}
          onClick={() => setTab("tabell")}
        >
          <IconTable /> Tabellen
        </button>
      </div>

      {tab === "tip" ? (
        <TipPage picks={picks} onPick={onPick} />
      ) : (
        <TablePage />
      )}

      {tab === "tip" && (
        <Coupon picks={picks} delivered={delivered} onDeliver={onDeliver} />
      )}

      <div className={"toast" + (toast ? " show" : "")}>
        Kupong levert — lykke til!
      </div>

      <TweaksPanel>
        <TweakSection label="Farge & papir" />
        <TweakColor
          label="Aksentfarge"
          value={t.accent}
          options={["#c4492f", "#3f7a52", "#3a5a8c", "#b8862e"]}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakToggle
          label="Halftone-tekstur"
          value={t.texture}
          onChange={(v) => setTweak("texture", v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
