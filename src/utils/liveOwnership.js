export function getOwnerDisplayName(row) {
  const displayName = typeof row?.display_name === 'string' ? row.display_name.trim() : ''
  if (displayName) return displayName

  const username = typeof row?.username === 'string' ? row.username.trim() : ''
  if (username) return username

  return null
}

export function mapLeaderboardRowsToOwners(rows = []) {
  const owners = new Map()
  const inconsistencies = []

  rows.forEach((row) => {
    const tag = Number(row?.tag_number)
    if (!Number.isFinite(tag)) return

    const resolvedName = getOwnerDisplayName(row)
    const username = typeof row?.username === 'string' ? row.username.trim() : ''
    const hasOwner = row?.player_id != null || resolvedName != null

    if (!hasOwner) return

    if (row?.player_id == null) {
      inconsistencies.push(`Tag #${tag} has owner name but missing player_id`)
    }

    owners.set(tag, {
      id: row?.player_id ?? null,
      name: resolvedName ?? '—',
      display_name: typeof row?.display_name === 'string' ? row.display_name.trim() : '',
      username,
      tag,
    })
  })

  return { owners, inconsistencies }
}

export function mapOwnersToBattlePlayers(owners = new Map()) {
  const sorted = [...owners.entries()].sort((a, b) => a[0] - b[0])
  const seen = new Set()
  const players = []
  const inconsistencies = []

  sorted.forEach(([tag, owner]) => {
    if (owner?.id == null) {
      inconsistencies.push(`Skipping tag #${tag}: missing player_id`)
      return
    }

    const key = String(owner.id)
    if (seen.has(key)) {
      inconsistencies.push(`Duplicate player ownership for player_id ${key}`)
      return
    }

    seen.add(key)
    players.push({
      id: owner.id,
      name: owner.name,
      display_name: owner.display_name,
      username: owner.username,
      tag,
    })
  })

  return { players, inconsistencies }
}
