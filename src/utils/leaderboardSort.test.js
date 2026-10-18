import { describe, expect, it } from 'vitest'
import {
  OWNER_GROUP,
  PLAYER_NAME_SORT_MODE,
  TAG_SORT_MODE,
  buildTagEntries,
  classifyOwner,
  sortTagEntries,
} from './leaderboardSort'

function makeOwner(name, status = 'known', extra = {}) {
  return {
    name,
    status,
    ...extra,
  }
}

function tags(entries) {
  return entries.map((entry) => entry.tag)
}

describe('leaderboardSort', () => {
  it('keeps numeric ordering by default', () => {
    const owners = new Map([
      [10, makeOwner('Ten')],
      [1, makeOwner('One')],
      [100, makeOwner('Hundred')],
    ])

    const entries = buildTagEntries(owners, 100)
    const sorted = sortTagEntries(entries, TAG_SORT_MODE)

    expect(sorted[0].tag).toBe(1)
    expect(sorted[9].tag).toBe(10)
    expect(sorted[99].tag).toBe(100)
  })

  it('sorts #1, #10 and #100 numerically, not lexically', () => {
    const entries = [
      { tag: 100, owner: makeOwner('C') },
      { tag: 10, owner: makeOwner('B') },
      { tag: 1, owner: makeOwner('A') },
    ]

    const sorted = sortTagEntries(entries, TAG_SORT_MODE)
    expect(tags(sorted)).toEqual([1, 10, 100])
  })

  it('sorts confirmed owners alphabetically in player-name mode', () => {
    const entries = [
      { tag: 3, owner: makeOwner('Charlie') },
      { tag: 1, owner: makeOwner('Alice') },
      { tag: 2, owner: makeOwner('Bob') },
    ]

    const sorted = sortTagEntries(entries, PLAYER_NAME_SORT_MODE)
    expect(tags(sorted)).toEqual([1, 2, 3])
  })

  it('sorts case-insensitively', () => {
    const entries = [
      { tag: 2, owner: makeOwner('bravo') },
      { tag: 1, owner: makeOwner('Alpha') },
      { tag: 3, owner: makeOwner('CHARLIE') },
    ]

    const sorted = sortTagEntries(entries, PLAYER_NAME_SORT_MODE)
    expect(tags(sorted)).toEqual([1, 2, 3])
  })

  it('uses locale-aware collation for accented names', () => {
    const entries = [
      { tag: 1, owner: makeOwner('Åke') },
      { tag: 2, owner: makeOwner('Zoë') },
      { tag: 3, owner: makeOwner('Anders') },
    ]

    const sorted = sortTagEntries(entries, PLAYER_NAME_SORT_MODE, 'sv')
    expect(tags(sorted)).toEqual([3, 2, 1])
  })

  it('uses tag number as deterministic tie-breaker for identical names', () => {
    const entries = [
      { tag: 20, owner: makeOwner('Same Name') },
      { tag: 5, owner: makeOwner('Same Name') },
      { tag: 12, owner: makeOwner('Same Name') },
    ]

    const sorted = sortTagEntries(entries, PLAYER_NAME_SORT_MODE)
    expect(tags(sorted)).toEqual([5, 12, 20])
  })

  it('places unknown/unassigned after confirmed owners', () => {
    const entries = [
      { tag: 7, owner: makeOwner('Unknown owner', 'unknown') },
      { tag: 2, owner: makeOwner('Alice', 'known') },
      { tag: 3, owner: null },
    ]

    const sorted = sortTagEntries(entries, PLAYER_NAME_SORT_MODE)
    expect(tags(sorted)).toEqual([2, 3, 7])
  })

  it('keeps conflicts identifiable and sorted after unknown/unassigned', () => {
    const conflict11 = makeOwner('Conflict: Gregory Klisch / Lucas Wolharn', 'conflict', {
      conflictNames: ['Gregory Klisch', 'Lucas Wolharn'],
    })
    const conflict52 = makeOwner('Conflict: Thomi Seitz / Lukas Voellmy', 'conflict', {
      conflictNames: ['Thomi Seitz', 'Lukas Voellmy'],
    })

    const entries = [
      { tag: 52, owner: conflict52 },
      { tag: 1, owner: makeOwner('Alice', 'known') },
      { tag: 11, owner: conflict11 },
      { tag: 3, owner: makeOwner('Unknown owner', 'unknown') },
    ]

    const sorted = sortTagEntries(entries, PLAYER_NAME_SORT_MODE)
    expect(tags(sorted)).toEqual([1, 3, 11, 52])
    expect(classifyOwner(sorted[2].owner)).toBe(OWNER_GROUP.CONFLICT)
    expect(classifyOwner(sorted[3].owner)).toBe(OWNER_GROUP.CONFLICT)
  })

  it('keeps roster count unchanged between sort modes', () => {
    const owners = new Map([
      [1, makeOwner('Alice')],
      [2, makeOwner('Bob')],
      [3, makeOwner('Unknown owner', 'unknown')],
    ])

    const entries = buildTagEntries(owners, 100)
    const numeric = sortTagEntries(entries, TAG_SORT_MODE)
    const names = sortTagEntries(entries, PLAYER_NAME_SORT_MODE)

    expect(numeric).toHaveLength(100)
    expect(names).toHaveLength(100)
  })

  it('does not mutate source entry order or owner objects when sorting', () => {
    const original = [
      { tag: 2, owner: makeOwner('Bravo') },
      { tag: 1, owner: makeOwner('Alpha') },
      { tag: 3, owner: makeOwner('Conflict: A / B', 'conflict', { conflictNames: ['A', 'B'] }) },
    ]

    const snapshot = JSON.stringify(original)
    const sorted = sortTagEntries(original, PLAYER_NAME_SORT_MODE)

    expect(JSON.stringify(original)).toBe(snapshot)
    expect(sorted).not.toBe(original)
    expect(original[0].tag).toBe(2)
  })
})
