import { getHistoricalArchive } from '../data/historicalArchive'

function asText(value) {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

function canonicalHistoricalPlayerName(value) {
  return asText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getPlayerTimelineIdentityKey(participant) {
  if (!participant || typeof participant !== 'object') return 'unknown-player'

  const explicitStableId = asText(
    participant.source_player_id ||
    participant.player_id ||
    participant.identity_key ||
    participant.participant_id ||
    participant.player_key
  )
  if (explicitStableId) return `player:${explicitStableId}`

  const normalized = canonicalHistoricalPlayerName(participant.normalized_player_name || participant.source_player_name)
  if (normalized) return `name:${normalized}`

  const hash = asText(participant.source_player_hash)
  if (hash) return `hash:${hash}`

  return 'unknown-player'
}

export function getPlayerDisplayLabel(participant) {
  const sourceName = asText(participant?.source_player_name)
  if (sourceName) return sourceName

  const normalizedName = asText(participant?.normalized_player_name)
  if (normalizedName) return normalizedName

  return 'Unknown player'
}

export function getHistoricalPlayerOptions(archive = getHistoricalArchive()) {
  const byIdentity = new Map()

  for (const battle of archive) {
    const participants = Array.isArray(battle?.participants) ? battle.participants : []

    for (const participant of participants) {
      const identityKey = getPlayerTimelineIdentityKey(participant)
      if (!byIdentity.has(identityKey)) {
        const canonicalName = canonicalHistoricalPlayerName(
          participant?.normalized_player_name || participant?.source_player_name || ''
        )
        byIdentity.set(identityKey, {
          id: identityKey,
          label: getPlayerDisplayLabel(participant),
          normalized: canonicalName,
          stableIdentity: asText(
            participant?.source_player_id ||
            participant?.player_id ||
            participant?.identity_key ||
            participant?.participant_id ||
            participant?.normalized_player_name ||
            participant?.source_player_name ||
            ''
          ),
          matchCount: 0,
        })
      }

      const current = byIdentity.get(identityKey)
      current.matchCount += 1
      if (!current.label || current.label === 'Unknown player') {
        current.label = getPlayerDisplayLabel(participant)
      }
    }
  }

  return Array.from(byIdentity.values())
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

export function searchHistoricalPlayers(players, queryText) {
  const trimmed = asText(queryText).toLowerCase()
  if (!trimmed) return players

  return players.filter((player) => {
    const label = asText(player?.label).toLowerCase()
    const normalized = asText(player?.normalized).toLowerCase()
    const stable = asText(player?.stableIdentity).toLowerCase()
    return label.includes(trimmed) || normalized.includes(trimmed) || stable.includes(trimmed)
  })
}

export function getPlayerTimelineEntries(playerId, archive = getHistoricalArchive()) {
  const events = []

  for (const battle of archive) {
    const matchedParticipants = (battle?.participants || []).filter((entry) => getPlayerTimelineIdentityKey(entry) === playerId)
    if (!matchedParticipants.length) continue

    for (const participant of matchedParticipants) {
      const matchDate = asText(battle?.source_match_date || battle?.source_recorded_at || battle?.source_date_raw)
      const parsedDate = matchDate ? new Date(matchDate) : null

      const startTag = participant.starting_tag == null ? null : Number(participant.starting_tag)
      const resultTag = participant.resulting_tag == null ? null : Number(participant.resulting_tag)
      const location = asText(battle?.source_location || battle?.source_event_name)

      events.push({
        playerId,
        matchKey: battle?.source_match_key || battle?.source_match_id || 'unknown-match',
        matchId: asText(battle?.source_match_id),
        dateIso: matchDate,
        dateMs: parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate.getTime() : 0,
        startTag,
        resultTag,
        location: location || 'Unknown location',
        eventLabel: battle?.source_event_name || 'Historical match',
        sourceRecordedAt: asText(battle?.source_recorded_at || battle?.source_date_raw),
        sourceRowReference: Array.isArray(battle?.source_row_reference) ? battle.source_row_reference : [],
        finishingRank: participant.finishing_rank == null ? null : Number(participant.finishing_rank),
      })
    }
  }

  return events.sort((a, b) => {
    if (a.dateMs !== b.dateMs) return a.dateMs - b.dateMs
    if (a.sourceRecordedAt && b.sourceRecordedAt) return a.sourceRecordedAt.localeCompare(b.sourceRecordedAt)
    return a.matchKey.localeCompare(b.matchKey)
  })
}

export function hasContinuityGap(events) {
  if (!Array.isArray(events) || events.length < 2) return false

  const validDates = events
    .map((event) => event.dateMs)
    .filter((value) => Number.isFinite(value) && value > 0)

  if (validDates.length < 2) return false

  const gaps = []
  for (let index = 1; index < validDates.length; index += 1) {
    const diffDays = (validDates[index] - validDates[index - 1]) / (1000 * 60 * 60 * 24)
    if (diffDays > 1) gaps.push(diffDays)
  }

  return gaps.length > 0
}
