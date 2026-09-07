import { describe, expect, it } from 'vitest'

import { leaderboardHeadline, leaderboardLines } from './leaderboard-lines'

const ADA = { rank: 1, id: 'ada-id', username: 'ada', rating: 1216 }
const GRACE = { rank: 2, id: 'grace-id', username: 'grace', rating: 1180 }
const LOVELACE = { rank: 10, id: 'lovelace-id', username: 'lovelace', rating: 998 }

describe('leaderboardHeadline', () => {
  it('says nothing is there when the arena has nobody ranked yet', () => {
    expect(leaderboardHeadline(0)).toBe('Todavía no hay nadie en el ranking')
  })

  it('counts one player without the plural', () => {
    expect(leaderboardHeadline(1)).toBe('Top 1 de la arena')
  })

  it('counts the rest', () => {
    expect(leaderboardHeadline(25)).toBe('Top 25 de la arena')
  })
})

describe('leaderboardLines', () => {
  it('says so when the ranking comes back empty', () => {
    expect(leaderboardLines([])).toEqual(['Todavía no peleó nadie'])
  })

  it('prints the rank the arena resolved, not the position in the array', () => {
    expect(leaderboardLines([LOVELACE])).toEqual([expect.stringContaining('10)')])
  })

  it('lines up the name and the rating in their own columns', () => {
    const [first, second] = leaderboardLines([ADA, GRACE])

    expect(first).toBe(' 1) ada                     1216')
    expect(second).toBe(' 2) grace                   1180')
  })

  it('marks the row that belongs to whoever is reading', () => {
    expect(leaderboardLines([ADA, GRACE], 'grace-id')).toEqual([
      ' 1) ada                     1216',
      ' 2) grace                   1180  · vos',
    ])
  })

  it('marks nobody when the reader is not on this page of the ranking', () => {
    expect(leaderboardLines([ADA, GRACE], 'lovelace-id')).toEqual([
      ' 1) ada                     1216',
      ' 2) grace                   1180',
    ])
  })
})
