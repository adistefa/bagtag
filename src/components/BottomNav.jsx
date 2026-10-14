import React from 'react'

const NAV_ITEMS = [
  { key: 'battle', icon: '+', label: 'BATTLE' },
  { key: 'history', icon: 'history', label: 'HISTORY' },
  { key: 'bagtags', icon: '#', label: 'BAGTAGS' },
]

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 17.5V7.5M10 17.5V4.5M15 17.5V9.5M20 17.5V12.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M3.5 18.5H20.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

export default function BottomNav({ view, setView }) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`bottom-item ${view === item.key ? 'bottom-item--active' : ''}`}
          onClick={() => setView(item.key)}
          aria-current={view === item.key ? 'page' : undefined}
        >
          <div className="bottom-icon" aria-hidden="true">
            {item.icon === 'history' ? <HistoryIcon /> : item.icon}
          </div>
          <div className="bottom-label">{item.label}</div>
        </button>
      ))}
    </nav>
  )
}
