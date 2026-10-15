import { describe, expect, it } from 'vitest'
import { DEFAULT_MAIN_VIEW, HISTORY_TABS, MAIN_VIEW_ORDER, isHistoryView } from './navigation'
import { getAvailableRosterPlayers, getSearchMatches } from '../components/NewMatch'

describe('navigation state', () => {
  it('uses a three-item bottom nav and opens battle by default', () => {
    expect(DEFAULT_MAIN_VIEW).toBe('battle')
    expect(MAIN_VIEW_ORDER).toEqual(['battle', 'history', 'bagtags'])
  })

  it('keeps search results limited to unselected players', () => {
    const players = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]

    expect(getSearchMatches(players, [2], 'al')).toEqual([{ id: 1, name: 'Alice' }])
    expect(getAvailableRosterPlayers(players, [1])).toEqual([
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ])
  })

  it('keeps history subnavigation constrained to matches, players, and tags', () => {
    expect(HISTORY_TABS).toEqual(['matches', 'players', 'tags'])
    expect(isHistoryView('history')).toBe(true)
    expect(isHistoryView('bagtags')).toBe(false)
  })
})
