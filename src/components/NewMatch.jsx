import React, { useState } from 'react'
import TagBadge from './TagBadge'

function PlayerRow({ player, active, onToggle, score, onScoreChange }){
  return (
    <div className="player-row" onClick={() => onToggle(player.id)} role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==='Enter')onToggle(player.id)}}>
      <div className="player-left">
        <TagBadge number={player.tag} variant={active ? 'active' : 'inactive'} />

        <div className="player-info">
          <div className="player-name">{player.name}</div>
        </div>
      </div>

      <div>
        {active ? (
          <input className="score-input" type="number" inputMode="numeric" value={score ?? ''} onChange={(e)=>onScoreChange(player.id, e.target.value)} onClick={(e)=>e.stopPropagation()} />
        ) : (
          <div style={{color:'var(--text-secondary)',fontSize:13}}>-</div>
        )}
      </div>
    </div>
  )
}

export default function NewMatch({ players = [], onPreview, onConfirm, previewResult }) {
  const [selected, setSelected] = useState([])
  const [scores, setScores] = useState({})

  function toggle(id){
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
    // keep scores as is
  }

  function setScore(id, v){
    const n = v === '' ? '' : Number(v)
    setScores(s => ({...s, [id]: n}))
  }

  function gatherSelected(){
    return selected.map(id => ({...players.find(p=>p.id===id), score: Number(scores[id] ?? 0)}))
  }

  function handlePreview(){
    const sel = gatherSelected()
    if(sel.length < 2){ alert('Select at least 2 players'); return }
    if(sel.some(s => !Number.isFinite(s.score))){ alert('Enter numeric scores for all selected players'); return }
    onPreview && onPreview(sel)
  }

  function handleConfirm(){
    const sel = gatherSelected()
    if(sel.length < 2){ alert('Select at least 2 players'); return }
    onConfirm && onConfirm(sel)
  }

  return (
    <div>
      <div className="preview-note">
        <div style={{fontWeight:700, fontSize:13}}>PREVIEW MODE</div>
        <div className="player-sub">Try the battle flow. Results are not saved and BagTags will not change.</div>
      </div>
      <div style={{borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
        {players.map(p => (
          <PlayerRow key={p.id} player={p} active={selected.includes(p.id)} onToggle={toggle} score={scores[p.id]} onScoreChange={setScore} />
        ))}
      </div>

      <div className="actions">
        <button className="secondary" onClick={handlePreview}>PREVIEW RESULT</button>
        <button className="primary" onClick={handleConfirm}>CONFIRM</button>
      </div>

      {previewResult && (
        <div style={{marginTop:16}}>
          <h3 style={{margin:'6px 0'}}>Preview</h3>
          <div style={{borderTop:'1px solid var(--border)'}}>
            {previewResult.rankedPlayers.map(r => (
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
            <h4 style={{margin:'8px 0'}}>Physical exchanges</h4>
            {previewResult.exchanges.length === 0 ? <div className="player-sub">All players keep their tags.</div> : (
              previewResult.exchanges.map((ex,i) => (
                <div key={i} className="exchange">
                  <div className="exchange-num">#{String(ex.tag)}</div>
                  <div className="exchange-fromto">
                    <div style={{fontWeight:700}}>{ex.from} → {ex.to}</div>
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
