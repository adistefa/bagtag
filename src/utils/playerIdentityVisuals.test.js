import { describe, expect, it } from 'vitest'
import {
  getPlayerDiscColorClass,
  getPlayerIdentitySeed,
  getPlayerInitials,
  normalizePlayerIdentityText,
} from './playerIdentityVisuals'

describe('playerIdentityVisuals', () => {
  it('normalizes name-based identity seeds across battle/history/timeline records', () => {
    const battlePlayer = { id: 'preview-tag-22', name: 'Marco Janisch' }
    const historyParticipant = { source_player_name: 'marco janisch' }
    const timelineOption = { id: 'name:marco janisch', name: 'Marco Janisch' }

    expect(getPlayerIdentitySeed(battlePlayer)).toBe('name:marco janisch')
    expect(getPlayerIdentitySeed(historyParticipant)).toBe('name:marco janisch')
    expect(getPlayerIdentitySeed(timelineOption)).toBe('name:marco janisch')

    expect(getPlayerDiscColorClass(battlePlayer)).toBe(getPlayerDiscColorClass(historyParticipant))
    expect(getPlayerDiscColorClass(historyParticipant)).toBe(getPlayerDiscColorClass(timelineOption))
  })

  it('treats accent variants as the same identity seed', () => {
    const accented = { name: 'René Engi' }
    const plain = { name: 'Rene Engi' }

    expect(normalizePlayerIdentityText('René Engi')).toBe('rene engi')
    expect(getPlayerDiscColorClass(accented)).toBe(getPlayerDiscColorClass(plain))
  })

  it('falls back to stable ids when no display name is available', () => {
    const player = { id: 'preview-tag-65', source_player_hash: 'hash-65' }
    expect(getPlayerIdentitySeed(player)).toBe('stable:hash 65')
  })

  it('derives initials from historical participant names', () => {
    const participant = { source_player_name: 'Chris Walker' }
    expect(getPlayerInitials(participant)).toBe('CW')
  })
})
