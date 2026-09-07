import { describe, expect, it } from 'vitest'

import { type PublicBattle } from '@/shared/contracts'

import {
  acceptLock,
  battleDetail,
  battleHeadline,
  cancelLock,
  rejectLock,
  UNRANKED_NOTE,
} from './battle-messages'

function battle(over: Partial<PublicBattle> = {}): PublicBattle {
  return {
    id: 'b1',
    status: 'PENDING',
    ranked: true,
    role: 'OPPONENT',
    rival: { id: 'grace-id', username: 'grace', rating: 1350 },
    outcome: null,
    currentRound: 0,
    createdAt: '2026-09-07T10:15:00.000Z',
    startedAt: null,
    endedAt: null,
    ...over,
  }
}

describe('battleDetail', () => {
  it('says a challenge is waiting on the player', () => {
    expect(battleDetail(battle())).toBe('esperando tu respuesta')
  })

  it('says our own challenge is waiting on the other side', () => {
    expect(battleDetail(battle({ role: 'CHALLENGER' }))).toBe('esperando respuesta')
  })

  it('says an accepted battle is ready to start', () => {
    expect(battleDetail(battle({ status: 'ACCEPTED' }))).toBe('lista para empezar')
  })

  it('counts the round of a battle already running', () => {
    expect(battleDetail(battle({ status: 'IN_PROGRESS', currentRound: 3 }))).toBe('ronda 3')
  })

  it('reads the outcome the arena already resolved', () => {
    expect(battleDetail(battle({ status: 'FINISHED', outcome: 'WON' }))).toBe('ganaste')
    expect(battleDetail(battle({ status: 'FINISHED', outcome: 'LOST' }))).toBe('perdiste')
  })

  it('says a finished battle with no outcome ended without one', () => {
    expect(battleDetail(battle({ status: 'FINISHED' }))).toBe('terminó sin resultado')
  })

  it('names the two ways a challenge dies', () => {
    expect(battleDetail(battle({ status: 'REJECTED' }))).toBe('rechazada')
    expect(battleDetail(battle({ status: 'CANCELLED' }))).toBe('cancelada')
  })

  it('warns that a fight between friends does not move the rating', () => {
    expect(battleDetail(battle({ ranked: false }))).toBe(
      `esperando tu respuesta · ${UNRANKED_NOTE}`,
    )
  })

  it('leaves the warning off a battle that is already over', () => {
    expect(battleDetail(battle({ status: 'FINISHED', outcome: 'WON', ranked: false }))).toBe(
      'ganaste',
    )
  })
})

describe('battleHeadline', () => {
  it('says nothing has happened yet', () => {
    expect(battleHeadline([])).toBe('Todavía no peleaste ninguna')
  })

  it('leads with the battle already on', () => {
    expect(battleHeadline([battle({ status: 'IN_PROGRESS' }), battle()])).toBe(
      'Tenés 1 batalla en juego · 1 desafío esperándote',
    )
  })

  it('leads with what waits on the player when nothing is running', () => {
    expect(battleHeadline([battle(), battle({ id: 'b2' })])).toBe('Tenés 2 desafíos esperándote')
  })

  it('falls back to counting the whole list when nothing needs an answer', () => {
    expect(battleHeadline([battle({ status: 'FINISHED', outcome: 'WON' })])).toBe('Tenés 1 batalla')
  })
})

describe('acceptLock', () => {
  it('leaves a challenge somebody else sent open', () => {
    expect(acceptLock(battle())).toBeUndefined()
  })

  it('says our own challenge is not ours to accept', () => {
    expect(acceptLock(battle({ role: 'CHALLENGER' }))).toBe(
      'Este lo mandaste vos: lo tiene que aceptar la otra persona',
    )
  })

  it('says a battle past the invitation cannot be accepted', () => {
    expect(acceptLock(battle({ status: 'ACCEPTED' }))).toBe('Ese desafío ya está contestado')
  })
})

describe('rejectLock', () => {
  it('turns down exactly what it could have accepted', () => {
    expect(rejectLock(battle())).toBeUndefined()
    expect(rejectLock(battle({ role: 'CHALLENGER' }))).toBe(
      'Este lo mandaste vos: para eso está cancelarlo',
    )
  })
})

describe('cancelLock', () => {
  it('takes back only our own pending challenge', () => {
    expect(cancelLock(battle({ role: 'CHALLENGER' }))).toBeUndefined()
    expect(cancelLock(battle())).toBe('Este te lo mandaron: para eso está rechazarlo')
    expect(cancelLock(battle({ role: 'CHALLENGER', status: 'ACCEPTED' }))).toBe(
      'Ya no se puede: la otra persona lo aceptó',
    )
  })
})
