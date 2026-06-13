import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usePredictions } from "../context/PredictionContext";
import { useMatches } from "../context/MatchContext";
import { isMatchLocked, isMatchHidden, getMatchPeriod } from "../data/matchUtils";
import { supabase } from "../lib/supabase";

const ADMIN_IDS = [
  "50313b35-75fc-4151-9b25-779044972015",
  "2a8bd764-066e-4262-b36b-209f7c05fe20",
];

export default function ProfileModal({ isOpen, onClose, showToast, message }) {
  const { user } = useAuth();
  const { predictions, predict, boosts } = usePredictions();
  const { matches } = useMatches();
  const isAdmin = ADMIN_IDS.includes(user?.id);
  const [adminMsg, setAdminMsg] = useState(message ?? "");

  useEffect(() => {
    if (isOpen) setAdminMsg(message ?? "");
  }, [isOpen]);

  if (!isOpen) return null;

  const fullName = user?.user_metadata?.full_name ?? user?.email ?? "Deg";
  const firstName = fullName.split(" ")[0];

  const unfilled = matches.filter((m) => !isMatchLocked(m) && !predictions[m.id]);

  const visibleMatches = matches.filter((m) => !isMatchHidden(m));
  const sorted = [...(visibleMatches.length ? visibleMatches : matches.filter((m) => m.date > Date.now()))].sort((a, b) => a.date - b.date);
  const currentPeriod = sorted.length ? getMatchPeriod(sorted[0]) : null;
  const boosterUsed = currentPeriod ? Object.values(boosts).includes(currentPeriod.key) : false;

  async function handlePublish() {
    const newMessage = adminMsg.trim() || null;
    const { error } = await supabase.from("announcement").update({
      message: newMessage,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }).eq("id", 1);
    if (error) {
      showToast("Noe gikk galt – prøv igjen");
    } else {
      showToast(newMessage ? "Melding publisert" : "Melding fjernet");
      onClose();
    }
  }

  async function handleAutofill() {
    const outcomes = ["home", "draw", "away"];
    let failed = false;
    for (const m of unfilled) {
      const outcome = outcomes[Math.floor(Math.random() * 3)];
      const err = await predict(m.id, outcome);
      if (err) failed = true;
    }
    onClose();
    if (failed) {
      showToast("Noen tips kunne ikke lagres – prøv igjen");
    } else {
      showToast(`${unfilled.length} tips ble fylt inn`);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h3>{firstName}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {currentPeriod && (
            <>
              <div className="booster-status">
                <span>⚡ {currentPeriod.label}</span>
                <span>{boosterUsed ? "· Brukt ✓" : "· Ikke brukt"}</span>
              </div>
              <hr className="modal-divider" />
            </>
          )}
          {unfilled.length > 0 ? (
            <>
              <p>Du har {unfilled.length} kamper uten tips</p>
              <button className="btn-accent" onClick={handleAutofill}>
                Autofyll kamper
              </button>
            </>
          ) : (
            <div className="all-tipped">
              <span className="all-tipped__icon">✓</span>
              <span>Alle kommende kamper er tippet</span>
            </div>
          )}
          {isAdmin && (
            <>
              <hr className="modal-divider" />
              <p className="modal-label">Infotekst til alle brukere</p>
              <textarea
                className="admin-msg-input"
                value={adminMsg}
                onChange={(e) => setAdminMsg(e.target.value)}
                placeholder="Skriv en melding… (tom = skjult)"
                maxLength={200}
                rows={3}
              />
              <button className="btn-accent" onClick={handlePublish}>
                Publiser melding
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
