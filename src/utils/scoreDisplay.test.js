import { describe, expect, it } from 'vitest'
import { formatBattleScoreDisplay } from './scoreDisplay'

describe('formatBattleScoreDisplay', () => {
  it('formats zero as Even and does not treat it as blank', () => {
    const result = formatBattleScoreDisplay(0)
    expect(result.isBlank).toBe(false)
    expect(result.text).toBe('Even')
  })

  it('formats negative values with unicode minus', () => {
    const result = formatBattleScoreDisplay(-1)
    expect(result.isBlank).toBe(false)
    expect(result.text).toBe('−1')
  })

  it('formats positive values with leading plus', () => {
    expect(formatBattleScoreDisplay(1).text).toBe('+1')
    expect(formatBattleScoreDisplay(12).text).toBe('+12')
  })

  it('keeps missing score blank', () => {
    const result = formatBattleScoreDisplay(null, { blankText: null, blankAriaLabel: null })
    expect(result.isBlank).toBe(true)
    expect(result.text).toBeNull()
  })
})
