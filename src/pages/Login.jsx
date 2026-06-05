import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-crest">
          <BallCrest />
        </div>
        <div className="login-title">
          <span className="tl-vm">VM</span>
          <span className="tl-bongen">Bongen</span>
          <span className="cw-usa">2</span>
          <span className="tl-ball">
            <Football />
          </span>
          <span className="cw-can">2</span>
          <span className="cw-mex">6</span>
        </div>
        <div className="login-subtitle">Gjett sommerens VM-resultater!</div>
        <hr className="login-divider" />
        <button className="btn-google" onClick={() => login()}>
          <GoogleIcon />
          Logg inn med Google
        </button>
      </div>
    </div>
  );
}

function BallCrest() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{ width: "100%", height: "100%" }}
    >
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
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{ width: "100%", height: "100%" }}
    >
      <circle
        cx="16"
        cy="16"
        r="14.3"
        fill="#fdf3e7"
        stroke="#20283f"
        strokeWidth="2.4"
      />
      <polygon
        points="16,10.5 21.23,14.3 19.23,20.45 12.77,20.45 10.77,14.3"
        fill="#20283f"
      />
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
