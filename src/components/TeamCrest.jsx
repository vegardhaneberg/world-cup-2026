import { useState } from 'react'
import { getTeamInfo } from '../data/dummyData'
import { TEAM_CRESTS } from '../data/teamCrests'
import { getFotmobUrl } from '../data/fotmobIds'

export default function TeamCrest({ teamName, noLink = false }) {
  const [failed, setFailed] = useState(false)
  const src = TEAM_CRESTS[teamName]
  const fotmobUrl = getFotmobUrl(teamName)

  let crest
  if (!src || failed) {
    const { code, disc, fg } = getTeamInfo(teamName)
    crest = (
      <span className="disc" style={{ background: disc, color: fg }}>
        {code}
      </span>
    )
  } else {
    crest = (
      <img
        className="team-crest"
        src={src}
        alt={teamName}
        onError={() => setFailed(true)}
      />
    )
  }

  if (!fotmobUrl || noLink) return crest

  return (
    <a
      className="crest-link"
      href={fotmobUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`View ${teamName} on FotMob`}
      aria-label={`View ${teamName} on FotMob`}
    >
      {crest}
    </a>
  )
}
