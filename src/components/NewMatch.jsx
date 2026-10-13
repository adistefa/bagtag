import React, { useEffect, useRef, useState } from 'react'
import TagBadge from './TagBadge'
import { getPlayerDiscColorClass, getPlayerInitials } from '../utils/playerIdentityVisuals'

function AvailablePlayerRow({ player, onAdd }) {
  const discClass = getPlayerDiscColorClass(player)
  const initials = getPlayerInitials(player)

  return (
    <div
      className="available-player-row"
      onClick={() => onAdd(player.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onAdd(player.id)
      }}
    >
      <div className="available-player-left">
        <div className={`player-disc ${discClass}`} aria-hidden>{initials}</div>
        <div className="player-info">
          <div className="player-name">{player.name}</div>
        </div>
      </div>

      <div className="available-player-right">
        <TagBadge className="player-tag-badge" number={player.tag} size={36} variant="inactive" />
        <button
          className="available-add"
          onClick={(e) => {
            e.stopPropagation()
            onAdd(player.id)
          }}
          aria-label={`add ${player.name}`}
        >
          Add
        </button>
      </div>
    </div>
  )
}

function SelectedPlayerCard({ player, onRemove }) {
  const discClass = getPlayerDiscColorClass(player)
  const initials = getPlayerInitials(player)

  return (
    <div className="selected-player-card">
      <div className={`player-disc ${discClass}`} aria-hidden>{initials}</div>
      <div className="selected-player-info">
        <div className="player-name">{player.name}</div>
      </div>
      <TagBadge className="player-tag-badge" number={player.tag} size={36} variant="active" />
      <button className="selected-remove" onClick={() => onRemove(player.id)} aria-label={`remove ${player.name}`}>
        Remove
      </button>
    </div>
  )
}

