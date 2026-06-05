import { useState } from "react";
import { useSpecials } from "../context/SpecialsContext";
import TeamCrest from "../components/TeamCrest";
import { specialPoints, isSpecialLocked } from "../data/specials";

function SpecialPickCard({ outcome, selected, onPick, locked, won, lost }) {
  const pts = specialPoints(outcome);
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
      <span className="special-odds">{Number(outcome.odds).toFixed(2)}</span>
      <span className="special-pts">Mulig: {pts} p</span>
    </div>
  );
}

export default function Specials() {
  const { markets, picks, loading, pickSpecial } = useSpecials();
  const [query, setQuery] = useState("");

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

  // After kickoff the list collapses to the locked pick (and the result once settled).
  if (locked) {
    const won = settled && resultOutcome && resultOutcome.id === pickedOutcome?.id;
    const lost = settled && resultOutcome && resultOutcome.id !== pickedOutcome?.id;
    return (
      <div>
        <div className="section-head light">
          <span className="odds-chip">{market.title}</span>
          <span className="date-flag">Låst</span>
        </div>

        {pickedOutcome ? (
          <div className="special-list">
            <SpecialPickCard
              outcome={pickedOutcome}
              selected
              locked
              won={won}
              lost={lost}
            />
          </div>
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
    <div>
      <div className="section-head light">
        <span className="odds-chip">{market.title}</span>
        <span className="date-flag">{market.outcomes.length} lag</span>
      </div>

      <input
        className="special-search"
        type="search"
        placeholder="Søk etter lag…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="special-list">
        {filtered.map((o) => (
          <SpecialPickCard
            key={o.id}
            outcome={o}
            selected={o.id === pickedId}
            onPick={() => pickSpecial(market.id, o.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="lb-empty-note">Fant ingen lag.</p>
        )}
      </div>
    </div>
  );
}
