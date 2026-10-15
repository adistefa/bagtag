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
        <div className={`player-disc ${discClass}`} aria-hidden><span className="player-disc-initials">{initials}</span></div>
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
      <div className={`player-disc ${discClass}`} aria-hidden><span className="player-disc-initials">{initials}</span></div>
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

function CompactSelectedPlayerTile({ player }) {
  const discClass = getPlayerDiscColorClass(player)
  const initials = getPlayerInitials(player)

  return (
    <div className="battle-results-grid-item">
      <div className={`player-disc battle-results-grid-disc ${discClass}`} aria-hidden>
        <span className="player-disc-initials">{initials}</span>
      </div>
      <div className="battle-results-grid-name">{player.name}</div>
    </div>
  )
}

export function moveListItemById(list, id, dir) {
  const idx = list.indexOf(id)
  if (idx === -1) return list
  const nextIndex = Math.max(0, Math.min(list.length - 1, idx + dir))
  if (nextIndex === idx) return list

  const clone = [...list]
  const [item] = clone.splice(idx, 1)
  clone.splice(nextIndex, 0, item)
  return clone
}

export function removeListItemById(list, id) {
  return list.filter((entry) => entry !== id)
}

export function syncFinishOrderWithSelected(order = [], selected = []) {
  const kept = order.filter((id) => selected.includes(id))
  const appended = selected.filter((id) => !kept.includes(id))
  return [...kept, ...appended]
}

export function reorderFinishOrderByDrop(order = [], selected = [], draggedId, targetId, position = 'before') {
  if (draggedId == null || targetId == null || draggedId === targetId) return order

  const selectedSet = new Set(selected)
  const orderedSelected = order.filter((id) => selectedSet.has(id))
  if (!orderedSelected.includes(draggedId) || !orderedSelected.includes(targetId)) return order

  const withoutDragged = orderedSelected.filter((id) => id !== draggedId)
  const targetIdx = withoutDragged.indexOf(targetId)
  if (targetIdx === -1) return order

  const insertIdx = position === 'after' ? targetIdx + 1 : targetIdx
  const nextOrderedSelected = [...withoutDragged]
  nextOrderedSelected.splice(insertIdx, 0, draggedId)

  const unselected = order.filter((id) => !selectedSet.has(id))
  return [...nextOrderedSelected, ...unselected]
}

export function getNumericScoreValue(scoreMap = {}, id) {
  const rawValue = scoreMap[id]
  if (rawValue === '' || rawValue == null) return 0

  const numeric = Number(rawValue)
  return Number.isFinite(numeric) ? numeric : 0
}

export const RESULT_MODE_LABELS = {
  finish: 'RANKING',
  score: 'SCORES',
}

function isBlankScoreValue(value) {
  return value === '' || value == null
}

