import React from 'react'

const NAV_ITEMS = [
  { key: 'battle', icon: '+', label: 'BATTLE' },
  { key: 'history', icon: '◌', label: 'HISTORY' },
  { key: 'bagtags', icon: '#', label: 'BAGTAGS' },
]

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
          <div className="bottom-icon" aria-hidden="true">{item.icon}</div>
          <div className="bottom-label">{item.label}</div>
        </button>
      ))}
    </nav>
  )
}
