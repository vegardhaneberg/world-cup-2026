import { useState, useEffect, useRef } from "react";
import { usePredictions } from "../context/PredictionContext";
import { useMatches } from "../context/MatchContext";
import { useSpecials } from "../context/SpecialsContext";
import Matches from "./Matches";
import PlayedMatches from "./PlayedMatches";
import Specials from "./Specials";
import AutofillModal from "../components/AutofillModal";
import { isMatchHidden, isMatchWarning, isMatchLocked } from "../data/matchUtils";
import { isSpecialLocked } from "../data/specials";
import {
  boostedPoints,
  groupBonus,
  isGroupStageMatch,
  GROUP_BONUS_STEP,
  GROUP_BONUS_POINTS,
} from "../data/scoring";

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
            <span className="a">Tippelappen</span>
            <span className="b">Mulig utbytte: {possible} p</span>
          </div>
          <div className="bar">
            <i style={{ width: pct + "%" }} />
          </div>
          <div className="bonus-note">
            <strong>{done}</strong> av {total} tilgjengelige kamper tippet
          </div>
        </div>
      </div>
    </div>
  );
}

function BonusTracker({ predictions }) {
  const { matches } = useMatches();

  // Group-stage bonus tracker — realized only: count played group matches whose
  // pick matched the result. Single source of truth via scoring.js so this can
  // never disagree with the leaderboard.
  const groupMatches = matches.filter(isGroupStageMatch);
  const groupCorrect = groupMatches.filter(
    (m) => m.result != null && predictions[m.id] === m.result,
  ).length;
  const groupRemaining = groupMatches.filter((m) => m.result == null).length;
  const earned = groupBonus(groupCorrect);
  const towardNext = groupCorrect % GROUP_BONUS_STEP;
  const remainingToNext = GROUP_BONUS_STEP - towardNext;
  const modPct = (towardNext / GROUP_BONUS_STEP) * 100;
  const frozen = groupRemaining === 0;

  return (
    <div className="coupon">
      <div className="coupon-in">
        <div className="progress group-bonus">
          <div className="row">
            <span className="a">Gruppespill-bonus</span>
            <span className="b">
              {frozen ? `Bonus: +${earned} p` : `Bonus så langt: ${earned} p`}
            </span>
          </div>
          {frozen ? (
            <div className="bonus-note">Gruppespill ferdig</div>
          ) : (
            <>
              <div className="bar">
                <i style={{ width: modPct + "%" }} />
              </div>
              <div className="bonus-note">
                <strong>{remainingToNext}</strong> rette igjen til neste bonus (+
                {GROUP_BONUS_POINTS} p)
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Tipping({ onPick }) {
  const { predictions, predict } = usePredictions();
  const { matches, loading } = useMatches();
  const { markets, picks } = useSpecials();
  const [sub, setSub] = useState("kommende");
  const didInit = useRef(false);
  const [showAutofillModal, setShowAutofillModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // The tab badges below are time-sensitive (a match entering its countdown
  // window, a special locking), so keep them fresh with the same 30s cadence as
  // the Matches ticker — otherwise a badge wouldn't appear until the next pick.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Specials still open (unlocked) that the user hasn't delivered a pick on —
  // surfaced as a red notification badge on the Spesialer tab, like a mobile
  // app. Drops to 0 once everything is picked or every market has locked.
  const missingSpecials = markets.filter(
    (m) => !isSpecialLocked(m) && picks[m.id] == null,
  ).length;

  // Upcoming matches inside their countdown window (the 30-min warning before
  // lock) with no pick placed yet — the red badge on the Kommende tab.
  const missingUpcoming = matches.filter(
    (m) => isMatchWarning(m) && !predictions[m.id],
  ).length;

  const unfilled = matches.filter((m) => !isMatchLocked(m) && !predictions[m.id]);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  async function handleAutofill() {
    setShowAutofillModal(false);
    const outcomes = ["home", "draw", "away"];
    let failed = false;
    for (const m of unfilled) {
      const outcome = outcomes[Math.floor(Math.random() * 3)];
      const err = await predict(m.id, outcome);
      if (err) failed = true;
    }
    if (failed) {
      showToast("Noen tips kunne ikke lagres – prøv igjen");
    } else {
      showToast(`${unfilled.length} tips ble fylt inn`);
    }
  }

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
          {missingUpcoming > 0 && (
            <span
              className="subtab-badge"
              aria-label={`${missingUpcoming} kamper må tippes snart`}
            >
              {missingUpcoming}
            </span>
          )}
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
          {missingSpecials > 0 && (
            <span
              className="subtab-badge"
              aria-label={`${missingSpecials} spesialer mangler`}
            >
              {missingSpecials}
            </span>
          )}
        </button>
      </div>

      {sub === "kommende" && unfilled.length > 0 && (
        <div className="btn-autofill-row">
          <button
            className="btn-autofill"
            onClick={() => setShowAutofillModal(true)}
          >
            Fyll inn manglende tips
            <span className="btn-autofill-count">{unfilled.length}</span>
          </button>
        </div>
      )}

      {sub === "kommende" && <Matches onPick={onPick} />}
      {sub === "spilte" && <PlayedMatches />}
      {sub === "spesialer" && <Specials />}

      {sub === "kommende" && <Coupon predictions={predictions} />}
      {sub === "spilte" && <BonusTracker predictions={predictions} />}

      {showAutofillModal && (
        <AutofillModal
          count={unfilled.length}
          onConfirm={handleAutofill}
          onCancel={() => setShowAutofillModal(false)}
        />
      )}

      <div className={`toast${toastMessage ? " show" : ""}`}>{toastMessage}</div>
    </div>
  );
}