function toFiniteScoreOrNull(value) {
  if (isBlankScoreValue(value)) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function hasKnownStartingTag(player) {
  const rawTag = player?.tag
  if (rawTag === '' || rawTag == null) return false
  return Number.isFinite(Number(rawTag))
}

export function canConfirmBattle(selectedIds = []) {
  return selectedIds.length >= 2
}

export function getScoreEntryState(selectedIds = [], scoreMap = {}) {
  const scoredIds = []
  const blankIds = []
  const invalidIds = []

  selectedIds.forEach((id) => {
    const raw = scoreMap[id]
    if (isBlankScoreValue(raw)) {
      blankIds.push(id)
      return
    }

    if (Number.isFinite(Number(raw))) {
      scoredIds.push(id)
      return
    }

    invalidIds.push(id)
  })

  const isAllBlank = blankIds.length === selectedIds.length
  const isComplete = scoredIds.length === selectedIds.length && invalidIds.length === 0
  const isPartial = !isAllBlank && !isComplete

  return {
    scoredIds,
    blankIds,
    invalidIds,
    isAllBlank,
    isComplete,
    isPartial,
  }
}

export function deriveRankingOrderFromScores(selectedPlayers = [], scoreMap = {}, selectedOrder = []) {
  const selectedIds = selectedPlayers.map((player) => player.id)
  const scoreState = getScoreEntryState(selectedIds, scoreMap)
  if (!scoreState.isComplete) {
    return { status: 'incomplete', orderedIds: selectedOrder }
  }

  const byId = new Map(selectedPlayers.map((player) => [player.id, player]))
  const orderIndex = new Map(selectedIds.map((id, index) => [id, index]))

  const tiedGroups = new Map()
  selectedIds.forEach((id) => {
    const score = Number(scoreMap[id])
    const key = String(score)
    const list = tiedGroups.get(key) || []
    list.push(id)
    tiedGroups.set(key, list)
  })

  for (const groupIds of tiedGroups.values()) {
    if (groupIds.length < 2) continue
    const missingTagPlayers = groupIds
      .map((id) => byId.get(id))
      .filter((player) => !hasKnownStartingTag(player))

    if (missingTagPlayers.length > 0) {
      return {
        status: 'tie-unresolved',
        orderedIds: selectedOrder,
        players: missingTagPlayers.map((player) => player?.name).filter(Boolean),
      }
    }
  }

  const orderedIds = [...selectedIds].sort((a, b) => {
    const scoreA = Number(scoreMap[a])
    const scoreB = Number(scoreMap[b])
    if (scoreA !== scoreB) return scoreA - scoreB

    const playerA = byId.get(a)
    const playerB = byId.get(b)
    const tagA = Number(playerA?.tag)
    const tagB = Number(playerB?.tag)
    if (tagA !== tagB) return tagA - tagB

    return (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0)
  })

  return { status: 'complete', orderedIds }
}

export function getRankingScoreValidation(selectedPlayers = [], finishOrder = [], scoreMap = {}) {
  const selectedIds = selectedPlayers.map((player) => player.id)
  const normalizedOrder = syncFinishOrderWithSelected(finishOrder, selectedIds)
  const byId = new Map(selectedPlayers.map((player) => [player.id, player]))

  if (selectedIds.length < 2) {
    return {
      canConfirm: false,
      disabledReason: 'Select at least 2 players.',
      normalizedOrder,
      scoreState: getScoreEntryState(selectedIds, scoreMap),
      warning: null,
      derivedOrder: null,
      modeKind: 'invalid',
    }
  }

  const scoreState = getScoreEntryState(selectedIds, scoreMap)
  if (scoreState.invalidIds.length > 0) {
    return {
      canConfirm: false,
      disabledReason: 'Scores must be numeric values.',
      normalizedOrder,
      scoreState,
      warning: {
        type: 'invalid-score',
        heading: 'Some scores are invalid',
        body: 'Enter numeric throw counts for all scored players.',
        action: 'edit-scores',
      },
      derivedOrder: null,
      modeKind: 'invalid',
    }
  }

  if (scoreState.isAllBlank) {
    return {
      canConfirm: true,
      disabledReason: null,
      normalizedOrder,
      scoreState,
      warning: null,
      derivedOrder: null,
      modeKind: 'ranking-only',
    }
  }

  if (scoreState.isPartial) {
    return {
      canConfirm: false,
      disabledReason: 'Complete all scores or clear partial score entry.',
      normalizedOrder,
      scoreState,
      warning: {
        type: 'partial-score',
        heading: 'Score entry is incomplete',
        body: 'Finish all throw counts or clear entered scores before confirming a ranking-only battle.',
        action: 'edit-scores',
      },
      derivedOrder: null,
      modeKind: 'partial',
    }
  }

  const derived = deriveRankingOrderFromScores(selectedPlayers, scoreMap, normalizedOrder)
  if (derived.status === 'tie-unresolved') {
    const unresolvedNames = derived.players?.slice(0, 2).join(' and ') || 'some players'
    return {
      canConfirm: false,
      disabledReason: 'Tie-break requires known starting tags.',
      normalizedOrder,
      scoreState,
      warning: {
        type: 'tie-unresolved',
        heading: 'Tie-break cannot be resolved',
        body: `Equal throws for ${unresolvedNames}, but at least one starting tag is missing.`,
        action: 'edit-scores',
      },
      derivedOrder: null,
      modeKind: 'tie-unresolved',
    }
  }

  const derivedOrder = derived.orderedIds || normalizedOrder
  const mismatchIndex = normalizedOrder.findIndex((id, idx) => id !== derivedOrder[idx])
  if (mismatchIndex !== -1) {
    const rankedPlayer = byId.get(normalizedOrder[mismatchIndex])
    const expectedPlayer = byId.get(derivedOrder[mismatchIndex])
    const rankedThrows = toFiniteScoreOrNull(scoreMap[rankedPlayer?.id])
    const expectedThrows = toFiniteScoreOrNull(scoreMap[expectedPlayer?.id])
    const rankedName = rankedPlayer?.name || 'This player'
    const expectedName = expectedPlayer?.name || 'another player'

    return {
      canConfirm: false,
      disabledReason: 'Ranking and scores do not match.',
      normalizedOrder,
      scoreState,
      warning: {
        type: 'score-conflict',
        heading: "Ranking and scores don't match",
        body: `${rankedName} has ${rankedThrows} throws, ${expectedName} has ${expectedThrows}. ${expectedName} should rank higher.`,
        action: 'edit-scores',
      },
      derivedOrder,
      modeKind: 'scored-conflict',
    }
  }

  return {
    canConfirm: true,
    disabledReason: null,
    normalizedOrder,
    scoreState,
    warning: null,
    derivedOrder,
    modeKind: 'scored-valid',
  }
}

export function matchesPlayerSearch(player, query) {
  const normalizedQuery = String(query ?? '').trim().toLowerCase()
  if (!normalizedQuery) return true

  const searchableFields = [
    player?.name,
    player?.display_name,
    player?.username,
    player?.tag != null ? String(player.tag) : '',
  ]
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map((value) => String(value).trim().toLowerCase())

  return searchableFields.some((value) => value.includes(normalizedQuery))
}

export function getAvailableRosterPlayers(players, selectedIds = []) {
  const selectedSet = new Set(selectedIds)
  return players.filter((player) => !selectedSet.has(player.id))
}

export function getContextSummaryParts({
  selectedLocation,
  selectedCourse,
  selectedCourseHoles,
  holesPlayed,
  eventText,
  variantText,
}) {
  const locationValue = String(selectedLocation ?? '').trim() || 'Location'
  const courseValue = String(selectedCourse ?? '').trim() || (Number.isFinite(selectedCourseHoles) && selectedCourseHoles > 0 ? `${selectedCourseHoles} holes` : 'Course')
  const primary = `${locationValue} · ${courseValue}`

  const eventValue = String(eventText ?? '').trim()
  const variantValue = String(variantText ?? '').trim()
  const holesDifferent = Number.isFinite(Number(holesPlayed)) && Number.isFinite(Number(selectedCourseHoles)) && Number(holesPlayed) !== Number(selectedCourseHoles)

  const details = []

  if (eventValue) {
    details.push(eventValue)
  } else if (!variantValue && !holesDifferent) {
    details.push('No event', 'Standard round')
  } else {
    details.push('No event')
  }

  if (variantValue) {
    details.push(variantValue)
  }

  if (holesDifferent) {
    details.push(`${Number(holesPlayed)} holes`)
  }

  return {
    primary,
    secondary: details.length > 0 ? details.join(' · ') : 'Standard round',
  }
}

export function getSearchMatches(players, selectedIds, query) {
  const normalizedQuery = String(query ?? '').trim()
  if (!normalizedQuery) return []

  const selectedSet = new Set(selectedIds)
  return players.filter((player) => !selectedSet.has(player.id) && matchesPlayerSearch(player, normalizedQuery))
}

export function getRosterMatches(players, selectedIds, query, showAllPlayers) {
  const normalizedQuery = String(query ?? '').trim()
  if (normalizedQuery) return []
  if (!showAllPlayers) return []

  return getAvailableRosterPlayers(players, selectedIds)
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
  const searchInputRef = useRef(null)
  const searchAreaRef = useRef(null)
  const playerResultsRef = useRef(null)
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
  const dragHandleRef = useRef(null)
  const scoreEditOriginRef = useRef(false)

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
  const [showAllPlayers, setShowAllPlayers] = useState(false)
  const [warningOpen, setWarningOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchResultsMaxHeight, setSearchResultsMaxHeight] = useState(null)
  const [isCompactViewport, setIsCompactViewport] = useState(false)

  const q = search.trim().toLowerCase()
  const selectedPlayers = players.filter((p) => selected.includes(p.id))
  const searchMatches = getSearchMatches(players, selected, search)
  const rosterMatches = getRosterMatches(players, selected, search, showAllPlayers)
  const availableRosterPlayers = getAvailableRosterPlayers(players, selected)
  const rosterIsExhausted = availableRosterPlayers.length === 0
  const isSearchExperimentActive = (isCoarsePointer || isCompactViewport) && (searchFocused || q !== '')
  const selectedSummaryCountText = `${selectedPlayers.length} PLAYER${selectedPlayers.length === 1 ? '' : 'S'}`
  const selectedSummaryHasOverflow = selectedPlayers.length > 4
  const contextSummary = getContextSummaryParts({
    selectedLocation,
    selectedCourse,
    selectedCourseHoles,
    holesPlayed,
    eventText,
    variantText,
  })

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    if (!searchInputRef.current) return

    const input = searchInputRef.current
    const focusInput = () => {
      if (typeof window === 'undefined') return
      window.requestAnimationFrame(() => {
        input.focus()
      })
    }

    focusInput()
  }, [])

  useEffect(() => {
    if (!isSearchExperimentActive) {
      setSearchResultsMaxHeight(null)
      return
    }

    const updateSearchResultsHeight = () => {
      if (!searchAreaRef.current) return

      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const searchRect = searchAreaRef.current.getBoundingClientRect()
      const availableHeight = Math.floor(viewportHeight - searchRect.bottom - 24)
      const safeHeight = Math.max(140, availableHeight)
      setSearchResultsMaxHeight(safeHeight)
    }

    updateSearchResultsHeight()

    const visualViewport = window.visualViewport
    if (visualViewport) {
      visualViewport.addEventListener('resize', updateSearchResultsHeight)
      visualViewport.addEventListener('scroll', updateSearchResultsHeight)
    }
    window.addEventListener('resize', updateSearchResultsHeight)

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updateSearchResultsHeight)
        visualViewport.removeEventListener('scroll', updateSearchResultsHeight)
      }
      window.removeEventListener('resize', updateSearchResultsHeight)
    }
  }, [isSearchExperimentActive, selectedPlayers.length, q, showAllPlayers])

  useEffect(() => {
    finishOrderRef.current = finishOrder.filter((id) => selected.includes(id))
  }, [finishOrder, selected])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    const compactQuery = window.matchMedia('(max-width: 560px)')
    const update = () => {
      const coarseMatch = mediaQuery.matches
      const compactMatch = compactQuery.matches
      const touchSupport = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
      setIsCoarsePointer(coarseMatch || touchSupport)
      setIsCompactViewport(compactMatch)
    }

    update()
    mediaQuery.addEventListener('change', update)
    compactQuery.addEventListener('change', update)
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      mediaQuery.removeEventListener('change', update)
      compactQuery.removeEventListener('change', update)
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
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

      setScores((prev) => ({ ...prev, [id]: prev[id] ?? '' }))
      setFinishOrder((order) => (order.includes(id) ? order : [...order, id]))
      return [...current, id]
    })
    setSearch('')
    setShowAllPlayers(false)

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    }
  }

  function removePlayer(id) {
    setSelected((current) => current.filter((x) => x !== id))
    setFinishOrder((order) => removeListItemById(order, id))
  }

  // keep finishOrder in sync if selected array changes externally
  useEffect(() => {
    setFinishOrder((order) => syncFinishOrderWithSelected(order, selected))
  }, [selected])

  function setScore(id, v) {
    const n = v === '' ? '' : Number(v)
    scoreEditOriginRef.current = true
    setScores((s) => ({ ...s, [id]: n }))
  }

  const rankingValidation = getRankingScoreValidation(selectedPlayers, finishOrder, scores)

  useEffect(() => {
    if (!scoreEditOriginRef.current) return
    scoreEditOriginRef.current = false

    if (!rankingValidation.scoreState.isComplete) return
    if (rankingValidation.modeKind === 'tie-unresolved') return
    if (!rankingValidation.derivedOrder || rankingValidation.derivedOrder.length === 0) return

    setFinishOrder((order) => {
      const selectedSet = new Set(selectedRef.current)
      const unselected = order.filter((id) => !selectedSet.has(id))
      return [...rankingValidation.derivedOrder, ...unselected]
    })
  }, [scores, rankingValidation])

  function clearSelectedScores() {
    setScores((current) => {
      const next = { ...current }
      selectedRef.current.forEach((id) => {
        next[id] = ''
      })
      return next
    })
  }

  function gatherSelected() {
    const ordered = rankingValidation.normalizedOrder
      .map((id) => players.find((player) => player.id === id))
      .filter(Boolean)

    if (rankingValidation.modeKind === 'ranking-only') {
      return {
        entryMode: 'ranking',
        players: ordered,
      }
    }

    return {
      entryMode: 'scores',
      players: ordered.map((player) => ({
        ...player,
        score: Number(scores[player.id]),
      })),
    }
  }

  function handlePreview() {
    if (selected.length < 2) {
      alert('Select at least 2 players')
      return
    }
    if (!rankingValidation.canConfirm) {
      alert(rankingValidation.disabledReason || 'Battle result is not valid yet.')
      return
    }
    const sel = gatherSelected()
    onPreview && onPreview(sel)
  }

  function handleConfirm() {
    if (selected.length < 2) {
      alert('Select at least 2 players')
      return
    }
    if (!rankingValidation.canConfirm) {
      alert(rankingValidation.disabledReason || 'Battle result is not valid yet.')
      return
    }
    const sel = gatherSelected()
    onConfirm && onConfirm(sel)
  }

  // expose preview action and whether confirm is enabled to parent via registerConfirm
  useEffect(() => {
    if (!registerConfirm) return

    const api = {
      canConfirm: canConfirmBattle(selected, resultMode, scores) && rankingValidation.canConfirm,
      disabledReason: rankingValidation.disabledReason,
      preview: () => handlePreview(),
      confirm: () => handleConfirm(),
    }
    registerConfirm(api)
    return () => {
      registerConfirm(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, scores, resultMode, finishOrder, rankingValidation.canConfirm, rankingValidation.disabledReason])

  function reorderFinishOrder(fromIdx, toIdx) {
    setFinishOrder((order) => {
      const copy = [...order]
      const [item] = copy.splice(fromIdx, 1)
      copy.splice(toIdx, 0, item)
      return copy
    })
  }

  function moveFinish(id, dir) {
    setFinishOrder((order) => moveListItemById(order, id, dir))
  }

  function commitPointerDrop(draggedId, targetId, position) {
    setFinishOrder((order) => reorderFinishOrderByDrop(order, selectedRef.current, draggedId, targetId, position))
  }

  function beginPointerDrag(e, draggedId) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()

    if (typeof e.currentTarget?.setPointerCapture === 'function' && e.pointerId != null) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    dragHandleRef.current = e.currentTarget ?? null

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
    const row = hit?.closest?.('.battle-player-row--finish')

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

    const { draggedId, pointerId } = dragPointerRef.current
    commitPointerDrop(draggedId, dropTargetRef.current, dropPositionRef.current)

    if (dragHandleRef.current && pointerId != null && typeof dragHandleRef.current.releasePointerCapture === 'function') {
      try {
        dragHandleRef.current.releasePointerCapture(pointerId)
      } catch {
        // Ignore already-released pointer captures.
      }
    }

    dragPointerRef.current = { active: false, pointerId: null, draggedId: null }
    dragHandleRef.current = null
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
      const drag = dragPointerRef.current
      if (dragHandleRef.current && drag.pointerId != null && typeof dragHandleRef.current.releasePointerCapture === 'function') {
        try {
          dragHandleRef.current.releasePointerCapture(drag.pointerId)
        } catch {
          // Ignore already-released pointer captures.
        }
      }
      dragHandleRef.current = null
      document.body.classList.remove('is-dragging-finish')
    }
  }, [])

  const orderedSelectedPlayers = finishOrder.filter((id) => selected.includes(id)).map((id) => players.find((player) => player.id === id)).filter(Boolean)
  const resultsPlayers = orderedSelectedPlayers.length > 0 ? orderedSelectedPlayers : selectedPlayers

  return (
    <div className={`new-battle-screen ${isSearchExperimentActive ? 'new-battle-screen--search-active' : ''}`}>
      <div className="battle-section battle-results-section">
        <div className="battle-results-headline-row">
          <div className="context-headline">RESULTS</div>
          {isSearchExperimentActive && (
            <div className="battle-results-count" aria-live="polite">{selectedSummaryCountText}</div>
          )}
        </div>

        {isSearchExperimentActive && (
          <div
            className={`battle-results-summary ${selectedSummaryHasOverflow ? 'battle-results-summary--scroll' : ''}`}
            aria-live="polite"
          >
            {selectedPlayers.length === 0 ? (
              <div className="battle-results-summary-empty">No players selected yet.</div>
            ) : (
              <div className="battle-results-grid" role="list" aria-label="Selected players">
                {selectedPlayers.map((player) => (
                  <div key={player.id} role="listitem">
                    <CompactSelectedPlayerTile player={player} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isSearchExperimentActive && selectedPlayers.length > 0 && (
          <div className="battle-mode-toggle" role="tablist" aria-label="Result entry mode">
            <button
              type="button"
              role="tab"
              aria-selected={resultMode === 'finish'}
              className={`battle-mode-button ${resultMode === 'finish' ? 'battle-mode-button--active' : ''}`}
              onClick={() => setResultMode('finish')}
            >
              {RESULT_MODE_LABELS.finish}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={resultMode === 'score'}
              className={`battle-mode-button ${resultMode === 'score' ? 'battle-mode-button--active' : ''}`}
              onClick={() => setResultMode('score')}
            >
              {RESULT_MODE_LABELS.score}
            </button>
          </div>
        )}

        {!isSearchExperimentActive && selectedPlayers.length > 0 && rankingValidation.warning && (
          <div className="ranking-sync-warning" role="status" aria-live="polite">
            <div className="ranking-sync-warning-head">
              <span className="ranking-sync-warning-icon" aria-hidden="true">⚠</span>
              <span className="ranking-sync-warning-title">{rankingValidation.warning.heading}</span>
            </div>
            <div className="ranking-sync-warning-body">{rankingValidation.warning.body}</div>
            <div className="ranking-sync-warning-actions">
              <button
                type="button"
                className="ranking-sync-warning-action"
                onClick={() => setResultMode('score')}
              >
                EDIT SCORES →
              </button>
              {rankingValidation.warning.type === 'partial-score' && (
                <button
                  type="button"
                  className="ranking-sync-warning-clear"
                  onClick={clearSelectedScores}
                >
                  CLEAR SCORES
                </button>
              )}
            </div>
          </div>
        )}

        {!isSearchExperimentActive && selectedPlayers.length < 2 && (
          <div className="battle-empty-state">Add at least two players to enter results.</div>
        )}

        {!isSearchExperimentActive && selectedPlayers.length > 0 && (
          <div className="results-player-list" role="list" aria-label="Ranking players">
            {resultsPlayers.map((player, index) => {
              const isFinishMode = resultMode === 'finish'
              const scoreValue = getNumericScoreValue(scores, player.id)
              const isFirstPosition = index === 0
              const isLastPosition = index === resultsPlayers.length - 1
              const isDragActive = isFinishMode && draggedFinishId === player.id
              const isDropTarget = isFinishMode && dropTargetFinishId === player.id
              const rowClassName = [
                'battle-player-row',
                isFinishMode ? 'battle-player-row--finish' : 'battle-player-row--score',
                isDragActive ? 'is-drag-active' : '',
                isDropTarget && !isDragActive && dropPosition === 'before' ? 'drop-before' : '',
                isDropTarget && !isDragActive && dropPosition === 'after' ? 'drop-after' : '',
              ].filter(Boolean).join(' ')

              return (
                <div
                  key={player.id}
                  className={rowClassName}
                  data-player-key={String(player.id)}
                  role="listitem"
                  aria-label={`Position ${index + 1}, ${player.name}`}
                >
                  <div className="battle-player-header">
                    <div className="battle-player-identity">
                      <div className={`player-disc ${getPlayerDiscColorClass(player)}`} aria-hidden>
                        <span className="player-disc-initials">{getPlayerInitials(player)}</span>
                      </div>

                      <div className="battle-player-meta">
                        <div className="battle-player-name-line">
                          <div className="player-name">{player.name}</div>
                          <TagBadge className="player-tag-badge" number={player.tag} size={28} variant="inactive" />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="battle-player-remove"
                      aria-label={`Remove ${player.name}`}
                      onClick={() => removePlayer(player.id)}
                    >
                      ×
                    </button>
                  </div>

                  <div className={`battle-player-controls ${isFinishMode ? 'battle-player-controls--finish' : 'battle-player-controls--score'}`}>
                    {isFinishMode ? (
                      <>
                        <div className="battle-finish-position">RANK {index + 1}</div>
                        <div className="battle-order-actions">
                          <button
                            type="button"
                            className="score-btn finish-move-btn"
                            aria-label={`Move ${player.name} up`}
                            disabled={isFirstPosition}
                            onClick={(e) => { e.stopPropagation(); moveFinish(player.id, -1) }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="score-btn finish-move-btn"
                            aria-label={`Move ${player.name} down`}
                            disabled={isLastPosition}
                            onClick={(e) => { e.stopPropagation(); moveFinish(player.id, +1) }}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className={`drag-handle ${isDragActive ? 'drag-handle--active' : ''}`}
                            aria-label={`Drag to reorder ${player.name}`}
                            onPointerDown={(e) => beginPointerDrag(e, player.id)}
                            onDragStart={(e) => e.preventDefault()}
                          >
                            <span className="drag-grip" aria-hidden="true">⋮⋮</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="score-control" onClick={(e) => e.stopPropagation()}>
                        <button className="score-btn" aria-label={`Decrease ${player.name} score`} onClick={(e) => { e.stopPropagation(); setScore(player.id, getNumericScoreValue(scores, player.id) - 1) }}>−</button>
                        <div className={`score-display ${toFiniteScoreOrNull(scores[player.id]) == null ? 'score-display--blank' : ''}`}>{toFiniteScoreOrNull(scores[player.id]) == null ? '—' : String(Number(scoreValue))}</div>
                        <button className="score-btn" aria-label={`Increase ${player.name} score`} onClick={(e) => { e.stopPropagation(); setScore(player.id, getNumericScoreValue(scores, player.id) + 1) }}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!isSearchExperimentActive && previewResult && (
          <div className="battle-preview-panel" style={{ marginTop: 16 }}>
            <h3 style={{ margin: '6px 0' }}>Preview</h3>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {previewResult.rankedPlayers.map((r) => (
                <div key={r.id} className="result-player">
                  <div className="result-left">
                    <div className="result-pos">{r.position}</div>
                    <div className="result-info">
                      <div className="result-name">{r.name}</div>
                      <div className="result-meta">{r.score == null ? 'ranking entry' : `${r.score} throws`}</div>
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

      <div className="battle-section battle-player-section">
        <div className="context-headline">ADD PLAYERS</div>

        <div ref={searchAreaRef} className="search-area">
          <input
            ref={searchInputRef}
            id="battle-player-search"
            className="search-input battle-search-input"
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            aria-label="Search players"
            autoComplete="off"
          />

          {search.trim() !== '' && (
            <button type="button" className="secondary battle-clear-btn" onClick={() => setSearch('')}>Clear</button>
          )}

          {q !== '' && searchMatches.length === 0 && (
            <div className="search-empty">No matching players found.</div>
          )}
        </div>

        {!isSearchExperimentActive && !playersLoading && !playersError && players.length > 0 && q === '' && (
          <button
            type="button"
            className="roster-toggle"
            aria-expanded={showAllPlayers}
            onClick={() => setShowAllPlayers((open) => !open)}
          >
            {showAllPlayers ? 'Hide all players' : 'Show all players'}
            <span aria-hidden="true">{showAllPlayers ? '▴' : '▾'}</span>
          </button>
        )}

        <div
          ref={playerResultsRef}
          className={`player-results ${isSearchExperimentActive ? 'player-results--search-active' : ''}`}
          style={isSearchExperimentActive && searchResultsMaxHeight ? { maxHeight: `${searchResultsMaxHeight}px` } : undefined}
        >
          {playersLoading && <div className="loader">Loading live players…</div>}
          {!playersLoading && playersError && <div className="error">Unable to load live players and tags.</div>}
          {!playersLoading && !playersError && players.length === 0 && (
            <div className="empty">No assigned players found in live ownership.</div>
          )}

          {q !== '' && searchMatches.map((p) => (
            <AvailablePlayerRow key={p.id} player={p} onAdd={addPlayer} />
          ))}

          {q === '' && rosterMatches.map((p) => (
            <AvailablePlayerRow key={p.id} player={p} onAdd={addPlayer} />
          ))}

          {q === '' && !showAllPlayers && rosterIsExhausted && (
            <div className="search-empty search-empty-all">All players are selected.</div>
          )}
        </div>

        {!playersLoading && !playersError && dataInconsistencies.length > 0 && (
          <div className="ownership-warning" role="status" aria-live="polite">
            <button
              type="button"
              className="ownership-warning-toggle"
              aria-expanded={warningOpen}
              aria-controls="ownership-warning-details"
              onClick={() => setWarningOpen((open) => !open)}
            >
              <span aria-hidden="true" className="ownership-warning-icon">⚠</span>
              <span className="ownership-warning-label">Some roster entries could not be loaded.</span>
              <span className="ownership-warning-chevron" aria-hidden="true">{warningOpen ? '▾' : '▸'}</span>
            </button>

            {warningOpen && (
              <div id="ownership-warning-details" className="ownership-warning-details">
                {dataInconsistencies.map((entry, index) => (
                  <div key={`${entry}-${index}`} className="ownership-warning-item">{entry}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="battle-section battle-context-section">
        <div className="context-headline">BATTLE CONTEXT</div>
        <div className="battle-context-wrap">
          <div className="battle-context">
            <div className="battle-context-summary-card" aria-live="polite">
              <div className="battle-context-summary-copy">
                <div className="context-summary-primary">{contextSummary.primary}</div>
                <div className="context-summary-secondary">{contextSummary.secondary}</div>
              </div>

              <button
                type="button"
                className="context-summary-toggle"
                aria-expanded={settingsOpen}
                aria-controls="battle-context-settings"
                onClick={() => setSettingsOpen((open) => !open)}
              >
                <span>{settingsOpen ? 'DONE' : 'EDIT'}</span>
                <span aria-hidden="true">{settingsOpen ? '▴' : '▾'}</span>
              </button>
            </div>

            {settingsOpen && (
              <div id="battle-context-settings" className="context-settings">
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
        </div>
      </div>
    </div>
  )
}
