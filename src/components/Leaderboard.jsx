import React, { useEffect, useState } from 'react'
import TagBadge from './TagBadge'
import { supabase } from '../lib/supabase'

function TagRow({ tag, owner }) {
  const isAssigned = !!owner
  return (
    <div className="tag-row">
      <TagBadge number={tag} variant={isAssigned ? 'inactive' : 'unassigned'} />
      <div className="tag-owner">
        <div className="owner-name">{isAssigned ? owner.name.toUpperCase() : '—'}</div>
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const tags = Array.from({ length: 100 }, (_, i) => i + 1)

  const [owners, setOwners] = useState(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await supabase
          .schema('bagtag')
          .from('v_leaderboard')
          .select('*')
          .order('tag_number', { ascending: true })

        if (!mounted) return
        if (res.error) {
          setError(res.error)
          setOwners(new Map())
        } else if (res.data) {
          const map = new Map()
          res.data.forEach((row) => {
            // prefer display_name, fallback to username
            const name = row.display_name && row.display_name.trim() !== '' ? row.display_name : row.username
            map.set(Number(row.tag_number), { id: row.player_id, name })
          })
          setOwners(map)
        }
      } catch (e) {
        console.error('Leaderboard load error', e)
        if (mounted) setError(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div>
      {loading && <div className="loader">Loading tags…</div>}
      {error && <div className="error">Unable to load leaderboard — check console.</div>}
      {tags.map((t) => {
        const owner = owners.get(t)
        return <TagRow key={t} tag={t} owner={owner} />
      })}
      {!loading && owners.size === 0 && (
        <div className="empty">No assigned tags found.</div>
      )}
    </div>
  )
}
