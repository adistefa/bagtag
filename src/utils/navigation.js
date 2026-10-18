export const DEFAULT_MAIN_VIEW = 'battle'
export const DEFAULT_HISTORY_TAB = 'matches'

export const MAIN_VIEW_ORDER = ['battle', 'history', 'bagtags']

export const HISTORY_TABS = ['matches', 'players', 'tags']

export const NAV_QUERY_KEYS = {
  view: 'view',
  history: 'history',
  player: 'player',
  tag: 'tag',
}

function normalizeHistoryPlayerId(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeHistoryTag(value) {
  const numeric = Number(value)
  if (!Number.isInteger(numeric)) return null
  if (numeric < 1 || numeric > 100) return null
  return numeric
}

export function normalizeMainView(value) {
  return MAIN_VIEW_ORDER.includes(value) ? value : DEFAULT_MAIN_VIEW
}

export function normalizeHistoryTab(value) {
  return HISTORY_TABS.includes(value) ? value : DEFAULT_HISTORY_TAB
}

export function normalizeNavigationState(state, fallbackHistoryTab = DEFAULT_HISTORY_TAB) {
  const view = normalizeMainView(state?.view)
  const historyTab = normalizeHistoryTab(state?.historyTab ?? fallbackHistoryTab)
  const historyPlayerId = normalizeHistoryPlayerId(state?.historyPlayerId)
  const historyTag = normalizeHistoryTag(state?.historyTag)

  if (view !== 'history') {
    return { view, historyTab, historyPlayerId: null, historyTag: null }
  }

  if (historyTab === 'players') {
    return { view, historyTab, historyPlayerId, historyTag: null }
  }

  if (historyTab === 'tags') {
    return { view, historyTab, historyPlayerId: null, historyTag }
  }

  return { view, historyTab, historyPlayerId: null, historyTag: null }
}

export function readNavigationStateFromLocation(locationLike = window.location, options = {}) {
  const fallbackHistoryTab = normalizeHistoryTab(options.fallbackHistoryTab)
  const sourceUrl = new URL(locationLike.href)
  const view = normalizeMainView(sourceUrl.searchParams.get(NAV_QUERY_KEYS.view))

  if (view === 'history') {
    return {
      view,
      historyTab: normalizeHistoryTab(sourceUrl.searchParams.get(NAV_QUERY_KEYS.history)),
      historyPlayerId: normalizeHistoryPlayerId(sourceUrl.searchParams.get(NAV_QUERY_KEYS.player)),
      historyTag: normalizeHistoryTag(sourceUrl.searchParams.get(NAV_QUERY_KEYS.tag)),
    }
  }

  return {
    view,
    historyTab: fallbackHistoryTab,
    historyPlayerId: null,
    historyTag: null,
  }
}

export function buildNavigationUrl(state, locationLike = window.location) {
  const { view, historyTab, historyPlayerId, historyTag } = normalizeNavigationState(state)
  const sourceUrl = new URL(locationLike.href)

  sourceUrl.searchParams.delete(NAV_QUERY_KEYS.view)
  sourceUrl.searchParams.delete(NAV_QUERY_KEYS.history)
  sourceUrl.searchParams.delete(NAV_QUERY_KEYS.player)
  sourceUrl.searchParams.delete(NAV_QUERY_KEYS.tag)

  if (view !== DEFAULT_MAIN_VIEW) {
    sourceUrl.searchParams.set(NAV_QUERY_KEYS.view, view)
  }

  if (view === 'history') {
    sourceUrl.searchParams.set(NAV_QUERY_KEYS.history, historyTab)

    if (historyTab === 'players' && historyPlayerId) {
      sourceUrl.searchParams.set(NAV_QUERY_KEYS.player, historyPlayerId)
    }

    if (historyTab === 'tags' && historyTag != null) {
      sourceUrl.searchParams.set(NAV_QUERY_KEYS.tag, String(historyTag))
    }
  }

  const search = sourceUrl.searchParams.toString()
  return `${sourceUrl.pathname}${search ? `?${search}` : ''}${sourceUrl.hash}`
}

export function isSameDestination(a, b) {
  if (!a || !b) return false
  if (a.view !== b.view) return false
  if (a.view !== 'history') return true
  if (a.historyTab !== b.historyTab) return false

  if (a.historyTab === 'players') {
    return (a.historyPlayerId || null) === (b.historyPlayerId || null)
  }

  if (a.historyTab === 'tags') {
    return (a.historyTag || null) === (b.historyTag || null)
  }

  return true
}

export function isHistoryView(view) {
  return view === 'history'
}
