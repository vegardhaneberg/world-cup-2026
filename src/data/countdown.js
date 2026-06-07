import { useEffect, useState } from "react";

const HOUR = 60 * 60 * 1000;

// Adaptive countdown formatter:
//   ≥ 1 day  → "12d 4t"
//   ≥ 1 hour → "4t 33m"
//   < 1 hour → "04:33" (MM:SS)
export function formatCountdown(ms) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days >= 1) return `${days}d ${hours}t`;
  if (hours >= 1) return `${hours}t ${minutes}m`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Ticking countdown to `targetTime` (ms epoch, Date, or ISO string; null/
// undefined → no target). Returns msLeft, clamped at 0. The tick rate adapts:
// every second under an hour (so MM:SS counts down), every 30s beyond (to avoid
// render churn), re-arming as it crosses the 1h boundary, and stops at 0.
export function useCountdown(targetTime) {
  const target =
    targetTime == null
      ? null
      : typeof targetTime === "number"
      ? targetTime
      : new Date(targetTime).getTime();

  const [msLeft, setMsLeft] = useState(() =>
    target == null ? 0 : Math.max(0, target - Date.now()),
  );

  useEffect(() => {
    if (target == null) {
      setMsLeft(0);
      return;
    }
    let id;
    const tick = () => {
      const remaining = Math.max(0, target - Date.now());
      setMsLeft(remaining);
      if (remaining === 0) return; // reached the deadline; stop ticking
      id = setTimeout(tick, remaining < HOUR ? 1000 : 30_000);
    };
    tick();
    return () => clearTimeout(id);
  }, [target]);

  return msLeft;
}
