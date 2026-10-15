import { useMemo, useState } from 'react'
import TagBadge from './TagBadge'
import { getHistoricalArchive } from '../data/historicalArchive'
import { getPlayerDiscColorClass, getPlayerInitials } from '../utils/playerIdentityVisuals'

const LOCATION_ALIASES = {
  hh: 'Hardhof',
  h: 'Hardhof',
  hardhof: 'Hardhof',
}

function normalizeLocationForDisplay(value) {
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (!trimmed || trimmed === '-') return ''

  const normalizedKey = trimmed.toLowerCase()
  return LOCATION_ALIASES[normalizedKey] || trimmed
}

function comparableValue(value) {
  return typeof value === 'string' ? normalizeLocationForDisplay(value).toLowerCase() : ''
}

export function buildMatchLocationLabel(battle) {
  const location = normalizeLocationForDisplay(battle?.source_location)
  const event = typeof battle?.source_event_name === 'string' ? battle.source_event_name.trim() : ''
  const layout = typeof battle?.source_layout === 'string' ? battle.source_layout.trim() : ''

  const normalizedLocation = location.toLowerCase()
  const candidateLayout = layout && layout !== '-' ? layout : ''
  const candidateEvent = event && event !== '-' ? event : ''

  if (candidateLayout && comparableValue(candidateLayout) !== normalizedLocation) {
    return `${location} · ${candidateLayout}`
  }

  if (candidateEvent && comparableValue(candidateEvent) !== normalizedLocation) {
    return `${location} · ${candidateEvent}`
  }

  return location || candidateEvent || 'Unknown location'
}

function formatBattleDate(isoDate) {
  if (!isoDate) return 'Unknown date'
  const time = new Date(isoDate)
  if (Number.isNaN(time.getTime())) return isoDate
  return time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPosition(rank) {
  if (rank == null) return '—'
  const value = Number(rank)
  if (!Number.isFinite(value)) return '—'

  const remainder = value % 10
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? 'th' : remainder === 1 ? 'st' : remainder === 2 ? 'nd' : remainder === 3 ? 'rd' : 'th'
  return `${value}${suffix}`
}

function renderTagChange(participant) {
  const start = participant.starting_tag
  const end = participant.resulting_tag

  if (start == null || end == null) {
    return <span className="history-tag-capsule">recorded</span>
  }

  if (start === end) {
    return (
      <div className="history-tag-flow history-tag-flow--defended">
        <span className="history-tag-start">#{start}</span>
        <span className="history-tag-state">defended</span>
      </div>
    )
  }

  return (
    <div className="history-tag-flow">
      <span className="history-tag-start">#{start}</span>
      <span className="history-tag-arrow">→</span>
      <TagBadge number={end} size={52} variant="active" className="history-tag-result" />
    </div>
  )
}

export function filterHistoricalBattlesByPlayerName(battles, searchText) {
  const trimmed = typeof searchText === 'string' ? searchText.trim() : ''

  if (!trimmed) {
    return battles
  }

  const normalized = trimmed.toLowerCase()

  return battles.filter((battle) =>
    battle.participants.some((participant) => {
      const candidate = (participant.source_player_name || participant.normalized_player_name || '').toLowerCase()
      return candidate.includes(normalized)
    })
  )
}

export default function HistoricalBattleHistory() {
  const battles = useMemo(() => getHistoricalArchive(), [])
  const [playerSearch, setPlayerSearch] = useState('')

  const filteredBattles = useMemo(
    () => filterHistoricalBattlesByPlayerName(battles, playerSearch),
    [battles, playerSearch]
  )

  const hasSearch = playerSearch.trim() !== ''

  if (!battles.length) {
    return (
      <div className="history-view">
        <div className="section-sub">No historical archive matches available.</div>
      </div>
    )
  }

  return (
    <div className="history-view">
      <div className="search-area history-search-area">
        <div className="search-row">
          <input
            aria-label="Search historical player names"
            className="search-input battle-search-input"
            type="search"
            placeholder="Search players"
            value={playerSearch}
            onChange={(event) => setPlayerSearch(event.target.value)}
          />
          {hasSearch && (
            <button type="button" className="secondary battle-clear-btn" onClick={() => setPlayerSearch('')}>
              Clear
            </button>
          )}
        </div>
        <div className="history-search-meta">
          {hasSearch ? (
            filteredBattles.length === 1 ? '1 matching battle' : `${filteredBattles.length} matching battles`
          ) : (
            `${battles.length} historical battles`
          )}
        </div>
      </div>

      {hasSearch && filteredBattles.length === 0 ? (
        <div className="history-empty-state">No historical battles match this player search.</div>
      ) : (
        <div className="history-list">
          {filteredBattles.map((battle) => (
            <article key={battle.source_match_key} className="history-card">
              <div className="history-card-header">
                <div className="history-header-main">
                  <div className="history-date">{formatBattleDate(battle.source_match_date)}</div>
                  <div className="history-location">{buildMatchLocationLabel(battle)}</div>
                </div>
              </div>

              <div className="history-participant-list">
                {battle.participants.map((participant, index) => {
                  const playerName = participant.source_player_name || participant.normalized_player_name || 'Unknown player'
                  const discClass = getPlayerDiscColorClass({ name: playerName })
                  const initials = getPlayerInitials({ name: playerName })

                  return (
                    <div key={`${battle.source_match_key}-${participant.source_player_hash || playerName}-${index}`} className="history-participant-row">
                      <div className="history-position">{formatPosition(participant.finishing_rank ?? index + 1)}</div>
                      <div className={`player-disc ${discClass}`} aria-hidden><span className="player-disc-initials">{initials}</span></div>
                      <div className="history-player-meta">
                        <div className="history-player-name">{playerName}</div>
                      </div>
                      <div className="history-tag-wrap">{renderTagChange(participant)}</div>
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
