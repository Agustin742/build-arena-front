/**
 * The domain imports nothing from the project, so it restates the two literals it shares
 * with the wire contract instead of importing them. Nothing is adapted at runtime: a
 * `PublicFriendship` is structurally assignable to `FriendshipFacts`, and if the contract
 * ever drifts, the call site in `application/` stops compiling.
 */

/** Whether the row is a request still waiting for an answer, or an actual friendship. */
export type FriendshipStatus = 'PENDING' | 'ACCEPTED'

/** Who sent it. The arena orients every row to whoever asked, so nothing compares ids. */
export type FriendshipDirection = 'OUTGOING' | 'INCOMING'

/** What the rules need to know about a friendship. The wire carries more; this is enough. */
export interface FriendshipFacts {
  status: FriendshipStatus
  direction: FriendshipDirection
}
