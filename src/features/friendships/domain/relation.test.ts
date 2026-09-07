import { describe, expect, it } from 'vitest'

import { bucketOf, canAccept, removalOf, sortFriendships } from './relation'
import { type FriendshipFacts } from './types'

const INCOMING_REQUEST: FriendshipFacts = { status: 'PENDING', direction: 'INCOMING' }
const OUTGOING_REQUEST: FriendshipFacts = { status: 'PENDING', direction: 'OUTGOING' }
const FRIEND_THEY_ASKED: FriendshipFacts = { status: 'ACCEPTED', direction: 'INCOMING' }
const FRIEND_WE_ASKED: FriendshipFacts = { status: 'ACCEPTED', direction: 'OUTGOING' }

describe('removalOf', () => {
  it('turns down a request somebody else sent', () => {
    expect(removalOf(INCOMING_REQUEST)).toBe('reject')
  })

  it('takes back a request we sent', () => {
    expect(removalOf(OUTGOING_REQUEST)).toBe('cancel')
  })

  it('ends an accepted friendship no matter who asked first', () => {
    expect(removalOf(FRIEND_THEY_ASKED)).toBe('unfriend')
    expect(removalOf(FRIEND_WE_ASKED)).toBe('unfriend')
  })
})

describe('canAccept', () => {
  it('accepts only a pending request somebody else sent', () => {
    expect(canAccept(INCOMING_REQUEST)).toBe(true)
  })

  it('refuses our own pending request, which is waiting on them', () => {
    expect(canAccept(OUTGOING_REQUEST)).toBe(false)
  })

  it('refuses a friendship that is already accepted', () => {
    expect(canAccept(FRIEND_THEY_ASKED)).toBe(false)
    expect(canAccept(FRIEND_WE_ASKED)).toBe(false)
  })
})

describe('bucketOf', () => {
  it('separates the two pending directions and folds both accepted ones together', () => {
    expect(bucketOf(INCOMING_REQUEST)).toBe('incoming')
    expect(bucketOf(OUTGOING_REQUEST)).toBe('outgoing')
    expect(bucketOf(FRIEND_THEY_ASKED)).toBe('friends')
    expect(bucketOf(FRIEND_WE_ASKED)).toBe('friends')
  })
})

describe('sortFriendships', () => {
  it('puts the requests waiting on us first, then ours, then the friendships', () => {
    const rows = [FRIEND_WE_ASKED, OUTGOING_REQUEST, INCOMING_REQUEST]

    expect(sortFriendships(rows)).toEqual([INCOMING_REQUEST, OUTGOING_REQUEST, FRIEND_WE_ASKED])
  })

  it('keeps the arena order inside a bucket', () => {
    const first = { ...INCOMING_REQUEST, id: 'first' }
    const second = { ...INCOMING_REQUEST, id: 'second' }

    expect(sortFriendships([first, second])).toEqual([first, second])
  })

  it('leaves the list it was given alone', () => {
    const rows = [FRIEND_WE_ASKED, INCOMING_REQUEST]

    sortFriendships(rows)

    expect(rows).toEqual([FRIEND_WE_ASKED, INCOMING_REQUEST])
  })
})
