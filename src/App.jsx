import { useState } from 'react'
import './App.css'
import './index.css'
import playersData from './data/players'
import { redistributeTags } from './utils/bagtag'
import Leaderboard from './components/Leaderboard'
import NewMatch from './components/NewMatch'
import MatchResult from './components/MatchResult'
import BottomNav from './components/BottomNav'

function App() {
  const [players, setPlayers] = useState(playersData)
  const [view, setView] = useState('leaderboard') // 'leaderboard' | 'newmatch' | 'result'
  const [lastResult, setLastResult] = useState(null)
  const [confirmApi, setConfirmApi] = useState(null)

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
      </header>

      <main>
        {view === 'leaderboard' && (
          <div>
            <h2 className="section-title">THE TAGS</h2>
            <div className="section-sub">100 tags · {players.filter(p => p.tag != null).length} assigned</div>
            <div className="tags-list">
              <Leaderboard players={players} onStartBattle={() => setView('newmatch')} />
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
            }} previewResult={lastResult} registerConfirm={setConfirmApi} />
          </div>
        )}

        {view === 'result' && lastResult && (
          <div>
            <h2 className="section-title">RESULT</h2>
            <div className="section-sub">Finalized battle result</div>
            <MatchResult result={lastResult} onClose={() => setView('leaderboard')} />
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