export default function NewMatch({
  players = [],
  onPreview,
  onConfirm,
  previewResult,
  registerConfirm,
  playersLoading = false,
  playersError = null,
  dataInconsistencies = [],
}) {
  const [selected, setSelected] = useState([])
  const [scores, setScores] = useState({})
  const [resultMode, setResultMode] = useState('finish') // 'finish' | 'score'
  const [finishOrder, setFinishOrder] = useState([]) // array of player ids in finishing order
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  const [draggedFinishId, setDraggedFinishId] = useState(null)
  const [dropTargetFinishId, setDropTargetFinishId] = useState(null)
  const [dropPosition, setDropPosition] = useState('before')
  const finishOrderRef = useRef([])
  const selectedRef = useRef([])
  const dropTargetRef = useRef(null)
  const dropPositionRef = useRef('before')
  const dragPointerRef = useRef({ active: false, pointerId: null, draggedId: null })

  // Local-only battle context (preview mode)
  const [locations, setLocations] = useState(['Hardhof', 'Sibbe', 'Hinterhausen'])
  const [locationOpen, setLocationOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('Hardhof')

  const defaultCourses = {
    Hardhof: [{ name: '12 holes', holes: 12 }, { name: '18 holes', holes: 18 }],
    Sibbe: [{ name: '9 holes', holes: 9 }, { name: '18 holes', holes: 18 }],
    Hinterhausen: [{ name: '6 holes', holes: 6 }, { name: '18 holes', holes: 18 }],
  }
  const [coursesByLocation, setCoursesByLocation] = useState(defaultCourses)
  const [courseOpen, setCourseOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState('18 holes')
  const [selectedCourseHoles, setSelectedCourseHoles] = useState(18)

  const [holesPlayed, setHolesPlayed] = useState(selectedCourseHoles)
  const [eventText, setEventText] = useState('')
  const [variantText, setVariantText] = useState('')
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filteredPlayers = q === ''
    ? players
    : players.filter((p) => {
      const name = (p.name || p.display_name || p.username || '').toLowerCase()
      return name.includes(q)
    })
  const selectedPlayers = players.filter((p) => selected.includes(p.id))
  const availablePlayers = filteredPlayers.filter((p) => !selected.includes(p.id))
  const contextSummary = `${selectedLocation} · ${selectedCourse || `${selectedCourseHoles} holes`}`

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    finishOrderRef.current = finishOrder.filter((id) => selected.includes(id))
  }, [finishOrder, selected])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    const update = () => {
      const coarseMatch = mediaQuery.matches
      const touchSupport = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
      setIsCoarsePointer(coarseMatch || touchSupport)
    }

    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  // When location changes, update courses and defaults
  useEffect(() => {
    const courses = coursesByLocation[selectedLocation] || []
    // prefer an 18-holes course if available
    const preferred = courses.find((c) => c.holes === 18) || courses[0]
    if (preferred) {
      setSelectedCourse(preferred.name)
      setSelectedCourseHoles(preferred.holes)
      setHolesPlayed(preferred.holes)
    } else {
      setSelectedCourse('')
      setSelectedCourseHoles(0)
      setHolesPlayed(0)
    }
    // close dropdowns
    setLocationOpen(false)
    setCourseOpen(false)
  }, [selectedLocation, coursesByLocation])

  function addPlayer(id) {
    setSelected((current) => {
      if (current.includes(id)) return current

      setScores((prev) => ({ ...prev, [id]: prev[id] ?? 0 }))
      setFinishOrder((order) => (order.includes(id) ? order : [...order, id]))
      return [...current, id]
    })
  }

  function removePlayer(id) {
    setSelected((current) => current.filter((x) => x !== id))
    setFinishOrder((order) => order.filter((x) => x !== id))
  }

  // keep finishOrder in sync if selected array changes externally
  useEffect(() => {
    setFinishOrder((order) => {
      const kept = order.filter((id) => selected.includes(id))
      const appended = selected.filter((id) => !kept.includes(id))
      return [...kept, ...appended]
    })
  }, [selected])

  function setScore(id, v) {
    const n = v === '' ? '' : Number(v)
    setScores((s) => ({ ...s, [id]: n }))
  }

  function gatherSelected() {
    if (resultMode === 'finish') {
      // Use finishOrder as authoritative order. Assign synthetic scores 0..n-1 so redistribution sorts correctly.
      const ordered = finishOrder.filter((id) => selected.includes(id))
      return ordered.map((id, idx) => ({ ...players.find((p) => p.id === id), score: idx }))
    }
    // score mode: keep numeric scores as entered (default 0)
    return selected.map((id) => ({ ...players.find((p) => p.id === id), score: Number(scores[id] ?? 0) }))
  }

  function handlePreview() {
    const sel = gatherSelected()
    if (sel.length < 2) {
      alert('Select at least 2 players')
      return
    }
    if (sel.some((s) => !Number.isFinite(s.score))) {
      alert('Enter numeric scores for all selected players')
      return
    }
    onPreview && onPreview(sel)
  }

  function handleConfirm() {
    const sel = gatherSelected()
    if (sel.length < 2) {
      alert('Select at least 2 players')
      return
    }
    onConfirm && onConfirm(sel)
  }

  // expose preview action and whether confirm is enabled to parent via registerConfirm
  useEffect(() => {
    if (!registerConfirm) return

    const canConfirm = () => {
      if (selected.length < 2) return false
      if (resultMode === 'score') {
        return !selected.some((id) => !Number.isFinite(Number(scores[id] ?? 0)))
      }
      return true
    }

    const api = { canConfirm: canConfirm(), preview: () => handlePreview(), confirm: () => handleConfirm() }
    registerConfirm(api)
    return () => {
      registerConfirm(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, scores, resultMode, finishOrder])

  function reorderFinishOrder(fromIdx, toIdx) {
    setFinishOrder((order) => {
      const copy = [...order]
      const [item] = copy.splice(fromIdx, 1)
      copy.splice(toIdx, 0, item)
      return copy
    })
  }

  function moveFinish(id, dir) {
    setFinishOrder((order) => {
      const idx = order.indexOf(id)
      if (idx === -1) return order
      const to = Math.max(0, Math.min(order.length - 1, idx + dir))
      if (to === idx) return order
      const copy = [...order]
      const [item] = copy.splice(idx, 1)
      copy.splice(to, 0, item)
      return copy
    })
  }

  function commitPointerDrop(draggedId, targetId, position) {
    if (draggedId == null || targetId == null || draggedId === targetId) return

    setFinishOrder((order) => {
      const selectedSet = new Set(selectedRef.current)
      const ordered = order.filter((id) => selectedSet.has(id))
      if (!ordered.includes(draggedId) || !ordered.includes(targetId)) return order

      const withoutDragged = ordered.filter((id) => id !== draggedId)
      const targetIdx = withoutDragged.indexOf(targetId)
      if (targetIdx === -1) return order

      const insertIdx = position === 'after' ? targetIdx + 1 : targetIdx
      const nextOrdered = [...withoutDragged]
      nextOrdered.splice(insertIdx, 0, draggedId)

      const unselected = order.filter((id) => !selectedSet.has(id))
      return [...nextOrdered, ...unselected]
    })
  }

  function beginPointerDrag(e, draggedId) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()

    dragPointerRef.current = {
      active: true,
      pointerId: e.pointerId ?? null,
      draggedId,
    }

    setDraggedFinishId(draggedId)
    setDropTargetFinishId(draggedId)
    setDropPosition('before')
    dropTargetRef.current = draggedId
    dropPositionRef.current = 'before'
    document.body.classList.add('is-dragging-finish')
  }

  function updatePointerDrag(clientX, clientY) {
    if (!dragPointerRef.current.active) return

    const hit = document.elementFromPoint(clientX, clientY)
    const row = hit?.closest?.('.finish-row')

    if (!row) {
      setDropTargetFinishId(null)
      return
    }

    const targetKey = row.getAttribute('data-player-key')
    if (!targetKey) {
      setDropTargetFinishId(null)
      return
    }

    const rawId = finishOrderRef.current.find((id) => String(id) === targetKey)
    if (rawId == null) {
      setDropTargetFinishId(null)
      return
    }

    const rect = row.getBoundingClientRect()
    const isAfter = clientY > rect.top + rect.height / 2
    dropTargetRef.current = rawId
    dropPositionRef.current = isAfter ? 'after' : 'before'
    setDropTargetFinishId(rawId)
    setDropPosition(isAfter ? 'after' : 'before')
  }

  function endPointerDrag() {
    if (!dragPointerRef.current.active) return

    const { draggedId } = dragPointerRef.current
    commitPointerDrop(draggedId, dropTargetRef.current, dropPositionRef.current)

    dragPointerRef.current = { active: false, pointerId: null, draggedId: null }
    setDraggedFinishId(null)
    setDropTargetFinishId(null)
    setDropPosition('before')
    dropTargetRef.current = null
    dropPositionRef.current = 'before'
    document.body.classList.remove('is-dragging-finish')
  }

  useEffect(() => {
    const onPointerMove = (e) => {
      const drag = dragPointerRef.current
      if (!drag.active) return
      if (drag.pointerId != null && e.pointerId != null && drag.pointerId !== e.pointerId) return

      e.preventDefault()
      updatePointerDrag(e.clientX, e.clientY)
    }

    const onPointerUp = (e) => {
      const drag = dragPointerRef.current
      if (!drag.active) return
      if (drag.pointerId != null && e.pointerId != null && drag.pointerId !== e.pointerId) return
      // Fallback: if pointermove events were suppressed during touch pan, resolve drop target from pointerup location.
      updatePointerDrag(e.clientX, e.clientY)
      endPointerDrag()
    }

    const onPointerCancel = () => {
      if (!dragPointerRef.current.active) return
      endPointerDrag()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      document.body.classList.remove('is-dragging-finish')
    }
  }, [])

  return (
    <div className="new-battle-screen">
      <div className="preview-note">
        <div className="player-sub">Preview only. Results are not saved.</div>
      </div>

      <div className="battle-context-wrap">
        <div className="battle-context">
          <div className="context-section-head">
            <div>
              <div className="context-label">Battle context</div>
              <div className="context-summary">{contextSummary}</div>
            </div>
            <button className="secondary context-settings-toggle" onClick={() => setSettingsOpen((open) => !open)}>
              {settingsOpen ? 'Hide settings' : 'Edit settings'}
            </button>
          </div>

          {settingsOpen && (
            <div className="context-settings">
              <div className="context-row context-row-tight">
                <div className="context-label">LOCATION</div>
                <div className="context-value" onClick={() => setLocationOpen(!locationOpen)} role="button" tabIndex={0}>
                  {selectedLocation}
                </div>
              </div>
              {locationOpen && (
                <div className="context-list">
                  {locations.map((loc) => (
                    <div key={loc} className="context-item" onClick={() => setSelectedLocation(loc)}>{loc}</div>
                  ))}
                  <div
                    className="context-item add"
                    onClick={() => {
                      const name = window.prompt('New location name')
                      if (name && name.trim()) {
                        const n = name.trim()
                        setLocations((l) => [...l, n])
                        setCoursesByLocation((c) => ({ ...c, [n]: [{ name: '18 holes', holes: 18 }] }))
                        setSelectedLocation(n)
                      }
                    }}
                  >
                    + Add location
                  </div>
                </div>
              )}

              <div className="context-row context-row-tight">
                <div className="context-label">COURSE</div>
                <div className="context-value" onClick={() => setCourseOpen(!courseOpen)} role="button" tabIndex={0}>
                  {selectedCourse || '—'}
                </div>
              </div>
              {courseOpen && (
                <div className="context-list">
                  {(coursesByLocation[selectedLocation] || []).map((c) => (
                    <div
                      key={c.name}
                      className="context-item"
                      onClick={() => {
                        setSelectedCourse(c.name)
                        setSelectedCourseHoles(c.holes)
                        setHolesPlayed(c.holes)
                      }}
                    >
                      {c.name}
                    </div>
                  ))}
                  <div
                    className="context-item add"
                    onClick={() => {
                      const name = window.prompt('New course name (e.g. "Front 9")')
                      if (!name || !name.trim()) return
                      const holesStr = window.prompt('Holes for this course (number)')
                      const holesNum = Number(holesStr)
                      const entry = {
                        name: name.trim(),
                        holes: Number.isFinite(holesNum) && holesNum > 0 ? holesNum : 18,
                      }
                      setCoursesByLocation((c) => ({ ...c, [selectedLocation]: [...(c[selectedLocation] || []), entry] }))
                      setSelectedCourse(entry.name)
                      setSelectedCourseHoles(entry.holes)
                      setHolesPlayed(entry.holes)
                    }}
                  >
                    + Add course
                  </div>
                </div>
              )}

              <div className="context-row context-row-tight">
                <div className="context-label">HOLES PLAYED</div>
                <div className="context-value">
                  <input
                    className="battle-field battle-field--number"
                    type="number"
                    value={holesPlayed}
                    onChange={(e) => setHolesPlayed(Number(e.target.value || 0))}
                  />
                </div>
              </div>

              <div className="context-row context-row-tight context-row-optional">
                <div className="context-label">EVENT · OPTIONAL</div>
                <div className="context-value">
                  <input className="battle-field" type="text" placeholder="None" value={eventText} onChange={(e) => setEventText(e.target.value)} />
                </div>
              </div>

              <div className="context-row context-row-optional">
                <div className="context-label">VARIANT · OPTIONAL</div>
                <div className="context-value">
                  <input
                    className="battle-field"
                    type="text"
                    placeholder="e.g. T4 / T8 closed"
                    value={variantText}
                    onChange={(e) => setVariantText(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="search-area">
          <div className="context-headline">PLAYER SELECTION</div>
          <div className="search-row">
            <input className="search-input battle-search-input" placeholder="Search players" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search.trim() !== '' && (
              <button className="secondary battle-clear-btn" onClick={() => setSearch('')}>Clear</button>
            )}
          </div>
          {q !== '' && availablePlayers.length === 0 && (
            <div className="search-empty">No players match your search.</div>
          )}
        </div>

        <div className="player-results">
          {playersLoading && <div className="loader">Loading live players…</div>}
          {!playersLoading && playersError && <div className="error">Unable to load live players and tags.</div>}
          {!playersLoading && !playersError && players.length === 0 && (
            <div className="empty">No assigned players found in live ownership.</div>
          )}

          {availablePlayers.map((p) => (
            <AvailablePlayerRow key={p.id} player={p} onAdd={addPlayer} />
          ))}
          {availablePlayers.length === 0 && selectedPlayers.length > 0 && q === '' && (
            <div className="search-empty search-empty-all">All players are selected.</div>
          )}
        </div>

        {!playersLoading && !playersError && dataInconsistencies.length > 0 && (
          <div className="error" style={{ marginTop: 8 }}>
            Some live rows were skipped due to inconsistent player ownership data.
          </div>
        )}

        <div className="selected-panel">
          <div className="selected-head">
            <div className="context-headline">SELECTED PLAYERS</div>
            <div className="player-sub">{selectedPlayers.length} selected</div>
          </div>
          {selectedPlayers.length === 0 ? (
            <div className="selected-empty">Select at least two players to start a battle.</div>
          ) : (
            <div className="selected-list">
              {selectedPlayers.map((player) => (
                <SelectedPlayerCard key={player.id} player={player} onRemove={removePlayer} />
              ))}
            </div>
          )}
        </div>

        <div className="result-entry-panel">
          <div className="result-mode-row">
            <div className="context-headline">RESULT ENTRY</div>
            <div className="result-mode-actions">
              <button className={`bt-btn ${resultMode === 'finish' ? 'bt-btn--active' : ''}`} onClick={() => setResultMode('finish')}>FINISH ORDER</button>
              <button className={`bt-btn ${resultMode === 'score' ? 'bt-btn--active' : ''}`} onClick={() => setResultMode('score')}>SCORE</button>
            </div>
          </div>

          {resultMode === 'finish' && (
            <div style={{ marginBottom: 8 }}>
              <div className="player-sub" style={{ marginBottom: 8 }}>
                Drag and drop works on desktop; on touch devices use the arrow buttons to set final position.
              </div>
              <div className="finish-list">
                {finishOrder.filter((id) => selected.includes(id)).map((id, idx) => {
                  const p = players.find((pp) => pp.id === id)
                  if (!p) return null

                  const isActiveDrag = draggedFinishId === id
                  const isDropTarget = dropTargetFinishId === id && draggedFinishId != null && draggedFinishId !== id
                  const dropClass = isDropTarget ? (dropPosition === 'after' ? 'drop-after' : 'drop-before') : ''
                  return (
                    <div
                      key={id}
                      className={`finish-row ${isActiveDrag ? 'is-drag-active' : ''} ${dropClass}`.trim()}
                      data-player-key={String(id)}
                    >
                      <div className="pos-badge">{idx + 1}</div>
                      <div
                        className={`drag-handle ${isActiveDrag ? 'drag-handle--active' : ''}`.trim()}
                        onPointerDown={(e) => beginPointerDrag(e, id)}
                        role="button"
                        tabIndex={0}
                        aria-label={`drag ${p.name}`}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            moveFinish(id, -1)
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            moveFinish(id, +1)
                          }
                        }}
                      >
                        ☰
                      </div>
                      <div style={{ flex: 1, fontWeight: 700 }}>{p.name}</div>
                      <TagBadge className="player-tag-badge" number={p.tag} size={34} variant="inactive" />
                      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 8 }}>
                        <button className="score-btn" aria-label={`move up ${p.name}`} onClick={(e) => { e.stopPropagation(); moveFinish(id, -1) }}>▲</button>
                        <button className="score-btn" aria-label={`move down ${p.name}`} onClick={(e) => { e.stopPropagation(); moveFinish(id, +1) }}>▼</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {resultMode === 'score' && (
            <div className="score-entry-list">
              {selectedPlayers.map((p) => (
                <div key={p.id} className="score-entry-row">
                  <div className={`player-disc ${getPlayerDiscColorClass(p)}`} aria-hidden>{getPlayerInitials(p)}</div>
                  <div className="score-entry-name">{p.name}</div>
                  <TagBadge className="player-tag-badge" number={p.tag} size={34} variant="inactive" />
                  <div className="score-control" onClick={(e) => e.stopPropagation()}>
                    <button className="score-btn" aria-label={`decrease ${p.name} score`} onClick={(e) => { e.stopPropagation(); setScore(p.id, Number(scores[p.id] ?? 0) - 1) }}>−</button>
                    <div className="score-display">{(scores[p.id] === 0 || scores[p.id] === '0' || scores[p.id] == null) ? 'E' : (Number(scores[p.id]) > 0 ? `+${Number(scores[p.id])}` : String(Number(scores[p.id])))}</div>
                    <button className="score-btn" aria-label={`increase ${p.name} score`} onClick={(e) => { e.stopPropagation(); setScore(p.id, Number(scores[p.id] ?? 0) + 1) }}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewResult && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ margin: '6px 0' }}>Preview</h3>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {previewResult.rankedPlayers.map((r) => (
              <div key={r.id} className="result-player">
                <div className="result-left">
                  <div className="result-pos">{r.position}</div>
                  <div className="result-info">
                    <div className="result-name">{r.name}</div>
                    <div className="result-meta">score {r.score}</div>
                  </div>
                </div>
                <div className="tag-change">#{r.oldTag} → #{r.newTag}</div>
              </div>
            ))}
          </div>

          <div className="exchanges">
            <h4 style={{ margin: '8px 0' }}>Physical exchanges</h4>
            {previewResult.exchanges.length === 0 ? (
              <div className="player-sub">All players keep their tags.</div>
            ) : (
              previewResult.exchanges.map((ex, i) => (
                <div key={i} className="exchange">
                  <div className="exchange-num">#{String(ex.tag)}</div>
                  <div className="exchange-fromto">
                    <div style={{ fontWeight: 700 }}>{ex.from} → {ex.to}</div>
                    <div className="exchange-from">hand over</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
