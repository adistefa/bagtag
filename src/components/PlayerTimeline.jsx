import { useEffect, useMemo, useRef, useState } from 'react'
import { getHistoricalArchive } from '../data/historicalArchive'
import { getHistoricalPlayerOptions, getPlayerTimelineEntries, searchHistoricalPlayers, hasContinuityGap } from '../utils/playerTimeline'
import { DISC_COLOR_VALUES, getPlayerDiscColorClass } from '../utils/playerIdentityVisuals'

const DISC_COLORS = DISC_COLOR_VALUES

const DAY_IN_MS = 24 * 60 * 60 * 1000
const REFERENCE_TAGS = [10, 20, 40]
const COMPARISON_COLOR_PALETTE = ['#78CFFF', '#FF5BA7', '#FF9F2E']

export function getComparisonChartColors(selectedPlayerIds, previousColors = {}) {
  const uniqueIds = Array.from(new Set((selectedPlayerIds || []).filter(Boolean)))
  const nextColors = {}
  const preservedIds = []

  for (const playerId of uniqueIds) {
    if (previousColors[playerId]) {
      nextColors[playerId] = previousColors[playerId]
      preservedIds.push(playerId)
    }
  }

  const remainingPalette = COMPARISON_COLOR_PALETTE.filter((color) => !Object.values(nextColors).includes(color))
  const remainingIds = uniqueIds
    .filter((playerId) => !Object.prototype.hasOwnProperty.call(nextColors, playerId))
    .sort((a, b) => a.localeCompare(b))

  for (const playerId of remainingIds) {
    const color = remainingPalette.shift()
    if (color) {
      nextColors[playerId] = color
    }
  }

  return Object.fromEntries(
    Object.entries(nextColors).sort(([left], [right]) => left.localeCompare(right))
  )
}

export function togglePlayerFocus(currentFocusedPlayerId, playerId) {
  if (!playerId) return currentFocusedPlayerId || null
  if (currentFocusedPlayerId === playerId) return null
  return playerId
}

export function getPointTagLabel(point, layout) {
  if (!point || point.resultTag == null || !Number.isFinite(Number(point.resultTag))) return null
  return String(point.resultTag)
}

