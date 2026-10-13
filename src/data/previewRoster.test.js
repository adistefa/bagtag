import { describe, expect, it } from 'vitest'
import { getPreviewRosterStats, getPreviewRosterOwners, PREVIEW_DATA_SOURCE } from './previewRoster'

describe('preview roster', () => {
  it('uses the read-only CSV snapshot and preserves all 100 tags', () => {
    const owners = getPreviewRosterOwners()
    const stats = getPreviewRosterStats()

    expect(PREVIEW_DATA_SOURCE).toContain('current_bagtags.csv')
    expect(owners.size).toBe(100)
    expect(stats.totalTags).toBe(100)
    expect(stats.known).toBe(62)
    expect(stats.conflicting).toBe(2)
    expect(stats.unknown).toBe(36)
  })
})
