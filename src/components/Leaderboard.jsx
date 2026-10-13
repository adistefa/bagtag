import React, { useEffect } from 'react'
import TagBadge from './TagBadge'
import { getPlayerDiscColorClass, getPlayerInitials } from '../utils/playerIdentityVisuals'

function TagRow({ tag, owner, index }) {
  const isAssigned = !!owner
  const displayName = isAssigned && typeof owner.name === 'string' && owner.name.trim() ? owner.name.trim() : 'Available'
  const rowTone = index % 2 === 0 ? 'tone-pine' : 'tone-moss'
  const discClass = isAssigned ? getPlayerDiscColorClass(owner) : ''
  const initials = isAssigned ? getPlayerInitials(owner) : ''

  return (
    <div className={`tag-row ${rowTone} ${isAssigned ? 'is-assigned' : 'is-unassigned'}`}>
      {isAssigned ? (
        <div className={`player-disc ${discClass}`} aria-hidden>{initials}</div>
      ) : (
        <div className="available-label">Available</div>
      )}
      <div className="tag-owner" title={displayName}>
        <div className="owner-name">{displayName}</div>
      </div>
      <TagBadge className="physical-tag-badge" number={tag} size={40} variant={isAssigned ? 'inactive' : 'unassigned'} />
    </div>
  )
}

const TOTAL_TAGS = 100

export default function Leaderboard({ owners = new Map(), loading = false, error = null, onOwnershipStatsChange }) {
  const tags = Array.from({ length: TOTAL_TAGS }, (_, i) => i + 1)

  useEffect(() => {
    if (typeof onOwnershipStatsChange !== 'function') return

    onOwnershipStatsChange({
      totalTags: TOTAL_TAGS,
      assignedCount: owners instanceof Map ? owners.size : 0,
      loading,
      error,
    })
  }, [onOwnershipStatsChange, owners, loading, error])

  return (
    <div className="leaderboard-list">
      {loading && <div className="loader">Loading tags…</div>}
      {error && <div className="error">Unable to load leaderboard — check console.</div>}
      {tags.map((t, index) => {
        const owner = owners instanceof Map ? owners.get(t) : undefined
        return <TagRow key={t} tag={t} owner={owner} index={index} />
      })}

      {!loading && owners instanceof Map && owners.size === 0 && (
        <div className="empty">No assigned tags found.</div>
      )}
    </div>
  )
}
