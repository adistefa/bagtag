import { describe, it, expect } from 'vitest'
import { redistributeTags } from './bagtag'

describe('redistributeTags (authoritative rule: score ASC, then startingTag ASC)', () => {
  it('1. all unique scores', () => {
    const players = [
      { id: 1, name: 'Ale', tag: 34, score: 48 },
      { id: 2, name: 'Livio', tag: 7, score: 51 },
      { id: 3, name: 'Pascal', tag: 61, score: 55 },
      { id: 4, name: 'Vitus', tag: 12, score: 59 },
    ]
    const res = redistributeTags(players)
    expect(res.rankedPlayers.map(r => r.id)).toEqual([1,2,3,4])
    expect(res.rankedPlayers.map(r => r.newTag)).toEqual([7,12,34,61])
  })

  it('2. tie between trailing players (tie broken by starting tag)', () => {
    const players = [
      { id: 1, name: 'Winner', tag: 34, score: 48 },
      { id: 2, name: 'Second', tag: 7, score: 51 },
      { id: 3, name: 'T1', tag: 12, score: 55 },
      { id: 4, name: 'T2', tag: 61, score: 55 },
    ]
    const res = redistributeTags(players)
    expect(res.rankedPlayers.map(r=>r.id)).toEqual([1,2,3,4])
    expect(res.rankedPlayers.map(r=>r.newTag)).toEqual([7,12,34,61])
    expect(res.rankedPlayers.find(r=>r.id===3).position).toBeLessThan(res.rankedPlayers.find(r=>r.id===4).position)
  })

  it('3. tie involving the lowest score (starting tag decides winner)', () => {
    const players = [
      { id: 1, name: 'Ale', tag: 20, score: 50 },
      { id: 2, name: 'Livio', tag: 3, score: 55 },
      { id: 3, name: 'Pascal', tag: 7, score: 55 },
    ]
    const res = redistributeTags(players)
    expect(res.rankedPlayers.map(r=>r.id)).toEqual([1,2,3])
    expect(res.rankedPlayers.map(r=>r.newTag)).toEqual([3,7,20])
  })

  it('4. three-way tie resolved by starting tags', () => {
    const players = [
      { id: 1, name: 'A', tag: 50, score: 40 },
      { id: 2, name: 'B', tag: 10, score: 55 },
      { id: 3, name: 'C', tag: 20, score: 55 },
      { id: 4, name: 'D', tag: 30, score: 55 },
    ]
    const res = redistributeTags(players)
    expect(res.rankedPlayers.map(r=>r.id)).toEqual([1,2,3,4])
    expect(res.rankedPlayers.map(r=>r.newTag)).toEqual([10,20,30,50])
  })

  it('5. Stefan Scenario 1 (example: Ale#20, Livio#3, Pascal#7)', () => {
    const players = [
      { id: 1, name: 'Ale', tag: 20, score: 50 },
      { id: 2, name: 'Livio', tag: 3, score: 55 },
      { id: 3, name: 'Pascal', tag: 7, score: 55 },
    ]
    const res = redistributeTags(players)
    expect(res.rankedPlayers.map(r=>r.id)).toEqual([1,2,3])
    expect(res.rankedPlayers.map(r=>r.newTag)).toEqual([3,7,20])
    const ex = res.exchanges.find(e => e.tag === 3)
    expect(ex.from).toBe('Livio')
    expect(ex.to).toBe('Ale')
  })

  it('6. Stefan Scenario 2 (example with extra player Paul#6)', () => {
    const players = [
      { id: 1, name: 'Ale', tag: 20, score: 50 },
      { id: 2, name: 'Livio', tag: 3, score: 55 },
      { id: 3, name: 'Pascal', tag: 7, score: 55 },
      { id: 4, name: 'Paul', tag: 6, score: 59 },
    ]
    const res = redistributeTags(players)
    expect(res.rankedPlayers.map(r=>r.newTag)).toEqual([3,6,7,20])
    const ex3 = res.exchanges.find(e=>e.tag===3)
    expect(ex3.from).toBe('Livio')
    expect(ex3.to).toBe('Ale')
  })

  it('7. no physical exchanges required', () => {
    const players = [
      { id: 1, name: 'A', tag: 1, score: 10 },
      { id: 2, name: 'B', tag: 2, score: 20 },
    ]
    const res = redistributeTags(players)
    expect(res.exchanges.length).toBe(0)
    expect(res.rankedPlayers.map(r=>r.newTag)).toEqual([1,2])
  })

  it('8. two-player battle', () => {
    const players = [
      { id: 1, name: 'Winner', tag: 10, score: 50 },
      { id: 2, name: 'Loser', tag: 2, score: 60 },
    ]
    const res = redistributeTags(players)
    expect(res.rankedPlayers.map(r=>r.newTag)).toEqual([2,10])
    const ex = res.exchanges.find(e => e.tag === 2)
    expect(ex.from).toBe('Loser')
    expect(ex.to).toBe('Winner')
  })
})
