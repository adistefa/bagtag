export const DEFAULT_MAIN_VIEW = 'bagtags'

export const MAIN_VIEW_ORDER = ['battle', 'history', 'bagtags']

export const HISTORY_TABS = ['matches', 'players', 'tags']

export function isHistoryView(view) {
  return view === 'history'
}
