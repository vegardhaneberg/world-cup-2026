import { useState } from "react";
import { useSpecials } from "../context/SpecialsContext";
import TeamCrest from "../components/TeamCrest";
import { getTeamInfo } from "../data/dummyData";
import { specialOdds, specialPoints, isSpecialLocked } from "../data/specials";
import matchesData from "../data/matches.json";

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

// Build { 'Gruppe A': ['Mexico', 'South Africa', ...], ... } from matches.json
function buildGroupTeams(data) {
  const groups = {};
  for (const match of data.matches ?? []) {
    if (!match.group) continue;
    const key = match.group.replace("Group ", "Gruppe ");
    if (!groups[key]) groups[key] = new Set();
    groups[key].add(match.team1);
    groups[key].add(match.team2);
  }
  return Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, [...v]]));
}

const GROUP_TEAMS = buildGroupTeams(matchesData);

function isGroupMarket(market) {
  return market.key === "top_scoring_group" || market.key === "most_carded_group";
}

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

function GroupChosenHero({ outcome, statusLabel = "Ditt valg", dim = false }) {
  const pts = specialPoints(outcome);
  const teams = GROUP_TEAMS[outcome.name] ?? [];

  return (
    <div
      className={`special-hero${dim ? " special-hero--dim" : ""}`}
      style={{
        background: "linear-gradient(135deg, #4a4a4a 0%, #333333 100%)",
        color: "#ffffff",
        borderLeft: "5px solid #888",
      }}
    >
      <div className="special-hero-info">
        <span className="special-hero-label" style={{ color: "#ffffff", opacity: 0.72 }}>
          {statusLabel}
        </span>
        <span className="special-hero-name">{outcome.name}</span>
      </div>
      <div className="special-group-crests-centered">
        {teams.map((team) => (
          <TeamCrest key={team} teamName={team} noLink />
        ))}
      </div>
      <div
        className="special-hero-pts"
        style={{ background: "#888", color: "#ffffff" }}
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

function GroupOutcomeRow({ outcome, selected, onPick, locked, won, lost }) {
  const cls =
    "special-card" +
    (selected ? " selected" : "") +
    (won ? " won" : "") +
    (lost ? " lost" : "") +
    (locked ? " locked" : "");
  const interactive = !locked && !!onPick;
  const teams = GROUP_TEAMS[outcome.name] ?? [];

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
      <span className="special-name">{outcome.name}</span>
      <div className="special-group-crests">
        {teams.map((team) => (
          <TeamCrest key={team} teamName={team} noLink />
        ))}
      </div>
      <span className="special-odds">{roundedOdds(outcome)}</span>
    </div>
  );
}

function MarketSection({ market, picks, pickSpecial }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const locked = isSpecialLocked(market);
  const settled = (market.result_outcome_ids?.length ?? 0) > 0;
  const pickedId = picks[market.id];
  const pickedOutcome = market.outcomes.find((o) => o.id === pickedId) ?? null;

  const won = settled && market.result_outcome_ids?.includes(pickedOutcome?.id);
  const lost = settled && !won;

  const resultOutcomes = settled
    ? market.outcomes.filter((o) => market.result_outcome_ids.includes(o.id))
    : [];

  const isGroup = isGroupMarket(market);
  const HeroComp = isGroup ? GroupChosenHero : ChosenHero;
  const RowComp = isGroup ? GroupOutcomeRow : OutcomeRow;

  if (locked) {
    const statusLabel = settled ? (won ? "Riktig! 🎉" : "Bommet") : "Låst";
    const lockedNote = isGroup
      ? "Avgjøres etter gruppespillet."
      : "Avgjøres etter finalen.";

    return (
      <div className="match special-bet">
        <div className="match-top special-bet-head special-bet-head--static">
          <span className="grp">{market.title}</span>
          <span className="ko">Låst</span>
        </div>

        {pickedOutcome ? (
          <HeroComp outcome={pickedOutcome} statusLabel={statusLabel} dim={lost} />
        ) : (
          <p className="lb-empty-note">
            Du valgte ingen {market.title.toLowerCase()}.
          </p>
        )}

        {settled ? (
          resultOutcomes.length > 0 && (
            <p className="lb-empty-note">
              Vinner: {resultOutcomes.map((o) => o.name).join(", ")} ·{" "}
              {specialPoints(resultOutcomes[0])} p
            </p>
          )
        ) : (
          <p className="lb-empty-note">{lockedNote}</p>
        )}
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered =
    !isGroup && q
      ? market.outcomes.filter((o) => o.name.toLowerCase().includes(q))
      : market.outcomes;

  const actionLabel = isGroup ? "Velg gruppe" : "Velg lag";
  const emptyCallToAction = isGroup
    ? "Velg en gruppe →"
    : `Velg din ${market.title.toLowerCase()} →`;

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
            {expanded ? "Lukk" : pickedOutcome ? "Endre" : actionLabel}
          </span>
          <span className="special-bet-chevron" aria-hidden="true">
            {expanded ? "▲" : "▼"}
          </span>
        </span>
      </button>

      {pickedOutcome ? (
        <HeroComp outcome={pickedOutcome} />
      ) : (
        !expanded && (
          <button
            type="button"
            className="special-empty"
            onClick={() => setExpanded(true)}
          >
            {emptyCallToAction}
          </button>
        )
      )}

      {expanded && (
        <div className="special-bet-body">
          {!isGroup && (
            <input
              className="special-search"
              type="search"
              placeholder="Søk etter lag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}

          <div className="special-list">
            {filtered.map((o) => (
              <RowComp
                key={o.id}
                outcome={o}
                selected={o.id === pickedId}
                locked={false}
                won={false}
                lost={false}
                onPick={() => {
                  const isDeselect = o.id === pickedId;
                  pickSpecial(market.id, o.id);
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

export default function Specials() {
  const { markets, picks, loading, pickSpecial } = useSpecials();

  if (loading) return <div className="lb-loading">Laster…</div>;

  if (markets.length === 0) {
    return <p className="lb-empty-note">Ingen spesialer er åpne ennå.</p>;
  }

  return (
    <div>
      {markets.map((market) => (
        <MarketSection
          key={market.id}
          market={market}
          picks={picks}
          pickSpecial={pickSpecial}
        />
      ))}
    </div>
  );
}
