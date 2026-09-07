import { describe, expect, it } from 'vitest'

import { canAccept, canCancel, canReject, sortBattles, standingOf } from './standing'
import { type BattleFacts, type BattleRole, type BattleStatus } from './types'

function facts(status: BattleStatus, role: BattleRole): BattleFacts {
  return { status, role }
}

const INVITATION = facts('PENDING', 'OPPONENT')
const SENT = facts('PENDING', 'CHALLENGER')
const ACCEPTED = facts('ACCEPTED', 'OPPONENT')
const RUNNING = facts('IN_PROGRESS', 'CHALLENGER')
const FINISHED = facts('FINISHED', 'CHALLENGER')
const REJECTED = facts('REJECTED', 'CHALLENGER')
const CANCELLED = facts('CANCELLED', 'OPPONENT')

describe('standingOf', () => {
  it('calls a challenge somebody sent us an invitation', () => {
    expect(standingOf(INVITATION)).toBe('invitation')
  })

  it('calls our own pending challenge sent', () => {
    expect(standingOf(SENT)).toBe('sent')
  })

  it('calls an accepted or running battle live, whoever started it', () => {
    expect(standingOf(ACCEPTED)).toBe('live')
    expect(standingOf(RUNNING)).toBe('live')
  })

  it('calls everything that ended over', () => {
    expect(standingOf(FINISHED)).toBe('over')
    expect(standingOf(REJECTED)).toBe('over')
    expect(standingOf(CANCELLED)).toBe('over')
  })
})

describe('canAccept', () => {
  it('accepts only a pending challenge somebody else sent', () => {
    expect(canAccept(INVITATION)).toBe(true)
    expect(canAccept(SENT)).toBe(false)
    expect(canAccept(ACCEPTED)).toBe(false)
  })
})

describe('canReject', () => {
  it('rejects exactly what it could have accepted', () => {
    expect(canReject(INVITATION)).toBe(true)
    expect(canReject(SENT)).toBe(false)
    expect(canReject(FINISHED)).toBe(false)
  })
})

describe('canCancel', () => {
  it('takes back only our own pending challenge', () => {
    expect(canCancel(SENT)).toBe(true)
    expect(canCancel(INVITATION)).toBe(false)
    expect(canCancel(RUNNING)).toBe(false)
  })
})

describe('sortBattles', () => {
  it('leads with the battle already on, then what waits on us, then ours, then history', () => {
    expect(sortBattles([FINISHED, SENT, INVITATION, RUNNING])).toEqual([
      RUNNING,
      INVITATION,
      SENT,
      FINISHED,
    ])
  })

  it('keeps the arena order inside a group', () => {
    const first = { ...INVITATION, id: 'first' }
    const second = { ...INVITATION, id: 'second' }

    expect(sortBattles([first, second])).toEqual([first, second])
  })

  it('leaves the list it was given alone', () => {
    const rows = [FINISHED, RUNNING]

    sortBattles(rows)

    expect(rows).toEqual([FINISHED, RUNNING])
  })
})
