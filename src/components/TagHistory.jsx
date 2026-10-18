import { useMemo } from 'react'
import { getHistoricalArchive } from '../data/historicalArchive'
import { buildMatchLocationLabel } from './HistoricalBattleHistory'

function formatBattleDate(isoDate) {
  if (!isoDate) return 'Unknown date'
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function normalizeTag(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  if (parsed < 1 || parsed > 100) return null
  return parsed
}

function buildTagEvents(archive, tagNumber) {
  const events = []

  archive.forEach((battle) => {
    const participants = Array.isArray(battle?.participants) ? battle.participants : []
    participants.forEach((participant) => {
      const startTag = participant?.starting_tag == null ? null : Number(participant.starting_tag)
      const resultTag = participant?.resulting_tag == null ? null : Number(participant.resulting_tag)

      if (startTag !== tagNumber && resultTag !== tagNumber) return

      const name = participant?.source_player_name || participant?.normalized_player_name || 'Unknown player'
      const relation = startTag === tagNumber && resultTag === tagNumber ? 'defended' : startTag === tagNumber ? 'moved-away' : 'moved-in'

      events.push({
        battleKey: battle?.source_match_key || `${battle?.source_match_date || 'unknown'}-${name}`,
        dateIso: battle?.source_match_date || '',
        location: buildMatchLocationLabel(battle),
        name,
        startTag,
        resultTag,
        relation,
      })
    })
  })

  return events.sort((left, right) => {
    const leftMs = left.dateIso ? new Date(left.dateIso).getTime() : 0
    const rightMs = right.dateIso ? new Date(right.dateIso).getTime() : 0
    return rightMs - leftMs
  })
}

export default function TagHistory({ selectedTag = null }) {
  const archive = useMemo(() => getHistoricalArchive(), [])
  const normalizedTag = normalizeTag(selectedTag)

  const events = useMemo(() => {
    if (normalizedTag == null) return []
    return buildTagEvents(archive, normalizedTag)
  }, [archive, normalizedTag])

  if (normalizedTag == null) {
    return (
      <div className="history-placeholder">
        <h2 className="section-title">TAG JOURNEY</h2>
        <div className="section-sub">Select a BAGTAG or open a direct link with a valid tag parameter (1-100).</div>
      </div>
    )
  }

  return (
    <div className="history-view">
      <div className="tag-history-header">
        <h2 className="section-title">TAG JOURNEY</h2>
        <div className="section-sub">Selected tag: #{normalizedTag}</div>
      </div>

      {!events.length ? (
        <div className="history-empty-state">No documented historical events were found for tag #{normalizedTag}.</div>
      ) : (
        <div className="history-list">
          {events.map((event, index) => (
            <article key={`${event.battleKey}-${event.name}-${index}`} className="history-card tag-history-card">
              <div className="history-card-header">
                <div className="history-header-main">
                  <div className="history-date">{formatBattleDate(event.dateIso)}</div>
                  <div className="history-location">{event.location || 'Unknown location'}</div>
                </div>
              </div>
              <div className="tag-history-row">
                <div className="tag-history-player">{event.name}</div>
                <div className="tag-history-move">
                  {event.startTag == null ? 'unknown' : `#${event.startTag}`}
                  <span className="tag-history-arrow" aria-hidden="true">→</span>
                  {event.resultTag == null ? 'unknown' : `#${event.resultTag}`}
                </div>
                <div className="tag-history-relation">{event.relation === 'defended' ? 'Defended tag' : event.relation === 'moved-away' ? 'Moved away from selected tag' : 'Moved into selected tag'}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
