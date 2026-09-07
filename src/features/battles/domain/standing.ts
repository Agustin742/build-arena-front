import { type BattleFacts } from './types'

/**
 * Where a battle stands from the player's side. `status` says what the arena thinks and
 * `role` says which end we are on; neither alone is enough, because the same `PENDING` is
 * an invitation to one player and a challenge sent to the other.
 */
export type BattleStanding = 'live' | 'invitation' | 'sent' | 'over'

export function standingOf({ status, role }: BattleFacts): BattleStanding {
  if (status === 'ACCEPTED' || status === 'IN_PROGRESS') {
    return 'live'
  }

  if (status !== 'PENDING') {
    return 'over'
  }

  return role === 'OPPONENT' ? 'invitation' : 'sent'
}

/** Accepting freezes both builds, so only the challenged player can do it. */
export function canAccept(facts: BattleFacts): boolean {
  return standingOf(facts) === 'invitation'
}

/** Whatever can be accepted can also be turned down. */
export function canReject(facts: BattleFacts): boolean {
  return standingOf(facts) === 'invitation'
}

/** Taking back our own challenge, and only while nobody has answered it. */
export function canCancel(facts: BattleFacts): boolean {
  return standingOf(facts) === 'sent'
}

/**
 * A battle already on outranks everything, because it is the only row the player could be
 * losing by not looking at. Then what waits on them, then what waits on somebody else,
 * then the history. Inside a group the arena's order is kept.
 */
const STANDING_ORDER: readonly BattleStanding[] = ['live', 'invitation', 'sent', 'over']

export function sortBattles<TRow extends BattleFacts>(rows: readonly TRow[]): TRow[] {
  return [...rows].sort(
    (left, right) =>
      STANDING_ORDER.indexOf(standingOf(left)) - STANDING_ORDER.indexOf(standingOf(right)),
  )
}
