import { describe, expect, it } from 'vitest'
import { mapOwnersToBattlePlayers } from './liveOwnership'

describe('liveOwnership', () => {
  it('ignores unknown rows and surfaces conflict warnings without dropping valid players', () => {
    const owners = new Map([
      [1, { id: 1, name: 'Alice', display_name: 'Alice', username: 'alice', status: 'known' }],
      [2, { id: null, name: 'Unknown owner', display_name: 'Unknown owner', username: '', status: 'unknown' }],
      [3, { id: null, name: 'Conflict owner', display_name: 'Conflict owner', username: '', status: 'conflict', conflictNames: ['Alice', 'Bob'] }],
      [4, { id: 2, name: 'Bob', display_name: 'Bob', username: 'bob', status: 'known' }],
    ])

    const battlePlayers = mapOwnersToBattlePlayers(owners)

    expect(battlePlayers.players.map((player) => player.id)).toEqual([1, 2])
    expect(battlePlayers.inconsistencies).toContain('Tag #3 has conflicting owners: Alice / Bob')
  })
})
