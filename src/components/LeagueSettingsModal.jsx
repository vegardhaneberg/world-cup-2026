import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LeagueSettingsModal({
  league,
  members,
  onClose,
  onLeagueUpdated,
  onMemberRemoved,
}) {
  const [name, setName] = useState(league.name);
  const [houseRules, setHouseRules] = useState(league.house_rules ?? "");
  const [saving, setSaving] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const inviteLink = `${window.location.origin}/join/${league.invite_token}`;

  // Empty save clears the rules (writes null). Save is enabled whenever the
  // trimmed value differs from what's stored — including text → empty.
  const storedRules = league.house_rules ?? "";
  const rulesChanged = houseRules.trim() !== storedRules;

  async function saveName() {
    if (!name.trim() || name.trim() === league.name) return;
    setSaving(true);
    const { error } = await supabase
      .from("leagues")
      .update({ name: name.trim() })
      .eq("id", league.id);
    if (!error) onLeagueUpdated({ ...league, name: name.trim() });
    setSaving(false);
  }

  async function saveHouseRules() {
    if (!rulesChanged) return;
    setSavingRules(true);
    const trimmed = houseRules.trim();
    const { error } = await supabase
      .from("leagues")
      .update({ house_rules: trimmed || null })
      .eq("id", league.id);
    if (!error) onLeagueUpdated({ ...league, house_rules: trimmed || null });
    setSavingRules(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function removeMember(userId) {
    setRemovingId(userId);
    const { error } = await supabase
      .from("league_members")
      .delete()
      .eq("league_id", league.id)
      .eq("user_id", userId);
    if (!error) onMemberRemoved(userId);
    setRemovingId(null);
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h3>Ligainnstillinger</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <label className="field-label">Liganavn</label>
          <div className="field-row">
            <input
              className="field-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={saveName}
              disabled={saving || !name.trim() || name.trim() === league.name}
            >
              {saving ? "…" : "Lagre"}
            </button>
          </div>

          <label className="field-label" style={{ marginTop: 20 }}>
            Husregler
          </label>
          <textarea
            className="field-input field-textarea"
            value={houseRules}
            onChange={(e) => setHouseRules(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="F.eks. Alle betaler vinneren 100 kr på slutten av turneringen."
          />
          <div className="field-textarea-footer">
            <span className="char-counter">{houseRules.length}/500</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={saveHouseRules}
              disabled={savingRules || !rulesChanged}
            >
              {savingRules ? "…" : "Lagre"}
            </button>
          </div>

          <label className="field-label" style={{ marginTop: 20 }}>
            Invitasjonslenke
          </label>
          <div className="invite-link-box">
            <span className="invite-link-text">{inviteLink}</span>
            <button type="button" className="btn-copy" onClick={copyLink}>
              {copied ? "✓ Kopiert" : "Kopier"}
            </button>
          </div>

          <label className="field-label" style={{ marginTop: 20 }}>
            Medlemmer
          </label>
          <div className="member-list">
            {members.map((m) => (
              <div key={m.user_id} className="member-row">
                <span className="member-name">
                  {m.full_name ?? m.email ?? "Ukjent"}
                </span>
                {m.user_id === league.created_by ? (
                  <span className="member-admin-tag">Admin</span>
                ) : (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeMember(m.user_id)}
                    disabled={removingId === m.user_id}
                  >
                    {removingId === m.user_id ? "…" : "Fjern"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
