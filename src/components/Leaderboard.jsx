import React, { useEffect, useMemo, useState } from 'react'
import TagBadge from './TagBadge'
import { getPlayerDiscColorClass, getPlayerInitials } from '../utils/playerIdentityVisuals'
import {
  OWNER_GROUP,
  PLAYER_NAME_SORT_MODE,
  TAG_SORT_MODE,
  buildTagEntries,
  classifyOwner,
  sortTagEntries,
} from '../utils/leaderboardSort'

function TagRow({ tag, owner, index }) {
  const isAssigned = !!owner
  const displayName = isAssigned && typeof owner.name === 'string' && owner.name.trim() ? owner.name.trim() : 'Available'
  const rowTone = index % 2 === 0 ? 'tone-pine' : 'tone-moss'
  const discClass = isAssigned ? getPlayerDiscColorClass(owner) : ''
  const initials = isAssigned ? getPlayerInitials(owner) : ''

  return (
    <div className={`tag-row ${rowTone} ${isAssigned ? 'is-assigned' : 'is-unassigned'}`}>
      {isAssigned ? (
        <div className={`player-disc ${discClass}`} aria-hidden><span className="player-disc-initials">{initials}</span></div>
      ) : (
        <div className="available-label">Available</div>
      )}
      <div className="tag-owner" title={displayName}>
        <div className="owner-name">{displayName}</div>
      </div>
      <TagBadge className="physical-tag-badge" number={tag} size={44} variant={isAssigned ? 'inactive' : 'unassigned'} />
    </div>
  )
}

const TOTAL_TAGS = 100

const SORT_OPTIONS = [
  { key: TAG_SORT_MODE, label: 'TAG NUMBER' },
  { key: PLAYER_NAME_SORT_MODE, label: 'PLAYER NAME' },
]

function sortSectionLabel(group) {
  if (group === OWNER_GROUP.KNOWN) return 'CONFIRMED PLAYERS'
  if (group === OWNER_GROUP.UNKNOWN_OR_UNASSIGNED) return 'UNKNOWN / UNASSIGNED'
  return 'OWNERSHIP CONFLICTS'
}

export default function Leaderboard({ owners = new Map(), loading = false, error = null, onOwnershipStatsChange }) {
  const [sortMode, setSortMode] = useState(TAG_SORT_MODE)

  const sortedEntries = useMemo(() => {
    const entries = buildTagEntries(owners, TOTAL_TAGS)
    return sortTagEntries(entries, sortMode)
  }, [owners, sortMode])

  const groupedEntries = useMemo(() => {
    if (sortMode !== PLAYER_NAME_SORT_MODE) {
      return [{ key: 'all-tags', label: null, entries: sortedEntries }]
    }

    const byGroup = {
      [OWNER_GROUP.KNOWN]: [],
      [OWNER_GROUP.UNKNOWN_OR_UNASSIGNED]: [],
      [OWNER_GROUP.CONFLICT]: [],
    }

    sortedEntries.forEach((entry) => {
      const group = classifyOwner(entry.owner)
      byGroup[group].push(entry)
    })

    return [OWNER_GROUP.KNOWN, OWNER_GROUP.UNKNOWN_OR_UNASSIGNED, OWNER_GROUP.CONFLICT]
      .filter((group) => byGroup[group].length > 0)
      .map((group) => ({
        key: group,
        label: sortSectionLabel(group),
        entries: byGroup[group],
      }))
  }, [sortedEntries, sortMode])

  useEffect(() => {
    if (typeof onOwnershipStatsChange !== 'function') return

    onOwnershipStatsChange({
      totalTags: TOTAL_TAGS,
      assignedCount: owners instanceof Map ? owners.size : 0,
      loading,
      error,
    })
  }, [onOwnershipStatsChange, owners, loading, error])

  let rowIndex = -1

  return (
    <div className="leaderboard-list">
      <div className="leaderboard-header">
        <h2 className="leaderboard-title">BAGTAGS</h2>
        <div className="leaderboard-sort" role="group" aria-label="Bagtags sort order">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`leaderboard-sort-btn ${sortMode === option.key ? 'leaderboard-sort-btn--active' : ''}`}
              aria-pressed={sortMode === option.key}
              onClick={() => setSortMode(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="loader">Loading tags…</div>}
      {error && <div className="error">Unable to load leaderboard — check console.</div>}
      {groupedEntries.map((section) => (
        <React.Fragment key={section.key}>
          {section.label && <div className="leaderboard-group-label">{section.label}</div>}
          {section.entries.map((entry) => {
            rowIndex += 1
            return <TagRow key={entry.tag} tag={entry.tag} owner={entry.owner} index={rowIndex} />
          })}
        </React.Fragment>
      ))}

      {!loading && owners instanceof Map && owners.size === 0 && (
        <div className="empty">No assigned tags found.</div>
      )}
    </div>
  )
}
