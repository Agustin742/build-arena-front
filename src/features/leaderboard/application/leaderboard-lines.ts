import { type Leaderboard } from '@/shared/contracts'

const NOBODY_RANKED = 'Todavía no hay nadie en el ranking'
const NOBODY_FOUGHT = 'Todavía no peleó nadie'
const SELF = '  · vos'

/** Wide enough for a username at the arena's ceiling, with the rating in its own column. */
const NAME_WIDTH = 24
const RATING_WIDTH = 4

export function leaderboardHeadline(count: number): string {
  return count === 0 ? NOBODY_RANKED : `Top ${String(count)} de la arena`
}

/**
 * `rank` comes resolved from the arena and is printed as it arrives: asking for the top 20
 * twice while somebody climbs does not renumber anybody, and a player who reads "sos 7º"
 * is reading the arena's word, not this client's arithmetic.
 *
 * `selfId` is optional because the ranking is worth reading before anybody logs in, and a
 * marker nobody can claim is just noise.
 */
export function leaderboardLines(ranking: Leaderboard, selfId?: string | null): string[] {
  if (ranking.length === 0) {
    return [NOBODY_FOUGHT]
  }

  return ranking.map((entry) => {
    const row = [
      `${String(entry.rank).padStart(2)}) `,
      entry.username.padEnd(NAME_WIDTH),
      String(entry.rating).padStart(RATING_WIDTH),
    ].join('')

    return entry.id === selfId ? `${row}${SELF}` : row
  })
}
