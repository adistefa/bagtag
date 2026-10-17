/* @vitest-environment jsdom */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import MatchResult from './MatchResult'

afterEach(() => {
  cleanup()
})

function buildResult(overrides = {}) {
  return {
    rankedPlayers: [
      { id: 'a', name: 'Alpha', position: 1, score: -2, oldTag: 9, newTag: 1 },
      { id: 'b', name: 'Bravo', position: 2, score: 0, oldTag: 1, newTag: 4 },
      { id: 'c', name: 'Charlie', position: 3, score: 3, oldTag: 4, newTag: 9 },
    ],
    exchanges: [
      { tag: 1, from: 'Bravo', to: 'Alpha' },
      { tag: 4, from: 'Charlie', to: 'Bravo' },
      { tag: 9, from: 'Alpha', to: 'Charlie' },
    ],
    ...overrides,
  }
}

describe('MatchResult score semantics', () => {
  it('shows SCORES labels as relative-to-par values', () => {
    render(<MatchResult result={buildResult()} />)

    expect(screen.getByText('−2')).toBeTruthy()
    expect(screen.getByText('Even')).toBeTruthy()
    expect(screen.getByText('+3')).toBeTruthy()
  })

  it('does not fabricate score labels for ranking-only results', () => {
    const rankingOnly = buildResult({
      rankedPlayers: [
        { id: 'a', name: 'Alpha', position: 1, score: null, oldTag: 9, newTag: 1 },
        { id: 'b', name: 'Bravo', position: 2, score: null, oldTag: 1, newTag: 4 },
        { id: 'c', name: 'Charlie', position: 3, score: null, oldTag: 4, newTag: 9 },
      ],
    })

    const { container } = render(<MatchResult result={rankingOnly} />)
    const metas = container.querySelectorAll('.result-meta')

    expect(metas.length).toBe(0)
    expect(screen.queryByText('Even')).toBeNull()
    expect(screen.queryByText('+3')).toBeNull()
    expect(screen.queryByText('0 throws')).toBeNull()
  })

  it('preserves finishing order and physical exchanges from the payload', () => {
    const { container } = render(<MatchResult result={buildResult()} />)

    const order = [...container.querySelectorAll('.result-player .result-name')].map((node) => node.textContent)
    expect(order).toEqual(['Alpha', 'Bravo', 'Charlie'])

    expect(screen.getByText('Bravo → Alpha')).toBeTruthy()
    expect(screen.getByText('Charlie → Bravo')).toBeTruthy()
    expect(screen.getByText('Alpha → Charlie')).toBeTruthy()
  })
})
