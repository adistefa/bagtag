import { useEffect, useState } from 'react'
import './App.css'
import './index.css'
import { redistributeTags } from './utils/bagtag'
import Leaderboard from './components/Leaderboard'
import NewMatch from './components/NewMatch'
import MatchResult from './components/MatchResult'
import HistoricalBattleHistory from './components/HistoricalBattleHistory'
import PlayerTimeline from './components/PlayerTimeline'
import BottomNav from './components/BottomNav'
import { mapOwnersToBattlePlayers } from './utils/liveOwnership'
import { getPreviewRosterOwners, PREVIEW_DATA_SOURCE } from './data/previewRoster'
import { DEFAULT_MAIN_VIEW, HISTORY_TABS, MAIN_VIEW_ORDER } from './utils/navigation'

const TOTAL_TAGS = 100

function App() {
  const [players, setPlayers] = useState([])
  const [owners, setOwners] = useState(new Map())
  const [playersLoading, setPlayersLoading] = useState(true)
  const [playersError, setPlayersError] = useState(null)
  const [dataInconsistencies, setDataInconsistencies] = useState([])
  const [view, setView] = useState(DEFAULT_MAIN_VIEW)
  const [historyTab, setHistoryTab] = useState('matches')
  const [lastResult, setLastResult] = useState(null)
  const [confirmApi, setConfirmApi] = useState(null)

  useEffect(() => {
    setPlayersLoading(true)
    setPlayersError(null)
    setDataInconsistencies([])

    try {
      const previewOwners = getPreviewRosterOwners()
      const battlePlayers = mapOwnersToBattlePlayers(previewOwners)

      setOwners(previewOwners)
      setPlayers(battlePlayers.players)
      setDataInconsistencies([...battlePlayers.inconsistencies])
    } catch (err) {
      console.error('Preview roster load error', err)
      setPlayersError(err)
      setOwners(new Map())
      setPlayers([])
    } finally {
      setPlayersLoading(false)
    }
  }, [])

  const leaderboardStats = {
    totalTags: TOTAL_TAGS,
    assignedCount: owners.size,
    loading: playersLoading,
    error: playersError,
  }

  const leaderboardSummary = leaderboardStats.loading
    ? `${leaderboardStats.totalTags} tags · loading preview roster...`
    : leaderboardStats.error
      ? `${leaderboardStats.totalTags} tags · preview roster unavailable`
      : `${leaderboardStats.totalTags} tags · ${leaderboardStats.assignedCount ?? 0} assigned · ${PREVIEW_DATA_SOURCE}`

  function handleSelectMainView(nextView) {
    const normalized = MAIN_VIEW_ORDER.includes(nextView) ? nextView : DEFAULT_MAIN_VIEW
    setView(normalized)
    if (normalized === 'history') {
      setHistoryTab('matches')
    }
  }

  function handleApplyResult(result) {
    const updated = players.map((p) => {
      const rp = result.rankedPlayers.find((r) => r.id === p.id)
      if (rp) return { ...p, tag: rp.newTag }
      return p
    })
    setPlayers(updated)
    setLastResult(result)
    setView('battle')
  }

  function handleResultClose() {
    setLastResult(null)
    setView('bagtags')
  }

  return (
    <div className="app-shell">
      <header className="bt-header">
        <div className="bt-wordmark">
          <div className="brand">BAGTAG</div>
          <div className="muted">HARDHOF</div>
          <div className="preview-badge">PREVIEW</div>
        </div>

        <div className="bt-header-utility" aria-hidden="true" />
      </header>

      <main>
        <div className={`view-panel ${view === 'bagtags' ? 'is-visible' : 'is-hidden'}`}>
          <h2 className="section-title">THE TAGS</h2>
          <div className="section-sub">{leaderboardSummary}</div>
          <div className="tags-list">
            <Leaderboard owners={owners} loading={playersLoading} error={playersError} />
          </div>
        </div>

        <div className={`view-panel ${view === 'battle' ? 'is-visible' : 'is-hidden'}`}>
          <h2 className="section-title">NEW BATTLE</h2>
          <div className="section-sub">Select players and enter throws</div>

          <div className={`battle-form-panel ${lastResult ? 'battle-form-panel--hidden' : ''}`}>
            <NewMatch
              players={players}
              onPreview={(selectedWithScores) => {
                const result = redistributeTags(selectedWithScores)
                setLastResult(result)
              }}
              onConfirm={(selectedWithScores) => {
                const result = redistributeTags(selectedWithScores)
                handleApplyResult(result)
              }}
              previewResult={lastResult}
              registerConfirm={setConfirmApi}
              playersLoading={playersLoading}
              playersError={playersError}
              dataInconsistencies={dataInconsistencies}
            />
          </div>

          {lastResult && (
            <div>
              <h2 className="section-title">RESULT</h2>
              <div className="section-sub">Finalized battle result</div>
              <MatchResult result={lastResult} onClose={handleResultClose} />
            </div>
          )}
        </div>

        <div className={`view-panel ${view === 'history' ? 'is-visible' : 'is-hidden'}`}>
          <div className="history-subnav" role="tablist" aria-label="History sections">
            {HISTORY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={historyTab === tab}
                className={`history-subnav-item ${historyTab === tab ? 'history-subnav-item--active' : ''}`}
                onClick={() => setHistoryTab(tab)}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {historyTab === 'matches' && <HistoricalBattleHistory />}

          {historyTab === 'players' && <PlayerTimeline />}

          {historyTab === 'tags' && (
            <div className="history-placeholder">
              <h2 className="section-title">TAG JOURNEY</h2>
              <div className="section-sub">Coming soon.</div>
            </div>
          )}
        </div>
      </main>

      {view === 'battle' && !lastResult && (
        <div className="context-action">
          <button
            className="primary"
            disabled={!(confirmApi && confirmApi.canConfirm)}
            onClick={() => confirmApi && confirmApi.confirm && confirmApi.confirm()}
            style={{ width: '100%', maxWidth: 420 }}
          >
            CONFIRM BATTLE
          </button>
        </div>
      )}

      <BottomNav view={view} setView={handleSelectMainView} />
    </div>
  )
}

export default App


