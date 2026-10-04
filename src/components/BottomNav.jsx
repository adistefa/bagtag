import React from 'react'

export default function BottomNav({ view, setView }){
  /* view: 'leaderboard' | 'newmatch' | 'result' */
  const active = (name) => view === name ? 'bt-btn--active' : ''
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main">
      <button className={`bottom-item ${active('leaderboard')}`} onClick={() => setView('leaderboard')}>
        <div className="bottom-icon">#</div>
        <div className="bottom-label">TAGS</div>
      </button>

      <button className={`bottom-item ${active('newmatch')}`} onClick={() => setView('newmatch')}>
        <div className="bottom-icon">+</div>
        <div className="bottom-label">BATTLE</div>
      </button>
    </nav>
  )
}
