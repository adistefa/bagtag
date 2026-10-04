import React from 'react'
import TagBadge from './TagBadge'

export default function MatchResult({ result, onClose }) {
  const { rankedPlayers = [], exchanges = [] } = result || {}

  return (
    <div>
      <div className="preview-note" style={{marginBottom:12}}>
        <div className="player-sub">Preview only · This result was not saved.</div>
      </div>
      <div style={{borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
        {rankedPlayers.map(r => (
          <div key={r.id} className="result-player">
            <div className="result-left">
              <div className="result-pos">{r.position}</div>
              <div className="result-info">
                <div className="result-name">{r.name}</div>
                <div className="result-meta">score {r.score}</div>
              </div>
            </div>
            <div className="tag-change">
              {r.oldTag === r.newTag ? (
                <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8}}>
                  <TagBadge number={r.oldTag} variant={'inactive'} />
                  <div className="defended">DEFENDED #{String(r.oldTag)}</div>
                </div>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8}}>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <TagBadge number={r.oldTag} variant={'inactive'} />
                    <div>→</div>
                    <TagBadge number={r.newTag} variant={'active'} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="exchanges">
        <h3 style={{margin:'6px 0'}}>PHYSICAL EXCHANGES</h3>
        {exchanges.length === 0 ? <div className="player-sub">No exchanges required — all tags defended.</div> : (
          exchanges.map((ex,i) => (
            <div key={i} className="exchange">
              <div className="exchange-num">#{String(ex.tag)}</div>
              <div className="exchange-fromto">
                <div style={{fontWeight:800}}>{ex.from} → {ex.to}</div>
                <div className="exchange-from">hand tag over</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{marginTop:12}}>
        <button className="primary" onClick={onClose}>BACK TO TAGS</button>
      </div>
    </div>
  )
}
