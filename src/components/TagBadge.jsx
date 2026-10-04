import React from 'react'

function fmt(n){
  if (n == null) return ''
  return String(Number(n))
}

export default function TagBadge({ number, size = 44, variant = 'inactive' }){
  // variant: 'active' | 'inactive' | 'unassigned'
  const cls = ['tag-badge', variant === 'active' ? 'active' : '', variant === 'unassigned' ? 'unassigned' : ''].join(' ')
  const style = { width: size, height: size, minWidth: size, minHeight: size }
  return (
    <div className={cls} style={style} aria-hidden>
      <div className="tag-inner">#{fmt(number)}</div>
    </div>
  )
}
