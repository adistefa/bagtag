import historicalBattles from '../../imports/staging/historical_battles.json'
import historicalParticipants from '../../imports/staging/historical_participants.json'

function toNumber(value, fallback = null) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function getHistoricalArchive() {
  const byMatchKey = new Map()

  for (const participant of historicalParticipants) {
    const key = participant.source_match_key
    if (!byMatchKey.has(key)) {
      byMatchKey.set(key, [])
    }
    byMatchKey.get(key).push(participant)
  }

  return historicalBattles
    .filter((battle) => battle.classification === 'import_ready' && battle.accepted_for_archive !== false)
    .map((battle) => {
      const participants = (byMatchKey.get(battle.source_match_key) || [])
        .map((participant) => ({ ...participant }))
        .sort((a, b) => {
          const rankA = toNumber(a.finishing_rank, Number.MAX_SAFE_INTEGER)
          const rankB = toNumber(b.finishing_rank, Number.MAX_SAFE_INTEGER)
          if (rankA !== rankB) return rankA - rankB
          return toNumber(a.participant_index, Number.MAX_SAFE_INTEGER) - toNumber(b.participant_index, Number.MAX_SAFE_INTEGER)
        })

      return {
        ...battle,
        sourceLabel: `${battle.source_system || 'historical'} · ${battle.source_name || battle.source_file_name || 'import'}`,
        matchDateMs: battle.source_match_date ? new Date(battle.source_match_date).getTime() : 0,
        participants,
      }
    })
    .sort((a, b) => b.matchDateMs - a.matchDateMs)
}
