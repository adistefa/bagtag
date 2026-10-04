import React, { useState, useEffect } from 'react'
import TagBadge from './TagBadge'

function PlayerRow({ player, active, onToggle, score, onScoreChange, resultMode }){
  return (
    <div className="player-row" onClick={() => onToggle(player.id)} role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==='Enter')onToggle(player.id)}}>
      <div className="player-left">
        <TagBadge number={player.tag} variant={active ? 'active' : 'inactive'} />

        <div className="player-info">
          <div className="player-name">{player.name}</div>
        </div>
      </div>

      <div>
        {active && resultMode === 'score' ? (
          <div className="score-control" onClick={(e)=>e.stopPropagation()}>
            <button className="score-btn" aria-label={`decrease ${player.name} score`} onClick={(e)=>{ e.stopPropagation(); onScoreChange(player.id, Number(score ?? 0) - 1) }}>−</button>
            <div className="score-display">{(score === 0 || score === '0' || score == null) ? 'E' : (Number(score) > 0 ? `+${Number(score)}` : String(Number(score)))}</div>
            <button className="score-btn" aria-label={`increase ${player.name} score`} onClick={(e)=>{ e.stopPropagation(); onScoreChange(player.id, Number(score ?? 0) + 1) }}>+</button>
          </div>
        ) : (
          <div style={{color:'var(--text-secondary)',fontSize:13}}>-</div>
        )}
      </div>
    </div>
  )
}