export function getTimelineChartLayout(events, options = {}) {
  const pixelsPerWeek = options.pixelsPerWeek ?? 24
  const pixelsPerDay = pixelsPerWeek / 7
  const left = 42
  const right = 12
  const top = 12
  const bottom = 16
  const height = 220
  const axisHeight = 34
  const todayMs = options.todayMs ?? Date.now()
  const sortedEvents = Array.isArray(events) ? [...events].sort((a, b) => (a.dateMs || 0) - (b.dateMs || 0)) : []
  const validEvents = sortedEvents.filter((event) => Number.isFinite(event.dateMs) && event.dateMs > 0)

  if (!validEvents.length) {
    return {
      pixelsPerWeek,
      pixelsPerDay,
      width: 180,
      height: height + axisHeight,
      left,
      right,
      top,
      bottom,
      plotWidth: 180 - left - right,
      plotHeight: height - top - bottom,
      minTag: 1,
      maxTag: 100,
      points: [],
      series: [],
      referenceLines: [],
      calendarLabels: [],
      todayX: left,
      axisHeight,
    }
  }

  const minDate = Math.min(...validEvents.map((event) => event.dateMs))
  const maxDate = Math.max(...validEvents.map((event) => event.dateMs))
  const domainStart = new Date(minDate)
  const domainEnd = new Date(Math.max(todayMs, maxDate))
  domainStart.setUTCHours(0, 0, 0, 0)
  domainEnd.setUTCHours(23, 59, 59, 999)

  const spanMs = Math.max(DAY_IN_MS, domainEnd.getTime() - domainStart.getTime())
  const spanWeeks = spanMs / (7 * DAY_IN_MS)
  const width = Math.ceil(left + right + (spanWeeks * pixelsPerWeek))

  const tagValues = validEvents
    .map((event) => Number(event.resultTag))
    .filter((value) => Number.isFinite(value))

  const minTag = 1
  const maxTag = tagValues.length ? Math.max(...tagValues) : 100
  const yRange = Math.max(1, maxTag - minTag)

  const yForTag = (tagValue) => {
    const numericTag = Number(tagValue)
    if (!Number.isFinite(numericTag)) return top + (height - top - bottom)
    return top + ((numericTag - minTag) / yRange) * (height - top - bottom)
  }

  const xForDate = (dateMs) => {
    const dayDate = new Date(dateMs)
    dayDate.setUTCHours(0, 0, 0, 0)
    const safeMs = Math.min(Math.max(dayDate.getTime(), domainStart.getTime()), domainEnd.getTime())
    const ratio = (safeMs - domainStart.getTime()) / spanMs
    return left + ratio * (width - left - right)
  }

  const groupedEvents = new Map()
  for (const event of validEvents) {
    const key = event.playerId || 'single-player'
    if (!groupedEvents.has(key)) groupedEvents.set(key, [])
    groupedEvents.get(key).push(event)
  }

  const series = Array.from(groupedEvents.entries()).map(([playerId, playerEvents]) => {
    const dateBuckets = new Map()
    playerEvents.forEach((event) => {
      const dateKey = new Date(event.dateMs).toISOString().slice(0, 10)
      if (!dateBuckets.has(dateKey)) dateBuckets.set(dateKey, [])
      dateBuckets.get(dateKey).push(event)
    })

    const points = playerEvents.map((event) => {
      const dateKey = new Date(event.dateMs).toISOString().slice(0, 10)
      const sameDayEvents = dateBuckets.get(dateKey) || []
      const sameDayIndex = sameDayEvents.findIndex((item) => item.matchKey === event.matchKey)
      const x = xForDate(event.dateMs)
      const numericTag = event.resultTag == null ? minTag : Number(event.resultTag)
      const y = yForTag(numericTag)

      return {
        ...event,
        x,
        y,
        isUnknown: event.resultTag == null,
        sameDayIndex,
        sameDayCount: sameDayEvents.length,
      }
    })

    return {
      id: playerId,
      label: playerEvents[0]?.playerLabel || playerId,
      colorClass: playerEvents[0]?.playerColorClass || 'disc-white',
      points,
    }
  })

  const points = series.flatMap((entry) => entry.points)

  const referenceLines = REFERENCE_TAGS.filter((tag) => tag >= minTag && tag <= maxTag)
    .map((tag) => ({
      tag,
      y: yForTag(tag),
    }))

  const calendarLabels = []
  const monthCursor = new Date(domainStart)
  monthCursor.setUTCDate(1)
  monthCursor.setUTCHours(0, 0, 0, 0)

  while (monthCursor.getTime() <= domainEnd.getTime()) {
    calendarLabels.push({
      type: 'month',
      label: monthCursor.toLocaleString(undefined, { month: 'short' }),
      x: xForDate(monthCursor.getTime()),
      dateMs: monthCursor.getTime(),
    })
    monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1)
  }

  const yearLabels = []
  const yearCursor = new Date(domainStart)
  yearCursor.setUTCMonth(0, 1)
  yearCursor.setUTCHours(0, 0, 0, 0)

  while (yearCursor.getTime() <= domainEnd.getTime()) {
    yearLabels.push({
      type: 'year',
      label: String(yearCursor.getUTCFullYear()),
      x: xForDate(yearCursor.getTime()),
      dateMs: yearCursor.getTime(),
    })
    yearCursor.setUTCFullYear(yearCursor.getUTCFullYear() + 1)
  }

  const todayX = xForDate(todayMs)

  return {
    pixelsPerWeek,
    pixelsPerDay,
    width,
    height: height + axisHeight,
    left,
    right,
    top,
    bottom,
    plotWidth: width - left - right,
    plotHeight: height - top - bottom,
    minTag,
    maxTag,
    points,
    series,
    referenceLines,
    calendarLabels: [...calendarLabels, ...yearLabels].sort((a, b) => a.x - b.x),
    todayX,
    axisHeight,
  }
}

export function toggleHistoricalPlayerSelection(selectedPlayerIds, playerId, maxPlayers = 3) {
  const uniqueIds = Array.from(new Set((selectedPlayerIds || []).filter(Boolean)))

  if (uniqueIds.includes(playerId)) {
    return {
      ids: uniqueIds.filter((id) => id !== playerId),
      exceeded: false,
      toggledOff: true,
    }
  }

  if (uniqueIds.length >= maxPlayers) {
    return {
      ids: uniqueIds,
      exceeded: true,
      toggledOff: false,
    }
  }

  return {
    ids: [...uniqueIds, playerId],
    exceeded: false,
    toggledOff: false,
  }
}

