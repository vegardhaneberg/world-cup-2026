export default function AutofillModal({ onConfirm, onCancel, count }) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="modal">
        <div className="modal-header">
          <h3>Fyll inn manglende tips</h3>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>
            Alle åpne kamper uten tips vil få et tilfeldig resultat (H, U eller
            B). Kamper du allerede har tippa forblir uendret.
          </p>
          <button className="btn-accent" onClick={onConfirm}>
            Fyll inn
          </button>
          <button className="btn-secondary" onClick={onCancel}>
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