export default function NewMatch({ players = [], onPreview, onConfirm, previewResult, registerConfirm }) {
  const [selected, setSelected] = useState([])
  const [scores, setScores] = useState({})
  const [resultMode, setResultMode] = useState('finish') // 'finish' | 'score'
  const [finishOrder, setFinishOrder] = useState([]) // array of player ids in finishing order
  const [draggingId, setDraggingId] = useState(null)
  // Local-only battle context (preview mode)
  const [locations, setLocations] = useState(['Hardhof', 'Sibbe', 'Hinterhausen'])
  const [locationOpen, setLocationOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('Hardhof')

  const defaultCourses = {
    Hardhof: [ { name: '12 holes', holes: 12 }, { name: '18 holes', holes: 18 } ],
    Sibbe: [ { name: '9 holes', holes: 9 }, { name: '18 holes', holes: 18 } ],
    Hinterhausen: [ { name: '6 holes', holes: 6 }, { name: '18 holes', holes: 18 } ]
  }
  const [coursesByLocation, setCoursesByLocation] = useState(defaultCourses)
  const [courseOpen, setCourseOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState('18 holes')
  const [selectedCourseHoles, setSelectedCourseHoles] = useState(18)

  const [holesPlayed, setHolesPlayed] = useState(selectedCourseHoles)
  const [eventText, setEventText] = useState('')
  const [variantText, setVariantText] = useState('')
  const [search, setSearch] = useState('')

  // When location changes, update courses and defaults
  useEffect(() => {
    const courses = coursesByLocation[selectedLocation] || []
    // prefer an 18-holes course if available
    const preferred = courses.find(c => c.holes === 18) || courses[0]
    if (preferred) {
      setSelectedCourse(preferred.name)
      setSelectedCourseHoles(preferred.holes)
      setHolesPlayed(preferred.holes)
    } else {
      setSelectedCourse('')
      setSelectedCourseHoles(0)
      setHolesPlayed(0)
    }
    // close dropdowns
    setLocationOpen(false)
    setCourseOpen(false)
  }, [selectedLocation, coursesByLocation])

  function toggle(id){
    setSelected(s => {
      if (s.includes(id)) {
        // deselect: remove from selected and finishOrder
        setFinishOrder(f => f.filter(x => x !== id))
        return s.filter(x => x !== id)
      } else {
        // select: add to end of selected and append to finishOrder
        setScores(prev => ({...prev, [id]: prev[id] ?? 0}))
        setFinishOrder(f => (f.includes(id) ? f : [...f, id]))
        return [...s, id]
      }
    })
  }

  // keep finishOrder in sync if selected array changes externally
  useEffect(() => {
    setFinishOrder(f => {
      // include selected ids in their existing order, append any newly-selected ids
      const kept = f.filter(id => selected.includes(id))
      const appended = selected.filter(id => !kept.includes(id))
      return [...kept, ...appended]
    })
  }, [selected])

  function setScore(id, v){
    const n = v === '' ? '' : Number(v)
    setScores(s => ({...s, [id]: n}))
  }

  function gatherSelected(){
    if (resultMode === 'finish'){
      // Use finishOrder as authoritative order. Assign synthetic scores 0..n-1 so redistribution sorts correctly.
      const ordered = finishOrder.filter(id => selected.includes(id))
      return ordered.map((id, idx) => ({...players.find(p => p.id === id), score: idx}))
    }
    // score mode: keep numeric scores as entered (default 0)
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

  // expose preview action and whether confirm is enabled to parent via registerConfirm
  useEffect(() => {
    if (!registerConfirm) return
    const canConfirm = () => {
      const sel = selected
      if (sel.length < 2) return false
      if (resultMode === 'score'){
        // ensure scores numeric
        return !sel.some(id => !Number.isFinite(Number(scores[id] ?? 0)))
      }
      return true
    }
    const api = { canConfirm: canConfirm(), preview: () => handlePreview(), confirm: () => handleConfirm() }
    registerConfirm(api)
    return () => { registerConfirm(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, scores, resultMode])

  function reorderFinishOrder(fromIdx, toIdx){
    setFinishOrder(f => {
      const copy = [...f]
      const [item] = copy.splice(fromIdx,1)
      copy.splice(toIdx,0,item)
      return copy
    })
  }

  function moveFinish(id, dir){
    setFinishOrder(f => {
      const idx = f.indexOf(id)
      if (idx === -1) return f
      const to = Math.max(0, Math.min(f.length-1, idx + dir))
      if (to === idx) return f
      const copy = [...f]
      const [item] = copy.splice(idx,1)
      copy.splice(to,0,item)
      return copy
    })
  }

  return (
    <div>
      <div className="preview-note">
        <div style={{fontWeight:700, fontSize:13}}>PREVIEW MODE</div>
        <div className="player-sub">Try the battle flow. Results are not saved and BagTags will not change.</div>
      </div>
        {/* Battle context: location / course / holes / event / variant */}
        <div className="battle-context" style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <div style={{fontWeight:700,fontSize:13}}>WHERE ARE YOU PLAYING?</div>
          </div>

          <div className="context-row" style={{marginBottom:8}}>
            <div className="context-label">LOCATION</div>
            <div className="context-value" onClick={() => setLocationOpen(!locationOpen)} role="button" tabIndex={0}>
              {selectedLocation}
            </div>
          </div>
          {locationOpen && (
            <div className="context-list">
              {locations.map((loc) => (
                <div key={loc} className="context-item" onClick={() => setSelectedLocation(loc)}>{loc}</div>
              ))}
              <div className="context-item add" onClick={() => {
                const name = window.prompt('New location name')
                if (name && name.trim()) {
                  const n = name.trim()
                  setLocations(l => [...l, n])
                  // copy default empty course list
                  setCoursesByLocation(c => ({...c, [n]: [{ name: '18 holes', holes: 18 }]}))
                  setSelectedLocation(n)
                }
              }}>+ Add location</div>
            </div>
          )}

          <div className="context-row" style={{marginBottom:8}}>
            <div className="context-label">COURSE</div>
            <div className="context-value" onClick={() => setCourseOpen(!courseOpen)} role="button" tabIndex={0}>
              {selectedCourse || '—'}
            </div>
          </div>
          {courseOpen && (
            <div className="context-list">
              {(coursesByLocation[selectedLocation] || []).map((c) => (
                <div key={c.name} className="context-item" onClick={() => { setSelectedCourse(c.name); setSelectedCourseHoles(c.holes); setHolesPlayed(c.holes) }}>{c.name}</div>
              ))}
              <div className="context-item add" onClick={() => {
                const name = window.prompt('New course name (e.g. "Front 9")')
                if (!name || !name.trim()) return
                const holesStr = window.prompt('Holes for this course (number)')
                const holesNum = Number(holesStr)
                const entry = { name: name.trim(), holes: Number.isFinite(holesNum) && holesNum > 0 ? holesNum : 18 }
                setCoursesByLocation(c => ({...c, [selectedLocation]: [...(c[selectedLocation]||[]), entry]}))
                setSelectedCourse(entry.name)
                setSelectedCourseHoles(entry.holes)
                setHolesPlayed(entry.holes)
              }}>+ Add course</div>
            </div>
          )}

          <div className="context-row" style={{marginBottom:8}}>
            <div className="context-label">HOLES PLAYED</div>
            <div className="context-value">
              <input type="number" value={holesPlayed} onChange={(e) => setHolesPlayed(Number(e.target.value || 0))} style={{width:96,textAlign:'center',padding:8,borderRadius:8,background:'transparent',border:'1px solid var(--border)',color:'var(--text-primary)'}} />
            </div>
          </div>

          <div className="context-row" style={{marginBottom:8}}>
            <div className="context-label">EVENT · OPTIONAL</div>
            <div className="context-value">
              <input type="text" placeholder="None" value={eventText} onChange={(e) => setEventText(e.target.value)} style={{width:'100%',padding:8,borderRadius:8,background:'transparent',border:'1px solid var(--border)',color:'var(--text-primary)'}} />
            </div>
          </div>

          <div className="context-row" style={{marginBottom:6}}>
            <div className="context-label">VARIANT · OPTIONAL</div>
            <div className="context-value">
              <input type="text" placeholder="e.g. T4 / T8 closed" value={variantText} onChange={(e) => setVariantText(e.target.value)} style={{width:'100%',padding:8,borderRadius:8,background:'transparent',border:'1px solid var(--border)',color:'var(--text-primary)'}} />
            </div>
          </div>
        </div>

        {/* Result mode selector */}
        <div style={{display:'flex',alignItems:'center',gap:8,margin:'10px 0'}}>
          <div style={{fontWeight:700}}>RESULT BY</div>
          <div style={{display:'flex',gap:8}}>
            <button className={`bt-btn ${resultMode==='finish'?'bt-btn--active':''}`} onClick={() => setResultMode('finish')}>FINISH ORDER</button>
            <button className={`bt-btn ${resultMode==='score'?'bt-btn--active':''}`} onClick={() => setResultMode('score')}>SCORE</button>
          </div>
        </div>

        {resultMode === 'finish' && (
          <div style={{marginBottom:8}}>
            <div className="player-sub" style={{marginBottom:8}}>Drag players into their final position.</div>
            <div className="finish-list">
              {finishOrder.filter(id => selected.includes(id)).map((id, idx) => {
                const p = players.find(pp => pp.id === id)
                if (!p) return null
                return (
                  <div key={id} className="finish-row" draggable onDragStart={(e)=>{ setDraggingId(id); e.dataTransfer.setData('text/plain', String(id)) }} onDragOver={(e)=>{ e.preventDefault() }} onDrop={(e)=>{ e.preventDefault(); const src = Number(e.dataTransfer.getData('text/plain')); const toIdx = finishOrder.filter(fid=>selected.includes(fid)).indexOf(id); const fromIdx = finishOrder.filter(fid=>selected.includes(fid)).indexOf(src); if(fromIdx>-1 && toIdx>-1) reorderFinishOrder(fromIdx, toIdx) }}>
                    <div className="pos-badge">{idx+1}</div>
                    <div className="drag-handle">☰</div>
                    <div style={{flex:1,fontWeight:700}}>{p.name}</div>
                    <div style={{minWidth:70,textAlign:'right'}}>{`#${p.tag}`}</div>
                    <div style={{display:'flex',flexDirection:'column',marginLeft:8}}>
                      <button className="score-btn" aria-label={`move up ${p.name}`} onClick={(e)=>{e.stopPropagation(); moveFinish(id, -1)}}>▲</button>
                      <button className="score-btn" aria-label={`move down ${p.name}`} onClick={(e)=>{e.stopPropagation(); moveFinish(id, +1)}}>▼</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Player search + list */}
        <div style={{marginTop:10, marginBottom:6}}>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
            <input className="search-input" placeholder="Search players" value={search} onChange={(e)=>setSearch(e.target.value)} style={{flex:1,padding:8,borderRadius:8,background:'transparent',border:'1px solid var(--border)',color:'var(--text-primary)'}} />
            {search.trim() !== '' && (
              <button className="bt-btn" onClick={() => setSearch('')}>Clear</button>
            )}
          </div>
        </div>

        <div style={{borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
          {(() => {
            const q = search.trim().toLowerCase()
            const filtered = q === '' ? players : players.filter(p => {
              const name = (p.name || p.display_name || p.username || '').toLowerCase()
              return name.includes(q)
            })
            return filtered.map(p => (
              <PlayerRow key={p.id} player={p} active={selected.includes(p.id)} onToggle={toggle} score={scores[p.id]} onScoreChange={setScore} resultMode={resultMode} />
            ))
          })()}
        </div>

      {/* Preview action moved to fixed contextual footer; in-scroll button removed */}

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
