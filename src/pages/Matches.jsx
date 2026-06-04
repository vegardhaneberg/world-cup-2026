import { useState, useEffect, memo } from "react";
import { usePredictions } from "../context/PredictionContext";
import { useMatches } from "../context/MatchContext";
import { isMatchLocked, isMatchHidden, isMatchWarning } from "../data/matchUtils";
import TeamCrest from "../components/TeamCrest";

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("no", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  });
}

function formatDateHeading(localDate) {
  return new Date(localDate + "T12:00:00Z").toLocaleDateString("no", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function groupByLocalDate(matchList) {
  const map = {};
  for (const m of matchList) {
    if (!map[m.localDate]) map[m.localDate] = [];
    map[m.localDate].push(m);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

function Picker({
  matchId,
  pointsHome,
  pointsDraw,
  pointsAway,
  value,
  onPick,
  boosted,
}) {
  const opts = [
    { outcome: "home", label: "H", name: "Hjemme", pts: pointsHome },
    { outcome: "draw", label: "U", name: "Uavgjort", pts: pointsDraw },
    { outcome: "away", label: "B", name: "Borte", pts: pointsAway },
  ];
  return (
    <div className="picker">
      {opts.map((o) => {
        const selected = value === o.outcome;
        return (
          <button
            key={o.outcome}
            className={`pick${selected && boosted ? " pick--boosted" : ""}`}
            aria-pressed={selected}
            onClick={() => onPick(matchId, o.outcome)}
          >
            <span className="k">{o.label}</span>
            <span className="lbl">{o.name}</span>
            <span className="pt">
              {selected && boosted ? `${o.pts} → ${o.pts * 2} p` : `${o.pts} p`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const UpcomingCard = memo(function UpcomingCard({
  match,
  prediction,
  onPick,
  locked,
  isWarning,
  isBoosted,
  boostUsedElsewhere,
  boostLockedElsewhere,
  onBoost,
}) {
  const time = formatTime(match.date);
  const outcomeLabel = { home: "H", draw: "U", away: "B" };

  const [msLeft, setMsLeft] = useState(0);
  const [movedCue, setMovedCue] = useState(false);

  useEffect(() => {
    if (!isWarning) return;
    const lockTime = new Date(match.date).getTime() - 5 * 60 * 1000;
    const tick = () => {
      const remaining = Math.max(0, lockTime - Date.now());
      setMsLeft(remaining);
      if (remaining === 0) clearInterval(id);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isWarning, match.date]);

  const effectiveLocked = locked || isMatchLocked(match);

  const countdownDisplay = (() => {
    const minutes = Math.floor(msLeft / 60000);
    const seconds = Math.floor((msLeft % 60000) / 1000);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  })();

  function handleBoost() {
    const wasMove = boostUsedElsewhere && !isBoosted;
    onBoost(match);
    if (wasMove) {
      setMovedCue(true);
      setTimeout(() => setMovedCue(false), 1800);
    }
  }

  // Doubled-points hint for the active boost button
  const boostedPts = prediction
    ? (prediction === "home" ? match.pointsHome
      : prediction === "draw" ? match.pointsDraw
      : match.pointsAway)
    : 0;

  function boostControl() {
    if (effectiveLocked) return null;
    if (!prediction) {
      return (
        <button className="boost-btn" disabled>
          <span className="boost-bolt">⚡</span> Velg utfall
        </button>
      );
    }
    if (isBoosted) {
      return (
        <button className="boost-btn boost-btn--active" onClick={handleBoost}>
          <span className="boost-bolt">⚡</span> Booster aktiv · trykk for å fjerne
        </button>
      );
    }
    if (boostUsedElsewhere) {
      if (boostLockedElsewhere) {
        // The period's 2x sits on a match that has already locked — it is
        // committed there and can no longer be moved this period.
        return (
          <button className="boost-btn" disabled>
            <span className="boost-bolt">⚡</span> Booster er allerede brukt
          </button>
        );
      }
      return (
        <button className="boost-btn boost-btn--move" onClick={handleBoost}>
          <span className="boost-bolt">⚡</span> Flytt booster hit
        </button>
      );
    }
    return (
      <button className="boost-btn boost-btn--available" onClick={handleBoost}>
        <span className="boost-bolt">⚡</span> Aktiver booster
      </button>
    );
  }

  return (
    <div className={`match${isBoosted ? " match--boosted" : ""}`}>
      {isWarning && msLeft > 0 && (
        <div className="match-warning-banner">Låses om {countdownDisplay}</div>
      )}
      <div className="match-top">
        <span className="grp">{match.group ? `Gruppe ${match.group}` : (match.stage ?? '').replace(/_/g, ' ')}</span>
        {isBoosted && <span className="boost-badge">⚡2x</span>}
        {match.isEven && <span className="hardflag">Jevn kamp</span>}
        <span className="ko">
          <b>{time}</b> · {match.city}
        </span>
      </div>
      <div className="fixture">
        <div className="team home">
          <TeamCrest teamName={match.homeTeam} />
          <div>
            <div className="nm">{match.homeTeam}</div>
            <div className="meta">{match.venue}</div>
          </div>
        </div>
        <span className="vs">VS</span>
        <div className="team away">
          <TeamCrest teamName={match.awayTeam} />
          <div>
            <div className="nm">{match.awayTeam}</div>
            <div className="meta">Avspark {time}</div>
          </div>
        </div>
      </div>
      {effectiveLocked ? (
        <div className="match-locked">
          <span className="match-locked-label">
            {isBoosted ? "Kampen er i gang · 2x" : "Kampen er i gang"}
          </span>
          {prediction && (
            <span className={`match-locked-pick${isBoosted ? " match-locked-pick--boosted" : ""}`}>
              {outcomeLabel[prediction]}
            </span>
          )}
        </div>
      ) : (
        <>
          <Picker
            matchId={match.id}
            pointsHome={match.pointsHome}
            pointsDraw={match.pointsDraw}
            pointsAway={match.pointsAway}
            value={prediction}
            onPick={onPick}
            boosted={isBoosted}
          />
          <div className="boost-row">
            {boostControl()}
            {movedCue && <span className="boost-moved-cue">⚡ 2x flyttet hit</span>}
          </div>
        </>
      )}
    </div>
  );
});


export default function Matches({ onPick }) {
  const { predictions, boosts, boost } = usePredictions();
  const { matches } = useMatches();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const visible = matches.filter((m) => !isMatchHidden(m));
  const grouped = groupByLocalDate(visible);

  // Which match holds the boost in each period → lets cards offer "move here"
  const boostByPeriod = {};
  for (const [matchId, period] of Object.entries(boosts)) {
    boostByPeriod[period] = Number(matchId);
  }

  // Periods whose boost sits on an already-locked match: the 2x is committed
  // there and cannot be moved to another match in the same period.
  const matchById = {};
  for (const m of matches) matchById[m.id] = m;
  const lockedBoostPeriods = new Set();
  for (const [matchId, period] of Object.entries(boosts)) {
    const holder = matchById[Number(matchId)];
    if (holder && isMatchLocked(holder)) lockedBoostPeriods.add(period);
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Kommende kamper</h2>
        </div>
        <span className="date-flag">{visible.length} kamper</span>
      </div>

      {grouped.map(([date, dayMatches]) => (
        <div key={date}>
          <div className="day-head">{formatDateHeading(date)}</div>
          {dayMatches.map((m) => {
            const isBoosted = boosts[m.id] !== undefined;
            const periodHolder = boostByPeriod[m.period];
            return (
              <UpcomingCard
                key={m.id}
                match={m}
                prediction={predictions[m.id]}
                onPick={onPick}
                onBoost={boost}
                locked={isMatchLocked(m)}
                isWarning={isMatchWarning(m)}
                isBoosted={isBoosted}
                boostUsedElsewhere={periodHolder !== undefined && periodHolder !== m.id}
                boostLockedElsewhere={lockedBoostPeriods.has(m.period)}
              />
            );
          })}
        </div>
      ))}

      {visible.length === 0 && (
        <p className="lb-empty-note">Alle kamper er spilt.</p>
      )}
    </div>
  );
}
