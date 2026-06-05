import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function CreateLeagueModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single();

    if (leagueError) {
      setError("Kunne ikke opprette liga.");
      setSubmitting(false);
      return;
    }

    await supabase
      .from("league_members")
      .insert({ league_id: league.id, user_id: user.id });

    setInviteLink(`${window.location.origin}/join/${league.invite_token}`);
    setSubmitting(false);
    onCreated(league);
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h3>Opprett liga</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="modal-body">
            <label className="field-label">Liganavn</label>
            <input
              className="field-input"
              type="text"
              placeholder="F.eks. Kontoret '26"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={60}
            />
            {error && <p className="field-error">{error}</p>}
            <button
              type="submit"
              className="btn-accent"
              disabled={!name.trim() || submitting}
            >
              {submitting ? "Oppretter…" : "Opprett liga"}
            </button>
          </form>
        ) : (
          <div className="modal-body">
            <p className="create-success">Liga opprettet!</p>
            <label className="field-label">Del denne lenken med venner:</label>
            <div className="invite-link-box">
              <span className="invite-link-text">{inviteLink}</span>
              <button type="button" className="btn-copy" onClick={copyLink}>
                {copied ? "✓ Kopiert" : "Kopier"}
              </button>
            </div>
            <button
              type="button"
              className="btn-accent"
              onClick={onClose}
              style={{ marginTop: 16 }}
            >
              Ferdig
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
