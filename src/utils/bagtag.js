// Pure functions for BagTag calculations
export function computeRanking(players) {
  // players: array of {id, name, tag, score}
  return [...players].slice().sort((a, b) => a.score - b.score).map((p, i) => ({
    ...p,
    position: i + 1,
  }))
}

export function redistributeTags(players) {
  // players: array of {id, name, tag, score}
  // Returns { rankedPlayers: [{id,name,oldTag,newTag,score,position}], exchanges: [{tag,from,to}], kept: [playerId] }
  if (!Array.isArray(players) || players.length === 0) {
    return { rankedPlayers: [], exchanges: [], kept: [] }
  }

  // Sort by score ASC, then by starting tag ASC (tie-breaker)
  const ranked = [...players].slice().sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    return Number(a.tag) - Number(b.tag)
  })

  // Collect participating tags and sort numerically
  const tags = players.map((p) => Number(p.tag)).sort((a, b) => a - b)

  // Assign tags by index to ranked players
  const rankedPlayers = ranked.map((p, idx) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    position: idx + 1,
    oldTag: Number(p.tag),
    newTag: tags[idx],
  }))

  // Determine exchanges: for each player whose newTag != oldTag,
  // find original owner (among participants) of that newTag and emit transfer
  const exchanges = []
  rankedPlayers.forEach((rp) => {
    if (rp.oldTag !== rp.newTag) {
      const originalOwner = players.find((p) => Number(p.tag) === Number(rp.newTag))
      exchanges.push({ tag: rp.newTag, from: originalOwner ? originalOwner.name : null, to: rp.name })
    }
  })

  const kept = rankedPlayers.filter((r) => r.oldTag === r.newTag).map((r) => r.id)

  return { rankedPlayers, exchanges, kept }
}

export default { computeRanking, redistributeTags }
