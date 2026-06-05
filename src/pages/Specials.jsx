import { useState } from "react";
import { useSpecials } from "../context/SpecialsContext";
import TeamCrest from "../components/TeamCrest";
import { getTeamInfo } from "../data/dummyData";
import { specialOdds, specialPoints, isSpecialLocked } from "../data/specials";

function roundedOdds(outcome) {
  const odds = specialOdds(outcome);
  return odds == null ? "–" : Math.round(odds);
}

// --- flag-colour helpers (TEAM_INFO stores disc = primary, fg = accent) ---
function hexToRgb(hex) {
  const c = hex.replace("#", "");
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function readableText(hex) {
  return luminance(hex) > 0.62 ? "#1a1a1a" : "#ffffff";
}
function darken(hex, f) {
  const [r, g, b] = hexToRgb(hex).map((x) => Math.round(x * f));
  return `rgb(${r}, ${g}, ${b})`;
}

// Highlights the chosen country with its flag colours, name + crest and
// the points it would award if correct.
function ChosenHero({ outcome, statusLabel = "Ditt valg", dim = false }) {
  const { disc, fg } = getTeamInfo(outcome.name);
  const pts = specialPoints(outcome);
  const text = readableText(disc);
  const badgeText = readableText(fg);

  return (
    <div
      className={`special-hero${dim ? " special-hero--dim" : ""}`}
      style={{
        background: `linear-gradient(135deg, ${disc} 0%, ${darken(disc, 0.72)} 100%)`,
        color: text,
        borderLeft: `5px solid ${fg}`,
      }}
    >
      <div className="special-hero-crest">
        <TeamCrest teamName={outcome.name} />
      </div>
      <div className="special-hero-info">
        <span className="special-hero-label" style={{ color: text, opacity: 0.72 }}>
          {statusLabel}
        </span>
        <span className="special-hero-name">{outcome.name}</span>
      </div>
      <div
        className="special-hero-pts"
        style={{ background: fg, color: badgeText }}
        title="Poeng hvis riktig"
      >
        <b>{pts}</b>
        <span>poeng</span>
      </div>
    </div>
  );
}

function OutcomeRow({ outcome, selected, onPick, locked, won, lost }) {
  const cls =
    "special-card" +
    (selected ? " selected" : "") +
    (won ? " won" : "") +
    (lost ? " lost" : "") +
    (locked ? " locked" : "");
  const interactive = !locked && !!onPick;

  return (
    <div
      className={cls}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={interactive ? onPick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick();
              }
            }
          : undefined
      }
    >
      <TeamCrest teamName={outcome.name} />
      <span className="special-name">{outcome.name}</span>
      <span className="special-odds">{roundedOdds(outcome)}</span>
    </div>
  );
}

export default function Specials() {
  const { markets, picks, loading, pickSpecial } = useSpecials();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  if (loading) return <div className="lb-loading">Laster…</div>;

  const market = markets.find((m) => m.key === "winner");
  if (!market) {
    return <p className="lb-empty-note">Ingen spesialer er åpne ennå.</p>;
  }

  const locked = isSpecialLocked(market);
  const settled = !!market.result_outcome_id;
  const pickedId = picks[market.id];
  const pickedOutcome = market.outcomes.find((o) => o.id === pickedId) ?? null;
  const resultOutcome = settled
    ? market.outcomes.find((o) => o.id === market.result_outcome_id) ?? null
    : null;

  // After kickoff the card collapses to the locked pick (and the result once settled).
  if (locked) {
    const won = settled && resultOutcome && resultOutcome.id === pickedOutcome?.id;
    const lost = settled && resultOutcome && resultOutcome.id !== pickedOutcome?.id;
    const statusLabel = settled
      ? won
        ? "Riktig! 🎉"
        : "Bommet"
      : "Låst";
    return (
      <div className="match special-bet">
        <div className="match-top special-bet-head special-bet-head--static">
          <span className="grp">{market.title}</span>
          <span className="ko">Låst</span>
        </div>

        {pickedOutcome ? (
          <ChosenHero outcome={pickedOutcome} statusLabel={statusLabel} dim={lost} />
        ) : (
          <p className="lb-empty-note">
            Du valgte ingen {market.title.toLowerCase()}.
          </p>
        )}

        {settled ? (
          resultOutcome && (
            <p className="lb-empty-note">
              Vinner: {resultOutcome.name} · {specialPoints(resultOutcome)} p
            </p>
          )
        ) : (
          <p className="lb-empty-note">Avgjøres etter finalen.</p>
        )}
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? market.outcomes.filter((o) => o.name.toLowerCase().includes(q))
    : market.outcomes;

  return (
    <div className={`match special-bet${expanded ? " special-bet--open" : ""}`}>
      <button
        type="button"
        className="match-top special-bet-head"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="grp">{market.title}</span>
        <span className="ko">
          <span className="special-bet-action">
            {expanded ? "Lukk" : pickedOutcome ? "Endre" : "Velg lag"}
          </span>
          <span className="special-bet-chevron" aria-hidden="true">
            {expanded ? "▲" : "▼"}
          </span>
        </span>
      </button>

      {pickedOutcome ? (
        <ChosenHero outcome={pickedOutcome} />
      ) : (
        !expanded && (
          <button
            type="button"
            className="special-empty"
            onClick={() => setExpanded(true)}
          >
            Velg din {market.title.toLowerCase()} →
          </button>
        )
      )}

      {expanded && (
        <div className="special-bet-body">
          <input
            className="special-search"
            type="search"
            placeholder="Søk etter lag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="special-list">
            {filtered.map((o) => (
              <OutcomeRow
                key={o.id}
                outcome={o}
                selected={o.id === pickedId}
                onPick={() => {
                  const isDeselect = o.id === pickedId;
                  pickSpecial(market.id, o.id);
                  // Collapse back to the highlighted pick once a country is chosen.
                  if (!isDeselect) setExpanded(false);
                }}
              />
            ))}
            {filtered.length === 0 && (
              <p className="lb-empty-note">Fant ingen lag.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
