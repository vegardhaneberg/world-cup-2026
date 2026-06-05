import { useState, useEffect, useRef } from "react";
import { usePredictions } from "../context/PredictionContext";
import { useMatches } from "../context/MatchContext";
import Matches from "./Matches";
import PlayedMatches from "./PlayedMatches";
import Specials from "./Specials";
import { isMatchHidden } from "../data/matchUtils";
import { boostedPoints } from "../data/scoring";

function Coupon({ predictions }) {
  const { matches } = useMatches();
  const { boosts } = usePredictions();
  const upcoming = matches.filter((m) => !isMatchHidden(m));
  const total = upcoming.length;
  const done = upcoming.filter((m) => predictions[m.id]).length;
  const possible = upcoming.reduce((s, m) => {
    const pick = predictions[m.id];
    if (!pick) return s;
    const pts =
      pick === "home" ? m.pointsHome : pick === "draw" ? m.pointsDraw : m.pointsAway;
    return s + (boosts[m.id] !== undefined ? boostedPoints(pts) : pts);
  }, 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

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
      </div>
    </div>
  );
}

export default function Tipping({ onPick }) {
  const { predictions } = usePredictions();
  const { matches, loading } = useMatches();
  const [sub, setSub] = useState("kommende");
  const didInit = useRef(false);

  // Default to "Kommende"; once matches finish loading, fall back to "Spilte"
  // only if there are no upcoming matches left. Runs once so it never overrides
  // a later manual tab switch.
  useEffect(() => {
    if (loading || didInit.current) return;
    didInit.current = true;
    const upcomingCount = matches.filter((m) => !isMatchHidden(m)).length;
    if (upcomingCount === 0) setSub("spilte");
  }, [loading, matches]);

  return (
    <div>
      <div className="subtabs" role="tablist">
        <button
          className="subtab"
          role="tab"
          aria-selected={sub === "kommende"}
          onClick={() => setSub("kommende")}
        >
          Kommende
        </button>
        <button
          className="subtab"
          role="tab"
          aria-selected={sub === "spilte"}
          onClick={() => setSub("spilte")}
        >
          Spilte
        </button>
        <button
          className="subtab"
          role="tab"
          aria-selected={sub === "spesialer"}
          onClick={() => setSub("spesialer")}
        >
          Spesialer
        </button>
      </div>

      {sub === "kommende" && <Matches onPick={onPick} />}
      {sub === "spilte" && <PlayedMatches />}
      {sub === "spesialer" && <Specials />}

      {sub === "kommende" && <Coupon predictions={predictions} />}
    </div>
  );
}
