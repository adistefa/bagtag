import { useEffect, useState } from 'react'
import './App.css'
import './index.css'
import { redistributeTags } from './utils/bagtag'
import Leaderboard from './components/Leaderboard'
import NewMatch from './components/NewMatch'
import MatchResult from './components/MatchResult'
import HistoricalBattleHistory from './components/HistoricalBattleHistory'
import BottomNav from './components/BottomNav'
import { supabase } from './lib/supabase'
import { mapLeaderboardRowsToOwners, mapOwnersToBattlePlayers } from './utils/liveOwnership'

const TOTAL_TAGS = 100

function App() {
  const [players, setPlayers] = useState([])
  const [owners, setOwners] = useState(new Map())
  const [playersLoading, setPlayersLoading] = useState(true)
  const [playersError, setPlayersError] = useState(null)
  const [dataInconsistencies, setDataInconsistencies] = useState([])
  const [view, setView] = useState('leaderboard') // 'leaderboard' | 'newmatch' | 'result'
  const [lastResult, setLastResult] = useState(null)
  const [confirmApi, setConfirmApi] = useState(null)

  useEffect(() => {
    let mounted = true

    async function loadLiveOwnership() {
      setPlayersLoading(true)
      setPlayersError(null)
      setDataInconsistencies([])

      try {
        const res = await supabase
          .schema('bagtag')
          .from('v_leaderboard')
          .select('*')
          .order('tag_number', { ascending: true })

        if (!mounted) return

        if (res.error) {
          setPlayersError(res.error)
          setOwners(new Map())
          setPlayers([])
          return
        }

        const rows = Array.isArray(res.data) ? res.data : []
        const ownership = mapLeaderboardRowsToOwners(rows)
        const battlePlayers = mapOwnersToBattlePlayers(ownership.owners)

        setOwners(ownership.owners)
        setPlayers(battlePlayers.players)
        setDataInconsistencies([...ownership.inconsistencies, ...battlePlayers.inconsistencies])
      } catch (err) {
        console.error('Live ownership load error', err)
        if (mounted) {
          setPlayersError(err)
          setOwners(new Map())
          setPlayers([])
        }
      } finally {
        if (mounted) setPlayersLoading(false)
      }
    }

    loadLiveOwnership()
    return () => {
      mounted = false
    }
  }, [])

  const leaderboardStats = {
    totalTags: TOTAL_TAGS,
    assignedCount: owners.size,
    loading: playersLoading,
    error: playersError,
  }

  const leaderboardSummary = leaderboardStats.loading
    ? `${leaderboardStats.totalTags} tags · loading live ownership...`
    : leaderboardStats.error
      ? `${leaderboardStats.totalTags} tags · live ownership unavailable`
      : `${leaderboardStats.totalTags} tags · ${leaderboardStats.assignedCount ?? 0} assigned`

  function handleApplyResult(result) {
    // result.rankedPlayers contains players with newTag
    // update players state with new tags
    const updated = players.map((p) => {
      const rp = result.rankedPlayers.find((r) => r.id === p.id)
      if (rp) return { ...p, tag: rp.newTag }
      return p
    })
    setPlayers(updated)
    setLastResult(result)
    setView('result')
  }

  return (
    <div className="app-shell">
      <header className="bt-header">
        <div className="bt-wordmark">
          <div className="brand">BAGTAG</div>
          <div className="muted">HARDHOF</div>
          <div className="preview-badge">PREVIEW</div>
        </div>

        <div className="bt-header-actions">
          <button
            type="button"
            className={`bt-header-action ${view === 'history' ? 'bt-header-action--active' : ''}`}
            onClick={() => setView('history')}
          >
            HISTORY
          </button>
        </div>
      </header>

      <main>
        {view === 'leaderboard' && (
          <div>
            <h2 className="section-title">THE TAGS</h2>
            <div className="section-sub">{leaderboardSummary}</div>
            <div className="tags-list">
              <Leaderboard
                owners={owners}
                loading={playersLoading}
                error={playersError}
              />
            </div>
          </div>
        )}

        {view === 'newmatch' && (
          <div>
            <h2 className="section-title">NEW BATTLE</h2>
            <div className="section-sub">Select players and enter throws</div>
            <NewMatch players={players} onPreview={(selectedWithScores) => {
              const result = redistributeTags(selectedWithScores)
              setLastResult(result)
            }} onConfirm={(selectedWithScores) => {
              const result = redistributeTags(selectedWithScores)
              handleApplyResult(result)
            }} previewResult={lastResult} registerConfirm={setConfirmApi} playersLoading={playersLoading} playersError={playersError} dataInconsistencies={dataInconsistencies} />
          </div>
        )}

        {view === 'result' && lastResult && (
          <div>
            <h2 className="section-title">RESULT</h2>
            <div className="section-sub">Finalized battle result</div>
            <MatchResult result={lastResult} onClose={() => setView('leaderboard')} />
          </div>
        )}

        {view === 'history' && (
          <div>
            <HistoricalBattleHistory />
            <div className="history-back-row">
              <button type="button" className="secondary history-back-btn" onClick={() => setView('leaderboard')}>
                BACK TO TAGS
              </button>
            </div>
          </div>
        )}
      </main>
      {/* Contextual action row (only on New Battle) */}
      {view === 'newmatch' && (
        <div className="context-action">
          <button className="primary" disabled={!(confirmApi && confirmApi.canConfirm)} onClick={() => confirmApi && confirmApi.confirm && confirmApi.confirm()} style={{width:'100%',maxWidth:420}}>CONFIRM BATTLE</button>
        </div>
      )}

      <BottomNav view={view} setView={(v)=>{
        // If user taps BATTLE from RESULT, start a new battle
        if (view === 'result' && v === 'newmatch'){
          // clear lastResult so the NewMatch starts fresh
          setLastResult(null)
        }
        setView(v)
      }} />
    </div>
  )
}

export default App


