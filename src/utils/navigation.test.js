import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAIN_VIEW,
  HISTORY_TABS,
  MAIN_VIEW_ORDER,
  buildNavigationUrl,
  isHistoryView,
  isSameDestination,
  readNavigationStateFromLocation,
} from './navigation'
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

  it('reads navigation state from URL for main and history destinations', () => {
    const historyUrl = new URL('https://example.test/?view=history&history=players')
    expect(readNavigationStateFromLocation(historyUrl)).toEqual({
      view: 'history',
      historyTab: 'players',
      historyPlayerId: null,
      historyTag: null,
    })

    const bagtagsUrl = new URL('https://example.test/?view=bagtags')
    expect(readNavigationStateFromLocation(bagtagsUrl)).toEqual({
      view: 'bagtags',
      historyTab: 'matches',
      historyPlayerId: null,
      historyTag: null,
    })

    const tagUrl = new URL('https://example.test/?view=history&history=tags&tag=34')
    expect(readNavigationStateFromLocation(tagUrl)).toEqual({
      view: 'history',
      historyTab: 'tags',
      historyPlayerId: null,
      historyTag: 34,
    })

    const invalidTagUrl = new URL('https://example.test/?view=history&history=tags&tag=999')
    expect(readNavigationStateFromLocation(invalidTagUrl)).toEqual({
      view: 'history',
      historyTab: 'tags',
      historyPlayerId: null,
      historyTag: null,
    })
  })

  it('builds compact URLs and keeps battle as root path', () => {
    const base = new URL('https://example.test/app?legacy=1#top')

    expect(buildNavigationUrl({ view: 'battle', historyTab: 'matches' }, base)).toBe('/app?legacy=1#top')
    expect(buildNavigationUrl({ view: 'bagtags', historyTab: 'matches' }, base)).toBe('/app?legacy=1&view=bagtags#top')
    expect(buildNavigationUrl({ view: 'history', historyTab: 'tags' }, base)).toBe('/app?legacy=1&view=history&history=tags#top')
    expect(buildNavigationUrl({ view: 'history', historyTab: 'tags', historyTag: 34 }, base)).toBe('/app?legacy=1&view=history&history=tags&tag=34#top')
    expect(buildNavigationUrl({ view: 'history', historyTab: 'players', historyPlayerId: 'name:chris walker' }, base)).toBe('/app?legacy=1&view=history&history=players&player=name%3Achris+walker#top')
  })

  it('compares destinations without duplicating equivalent entries', () => {
    expect(isSameDestination({ view: 'battle', historyTab: 'matches' }, { view: 'battle', historyTab: 'players' })).toBe(true)
    expect(isSameDestination({ view: 'history', historyTab: 'players' }, { view: 'history', historyTab: 'players' })).toBe(true)
    expect(isSameDestination({ view: 'history', historyTab: 'players' }, { view: 'history', historyTab: 'tags' })).toBe(false)
    expect(
      isSameDestination(
        { view: 'history', historyTab: 'players', historyPlayerId: 'name:chris walker' },
        { view: 'history', historyTab: 'players', historyPlayerId: 'name:chris walker' }
      )
    ).toBe(true)
    expect(
      isSameDestination(
        { view: 'history', historyTab: 'players', historyPlayerId: 'name:chris walker' },
        { view: 'history', historyTab: 'players', historyPlayerId: 'name:patrick schweizer' }
      )
    ).toBe(false)
    expect(
      isSameDestination(
        { view: 'history', historyTab: 'tags', historyTag: 34 },
        { view: 'history', historyTab: 'tags', historyTag: 34 }
      )
    ).toBe(true)
    expect(
      isSameDestination(
        { view: 'history', historyTab: 'tags', historyTag: 34 },
        { view: 'history', historyTab: 'tags', historyTag: 35 }
      )
    ).toBe(false)
  })
})
