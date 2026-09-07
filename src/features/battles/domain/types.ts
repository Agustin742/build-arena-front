/**
 * The domain imports nothing from the project, so it restates the literals it shares with
 * the wire contract instead of importing them. Nothing is adapted at runtime: a
 * `PublicBattle` is structurally assignable to `BattleFacts`, and if the contract ever
 * drifts, the call site in `application/` stops compiling.
 */

export type BattleStatus =
  'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'FINISHED' | 'REJECTED' | 'CANCELLED'

/** Who sent the challenge. The arena orients every row to whoever asked. */
export type BattleRole = 'CHALLENGER' | 'OPPONENT'

/** Already resolved by the arena: no `winnerId` to compare against our own id. */
export type BattleOutcome = 'WON' | 'LOST'

/** What the rules need to know about a battle. The wire carries more; this is enough. */
export interface BattleFacts {
  status: BattleStatus
  role: BattleRole
}