function formatDate(dateValue) {
  if (!dateValue) return 'Unknown date'

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return dateValue

  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }

  return new Intl.DateTimeFormat(undefined, options).format(date)
}

function formatTagValue(tagValue) {
  if (tagValue == null || Number.isNaN(Number(tagValue))) return 'unknown'
  return `#${tagValue}`
}

function formatLocation(location) {
  if (!location || location === 'Unknown location') return 'Unknown location'
  return location
}

export default function PlayerTimeline() {
  const archive = useMemo(() => getHistoricalArchive(), [])
  const allPlayers = useMemo(() => getHistoricalPlayerOptions(archive), [archive])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(() => (allPlayers[0] ? [allPlayers[0].id] : []))
  const [selectedEventKey, setSelectedEventKey] = useState(null)
  const [selectedEventPlayerId, setSelectedEventPlayerId] = useState(null)
  const [selectionMessage, setSelectionMessage] = useState('')
  const [focusedPlayerId, setFocusedPlayerId] = useState(null)
  const [comparisonColors, setComparisonColors] = useState({})

  useEffect(() => {
    if (!allPlayers.length) {
      setSelectedPlayerIds([])
      setSelectedEventKey(null)
      setSelectedEventPlayerId(null)
      return
    }

    setSelectedPlayerIds((current) => {
      const validIds = (current || []).filter((id) => allPlayers.some((player) => player.id === id))
      if (validIds.length) return validIds
      return [allPlayers[0].id]
    })
  }, [allPlayers])

  const filteredPlayers = useMemo(
    () => searchHistoricalPlayers(allPlayers, searchQuery),
    [allPlayers, searchQuery]
  )

  const selectedPlayers = useMemo(
    () => allPlayers.filter((player) => selectedPlayerIds.includes(player.id)),
    [allPlayers, selectedPlayerIds]
  )

  const timelineEvents = useMemo(
    () => selectedPlayers.flatMap((player) => getPlayerTimelineEntries(player.id, archive).map((event) => ({
      ...event,
      playerId: player.id,
      playerLabel: player.label,
      playerColorClass: getPlayerDiscColorClass({ id: player.id, name: player.label }),
    }))),
    [selectedPlayers, archive]
  )

  const chartLayout = useMemo(() => getTimelineChartLayout(timelineEvents, { todayMs: Date.now() }), [timelineEvents])
  const chartSeries = chartLayout.series || []
  const scrollRef = useRef(null)

  useEffect(() => {
    setComparisonColors((current) => getComparisonChartColors(selectedPlayerIds, current))
  }, [selectedPlayerIds])

  useEffect(() => {
    setFocusedPlayerId((current) => (current && selectedPlayerIds.includes(current) ? current : null))
  }, [selectedPlayerIds])

  useEffect(() => {
    if (!timelineEvents.length) {
      setSelectedEventKey(null)
      setSelectedEventPlayerId(null)
      return
    }

    const currentMatch = timelineEvents.find((event) => event.matchKey === selectedEventKey && event.playerId === selectedEventPlayerId)
    if (currentMatch) return

    const initial = timelineEvents[0]
    setSelectedEventKey(initial.matchKey)
    setSelectedEventPlayerId(initial.playerId)
  }, [timelineEvents, selectedEventKey, selectedEventPlayerId])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    node.scrollLeft = Math.max(0, node.scrollWidth - node.clientWidth)
  }, [selectedPlayers.length, timelineEvents.length])

  const activeEvent = timelineEvents.find((event) => event.matchKey === selectedEventKey && event.playerId === selectedEventPlayerId) || timelineEvents[0] || null
  const continuityGap = hasContinuityGap(timelineEvents)

  const handlePlayerToggle = (playerId) => {
    const next = toggleHistoricalPlayerSelection(selectedPlayerIds, playerId)

    if (next.exceeded) {
      setSelectionMessage('Maximum of three players selected. Remove one to compare a different player.')
      return
    }

    setSelectionMessage('')
    setSelectedPlayerIds(next.ids)

    if (!next.toggledOff) {
      const nextPlayerEvents = getPlayerTimelineEntries(playerId, archive)
      if (nextPlayerEvents.length) {
        setSelectedEventKey(nextPlayerEvents[0].matchKey)
        setSelectedEventPlayerId(playerId)
        setFocusedPlayerId(playerId)
      }
    }
  }

  const handlePointSelect = (point) => {
    if (!point) return
    setSelectedEventKey(point.matchKey)
    setSelectedEventPlayerId(point.playerId)
    setFocusedPlayerId(point.playerId)
  }

  const handleLegendFocusToggle = (playerId) => {
    setFocusedPlayerId((current) => togglePlayerFocus(current, playerId))
  }

  const handleRemoveSelectedPlayer = (playerId) => {
    setSelectedPlayerIds((current) => current.filter((id) => id !== playerId))
    setSelectionMessage('')
    setFocusedPlayerId((current) => (current === playerId ? null : current))
  }

  return (
    <div className="player-timeline">
      <div className="player-timeline-selection-wrap">
        <div className="player-select-label">Selected players</div>
        <div className="player-timeline-selection-chips" aria-live="polite">
          {selectedPlayers.length ? (
            selectedPlayers.map((player) => {
              const chartColor = comparisonColors[player.id] || COMPARISON_COLOR_PALETTE[0]
              const isFocused = focusedPlayerId === player.id
              return (
                <div key={player.id} className={`player-timeline-selection-chip ${isFocused ? 'player-timeline-selection-chip--focused' : ''}`} style={{ borderColor: isFocused ? chartColor : 'rgba(246,246,241,0.12)', boxShadow: isFocused ? `0 0 0 1px ${chartColor}` : 'none' }}>
                  <button
                    type="button"
                    className="player-timeline-selection-label-btn"
                    onClick={() => handleLegendFocusToggle(player.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleLegendFocusToggle(player.id)
                      }
                    }}
                    aria-label={`Focus ${player.label}`}
                    aria-pressed={isFocused}
                  >
                    <span className="player-timeline-color-swatch" style={{ background: chartColor }} aria-hidden="true" />
                    <span className={`player-disc ${getPlayerDiscColorClass({ id: player.id, name: player.label })}`} aria-hidden="true">
                      {player.label.slice(0, 2).toUpperCase()}
                    </span>
                    <span>{player.label}</span>
                  </button>
                  <button
                    type="button"
                    className="player-timeline-selection-remove-btn"
                    onClick={() => handleRemoveSelectedPlayer(player.id)}
                    aria-label={`Remove ${player.label}`}
                    title={`Remove ${player.label}`}
                  >
                    ×
                  </button>
                </div>
              )
            })
          ) : (
            <span className="player-timeline-selection-empty">No players selected</span>
          )}
        </div>
        {selectionMessage && (
          <div className="player-timeline-max-message" role="status" aria-live="polite">
            {selectionMessage}
          </div>
        )}
      </div>

      {!selectedPlayers.length ? (
        <div className="player-timeline-empty-state">Select a player below to compare their historical timeline.</div>
      ) : timelineEvents.length ? (
        <>
          <div className="player-timeline-chart-wrap">
            <div className="player-timeline-chart-note">Observed events only • no synthetic current ownership</div>
            <div className="player-timeline-chart-area">
              <div className="player-timeline-y-axis" aria-hidden="true">
                {chartLayout.referenceLines.map((line) => (
                  <div key={`axis-${line.tag}`} className="player-timeline-y-axis-label" style={{ top: `${line.y}px` }}>
                    #{line.tag}
                  </div>
                ))}
              </div>

              <div className="player-timeline-scroll" ref={scrollRef} aria-label="Player timeline chart">
                <svg viewBox={`0 0 ${chartLayout.width} ${chartLayout.height}`} className="player-timeline-svg" role="img" aria-label={`${selectedPlayers.map((player) => player.label).join(', ') || 'Player'} timeline`}>
                  <g>
                    {chartLayout.referenceLines.map((line) => (
                      <line
                        key={`ref-${line.tag}`}
                        x1={chartLayout.left}
                        y1={line.y}
                        x2={chartLayout.width - chartLayout.right}
                        y2={line.y}
                        stroke="rgba(96, 166, 122, 0.38)"
                        strokeWidth="1"
                      />
                    ))}

                    {chartSeries.map((series) => {
                      const seriesColor = comparisonColors[series.id] || COMPARISON_COLOR_PALETTE[0]
                      const isFocused = focusedPlayerId === series.id
                      const isFaded = focusedPlayerId != null && !isFocused
                      const pathData = series.points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

                      return (
                        <g key={`series-${series.id}`} opacity={isFaded ? 0.25 : 1}>
                          <path d={pathData} fill="none" stroke={seriesColor} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
                          {series.points.map((point) => {
                            const isActive = activeEvent && point.matchKey === activeEvent.matchKey && point.playerId === activeEvent.playerId
                            const labelText = isActive ? getPointTagLabel(point, chartLayout) : null
                            const labelX = Math.min(Math.max(point.x, chartLayout.left + 10), chartLayout.width - chartLayout.right - 10)
                            const labelY = Math.min(Math.max(point.y - 12, chartLayout.top + 8), chartLayout.height - chartLayout.axisHeight - 18)

                            return (
                              <g
                                key={`${series.id}-${point.matchKey}`}
                                onClick={() => handlePointSelect(point)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    handlePointSelect(point)
                                  }
                                }}
                                className="player-timeline-point"
                              >
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={isActive ? 7 : 5}
                                  fill={seriesColor}
                                  stroke={isActive ? 'rgba(8,26,19,0.92)' : 'rgba(8,26,19,0.72)'}
                                  strokeWidth={isActive ? 3 : 2}
                                />
                                {labelText && (
                                  <text x={labelX} y={labelY} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="700" paintOrder="stroke" stroke="rgba(8,26,19,0.88)" strokeWidth="2">
                                    {labelText}
                                  </text>
                                )}
                              </g>
                            )
                          })}
                        </g>
                      )
                    })}

                    <line x1={chartLayout.todayX} x2={chartLayout.todayX} y1={chartLayout.top} y2={chartLayout.height - chartLayout.axisHeight - 6} stroke="rgba(233, 244, 91, 0.8)" strokeWidth="1.5" strokeDasharray="3 4" />
                    <text x={chartLayout.todayX + 6} y={chartLayout.height - chartLayout.axisHeight + 12} fill="var(--text-secondary)" fontSize="10" fontWeight="700">
                      TODAY
                    </text>

                    {chartLayout.calendarLabels.map((label) => {
                      const isYear = label.type === 'year'
                      return (
                        <g key={`${label.type}-${label.dateMs}`} transform={`translate(${label.x}, ${chartLayout.height - chartLayout.axisHeight + 2})`}>
                          <line x1="0" x2="0" y1="0" y2="6" stroke="rgba(246,246,241,0.32)" strokeWidth="1" />
                          <text x="0" y="18" textAnchor="middle" fill="var(--text-secondary)" fontSize={isYear ? 11 : 10} fontWeight={isYear ? 800 : 600}>
                            {label.label}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                </svg>
              </div>
            </div>
          </div>

          {activeEvent && (
            <div className="player-timeline-detail">
              <div className="player-timeline-detail-label">Selected match</div>
              <div className="player-timeline-detail-value">{activeEvent.playerLabel} · {formatDate(activeEvent.dateIso)}</div>
              <div className="player-timeline-detail-meta">
                {formatLocation(activeEvent.location)} · {formatTagValue(activeEvent.startTag)} → {formatTagValue(activeEvent.resultTag)}
              </div>
            </div>
          )}

          {continuityGap && (
            <div className="player-timeline-gap-note">Historical continuity gap: documented events are separated by missing archive intervals and are not treated as ownership continuity.</div>
          )}
        </>
      ) : (
        <div className="player-timeline-empty-state">This player has no documented historical match events in the archive.</div>
      )}

      <div className="search-area player-timeline-search-area">
        <div className="search-row">
          <input
            aria-label="Search historical players"
            className="search-input battle-search-input"
            type="search"
            value={searchQuery}
            placeholder="Search historical players"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button type="button" className="secondary battle-clear-btn" onClick={() => setSearchQuery('')}>
              Clear
            </button>
          )}
        </div>
      </div>

      {!filteredPlayers.length ? (
        <div className="history-empty-state">No historical players match this search.</div>
      ) : (
        <div className="player-select-wrap">
          <div className="player-select-label">Historical players</div>
          <div className="player-timeline-player-list" role="listbox" aria-label="Historical players">
            {filteredPlayers.map((player) => {
              const isSelected = selectedPlayerIds.includes(player.id)
              return (
                <button
                  key={player.id}
                  type="button"
                  className={`player-timeline-player-item ${isSelected ? 'player-timeline-player-item--selected' : ''}`}
                  onClick={() => handlePlayerToggle(player.id)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="player-timeline-player-label">{player.label}</span>
                  <span className="player-timeline-player-meta">{player.matchCount} matches</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
