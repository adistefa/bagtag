import { describe, expect, it } from 'vitest'
import {
  RESULT_MODE_LABELS,
  canConfirmBattle,
  deriveRankingOrderFromScores,
  formatBattleScoreDisplay,
  getRankingScoreValidation,
  getScoreEntryState,
  moveListItemById,
  reorderFinishOrderByDrop,
  syncFinishOrderWithSelected,
} from './NewMatch'
import { redistributeTags } from '../utils/bagtag'

const roster = [
  { id: 1, name: 'Nathan', tag: 17 },
  { id: 2, name: 'Alessandro', tag: 5 },
  { id: 3, name: 'Lio', tag: 34 },
  { id: 4, name: 'Reto', tag: 12 },
]

function getPlayers(ids) {
  return ids.map((id) => roster.find((player) => player.id === id)).filter(Boolean)
}

describe('finish-order interaction helpers', () => {
  it('uses RANKING and SCORES labels for the two result modes', () => {
    expect(RESULT_MODE_LABELS).toEqual({ finish: 'RANKING', score: 'SCORES' })
  })

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

  it('keeps ranking order visible when switching between modes', () => {
    const validation = getRankingScoreValidation(getPlayers([1, 2, 3]), [2, 1, 3], { 1: '', 2: '', 3: '' })
    expect(validation.normalizedOrder).toEqual([2, 1, 3])
  })

  it('derives ranking from complete scores using ascending throws', () => {
    const derived = deriveRankingOrderFromScores(getPlayers([1, 2, 3]), { 1: 55, 2: 48, 3: 60 }, [1, 2, 3])
    expect(derived.status).toBe('complete')
    expect(derived.orderedIds).toEqual([2, 1, 3])
  })

  it('keeps scores attached to player IDs after reordering', () => {
    const scores = { 1: 55, 2: 48, 3: 60 }
    const order = [2, 1, 3]
    expect(scores[order[0]]).toBe(48)
    expect(scores[order[1]]).toBe(55)
    expect(scores[order[2]]).toBe(60)
  })

  it('detects ranking/score conflicts and blocks confirmation', () => {
    const validation = getRankingScoreValidation(getPlayers([1, 2, 3]), [1, 2, 3], { 1: 55, 2: 48, 3: 60 })
    expect(validation.canConfirm).toBe(false)
    expect(validation.warning?.type).toBe('score-conflict')
    expect(validation.warning?.body).toContain('Alessandro should rank higher')
  })

  it('removes conflict when order and scores agree again', () => {
    const validation = getRankingScoreValidation(getPlayers([1, 2, 3]), [2, 1, 3], { 1: 55, 2: 48, 3: 60 })
    expect(validation.canConfirm).toBe(true)
    expect(validation.warning).toBeNull()
  })

  it('supports ranking-only confirmation with blank scores', () => {
    const validation = getRankingScoreValidation(getPlayers([1, 2, 3]), [1, 2, 3], { 1: '', 2: '', 3: '' })
    expect(validation.modeKind).toBe('ranking-only')
    expect(validation.canConfirm).toBe(true)
  })

  it('treats partial score entry as unresolved and blocks confirmation', () => {
    const validation = getRankingScoreValidation(getPlayers([1, 2, 3]), [1, 2, 3], { 1: 55, 2: '', 3: '' })
    expect(validation.modeKind).toBe('partial')
    expect(validation.canConfirm).toBe(false)
    expect(validation.warning?.type).toBe('partial-score')
  })

  it('uses starting-tag tie-break when equal scores exist and tags are known', () => {
    const derived = deriveRankingOrderFromScores(getPlayers([1, 2]), { 1: 50, 2: 50 }, [1, 2])
    expect(derived.status).toBe('complete')
    expect(derived.orderedIds).toEqual([2, 1])
  })

  it('reports unresolved ties when score tie lacks required starting tags', () => {
    const players = [
      { id: 10, name: 'Unknown A', tag: null },
      { id: 11, name: 'Unknown B', tag: 9 },
    ]
    const validation = getRankingScoreValidation(players, [10, 11], { 10: 54, 11: 54 })
    expect(validation.canConfirm).toBe(false)
    expect(validation.warning?.type).toBe('tie-unresolved')
  })

  it('does not invent scores for blank entries', () => {
    const state = getScoreEntryState([1, 2, 3], { 1: '', 2: '', 3: '' })
    expect(state.isAllBlank).toBe(true)
    const derived = deriveRankingOrderFromScores(getPlayers([1, 2, 3]), { 1: '', 2: '', 3: '' }, [1, 2, 3])
    expect(derived.status).toBe('incomplete')
  })

  it('displays explicit zero score as Even', () => {
    const formatted = formatBattleScoreDisplay(0)
    expect(formatted.text).toBe('Even')
    expect(formatted.ariaLabel).toBe('Even')
    expect(formatted.isBlank).toBe(false)
  })

  it('keeps blank score display separate from Even', () => {
    const formatted = formatBattleScoreDisplay('')
    expect(formatted.text).toBe('—')
    expect(formatted.isBlank).toBe(true)
  })

  it('displays negative and positive scores with expected signs', () => {
    expect(formatBattleScoreDisplay(-3).text).toBe('−3')
    expect(formatBattleScoreDisplay(3).text).toBe('+3')
  })

  it('does not alter underlying numeric value when formatting score', () => {
    const score = 0
    const formatted = formatBattleScoreDisplay(score)
    expect(formatted.text).toBe('Even')
    expect(score).toBe(0)
  })

  it('keeps score mode confirmation compatibility helper for minimum participant count', () => {
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