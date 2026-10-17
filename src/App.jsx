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
import ScreenTitle from './components/ScreenTitle'
import AnnouncementTicker from './components/AnnouncementTicker'
import { mapOwnersToBattlePlayers } from './utils/liveOwnership'
import { getPreviewRosterOwners, PREVIEW_DATA_SOURCE } from './data/previewRoster'
import { DEFAULT_MAIN_VIEW, HISTORY_TABS, MAIN_VIEW_ORDER } from './utils/navigation'

function buildResultFromRankingOrder(playersInRanking = []) {
  if (!Array.isArray(playersInRanking) || playersInRanking.length === 0) {
    return { rankedPlayers: [], exchanges: [], kept: [] }
  }

  const participatingTags = playersInRanking
    .map((player) => Number(player.tag))
    .filter((tag) => Number.isFinite(tag))
    .sort((a, b) => a - b)

  const rankedPlayers = playersInRanking.map((player, index) => {
    const oldTag = Number(player.tag)
    const newTag = participatingTags[index]
    return {
      id: player.id,
      name: player.name,
      score: null,
      position: index + 1,
      oldTag,
      newTag,
    }
  })

  const exchanges = []
  rankedPlayers.forEach((rankedPlayer) => {
    if (rankedPlayer.oldTag !== rankedPlayer.newTag) {
      const originalOwner = playersInRanking.find((player) => Number(player.tag) === Number(rankedPlayer.newTag))
      exchanges.push({ tag: rankedPlayer.newTag, from: originalOwner ? originalOwner.name : null, to: rankedPlayer.name })
    }
  })

  const kept = rankedPlayers.filter((player) => player.oldTag === player.newTag).map((player) => player.id)
  return { rankedPlayers, exchanges, kept }
}

function buildBattleResultFromEntry(entryPayload) {
  if (entryPayload?.entryMode === 'ranking') {
    return buildResultFromRankingOrder(entryPayload.players)
  }
  return redistributeTags(entryPayload?.players || [])
}

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
  const isBattleView = view === 'battle'

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

  function handleSelectMainView(nextView) {
    const normalized = MAIN_VIEW_ORDER.includes(nextView) ? nextView : DEFAULT_MAIN_VIEW
    setView(normalized)
    if (normalized !== 'battle') {
      setLastResult(null)
    }
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

  const currentScreenTitle = view === 'battle' ? 'BATTLE' : view === 'history' ? 'HISTORY' : 'BAGTAG'

  return (
    <div className="app-shell">
      <header className="bt-header">
        <ScreenTitle preview="PREVIEW" kicker="HARDHOF" title={currentScreenTitle} />
        <div className="bt-header-utility" aria-hidden="true" />
      </header>

      <AnnouncementTicker />

      <main className={isBattleView ? 'app-main app-main--battle' : 'app-main'}>
        <div className={`view-panel ${view === 'bagtags' ? 'is-visible' : 'is-hidden'}`}>
          <div className="tags-list" title={PREVIEW_DATA_SOURCE}>
            <Leaderboard owners={owners} loading={playersLoading} error={playersError} />
          </div>
        </div>

        <div className={`view-panel view-panel--battle ${view === 'battle' ? 'is-visible' : 'is-hidden'}`}>
          <div className={`battle-form-panel ${lastResult ? 'battle-form-panel--hidden' : ''}`}>
            <NewMatch
              players={players}
              onPreview={(entryPayload) => {
                const result = buildBattleResultFromEntry(entryPayload)
                setLastResult(result)
              }}
              onConfirm={(entryPayload) => {
                const result = buildBattleResultFromEntry(entryPayload)
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
              <MatchResult result={lastResult} />
            </div>
          )}
        </div>

        <div className={`view-panel ${view === 'history' ? 'is-visible' : 'is-hidden'}`}>
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

      {view === 'history' && (
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
      )}

      {view === 'battle' && !lastResult && (
        <div className="context-action">
          {confirmApi && !confirmApi.canConfirm && confirmApi.disabledReason && (
            <span
              id="confirm-battle-disabled-reason"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              {confirmApi.disabledReason}
            </span>
          )}
          <button
            className="primary"
            disabled={!(confirmApi && confirmApi.canConfirm)}
            aria-describedby={confirmApi && !confirmApi.canConfirm && confirmApi.disabledReason ? 'confirm-battle-disabled-reason' : undefined}
            title={confirmApi && !confirmApi.canConfirm ? (confirmApi.disabledReason || 'Complete required battle inputs') : undefined}
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


