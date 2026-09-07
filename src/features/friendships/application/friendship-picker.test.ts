import { describe, expect, it } from 'vitest'

import { type PublicFriendship } from '@/shared/contracts'

import {
  acceptOptions,
  candidateOptions,
  findFriendship,
  removalOptions,
} from './friendship-picker'

function row(
  id: string,
  status: PublicFriendship['status'],
  direction: PublicFriendship['direction'],
  username: string,
): PublicFriendship {
  return {
    id,
    status,
    direction,
    player: { id: `${username}-id`, username, rating: 1200 },
    createdAt: '2026-09-07T10:15:00.000Z',
    updatedAt: '2026-09-07T10:15:00.000Z',
  }
}

const GRACE = row('f1', 'PENDING', 'INCOMING', 'grace')
const ADA = row('f2', 'PENDING', 'OUTGOING', 'ada')
const HOPPER = row('f3', 'ACCEPTED', 'OUTGOING', 'hopper')

const ORDERED = [GRACE, ADA, HOPPER]

describe('acceptOptions', () => {
  it('numbers every row the way the list printed it', () => {
    expect(acceptOptions(ORDERED).map((option) => option.key)).toEqual(['1', '2', '3'])
  })

  it('carries the friendship id, not the player id', () => {
    expect(acceptOptions(ORDERED).map((option) => option.id)).toEqual(['f1', 'f2', 'f3'])
  })

  it('leaves open only what somebody else sent', () => {
    const [incoming, outgoing, accepted] = acceptOptions(ORDERED)

    expect(incoming?.lockedReason).toBeUndefined()
    expect(outgoing?.lockedReason).toBe(
      'Esta la mandaste vos: la tiene que aceptar la otra persona',
    )
    expect(accepted?.lockedReason).toBe('Ya son amigos')
  })
})

describe('removalOptions', () => {
  it('offers every row, with the verb that actually applies to it', () => {
    expect(removalOptions(ORDERED).map((option) => option.hint)).toEqual([
      'rechazar la solicitud',
      'cancelar la solicitud',
      'eliminar de tus amigos',
    ])
  })

  it('locks nothing, because every row can be dropped', () => {
    expect(removalOptions(ORDERED).every((option) => option.lockedReason === undefined)).toBe(true)
  })
})

describe('findFriendship', () => {
  it('takes the number the list showed', () => {
    expect(findFriendship(ORDERED, '2')).toBe(ADA)
  })

  it('takes the username, whatever case it was typed in', () => {
    expect(findFriendship(ORDERED, 'HOPPER')).toBe(HOPPER)
  })

  it('takes the friendship id, for whoever happens to have one', () => {
    expect(findFriendship(ORDERED, 'f1')).toBe(GRACE)
  })

  it('finds nobody outside the list', () => {
    expect(findFriendship(ORDERED, '9')).toBeUndefined()
    expect(findFriendship(ORDERED, 'turing')).toBeUndefined()
  })
})

describe('candidateOptions', () => {
  const RANKING = [
    { rank: 1, id: 'grace-id', username: 'grace', rating: 1350 },
    { rank: 2, id: 'ada-id', username: 'ada', rating: 1216 },
    { rank: 3, id: 'turing-id', username: 'turing', rating: 1180 },
    { rank: 4, id: 'self-id', username: 'me', rating: 1100 },
  ]

  it('offers whoever is not already on the friendship list', () => {
    expect(
      candidateOptions(RANKING, { friendships: ORDERED, selfId: 'self-id' }).map(
        (option) => option.label,
      ),
    ).toEqual(['turing'])
  })

  it('never offers the player themselves', () => {
    expect(
      candidateOptions(RANKING, { friendships: [], selfId: 'self-id' }).map((option) => option.id),
    ).toEqual(['grace-id', 'ada-id', 'turing-id'])
  })

  it('carries the player id, because that is what the request asks for', () => {
    const [first] = candidateOptions(RANKING, { friendships: ORDERED, selfId: 'self-id' })

    expect(first).toMatchObject({ id: 'turing-id', key: '1', hint: '1180 de rating' })
  })

  it('offers everybody when nobody is logged in to be excluded', () => {
    expect(candidateOptions(RANKING, { friendships: [], selfId: null })).toHaveLength(4)
  })
})
