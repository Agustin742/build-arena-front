import { type CommandOption } from '@/shared/commands'
import { type PublicBattle, type PublicPlayer } from '@/shared/contracts'

import { battleDetail } from './battle-messages'

const POSITION = /^\d+$/

/** Why a row is closed for the command being drawn, or nothing when it is open. */
export type BattleGate = (battle: PublicBattle) => string | undefined

/**
 * Every row is offered, including the ones the gate closes. Hiding them would renumber the
 * list the player just read, and a row that disappears never says why — while a locked one
 * points at the command that would have worked instead.
 */
export function battleOptions(ordered: readonly PublicBattle[], gate: BattleGate): CommandOption[] {
  return ordered.map((battle, index) => {
    const locked = gate(battle)

    return {
      // The battle id, never the rival id: every route in this feature is addressed by the
      // battle, and the rival is only what the battle is read as.
      id: battle.id,
      key: String(index + 1),
      label: battle.rival.username,
      ...(locked === undefined ? { hint: battleDetail(battle) } : { lockedReason: locked }),
    }
  })
}

/**
 * Whatever the player typed: the number the list showed, the rival they read, or the
 * battle id. The position wins, because the number on screen is what they were told
 * to type.
 */
export function findBattle(
  ordered: readonly PublicBattle[],
  raw: string,
): PublicBattle | undefined {
  const answer = raw.trim()

  if (POSITION.test(answer)) {
    const found = ordered[Number(answer) - 1]

    if (found !== undefined) {
      return found
    }
  }

  const folded = answer.toLocaleLowerCase()

  return ordered.find(
    (battle) => battle.id === answer || battle.rival.username.toLocaleLowerCase() === folded,
  )
}

/**
 * Who is worth challenging. The players arrive from more than one list — the ranking and
 * the friends — so the same person can show up twice and is offered once.
 */
export function rivalOptions(
  players: readonly PublicPlayer[],
  selfId: string | null,
): CommandOption[] {
  const seen = new Set<string>()

  return players
    .filter((player) => {
      if (player.id === selfId || seen.has(player.id)) {
        return false
      }

      seen.add(player.id)

      return true
    })
    .map((player, index) => ({
      id: player.id,
      key: String(index + 1),
      label: player.username,
      hint: `${String(player.rating)} de rating`,
    }))
}
