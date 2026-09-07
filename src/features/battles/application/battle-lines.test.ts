import { describe, expect, it } from 'vitest'

import { type PublicBattle } from '@/shared/contracts'

import { battleLines, orderedBattles } from './battle-lines'

function battle(id: string, over: Partial<PublicBattle> = {}): PublicBattle {
  return {
    id,
    status: 'PENDING',
    ranked: true,
    role: 'OPPONENT',
    rival: { id: `${id}-rival`, username: id, rating: 1200 },
    outcome: null,
    currentRound: 0,
    createdAt: '2026-09-07T10:15:00.000Z',
    startedAt: null,
    endedAt: null,
    ...over,
  }
}

const RUNNING = battle('grace', { status: 'IN_PROGRESS', currentRound: 3 })
const INVITATION = battle('turing')
const SENT = battle('ada', { role: 'CHALLENGER' })
const OVER = battle('hopper', { status: 'FINISHED', outcome: 'WON', role: 'CHALLENGER' })

describe('orderedBattles', () => {
  it('leads with what is already on, then what waits on us, then ours, then history', () => {
    expect(orderedBattles([OVER, SENT, INVITATION, RUNNING])).toEqual([
      RUNNING,
      INVITATION,
      SENT,
      OVER,
    ])
  })
})

describe('battleLines', () => {
  it('says so when the list comes back empty', () => {
    expect(battleLines([])).toEqual(['Nadie te desafió y vos tampoco'])
  })

  it('numbers straight through the headings, so a number means one row', () => {
    expect(battleLines(orderedBattles([OVER, SENT, INVITATION, RUNNING]))).toEqual([
      'EN JUEGO',
      ' 1) grace                   ronda 3',
      'TE DESAFIARON',
      ' 2) turing                  esperando tu respuesta',
      'DESAFIASTE',
      ' 3) ada                     esperando respuesta',
      'TERMINADAS',
      ' 4) hopper                  ganaste',
    ])
  })

  it('leaves out the heading of a group nobody is in', () => {
    expect(battleLines(orderedBattles([OVER]))).toEqual([
      'TERMINADAS',
      ' 1) hopper                  ganaste',
    ])
  })

  it('carries the unranked warning into the row', () => {
    expect(battleLines(orderedBattles([battle('grace', { ranked: false })]))[1]).toContain(
      'sin rating en juego',
    )
  })
})
