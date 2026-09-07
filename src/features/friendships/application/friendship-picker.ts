import { type CommandOption } from '@/shared/commands'
import { type PublicFriendship, type PublicPlayer } from '@/shared/contracts'

import { removalOf } from '../domain/relation'
import { acceptLock, REMOVAL_LABEL } from './friendship-messages'

const POSITION = /^\d+$/

function baseOption(row: PublicFriendship, index: number): CommandOption {
  return {
    // The friendship id, never the player id: every route in this feature is addressed by
    // the row, and the player is only what the row is read as.
    id: row.id,
    key: String(index + 1),
    label: row.player.username,
  }
}

/**
 * Every row is offered, including the ones that cannot be accepted. Hiding them would
 * renumber the list the player just read, and a row that disappears never says why.
 */
export function acceptOptions(ordered: readonly PublicFriendship[]): CommandOption[] {
  return ordered.map((row, index) => {
    const locked = acceptLock(row)

    return {
      ...baseOption(row, index),
      ...(locked === undefined ? { hint: 'te mandó solicitud' } : { lockedReason: locked }),
    }
  })
}

/** Every row can be dropped; only the word for it changes. */
export function removalOptions(ordered: readonly PublicFriendship[]): CommandOption[] {
  return ordered.map((row, index) => ({
    ...baseOption(row, index),
    hint: REMOVAL_LABEL[removalOf(row)],
  }))
}

/**
 * Whatever the player typed: the number the list showed, the username they read, or the
 * friendship id. The position wins, because the number on screen is what they were told
 * to type.
 */
export function findFriendship(
  ordered: readonly PublicFriendship[],
  raw: string,
): PublicFriendship | undefined {
  const answer = raw.trim()

  if (POSITION.test(answer)) {
    const found = ordered[Number(answer) - 1]

    if (found !== undefined) {
      return found
    }
  }

  const folded = answer.toLocaleLowerCase()

  return ordered.find(
    (row) => row.id === answer || row.player.username.toLocaleLowerCase() === folded,
  )
}

export interface CandidateFilter {
  friendships: readonly PublicFriendship[]
  selfId: string | null
}

/**
 * Who is left to add, out of the players the ranking already handed over. This is the
 * whole reason the ranking is cached: without it the only way to add somebody would be to
 * type a uuid, and nobody types a uuid.
 */
export function candidateOptions(
  players: readonly PublicPlayer[],
  { friendships, selfId }: CandidateFilter,
): CommandOption[] {
  const known = new Set(friendships.map((row) => row.player.id))

  return players
    .filter((player) => player.id !== selfId && !known.has(player.id))
    .map((player, index) => ({
      id: player.id,
      key: String(index + 1),
      label: player.username,
      hint: `${String(player.rating)} de rating`,
    }))
}
