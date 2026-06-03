import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  PredictionProvider,
  usePredictions,
} from "./context/PredictionContext";
import Login from "./pages/Login";
import Matches from "./pages/Matches";
import Leaderboard from "./pages/Leaderboard";
import PlayedMatches from "./pages/PlayedMatches";
import { matches } from "./data/dummyData";
import { isMatchHidden } from "./data/matchUtils";

function BallCrest() {
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

function IconHistory() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
}

function Coupon({ predictions }) {
  const upcoming = matches.filter((m) => !isMatchHidden(m));
  const total = upcoming.length;
  const done = upcoming.filter((m) => predictions[m.id]).length;
  const possible = upcoming.reduce((s, m) => {
    const pick = predictions[m.id];
    if (!pick) return s;
    if (pick === "home") return s + m.pointsHome;
    if (pick === "draw") return s + m.pointsDraw;
    return s + m.pointsAway;
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

function MainView() {
  const { user } = useAuth();
  const { predictions, predict } = usePredictions();
  const [tab, setTab] = useState("tip");

  const fullName = user?.user_metadata?.full_name ?? user?.email ?? "Deg";
  const firstName = fullName.split(" ")[0];
  const initial = firstName[0]?.toUpperCase() ?? "?";

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <span className="crest">
            <BallCrest />
          </span>
          <div className="wordmark">
            <div className="l1">
              VM <em>2026</em>
            </div>
          </div>
        </div>
        <div className="user-chip">
          <span className="nm">{firstName}</span>
          <span className="av">{initial}</span>
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
        <button
          className="tab"
          role="tab"
          aria-selected={tab === "spilte"}
          onClick={() => setTab("spilte")}
        >
          <IconHistory /> Spilte kamper
        </button>
      </div>

      {tab === "tip" && <Matches onPick={predict} />}
      {tab === "tabell" && <Leaderboard />}
      {tab === "spilte" && <PlayedMatches />}

      {tab === "tip" && <Coupon predictions={predictions} />}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="crest" style={{ width: 40, height: 40 }}>
          <BallCrest />
        </span>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainView />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PredictionProvider>
          <AppRoutes />
        </PredictionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
