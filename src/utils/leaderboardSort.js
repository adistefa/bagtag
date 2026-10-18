export const TAG_SORT_MODE = 'tag-number'
export const PLAYER_NAME_SORT_MODE = 'player-name'

export const OWNER_GROUP = {
  KNOWN: 'known',
  UNKNOWN_OR_UNASSIGNED: 'unknown-or-unassigned',
  CONFLICT: 'conflict',
}

export function getOwnerDisplayName(owner) {
  if (!owner || typeof owner.name !== 'string') return ''
  return owner.name.trim()
}

export function classifyOwner(owner) {
  if (!owner) return OWNER_GROUP.UNKNOWN_OR_UNASSIGNED

  if (owner.status === 'conflict' || (Array.isArray(owner.conflictNames) && owner.conflictNames.length > 0)) {
    return OWNER_GROUP.CONFLICT
  }

  if (owner.status === 'unknown' || owner.status === 'unassigned') {
    return OWNER_GROUP.UNKNOWN_OR_UNASSIGNED
  }

  const name = getOwnerDisplayName(owner)
  if (!name || /^unknown owner$/i.test(name) || /^available$/i.test(name)) {
    return OWNER_GROUP.UNKNOWN_OR_UNASSIGNED
  }

  return OWNER_GROUP.KNOWN
}

export function buildTagEntries(owners, totalTags = 100) {
  const mapOwners = owners instanceof Map ? owners : new Map()

  return Array.from({ length: totalTags }, (_, index) => {
    const tag = index + 1
    return {
      tag,
      owner: mapOwners.get(tag),
    }
  })
}

function compareByTagNumber(a, b) {
  return a.tag - b.tag
}

function compareKnownByNameThenTag(a, b, collator) {
  const nameA = getOwnerDisplayName(a.owner)
  const nameB = getOwnerDisplayName(b.owner)
  const byName = collator.compare(nameA, nameB)
  if (byName !== 0) return byName
  return compareByTagNumber(a, b)
}

export function sortTagEntries(entries, sortMode, locale) {
  const clone = [...entries]

  if (sortMode !== PLAYER_NAME_SORT_MODE) {
    return clone.sort(compareByTagNumber)
  }

  const collator = new Intl.Collator(locale, {
    usage: 'sort',
    sensitivity: 'base',
  })

  const known = []
  const unknownOrUnassigned = []
  const conflicts = []

  clone.forEach((entry) => {
    const group = classifyOwner(entry.owner)
    if (group === OWNER_GROUP.KNOWN) {
      known.push(entry)
      return
    }

    if (group === OWNER_GROUP.CONFLICT) {
      conflicts.push(entry)
      return
    }

    unknownOrUnassigned.push(entry)
  })

  known.sort((a, b) => compareKnownByNameThenTag(a, b, collator))
  unknownOrUnassigned.sort(compareByTagNumber)
  conflicts.sort(compareByTagNumber)

  return [...known, ...unknownOrUnassigned, ...conflicts]
}
