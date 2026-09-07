import { describe, expect, it } from 'vitest'

import { type PublicBattle } from '@/shared/contracts'

import { acceptLock, cancelLock } from './battle-messages'
import { battleOptions, findBattle, rivalOptions } from './battle-picker'

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

const INVITATION = battle('turing')
const SENT = battle('ada', { role: 'CHALLENGER' })
const OVER = battle('hopper', { status: 'FINISHED', outcome: 'WON' })

const ORDERED = [INVITATION, SENT, OVER]

describe('battleOptions', () => {
  it('numbers every row the way the list printed it', () => {
    expect(battleOptions(ORDERED, acceptLock).map((option) => option.key)).toEqual(['1', '2', '3'])
  })

  it('carries the battle id and reads as the rival', () => {
    expect(battleOptions(ORDERED, acceptLock).map((option) => [option.id, option.label])).toEqual([
      ['turing', 'turing'],
      ['ada', 'ada'],
      ['hopper', 'hopper'],
    ])
  })

  it('locks every row the gate closes, and leaves the rest open', () => {
    const [invitation, sent, over] = battleOptions(ORDERED, acceptLock)

    expect(invitation?.lockedReason).toBeUndefined()
    expect(sent?.lockedReason).toBe('Este lo mandaste vos: lo tiene que aceptar la otra persona')
    expect(over?.lockedReason).toBe('Ese desafío ya está contestado')
  })

  it('opens a different row for a different gate', () => {
    const [invitation, sent] = battleOptions(ORDERED, cancelLock)

    expect(invitation?.lockedReason).toBe('Este te lo mandaron: para eso está rechazarlo')
    expect(sent?.lockedReason).toBeUndefined()
  })

  it('shows on the open rows what the battle is waiting for', () => {
    const [invitation] = battleOptions(ORDERED, acceptLock)

    expect(invitation?.hint).toBe('esperando tu respuesta')
  })
})

describe('findBattle', () => {
  it('takes the number the list showed', () => {
    expect(findBattle(ORDERED, '2')).toBe(SENT)
  })

  it('takes the rival name, whatever case it was typed in', () => {
    expect(findBattle(ORDERED, 'HOPPER')).toBe(OVER)
  })

  it('takes the battle id, for whoever happens to have one', () => {
    expect(findBattle(ORDERED, 'turing')).toBe(INVITATION)
  })

  it('finds nobody outside the list', () => {
    expect(findBattle(ORDERED, '9')).toBeUndefined()
    expect(findBattle(ORDERED, 'grace')).toBeUndefined()
  })
})

describe('rivalOptions', () => {
  const RANKING = [
    { rank: 1, id: 'grace-id', username: 'grace', rating: 1350 },
    { rank: 2, id: 'self-id', username: 'me', rating: 1100 },
    { rank: 3, id: 'grace-id', username: 'grace', rating: 1350 },
  ]

  it('never offers the player themselves', () => {
    expect(rivalOptions(RANKING, 'self-id').map((option) => option.id)).toEqual(['grace-id'])
  })

  it('offers each player once, however many lists they came from', () => {
    expect(rivalOptions(RANKING, null)).toHaveLength(2)
  })

  it('numbers the offer and reads the rating', () => {
    expect(rivalOptions(RANKING, 'self-id')[0]).toMatchObject({
      key: '1',
      label: 'grace',
      hint: '1350 de rating',
    })
  })
})
