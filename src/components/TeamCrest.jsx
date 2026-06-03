import { useState } from 'react'
import { getTeamInfo } from '../data/dummyData'
import { TEAM_CRESTS } from '../data/teamCrests'

export default function TeamCrest({ teamName }) {
  const [failed, setFailed] = useState(false)
  const src = TEAM_CRESTS[teamName]

  if (!src || failed) {
    const { code, disc, fg } = getTeamInfo(teamName)
    return (
      <span className="disc" style={{ background: disc, color: fg }}>
        {code}
      </span>
    )
  }

  return (
    <img
      className="team-crest"
      src={src}
      alt={teamName}
      onError={() => setFailed(true)}
    />
  )
}
