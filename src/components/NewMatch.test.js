import { describe, expect, it } from 'vitest'
import {
  canConfirmBattle,
  moveListItemById,
  reorderFinishOrderByDrop,
  syncFinishOrderWithSelected,
} from './NewMatch'
import { redistributeTags } from '../utils/bagtag'

describe('finish-order interaction helpers', () => {
  it('moves a participant up by one position', () => {
    expect(moveListItemById([1, 2, 3, 4], 3, -1)).toEqual([1, 3, 2, 4])
  })

  it('moves a participant down by one position', () => {
    expect(moveListItemById([1, 2, 3, 4], 2, 1)).toEqual([1, 3, 2, 4])
  })

  it('prevents movement beyond first and last positions', () => {
    expect(moveListItemById([1, 2, 3], 1, -1)).toEqual([1, 2, 3])
    expect(moveListItemById([1, 2, 3], 3, 1)).toEqual([1, 2, 3])
  })

  it('drags a participant from first to last', () => {
    expect(reorderFinishOrderByDrop([1, 2, 3, 4], [1, 2, 3, 4], 1, 4, 'after')).toEqual([2, 3, 4, 1])
  })

  it('drags a participant from last to first', () => {
    expect(reorderFinishOrderByDrop([1, 2, 3, 4], [1, 2, 3, 4], 4, 1, 'before')).toEqual([4, 1, 2, 3])
  })

  it('keeps drag-and-arrow actions consistent for the same target order', () => {
    const viaArrows = moveListItemById(moveListItemById([1, 2, 3, 4], 4, -1), 4, -1)
    const viaDrag = reorderFinishOrderByDrop([1, 2, 3, 4], [1, 2, 3, 4], 4, 2, 'before')
    expect(viaArrows).toEqual([1, 4, 2, 3])
    expect(viaDrag).toEqual(viaArrows)
  })

  it('preserves player identities while reordering', () => {
    const next = reorderFinishOrderByDrop([11, 12, 13, 14], [11, 12, 13, 14], 11, 14, 'after')
    expect(next).toEqual([12, 13, 14, 11])
    expect([...next].sort((a, b) => a - b)).toEqual([11, 12, 13, 14])
  })

  it('preserves relative order when adding or removing participants', () => {
    expect(syncFinishOrderWithSelected([2, 1, 3], [2, 1, 3, 4])).toEqual([2, 1, 3, 4])
    expect(syncFinishOrderWithSelected([2, 1, 3, 4], [2, 4, 1])).toEqual([2, 1, 4])
  })

  it('keeps score mode confirmation behavior intact', () => {
    expect(canConfirmBattle([1, 2], 'score', { 1: 0, 2: 5 })).toBe(true)
    expect(canConfirmBattle([1], 'score', { 1: 0 })).toBe(false)
  })

  it('does not change battle tag redistribution behavior', () => {
    const players = [
      { id: 1, name: 'Nora', tag: 12, score: 0 },
      { id: 2, name: 'Ravi', tag: 7, score: 1 },
      { id: 3, name: 'Lio', tag: 34, score: 2 },
    ]
    const result = redistributeTags(players)
    expect(result.rankedPlayers.map((entry) => entry.newTag)).toEqual([7, 12, 34])
  })
})