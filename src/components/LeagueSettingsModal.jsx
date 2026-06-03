import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LeagueSettingsModal({ league, members, onClose, onLeagueUpdated, onMemberRemoved }) {
  const [name, setName] = useState(league.name)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  const inviteLink = `${window.location.origin}/join/${league.invite_token}`

  async function saveName() {
    if (!name.trim() || name.trim() === league.name) return
    setSaving(true)
    const { error } = await supabase
      .from('leagues')
      .update({ name: name.trim() })
      .eq('id', league.id)
    if (!error) onLeagueUpdated({ ...league, name: name.trim() })
    setSaving(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function removeMember(userId) {
    setRemovingId(userId)
    const { error } = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', league.id)
      .eq('user_id', userId)
    if (!error) onMemberRemoved(userId)
    setRemovingId(null)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Ligainnstillinger</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label className="field-label">Lianavn</label>
          <div className="field-row">
            <input
              className="field-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={saveName}
              disabled={saving || !name.trim() || name.trim() === league.name}
            >
              {saving ? '…' : 'Lagre'}
            </button>
          </div>

          <label className="field-label" style={{ marginTop: 20 }}>Invitasjonslenke</label>
          <div className="invite-link-box">
            <span className="invite-link-text">{inviteLink}</span>
            <button type="button" className="btn-copy" onClick={copyLink}>
              {copied ? '✓ Kopiert' : 'Kopier'}
            </button>
          </div>

          <label className="field-label" style={{ marginTop: 20 }}>Medlemmer</label>
          <div className="member-list">
            {members.map(m => (
              <div key={m.user_id} className="member-row">
                <span className="member-name">{m.full_name ?? m.email ?? 'Ukjent'}</span>
                {m.user_id === league.created_by ? (
                  <span className="member-admin-tag">Admin</span>
                ) : (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeMember(m.user_id)}
                    disabled={removingId === m.user_id}
                  >
                    {removingId === m.user_id ? '…' : 'Fjern'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
