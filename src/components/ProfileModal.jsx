import { useAuth } from "../context/AuthContext";
import { usePredictions } from "../context/PredictionContext";
import { useMatches } from "../context/MatchContext";
import { isMatchLocked } from "../data/matchUtils";

export default function ProfileModal({ isOpen, onClose, showToast }) {
  const { user } = useAuth();
  const { predictions, predict } = usePredictions();
  const { matches } = useMatches();

  if (!isOpen) return null;

  const fullName = user?.user_metadata?.full_name ?? user?.email ?? "Deg";
  const firstName = fullName.split(" ")[0];

  const unfilled = matches.filter((m) => !isMatchLocked(m) && !predictions[m.id]);

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
        </div>
      </div>
    </div>
  );
}
