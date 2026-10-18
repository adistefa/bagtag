import { useEffect, useMemo, useRef, useState } from 'react'
import { getHistoricalArchive } from '../data/historicalArchive'
import { buildMatchLocationLabel } from './HistoricalBattleHistory'

function formatBattleDate(isoDate) {
  if (!isoDate) return 'Unknown date'
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function normalizeTag(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  if (parsed < 1 || parsed > 100) return null
  return parsed
}

function buildTagEvents(archive, tagNumber) {
  const events = []

  archive.forEach((battle) => {
    const participants = Array.isArray(battle?.participants) ? battle.participants : []
    participants.forEach((participant) => {
      const startTag = participant?.starting_tag == null ? null : Number(participant.starting_tag)
      const resultTag = participant?.resulting_tag == null ? null : Number(participant.resulting_tag)

      if (startTag !== tagNumber && resultTag !== tagNumber) return

      const name = participant?.source_player_name || participant?.normalized_player_name || 'Unknown player'
      const relation = startTag === tagNumber && resultTag === tagNumber ? 'defended' : startTag === tagNumber ? 'moved-away' : 'moved-in'

      events.push({
        battleKey: battle?.source_match_key || `${battle?.source_match_date || 'unknown'}-${name}`,
        dateIso: battle?.source_match_date || '',
        location: buildMatchLocationLabel(battle),
        name,
        startTag,
        resultTag,
        relation,
      })
    })
  })

  return events.sort((left, right) => {
    const leftMs = left.dateIso ? new Date(left.dateIso).getTime() : 0
    const rightMs = right.dateIso ? new Date(right.dateIso).getTime() : 0
    return rightMs - leftMs
  })
}

export default function TagHistory({ selectedTag = null, onSelectTag }) {
  const archive = useMemo(() => getHistoricalArchive(), [])
  const normalizedTag = normalizeTag(selectedTag)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const triggerRef = useRef(null)
  const sheetRef = useRef(null)
  const touchStartYRef = useRef(0)

  const tagNumbers = useMemo(() => Array.from({ length: 100 }, (_, index) => index + 1), [])

  const visibleTagNumbers = useMemo(() => {
    const query = tagFilter.trim()
    if (!query) return tagNumbers

    return tagNumbers.filter((tag) => String(tag).includes(query))
  }, [tagFilter, tagNumbers])

  const events = useMemo(() => {
    if (normalizedTag == null) return []
    return buildTagEvents(archive, normalizedTag)
  }, [archive, normalizedTag])

  useEffect(() => {
    if (!selectorOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleWindowKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSelector()
        return
      }

      if (event.key !== 'Tab' || !sheetRef.current) return

      const focusables = Array.from(
        sheetRef.current.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')
      ).filter((element) => !element.hasAttribute('disabled'))

      if (!focusables.length) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown)
    requestAnimationFrame(() => {
      const activeButton = sheetRef.current?.querySelector('.tag-selector-grid-btn--active')
      const firstButton = sheetRef.current?.querySelector('.tag-selector-grid-btn')
      if (activeButton instanceof HTMLElement) {
        activeButton.focus()
        return
      }
      if (firstButton instanceof HTMLElement) {
        firstButton.focus()
      }
    })

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [selectorOpen])

  function openSelector() {
    setTagFilter('')
    setSelectorOpen(true)
  }

  function closeSelector() {
    setSelectorOpen(false)
    setTagFilter('')
    requestAnimationFrame(() => {
      triggerRef.current?.focus?.()
    })
  }

  function handleTagSelect(tagNumber) {
    if (typeof onSelectTag === 'function') {
      onSelectTag(tagNumber)
    }
    closeSelector()
  }

  const selectedTagLabel = normalizedTag == null ? 'SELECT TAG' : `#${normalizedTag}`
  const selectedTagMeta = normalizedTag == null
    ? 'Select a tag to explore its history.'
    : `Selected tag: #${normalizedTag}`
  const selectedTagCount = normalizedTag == null
    ? null
    : `${events.length} historical event${events.length === 1 ? '' : 's'}`

  return (
    <div className="history-view">
      <div className="tag-history-header">
        <h2 className="section-title">TAG JOURNEY</h2>
        <button
          ref={triggerRef}
          type="button"
          className="tag-selector-trigger"
          aria-haspopup="dialog"
          aria-expanded={selectorOpen}
          aria-label="Select tag"
          onClick={openSelector}
        >
          <span className="tag-selector-trigger-value">{selectedTagLabel}</span>
          <span className="tag-selector-trigger-caret" aria-hidden="true">▾</span>
        </button>
        <div className="section-sub tag-selector-sub">{selectedTagMeta}</div>
        {selectedTagCount ? <div className="section-sub">{selectedTagCount}</div> : null}
        {normalizedTag == null && (
          <div className="section-sub">Select a BAGTAG or open a direct link with a valid tag parameter (1-100).</div>
        )}
      </div>

      {normalizedTag == null ? null : !events.length ? (
        <div className="history-empty-state">No documented historical events were found for tag #{normalizedTag}.</div>
      ) : (
        <div className="history-list">
          {events.map((event, index) => (
            <article key={`${event.battleKey}-${event.name}-${index}`} className="history-card tag-history-card">
              <div className="history-card-header">
                <div className="history-header-main">
                  <div className="history-date">{formatBattleDate(event.dateIso)}</div>
                  <div className="history-location">{event.location || 'Unknown location'}</div>
                </div>
              </div>
              <div className="tag-history-row">
                <div className="tag-history-player">{event.name}</div>
                <div className="tag-history-move">
                  {event.startTag == null ? 'unknown' : `#${event.startTag}`}
                  <span className="tag-history-arrow" aria-hidden="true">→</span>
                  {event.resultTag == null ? 'unknown' : `#${event.resultTag}`}
                </div>
                <div className="tag-history-relation">{event.relation === 'defended' ? 'Defended tag' : event.relation === 'moved-away' ? 'Moved away from selected tag' : 'Moved into selected tag'}</div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectorOpen && (
        <div className="tag-selector-sheet-backdrop" onClick={closeSelector}>
          <div
            ref={sheetRef}
            className="tag-selector-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Select tag"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => { touchStartYRef.current = event.touches[0]?.clientY ?? 0 }}
            onTouchEnd={(event) => {
              const swipeDistance = (event.changedTouches[0]?.clientY ?? 0) - touchStartYRef.current
              if (swipeDistance > 80) {
                closeSelector()
              }
            }}
          >
            <div className="tag-selector-sheet-header">
              <div className="tag-selector-sheet-title">SELECT TAG</div>
              <button type="button" className="tag-selector-sheet-close" onClick={closeSelector} aria-label="Close tag selector">×</button>
            </div>

            <div className="tag-selector-sheet-search-wrap">
              <input
                type="search"
                inputMode="numeric"
                pattern="[0-9]*"
                className="search-input"
                aria-label="Filter tags"
                placeholder="Filter tag numbers"
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>

            <div className="tag-selector-grid" role="listbox" aria-label="Tag numbers 1 to 100">
              {visibleTagNumbers.map((tag) => {
                const isActive = normalizedTag === tag
                return (
                  <button
                    key={tag}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`tag-selector-grid-btn ${isActive ? 'tag-selector-grid-btn--active' : ''}`}
                    onClick={() => handleTagSelect(tag)}
                  >
                    #{tag}
                  </button>
                )
              })}

              {!visibleTagNumbers.length && (
                <div className="history-empty-state">No tag numbers match this filter.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
