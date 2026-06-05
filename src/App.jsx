import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  PredictionProvider,
  usePredictions,
} from "./context/PredictionContext";
import { MatchProvider } from "./context/MatchContext";
import { SpecialsProvider } from "./context/SpecialsContext";
import Login from "./pages/Login";
import Tipping from "./pages/Tipping";
import Ligaer from "./pages/Ligaer";
import Rules from "./pages/Rules";
import JoinPage from "./pages/JoinPage";

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

function Football() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.3" fill="#fdf3e7" stroke="#20283f" strokeWidth="2.4" />
      <polygon points="16,10.5 21.23,14.3 19.23,20.45 12.77,20.45 10.77,14.3" fill="#20283f" />
      <g stroke="#20283f" strokeWidth="2" strokeLinecap="round">
        <line x1="16" y1="10.5" x2="16" y2="2.5" />
        <line x1="21.23" y1="14.3" x2="28.84" y2="11.83" />
        <line x1="19.23" y1="20.45" x2="23.94" y2="26.92" />
        <line x1="12.77" y1="20.45" x2="8.06" y2="26.92" />
        <line x1="10.77" y1="14.3" x2="3.16" y2="11.83" />
      </g>
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

function IconBook() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h9a1 1 0 0 1 1 1v16a1 1 0 0 0-1-1H2z" />
      <path d="M22 3h-9a1 1 0 0 0-1 1v16a1 1 0 0 1 1-1h9z" />
    </svg>
  );
}

function MainView() {
  const { user } = useAuth();
  const { predict } = usePredictions();
  const [searchParams] = useSearchParams();
  const initialTab = ["ligaer", "regler"].includes(searchParams.get("tab")) ? searchParams.get("tab") : "tip";
  const [tab, setTab] = useState(initialTab);

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
              <span className="tl-vm">VM</span>
              <span className="tl-bongen">Bongen</span>
              <span className="cw-usa">2</span>
              <span className="tl-ball">
                <Football />
              </span>
              <span className="cw-can">2</span>
              <span className="cw-mex">6</span>
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
          aria-selected={tab === "ligaer"}
          onClick={() => setTab("ligaer")}
        >
          <IconTable /> Ligaer
        </button>
        <button
          className="tab"
          role="tab"
          aria-selected={tab === "regler"}
          onClick={() => setTab("regler")}
        >
          <IconBook /> Regler
        </button>
      </div>

      {tab === "tip" && <Tipping onPick={predict} />}
      {tab === "ligaer" && <Ligaer />}
      {tab === "regler" && <Rules />}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const pendingToken = localStorage.getItem('pendingJoinToken')
      if (pendingToken) {
        localStorage.removeItem('pendingJoinToken')
        navigate(`/join/${pendingToken}`, { replace: true })
      }
    }
  }, [user])

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
      <Route path="/join/:token" element={<JoinPage />} />
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
        <MatchProvider>
          <PredictionProvider>
            <SpecialsProvider>
              <AppRoutes />
            </SpecialsProvider>
          </PredictionProvider>
        </MatchProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
