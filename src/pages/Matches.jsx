import { useState, useEffect, memo } from "react";
import { usePredictions } from "../context/PredictionContext";
import { matches } from "../data/dummyData";
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
}) {
  const opts = [
    { outcome: "home", label: "H", name: "Hjemme", pts: pointsHome },
    { outcome: "draw", label: "U", name: "Uavgjort", pts: pointsDraw },
    { outcome: "away", label: "B", name: "Borte", pts: pointsAway },
  ];
  return (
    <div className="picker">
      {opts.map((o) => (
        <button
          key={o.outcome}
          className="pick"
          aria-pressed={value === o.outcome}
          onClick={() => onPick(matchId, o.outcome)}
        >
          <span className="k">{o.label}</span>
          <span className="lbl">{o.name}</span>
          <span className="pt">{o.pts} p</span>
        </button>
      ))}
    </div>
  );
}

const UpcomingCard = memo(function UpcomingCard({ match, prediction, onPick, locked, isWarning }) {
  const time = formatTime(match.date);
  const outcomeLabel = { home: "H", draw: "U", away: "B" };

  const [msLeft, setMsLeft] = useState(0);

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

  return (
    <div className="match">
      {isWarning && msLeft > 0 && (
        <div className="match-warning-banner">Låses om {countdownDisplay}</div>
      )}
      <div className="match-top">
        <span className="grp">Gruppe {match.group}</span>
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
          <span className="match-locked-label">Kampen er i gang</span>
          {prediction && (
            <span className="match-locked-pick">{outcomeLabel[prediction]}</span>
          )}
        </div>
      ) : (
        <Picker
          matchId={match.id}
          pointsHome={match.pointsHome}
          pointsDraw={match.pointsDraw}
          pointsAway={match.pointsAway}
          value={prediction}
          onPick={onPick}
        />
      )}
    </div>
  );
});


export default function Matches({ onPick }) {
  const { predictions } = usePredictions();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const visible = matches.filter((m) => !isMatchHidden(m));
  const grouped = groupByLocalDate(visible);

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
          {dayMatches.map((m) => (
            <UpcomingCard
              key={m.id}
              match={m}
              prediction={predictions[m.id]}
              onPick={onPick}
              locked={isMatchLocked(m)}
              isWarning={isMatchWarning(m)}
            />
          ))}
        </div>
      ))}

      {visible.length === 0 && (
        <p className="lb-empty-note">Alle kamper er spilt.</p>
      )}
    </div>
  );
}
