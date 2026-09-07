import { describe, expect, it } from 'vitest'

import { type PublicFriendship } from '@/shared/contracts'

import { friendshipHeadline, friendshipLines, orderedFriendships } from './friendship-lines'

function row(
  id: string,
  status: PublicFriendship['status'],
  direction: PublicFriendship['direction'],
  username: string,
  rating: number,
): PublicFriendship {
  return {
    id,
    status,
    direction,
    player: { id: `${username}-id`, username, rating },
    createdAt: '2026-09-07T10:15:00.000Z',
    updatedAt: '2026-09-07T10:15:00.000Z',
  }
}

const GRACE = row('f1', 'PENDING', 'INCOMING', 'grace', 1350)
const ADA = row('f2', 'PENDING', 'OUTGOING', 'ada', 1216)
const HOPPER = row('f3', 'ACCEPTED', 'OUTGOING', 'hopper', 1120)

describe('orderedFriendships', () => {
  it('puts what is waiting on the player first, then their own, then the friends', () => {
    expect(orderedFriendships([HOPPER, ADA, GRACE])).toEqual([GRACE, ADA, HOPPER])
  })
})

describe('friendshipHeadline', () => {
  it('says nobody is there yet', () => {
    expect(friendshipHeadline([])).toBe('Todavía no agregaste a nadie')
  })

  it('counts one friend without the plural', () => {
    expect(friendshipHeadline([HOPPER])).toBe('Tenés 1 amigo')
  })

  it('counts the friends', () => {
    expect(friendshipHeadline([HOPPER, row('f4', 'ACCEPTED', 'INCOMING', 'turing', 1400)])).toBe(
      'Tenés 2 amigos',
    )
  })

  it('leads with what is waiting on an answer, because that is the part with a deadline', () => {
    expect(friendshipHeadline([GRACE, ADA, HOPPER])).toBe(
      'Tenés 1 solicitud sin responder · 1 amigo',
    )
  })

  it('says so when there are only requests and no friends yet', () => {
    expect(friendshipHeadline([GRACE, ADA])).toBe('Tenés 1 solicitud sin responder · ningún amigo')
  })
})

describe('friendshipLines', () => {
  it('says so when the list comes back empty', () => {
    expect(friendshipLines([])).toEqual(['Nadie te mandó solicitud y vos tampoco'])
  })

  it('numbers straight through the headings, so a number means one row', () => {
    expect(friendshipLines(orderedFriendships([HOPPER, ADA, GRACE]))).toEqual([
      'TE MANDARON SOLICITUD',
      ' 1) grace                   1350',
      'MANDASTE SOLICITUD',
      ' 2) ada                     1216',
      'AMIGOS',
      ' 3) hopper                  1120',
    ])
  })

  it('leaves out the heading of a group nobody is in', () => {
    expect(friendshipLines(orderedFriendships([HOPPER]))).toEqual([
      'AMIGOS',
      ' 1) hopper                  1120',
    ])
  })
})
