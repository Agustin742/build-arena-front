import { type FriendshipFacts } from './types'

/**
 * `DELETE /friendships/:id` is one verb for three different things, and the player has to
 * read the one that actually applies: turning down a request somebody else sent, taking
 * back one of their own, or ending a friendship that already exists.
 */
export type Removal = 'reject' | 'cancel' | 'unfriend'

export function removalOf({ status, direction }: FriendshipFacts): Removal {
  // Once accepted, who asked first stops mattering: both sides are just friends.
  if (status === 'ACCEPTED') {
    return 'unfriend'
  }

  return direction === 'INCOMING' ? 'reject' : 'cancel'
}

/** Only a request somebody else sent can be accepted. Our own is waiting on them. */
export function canAccept({ status, direction }: FriendshipFacts): boolean {
  return status === 'PENDING' && direction === 'INCOMING'
}

/** The three groups a friendship list actually reads as, whatever order it arrives in. */
export type FriendshipBucket = 'incoming' | 'outgoing' | 'friends'

export function bucketOf({ status, direction }: FriendshipFacts): FriendshipBucket {
  if (status === 'ACCEPTED') {
    return 'friends'
  }

  return direction === 'INCOMING' ? 'incoming' : 'outgoing'
}

const BUCKET_ORDER: readonly FriendshipBucket[] = ['incoming', 'outgoing', 'friends']

/**
 * Requests waiting on the player come first, because they are the only rows that need an
 * answer. Inside a bucket the arena's order is kept: it already sorts by date, and a list
 * that reshuffles itself between two reads is a list nobody can point at.
 */
export function sortFriendships<TRow extends FriendshipFacts>(rows: readonly TRow[]): TRow[] {
  return [...rows].sort(
    (left, right) => BUCKET_ORDER.indexOf(bucketOf(left)) - BUCKET_ORDER.indexOf(bucketOf(right)),
  )
}
