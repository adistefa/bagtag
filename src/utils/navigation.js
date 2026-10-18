export const DEFAULT_MAIN_VIEW = 'battle'
export const DEFAULT_HISTORY_TAB = 'matches'

export const MAIN_VIEW_ORDER = ['battle', 'history', 'bagtags']

export const HISTORY_TABS = ['matches', 'players', 'tags']

export const NAV_QUERY_KEYS = {
  view: 'view',
  history: 'history',
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

  return { view, historyTab }
}

export function readNavigationStateFromLocation(locationLike = window.location, options = {}) {
  const fallbackHistoryTab = normalizeHistoryTab(options.fallbackHistoryTab)
  const sourceUrl = new URL(locationLike.href)
  const view = normalizeMainView(sourceUrl.searchParams.get(NAV_QUERY_KEYS.view))

  if (view === 'history') {
    return {
      view,
      historyTab: normalizeHistoryTab(sourceUrl.searchParams.get(NAV_QUERY_KEYS.history)),
    }
  }

  return {
    view,
    historyTab: fallbackHistoryTab,
  }
}

export function buildNavigationUrl(state, locationLike = window.location) {
  const { view, historyTab } = normalizeNavigationState(state)
  const sourceUrl = new URL(locationLike.href)

  sourceUrl.searchParams.delete(NAV_QUERY_KEYS.view)
  sourceUrl.searchParams.delete(NAV_QUERY_KEYS.history)

  if (view !== DEFAULT_MAIN_VIEW) {
    sourceUrl.searchParams.set(NAV_QUERY_KEYS.view, view)
  }

  if (view === 'history') {
    sourceUrl.searchParams.set(NAV_QUERY_KEYS.history, historyTab)
  }

  const search = sourceUrl.searchParams.toString()
  return `${sourceUrl.pathname}${search ? `?${search}` : ''}${sourceUrl.hash}`
}

export function isSameDestination(a, b) {
  if (!a || !b) return false
  if (a.view !== b.view) return false
  if (a.view !== 'history') return true
  return a.historyTab === b.historyTab
}

export function isHistoryView(view) {
  return view === 'history'
}
