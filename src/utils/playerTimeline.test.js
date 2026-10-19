import { describe, expect, it } from 'vitest'
import {
  buildOrthogonalTimelineSegments,
  getComparisonChartColors,
  getLatestSelectedTimelineEvent,
  getOrthogonalTimelineVisualSpec,
  getPointTagLabel,
  getTimelineChartLayout,
  toggleHistoricalPlayerSelection,
  togglePlayerFocus,
} from '../components/PlayerTimeline'
import { getPlayerDiscColorClass } from './playerIdentityVisuals'
import { getHistoricalPlayerOptions, getPlayerTimelineEntries, hasContinuityGap, getPlayerTimelineIdentityKey, searchHistoricalPlayers } from './playerTimeline'

describe('player timeline model', () => {
  const archive = [
    {
      source_match_key: 'hardhof:match-a',
      source_match_id: 'match-a',
      source_match_date: '2025-04-18T02:00:00.000Z',
      source_recorded_at: '2025-04-18T16:52:00.000Z',
      source_location: 'HH',
      participants: [
        { source_player_hash: 'hash-a', source_player_name: 'Alice Steiner', normalized_player_name: 'alice steiner', starting_tag: 12, resulting_tag: 7, finishing_rank: 1 },
        { source_player_hash: 'hash-b', source_player_name: 'Bob Martin', normalized_player_name: 'bob martin', starting_tag: 8, resulting_tag: 18, finishing_rank: 2 },
      ],
    },
    {
      source_match_key: 'hardhof:match-b',
      source_match_id: 'match-b',
      source_match_date: '2025-04-18T02:00:00.000Z',
      source_recorded_at: '2025-04-18T17:00:00.000Z',
      source_location: 'Hardhof',
      participants: [
        { source_player_hash: 'hash-a', source_player_name: 'Alice Steiner', normalized_player_name: 'alice steiner', starting_tag: null, resulting_tag: null, finishing_rank: 3 },
        { source_player_hash: 'hash-c', source_player_name: 'Charlie Ross', normalized_player_name: 'charlie ross', starting_tag: 14, resulting_tag: 10, finishing_rank: 1 },
      ],
    },
    {
      source_match_key: 'hardhof:match-c',
      source_match_id: 'match-c',
      source_match_date: '2025-06-17T02:00:00.000Z',
      source_recorded_at: '2025-06-17T12:00:00.000Z',
      source_location: 'Sibbe',
      participants: [
        { source_player_hash: 'hash-a', source_player_name: 'Alice Steiner', normalized_player_name: 'alice steiner', starting_tag: 9, resulting_tag: 6, finishing_rank: 2 },
      ],
    },
    {
      source_match_key: 'hardhof:match-d',
      source_match_id: 'match-d',
      source_match_date: '2025-09-01T02:00:00.000Z',
      source_recorded_at: '2025-09-01T08:00:00.000Z',
      source_location: 'Hardhof',
      participants: [
        { source_player_hash: 'hash-d', source_player_name: 'Alice Steiner', normalized_player_name: 'alice steiner', starting_tag: 6, resulting_tag: 4, finishing_rank: 1 },
      ],
    },
  ]

  it('groups players by stable identity, not by display name alone', () => {
    const players = getHistoricalPlayerOptions(archive)

    expect(players.map((player) => player.label)).toContain('Alice Steiner')
    expect(players.map((player) => player.id)).toContain('name:alice steiner')
    expect(getPlayerTimelineIdentityKey({ source_player_hash: 'hash:a', source_player_name: 'Alice Steiner', normalized_player_name: 'alice steiner' })).toBe('name:alice steiner')
  })

  it('orders historical events chronologically and preserves same-day ordering', () => {
    const events = getPlayerTimelineEntries('name:alice steiner', archive)

    expect(events.map((event) => event.matchId)).toEqual(['match-a', 'match-b', 'match-c', 'match-d'])
    expect(events[0].dateMs).toBeLessThanOrEqual(events[1].dateMs)
  })

  it('extracts the correct resulting tag and leaves missing values as unknown', () => {
    const events = getPlayerTimelineEntries('name:alice steiner', archive)

    expect(events[0].resultTag).toBe(7)
    expect(events[1].resultTag).toBeNull()
    expect(events[2].startTag).toBe(9)
    expect(events[2].resultTag).toBe(6)
  })

  it('detects continuity gaps without fabricating ownership', () => {
    const events = getPlayerTimelineEntries('name:alice steiner', archive)
    expect(hasContinuityGap(events)).toBe(true)
    expect(events.every((event) => event.currentTag === undefined)).toBe(true)
  })

  it('keeps distinct players with the same display label separate when explicit stable IDs differ', () => {
    const aliasArchive = [
      {
        source_match_key: 'm-match-1',
        source_match_id: 'm1',
        source_match_date: '2025-05-01T02:00:00.000Z',
        source_location: 'HH',
        participants: [
          { source_player_id: 'alex-mayer-1', source_player_hash: 'hash-1', source_player_name: 'Alex Mayer', normalized_player_name: 'alex mayer', starting_tag: 10, resulting_tag: 6 },
        ],
      },
      {
        source_match_key: 'm-match-2',
        source_match_id: 'm2',
        source_match_date: '2025-05-02T02:00:00.000Z',
        source_location: 'HH',
        participants: [
          { source_player_id: 'alex-mayer-2', source_player_hash: 'hash-2', source_player_name: 'Alex Mayer', normalized_player_name: 'alex mayer', starting_tag: 20, resulting_tag: 15 },
        ],
      },
    ]

    const players = getHistoricalPlayerOptions(aliasArchive)
    expect(players.filter((player) => player.label === 'Alex Mayer')).toHaveLength(2)
  })

  it('groups the same historical player across multiple matches into one selectable identity', () => {
    const andreasArchive = [
      {
        source_match_key: 'hardhof:m1',
        source_match_id: 'm1',
        source_match_date: '2025-04-18T02:00:00.000Z',
        source_location: 'HH',
        participants: [
          { source_player_hash: 'hash-1', source_player_name: 'Andreas DeBais', normalized_player_name: 'andreas debais', starting_tag: 12, resulting_tag: 7 },
        ],
      },
      {
        source_match_key: 'hardhof:m2',
        source_match_id: 'm2',
        source_match_date: '2025-04-19T02:00:00.000Z',
        source_location: 'Hardhof',
        participants: [
          { source_player_hash: 'hash-2', source_player_name: 'Andreas DeBais', normalized_player_name: 'andreas debais', starting_tag: 7, resulting_tag: 5 },
        ],
      },
      {
        source_match_key: 'hardhof:m3',
        source_match_id: 'm3',
        source_match_date: '2025-04-21T02:00:00.000Z',
        source_location: 'HH',
        participants: [
          { source_player_hash: 'hash-3', source_player_name: 'Andreas DeBais', normalized_player_name: 'andreas debais', starting_tag: 5, resulting_tag: 3 },
        ],
      },
    ]

    const samePlayer = getHistoricalPlayerOptions(andreasArchive)
    const andreas = samePlayer.filter((player) => player.label === 'Andreas DeBais')
    expect(andreas).toHaveLength(1)
    expect(andreas[0].matchCount).toBe(3)
    expect(getPlayerTimelineEntries(andreas[0].id, andreasArchive).length).toBe(3)
  })

  it('keeps source records immutable and treats missing identity values conservatively', () => {
    const archiveWithUnknown = [
      {
        source_match_key: 'm-unknown',
        source_match_id: 'm-unknown',
        source_match_date: '2025-08-01T02:00:00.000Z',
        source_location: 'HH',
        participants: [
          { source_player_hash: '', source_player_name: '', normalized_player_name: '', starting_tag: 12, resulting_tag: 9 },
        ],
      },
    ]

    const players = getHistoricalPlayerOptions(archiveWithUnknown)
    expect(players).toHaveLength(1)
    expect(players[0].id).toBe('unknown-player')
    expect(getPlayerTimelineEntries('unknown-player', archiveWithUnknown)).toHaveLength(1)
    expect(archiveWithUnknown[0].participants[0]).toEqual({
      source_player_hash: '',
      source_player_name: '',
      normalized_player_name: '',
      starting_tag: 12,
      resulting_tag: 9,
    })
  })

  it('maps time to chart pixels using a 24px-per-week scale and a right-side today boundary', () => {
    const events = [
      { matchKey: 'm1', dateMs: new Date('2025-01-01T00:00:00Z').getTime(), resultTag: 40 },
      { matchKey: 'm2', dateMs: new Date('2025-01-08T00:00:00Z').getTime(), resultTag: 20 },
      { matchKey: 'm3', dateMs: new Date('2025-01-15T00:00:00Z').getTime(), resultTag: 10 },
    ]

    const layout = getTimelineChartLayout(events, { todayMs: new Date('2025-01-20T00:00:00Z').getTime() })

    expect(layout.pixelsPerWeek).toBeCloseTo(24, 5)
    expect(layout.pixelsPerDay).toBeCloseTo(24 / 7, 5)
    expect(layout.points[0].x).toBeLessThan(layout.points[1].x)
    expect(layout.points[1].x).toBeLessThan(layout.points[2].x)
    expect(layout.todayX).toBeGreaterThan(layout.points[layout.points.length - 1].x)
    expect(layout.calendarLabels.some((label) => label.type === 'month')).toBe(true)
  })

  it('renders tag reference lines only inside the visible Y-axis domain', () => {
    const events = [
      { matchKey: 'm1', dateMs: new Date('2025-01-01T00:00:00Z').getTime(), resultTag: 8 },
      { matchKey: 'm2', dateMs: new Date('2025-01-08T00:00:00Z').getTime(), resultTag: 15 },
      { matchKey: 'm3', dateMs: new Date('2025-01-15T00:00:00Z').getTime(), resultTag: 22 },
      { matchKey: 'm4', dateMs: new Date('2025-01-22T00:00:00Z').getTime(), resultTag: 40 },
    ]

    const layout = getTimelineChartLayout(events)
    const tags = layout.referenceLines.map((line) => line.tag)

    expect(tags).toContain(10)
    expect(tags).toContain(20)
    expect(tags).toContain(40)
    expect(layout.referenceLines.every((line) => line.tag >= layout.minTag && line.tag <= layout.maxTag)).toBe(true)
    expect(layout.referenceLines.some((line) => line.tag === 40)).toBe(true)
  })


  it('supports list-row selection and max-three cap without replacing another selected player', () => {
    const selected = ['player-a', 'player-b']
    const add = toggleHistoricalPlayerSelection(selected, 'player-c')
    const tooMany = toggleHistoricalPlayerSelection(['player-a', 'player-b', 'player-c'], 'player-d')
    const toggleOff = toggleHistoricalPlayerSelection(['player-a', 'player-b'], 'player-b')

    expect(add.ids).toEqual(['player-a', 'player-b', 'player-c'])
    expect(add.exceeded).toBe(false)
    expect(tooMany.exceeded).toBe(true)
    expect(tooMany.ids).toEqual(['player-a', 'player-b', 'player-c'])
    expect(toggleOff.ids).toEqual(['player-a'])
    expect(toggleOff.toggledOff).toBe(true)
  })

  it('starts with no selected players and defaults the selected match to the latest documented event among them', () => {
    const empty = getLatestSelectedTimelineEvent([], archive)
    const latest = getLatestSelectedTimelineEvent(['name:alice steiner'], archive)

    expect(empty).toBeNull()
    expect(latest).not.toBeNull()
    expect(latest.matchKey).toBe('hardhof:match-d')
    expect(latest.playerId).toBe('name:alice steiner')
  })

  it('assigns distinct deterministic comparison colors across the selected set', () => {
    const colorsA = getComparisonChartColors(['player-b', 'player-a', 'player-c'])
    const colorsB = getComparisonChartColors(['player-c', 'player-a', 'player-b'])

    expect(Object.keys(colorsA)).toEqual(['player-a', 'player-b', 'player-c'])
    expect(colorsA).toEqual(colorsB)
    expect(colorsA['player-a']).toBeDefined()
    expect(colorsA['player-b']).toBeDefined()
    expect(colorsA['player-c']).toBeDefined()
    expect(colorsA['player-a']).toBe(getComparisonChartColors(['player-a'])['player-a'])
    expect(colorsA['player-b']).toBe(getComparisonChartColors(['player-b'])['player-b'])
    expect(colorsA['player-c']).toBe(getComparisonChartColors(['player-c'])['player-c'])
  })

  it('toggles player focus without changing selection membership', () => {
    expect(togglePlayerFocus('player-a', 'player-b')).toBe('player-b')
    expect(togglePlayerFocus('player-b', 'player-b')).toBe(null)
    expect(togglePlayerFocus(null, 'player-c')).toBe('player-c')
  })

  it('shows a temporary selected-point tag label and no permanent labels for ordinary points', () => {
    const events = [
      { matchKey: 'm1', playerId: 'player-a', dateMs: new Date('2025-01-01T00:00:00Z').getTime(), resultTag: 12 },
      { matchKey: 'm2', playerId: 'player-a', dateMs: new Date('2025-01-08T00:00:00Z').getTime(), resultTag: 20 },
    ]

    const layout = getTimelineChartLayout(events)
    const label = getPointTagLabel(layout.points[1], layout)

    expect(layout.points.every((point) => point.tagLabel === undefined)).toBe(true)
    expect(label).toBe('20')
  })

  it('keeps already-selected players visible while search filters the list', () => {
    const players = [
      { id: 'player-a', label: 'Alice Steiner', matchCount: 2 },
      { id: 'player-b', label: 'Bob Martin', matchCount: 3 },
      { id: 'player-c', label: 'Charlie Ross', matchCount: 1 },
    ]

    const filtered = searchHistoricalPlayers(players, 'alice')
    expect(filtered.map((player) => player.id)).toEqual(['player-a'])
    expect(players.some((player) => player.id === 'player-b')).toBe(true)
  })

  it('keeps a shared chronological axis and stable identity colors across selected players', () => {
    const events = [
      { playerId: 'player-a', playerLabel: 'Alice Steiner', dateMs: new Date('2025-01-03T00:00:00Z').getTime(), resultTag: 12 },
      { playerId: 'player-b', playerLabel: 'Bob Martin', dateMs: new Date('2025-01-06T00:00:00Z').getTime(), resultTag: 18 },
      { playerId: 'player-a', playerLabel: 'Alice Steiner', dateMs: new Date('2025-01-10T00:00:00Z').getTime(), resultTag: 8 },
      { playerId: 'player-b', playerLabel: 'Bob Martin', dateMs: new Date('2025-01-14T00:00:00Z').getTime(), resultTag: 22 },
    ]

    const layout = getTimelineChartLayout(events, { todayMs: new Date('2025-01-20T00:00:00Z').getTime() })
    expect(layout.series).toHaveLength(2)
    expect(layout.points[0].x).toBeLessThan(layout.points[1].x)
    expect(layout.calendarLabels.some((label) => label.type === 'month')).toBe(true)
    expect(getPlayerDiscColorClass({ id: 'player-a', name: 'Alice Steiner' })).toBe(getPlayerDiscColorClass({ id: 'player-a', name: 'Alice Steiner' }))
  })
  it('maps physical tag ranking with #1 at the top of the scale', () => {
    const events = [
      { matchKey: 'm1', dateMs: new Date('2025-01-01T00:00:00Z').getTime(), resultTag: 1 },
      { matchKey: 'm2', dateMs: new Date('2025-01-08T00:00:00Z').getTime(), resultTag: 10 },
      { matchKey: 'm3', dateMs: new Date('2025-01-15T00:00:00Z').getTime(), resultTag: 20 },
      { matchKey: 'm4', dateMs: new Date('2025-01-22T00:00:00Z').getTime(), resultTag: 40 },
      { matchKey: 'm5', dateMs: new Date('2025-01-29T00:00:00Z').getTime(), resultTag: 100 },
    ]

    const layout = getTimelineChartLayout(events)
    const yForTag = (tag) => layout.top + ((tag - layout.minTag) / Math.max(1, layout.maxTag - layout.minTag)) * layout.plotHeight

    expect(yForTag(1)).toBeLessThan(yForTag(10))
    expect(yForTag(10)).toBeLessThan(yForTag(20))
    expect(yForTag(20)).toBeLessThan(yForTag(40))
    expect(yForTag(40)).toBeLessThan(yForTag(100))
  })

  it('keeps same-day events individually addressable without fabricating continuity', () => {
    const events = [
      { matchKey: 'same-1', dateMs: new Date('2025-03-01T09:00:00Z').getTime(), resultTag: 30 },
      { matchKey: 'same-2', dateMs: new Date('2025-03-01T18:00:00Z').getTime(), resultTag: 20 },
      { matchKey: 'same-3', dateMs: new Date('2025-03-04T12:00:00Z').getTime(), resultTag: 10 },
    ]

    const layout = getTimelineChartLayout(events)

    expect(layout.points.map((point) => point.matchKey)).toEqual(['same-1', 'same-2', 'same-3'])
    expect(layout.points[0].x).toBeCloseTo(layout.points[1].x, 0)
    expect(layout.points[0].y).not.toBe(layout.points[1].y)
    expect(layout.referenceLines.some((line) => line.tag === 10)).toBe(true)
  })

  it('builds orthogonal segments with horizontal and vertical lines only', () => {
    const points = [
      { matchKey: 'm1', x: 10, y: 80, isUnknown: false },
      { matchKey: 'm2', x: 40, y: 80, isUnknown: false },
      { matchKey: 'm3', x: 80, y: 40, isUnknown: false },
    ]

    const segments = buildOrthogonalTimelineSegments(points)

    expect(segments.horizontalSegments).toEqual([
      { x1: 10, y1: 80, x2: 40, y2: 80 },
      { x1: 40, y1: 80, x2: 80, y2: 80 },
    ])
    expect(segments.verticalSegments).toEqual([
      { x1: 80, y1: 80, x2: 80, y2: 40 },
    ])

    const hasDiagonal = [...segments.horizontalSegments, ...segments.verticalSegments]
      .some((segment) => segment.x1 !== segment.x2 && segment.y1 !== segment.y2)
    expect(hasDiagonal).toBe(false)
  })

  it('uses requested stroke widths and point radius for orthogonal timeline visuals', () => {
    const spec = getOrthogonalTimelineVisualSpec()

    expect(spec.horizontalStrokeWidth).toBe(4)
    expect(spec.verticalStrokeWidth).toBe(1.5)
    expect(spec.pointRadius).toBe(4)
  })

  it('does not create false vertical movement for unchanged tags', () => {
    const points = [
      { matchKey: 'm1', x: 20, y: 60, isUnknown: false },
      { matchKey: 'm2', x: 50, y: 60, isUnknown: false },
    ]

    const segments = buildOrthogonalTimelineSegments(points)

    expect(segments.horizontalSegments).toHaveLength(1)
    expect(segments.verticalSegments).toHaveLength(0)
  })

  it('preserves data gaps by breaking continuity across unknown events', () => {
    const points = [
      { matchKey: 'm1', x: 10, y: 90, isUnknown: false },
      { matchKey: 'm2', x: 30, y: null, isUnknown: true },
      { matchKey: 'm3', x: 60, y: 50, isUnknown: false },
    ]

    const segments = buildOrthogonalTimelineSegments(points)

    expect(segments.horizontalSegments).toHaveLength(0)
    expect(segments.verticalSegments).toHaveLength(0)
    expect(segments.points.map((point) => point.matchKey)).toEqual(['m1', 'm3'])
  })

  it('keeps multiple players on distinct stable colors when their identity seeds differ', () => {
    const candidates = [
      'name:alice steiner',
      'name:bob martin',
      'name:charlie ross',
      'name:dario ulan',
      'name:eva meyer',
      'name:frank q',
      'name:gina lu',
      'name:hugo y',
    ]

    const colors = getComparisonChartColors(candidates)
    const distinctById = candidates
      .map((id) => ({ id, color: colors[id] }))
      .reduce((acc, entry) => {
        if (!acc.byColor.has(entry.color)) {
          acc.byColor.set(entry.color, entry.id)
          acc.ids.push(entry.id)
        }
        return acc
      }, { byColor: new Map(), ids: [] }).ids
      .slice(0, 3)

    expect(distinctById).toHaveLength(3)
    expect(new Set(distinctById.map((id) => colors[id])).size).toBe(3)
  })
})
